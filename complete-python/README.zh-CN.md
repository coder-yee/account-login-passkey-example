# Complete Python：为账户系统接入 Passkey

[English](README.md) | 中文

学习路线：[simple](../simple/README.zh-CN.md) → [complete](../complete/README.zh-CN.md) → **complete-python（当前）**

`complete-python` 是项目的第三步：承接 `complete` 的页面交互，将 Mock 中的数据与认证职责交给真实服务器。

本版本演示如何在已有的“账户名 + 密码”登录系统中增加 Passkey。用户先登录账户并绑定通行密钥，以后就可以选择使用 Passkey 登录，验证成功后进入同一套登录 Session。

读完并运行这个 Demo，你应该能够回答三个问题：浏览器负责什么，服务器需要验证和保存什么，以及如何把这条流程接到自己的网站。


界面支持中文 / English，可在右上角切换；首次按浏览器语言选择，之后记住选择。系统 Passkey 弹窗跟随浏览器或操作系统语言。语言脚本位于 [web/i18n.js](web/i18n.js)，独立启动时同样可用。

## 1. 从 simple 到 complete-python

三个目录展示同一个账户登录功能的逐步实现。

| 版本 | 实现内容 | 适合学习的重点 |
| --- | --- | --- |
| [simple](../simple/README.zh-CN.md) | 以账户名简化注册与登录；调用浏览器 WebAuthn；使用 Mock API 和 localStorage | 先体验创建 Passkey、选择 Passkey、绑定账户和管理凭证 |
| [complete](../complete/README.zh-CN.md) | 加入账户密码、密码登录和绑定前的密码确认；仍使用 Mock API 和 localStorage | 理解 Passkey 如何融入已有账户流程 |
| complete-python | 用 FastAPI、MySQL 和 py_webauthn 实现真实请求、持久化、服务端验证和 Cookie Session | 理解前后端职责，并迁移到自己的网站 |

前两个版本已经会调用浏览器的 WebAuthn API，但模拟服务器没有完成真实服务端的密码学验证。`complete` 在浏览器中计算 SHA-256 来演示密码比较；本版本在服务器使用 Argon2id 保存和验证密码。

本版本保留前端的 `MockAPI` 方法名，方便对照代码学习。这里的实现位于 [web/api.js](web/api.js)，每个方法实际通过 `fetch()` 请求 FastAPI，不再从 localStorage 读取账户或登录状态。

### 对照 complete：哪些职责移到了服务器

页面仍然沿用“密码登录 → 确认密码 → 绑定 Passkey → 选择登录方式”的顺序。变化发生在每一步由谁决定结果，以及这些结果保存在什么地方。

| 学习环节 | complete 的 Mock 实现 | complete-python 的实现 |
| --- | --- | --- |
| API 调用 | JavaScript 方法直接操作 localStorage，接口名称只是日志 | `web/api.js` 发出真实 HTTP 请求，由 FastAPI 响应 |
| 密码验证 | 浏览器计算 SHA-256 并比较本地摘要 | 服务器使用 Argon2id 验证数据库中的密码 Hash |
| 绑定前确认 | 前端先调用密码确认，再调用注册；没有服务端确认状态 | 当前 Session 保存确认时间；生成注册选项时要求在 5 分钟内，注册 Challenge 关联该 Session |
| 凭证验证 | 记录或查找 Credential ID 与账户的关联 | 注册时验证响应并保存公钥，登录时用公钥验证签名 |
| Challenge | localStorage 中的流程记录 | 数据库中的临时记录，检查用途、有效期和相应关联，成功后删除 |
| 用户标识 | 业务账户 UUID 编码为 WebAuthn `user.id` | 为账户单独保存随机的 `webauthn_user_id` |
| 注册选项 | `residentKey: "preferred"` | `resident_key=REQUIRED`，配合不先输入账户名的登录流程 |
| 登录状态 | 本地一个 `session` 对象 | 多条服务端 Session 记录；浏览器以 Cookie 标识当前 Session |

两版仍采用优先用户验证的选项；本版本没有把生物识别或 PIN 验证设为每次必须，具体策略见第 9 节。

## 2. 这个版本实现了什么

- 创建账户、密码登录、查询当前账户和退出登录。
- 在当前登录 Session 中再次验证密码，再为该账户注册 Passkey。
- 由服务器生成注册和登录选项、保存 Challenge，并验证浏览器返回的 WebAuthn 响应。
- 一个账户保存多把 Passkey；展示列表、启用和停用。
- 不先输入账户名的 Passkey 登录：服务器根据 Credential ID 找到凭证及所属账户，验签成功后创建 Session。
- 密码保存为 Argon2id Hash；Passkey 保存公钥；Session Token 的数据库副本保存为 SHA-256 Hash。
- 同一个 FastAPI 服务提供前端页面和接口，浏览器通过 HttpOnly Cookie 维持登录。
- 提供账户范围的调试接口、API 文档，以及前后端行为测试。

这里实现的是“给现有账户增加一种登录方式”。账户仍先通过账户名和密码创建；没有实现直接用 Passkey 创建新账户、自动填充登录、凭证删除或账户恢复。

## 3. 先把 Demo 跑起来

本节介绍该目录的**独立启动**方式，也可以按[根目录统一启动说明](../README.zh-CN.md)一次打开三个示例。 统一模式下本版本页面位于 `/complete-python/`；独立模式下位于 `/`，两种模式共用本目录的 `.env`、数据库和认证代码。

需要 Python 3.10+、MySQL 8，以及能够使用 WebAuthn 的浏览器和认证器。认证器可以是设备内置能力，也可以是安全密钥；具体交互由浏览器和设备决定。WebAuthn 的浏览器入口是 `navigator.credentials.create()` 和 `navigator.credentials.get()`，详见 [MDN Web Authentication API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API)。

### 从上一版切换过来

如果 `simple` 或 `complete` 的静态服务器还占用 8000 端口，先按 `Ctrl+C` 停止它。本版本使用 `python ./main.py` 启动应用，不能沿用 `python -m http.server`。

三个版本展示实现的演进，数据不会自动迁移。两个 Mock 版本的账户和凭证关联在各自的 localStorage 中，本版本从 MySQL 读取数据；请在这里重新创建测试账户并绑定 Passkey。

即使浏览器还能列出之前为 localhost 创建的凭证，本版本也没有对应的服务端公钥和账户记录，不能直接用它登录。无需清空其他版本数据；设备中的旧凭证也不会因为切换版本而消失。

### 创建环境

从仓库根目录进入本版本，后续命令都在该目录执行：

```bash
cd complete-python
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
```

Windows 下可以使用 `.venv\Scripts\activate` 激活环境。

### 初始化独立的演示数据库

[sql/schema.sql](sql/schema.sql) 会创建 `account_login_passkey` 数据库，并删除、重建其中的四张演示表。**重复执行会清除这些表的数据，只用于独立 Demo 数据库；不要在自己网站的业务库中执行。**

```bash
mysql -uroot -p < sql/schema.sql
```

编辑 `.env`，填入本机数据库连接信息：

```env
DATABASE_URL="mysql+pymysql://root:password@127.0.0.1:3306/account_login_passkey?charset=utf8mb4"
WEBAUTHN_RP_ID="localhost"
WEBAUTHN_RP_NAME="Account Login Passkey Example"
WEBAUTHN_ORIGIN="http://localhost:8000"
SESSION_EXPIRE_SECONDS=86400
COOKIE_SECURE=false
```

`root:password` 是示例值。服务启动时不会自动创建表；需要先完成数据库初始化。

### 启动与访问

```bash
python ./main.py
```

默认监听 `localhost:8000`。开发时可以显式指定参数并开启自动重载：

```bash
python ./main.py --host localhost --port 8000 --reload
```

使用 `python ./main.py --help` 查看参数。只更换端口时更新 `.env` 中的 `WEBAUTHN_ORIGIN`；更换浏览器访问主机名时，再核对 `WEBAUTHN_RP_ID`。RP ID 不包含端口。

- Demo 页面：[http://localhost:8000/](http://localhost:8000/)
- FastAPI 接口文档：[http://localhost:8000/docs](http://localhost:8000/docs)
- 进程健康检查：[http://localhost:8000/health](http://localhost:8000/health)

请从 FastAPI 地址访问页面，使页面与接口保持同源。直接双击 HTML 或用另一个静态服务器打开页面，不是本版本的启动方式。`/health` 只返回进程状态，不检查数据库连接。

### 第一次体验

1. 创建账户：账户名去除首尾空白后为 3～100 个字符，密码为 6～128 个字符。
2. 用账户名和密码登录；创建账户本身不会自动登录。
3. 打开 Passkey 管理，输入当前账户密码并注册 Passkey。
4. 完成设备提示后，查看凭证列表。
5. 退出，再点击 Passkey 登录；成功后进入同一个账户。
6. 尝试启用、停用凭证，观察下一次登录是否允许使用它。

停用是网站数据库中的状态变化，不会删除设备保存的 Passkey，也不会撤销已经建立的登录 Session。与 Complete 一样，启停操作本身没有额外的密码确认；停用后仍可通过密码登录再启用凭证。

## 4. 一次请求经过哪些代码

```text
web/*.html                 页面和表单
    ↓
web/app.js                 交互、WebAuthn 调用、二进制与 JSON 转换
    ↓
web/api.js                 fetch 请求与错误处理
    ↓
app/routers/*.py           参数、当前账户、认证流程与返回值
    ↓
app/models.py + database.py  SQLAlchemy 读写 MySQL
```

| 文件 | 职责 | 阅读时关注什么 |
| --- | --- | --- |
| [main.py](main.py) | 挂载 API 和静态页面 | 为什么一个地址就能运行前后端 |
| [web/app.js](web/app.js) | 页面交互与凭证序列化 | `registerPasskey()`、`loginWithPasskey()` |
| [web/api.js](web/api.js) | HTTP 适配层 | 方法名如何映射到接口；JSON 和 Cookie 如何发送 |
| [app/routers/account.py](app/routers/account.py) | 账户、密码和 Session | 登录成功后如何建立登录态 |
| [app/routers/passkey.py](app/routers/passkey.py) | 注册、认证、凭证管理 | `options` 与 `verify` 两步如何配合 |
| [app/dependencies.py](app/dependencies.py) | 从 Cookie 获取当前账户 | 登录校验如何被多个接口复用 |
| [app/security.py](app/security.py) | 密码 Hash、随机 Token 和时间 | 密码与 Session Token 为什么采用不同处理方式 |
| [app/models.py](app/models.py)、[sql/schema.sql](sql/schema.sql) | ORM 模型和建表脚本 | 账户、凭证、Session、Challenge 的关系 |
| [app/schemas.py](app/schemas.py)、[app/config.py](app/config.py) | 请求校验与配置 | 哪些值来自用户，哪些值由服务器决定 |

建议先沿着密码登录读一遍，再读 Passkey 注册，最后读 Passkey 登录。这样可以看到两种认证方式如何汇入同一套 Session。

### 从熟悉的方法名找到后端

可以把 [complete/mock/api.js](../complete/mock/api.js) 与本版本的 [web/api.js](web/api.js) 并排阅读，再沿下表进入 Python 处理函数：

| 前端方法 | 真实请求 | 后端处理位置 |
| --- | --- | --- |
| `loginAccount()` | `POST /api/account/login` | `account.py` 的 `login()` |
| `verifyAccountPassword()` | `POST /api/account/password/verify` | `account.py` 的 `verify_account_password()` |
| `getPasskeyRegisterOptions()` | `POST /api/passkey/register/options` | `passkey.py` 的 `registration_options()` |
| `verifyPasskeyRegistration()` | `POST /api/passkey/register/verify` | `passkey.py` 的 `registration_verify()` |
| `getPasskeyLoginOptions()` | `POST /api/passkey/login/options` | `passkey.py` 的 `authentication_options()` |
| `verifyPasskeyLogin()` | `POST /api/passkey/login/verify` | `passkey.py` 的 `authentication_verify()` |
| `getSession()` | `GET /api/account/me` | `account.py` 的 `me()` 与 `get_current_user()` 依赖 |

例如两版页面都调用 `MockAPI.loginAccount(username, password)`。Complete 在方法内部比较本地密码摘要；本版本发送 JSON 到 `/api/account/login`，由服务器验证并设置 Cookie，再返回账户数据。

保留方法名便于学习，不代表响应完全相同：本版本的 `getSession()` 返回 `{account}` 或未登录时的 `null`，不会把 Mock 的 Session 对象和 Token 返回给页面；它也没有 `reset()` 方法。

## 5. Passkey 注册：把凭证绑定到已有账户

```text
已登录账户
    → 验证当前密码
    → 请求注册 options
    → 浏览器创建凭证
    → 提交 credential
    → 服务器验证并保存
```

1. 前端调用 `POST /api/account/password/verify`。服务器验证密码，并在**当前 Session** 记录 `password_verified_at`。
2. 前端调用 `POST /api/passkey/register/options`。服务器要求密码验证时间在 5 分钟内，用当前账户生成选项，并把 Challenge 保存到数据库，关联账户和 Session。
3. 返回选项包括 RP、用户信息、Challenge、算法和已有启用凭证的排除列表。浏览器收到 JSON 后，前端把 `challenge`、`user.id`、`excludeCredentials[].id` 从 Base64URL 转回字节数组。
4. 前端调用 `navigator.credentials.create({ publicKey })`。设备完成交互后，前端将响应中的二进制字段转为 Base64URL，并以 `{"credential": ...}` 提交给注册验证接口。
5. `POST /api/passkey/register/verify` 查找属于当前 Session 的有效 Challenge，调用 `verify_registration_response()`，检查预期 Challenge、RP ID、Origin 等信息。
6. 验证成功后保存 Credential ID、公钥和计数，关联当前账户；删除该 Challenge，并清除 Challenge Cookie。

**为什么先验证密码？** 添加 Passkey 会增加一个以后可以登录账户的凭证入口。本 Demo 用近期密码确认来演示敏感操作的再次认证；已有网站可以接入自己的再次认证机制。

## 6. Passkey 登录：验证签名，再建立 Session

```text
请求登录 options
    → 用户选择 Passkey
    → 认证器返回签名响应
    → 服务器查找公钥并验证
    → 创建登录 Session
```

1. `POST /api/passkey/login/options` 生成认证 Challenge，保存到数据库，并返回 `rpId` 和空的 `allowCredentials`。
2. 前端调用 `navigator.credentials.get({ publicKey })`，让用户选择可用于当前网站的凭证。
3. 前端序列化响应，调用 `POST /api/passkey/login/verify`。
4. 服务器根据 Credential ID 查找启用的凭证，使用保存的公钥、计数、预期 Challenge、RP ID 和 Origin 调用 `verify_authentication_response()`。
5. 验证成功后更新 `sign_count` 和最后使用时间，删除 Challenge，为凭证所属账户创建 Session，写入 Cookie。
6. 后续接口继续通过 `get_current_user()` 获取账户，与密码登录后的访问方式一致。

**为什么不先输入账户名？** 注册选项要求 `resident_key=REQUIRED`，登录允许列表为空，配合演示可发现凭证的账户选择流程。服务器通过已保存的凭证关系确定账户，不把浏览器返回一个 Credential ID 当作登录成功；仍然必须验签。

## 7. 为什么这样保存数据

| 表 | 主要字段 | 用途 |
| --- | --- | --- |
| `users` | `username`、`password_hash`、`webauthn_user_id`、`passkey_enabled` | 原有账户，以及稳定的 WebAuthn 用户标识 |
| `passkeys` | `user_id`、`credential_id`、`public_key`、`sign_count`、`enabled`、时间字段 | 一个账户可以关联多把凭证 |
| `sessions` | `user_id`、`session_token_hash`、`expires_at`、`password_verified_at` | 登录有效期和当前 Session 的再次认证状态 |
| `webauthn_challenges` | `challenge`、`type`、`user_id`、`session_id`、`expires_at` | 将选项生成与后续响应验证关联起来 |

### 账户 ID、用户标识和凭证 ID 是三件事

`users.id` 是业务主键；`webauthn_user_id` 是为账户生成并保存的 32 字节随机用户标识，用于 WebAuthn 的 `user.id`；`credential_id` 标识某一把凭证。一个账户有一个稳定的 WebAuthn 用户标识，可以拥有多把不同的凭证。

### 公钥保存在服务器

服务器保存用于验证响应的公钥，网站后端不接收 Passkey 私钥。示例通过 py_webauthn 解析注册响应并取得公钥，不让前端自己声称“这把公钥已经验证成功”。

### Challenge 是临时数据

本版本的 Challenge 有效期为 5 分钟，验证成功后删除；浏览器 `timeout=60000` 是请求选项中的等待提示，与服务端有效期分别配置。注册 Challenge 关联账户和 Session；登录 Challenge 此时尚未确定账户。

Cookie `webauthn_challenge_id` 只保存 Challenge 记录 ID，真实 Challenge 保存在服务端。示例同一浏览器使用一个 Challenge Cookie，同时启动多个认证流程会覆盖该关联。

### Session 统一承接两种登录方式

密码登录和 Passkey 登录都写入 `sessions`，默认有效期 86400 秒。浏览器保存随机 Token，数据库保存它的 SHA-256 Hash；后端对收到的 Token 再 Hash 后查询。

Cookie 设置 `HttpOnly`、`SameSite=Lax` 和根路径。前端通过同源请求携带 Cookie，并调用 `/api/account/me` 判断登录状态，不读取 Token。密码属于用户选择的秘密，因此使用专门的 Argon2id 密码 Hash；随机高熵 Session Token 使用 SHA-256 做查询匹配。

### 启用状态分为凭证状态和账户汇总

`passkeys.enabled` 决定具体凭证能否用于新登录；`users.passkey_enabled` 汇总是否至少有一把启用凭证。实际登录仍查询具体凭证的状态。后端启停凭证时会同步更新汇总值。

## 8. 接口速查

所有路径相对于 FastAPI 服务。请求体使用 JSON，验证凭证统一使用 `{"credential": {...}}`。

| 方法与路径 | 前置条件／输入 | 主要结果 |
| --- | --- | --- |
| `POST /api/account/register` | `username`、`password` | 账户对象，不自动登录 |
| `POST /api/account/login` | `username`、`password` | `{success, account}`，设置 Session Cookie |
| `POST /api/account/password/verify` | 已登录；`password` | `{success}`，记录当前 Session 的密码确认时间 |
| `GET /api/account/me` | 已登录 | `{success, account}` |
| `POST /api/account/logout` | 当前 Cookie（如有） | 删除当前 Session，清除 Cookie |
| `POST /api/passkey/register/options` | 已登录且近期确认密码 | 注册选项，设置 Challenge Cookie |
| `POST /api/passkey/register/verify` | 已登录；Challenge Cookie；`credential` | `{success, passkey}` |
| `POST /api/passkey/login/options` | 无需登录 | 登录选项，设置 Challenge Cookie |
| `POST /api/passkey/login/verify` | Challenge Cookie；`credential` | `{success, account, passkey}`，设置 Session Cookie |
| `GET /api/passkey/list` | 已登录 | 当前账户的 Passkey 数组 |
| `POST /api/passkey/{id}/enable` | 已登录；凭证属于当前账户 | 更新后的 Passkey 对象 |
| `POST /api/passkey/{id}/disable` | 已登录；凭证属于当前账户 | 更新后的 Passkey 对象 |
| `GET /api/debug/database` | 已登录 | 当前账户范围的数据摘要，供学习观察 |

Passkey 返回对象包含 `id`、`credentialId`、`name`、`enabled`、`createdAt`、`lastUsedAt`，不会把数据库中的公钥字段作为管理列表返回。

普通错误使用 `{"detail": "说明"}`；参数校验的 422 响应中 `detail` 是数组。[web/api.js](web/api.js) 负责转成可显示的信息，并用 HTTP 401 判断未登录。完整请求结构可在 `/docs` 查看；设备认证步骤需要在 Demo 页面完成。

### 从控制台快照过渡到 Network 和服务端数据

在 Demo 页面登录后，打开开发者工具：

1. 在 Network 中观察密码登录、注册 options、注册 verify 和登录 verify。与前两个版本的模拟日志不同，这里能看到真实请求、JSON 响应和 HTTP 状态码。
2. 在 Cookie 面板观察 `session_token` 和认证流程中的 `webauthn_challenge_id`。它们设置了 HttpOnly，页面 JavaScript 不直接读取它们。
3. 在 Console 中执行以下方法，查看当前账户范围的数据摘要：

```javascript
await MockAPI.getDatabase()
```

这个方法会请求 `/api/debug/database`，匿名请求返回 401。摘要不包含密码 Hash、Session Token Hash 或公钥；尚未关联账户的登录 Challenge 不会出现在按账户过滤的结果中。页面不会自动拉取调试数据。

清除 localStorage 不会删除本版本的数据库账户，也不能代替退出登录。使用页面退出按钮结束当前 Session；没有与 Mock `reset()` 对应的一键清空接口。重新执行初始化 SQL 会删除演示表数据，只适用于准备重新开始的独立测试数据库。

## 9. 接到自己的网站，需要替换哪些部分

### 第一步：接入已有账户和登录态

将 [app/dependencies.py](app/dependencies.py) 的当前用户来源替换为网站已有的 Session 或 Token 校验。注册 Passkey 必须由服务器确定当前账户，不能信任前端传入的任意 `user_id`。

保留网站原有密码体系；如果已经有再次认证功能，用它替换 `/api/account/password/verify`。不需要为了增加 Passkey 重新创建账户系统或更换所有用户的密码 Hash。

### 第二步：增加凭证和 Challenge 存储

为已有用户增加稳定的 WebAuthn 用户标识，建立凭证与用户的关联，保存公钥、计数和启停状态。通过自己项目的数据库迁移增加这些结构，不要直接运行 Demo 的初始化 SQL。

Challenge 可以接入网站已有的临时状态存储。需要保留用途、过期时间和必要的会话关联；多实例共享数据，并将成功验证后的消费设计成原子操作。Demo 展示数据库保存和成功删除流程，没有实现并发消费控制。

### 第三步：复用注册和登录的四个接口流程

迁移 `register/options`、`register/verify`、`login/options`、`login/verify` 的职责。可以更换 URL 和后端语言，但仍由服务器生成 Challenge、调用 WebAuthn 库验证、保存可信结果。

在 Passkey 登录成功的位置调用网站已有的“登录成功”逻辑，让会话建立、账户状态检查及登录审计与密码登录一致。

### 第四步：接入前端按钮和 API 层

将 [web/app.js](web/app.js) 中的注册与登录流程移入账户安全页和登录页，将 [web/api.js](web/api.js) 换成网站已有请求封装。保留 Base64URL 与字节数组的转换，包含注册排除列表和登录允许列表中的 ID。

Demo 采用同源部署和 `credentials: "same-origin"`。如果网站前后端跨域部署，需要结合实际域名另行配置 CORS、凭证传递、Cookie 和 CSRF 策略，不能仅替换接口地址。

### 第五步：配置网站身份

以页面位于 `https://login.example.com` 为例：

```env
WEBAUTHN_RP_ID="login.example.com"
WEBAUTHN_RP_NAME="My Website"
WEBAUTHN_ORIGIN="https://login.example.com"
COOKIE_SECURE=true
```

RP ID 使用域名，不带协议、端口或路径；Origin 包含协议、主机及适用的端口。凭证与 RP ID 绑定，因此应在用户开始注册前确定域名方案，不能把 `localhost` 上的演示凭证直接当成正式域名的凭证。规则参见 [W3C WebAuthn：RP ID](https://www.w3.org/TR/webauthn-3/#relying-party-identifier) 与 [Origin](https://www.w3.org/TR/webauthn-3/#origin)。

本版本配置一个 Origin；本地访问应固定使用 `http://localhost:8000`，避免与 `127.0.0.1` 混用。

### 第六步：明确网站自己的认证要求

当前代码采用 `user_verification=PREFERRED`，服务端 `require_user_verification=False`，用于演示可兼容的认证流程；它并未要求每次必须进行生物识别或 PIN 验证。如果网站要求用户验证，需要同时调整选项和服务端验证策略。用户验证语义参见 [W3C WebAuthn](https://www.w3.org/TR/webauthn-3/#enum-userVerificationRequirement)。

结合网站补齐登录限流、CSRF 防护、账户恢复、凭证删除与审计、过期数据清理，并验证多端和并发认证行为。调试数据接口用于理解 Demo，集成时可以不保留。

## 10. 用测试帮助理解实现

在 `complete-python` 目录执行：

```bash
python -m pip install -r requirements-dev.txt
python -m unittest discover -s tests -v
node --test tests/frontend.test.cjs
```

- [tests/test_api.py](tests/test_api.py) 用独立内存 SQLite 执行 API 测试，包含用测试私钥生成响应并调用真实 WebAuthn 验证函数的注册与登录流程，不连接开发 MySQL。
- [tests/frontend.test.cjs](tests/frontend.test.cjs) 用模拟 DOM、fetch 和凭证接口观察前端行为，需要 Node.js 18+。

阅读测试时，可以对照“密码登录 → 注册 Passkey → 退出 → Passkey 登录”的数据变化。自动化测试不包含真实设备弹窗或 MySQL 行为；接入自己网站后，还需要通过实际浏览器完整走一遍上述体验流程。
