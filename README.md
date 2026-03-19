# 🚀 皎月连自动签到

⚠️首先，长期使用强烈建议支持皎月连作者的订阅服务。⚠️

⚠️本项目仅为业余时间所做娱乐项目，本人不承担非本人使用本项目所带来的风险和后果！⚠️

基于 GitHub Actions 的自动化签到脚本，用于 [natpierce.cn](https://www.natpierce.cn/) 网站。每天自动签到并通过微信推送结果。

## ✨ 功能特性

- 🤖 全自动签到，无需手动操作
- 🔐 账号密码通过 GitHub Secrets 安全存储
- 🧩 自动识别并解决滑块验证码
- 📱 微信推送签到结果（通过 PushPlus）
- ⏰ 每天北京时间 10:10 自动执行

## 📋 准备工作

### 1. 获取 PushPlus Token（用于微信推送）

1. 微信搜索并关注公众号「**PushPlus推送加**」
2. 在公众号菜单中找到 Token，复制保存


### 2. Fork 本仓库

点击右上角 **Fork** 按钮，将仓库复制到你自己的账号下

## ⚙️ 配置步骤

### Step 1: 进入 Secrets 设置页面

1. 打开你 Fork 的仓库
2. 点击 **Settings**（设置）
3. 左侧菜单找到 **Secrets and variables** → **Actions**
4. 点击 **New repository secret** 按钮

### Step 2: 添加以下 3 个 Secrets

| 名称 | 值 | 说明 |
|------|-----|------|
| `NATPIERCE_USERNAME` | 你的手机号或邮箱 | 皎月连登录账号 |
| `NATPIERCE_PASSWORD` | 你的密码 |  |
| `PUSHPLUS_TOKEN` | 你的 Token | 从 PushPlus 公众号获取 |

**添加示例：**

```
Name: NATPIERCE_USERNAME
Secret: your_email@example.com

Name: NATPIERCE_PASSWORD  
Secret: YourPassword123.

Name: PUSHPLUS_TOKEN
Secret: abc123def456ghi789
```

### Step 3: 启用 GitHub Actions

1. 进入仓库的 **Actions** 选项卡
2. 如果看到提示，点击 **I understand my workflows, go ahead and enable them**
3. 确认工作流已启用

## ▶️ 运行方式

### 方式一：手动触发

1. 进入 **Actions** 选项卡
2. 左侧选择 **Daily NatPierce Check-in**
3. 点击右侧 **Run workflow** → **Run workflow**
4. 等待运行完成，查看日志确认结果

### 方式二：定时自动运行

工作流会在每天 **UTC 02:10**（北京时间 **10:10**）自动执行。

如果需要修改时间，编辑 `.github/workflows/daily-checkin.yml` 中的 cron 表达式：

```yaml
schedule:
  - cron: '10 2 * * *'  # UTC 时间，北京时间需要 -8 小时
```

**常用时间对照表：**

| 北京时间 | cron 表达式 |
|---------|-------------|
| 08:00 | `0 0 * * *` |
| 10:00 | `0 2 * * *` |
| 12:00 | `0 4 * * *` |
| 20:00 | `0 12 * * *` |

## 📱 推送效果

签到完成后，你会在微信收到推送通知：

```
皎月连签到：签到成功！
下次可签到时间: 2026-03-17 10:00:00
```

## 🔧 常见问题

### Q: 签到失败怎么办？

1. 检查 Secrets 中的账号密码是否正确
2. 进入 Actions 查看运行日志，了解具体错误
3. 确认皎月连服务未到期

### Q: 没有收到微信推送？

1. 确认已关注「PushPlus推送加」公众号
2. 检查 `PUSHPLUS_TOKEN` 是否正确
3. PushPlus 免费版有每日推送限制

### Q: 如何关闭自动签到？

进入 Actions → Daily NatPierce Check-in → 右侧 **⋯** → **Disable workflow**

或者直接删除仓库

### Q: 账号密码安全吗？

- 账号密码存储在 GitHub Secrets 中
- 代码中不会硬编码任何敏感信息
- 建议定期更换密码

## 📄 项目结构

```
.
├── .github/workflows/
│   └── daily-checkin.yml   # GitHub Actions 工作流
├── checkin.js              # 签到主脚本
├── solve_slider.py         # 滑块验证码求解器
├── push_notification.py    # PushPlus 推送脚本
└── README.md
```

## 📜 开源协议

MIT License

---

⭐ 如果这个项目对你有帮助，欢迎 Star！
