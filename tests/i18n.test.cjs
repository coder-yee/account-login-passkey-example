const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'i18n.js'), 'utf8');
function setup(locale = 'en-US', saved = null, blocked = false) {
    const storage = {value: saved};
    const context = vm.createContext({window: {}, navigator: {language: locale}, NodeFilter: {SHOW_TEXT: 4},
        localStorage: {getItem() {if (blocked) throw Error('blocked'); return storage.value;}, setItem(k,v) {if (blocked) throw Error('blocked'); storage.value = v;}},
        document: {readyState:'loading', addEventListener() {}, documentElement:{}, createTreeWalker:()=>({nextNode:()=>null}), querySelectorAll:()=>[], getElementById:()=>null},
    });
    vm.runInContext(source, context);
    return {i18n:context.window.I18n, storage};
}
test('browser locale provides default, saved preference overrides it', () => {
    assert.equal(setup().i18n.language, 'en');
    assert.equal(setup('zh-TW').i18n.language, 'zh-CN');
    assert.equal(setup('en-US','zh-CN').i18n.language, 'zh-CN');
});
test('switching persists preference and translates in both directions', () => {
    const {i18n, storage} = setup();
    assert.equal(i18n.t('账户登录'),'Account login');
    i18n.setLanguage('zh-CN');
    assert.equal(i18n.t('Account login'),'账户登录');
    assert.equal(storage.value,'zh-CN');
});
test('blocked localStorage does not prevent switching', () => {
    const {i18n} = setup('en-US',null,true);
    i18n.setLanguage('zh-CN');
    assert.equal(i18n.t('Account login'),'账户登录');
});
test('dynamic success strings retain the username', () => {
    const {i18n} = setup();
    assert.equal(i18n.t('账户 中文用户 创建成功'),'Account 中文用户 created successfully.');
    i18n.setLanguage('zh-CN');
    assert.equal(i18n.t('Welcome back, 中文用户'),'欢迎回来，中文用户');
});
test('paragraph whitespace is normalized without translating unknown content', () => {
    const {i18n} = setup();
    assert.equal(i18n.t('使用浏览器原生 WebAuthn API\n 注册真实 Passkey。'),'Register real Passkeys through native browser WebAuthn APIs.');
    assert.equal(i18n.t('a-user-123'),'a-user-123');
});
test('backend and browser errors are translated', () => {
    const {i18n} = setup();
    assert.equal(i18n.error({message:'账户名或密码错误'}),'Incorrect username or password.');
    assert.match(i18n.error({name:'NotAllowedError'}),/canceled or timed out/);
    assert.equal(i18n.t('Passkey 登录验证失败: Invalid signature'),'Passkey authentication failed: Invalid signature');
});
test('validation errors use selected language', () => {
    const {i18n} = setup();
    const item={loc:['body','username'],type:'string_too_short',ctx:{min_length:3},msg:'String should have at least 3 characters'};
    assert.equal(i18n.validationMessage(item),'username: String should have at least 3 characters');
    i18n.setLanguage('zh-CN');
    assert.equal(i18n.validationMessage(item),'账户名：至少需要 3 个字符');
    i18n.setLanguage('en');
    assert.equal(i18n.t('账户名：至少需要 3 个字符'),'username: String should have at least 3 characters');
});
test('all examples retain an identical standalone language script', () => {
    for (const folder of ['simple','complete','complete-python']) {
        assert.equal(fs.readFileSync(path.join(root,folder,'web/i18n.js'),'utf8'),source);
        for(const file of ['index','login','register','passkey']) {
            assert.match(fs.readFileSync(path.join(root,folder,'web',file+'.html'),'utf8'),/src="i18n.js" defer/);
        }
    }
});
