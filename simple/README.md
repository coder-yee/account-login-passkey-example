# Simple: Understand Account and Passkey Login Flows

English | [中文](README.zh-CN.md)

Learning path: **simple (current)** → [complete](../complete/README.md) → [complete-python](../complete-python/README.md)

`simple` is the first step in this project. A few HTML pages demonstrate account creation, login, Passkey binding, and Passkey login so you can see how browser operations relate to an account.

Only a static file server is needed. The browser calls real WebAuthn APIs, while a JavaScript Mock API stores accounts, credential associations, and login state in localStorage for easy inspection.


The interface supports Chinese / English through the top-right selector. It initially follows the browser language and remembers your choice. System Passkey dialogs follow the browser or operating system. [web/i18n.js](web/i18n.js) is included locally for standalone operation.

## 1. Where this version fits

| Version | Implementation | Learning goal |
| --- | --- | --- |
| simple | Username-only login, browser WebAuthn, Mock API, localStorage | Experience the flow and understand credential ownership |
| [complete](../complete/) | Adds passwords and password confirmation before binding; still uses Mock | Understand Passkeys alongside traditional account login |
| [complete-python](../complete-python/README.md) | FastAPI, MySQL, server-side WebAuthn verification, Cookie sessions | Learn the real frontend/backend integration |

Passwords are intentionally omitted here: entering an existing username establishes a simulated session. **This is not an identity-verification scheme. The Mock does not verify WebAuthn signatures and cannot serve as a real website login backend.**

## 2. What it implements

- Account creation with a unique, trimmed username of at least three characters.
- Login with an existing username, without a password.
- Browser credential creation and an association between the current account and Credential ID.
- A Passkey login button that invokes browser credential selection and finds the associated Mock account.
- Credential listing, creation time, last-use time, enabling, and disabling.
- Logout from the current simulated session.
- Console logs of simulated requests, responses, and database snapshots.

The data structure supports multiple credential records per account. Which credentials can be created or selected depends on the browser and authenticator.

## 3. Start and explore

This section describes **standalone startup**. You can also use the [root launcher](../README.md) to open all three examples.

You need Python 3 and a browser/authenticator supporting WebAuthn. Python only serves static files here. There is no Python account backend, package installation, Node.js build, or database setup.

From the repository root:

```bash
cd simple
python -m http.server 8000 --bind localhost
```

Use `python3` instead if that is your local Python command.

Open [http://localhost:8000/](http://localhost:8000/). The entry page redirects to `web/index.html`; you can also open [http://localhost:8000/web/index.html](http://localhost:8000/web/index.html) directly. Press `Ctrl+C` to stop the server.

Use this local URL rather than opening HTML files through `file://`. WebAuthn requires a secure context: use localhost for this walkthrough and HTTPS for remote hosting. See [MDN's Web Authentication API overview](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API).

### Walk through the Demo

1. Register an account such as `alice`.
2. Enter that same username on the login page. Registration does not automatically log you in.
3. Open Passkey management, register a Passkey, and complete the browser/device prompt.
4. Inspect the Credential ID, enabled state, and timestamps in the list.
5. Log out, select Passkey login, and choose the credential.
6. Inspect the updated last-use time. Disable the credential, log out, and try it again to observe the Mock's disabled-state response.
7. Use username login to re-enter the simulated account and enable the credential again.

The device may offer Touch ID, Face ID, Windows Hello, a PIN, or a security key. The browser and authenticator determine the interaction. The Demo does not read biometric data or device PINs.

## 4. Files and reading order

```text
simple/
├── README.md
├── README.zh-CN.md
├── index.html          # Redirect to the Demo home page
├── web/
│   ├── index.html      # Overview and login state
│   ├── register.html   # Account creation
│   ├── login.html      # Username and Passkey login
│   ├── passkey.html    # Credential creation and management
│   ├── app.js          # UI, WebAuthn calls, and serialization
│   └── style.css       # Styles
└── mock/
    └── api.js          # Simulated account, credential, and session operations
```

Start with the buttons in [web/login.html](web/login.html). Follow `loginAccount()`, `registerPasskey()`, and `loginWithPasskey()` in [web/app.js](web/app.js), then read their corresponding methods in [mock/api.js](mock/api.js).

```text
HTML form/button
    → web/app.js handles the action
    → MockAPI reads or updates localStorage
    → UI displays the result

Passkey actions also call navigator.credentials.create() / get()
```

Loading `mock/api.js` exposes the `MockAPI` object. `/api/...` names in the console are simulated request labels: **no such HTTP requests are sent**, and the static server does not implement those account endpoints.

## 5. How registration works

1. `registerPasskey()` checks WebAuthn support and the current simulated session.
2. `MockAPI.getPasskeyRegisterOptions()` generates and stores a random challenge, builds user information from the current account, and takes the RP ID from the page hostname.
3. The frontend decodes Base64URL `challenge` and `user.id` into byte arrays and calls `navigator.credentials.create({ publicKey })`.
4. The browser/authenticator creates a credential. The frontend converts binary response fields into Base64URL for a JSON-compatible representation.
5. `MockAPI.verifyPasskeyRegistration()` stores the Credential ID, account ID, status, and metadata, removes that account's registration challenges, and lets the UI refresh the list.

The `verify` method name marks the responsibility a real server will later implement. This Mock does not verify registration evidence, store a usable verification public key, or validate the challenge, origin, or RP ID.

## 6. How login works

1. `MockAPI.getPasskeyLoginOptions()` creates an authentication challenge and returns an RP ID with an empty `allowCredentials` list.
2. `loginWithPasskey()` decodes the challenge and calls `navigator.credentials.get({ publicKey })`.
3. The frontend serializes the authentication response and passes it to `MockAPI.verifyPasskeyLogin()`.
4. The Mock looks up the associated account and checks that the credential record belongs to it and is enabled.
5. It updates the last-use time, creates a simulated session, and navigates home.

The Mock does not verify signatures, counters, or challenge matching. Receiving a browser credential and verifying an identity on the server are separate steps; a real website needs cryptographic verification as part of step 4.

Registration uses `residentKey: "preferred"` and `userVerification: "preferred"`; authentication uses an empty allow-list. This illustrates credential selection without a preceding username prompt, but does not require discoverable credentials or user verification. Authenticator behavior can therefore vary.

## 7. Why it is structured this way

| Choice | Learning purpose |
| --- | --- |
| Username-only login | Focus on accounts and credential binding before adding passwords |
| HTML and native JavaScript | Read event handlers directly without a framework build |
| Separate UI and Mock API files | Keep interactions separate from data operations, ready for later API replacement |
| localStorage | Preserve Demo data across refreshes and make it inspectable |
| `options` and `verify` stages | Show initiation and response handling as separate responsibilities |
| Base64URL representation | Carry binary WebAuthn values in JSON-compatible data |
| Multiple credential records per account | Model one account with several authentication credentials |

## 8. Inspect and reset data

The current origin's localStorage holds data under `account-login-passkey-example`:

| Field | Contents |
| --- | --- |
| `accounts` | Account IDs, usernames, and creation times |
| `passkeys` | Account associations, Credential IDs, names, enabled state, and metadata |
| `challenges` | Simulated ceremony challenges, purposes, and creation times |
| `session` | Current simulated session, or `null` |

There is one current-session slot, without Cookie sessions or server-side expiry checks. Challenge records illustrate temporary state; they do not implement full expiry or replay validation.

In the Demo page's developer console:

```javascript
await MockAPI.getDatabase()
```

Page initialization also prints a `[Mock Database]` snapshot. To reset this version's local data:

```javascript
MockAPI.reset()
location.reload()
```

This removes the Simple accounts, associations, and session for the current origin. **It does not remove device-stored Passkeys.** A fresh walkthrough needs new account/credential associations. Disabling a credential similarly changes only the Mock record; it neither deletes the device credential nor revokes an existing session.

Different browsers, profiles, or page origins can have different localStorage. Keep the same URL throughout the walkthrough. Availability of a Passkey on another device does not automatically copy this Demo's local account records there.

## 9. Mock method reference

These are JavaScript methods, not backend endpoints available through curl.

| Method | Purpose |
| --- | --- |
| `registerAccount(username)` | Create a simulated account |
| `loginAccount(username)` | Establish a simulated session by username |
| `getSession()` / `logout()` | Read or clear login state |
| `getPasskeyRegisterOptions()` | Generate registration options |
| `verifyPasskeyRegistration(credential)` | Store the credential/account association |
| `getPasskeyLoginOptions()` | Generate authentication options |
| `verifyPasskeyLogin(credential)` | Look up the credential and establish a simulated session |
| `getPasskeys()` | List the current account's credentials |
| `enablePasskey(id)` / `disablePasskey(id)` | Change credential state |
| `getDatabase()` / `reset()` | Inspect or clear Mock data |

## 10. Next: add Passkeys to your website

Continue with [complete](../complete/) to see password login and password confirmation enter the flow. Then read the [complete-python tutorial](../complete-python/README.md) for real endpoints, public-key storage, response verification, and sessions.

You can reuse the interaction patterns, WebAuthn calls, and serialization concepts from Simple. Connect authorization, challenge management, credential verification, and login state to your website's backend. This version makes the steps observable; the later versions develop their implementation.
