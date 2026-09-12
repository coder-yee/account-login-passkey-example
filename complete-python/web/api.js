/**
 * Real API Adapter
 *
 * 与 Mock API 保持相同的方法名，
 * 这样 app.js 的 WebAuthn 流程可以直接复用。
 *
 * 浏览器 -> FastAPI -> MySQL
 */

const MockAPI = (() => {
    async function request(
        method,
        url,
        body = undefined
    ) {
        const response = await fetch(
            url,
            {
                method,
                credentials: "same-origin",
                headers: body === undefined
                    ? {}
                    : {
                        "Content-Type":
                            "application/json"
                    },
                body:
                    body === undefined
                        ? undefined
                        : JSON.stringify(body)
            }
        );

        const contentType =
            response.headers.get(
                "content-type"
            ) || "";

        const data =
            contentType.includes(
                "application/json"
            )
                ? await response.json()
                : await response.text();

        if (!response.ok) {
            const detail = data && typeof data === "object" ? data.detail : null;
            // FastAPI 的 422 detail 是数组，直接转字符串会显示 [object Object]。
            const message = Array.isArray(detail)
                ? detail.map(item => window.I18n
                    ? window.I18n.validationMessage(item)
                    : `${(item.loc || []).join(".")}: ${item.msg}`).join("; ")
                : typeof detail === "string" ? detail : `HTTP ${response.status}`;
            const error = new Error(message);
            error.status = response.status;
            throw error;
        }

        return data;
    }


    async function registerAccount(
        username,
        password
    ) {
        return request(
            "POST",
            "/api/account/register",
            {
                username,
                password
            }
        );
    }


    async function loginAccount(
        username,
        password
    ) {
        return request(
            "POST",
            "/api/account/login",
            {
                username,
                password
            }
        );
    }


    async function verifyAccountPassword(
        password
    ) {
        return request(
            "POST",
            "/api/account/password/verify",
            {
                password
            }
        );
    }


    async function getSession() {
        try {
            const result =
                await request(
                    "GET",
                    "/api/account/me"
                );

            return {
                account: result.account
            };
        } catch (error) {
            if (error.status === 401) {
                return null;
            }

            throw error;
        }
    }


    async function logout() {
        return request(
            "POST",
            "/api/account/logout"
        );
    }


    async function getPasskeyRegisterOptions() {
        return request(
            "POST",
            "/api/passkey/register/options"
        );
    }


    async function verifyPasskeyRegistration(
        credential
    ) {
        return request(
            "POST",
            "/api/passkey/register/verify",
            {
                credential
            }
        );
    }


    async function getPasskeyLoginOptions() {
        return request(
            "POST",
            "/api/passkey/login/options"
        );
    }


    async function verifyPasskeyLogin(
        credential
    ) {
        return request(
            "POST",
            "/api/passkey/login/verify",
            {
                credential
            }
        );
    }


    async function getPasskeys() {
        return request(
            "GET",
            "/api/passkey/list"
        );
    }


    async function enablePasskey(
        passkeyId
    ) {
        return request(
            "POST",
            `/api/passkey/${passkeyId}/enable`
        );
    }


    async function disablePasskey(
        passkeyId
    ) {
        return request(
            "POST",
            `/api/passkey/${passkeyId}/disable`
        );
    }


    async function getDatabase() {
        return request(
            "GET",
            "/api/debug/database"
        );
    }


    return {
        registerAccount,
        loginAccount,
        verifyAccountPassword,

        getSession,
        logout,

        getPasskeyRegisterOptions,
        verifyPasskeyRegistration,

        getPasskeyLoginOptions,
        verifyPasskeyLogin,

        getPasskeys,
        enablePasskey,
        disablePasskey,

        getDatabase
    };
})();

window.MockAPI = MockAPI;
