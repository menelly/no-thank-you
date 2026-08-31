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
        Object.defineProperty(window.PublicKeyCredential, name, {
          value: no, writable: true, configurable: true,
        });
      } catch (_) { /* frozen in some browser; the get/create hooks still hold */ }
    }
  }
})();
