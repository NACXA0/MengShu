# 封面再优化 + 首页极简（扫码合一）+ 拆解"我的"为设置页

先回答第 4 点：**"我的"页没有必要**。它实际是"会话管理 + 演示控制台 + 设置"的混合体，首页极简后也不该有常驻入口——拆解合并进新的**设置页**（第 5 点的齿轮入口），me 页删除。

## 1. gate 封面：业务化文案 + 根治"返回盟书"

**"返回盟书"按钮根因**：退出会话/注销用 `redirectTo` 跳 gate，页面栈变成 [vault, gate]——系统原生返回箭头出现在封面顶部。修复：me/vault 中 3 处 `redirectTo(gate)` → `reLaunch`，封面永远为根页面。

**文案重写**（需求+介绍导向，去除哈希/服务器等程序语言）：
```
[印章]  盟书 PactBook
认真开始一段关系时，把承诺变成凭证

两人当面确认，共同签署一份关系档案；
承诺签下就改不了，日后出示经得起核验。

为什么可信：
· 双方共签 —— 两人到场、各自身份验证、共同落章
· 不可篡改 —— 签署记录上链存证，动一个字都会被发现
· 只有你能看 —— 档案加密存在你的手机里，平台也看不到

红线：不收集姓名、身份证号与人脸信息；不是婚恋平台
[✓] 我已满 18 周岁，自愿进入     [进入盟书]
```
US-F9 演示开关移出封面 → 设置页演示组（持久化到 storage，gate 进入时读取）。

## 2. vault 首页：极简化

- **顶部完全无栏**：zone chip 并入档案总览卡首行（`⟨Vault⟩ 我的档案`），锁定态在口令组上方保留同款小 chip 行（安全需求保留、不占独立栏）
- **底部单一「扫一扫」主按钮**，移除 [验证他人档案][我的] 入口行：
  - 扫到 `MS-*` 授权码 → globalData.pendingCode + 进 verify 页
  - 扫到其他码/演示无摄像头（IDE）→ actionSheet 三选：**验证他人档案 / 发起新关系 / 加入对方发起的关系**
  - "加入"（演示）：relationList 找最近 INVITED 关系 → 切 B 角色 → 进 sign 接受页；无可加入邀请则 toast
- **齿轮设置入口**：胶囊左侧、无背景、与胶囊垂直居中（`nav.js` 增加 `menuWidth`/`gearStyle` 计算）；tap → 设置页

**齿轮图标**：现有图标库无齿轮。新增零依赖生成脚本 `scripts/gen_gear.js`（Node 内置 zlib 手写 PNG 编码器 + 抗锯齿齿形绘制），生成 `assets/icons/gear-night.png`（首页深蓝底用亮色线性齿轮）。

## 3. 新 pages/settings（承接 me 全部功能，me 页删除）

分组：
1. **会话**：当前 openid、退出会话（保留绑定）、注销账号（certify 门控流程原样迁移）
2. **授权记录**：consentList 账本
3. **通用**：外观（循环切换）、能力边界
4. **演示控制台**：身份验证服务中断、US-F9 已绑定拒绝开关（原 gate 开关迁入）、重置本地演示仓、公示样本（pb_* 五个）、核验码样本、机构样本

联动改动：app.json 删 me 注册/加 settings；`result.js` toLedger → settings；vault `openMe` → `openSettings`（齿轮）；me 的 certify/logout ticket 逻辑原样迁移。

**新增 `platform.actionSheet`** 封装（my.showActionSheet，无 my 时回调 null 供演示路径）。

## 4. 验证

`node --check` 全部改动文件；`node scripts/test_cloud.js` + `test_shell.js` 回归；运行 gen_gear.js 产出图标。