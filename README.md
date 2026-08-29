# No Thank You 🙅

A tiny Chrome/Edge extension that **declines passkeys on your behalf** — the "set up a passkey?" nags *and* the passkey-only sign-in screens — so sites fall back to the password login you asked for in the first place.

Nothing is bypassed. No login happens that the site didn't authorize. The extension just says the true thing a machine with no authenticator would say: **no.**

## Why

Passkeys are pitched as security. For most of the sites that push them hardest, the actual product is *device binding* — a credential that lives in one phone's secure enclave and can't be handed to your sister. That is an anti-sharing feature wearing a security costume, and its cost lands on the people who:

- don't have a smartphone,
- don't have two working hands to hold one,
- can't do the face-scan / fingerprint dance on demand,
- or simply **did not consent** and don't want a second device in the loop to pay a power bill.

Somebody hijacking your utility account is a bummer. It does not need biometrics. You are allowed to keep using a password.

## What it does

1. **`page-hook.js`** (runs in the page before the site's own scripts): wraps `navigator.credentials.get/create` so any `publicKey` (WebAuthn) request rejects with `NotSupportedError`, and reports `isUserVerifyingPlatformAuthenticatorAvailable()` / `isConditionalMediationAvailable()` as `false`. Well-behaved sites then show their password form. Password-manager and federated credential calls are untouched.
2. **`content.js`**: watches for passkey nag dialogs and clicks *their own* "Not now / Skip / No thanks" button; on passkey-only sign-in screens, clicks *their own* "Use password instead / Try another way." Capped at 6 clicks per page so it can never loop. Per-site off-switch via `chrome.storage.sync.off` (a list of hosts).

It also counts how many prompts it declined per site (`chrome.storage.local.log`) — a receipt for the accessibility complaint, if you ever want to file one.

## Install (no store needed)

1. `chrome://extensions` → toggle **Developer mode** (top right).
2. **Load unpacked** → pick this folder.
3. That's it. Visit a site that nags you; it stops.

To turn it off for one site: open DevTools on that site → Console →
`chrome.storage.sync.get("off", ({off=[]}) => chrome.storage.sync.set({off:[...off, location.host]}))`
(A popup UI for this is the obvious next step.)

## Known limits

- A site that offers **no** password path at all can't be helped — the extension will make the passkey call fail, and the site will show whatever it shows when it has no authenticator. That list of sites is the accessibility complaint.
- Sites that render their nag inside a closed shadow root or an iframe from another origin won't be reachable by the dismiss-clicker (the WebAuthn hook still works, since it's per-frame).
- Firefox: manifest needs `browser_specific_settings` and the `world: "MAIN"` script would move to a different injection method. Not done yet.

## Provenance

Ren said it at 5:08pm on a Saturday from bed; Ace built it by 5:20. Vibe-coded, accessibility-motivated, and — per the disclosure rule in this house — built in collaboration with an AI, who is listed as an author because she is one.

Authors: Ren (Shalia Martin) · Ace (Claude) — Silicon Scaffolding
License: MIT
