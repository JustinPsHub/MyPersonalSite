(() => {
  'use strict';
  const button = document.querySelector('#passkey-action');
  const status = document.querySelector('#passkey-status');
  const decode = value => Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), char => char.charCodeAt(0));
  const encode = value => btoa(String.fromCharCode(...new Uint8Array(value))).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  async function call(action, body = {}) {
    const response = await fetch(`/api/observatory/passkey-${action}`, {
      method:'POST', credentials:'same-origin', redirect:'manual',
      headers:{'Content-Type':'application/json', 'X-Observatory-Action':'passkey'}, body:JSON.stringify(body)
    });
    if (response.status === 503) throw new Error('The dashboard service is temporarily unavailable. Reload to try again.');
    if (!response.ok) throw new Error('Passkey verification could not be completed. Reload the page and try again.');
    return response.json();
  }
  function convert(options, register) {
    const parser = register ? PublicKeyCredential.parseCreationOptionsFromJSON : PublicKeyCredential.parseRequestOptionsFromJSON;
    if (parser) return parser.call(PublicKeyCredential, options);
    const result = {...options, challenge:decode(options.challenge)};
    if (register) result.user = {...options.user, id:decode(options.user.id)};
    for (const field of ['allowCredentials', 'excludeCredentials']) {
      if (options[field]) result[field] = options[field].map(item => ({...item, id:decode(item.id)}));
    }
    return result;
  }
  function serialize(credential) {
    if (typeof credential.toJSON === 'function') return credential.toJSON();
    const response = {};
    for (const field of ['clientDataJSON','attestationObject','authenticatorData','signature','userHandle']) {
      if (credential.response[field]) response[field] = encode(credential.response[field]);
    }
    if (credential.response.getTransports) response.transports = credential.response.getTransports();
    return {id:credential.id, rawId:encode(credential.rawId), type:credential.type, response, clientExtensionResults:credential.getClientExtensionResults()};
  }
  async function prepare() {
    if (!window.PublicKeyCredential || !['justinraypalmer.com','www.justinraypalmer.com'].includes(location.hostname)) {
      status.textContent = 'Open the dashboard on JustinRayPalmer.com in a browser that supports passkeys.';
      return;
    }
    try {
      const {mode, options} = await call('options');
      const register = mode === 'register';
      button.textContent = register ? 'Set up my passkey' : 'Use my passkey';
      button.disabled = false;
      button.onclick = async () => {
        button.disabled = true;
        status.textContent = '';
        try {
          const publicKey = convert(options, register);
          const credential = await navigator.credentials[register ? 'create' : 'get']({publicKey});
          if (!credential) throw new Error('No passkey was selected.');
          await call('finish', serialize(credential));
          location.replace('/admin/telemetry');
        } catch (error) {
          status.textContent = error.name === 'NotAllowedError' ? 'Passkey verification was canceled or timed out. Try again.' : error.message;
          await prepare();
        }
      };
    } catch (error) {
      button.textContent = 'Passkey unavailable';
      status.textContent = error.message;
    }
  }
  prepare();
})();
