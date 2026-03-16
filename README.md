# 🚀 皎月连自动签到脚本

基于 GitHub Actions 的自动化签到脚本，用于 [natpierce.cn](https://www.natpierce.cn/) 网站。

## ⚙️ 技术栈

- **Node.js + Puppeteer**: 模拟浏览器登录和签到
- **Python + OpenCV**: 解决滑块验证码
- **GitHub Actions**: 定时自动执行
- **PushPlus**: 微信推送签到结果

## 📂 文件结构

```
.
├── .github/workflows/
│   └── daily-checkin.yml   # GitHub Actions 工作流配置
├── checkin.js              # 核心签到脚本 (Puppeteer)
├── solve_slider.py         # 滑块验证码求解器 (OpenCV)
├── push_notification.py    # PushPlus 推送通知
└── README.md
```

## 🛠️ 使用方法

### 1. Fork 本仓库

### 2. 配置 GitHub Secrets

进入仓库 **Settings → Secrets and variables → Actions**，添加以下 Secrets：

| Secret | 说明 |
|--------|------|
| `NATPIERCE_USERNAME` | 登录手机号或邮箱 |
| `NATPIERCE_PASSWORD` | 登录密码（末尾有点号请保留） |
| `PUSHPLUS_TOKEN` | PushPlus 推送 Token |

### 3. 运行方式

- **手动触发**: Actions → Daily NatPierce Check-in → Run workflow
- **定时触发**: 每天 UTC 02:10（北京时间 10:10）自动运行

## ⚠️ 注意事项

- 如网站 HTML 结构变化，需更新 `checkin.js` 中的选择器
- 请根据「下次可签到时间」调整 workflow 的 cron 表达式
- Secrets 请勿硬编码到代码中