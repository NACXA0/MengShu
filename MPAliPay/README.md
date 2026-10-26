# 盟书 · 支付宝小程序（云开发）

运行时只保留本目录。身份、关系档案、核验码与授权记录经**小程序云函数**读写；口令与助记词仍留本机。

## 打开方式

1. 安装[支付宝小程序开发者工具](https://opendocs.alipay.com/mini/ide/download)
2. 导入本目录，关联云开发环境
3. 将环境 ID 写入 [`utils/env.js`](utils/env.js) 的 `envId`
4. 在开放平台开启 **openid**（`getAlipayContext().OPENID`）
5. 右键 `cloud/functions` → 创建并部署云函数

未关联环境时，客户端会用同一套 `cloud/common/handlers` 做本地兜底，便于无 appId 预览。

## 云函数

| 函数 | 作用 |
|---|---|
| authEnter / authLogout | 注册恢复 / 注销冷却 |
| certifyCheck | 核验门 fail-closed |
| relationList / relationSave | 本 OPENID 关系档案 |
| plazaGet / verifyRedeem / consent* / reportAdd | 样例公开页与账本 |
| demoSetCertifyDown | 演示：核验服务中断 |

## 断言

```bash
node MPAliPay/scripts/test_cloud.js
```

## 本机仍存

口令哈希、盐、助记词（`utils/vault.js` + `shell` 存储）。云函数不接收口令。
