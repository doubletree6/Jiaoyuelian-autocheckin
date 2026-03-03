# 🚀 皎月连自动签到脚本

这是一个基于 GitHub Actions 的自动化签到脚本，用于 [natpierce.cn](https://www.natpierce.cn/) 网站。它利用无头浏览器模拟用户登录和签到操作，并通过 PushPlus 推送签到结果。

## ⚙️ 核心技术栈

*   ✅ **Node.js**: 运行自动化脚本。
*   ✅ **Puppeteer**: Node.js 库，用于控制无头 Chrome/Chromium 浏览器，模拟用户交互。
*   ✅ **Python**: 用于发送 PushPlus 推送通知。
*   ✅ **GitHub Actions**: 自动化工作流，定时执行签到任务。

## 📂 文件结构

*   `.github/workflows/daily-checkin.yml`: GitHub Actions 工作流配置文件，定义了何时、何地以及如何运行签到和通知脚本。
*   `checkin.js`: 核心签到脚本，使用 Puppeteer 模拟登录和点击签到按钮。
*   `push_notification.py`: Python 脚本，用于接收签到结果并通过 PushPlus 发送通知。

## 🛠️ 使用方法

### 1. 克隆仓库

首先，将此仓库克隆到你的 GitHub 账户下。

### 2. 配置 GitHub Secrets

为了安全地存储你的敏感信息（如用户名、密码和 PushPlus Token），你需要在 GitHub 仓库中配置 Secrets。

进入你的 GitHub 仓库：
*   ⚙️ 点击 **Settings (设置)**。
*   🔑 点击 **Secrets and variables (密码和变量)** -> **Actions (操作)**。
*   ➕ 点击 **New repository secret (新建仓库密钥)**。

请创建以下三个 Secrets：

*   `NATPIERCE_USERNAME`: 你的 natpierce.cn 登录手机号或邮箱。
*   `NATPIERCE_PASSWORD`: 你的 natpierce.cn 登录密码。**注意：如果密码末尾有点号（.），请务必包含它！**
*   `PUSHPLUS_TOKEN`: 你的 PushPlus 推送 Token。


### 3. 调整选择器 (重要！)

`checkin.js` 脚本中的元素选择器是基于当前网站结构推断的。如果网站的 HTML 结构发生变化，脚本可能会失效。

**你可能需要根据实际网站的 HTML 结构来调整 `checkin.js` 中的以下选择器：**

*   `input[placeholder="请输入手机号或邮箱"]` (用户名输入框)
*   `input[placeholder="请输入密码"]` (密码输入框)
*   `div.login_btn` (登录按钮)
*   `#qiandao` (签到按钮)
*   `div.layui-layer-content` (签到结果提示信息)

**如何找到准确的选择器：**
1.  🌐 在浏览器中打开登录和签到页面。
2.  🖱️ 右键点击对应的元素 -> 检查 (Inspect)。
3.  🔍 在开发者工具中找到该元素的 HTML，特别是 `id`、`class`、`name` 属性，或者它的文本内容。
4.  ✏️ 根据找到的属性更新 `checkin.js` 中的选择器。

### 4. 触发工作流

工作流可以通过以下方式触发：

*   ▶️ **手动触发**: 在你的 GitHub 仓库中，导航到 `Actions` 选项卡，找到 `Daily NatPierce Check-in` 工作流，点击 `Run workflow` 按钮。
*   ⏰ **定时触发**: 脚本会根据 `.github/workflows/daily-checkin.yml` 中定义的 `cron` 表达式每天自动运行。**请务必根据你账户的“下次可签到时间”和“服务到期时间”来调整 `cron` 表达式，确保脚本在可签到时间之后且服务到期之前运行。** `cron` 表达式是基于 **UTC 时间** 的。

### 5. 🐛 调试

*   📄 **GitHub Actions 日志**: 每次工作流运行都会生成详细的日志。如果脚本失败，请检查日志以了解具体错误信息。
*   🖥️ **`checkin.js` 输出**: 脚本会将 `CHECKIN_RESULT` 打印到标准输出，工作流会捕获此信息并用于 PushPlus 推送。你可以在 Actions 日志中查看 `Full checkin.js output` 和 `Extracted CHECKIN_RESULT` 来确认信息是否正确提取。

## ⚠️ 注意事项

*   🌐 请确保你的 GitHub Actions 环境可以访问 `natpierce.cn`。
*   🔄 如果网站结构频繁变化，你可能需要定期更新 `checkin.js` 中的选择器。
*   🔒 请妥善保管你的 GitHub Secrets，不要将其硬编码到代码中。
