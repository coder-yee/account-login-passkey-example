# Complete：把 Passkey 加入密码登录流程

[English](README.md) | 中文

学习路线：[simple](../simple/README.zh-CN.md) → **complete（当前）** → [complete-python](../complete-python/README.zh-CN.md)

`complete` 是项目的第二步：在 `simple` 的 Passkey 体验基础上加入账户密码，演示“密码登录 → 确认密码 → 绑定 Passkey → 以后选择密码或 Passkey 登录”的账户流程。

这个版本帮助你理解如何在已有网站的登录页和账户安全页增加 Passkey。浏览器 WebAuthn 调用是真实的，账户、密码比较、凭证关联和 Session 仍由浏览器中的 Mock API 模拟。


界面支持中文 / English，可在右上角切换；首次按浏览器语言选择，之后记住选择。系统 Passkey 弹窗跟随浏览器或操作系统语言。语言脚本位于 [web/i18n.js](web/i18n.js)，独立启动时同样可用。

## 1. 从 simple 到 complete，再到真实后端

| 版本 | 实现内容 | 学习重点 |
| --- | --- | --- |
| [simple](../simple/README.zh-CN.md) | 账户名登录、浏览器 WebAuthn、localStorage | 看懂凭证创建、绑定和登录的基本顺序 |
| complete | 加入密码注册、密码登录和绑定前密码确认 | 看懂 Passkey 如何与传统账户体系结合 |
| [complete-python](../complete-python/README.zh-CN.md) | 真实 HTTP、MySQL、公钥与签名验证、Cookie Session | 把浏览器交互接入可信的后端实现 |

这里的 Complete 指演示账户交互流程的完整展开。**它仍是 Mock Demo，不是生产认证服务：密码摘要和模拟登录态都在本地，WebAuthn 响应不进行服务端密码学验证。**

## 2. 本版本实现了什么

- 注册账户名和密码；账户名去除首尾空白后至少 3 个字符，密码至少 6 个字符。
- 使用账户名和密码登录；Mock 计算密码摘要并比较。
- 在 Passkey 管理页再次输入当前账户密码，确认成功后进入凭证创建流程。
- 调用浏览器创建 Passkey，保存凭证与当前账户的关联。
- 登录页同时提供密码登录和 Passkey 登录，两种方式进入同一个模拟账户。
- 一个账户关联多条凭证记录，支持列表、启用、停用和最后使用时间。
- 查询、退出模拟 Session，以及查看和重置本地数据。

没有实现直接用 Passkey 创建账户、修改或找回密码、删除凭证，以及真实后端登录会话。

## 3. 启动与访问

本节介绍该目录的**独立启动**方式，也可以按[根目录统一启动说明](../README.zh-CN.md)一次打开三个示例。

需要 Python 3 和支持 WebAuthn 的浏览器、认证器。Python 仅提供静态文件，不运行认证后端；不需要数据库、第三方 Python 包或前端构建工具。

从仓库根目录执行：

```bash
cd complete
python -m http.server 8000 --bind localhost
```

如果本机使用 `python3`，替换命令中的 `python`。如果刚运行过 Simple，先在它的终端按 `Ctrl+C`，再启动本版本，避免占用同一端口。

打开 [http://localhost:8000/](http://localhost:8000/)，入口页会跳转到 `web/index.html`，也可以直接打开 [http://localhost:8000/web/index.html](http://localhost:8000/web/index.html)。

本地固定使用 localhost，不要直接双击 HTML 使用 `file://`。远程页面需要 HTTPS 等安全上下文条件；浏览器接口说明见 [MDN Web Authentication API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API)。

### 体验完整流程

1. 创建账户，例如账户名 `alice`，密码使用仅供本地演示的测试密码。
2. 用同一账户名和密码登录。注册本身不会自动登录；也可以试一次错误密码，观察提示。
3. 打开 Passkey 管理，在密码输入框确认当前账户密码，再点击注册 Passkey。
4. 完成浏览器或设备提示，确认凭证出现在列表。
5. 退出，点击 Passkey 登录，选择刚才创建的凭证，观察进入的仍是同一账户。
6. 停用凭证并退出，再尝试用该凭证登录，观察停用提示。
7. 用密码登录，重新启用凭证。

Passkey 登录不要求再次输入网站密码。绑定前确认密码用于演示敏感操作确认，它与浏览器可能要求的生物识别或设备 PIN 是两个不同步骤。

## 4. 目录和推荐阅读顺序

```text
complete/
├── README.md
├── README.zh-CN.md
├── index.html          # 跳转到 Demo 首页
├── web/
│   ├── index.html      # 首页和账户状态
│   ├── register.html   # 账户名与密码注册
│   ├── login.html      # 密码登录和 Passkey 登录
│   ├── passkey.html    # 密码确认、凭证注册及管理
│   ├── app.js          # 页面逻辑、WebAuthn 调用与序列化
│   └── style.css       # 样式
└── mock/
    └── api.js          # 账户、密码比较、凭证和 Session 模拟
```

建议先看 [mock/api.js](mock/api.js) 的 `hashPassword()`、`registerAccount()`、`loginAccount()`，理解密码流程；再读 [web/app.js](web/app.js) 的 `registerPasskey()`，看密码确认如何衔接凭证创建；最后阅读 `loginWithPasskey()` 和 Mock 中的对应方法。

```text
页面表单／按钮 → web/app.js → MockAPI → localStorage
                     │
                     └→ 浏览器 WebAuthn → 返回凭证响应
```

页面使用 JavaScript 直接调用 `MockAPI`。控制台中的 `POST /api/...` 只是模拟请求日志，不是实际 HTTP 请求，静态服务器也不提供这些账户接口。

## 5. 密码注册和登录为什么这样实现

注册时，Mock 使用 `crypto.subtle.digest("SHA-256", ...)` 计算密码摘要，将结果保存为账户的 `passwordHash`。登录时对输入密码做相同计算，与已保存值比较，相等后写入模拟 Session。

这让初学者看到“保存密码处理结果 → 登录时验证 → 建立登录态”的顺序，而不必先搭建服务器。它没有使用随机盐或专门的密码哈希工作因子；localStorage 中的数据还可以被用户直接修改，因此不能提供可信的身份认证。

在 [complete-python](../complete-python/README.zh-CN.md) 中，这一职责移到服务器，由 Argon2id 处理密码，并通过数据库与 Cookie Session 建立登录态。迁移到已有网站时，应继续使用网站原有密码验证机制。

## 6. 绑定 Passkey：先确认账户，再创建凭证

```text
当前模拟账户
    → 输入当前密码
    → verifyAccountPassword()
    → getPasskeyRegisterOptions()
    → navigator.credentials.create()
    → verifyPasskeyRegistration()
    → 保存账户与凭证的关联
```

1. 前端检查 WebAuthn 支持和当前登录态。
2. `verifyAccountPassword(password)` 读取当前账户并比较密码摘要，失败时页面停止后续操作。
3. Mock 生成随机 Challenge，以当前账户构造 `user`，以页面主机名构造 RP ID，并保存模拟注册 Challenge。
4. 前端将选项中的 Base64URL `challenge`、`user.id` 转为字节数组，调用浏览器创建凭证。
5. 前端把返回响应中的二进制字段转成 Base64URL，交给 Mock 保存 Credential ID、所属账户、启用状态等元数据。

**为什么绑定前还要输入密码？** 新增 Passkey 会增加一个以后可进入账户的凭证入口。这个步骤演示账户安全页的再次认证交互。

本版本由前端顺序调用来串联密码确认与注册；Mock 不保存“近期已验证密码”的凭据，也没有在注册选项接口中强制检查该状态。真实后端需要独立检查当前 Session 的再次认证结果；Python 版本展示了 Session 关联和时间窗口。

Mock 的 `verifyPasskeyRegistration()` 只是流程占位，不验证注册证明、Challenge、Origin 或 RP ID，也不保存用于服务端验签的公钥。

## 7. Passkey 登录：汇入同一套账户 Session

1. Mock 生成登录 Challenge，返回 RP ID 和空的 `allowCredentials`。
2. 前端转换参数，调用 `navigator.credentials.get({ publicKey })`，由浏览器呈现凭证选择。
3. 返回响应经过序列化后交给 `verifyPasskeyLogin()`。
4. Mock 根据凭证关联查找账户，检查凭证属于该账户且处于启用状态。
5. 更新最后使用时间，创建模拟 Session，回到首页。

```text
账户名 + 密码 → Mock 密码比较 ─────┐
                                 ├→ 同一个账户 → 模拟 Session
Passkey → 浏览器操作 → Mock 查找关联 ┘
```

这种结构说明：增加 Passkey 不必新建一套业务账户，两种入口最终应接到网站相同的登录成功逻辑。

Mock 的 Passkey 登录没有签名、计数或 Challenge 匹配验证。实际网站必须在建立 Session 前完成服务端验证，不能因为浏览器返回了一个已知 Credential ID 就认定用户身份。

注册选项使用 `residentKey: "preferred"` 和 `userVerification: "preferred"`，没有强制可发现凭证或用户验证；空允许列表的登录体验会因认证器而异，不能保证每台设备都显示相同流程。

## 8. 数据、管理和调试

本版本使用 localStorage 键 `account-login-passkey-example-complete`，与 Simple 的键不同，所以 Simple 中创建的账户不会自动出现在这里。

| 数据 | 内容与用途 |
| --- | --- |
| `accounts` | 账户 ID、账户名、`passwordHash`、创建时间 |
| `passkeys` | 账户关联、Credential ID、名称、启停状态和时间等元数据 |
| `challenges` | 模拟注册／登录的随机数据、用途、创建时间 |
| `session` | 当前模拟登录态，退出后为 `null` |

这里只有一个当前 Session 槽位，没有服务端会话过期检查；Challenge 记录也没有完整的有效期或防重放验证。数据按页面 Origin 保存，更换浏览器、用户配置或访问地址后可能看到不同的数据。

打开 Demo 页面的开发者工具，在 Console 中查看数据：

```javascript
await MockAPI.getDatabase()
```

初始化页面时也会打印 `[Mock Database]` 快照，其中包含模拟账户的密码摘要；仅使用本地测试数据。

要重新开始体验：

```javascript
MockAPI.reset()
location.reload()
```

这会清空本版本当前 Origin 下的模拟账户、关联和 Session，不影响 Simple 的独立存储键，也不会删除设备中的 Passkey。清空后，需要重新建立账户和凭证关联。

启用和停用只改变 Mock 凭证记录。停用不会删除设备凭证，也不会撤销已存在的 Session；本版本的启停操作没有额外密码确认。

## 9. Mock 方法速查

以下是页面调用的 JavaScript 方法，不是可以通过 curl 请求的后端接口。

| 方法 | 作用 |
| --- | --- |
| `registerAccount(username, password)` | 创建账户并保存模拟密码摘要 |
| `loginAccount(username, password)` | 比较密码并建立模拟 Session |
| `verifyAccountPassword(password)` | 确认当前账户密码 |
| `getSession()` / `logout()` | 查询／退出当前登录态 |
| `getPasskeyRegisterOptions()` | 生成注册选项 |
| `verifyPasskeyRegistration(credential)` | 保存凭证关联 |
| `getPasskeyLoginOptions()` | 生成登录选项 |
| `verifyPasskeyLogin(credential)` | 查找关联并建立模拟 Session |
| `getPasskeys()` | 查询当前账户凭证 |
| `enablePasskey(id)` / `disablePasskey(id)` | 改变凭证启用状态 |
| `getDatabase()` / `reset()` | 查看／清空本版本模拟数据 |

## 10. 下一步：替换 Mock，接入自己的网站

本版本值得带到网站中的，是登录页的双入口、账户安全页的绑定流程，以及前端与 API 层分离的结构。后端可信状态应由网站已有系统提供。

| 本版本的演示职责 | 真实网站对应实现 |
| --- | --- |
| 浏览器密码摘要比较 | 网站后端的密码验证机制 |
| 前端串联密码确认 | 服务端再次认证记录与有效期校验 |
| localStorage 账户和凭证关联 | 数据库中的账户、公钥、Credential ID 和状态 |
| Mock Challenge 记录 | 服务端 Challenge 生成、关联、过期和消费 |
| Mock `verify` 方法 | WebAuthn 库对注册响应和登录签名的验证 |
| `session` 对象 | 网站已有 Session 或 Token 签发逻辑 |
| 控制台模拟接口 | 真实请求、错误响应和服务端访问控制 |

继续阅读 [complete-python 教程](../complete-python/README.zh-CN.md)，对照同一组前端方法如何变成真实 HTTP 请求，以及服务器如何接管验证和存储。已有网站可以保留账户与密码体系，从这条演进路线中选择需要的 Passkey 功能进行集成。
