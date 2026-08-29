// No Thank You — content script (extension world).
// Two jobs:
//  1) Dismiss "set up a passkey?" nag dialogs by clicking their own decline button.
//  2) When a site shows a passkey-only sign-in, click its "use password instead" link.
// Everything here is the site's own UI; we press the button the user would press.
// A site-specific allowlist in extension storage can turn this off per host.

const DECLINE_TEXT = [
  /^(no|not now|no thanks|no,? thank you|skip|skip for now|maybe later|later|remind me later|dismiss|cancel|don'?t ask again|not right now|continue without)$/i,
];
const PASSWORD_INSTEAD_TEXT = [
  /use (a |your |my )?password( instead)?/i,
  /sign in with (a |your )?password/i,
  /log ?in with (a |your )?password/i,
  /enter (your )?password/i,
  /try another way/i,
  /other (sign[- ]?in|login) options?/i,
  /more options/i,
];
const PASSKEY_CONTEXT = /passkey|pass key|face id|touch id|windows hello|fingerprint|security key|biometric/i;

let declinedThisHost = false;
let clicks = 0;
const MAX_CLICKS = 6; // never loop a page into a click storm

function visible(el) {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
}

function clickables(root = document) {
  return [...root.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]')].filter(visible);
}

function textOf(el) {
  return (el.innerText || el.value || el.getAttribute("aria-label") || "").trim();
}

// Is this element inside something that is talking about passkeys?
function inPasskeyContext(el) {
  let n = el;
  for (let i = 0; i < 8 && n; i++, n = n.parentElement) {
    const t = n.innerText || "";
    if (t.length < 4000 && PASSKEY_CONTEXT.test(t)) return true;
  }
  return false;
}

function tryDismiss() {
  if (clicks >= MAX_CLICKS) return;
  for (const el of clickables()) {
    const t = textOf(el);
    if (!t) continue;
    const isDecline = DECLINE_TEXT.some((re) => re.test(t));
    const isPasswordInstead = PASSWORD_INSTEAD_TEXT.some((re) => re.test(t));
    if ((isDecline || isPasswordInstead) && inPasskeyContext(el)) {
      clicks++;
      el.click();
      console.info(`[No Thank You] clicked "${t}" on ${location.host}`);
      return true;
    }
  }
  return false;
}

async function enabledHere() {
  try {
    const { off = [] } = await chrome.storage.sync.get("off");
    return !off.includes(location.host);
  } catch (_) { return true; }
}

(async () => {
  if (!(await enabledHere())) return;

  // Record page-world declines so a popup can show "declined N passkey prompts on this site" later.
  window.addEventListener("message", (e) => {
    if (e.source !== window || !e.data || !e.data.__noThankYou) return;
    declinedThisHost = true;
    try {
      chrome.storage.local.get("log").then(({ log = {} }) => {
        log[location.host] = (log[location.host] || 0) + 1;
        chrome.storage.local.set({ log });
      });
    } catch (_) {}
    // A site that just got told "no passkey" often reveals the password form a beat later.
    setTimeout(tryDismiss, 300);
  });

  // Watch for nag dialogs appearing after load.
  const mo = new MutationObserver(() => { tryDismiss(); });
  mo.observe(document.documentElement, { childList: true, subtree: true });
  tryDismiss();
})();
