/**
 * Account Login + Passkey Example
 *
 * Frontend common application logic.
 */

const App = (() => {

    // ------------------------------------------------------------
    // Utils
    // ------------------------------------------------------------

    function $(selector) {
        return document.querySelector(selector);
    }

    function $$(selector) {
        return document.querySelectorAll(selector);
    }

    function showError(message) {
        const element = $("#errorMessage");

        if (!element) {
            alert(message);
            return;
        }

        element.textContent = message;
        element.classList.remove("hidden");
    }

    function hideError() {
        const element = $("#errorMessage");

        if (element) {
            element.classList.add("hidden");
        }
    }

    function showSuccess(message) {
        const element = $("#successMessage");

        if (!element) {
            alert(message);
            return;
        }

        element.textContent = message;
        element.classList.remove("hidden");
    }

    function hideSuccess() {
        const element = $("#successMessage");

        if (element) {
            element.classList.add("hidden");
        }
    }

    function setLoading(button, loading) {
        if (!button) {
            return;
        }

        if (loading) {
            button.dataset.originalText = button.textContent;

            button.disabled = true;

            button.textContent = "处理中...";
        } else {
            button.disabled = false;

            button.textContent = button.dataset.originalText || button.textContent;
        }
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatDate(value) {
        if (!value) {
            return "-";
        }

        return new Date(value)
            .toLocaleString();
    }

    function bytesToBase64Url(bytes) {
        let binary = "";

        for (const byte of bytes) {
            binary += String.fromCharCode(byte);
        }

        return btoa(binary)
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/g, "");
    }

    function base64UrlToBytes(value) {
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

    function credentialToJSON(credential) {
        if (!credential) {
            return null;
        }

        const result = {
            id: credential.id,

            rawId: bytesToBase64Url(new Uint8Array(credential.rawId)),

            type: credential.type,

            authenticatorAttachment: credential.authenticatorAttachment,

            response: {}
        };

        if (credential.response) {
            if (credential.response.clientDataJSON) {
                result.response.clientDataJSON = bytesToBase64Url(new Uint8Array(credential.response.clientDataJSON));
            }

            if (credential.response.attestationObject) {
                result.response.attestationObject = bytesToBase64Url(new Uint8Array(credential.response.attestationObject));
            }

            if (credential.response.authenticatorData) {
                result.response.authenticatorData = bytesToBase64Url(new Uint8Array(credential.response.authenticatorData));
            }

            if (credential.response.signature) {
                result.response.signature = bytesToBase64Url(new Uint8Array(credential.response.signature));
            }

            if (credential.response.userHandle) {
                result.response.userHandle = bytesToBase64Url(new Uint8Array(credential.response.userHandle));
            }

            if (typeof credential.response.getTransports === "function") {
                result.response.transports = credential.response.getTransports();
            }
        }

        return result;
    }

    function jsonToCredentialForLogin(credential) {
        /**
         * 这个函数只是为了把浏览器 Credential
         * 转换成普通 JSON。
         *
         * Mock API 本身并不需要恢复
         * ArrayBuffer。
         */
        return credentialToJSON(credential);
    }

    function isWebAuthnSupported() {
        return !!(window.PublicKeyCredential && navigator.credentials);
    }

    function ensureWebAuthn() {
        if (!isWebAuthnSupported()) {
            throw new Error("当前浏览器不支持 WebAuthn / Passkey");
        }
    }

    // ------------------------------------------------------------
    // Navigation
    // ------------------------------------------------------------

    function go(url) {
        window.location.href = url;
    }

    function goLogin() {
        go("login.html");
    }

    function goRegister() {
        go("register.html");
    }

    function goPasskey() {
        go("passkey.html");
    }

    function goHome() {
        go("index.html");
    }

    // ------------------------------------------------------------
    // Session
    // ------------------------------------------------------------

    async function getSession() {
        return MockAPI.getSession();
    }

    async function requireLogin() {
        const result = await getSession();

        if (!result) {
            goLogin();
            return null;
        }

        return result;
    }

    async function logout() {
        await MockAPI.logout();

        goLogin();
    }

    // ------------------------------------------------------------
    // Account Registration
    // ------------------------------------------------------------

    async function registerAccount(username) {
        hideError();
        hideSuccess();

        const button = $("#registerAccountButton");

        try {
            setLoading(button, true);

            const account = await MockAPI.registerAccount(username);

            showSuccess(`账户 ${account.username} 创建成功`);

            setTimeout(() => {
                goLogin();
            }, 700);

            return account;

        } catch (error) {
            showError((window.I18n ? window.I18n.error(error) : error.message));


        } finally {
            setLoading(button, false);
        }
    }

    // ------------------------------------------------------------
    // Account Login
    // ------------------------------------------------------------

    async function loginAccount(username) {
        hideError();
        hideSuccess();

        const button = $("#loginAccountButton");

        try {
            setLoading(button, true);

            const result = await MockAPI.loginAccount(username);

            showSuccess(`欢迎回来，${result.account.username}`);

            setTimeout(() => {
                goHome();
            }, 500);

            return result;

        } catch (error) {
            showError((window.I18n ? window.I18n.error(error) : error.message));


        } finally {
            setLoading(button, false);
        }
    }

    // ------------------------------------------------------------
    // Passkey Registration
    // ------------------------------------------------------------

    async function registerPasskey() {
        hideError();
        hideSuccess();

        const button = $("#registerPasskeyButton");

        try {
            ensureWebAuthn();

            const session = await requireLogin();

            if (!session) {
                return;
            }

            setLoading(button, true);

            /**
             * Step 1:
             *
             * Mock Server -> Registration Options
             */
            const options = await MockAPI
                .getPasskeyRegisterOptions();

            /**
             * Step 2:
             *
             * Base64URL -> ArrayBuffer
             */
            const publicKey = {
                ...options,

                challenge: base64UrlToBytes(options.challenge),

                user: {
                    ...options.user,

                    id: base64UrlToBytes(options.user.id)
                }
            };

            /**
             * Step 3:
             *
             * Browser WebAuthn
             *
             * 这里是真正调用浏览器/操作系统
             * 的 Passkey。
             */
            console.log("[WebAuthn] navigator.credentials.create()", publicKey);

            const credential = await navigator.credentials.create({
                publicKey
            });

            if (!credential) {
                throw new Error("浏览器没有返回 Credential");
            }

            /**
             * Step 4:
             *
             * Credential -> JSON
             */
            const credentialJSON = credentialToJSON(credential);

            console.log("[WebAuthn] Registration Credential", credentialJSON);

            /**
             * Step 5:
             *
             * Mock Server -> Verify
             */
            await MockAPI
                .verifyPasskeyRegistration(credentialJSON);

            showSuccess("Passkey 注册成功");

            await renderPasskeyPage();

        } catch (error) {
            console.error("Passkey registration failed:", error);

            showError((window.I18n ? window.I18n.error(error) : error.message));

        } finally {
            setLoading(button, false);
        }
    }

    // ------------------------------------------------------------
    // Passkey Login
    // ------------------------------------------------------------

    async function loginWithPasskey() {
        hideError();
        hideSuccess();

        const button = $("#passkeyLoginButton");

        try {
            ensureWebAuthn();

            setLoading(button, true);

            /**
             * Step 1:
             *
             * Mock Server -> Login Options
             */
            const options = await MockAPI
                .getPasskeyLoginOptions();

            /**
             * Step 2:
             *
             * Convert challenge
             */
            const publicKey = {
                ...options,

                challenge: base64UrlToBytes(options.challenge),

                allowCredentials: options.allowCredentials
                    .map(item => ({
                        ...item,

                        id: base64UrlToBytes(item.id)
                    }))
            };

            /**
             * Step 3:
             *
             * Browser WebAuthn
             *
             * 这里是真正调用系统 Passkey。
             */
            console.log("[WebAuthn] navigator.credentials.get()", publicKey);

            const credential = await navigator.credentials.get({
                publicKey
            });

            if (!credential) {
                throw new Error("浏览器没有返回 Credential");
            }

            /**
             * Step 4:
             *
             * Credential -> JSON
             */
            const credentialJSON = jsonToCredentialForLogin(credential);

            console.log("[WebAuthn] Authentication Credential", credentialJSON);

            /**
             * Step 5:
             *
             * Mock Server -> Verify
             */
            const result = await MockAPI
                .verifyPasskeyLogin(credentialJSON);

            showSuccess(`登录成功，欢迎 ${result.account.username}`);

            setTimeout(() => {
                goHome();
            }, 600);

            return result;

        } catch (error) {
            console.error("Passkey login failed:", error);

            showError((window.I18n ? window.I18n.error(error) : error.message));


        } finally {
            setLoading(button, false);
        }
    }

    // ------------------------------------------------------------
    // Passkey Management
    // ------------------------------------------------------------

    async function togglePasskey(passkeyId, enabled) {
        try {
            if (enabled) {
                await MockAPI
                    .enablePasskey(passkeyId);
            } else {
                await MockAPI
                    .disablePasskey(passkeyId);
            }

            await renderPasskeyPage();

        } catch (error) {
            showError((window.I18n ? window.I18n.error(error) : error.message));
        }
    }

    async function renderPasskeyPage() {
        const list = $("#passkeyList");

        if (!list) {
            return;
        }

        try {
            const session = await requireLogin();

            if (!session) {
                return;
            }

            const passkeys = await MockAPI.getPasskeys();

            if (!passkeys.length) {
                list.innerHTML = `
                    <div class="empty">
                        <div class="empty-icon">🔐</div>
                        <div class="empty-title">
                            暂无 Passkey
                        </div>
                        <div class="empty-description">
                            注册一个 Passkey，
                            即可使用 Touch ID、Face ID
                            或其他设备认证方式登录。
                        </div>
                    </div>
                `;

                return;
            }

            list.innerHTML = passkeys
                .map(passkey => {
                    const status = passkey.enabled ? "已启用" : "已停用";

                    const action = passkey.enabled ? "停用" : "启用";

                    const nextState = !passkey.enabled;

                    return `
                            <div
                                class="passkey-item"
                            >
                                <div
                                    class="passkey-icon"
                                >
                                    🔑
                                </div>

                                <div
                                    class="passkey-content"
                                >
                                    <div
                                        class="passkey-name"
                                    >
                                        ${escapeHtml(passkey.name)}
                                    </div>

                                    <div
                                        class="passkey-id"
                                    >
                                        Credential ID：
                                        ${escapeHtml(passkey.credentialId
                        .substring(0, 32))}...
                                    </div>

                                    <div
                                        class="passkey-meta"
                                    >
                                        <span
                                            class="${passkey.enabled ? "status-enabled" : "status-disabled"}"
                                        >
                                            ${status}
                                        </span>

                                        <span>
                                            创建：
                                            ${formatDate(passkey.createdAt)}
                                        </span>

                                        <span>
                                            最后使用：
                                            ${formatDate(passkey.lastUsedAt)}
                                        </span>
                                    </div>
                                </div>

                                <div
                                    class="passkey-action"
                                >
                                    <button
                                        class="button ${passkey.enabled ? "button-danger" : "button-secondary"}"
                                        data-passkey-id="${passkey.id}"
                                        data-enabled="${nextState}"
                                    >
                                        ${action}
                                    </button>
                                </div>
                            </div>
                        `;
                })
                .join("");

            $$("#passkeyList [data-passkey-id]")
                .forEach(button => {
                    button.addEventListener("click", async () => {
                        const id = button.dataset.passkeyId;

                        const enabled = button.dataset.enabled === "true";

                        await togglePasskey(id, enabled);
                    });
                });

        } catch (error) {
            showError((window.I18n ? window.I18n.error(error) : error.message));
        }
    }

    // ------------------------------------------------------------
    // Header
    // ------------------------------------------------------------

    async function renderHeader() {
        const element = $("#headerAccount");

        if (!element) {
            return;
        }

        const result = await getSession();

        if (!result) {
            element.innerHTML = `
                <a href="login.html">
                    登录
                </a>
            `;

            return;
        }

        element.innerHTML = `
            <span class="header-user">
                ${escapeHtml(result.account.username)}
            </span>

            <a href="passkey.html">
                Passkey
            </a>

            <button
                id="headerLogout"
                class="header-logout"
            >
                退出
            </button>
        `;

        const logoutButton = $("#headerLogout");

        if (logoutButton) {
            logoutButton.addEventListener("click", logout);
        }
    }

    // ------------------------------------------------------------
    // Home
    // ------------------------------------------------------------

    async function renderHome() {
        const accountElement = $("#homeAccount");

        const statusElement = $("#homeStatus");

        if (!accountElement && !statusElement) {
            return;
        }

        const result = await getSession();

        if (!result) {
            if (accountElement) {
                accountElement.removeAttribute("data-i18n-ignore");
                accountElement.textContent = "未登录";
            }

            if (statusElement) {
                statusElement.textContent = "未登录";
            }

            return;
        }

        if (accountElement) {
            accountElement.setAttribute("data-i18n-ignore", "");
            accountElement.textContent = result.account.username;
        }

        if (statusElement) {
            statusElement.textContent = "已登录";
            document.querySelectorAll(".auth-button").forEach(button => {
                button.style.display = statusElement ? "none" : "";
            });
        }
    }

    // ------------------------------------------------------------
    // Register Page
    // ------------------------------------------------------------

    function initRegisterPage() {
        const form = $("#registerForm");

        if (!form) {
            return;
        }

        form.addEventListener("submit", async event => {
            event.preventDefault();

            const username = $("#username").value;

            await registerAccount(username);
        });
    }

    // ------------------------------------------------------------
    // Login Page
    // ------------------------------------------------------------

    function initLoginPage() {
        const form = $("#loginForm");

        if (form) {
            form.addEventListener("submit", async event => {
                event.preventDefault();

                const username = $("#username").value;

                await loginAccount(username);
            });
        }

        const passkeyButton = $("#passkeyLoginButton");

        if (passkeyButton) {
            passkeyButton.addEventListener("click", loginWithPasskey);
        }
    }

    // ------------------------------------------------------------
    // Passkey Page
    // ------------------------------------------------------------

    async function initPasskeyPage() {
        const registerButton = $("#registerPasskeyButton");

        if (registerButton) {
            registerButton.addEventListener("click", registerPasskey);
        }

        await renderPasskeyPage();
    }

    // ------------------------------------------------------------
    // Debug
    // ------------------------------------------------------------

    async function debugDatabase() {
        const db = await MockAPI.getDatabase();

        console.log("%c[Mock Database]", "color:#9333ea;font-weight:bold", db);
    }

    // ------------------------------------------------------------
    // Init
    // ------------------------------------------------------------

    async function init() {
        await renderHeader();

        await renderHome();

        initRegisterPage();

        initLoginPage();

        await initPasskeyPage();

        await debugDatabase();
    }

    return {
        init,

        go, goLogin, goRegister, goPasskey, goHome,

        logout,

        registerPasskey, loginWithPasskey,

        togglePasskey
    };

})();

document.addEventListener("DOMContentLoaded", () => {
    App.init();
});