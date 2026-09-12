# Complete: Add Passkeys to a Password Login Flow

English | [中文](README.zh-CN.md)

Learning path: [simple](../simple/README.md) → **complete (current)** → [complete-python](../complete-python/README.md)

`complete` is the second step in this project. It extends Simple with passwords and demonstrates password login, password confirmation before binding a Passkey, and subsequent login with either a password or a Passkey.

Use it to understand the login-page and account-security interactions. Browser WebAuthn calls are real; accounts, password comparisons, credential associations, and sessions still run through a browser-side Mock API.


The interface supports Chinese / English through the top-right selector. It initially follows the browser language and remembers your choice. System Passkey dialogs follow the browser or operating system. [web/i18n.js](web/i18n.js) is included locally for standalone operation.

## 1. From Simple to Complete to a real backend

| Version | Implementation | Learning focus |
| --- | --- | --- |
| [simple](../simple/README.md) | Username-only login, browser WebAuthn, localStorage | Credential creation, binding, and login order |
| complete | Password registration, password login, and confirmation before binding | Integrating Passkeys with a traditional account flow |
| [complete-python](../complete-python/README.md) | HTTP APIs, MySQL, public-key verification, Cookie sessions | Connecting browser interactions to a trusted backend |

Complete refers to the expanded account interaction flow. **This remains a Mock Demo, not a production authentication service. Password digests and simulated sessions are local, and WebAuthn responses do not receive server-side cryptographic verification.**

## 2. What this version implements

- Registration with a unique trimmed username of at least three characters and a password of at least six characters.
- Username/password login through a Mock digest comparison.
- Password confirmation on the Passkey management page before credential creation.
- Browser credential creation and storage of its association with the current account.
- Password and Passkey login buttons leading to the same simulated account.
- Multiple credential records per account, listing, enabling, disabling, and last-use times.
- Simulated-session lookup/logout and local data inspection/reset.

Passkey-only account creation, password changes or recovery, credential deletion, and real backend sessions are not implemented.

## 3. Start and explore

This section describes **standalone startup**. You can also use the [root launcher](../README.md) to open all three examples.

You need Python 3 and a browser/authenticator supporting WebAuthn. Python only serves static files; no database, third-party Python packages, or frontend build tools are needed.

From the repository root:

```bash
cd complete
python -m http.server 8000 --bind localhost
```

Use `python3` if that is your local command. If Simple is still running on this port, stop it with `Ctrl+C` first.

Open [http://localhost:8000/](http://localhost:8000/). The entry page redirects to `web/index.html`; you can also open [http://localhost:8000/web/index.html](http://localhost:8000/web/index.html) directly.

Use localhost consistently rather than opening HTML through `file://`. Remote hosting needs a secure context such as HTTPS; see [MDN's Web Authentication API overview](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API).

### Walk through the flow

1. Create an account such as `alice` with a password used only for this local Demo.
2. Log in with those credentials. Registration does not automatically log you in. Try an incorrect password to observe the response.
3. Open Passkey management, enter the current account password, and register a Passkey.
4. Complete the browser/device interaction and inspect the credential list.
5. Log out, select Passkey login, and choose the credential. You enter the same account.
6. Disable the credential, log out, and try it again to observe the disabled-state response.
7. Log in with your password and enable the credential again.

Passkey login does not ask for the website password. Password confirmation before binding illustrates sensitive-operation reauthentication; it is separate from biometric or device-PIN interaction requested by the browser.

## 4. Files and reading order

```text
complete/
├── README.md
├── README.zh-CN.md
├── index.html          # Redirect to the Demo home page
├── web/
│   ├── index.html      # Overview and account state
│   ├── register.html   # Username/password registration
│   ├── login.html      # Password and Passkey login
│   ├── passkey.html    # Password confirmation and credential management
│   ├── app.js          # UI, WebAuthn calls, and serialization
│   └── style.css       # Styles
└── mock/
    └── api.js          # Simulated accounts, password checks, credentials, sessions
```

Start with `hashPassword()`, `registerAccount()`, and `loginAccount()` in [mock/api.js](mock/api.js). Then read `registerPasskey()` in [web/app.js](web/app.js) to see password confirmation precede credential creation. Finally, follow `loginWithPasskey()` and its Mock counterpart.

```text
Page form/button → web/app.js → MockAPI → localStorage
                        │
                        └→ Browser WebAuthn → Credential response
```

Pages call JavaScript methods directly. Console labels such as `POST /api/...` simulate requests; they are not actual HTTP traffic, and the static server does not implement those account endpoints.

## 5. Understand password registration and login

During registration, the Mock calculates a SHA-256 digest with `crypto.subtle.digest()` and stores it as `passwordHash`. Login calculates the same digest for the entered password, compares it with the stored value, and creates a simulated session on a match.

This illustrates password processing, verification, and session creation without a server. It uses neither a random salt nor a dedicated password-hashing work factor. Users can also modify localStorage directly, so it does not provide trusted authentication.

[Complete Python](../complete-python/README.md) moves this responsibility to the server, uses Argon2id for passwords, and establishes login state through database records and cookies. An existing website should retain its own password-verification mechanism when adding Passkeys.

## 6. Binding: confirm the account, then create a credential

```text
Current simulated account
    → Enter current password
    → verifyAccountPassword()
    → getPasskeyRegisterOptions()
    → navigator.credentials.create()
    → verifyPasskeyRegistration()
    → Store account/credential association
```

1. The frontend checks WebAuthn support and the current simulated session.
2. `verifyAccountPassword(password)` compares the current account's password digest. An error stops the page flow.
3. The Mock generates and stores a random registration challenge, builds user information from the account, and uses the page hostname as RP ID.
4. The frontend decodes Base64URL `challenge` and `user.id` into byte arrays and asks the browser to create a credential.
5. It serializes binary response fields as Base64URL and passes them to the Mock to store Credential ID, ownership, enabled state, and metadata.

Adding a Passkey creates another way to enter the account. Password confirmation demonstrates reauthentication in an account-security page.

Here, frontend call order connects confirmation to registration. The Mock does not persist recent-password-verification evidence or enforce it in the registration-options method. A real backend must independently check the current session's reauthentication state; the Python version demonstrates session association and a time window.

`verifyPasskeyRegistration()` is a flow placeholder: it does not validate registration evidence, challenges, origins, or RP IDs, and does not store a public key for server-side signature verification.

## 7. Passkey login joins the same account session

1. The Mock generates an authentication challenge and returns the RP ID with an empty `allowCredentials` list.
2. The frontend converts the options and calls `navigator.credentials.get({ publicKey })` for browser credential selection.
3. It serializes the response and passes it to `verifyPasskeyLogin()`.
4. The Mock finds the associated account and checks credential ownership and enabled state.
5. It updates last-use time, creates a simulated session, and returns home.

```text
Username/password → Mock password comparison ─────┐
                                                  ├→ Same account → Mock session
Passkey → Browser interaction → Association lookup ┘
```

Adding Passkeys does not require a second business-account system. Both entry points should converge on the website's existing login-success mechanism.

The Mock does not check signatures, counters, or challenge matching. A real website must complete server verification before creating a session; a known Credential ID alone does not establish identity.

Registration uses `residentKey: "preferred"` and `userVerification: "preferred"`. Discoverable credentials and user verification are not mandatory here, so empty-allow-list login behavior can vary between authenticators.

## 8. Storage, management, and inspection

This version uses localStorage key `account-login-passkey-example-complete`, separate from Simple's key. Accounts created in Simple do not automatically appear here.

| Data | Contents |
| --- | --- |
| `accounts` | Account ID, username, `passwordHash`, and creation time |
| `passkeys` | Account association, Credential ID, name, enabled state, and metadata |
| `challenges` | Simulated registration/login challenges, purpose, and creation time |
| `session` | Current simulated login state, or `null` after logout |

There is one current-session slot without server-side expiry checks. Challenge records do not implement full expiration or replay validation. Data belongs to the page origin; changing browsers, profiles, or URLs can expose a different local dataset.

Inspect data in the Demo page's developer console:

```javascript
await MockAPI.getDatabase()
```

Page initialization also logs a `[Mock Database]` snapshot, including simulated account password digests. Use local test data only.

To restart the walkthrough:

```javascript
MockAPI.reset()
location.reload()
```

This clears this version's accounts, associations, and session for the current origin. It does not touch Simple's separate storage key or delete device-stored Passkeys. After resetting, create new account/credential associations.

Enabling or disabling changes only the Mock credential record. Disabling neither removes a device credential nor revokes an existing session. Enable/disable actions do not request additional password confirmation in this version.

## 9. Mock method reference

These are JavaScript methods, not backend endpoints accessible through curl.

| Method | Purpose |
| --- | --- |
| `registerAccount(username, password)` | Create an account with a simulated password digest |
| `loginAccount(username, password)` | Compare the password and create a Mock session |
| `verifyAccountPassword(password)` | Confirm the current account password |
| `getSession()` / `logout()` | Read or clear login state |
| `getPasskeyRegisterOptions()` | Generate registration options |
| `verifyPasskeyRegistration(credential)` | Store credential ownership |
| `getPasskeyLoginOptions()` | Generate authentication options |
| `verifyPasskeyLogin(credential)` | Find the association and create a Mock session |
| `getPasskeys()` | List the current account's credentials |
| `enablePasskey(id)` / `disablePasskey(id)` | Change enabled state |
| `getDatabase()` / `reset()` | Inspect or clear this version's Mock data |

## 10. Next: replace the Mock for your website

Reuse the dual login entry points, binding interaction, and separation between UI and API code. Trusted account state belongs in your website's backend.

| Demo responsibility | Real website implementation |
| --- | --- |
| Browser digest comparison | Backend password-verification mechanism |
| Frontend confirmation sequence | Server reauthentication records and expiry checks |
| localStorage account/credential association | Database ownership, public keys, Credential IDs, and state |
| Mock challenge records | Server challenge generation, association, expiry, and consumption |
| Mock `verify` methods | WebAuthn registration and signature verification |
| `session` object | Existing session or token issuance |
| Console request labels | Real requests, error responses, and server authorization |

Continue with the [Complete Python tutorial](../complete-python/README.md) to see corresponding frontend methods issue real HTTP requests and the server take over verification and storage. Keep your existing account/password system and adapt the Passkey capabilities you need from this progression.
