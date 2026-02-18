# Vercel Mihomo Subscription Converter

这个项目可直接部署在 Vercel：
- 自动拉取内置订阅源
- 自动解密/解析 `vmess://` 节点
- 自动转换为 `mihomo` YAML

## 部署

1. 将 `vercel-mihomo-sub` 目录推送到你的 Git 仓库。
2. 在 Vercel 导入该仓库，Root Directory 选择 `vercel-mihomo-sub`。
3. Node.js 版本建议 18+。

## API

- `GET /api/mihomo`
  - 返回 mihomo YAML（`text/yaml`）
- `GET /api/json`
  - 返回转换后的 JSON 节点（调试用）
- `GET /api/health`
  - 健康检查

## 可选参数

`/api/mihomo` 和 `/api/json` 都支持：

- `urls`：逗号分隔订阅地址（覆盖默认）
- `ua`：请求订阅时使用的 User-Agent

示例：

```text
/api/mihomo?urls=https://bannedbook.github.io/fanqiang/vsp-en.py
```

## 环境变量（可选）

- `SUB_URLS`：默认订阅地址（逗号分隔）
- `SUB_USER_AGENT`：默认 UA
- `MIHOMO_PORT`：输出配置里的 mixed-port（默认 7890）
- `TEST_URL`：url-test 检测地址（默认 `http://www.gstatic.com/generate_204`）
- `TEST_INTERVAL`：url-test interval（默认 300）
- `TEST_TOLERANCE`：url-test tolerance（默认 50）

## 默认内置源

- https://bannedbook.github.io/fanqiang/vsp-en.py
- https://raw.githubusercontent.com/bannedbook/fanqiang/master/docs/vsp-en.py
- https://gitlab.com/bobmolen/cloud/raw/master/vsp-en.py
- https://storage.googleapis.com/jwnews/vsp-en.py
