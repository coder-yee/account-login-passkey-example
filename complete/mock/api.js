/**
 * Mock API
 *
 * 模拟真实后端接口：
 *
 * POST /api/account/register
 * POST /api/account/login
 *
 * POST /api/passkey/register/options
 * POST /api/passkey/register/verify
 *
 * POST /api/passkey/login/options
 * POST /api/passkey/login/verify
 *
 * GET  /api/passkey/list
 * POST /api/passkey/enable
 * POST /api/passkey/disable
 *
 * POST /api/logout
 *
 * 数据全部保存在 localStorage。
 *
 * 注意：
 * 这是 Demo Mock API。
 * 不进行真正的 WebAuthn 服务端密码学验证。
 */

const MockAPI = (() => {
    const STORAGE_KEY = "account-login-passkey-example-complete";

    const RP_NAME = "Account Login Passkey Example";

    /**
     * WebAuthn RP ID
     *
     * localhost 测试：
     *
     * localhost
     *
     * 真实部署：
     *
     * example.com
     */
    const RP_ID = window.location.hostname || "localhost";

    const DEFAULT_DB = {
        accounts: [], passkeys: [], challenges: [], session: null
    };

    // ------------------------------------------------------------
    // Storage
    // ------------------------------------------------------------

    function loadDB() {
        try {
            const value = localStorage.getItem(STORAGE_KEY);

            if (!value) {
                return structuredClone(DEFAULT_DB);
            }

            const db = JSON.parse(value);

            return {
                accounts: Array.isArray(db.accounts) ? db.accounts : [],
                passkeys: Array.isArray(db.passkeys) ? db.passkeys : [],
                challenges: Array.isArray(db.challenges) ? db.challenges : [],
                session: db.session || null
            };
        } catch (error) {
            console.error("Mock API: failed to load database", error);

            return structuredClone(DEFAULT_DB);
        }
    }

    function saveDB(db) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    }

    function reset() {
        localStorage.removeItem(STORAGE_KEY);
    }

    // ------------------------------------------------------------
    // Utils
    // ------------------------------------------------------------

    function uuid() {
        if (crypto.randomUUID) {
            return crypto.randomUUID();
        }

        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === "x" ? r : (r & 0x3 | 0x8);

            return v.toString(16);
        });
    }

    function randomBytes(length = 32) {
        const bytes = new Uint8Array(length);

        crypto.getRandomValues(bytes);

        return bytes;
    }

    function base64UrlEncode(bytes) {
        let binary = "";

        for (const byte of bytes) {
            binary += String.fromCharCode(byte);
        }

        return btoa(binary)
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/g, "");
    }

    function base64UrlDecode(value) {
        const padding = "=".repeat((4 - value.length % 4) % 4);

        const base64 = value
            .replace(/-/g, "+")
            .replace(/_/g, "/") + padding;

        const binary = atob(base64);

        const bytes = new Uint8Array(binary.length);

        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        return bytes;
    }

    function textToBytes(text) {
        return new TextEncoder().encode(text);
    }

    function bytesToBase64Url(bytes) {
        return base64UrlEncode(bytes);
    }

    async function hashPassword(password) {
        const data = textToBytes(String(password || ""));

        const hash = await crypto.subtle.digest("SHA-256", data);

        return bytesToBase64Url(new Uint8Array(hash));
    }

    function now() {
        return new Date().toISOString();
    }

    function sleep(ms = 150) {
        return new Promise(resolve => {
            setTimeout(resolve, ms);
        });
    }

    function logRequest(method, url, data = null) {
        console.log(`%c[Mock API] ${method} ${url}`, "color:#2563eb;font-weight:bold", data || "");
    }

    function logResponse(url, data) {
        console.log(`%c[Mock API] 200 ${url}`, "color:#16a34a;font-weight:bold", data);
    }

    function getAccountById(db, accountId) {
        return db.accounts.find(item => item.id === accountId) || null;
    }

    function getAccountByUsername(db, username) {
        return db.accounts.find(item => item.username === username) || null;
    }

    function getCurrentSession(db) {
        if (!db.session) {
            return null;
        }

        return db.session;
    }

    function requireSession(db) {
        if (!db.session) {
            throw new Error("当前未登录");
        }

        const account = getAccountById(db, db.session.accountId);

        if (!account) {
            throw new Error("登录账户不存在");
        }

        return {
            session: db.session, account
        };
    }

    // ------------------------------------------------------------
    // Account
    // ------------------------------------------------------------

    async function registerAccount(username, password) {
        logRequest("POST", "/api/account/register", {username});

        await sleep();

        username = String(username || "").trim();
        password = String(password || "");

        if (!username) {
            throw new Error("请输入账户名");
        }

        if (username.length < 3) {
            throw new Error("账户名至少需要 3 个字符");
        }

        if (!password) {
            throw new Error("请输入密码");
        }

        if (password.length < 6) {
            throw new Error("密码至少需要 6 个字符");
        }

        const db = loadDB();

        const exists = getAccountByUsername(db, username);

        if (exists) {
            throw new Error("账户已经存在");
        }

        const passwordHash = await hashPassword(password);

        const account = {
            id: uuid(), username, passwordHash, createdAt: now()
        };

        db.accounts.push(account);

        saveDB(db);

        logResponse("/api/account/register", account);

        return account;
    }

    async function loginAccount(username, password) {
        logRequest("POST", "/api/account/login", {username});

        await sleep();

        const db = loadDB();

        const account = getAccountByUsername(db, username);

        if (!account) {
            throw new Error("账户不存在");
        }

        if (!password) {
            throw new Error("请输入密码");
        }

        const passwordHash = await hashPassword(password);

        if (account.passwordHash !== passwordHash) {
            throw new Error("账户名或密码错误");
        }

        const session = {
            id: uuid(), accountId: account.id, token: "mock_" + uuid(), createdAt: now()
        };

        db.session = session;

        saveDB(db);

        const result = {
            account, session
        };

        logResponse("/api/account/login", result);

        return result;
    }

    async function verifyAccountPassword(password) {
        logRequest("POST", "/api/account/password/verify");

        await sleep();

        const db = loadDB();

        const {account} = requireSession(db);

        if (!password) {
            throw new Error("请输入密码");
        }

        const passwordHash = await hashPassword(password);

        if (account.passwordHash !== passwordHash) {
            throw new Error("账户密码错误");
        }

        logResponse("/api/account/password/verify", {success: true});

        return {
            success: true
        };
    }

    // ------------------------------------------------------------
    // Session
    // ------------------------------------------------------------

    async function getSession() {
        const db = loadDB();

        if (!db.session) {
            return null;
        }

        const account = getAccountById(db, db.session.accountId);

        if (!account) {
            return null;
        }

        return {
            session: db.session, account
        };
    }

    async function logout() {
        logRequest("POST", "/api/logout");

        await sleep();

        const db = loadDB();

        db.session = null;

        saveDB(db);

        logResponse("/api/logout", {success: true});

        return {
            success: true
        };
    }

    // ------------------------------------------------------------
    // Passkey Registration
    // ------------------------------------------------------------

    async function getPasskeyRegisterOptions() {
        logRequest("POST", "/api/passkey/register/options");

        await sleep();

        const db = loadDB();

        const {account} = requireSession(db);

        const challenge = base64UrlEncode(randomBytes(32));

        const challengeId = uuid();

        db.challenges.push({
            id: challengeId, accountId: account.id, type: "registration", challenge, createdAt: now()
        });

        saveDB(db);

        const userIdBytes = textToBytes(account.id);

        const options = {
            challenge, rp: {
                name: RP_NAME, id: RP_ID
            },

            user: {
                id: bytesToBase64Url(userIdBytes), name: account.username, displayName: account.username
            },

            pubKeyCredParams: [{
                type: "public-key", alg: -7
            }, {
                type: "public-key", alg: -257
            }],

            timeout: 60000,

            authenticatorSelection: {
                residentKey: "preferred", userVerification: "preferred"
            },

            attestation: "none"
        };

        logResponse("/api/passkey/register/options", options);

        return options;
    }

    async function verifyPasskeyRegistration(credential) {
        logRequest("POST", "/api/passkey/register/verify", credential);

        await sleep();

        const db = loadDB();

        const {account} = requireSession(db);

        if (!credential) {
            throw new Error("Credential 不存在");
        }

        /**
         * Demo：
         *
         * 这里只保存浏览器返回的 Credential ID。
         *
         * 真实后端必须验证：
         *
         * clientDataJSON
         * attestationObject
         * challenge
         * origin
         * RP ID
         * credential public key
         * authenticator data
         */
        const credentialId = credential.id;

        const exists = db.passkeys.find(item => item.credentialId === credentialId);

        if (exists) {
            throw new Error("该 Passkey 已经注册");
        }

        const passkey = {
            id: uuid(),

            accountId: account.id,

            credentialId,

            type: credential.type || "public-key",

            name: "我的 Passkey",

            enabled: true,

            createdAt: now(),

            lastUsedAt: null,

            authenticatorAttachment: credential.authenticatorAttachment || null,

            transports: credential.response && typeof credential.response.getTransports === "function" ? credential.response.getTransports() : []
        };

        db.passkeys.push(passkey);

        db.challenges = db.challenges.filter(item => !(item.accountId === account.id && item.type === "registration"));

        saveDB(db);

        logResponse("/api/passkey/register/verify", passkey);

        return passkey;
    }

    // ------------------------------------------------------------
    // Passkey List
    // ------------------------------------------------------------

    async function getPasskeys() {
        logRequest("GET", "/api/passkey/list");

        await sleep();

        const db = loadDB();

        const {account} = requireSession(db);

        const passkeys = db.passkeys.filter(item => item.accountId === account.id);

        logResponse("/api/passkey/list", passkeys);

        return passkeys;
    }

    // ------------------------------------------------------------
    // Enable / Disable
    // ------------------------------------------------------------

    async function enablePasskey(passkeyId) {
        return setPasskeyEnabled(passkeyId, true);
    }

    async function disablePasskey(passkeyId) {
        return setPasskeyEnabled(passkeyId, false);
    }

    async function setPasskeyEnabled(passkeyId, enabled) {
        logRequest("POST", enabled ? "/api/passkey/enable" : "/api/passkey/disable", {
            passkeyId
        });

        await sleep();

        const db = loadDB();

        const {account} = requireSession(db);

        const passkey = db.passkeys.find(item => item.id === passkeyId && item.accountId === account.id);

        if (!passkey) {
            throw new Error("Passkey 不存在");
        }

        passkey.enabled = enabled;

        saveDB(db);

        logResponse(enabled ? "/api/passkey/enable" : "/api/passkey/disable", passkey);

        return passkey;
    }

    // ------------------------------------------------------------
    // Passkey Login
    // ------------------------------------------------------------

    async function getPasskeyLoginOptions() {
        logRequest("POST", "/api/passkey/login/options");

        await sleep();

        const db = loadDB();

        const challenge = base64UrlEncode(randomBytes(32));

        const challengeId = uuid();

        db.challenges.push({
            id: challengeId,

            accountId: null,

            type: "authentication",

            challenge,

            createdAt: now()
        });

        saveDB(db);

        /**
         * allowCredentials 留空：
         *
         * 使用 Discoverable Credential。
         *
         * 浏览器可以直接让用户选择
         * 当前设备上的 Passkey。
         */
        const options = {
            challenge,

            rpId: RP_ID,

            timeout: 60000,

            userVerification: "preferred",

            allowCredentials: []
        };

        logResponse("/api/passkey/login/options", options);

        return options;
    }

    async function verifyPasskeyLogin(credential) {
        logRequest("POST", "/api/passkey/login/verify", credential);

        await sleep();

        const db = loadDB();

        if (!credential) {
            throw new Error("Credential 不存在");
        }

        /**
         * Demo 模式：
         *
         * 浏览器返回的 userHandle
         * 对应我们注册时的 account.id。
         */
        let account = null;

        if (credential.response && credential.response.userHandle) {
            try {
                const userHandle = credential.response.userHandle;

                const accountId = new TextDecoder().decode(userHandle);

                account = getAccountById(db, accountId);
            } catch (error) {
                console.warn("Unable to decode userHandle", error);
            }
        }

        /**
         * fallback：
         *
         * 如果浏览器没有返回 userHandle，
         * 可以根据 Credential ID 查找账户。
         */
        if (!account) {
            const passkey = db.passkeys.find(item => item.credentialId === credential.id);

            if (passkey) {
                account = getAccountById(db, passkey.accountId);
            }
        }

        if (!account) {
            throw new Error("无法找到该 Passkey 所属账户");
        }

        const passkey = db.passkeys.find(item => item.credentialId === credential.id && item.accountId === account.id);

        if (!passkey) {
            throw new Error("Passkey 不存在");
        }

        if (!passkey.enabled) {
            throw new Error("Passkey 已停用");
        }

        passkey.lastUsedAt = now();

        const session = {
            id: uuid(),

            accountId: account.id,

            token: "mock_" + uuid(),

            createdAt: now()
        };

        db.session = session;

        db.challenges = db.challenges.filter(item => item.type !== "authentication");

        saveDB(db);

        const result = {
            success: true, account, session, passkey
        };

        logResponse("/api/passkey/login/verify", result);

        return result;
    }

    // ------------------------------------------------------------
    // Debug
    // ------------------------------------------------------------

    async function getDatabase() {
        return loadDB();
    }

    // ------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------

    return {
        registerAccount, loginAccount, verifyAccountPassword,

        getSession, logout,

        getPasskeyRegisterOptions, verifyPasskeyRegistration,

        getPasskeyLoginOptions, verifyPasskeyLogin,

        getPasskeys,

        enablePasskey, disablePasskey,

        getDatabase, reset
    };
})();

window.MockAPI = MockAPI;