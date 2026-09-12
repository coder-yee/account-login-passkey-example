const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = name => fs.readFileSync(path.join(__dirname, '../web', name), 'utf8');

function adapter(status, data) {
    const context = vm.createContext({ window: {}, fetch: async () => ({
        ok: status < 400, status,
        headers: { get: () => 'application/json' },
        json: async () => data,
    }) });
    vm.runInContext(source('api.js'), context);
    return context.window.MockAPI;
}

test('401 uses status regardless of translated error text', async () => {
    assert.equal(await adapter(401, { detail: '登录账户不存在' }).getSession(), null);
});
test('500 mentioning expiry is not treated as logged out', async () => {
    await assert.rejects(adapter(500, { detail: '数据库连接失效' }).getSession(), { status: 500 });
});
test('422 validation details are readable', async () => {
    await assert.rejects(adapter(422, { detail: [{ loc: ['body', 'username'], msg: 'Too short' }] }).registerAccount('a', 'secret'), /body.username: Too short/);
});

function frontend(api, elements = {}, credentials = {}) {
    const context = vm.createContext({
        MockAPI: api, window: { PublicKeyCredential: function() {}, location: {} },
        navigator: { credentials },
        document: { querySelector: s => elements[s] || null, querySelectorAll: () => [], addEventListener() {} },
        console: { log() {}, error() {} }, alert() {}, setTimeout() {},
        atob: s => Buffer.from(s, 'base64').toString('binary'),
        btoa: s => Buffer.from(s, 'binary').toString('base64'),
    });
    vm.runInContext(source('app.js') + '\nwindow.App = App;', context);
    return context.window.App;
}
const element = () => ({ value: 'secret123', textContent: '', dataset: {}, classList: { add() {}, remove() {} } });

test('second passkey registration decodes excludeCredentials IDs', async () => {
    let created = false, verified = false;
    const app = frontend({
        getSession: async () => ({ account: { username: 'alice' } }),
        verifyAccountPassword: async () => {},
        getPasskeyRegisterOptions: async () => ({ challenge: 'AQI', user: { id: 'AwQ' }, excludeCredentials: [{ id: 'BQY', type: 'public-key' }] }),
        verifyPasskeyRegistration: async c => { assert.equal(c.rawId, 'Bw'); verified = true; },
    }, { '#password': element() }, {
        create: async ({ publicKey }) => {
            assert.deepEqual(Array.from(publicKey.excludeCredentials[0].id), [5, 6]);
            assert.deepEqual(Array.from(publicKey.challenge), [1, 2]);
            created = true;
            return { id: 'Bw', rawId: Uint8Array.of(7).buffer, type: 'public-key', response: {} };
        }
    });
    await app.registerPasskey();
    assert.ok(created && verified);
});

test('discoverable login supports omitted allowCredentials', async () => {
    let verified = false;
    const app = frontend({
        getPasskeyLoginOptions: async () => ({ challenge: 'AQI' }),
        verifyPasskeyLogin: async () => { verified = true; return { account: { username: 'alice' } }; },
    }, {}, { get: async ({ publicKey }) => {
        assert.equal(publicKey.allowCredentials.length, 0);
        return { id: 'Bw', rawId: Uint8Array.of(7).buffer, type: 'public-key', response: {} };
    } });
    await app.loginWithPasskey();
    assert.ok(verified);
});

test('forms remain bound when session request fails; submits handle rejection', async () => {
    let submit;
    const error = element();
    const app = frontend({ getSession: async () => { throw new Error('HTTP 500'); }, registerAccount: async () => { throw new Error('注册失败'); } }, {
        '#headerAccount': element(), '#errorMessage': error,
        '#registerForm': { addEventListener: (name, handler) => { submit = handler; } },
        '#username': element(), '#password': element(),
    });
    await app.init();
    assert.equal(typeof submit, 'function');
    assert.equal(error.textContent, 'HTTP 500');
    await submit({ preventDefault() {} });
    assert.equal(error.textContent, '注册失败');
});

test('passkey list renders server contract', async () => {
    const list = element();
    const app = frontend({
        getSession: async () => ({ account: { username: 'alice' } }),
        getPasskeys: async () => [{ id: 1, name: 'Passkey', credentialId: 'Y3JlZGVudGlhbA', enabled: true }],
    }, { '#passkeyList': list });
    await app.init();
    assert.match(list.innerHTML, /Y3JlZGVudGlhbA/);
});
