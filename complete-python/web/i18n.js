/** 中英文词典。各示例保留本地副本，保证单独运行；修改后运行 scripts/sync-i18n.py。 */
(() => {
    const messages = {
    "账户登录": "Account login",
    "账户名": "Username",
    "密码": "Password",
    "当前账户密码": "Current account password",
    "登录": "Log in",
    "退出": "Log out",
    "创建账户": "Create account",
    "注册账户": "Register account",
    "返回登录": "Back to login",
    "未登录": "Not signed in",
    "已登录": "Signed in",
    "当前账户": "Current account",
    "或": "or",
    "已经有账户？": "Already have an account?",
    "还没有账户？": "Don’t have an account?",
    "请输入密码": "Enter your password",
    "请输入当前账户密码": "Enter your current account password",
    "至少 6 个字符": "At least 6 characters",
    "例如：coder-yee": "Example: coder-yee",
    "使用账户名登录， 或直接使用 Passkey 登录。": "Log in with your username, or use a Passkey.",
    "使用账户名和密码登录， 或直接使用 Passkey 登录。": "Log in with your username and password, or use a Passkey.",
    "创建一个本地 Demo 账户， 然后为账户注册 Passkey。": "Create a local demo account, then register a Passkey for it.",
    "Passkey 管理": "Passkey management",
    "我的 Passkeys": "My Passkeys",
    "注册 Passkey": "Register Passkey",
    "使用 Passkey 登录": "Log in with a Passkey",
    "Passkey 登录": "Passkey login",
    "🔑 使用 Passkey 登录": "🔑 Log in with a Passkey",
    "🔑 注册新的 Passkey": "🔑 Register a new Passkey",
    "🔑 验证密码并注册 Passkey": "🔑 Verify password and register Passkey",
    "启用 Passkey": "Enable Passkey",
    "启用 / 禁用 Passkey": "Enable / disable Passkeys",
    "已启用": "Enabled",
    "已停用": "Disabled",
    "启用": "Enable",
    "停用": "Disable",
    "暂无 Passkey": "No Passkeys yet",
    "正在加载": "Loading",
    "处理中...": "Processing...",
    "注册一个 Passkey， 即可使用 Touch ID、Face ID 或其他设备认证方式登录。": "Register a Passkey to log in with Touch ID, Face ID, or another device authentication method.",
    "可以为同一个账户注册多个设备上的 Passkey。": "Register Passkeys from multiple devices for the same account.",
    "管理当前账户已经注册的 Passkey。 Passkey 本身由浏览器和操作系统安全保存， Demo 只保存 Credential 元数据。": "Manage this account’s Passkeys. The browser and operating system protect them; the demo stores credential metadata.",
    "管理当前账户已经注册的 Passkey。 注册新的 Passkey 前需要验证当前账户密码。 Passkey 本身由浏览器和操作系统安全保存， Demo 只保存 Credential 元数据。": "Manage this account’s Passkeys. Confirm your password before registering a new one. The browser and operating system protect Passkeys; the demo stores credential metadata.",
    "管理当前账户已经注册的 Passkey。 注册新的 Passkey 前需要验证当前账户密码。 Passkey 本身由浏览器和操作系统安全保存， 服务器只保存 Credential 元数据。": "Manage this account’s Passkeys. Confirm your password before registering a new one. The browser and operating system protect Passkeys; the server stores credential metadata.",
    "一个使用浏览器原生 WebAuthn API、 Mock API 和 localStorage 构建的 Passkey 账户登录完整参考实现。": "An account and Passkey login demo built with native browser WebAuthn, a Mock API, and localStorage.",
    "一个使用浏览器原生 WebAuthn API、 FastAPI、MySQL 和真实 WebAuthn 服务端验证构建的 Passkey 账户登录完整参考实现。": "An account and Passkey login demo built with native browser WebAuthn, FastAPI, MySQL, and server-side verification.",
    "使用 JavaScript 模拟后端接口， 不需要数据库和真实服务器。": "Simulate backend APIs with JavaScript, without a database or application server.",
    "使用浏览器原生 WebAuthn API 注册真实 Passkey。": "Register real Passkeys through native browser WebAuthn APIs.",
    "支持 Touch ID、Face ID、 Windows Hello 等系统认证。": "Supports system authentication such as Touch ID, Face ID, and Windows Hello.",
    "FastAPI 提供真实 HTTP 接口， MySQL 保存账户、Session 和 Passkey。": "FastAPI provides HTTP APIs; MySQL stores accounts, sessions, and Passkeys.",
    "这个 Demo 模拟一个完整的账户登录 与 Passkey 集成流程。": "This demo simulates an account login flow with Passkey integration.",
    "这个 Demo 展示真实的账户登录 与 Passkey 集成流程。": "This demo demonstrates account login with server-side Passkey integration.",
    "浏览器负责调用操作系统的 Authenticator， Mock API 模拟真实后端的 Challenge、 Credential 和 Session 管理。": "The browser invokes the operating system’s authenticator. The Mock API simulates challenge, credential, and session management.",
    "浏览器负责调用操作系统的 Authenticator， FastAPI 负责处理真实的后端逻辑，包括 Challenge、 Credential 和 Session 管理。": "The browser invokes the operating system’s authenticator. FastAPI handles backend challenge, credential, and session management.",
    "Passkey / WebAuthn 登录示例。 按 Simple → Complete → Complete Python 逐步学习， 从浏览器交互、密码登录到真实后端验证与存储。": "Learn Passkey / WebAuthn step by step: Simple → Complete → Complete Python, from browser interactions and passwords to backend verification and storage.",
    "第一步 · 基础交互 · Mock": "Step 1 · Basic interactions · Mock",
    "第二步 · 密码 + Passkey · Mock": "Step 2 · Password + Passkey · Mock",
    "第三步 · FastAPI + MySQL · 真实接口": "Step 3 · FastAPI + MySQL · Real APIs",
    "最简单的 Passkey / WebAuthn 登录示例， 不包含密码，专注理解 Passkey 的基本注册、 登录和管理流程。": "Start with Passkey registration, login, and management using a simplified account flow without passwords.",
    "在 Simple 版本基础上增加密码认证， 用于理解真实账户系统中密码与 Passkey 如何配合使用。": "Add password authentication to Simple and learn how passwords and Passkeys work together in an account system.",
    "保留 Complete 的账户交互，由服务器验证密码和 WebAuthn 响应， 保存凭证公钥并建立真实登录 Session。": "Keep Complete’s interactions while the server verifies passwords and WebAuthn responses, stores public keys, and creates login sessions.",
    "无需密码": "No password required",
    "账户注册 + 密码": "Account registration with password",
    "账户名 + 密码登录": "Username and password login",
    "密码验证后注册 Passkey": "Confirm password before binding",
    "Argon2id 密码验证": "Argon2id password verification",
    "服务端 Challenge 与验签": "Server challenges and signature verification",
    "MySQL 保存账户和凭证": "Accounts and credentials in MySQL",
    "HttpOnly Cookie 登录态": "HttpOnly session cookies",
    "需先完成 Python 示例数据库配置": "Requires Python demo database setup",
    "进入 Simple →": "Open Simple →",
    "进入 Complete →": "Open Complete →",
    "进入 Complete Python →": "Open Complete Python →",
    "建议先体验": "Start with",
    "，再对比": "then compare",
    "，最后体验": "and finally try",
    "，了解同一套流程如何接入真实后端。": "to see how the same flow connects to a real backend.",
    "当前浏览器不支持 WebAuthn / Passkey": "This browser does not support WebAuthn / Passkeys.",
    "浏览器没有返回 Credential": "The browser did not return a credential.",
    "Passkey 注册成功": "Passkey registered successfully.",
    "当前未登录": "You are not signed in.",
    "登录账户不存在": "The signed-in account no longer exists.",
    "请输入账户名": "Enter a username.",
    "账户名至少需要 3 个字符": "Username must have at least 3 characters.",
    "密码至少需要 6 个字符": "Password must have at least 6 characters.",
    "账户已经存在": "This account already exists.",
    "账户名已存在": "This username already exists.",
    "账户不存在": "Account not found.",
    "账户名或密码错误": "Incorrect username or password.",
    "账户密码错误": "Incorrect account password.",
    "Credential 不存在": "Credential is missing.",
    "该 Passkey 已经注册": "This Passkey is already registered.",
    "Passkey 不存在": "Passkey not found.",
    "无法找到该 Passkey 所属账户": "Cannot find the account associated with this Passkey.",
    "Passkey 已停用": "This Passkey is disabled.",
    "登录已失效，请重新登录": "Your session has expired. Please sign in again.",
    "WebAuthn Challenge ID 无效": "Invalid WebAuthn challenge ID.",
    "请先验证账户密码": "Confirm your account password first.",
    "WebAuthn 注册 Challenge 不存在": "Registration challenge is missing.",
    "WebAuthn 注册 Challenge 已失效": "Registration challenge has expired or is invalid.",
    "WebAuthn 登录 Challenge 不存在": "Authentication challenge is missing.",
    "WebAuthn 登录 Challenge 已失效": "Authentication challenge has expired or is invalid.",
    "Credential ID 不存在": "Credential ID is missing.",
    "Credential ID 无效": "Invalid credential ID.",
    "Passkey 不存在或已停用": "Passkey not found or disabled.",
    "Passkey 所属账户不存在": "The account associated with this Passkey no longer exists.",
    "当前登录 Session 不存在": "The current session no longer exists.",
    "操作已取消或超时，请重试": "The operation was canceled or timed out. Please try again.",
    "请检查安全连接、RP ID 与访问域名是否一致": "Check the secure connection, RP ID, and page hostname.",
    "网络请求失败，请检查服务是否已启动": "Network request failed. Check that the server is running.",
    "创建账户 · Account Login + Passkey": "Create account · Account Login + Passkey",
    "登录 · Account Login + Passkey": "Log in · Account Login + Passkey",
    "Passkey 管理 · Account Login": "Passkey management · Account Login",
    "密码登录": "Password Login",
    "模拟账户登录": "Traditional Mock Login",
    "认证流程": "Authentication Flow",
    "Passkey 注册": "Passkey Registration",
    "设备认证登录": "Biometric Login",
    "真实接口 + MySQL": "Real API + MySQL",
    "WebAuthn 架构": "WebAuthn Architecture"
};
    messages["我的 Passkey"] = "My Passkey";
    messages["Passkey 管理"] = "Passkey management";
    messages["凭证管理"] = "Passkey Management";
    const reverse = Object.fromEntries(Object.entries(messages).map(([zh, en]) => [en, zh]));
    const storageKey = "passkey-demo-language";
    let language;
    try { language = localStorage.getItem(storageKey); } catch (_) {}
    if (!["zh-CN", "en"].includes(language)) {
        language = (navigator.language || "en").toLowerCase().startsWith("zh") ? "zh-CN" : "en";
    }
    const normalize = text => String(text).replace(/\s+/g, " ").trim();
    const fieldNames = {username: "账户名", password: "密码", credential: "凭证"};
    const fieldZh = field => fieldNames[field] || field;
    const fieldEn = field => Object.keys(fieldNames).find(key => fieldNames[key] === field) || field;
    const patterns = [
        [/^(.+)：至少需要 (\d+) 个字符$/, /^(.+): String should have at least (\d+) characters$/, (field, n) => `${fieldZh(field)}：至少需要 ${n} 个字符`, (field, n) => `${fieldEn(field)}: String should have at least ${n} characters`],
        [/^(.+)：最多允许 (\d+) 个字符$/, /^(.+): String should have at most (\d+) characters$/, (field, n) => `${fieldZh(field)}：最多允许 ${n} 个字符`, (field, n) => `${fieldEn(field)}: String should have at most ${n} characters`],
        [/^(.+)：此字段不能为空$/, /^(.+): Field required$/, field => `${fieldZh(field)}：此字段不能为空`, field => `${fieldEn(field)}: Field required`],
        [/^(.+)：请输入文本$/, /^(.+): Input should be a valid string$/, field => `${fieldZh(field)}：请输入文本`, field => `${fieldEn(field)}: Input should be a valid string`],
        [/^(.+)：应为 JSON 对象$/, /^(.+): Input should be a valid dictionary$/, field => `${fieldZh(field)}：应为 JSON 对象`, field => `${fieldEn(field)}: Input should be a valid dictionary`],
        [/^账户 (.+) 创建成功$/, /^Account (.+) created successfully\.$/, name => `账户 ${name} 创建成功`, name => `Account ${name} created successfully.`],
        [/^欢迎回来，(.+)$/, /^Welcome back, (.+)$/, name => `欢迎回来，${name}`, name => `Welcome back, ${name}`],
        [/^登录成功，欢迎 (.+)$/, /^Signed in successfully, welcome (.+)$/, name => `登录成功，欢迎 ${name}`, name => `Signed in successfully, welcome ${name}`],
        [/^创建：\s*(.+)$/, /^Created: (.+)$/, value => `创建：${value}`, value => `Created: ${value}`],
        [/^最后使用：\s*(.+)$/, /^Last used: (.+)$/, value => `最后使用：${value}`, value => `Last used: ${value}`],
        [/^Credential ID：\s*(.+)$/, /^Credential ID: (.+)$/, value => `Credential ID：${value}`, value => `Credential ID: ${value}`],
        [/^Passkey 注册验证失败: (.+)$/, /^Passkey registration verification failed: (.+)$/, value => `Passkey 注册验证失败: ${value}`, value => `Passkey registration verification failed: ${value}`],
        [/^Passkey 登录验证失败: (.+)$/, /^Passkey authentication failed: (.+)$/, value => `Passkey 登录验证失败: ${value}`, value => `Passkey authentication failed: ${value}`],
    ];
    function t(text) {
        const key = normalize(text);
        if (key.includes("; ")) return key.split("; ").map(t).join("; ");
        const zh = reverse[key] || key;
        if (messages[zh]) return language === "en" ? messages[zh] : zh;
        for (const [zhPattern, enPattern, toZh, toEn] of patterns) {
            const match = key.match(zhPattern) || key.match(enPattern);
            if (match) return (language === "en" ? toEn : toZh)(...match.slice(1));
        }
        return text;
    }
    // 浏览器错误由页面转换；底层库无法识别的诊断保留原文。
    function error(value) {
        if (value.name === "NotAllowedError") return t("操作已取消或超时，请重试");
        if (value.name === "SecurityError") return t("请检查安全连接、RP ID 与访问域名是否一致");
        if (value instanceof TypeError && /fetch|network/i.test(value.message)) return t("网络请求失败，请检查服务是否已启动");
        return t(value.message || String(value));
    }
    // FastAPI 422 的字段说明优先按当前语言呈现。
    function validationMessage(item) {
        const field = (item.loc || []).filter(part => part !== "body").join(".");
        if (language === "en") return `${field}: ${item.msg}`;
        const label = ({username: "账户名", password: "密码", credential: "凭证"})[field] || field;
        const ctx = item.ctx || {};
        const message = ({
            string_too_short: `至少需要 ${ctx.min_length} 个字符`,
            string_too_long: `最多允许 ${ctx.max_length} 个字符`,
            missing: "此字段不能为空", string_type: "请输入文本", dict_type: "应为 JSON 对象"
        })[item.type] || item.msg;
        return `${label}：${message}`;
    }
    const original = new WeakMap();
    let observer;
    function update(node, value, write) {
        const old = original.get(node);
        const source = old && old.rendered === value ? old.source : value;
        const translation = t(source);
        // 保留文本节点两端空白，避免英文内联链接与相邻句子粘连。
        const rendered = translation === source ? source
            : source.match(/^\s*/)[0] + translation + source.match(/\s*$/)[0];
        original.set(node, {source, rendered});
        if (rendered !== value) write(rendered);
    }
    function render() {
        if (observer) observer.disconnect();
        document.documentElement.lang = language;
        const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
            // 用户名、凭证名及输入内容不是界面文案，不做翻译。
            if (node.parentElement?.closest('script, style, textarea, [data-i18n-ignore], .header-user')) continue;
            if (node.parentElement?.closest('.passkey-name') && !['我的 Passkey', 'My Passkey'].includes(normalize(node.data))) continue;
            const current = node;
            update(current, current.data, value => { current.data = value; });
        }
        for (const element of document.querySelectorAll('[placeholder], [title], [aria-label]')) {
            if (element.closest('[data-i18n-ignore]')) continue;
            for (const attribute of ['placeholder', 'title', 'aria-label']) {
                const value = element.getAttribute(attribute);
                if (value !== null) element.setAttribute(attribute, t(value));
            }
        }
        if (observer) observer.observe(document.documentElement, {subtree: true, childList: true, characterData: true});
    }
    function setLanguage(value) {
        if (!["zh-CN", "en"].includes(value)) return;
        language = value;
        try { localStorage.setItem(storageKey, value); } catch (_) {}
        render();
        const select = document.getElementById('demo-language');
        if (select) select.value = value;
    }
    function boot() {
        const nav = document.createElement('div');
        nav.setAttribute('data-i18n-ignore', '');
        nav.className = 'demo-language';
        nav.innerHTML = '<label for="demo-language">语言 / Language</label><select id="demo-language" aria-label="语言 / Language"><option value="zh-CN">中文</option><option value="en">English</option></select>';
        const style = document.createElement('style');
        style.textContent = '.demo-language{position:fixed;top:10px;right:12px;z-index:1000;display:flex;align-items:center;gap:8px;padding:6px 10px;background:#fff;border:1px solid #d1d5db;border-radius:8px;color:#374151;font:12px system-ui;box-shadow:0 2px 8px #0000000d}.demo-language select{font:inherit;padding:4px;border:1px solid #d1d5db;border-radius:4px;background:#fff;color:#111827}';
        document.head.append(style);
        document.body.append(nav);
        const select = nav.querySelector('select');
        select.value = language;
        select.addEventListener('change', () => setLanguage(select.value));
        observer = new MutationObserver(render);
        render();
    }
    window.I18n = {t, error, validationMessage, setLanguage, get language() {return language;}};
    if (document.readyState === "loading") document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
