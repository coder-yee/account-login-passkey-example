# Complete Python: Add Passkey Login to an Account System

English | [中文](README.zh-CN.md)

Learning path: [simple](../simple/README.md) → [complete](../complete/README.md) → **complete-python (current)**

`complete-python` is the third step in the project. It carries forward Complete’s interactions and moves Mock storage and authentication responsibilities to a real server, demonstrating how to add Passkeys to an existing username-and-password account system. A user signs in, binds a Passkey to their account, and can then choose Passkey login. Both authentication methods establish the same kind of login session.

Use this Demo to learn what the browser does, what the server verifies and stores, and which parts to adapt for your own website.


The interface supports Chinese / English through the top-right selector. It initially follows the browser language and remembers your choice. System Passkey dialogs follow the browser or operating system. [web/i18n.js](web/i18n.js) is included locally for standalone operation.

## 1. The progression: simple → complete → complete-python

| Version | Implementation | Learning focus |
| --- | --- | --- |
| [simple](../simple/README.md) | Simplified username-only account flow, browser WebAuthn, Mock API, localStorage | Experience credential creation, account binding, login, and management |
| [complete](../complete/README.md) | Adds passwords, password login, and password confirmation before binding; retains Mock API and localStorage | Understand how Passkeys fit into an account system |
| complete-python | FastAPI, MySQL, py_webauthn verification, real HTTP requests, and Cookie sessions | Understand the server boundary and integrate the flow into a website |

The first two versions call the browser's WebAuthn APIs, but their simulated servers do not implement full cryptographic verification. `complete` uses browser-side SHA-256 to illustrate password comparison; this version uses server-side Argon2id password hashing.

[web/api.js](web/api.js) retains the name `MockAPI` so you can compare the versions. Here, its methods call FastAPI with `fetch()`. Accounts and login state are stored on the server rather than in localStorage.

### Compare with Complete: which responsibilities move to the server?

The page sequence remains password login, password confirmation, Passkey binding, and a choice of login methods. What changes is who determines the result and where that result is stored.

| Learning step | Complete Mock | Complete Python |
| --- | --- | --- |
| API calls | JavaScript updates localStorage; endpoint names are log labels | `web/api.js` sends HTTP requests to FastAPI |
| Password verification | Browser SHA-256 comparison against a local digest | Server Argon2id verification against a stored password hash |
| Confirmation before binding | Frontend call order, without server confirmation state | Confirmation time on the current session, a five-minute window for options, and a session-associated registration challenge |
| Credential verification | Store or look up Credential ID/account associations | Verify registration and store a public key; verify authentication signatures |
| Challenges | localStorage flow records | Database records checked for purpose, expiry, and applicable associations, then deleted on success |
| User identifiers | Business-account UUID encoded as WebAuthn `user.id` | A separately persisted random `webauthn_user_id` |
| Registration options | `residentKey: "preferred"` | `resident_key=REQUIRED` for the username-free login flow |
| Login state | One local `session` object | Multiple server sessions, with a cookie identifying the current one |

Both versions prefer user verification rather than requiring biometric or PIN verification for every ceremony. See section 9 for the policy choices.

## 2. What this version implements

- Account registration, password login, current-account lookup, and logout.
- Password confirmation within the current session before binding a Passkey.
- Server-generated WebAuthn options, stored challenges, and registration/authentication verification.
- Multiple Passkeys per account, with listing, enabling, and disabling.
- Passkey login without first entering a username: the server finds the stored credential and account, verifies the response, and creates a session.
- Argon2id password hashes, stored credential public keys, and SHA-256 hashes of session tokens.
- Same-origin pages and APIs served by FastAPI, with HttpOnly session cookies.
- An account-scoped debug endpoint, API documentation, and behavioral tests.

The Demo adds a login method to an existing account. Accounts are initially created with a username and password. Passkey-only account creation, conditional autofill, credential deletion, and account recovery are not implemented.

## 3. Run the Demo

This section describes **standalone startup**. You can also use the [root launcher](../README.md) to open all three examples. Pages are under `/complete-python/` in unified mode and `/` in standalone mode; both use this directory’s `.env`, database, and authentication code.

You need Python 3.10+, MySQL 8, and a browser/authenticator that supports WebAuthn. Device interaction depends on the browser and authenticator. The browser entry points are `navigator.credentials.create()` and `navigator.credentials.get()`; see [MDN's Web Authentication API overview](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API).

### Switch from the previous version

If Simple or Complete is still serving port 8000, stop that static server with `Ctrl+C`. This version runs the application with `python ./main.py`, not `python -m http.server`.

The versions illustrate implementation progression; they do not migrate data automatically. Mock accounts and credential associations live in separate localStorage entries, while this version reads MySQL. Create a test account and bind a Passkey here again.

The browser may still offer credentials previously created for localhost, but this backend lacks their corresponding public keys and account records. They cannot directly log in to this version. You do not need to clear the previous versions' data, and switching versions does not remove device credentials.

### Set up the environment

Starting from the repository root, run all subsequent commands inside `complete-python`:

```bash
cd complete-python
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
```

On Windows, activate the environment with `.venv\Scripts\activate`.

### Initialize a dedicated Demo database

[sql/schema.sql](sql/schema.sql) creates the `account_login_passkey` database and drops/recreates its four Demo tables. **Running it again removes their data. Use a separate Demo database; do not run it against your website's business database.**

```bash
mysql -uroot -p < sql/schema.sql
```

Update `.env` with your database credentials:

```env
DATABASE_URL="mysql+pymysql://root:password@127.0.0.1:3306/account_login_passkey?charset=utf8mb4"
WEBAUTHN_RP_ID="localhost"
WEBAUTHN_RP_NAME="Account Login Passkey Example"
WEBAUTHN_ORIGIN="http://localhost:8000"
SESSION_EXPIRE_SECONDS=86400
COOKIE_SECURE=false
```

`root:password` is a placeholder. Starting the server does not create database tables automatically.

### Start the server

```bash
python ./main.py
```

The default listen address is `localhost:8000`. For development, you can specify options and enable automatic reload:

```bash
python ./main.py --host localhost --port 8000 --reload
```

Run `python ./main.py --help` to list options. A port-only change requires updating `WEBAUTHN_ORIGIN` in `.env`; a browser-facing hostname change also requires reviewing `WEBAUTHN_RP_ID`. RP IDs do not contain ports.

- Demo: [http://localhost:8000/](http://localhost:8000/)
- API documentation: [http://localhost:8000/docs](http://localhost:8000/docs)
- Process health: [http://localhost:8000/health](http://localhost:8000/health)

Open pages through FastAPI so the pages and APIs share an origin. Opening HTML files directly or through a separate static server is not the setup used here. `/health` reports process status; it does not check database connectivity.

### Try the account lifecycle

1. Register an account. Usernames are trimmed and must contain 3–100 characters; passwords must contain 6–128 characters.
2. Sign in with the password. Account registration does not automatically sign you in.
3. Open Passkey management, enter the current password, and register a Passkey.
4. Complete the device interaction and inspect the credential list.
5. Log out and use Passkey login to enter the same account.
6. Enable or disable a credential and observe its availability for subsequent login.

Disabling a credential changes its website-side state. It does not remove the device's Passkey or revoke existing sessions. As in Complete, enable/disable operations do not request additional password confirmation; password login remains available to re-enable a credential.

## 4. Follow a request through the code

```text
web/*.html                  Pages and forms
    ↓
web/app.js                  UI, WebAuthn, binary/JSON conversion
    ↓
web/api.js                  HTTP requests and error handling
    ↓
app/routers/*.py            Account context and authentication flows
    ↓
app/models.py + database.py  SQLAlchemy access to MySQL
```

| File | Responsibility | Where to start reading |
| --- | --- | --- |
| [main.py](main.py) | API routes and static pages | How one server hosts the Demo |
| [web/app.js](web/app.js) | UI and credential serialization | `registerPasskey()` and `loginWithPasskey()` |
| [web/api.js](web/api.js) | Request adapter | Endpoint mapping, JSON, and cookies |
| [app/routers/account.py](app/routers/account.py) | Accounts, passwords, and sessions | What happens after password verification |
| [app/routers/passkey.py](app/routers/passkey.py) | Registration, authentication, and management | The `options`/`verify` pairs |
| [app/dependencies.py](app/dependencies.py) | Resolve the signed-in user | Shared session checks |
| [app/security.py](app/security.py) | Hashing, random tokens, and timestamps | Password handling versus session-token handling |
| [app/models.py](app/models.py), [sql/schema.sql](sql/schema.sql) | ORM models and database schema | Account, credential, session, and challenge relationships |
| [app/schemas.py](app/schemas.py), [app/config.py](app/config.py) | Input validation and settings | Client inputs versus server configuration |

Read password login first, followed by Passkey registration and then Passkey login. This makes the shared session mechanism easier to see.

### Follow familiar method names into the backend

Read [complete/mock/api.js](../complete/mock/api.js) alongside this version's [web/api.js](web/api.js), then follow the request into its Python handler:

| Frontend method | HTTP request | Backend handler |
| --- | --- | --- |
| `loginAccount()` | `POST /api/account/login` | `account.py`: `login()` |
| `verifyAccountPassword()` | `POST /api/account/password/verify` | `account.py`: `verify_account_password()` |
| `getPasskeyRegisterOptions()` | `POST /api/passkey/register/options` | `passkey.py`: `registration_options()` |
| `verifyPasskeyRegistration()` | `POST /api/passkey/register/verify` | `passkey.py`: `registration_verify()` |
| `getPasskeyLoginOptions()` | `POST /api/passkey/login/options` | `passkey.py`: `authentication_options()` |
| `verifyPasskeyLogin()` | `POST /api/passkey/login/verify` | `passkey.py`: `authentication_verify()` |
| `getSession()` | `GET /api/account/me` | `account.py`: `me()` and its `get_current_user()` dependency |

For example, both pages call `MockAPI.loginAccount(username, password)`. Complete compares a local digest inside that method. This version sends JSON to `/api/account/login`, where the server verifies the password, sets a cookie, and returns account data.

Shared method names aid comparison; response shapes are not identical. Here, `getSession()` returns `{account}` or `null`, without exposing the Mock session object or token to the page. This adapter also has no `reset()` method.

## 5. Registration: bind a credential to an account

```text
Signed-in account → Confirm password → Get registration options
    → Create credential in browser → Submit credential → Verify and store
```

1. `POST /api/account/password/verify` verifies the password and records `password_verified_at` on the current session.
2. `POST /api/passkey/register/options` requires confirmation within the last five minutes. It generates options for the current account and stores a challenge associated with that account and session.
3. The browser receives RP information, user information, a challenge, algorithms, and an exclusion list of enabled credentials. The frontend decodes `challenge`, `user.id`, and `excludeCredentials[].id` from Base64URL to byte arrays.
4. The frontend calls `navigator.credentials.create({ publicKey })`, serializes the returned binary fields as Base64URL, and submits `{"credential": ...}`.
5. `POST /api/passkey/register/verify` finds a valid challenge associated with the current session and calls `verify_registration_response()` with the expected challenge, RP ID, and origin.
6. On success, it stores the credential ID, public key, and counter for the current account, deletes the challenge, and clears the challenge cookie.

Password confirmation illustrates reauthentication for a sensitive operation: adding a credential creates another way to enter the account. An existing website can substitute its own reauthentication mechanism.

## 6. Authentication: verify the response, then create a session

```text
Get login options → Select Passkey → Return signed response
    → Find stored public key and verify → Create login session
```

1. `POST /api/passkey/login/options` stores an authentication challenge and returns options with `rpId` and an empty `allowCredentials` list.
2. The frontend calls `navigator.credentials.get({ publicKey })` so the user can select a credential for this website.
3. It serializes the response and calls `POST /api/passkey/login/verify`.
4. The server finds an enabled credential by its ID, then calls `verify_authentication_response()` with its stored public key and counter, plus the expected challenge, RP ID, and origin.
5. Success updates `sign_count` and usage time, deletes the challenge, and creates a session for the credential's account.
6. Subsequent requests use `get_current_user()` just as they do after password login.

Registration uses `resident_key=REQUIRED` and authentication sends an empty allow-list to demonstrate discoverable-credential login without a username prompt. Finding a credential ID is only a lookup step; the server still verifies the signature before establishing a session.

## 7. Understand the storage choices

| Table | Main fields | Purpose |
| --- | --- | --- |
| `users` | `username`, `password_hash`, `webauthn_user_id`, `passkey_enabled` | Account and stable WebAuthn user identifier |
| `passkeys` | `user_id`, `credential_id`, `public_key`, `sign_count`, `enabled`, timestamps | Multiple credentials per account |
| `sessions` | `user_id`, `session_token_hash`, `expires_at`, `password_verified_at` | Login lifetime and session-specific reauthentication |
| `webauthn_challenges` | `challenge`, `type`, `user_id`, `session_id`, `expires_at` | Connect generated options with later verification |

**Account ID, user handle, and credential ID serve different roles.** `users.id` is the business primary key. `webauthn_user_id` is a persisted, random 32-byte identifier used as WebAuthn's `user.id`. `credential_id` identifies one credential. One account has a stable WebAuthn user identifier and can own multiple credentials.

**The server stores public keys.** The website backend does not receive the Passkey private key. py_webauthn parses and verifies registration responses before the application saves their public keys.

**Challenges are temporary.** This Demo gives them a five-minute lifetime and deletes them after successful verification. The browser's `timeout=60000` request option is separate from the server expiry. Registration challenges are associated with an account and session; authentication challenges are created before the account is known.

The `webauthn_challenge_id` cookie carries a database record ID; the actual challenge lives on the server. This Demo uses one challenge cookie per browser context, so starting multiple ceremonies can overwrite the current association.

**Both login methods use the same session design.** The default lifetime is 86400 seconds. The browser receives a random session token; the database stores its SHA-256 hash. Incoming tokens are hashed for lookup. Passwords use Argon2id because they are user-chosen secrets; random high-entropy session tokens use SHA-256 for matching.

Cookies use `HttpOnly`, `SameSite=Lax`, and the root path. The frontend sends them through same-origin requests and asks `/api/account/me` for login state rather than reading the token.

**Credential state and account summary are distinct.** `passkeys.enabled` controls new authentication with a specific credential. `users.passkey_enabled` summarizes whether any credential is enabled. Enable/disable operations update both; login checks the individual credential.

## 8. API reference

Paths are relative to the FastAPI server. Bodies use JSON; credential verification accepts `{"credential": {...}}`.

| Method and path | Prerequisites / input | Result |
| --- | --- | --- |
| `POST /api/account/register` | `username`, `password` | Account object; no automatic login |
| `POST /api/account/login` | `username`, `password` | `{success, account}` and session cookie |
| `POST /api/account/password/verify` | Signed in; `password` | `{success}` and current-session confirmation time |
| `GET /api/account/me` | Signed in | `{success, account}` |
| `POST /api/account/logout` | Current cookie, if present | Removes current session and clears cookie |
| `POST /api/passkey/register/options` | Signed in, recent password confirmation | Registration options and challenge cookie |
| `POST /api/passkey/register/verify` | Signed in; challenge cookie; `credential` | `{success, passkey}` |
| `POST /api/passkey/login/options` | No login required | Authentication options and challenge cookie |
| `POST /api/passkey/login/verify` | Challenge cookie; `credential` | `{success, account, passkey}` and session cookie |
| `GET /api/passkey/list` | Signed in | Current account's credential array |
| `POST /api/passkey/{id}/enable` | Signed in; credential belongs to account | Updated Passkey object |
| `POST /api/passkey/{id}/disable` | Signed in; credential belongs to account | Updated Passkey object |
| `GET /api/debug/database` | Signed in | Account-scoped data summary for learning |

A Passkey response contains `id`, `credentialId`, `name`, `enabled`, `createdAt`, and `lastUsedAt`. Management responses do not include the stored public key.

Application errors use `{"detail": "message"}`; validation errors use status 422 and a `detail` array. The request adapter formats these for display and uses HTTP 401 to identify an unauthenticated session. Inspect full request schemas in `/docs`; perform the authenticator steps through the Demo pages.

### Move from console snapshots to Network and server data

After signing in through the Demo page, open developer tools:

1. Inspect password login, registration options/verification, and authentication verification in Network. These are real requests, JSON responses, and HTTP status codes, unlike the Mock request labels.
2. Inspect `session_token` and the ceremony's `webauthn_challenge_id` in the Cookie panel. They use HttpOnly and are not directly read by page JavaScript.
3. Run this in Console to inspect an account-scoped summary:

```javascript
await MockAPI.getDatabase()
```

This calls `/api/debug/database`; anonymous requests receive 401. The summary omits password hashes, session-token hashes, and public keys. Authentication challenges without an associated account are excluded by the account filter. Pages do not automatically fetch debug data.

Clearing localStorage does not delete database accounts or log out this version. Use logout to end the current session. There is no server equivalent of Mock `reset()`. Rerunning initialization SQL deletes the Demo tables' data and is only for a dedicated test database you intend to restart.

## 9. Adapt it to your website

### Use your existing account and session system

Replace [app/dependencies.py](app/dependencies.py) with your existing current-user resolution. The server must determine which account is binding a credential; do not accept an arbitrary client-provided user ID as that authority.

Keep your existing password system. Replace password confirmation with your website's reauthentication flow if it has one. Adding Passkeys does not require recreating accounts or changing every user's password hash.

### Add credential and challenge storage

Give existing users stable WebAuthn identifiers and add credential storage with account ownership, public keys, counters, and enabled state. Use your application's database migrations, not this Demo's initialization script.

Challenges can use your existing temporary-state store. Preserve purpose, expiry, and necessary session associations. Share state between instances and make successful consumption atomic. This Demo illustrates storage and deletion, but does not implement concurrent consumption control.

### Port the four ceremony endpoints

Keep the responsibilities of `register/options`, `register/verify`, `login/options`, and `login/verify`, even if your URLs or backend language differ. Generate challenges and verify responses on the server using a WebAuthn library.

After successful Passkey authentication, call your existing login-success mechanism so sessions, account-status checks, and auditing follow the same path as password login.

### Connect your frontend

Move the registration and login flows from [web/app.js](web/app.js) into your account-security and login pages. Replace [web/api.js](web/api.js) with your request layer. Preserve binary/Base64URL conversion, including IDs in exclusion and allow-lists.

This Demo uses same-origin requests with `credentials: "same-origin"`. A cross-origin frontend/API arrangement needs explicit CORS, credential, Cookie, and CSRF configuration for your domains; changing the URL alone is insufficient.

### Configure your website identity

For pages served at `https://login.example.com`:

```env
WEBAUTHN_RP_ID="login.example.com"
WEBAUTHN_RP_NAME="My Website"
WEBAUTHN_ORIGIN="https://login.example.com"
COOKIE_SECURE=true
```

The RP ID is a domain without scheme, port, or path. The origin includes scheme, host, and applicable port. Credentials are scoped to an RP ID, so choose your domain arrangement before registering users; local Demo credentials do not become credentials for your production domain. See the W3C definitions of [RP ID](https://www.w3.org/TR/webauthn-3/#relying-party-identifier) and [origin](https://www.w3.org/TR/webauthn-3/#origin).

This implementation configures one origin. Locally, consistently use `http://localhost:8000` rather than mixing it with `127.0.0.1`.

### Set your authentication policy

The Demo uses `user_verification=PREFERRED` and server-side `require_user_verification=False`. It does not require biometric or PIN verification for every ceremony. If your website requires user verification, configure both the options and server verification accordingly. See [W3C's user verification requirements](https://www.w3.org/TR/webauthn-3/#enum-userVerificationRequirement).

Integrate rate limiting, CSRF protection, recovery, credential deletion and auditing, and expired-state cleanup according to your website's needs. Test multiple clients and concurrent ceremonies. The debug endpoint is a learning aid and can be omitted from your integration.

## 10. Learn from the tests

Inside `complete-python`:

```bash
python -m pip install -r requirements-dev.txt
python -m unittest discover -s tests -v
node --test tests/frontend.test.cjs
```

- [tests/test_api.py](tests/test_api.py) exercises APIs with an isolated in-memory SQLite database, including registration and authentication responses generated with a test private key and checked by the real WebAuthn verification functions. It does not connect to development MySQL.
- [tests/frontend.test.cjs](tests/frontend.test.cjs) uses simulated DOM, fetch, and credential APIs to demonstrate frontend behavior. It requires Node.js 18+.

Read the tests alongside the account lifecycle to follow state changes. Automated tests do not exercise real authenticator dialogs or MySQL behavior; complete the browser walkthrough on your own website as well.
