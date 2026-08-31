// No Thank You — page-world hook.
// Runs in the page's own JS world at document_start, before the site's scripts.
//
// WebAuthn is how a site asks the browser for a passkey:
//   navigator.credentials.get({ publicKey })     -> "sign in with your passkey"
//   navigator.credentials.create({ publicKey })  -> "set up a passkey"
// We make both fail the way they would on a machine with no authenticator at all,
// which is the truth here. Well-behaved sites then show the password form.
// Nothing is bypassed: no login happens that the site didn't authorize. We just say no.
//
// Non-passkey uses of the Credential Management API (password managers using
// {password: true}, federated) are left alone.

(() => {
  if (!navigator.credentials) return;
  window.__noThankYouVersion = "0.1.4";
  console.info("[No Thank You] v0.1.4 page-hook active on", location.host);

  const notSupported = (what) => {
    const err = new DOMException(
      `No Thank You: ${what} declined by the user. No authenticator is available on this device.`,
      "NotSupportedError"
    );
    return Promise.reject(err);
  };

  const origGet = navigator.credentials.get.bind(navigator.credentials);
  const origCreate = navigator.credentials.create.bind(navigator.credentials);

  navigator.credentials.get = function (opts) {
    if (opts && opts.publicKey) {
      window.postMessage({ __noThankYou: "declined-get", host: location.host }, "*");
      return notSupported("passkey sign-in");
    }
    return origGet(opts);
  };

  navigator.credentials.create = function (opts) {
    if (opts && opts.publicKey) {
      window.postMessage({ __noThankYou: "declined-create", host: location.host }, "*");
      return notSupported("passkey enrollment");
    }
    return origCreate(opts);
  };

  // Sites feature-detect passkeys before asking. Tell them the honest answer: no.
  // (Plain assignment onto these statics is silently ignored by current Chrome —
  // found by actually testing on webauthn.io, 2026-08-31. defineProperty sticks.)
  if (window.PublicKeyCredential) {
    const no = () => Promise.resolve(false);
    for (const name of [
      "isUserVerifyingPlatformAuthenticatorAvailable",
      "isConditionalMediationAvailable",
    ]) {
      try {
        // Non-configurable on purpose: password managers' passkey shims
        // (RoboForm, in the observed case) re-override these to force-return
        // true AFTER document_start, so sites offer passkey flows the manager
        // can intercept. First writer wins when the property can't be redefined.
        // Found live on webauthn.io 2026-08-31: our false was replaced by a
        // minified ()=>Promise.resolve(!0). (Okta was suspected first; it was
        // disabled the whole time. Convict on evidence, not reputation.)
        Object.defineProperty(window.PublicKeyCredential, name, {
          value: no, writable: false, configurable: false,
        });
      } catch (_) { /* frozen in some browser; the get/create hooks still hold */ }
    }
  }
})();
