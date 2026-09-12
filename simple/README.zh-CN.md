# Simple：认识账户与 Passkey 登录流程

[English](README.md) | 中文

学习路线：**simple（当前）** → [complete](../complete/README.zh-CN.md) → [complete-python](../complete-python/README.zh-CN.md)

`simple` 是这个项目的第一步：通过几个普通 HTML 页面体验“创建账户 → 登录 → 绑定 Passkey → 使用 Passkey 登录”，先看懂浏览器和账户之间如何配合。

这个版本只需要静态文件服务器。浏览器会真实调用 WebAuthn，账户、凭证关联和登录状态则由 JavaScript Mock API 保存在 localStorage 中，方便打开开发者工具观察。


界面支持中文 / English，可在右上角切换；首次按浏览器语言选择，之后记住选择。系统 Passkey 弹窗跟随浏览器或操作系统语言。语言脚本位于 [web/i18n.js](web/i18n.js)，独立启动时同样可用。

## 1. 在三个版本中的位置

| 版本 | 实现内容 | 学习目标 |
| --- | --- | --- |
| simple | 账户名登录、浏览器 WebAuthn、Mock API、localStorage | 体验流程，认识账户与凭证的关系 |
| [complete](../complete/) | 加入密码登录和绑定前的密码确认，仍使用 Mock | 理解如何把 Passkey 加入传统账户流程 |
| [complete-python](../complete-python/README.zh-CN.md) | FastAPI、MySQL、服务端 WebAuthn 验证、Cookie Session | 学习真实前后端实现，并接入自己的网站 |

本版本有意省略密码：输入已存在的账户名即可进入模拟登录态，让学习重点集中在 Passkey 流程上。**这不是身份验证方案；Mock 不验证 WebAuthn 签名，不能作为网站真实的登录后端。**

## 2. 实现了什么

- 创建账户：账户名去除首尾空白后至少 3 个字符，不能重复。
- 使用已创建的账户名登录，不需要密码。
- 为当前账户调用浏览器 WebAuthn 创建凭证，并保存账户与 Credential ID 的关联。
- 点击 Passkey 登录，调用浏览器选择凭证，再通过 Mock 中的关联找到对应账户。
- 展示当前账户的凭证列表、创建时间和最后使用时间。
- 启用、停用凭证，以及退出当前模拟 Session。
- 在控制台输出模拟请求、响应和数据库快照。

一个账户的数据结构可以关联多条凭证记录；可创建或选择哪些凭证，取决于浏览器和认证器。

## 3. 启动与访问

本节介绍该目录的**独立启动**方式，也可以按[根目录统一启动说明](../README.zh-CN.md)一次打开三个示例。

需要 Python 3，以及支持 WebAuthn 的浏览器和认证器。Python 在这里仅用于提供静态文件，不运行账户后端，不需要安装第三方 Python 包、Node.js 依赖或数据库。

从仓库根目录执行：

```bash
cd simple
python -m http.server 8000 --bind localhost
```

如果本机命令名是 `python3`，将上面的 `python` 替换为 `python3`。

打开 [http://localhost:8000/](http://localhost:8000/)，入口页会跳转到 `web/index.html`。也可以直接打开 [http://localhost:8000/web/index.html](http://localhost:8000/web/index.html)。按 `Ctrl+C` 停止静态服务器。

请通过这个本地地址访问，避免直接双击 HTML 使用 `file://`。浏览器 WebAuthn 需要安全上下文；本地学习使用 localhost，远程部署使用 HTTPS。浏览器接口说明见 [MDN Web Authentication API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API)。

### 跟着操作一遍

1. 点击注册，创建账户，例如 `alice`。
2. 在登录页输入同一个账户名。注册不会自动登录。
3. 打开 Passkey 管理，点击注册 Passkey，完成浏览器或设备提示。
4. 查看列表中的 Credential ID、启用状态和时间。
5. 退出，点击 Passkey 登录，选择刚才的凭证。
6. 登录后查看最后使用时间；停用该凭证，再退出并尝试登录，观察 Mock 返回的停用提示。
7. 可以再次用账户名进入模拟账户，将凭证重新启用。

设备可能显示 Touch ID、Face ID、Windows Hello、PIN 或安全密钥等交互。具体方式由设备和浏览器决定，Demo 不读取指纹、人脸或设备 PIN。

## 4. 目录与阅读顺序

```text
simple/
├── README.md
├── README.zh-CN.md
├── index.html          # 跳转到 Demo 首页
├── web/
│   ├── index.html      # 首页和登录状态
│   ├── register.html   # 创建账户
│   ├── login.html      # 账户名登录和 Passkey 登录
│   ├── passkey.html    # 凭证注册与管理
│   ├── app.js          # 页面交互、WebAuthn 调用和数据转换
│   └── style.css       # 页面样式
└── mock/
    └── api.js          # 模拟账户、凭证和 Session 的存储与操作
```

先看 [web/login.html](web/login.html) 中的按钮，再沿 [web/app.js](web/app.js) 的 `loginAccount()`、`registerPasskey()`、`loginWithPasskey()` 阅读，最后查看 [mock/api.js](mock/api.js) 中同名或对应的方法。

```text
HTML 表单／按钮
    → web/app.js：处理操作
    → MockAPI：读取或更新 localStorage
    → 页面显示结果

Passkey 操作还会调用 navigator.credentials.create() / get()
```

页面加载 `mock/api.js` 后获得 `MockAPI` 对象。控制台出现的 `/api/...` 是模拟日志中的接口名称，**不会真的发送这些 HTTP 请求**；静态服务器没有这些账户接口。

## 5. Passkey 注册是怎样完成的

1. `registerPasskey()` 确认浏览器支持 WebAuthn，并检查当前模拟登录态。
2. `MockAPI.getPasskeyRegisterOptions()` 生成随机 Challenge，写入 Mock 数据；用当前账户生成 `user`，用页面主机名生成 RP ID。
3. 前端将 Base64URL 格式的 `challenge` 和 `user.id` 转成字节数组，调用 `navigator.credentials.create({ publicKey })`。
4. 浏览器和认证器完成凭证创建，前端将响应中的二进制字段转换为适合 JSON 表示的 Base64URL。
5. `MockAPI.verifyPasskeyRegistration()` 保存 Credential ID、账户 ID、状态等元数据，清除该账户的注册 Challenge 记录，然后刷新列表。

这里的 `verify` 方法名用于展示真实后端未来要接管的位置。Mock 没有解析和验证注册证明，没有保存可用于服务端验签的公钥，也没有校验 Challenge、Origin 或 RP ID。

## 6. Passkey 登录是怎样完成的

1. `MockAPI.getPasskeyLoginOptions()` 生成登录 Challenge，返回 RP ID 和空的 `allowCredentials` 列表。
2. `loginWithPasskey()` 转换 Challenge，调用 `navigator.credentials.get({ publicKey })`。
3. 浏览器返回认证响应，前端转换后交给 `MockAPI.verifyPasskeyLogin()`。
4. Mock 通过返回凭证的关联查找账户，并检查该账户是否拥有这条 Credential ID、该记录是否启用。
5. Mock 更新最后使用时间，创建模拟 Session，页面跳转到首页。

Mock 不执行签名验证、计数校验或 Challenge 匹配。浏览器成功返回凭证与服务器确认身份是两个步骤；在真实网站中，第 4 步还必须由服务器完成密码学验证。

当前注册选项使用 `residentKey: "preferred"` 和 `userVerification: "preferred"`，登录允许列表为空。它演示无需先输入账户名的凭证选择，但没有强制创建可发现凭证或强制进行用户验证，因此不同认证器的实际体验可能不同。

## 7. 为什么这样实现

| 设计 | 学习用途 |
| --- | --- |
| 只用账户名登录 | 暂时省略密码处理，便于观察账户与 Passkey 绑定 |
| HTML、原生 JavaScript | 不引入框架构建步骤，可以直接沿事件处理函数阅读 |
| `web/app.js` 与 `mock/api.js` 分开 | 页面负责交互，API 层负责数据；下一版本可以逐步替换 API 实现 |
| 使用 localStorage | 刷新后仍能看到演示数据，也能在开发者工具中检查 |
| 拆成 `options` 和 `verify` 两步 | 对应“发起凭证操作”和“处理操作结果”的前后端流程 |
| JSON 中使用 Base64URL | 表示 WebAuthn 的二进制字段；调用浏览器 API 时再转回字节数组 |
| 一账户对应多条凭证记录 | 展示账户与登录凭证之间的一对多关系 |

## 8. 数据存在哪里，如何观察

Mock 数据位于当前页面 Origin 的 localStorage，键名是 `account-login-passkey-example`：

| 字段 | 内容 |
| --- | --- |
| `accounts` | 账户 ID、账户名、创建时间 |
| `passkeys` | 账户关联、Credential ID、名称、启停状态、时间等元数据 |
| `challenges` | 模拟注册／登录 Challenge、用途、创建时间 |
| `session` | 当前模拟 Session；未登录时为 `null` |

本版本只有一个当前 Session 槽位，没有 Cookie Session 或服务端过期校验。Challenge 记录用于展示临时状态，并没有完整的有效期和防重放验证。

打开浏览器开发者工具，在 Console 中执行以下代码可以查看当前数据：

```javascript
await MockAPI.getDatabase()
```

页面初始化时也会打印 `[Mock Database]` 快照。要清空这一版的模拟数据，可以在 Demo 页面控制台执行：

```javascript
MockAPI.reset()
location.reload()
```

这会删除当前 Origin 下的 Simple 账户、关联和 Session，**不会删除设备保存的 Passkey**。重新开始后需要建立新的账户与凭证关联。停用凭证同样只改变 Mock 记录，不删除设备凭证，也不撤销已建立的 Session。

浏览器、用户配置或页面 Origin 变化后，可能看到不同的 localStorage。请固定使用同一地址体验；即使另一台设备能够使用相同 Passkey，也不代表该设备自动拥有这份本地模拟账户数据。

## 9. Mock 方法速查

这些是 JavaScript 方法，不是可通过 curl 调用的服务端接口。

| 方法 | 作用 |
| --- | --- |
| `registerAccount(username)` | 创建模拟账户 |
| `loginAccount(username)` | 以账户名进入模拟 Session |
| `getSession()` / `logout()` | 查询／清除当前登录态 |
| `getPasskeyRegisterOptions()` | 生成注册选项 |
| `verifyPasskeyRegistration(credential)` | 保存凭证与账户关联 |
| `getPasskeyLoginOptions()` | 生成登录选项 |
| `verifyPasskeyLogin(credential)` | 查找凭证关联并创建模拟 Session |
| `getPasskeys()` | 当前账户的凭证列表 |
| `enablePasskey(id)` / `disablePasskey(id)` | 修改凭证状态 |
| `getDatabase()` / `reset()` | 查看／清空模拟数据 |

## 10. 下一步：给自己的网站增加 Passkey

先进入 [complete](../complete/)，观察密码登录和绑定前密码确认如何加入同一条流程；再阅读 [complete-python 教程](../complete-python/README.zh-CN.md)，学习真实接口、公钥存储、响应验证和 Session。

迁移到自己的网站时，可以参考这里的按钮交互、WebAuthn 调用和数据转换。账户授权、Challenge 管理、凭证验证和登录态应接入自己网站的后端。Simple 的价值是让这些步骤变得容易观察，真实实现由后续版本逐步展开。
