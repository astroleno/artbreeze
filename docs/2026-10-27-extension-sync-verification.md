# 艺息 ArtBreeze 同步验证

验证日期：2026-10-27–28。交付版本：1.2.0。本文记录 Git 提交与商店上传前的验证结果；送审核对见 [store-readiness.md](store-readiness.md)。

## 实现结果

保留 24 个 ArtDuo 背景。自动选景考虑画作比例、配色与背景繁简，候选中避免连续重复；固定选景保持。画作独立居中、完整显示，右侧两行展签，夜间不改变原画颜色。

两款同步默认 2 秒无交互收起、悬停/焦点保持、重开保留、锁定、主动换内容、收藏与最近记录；设置页可调整宽度、时长、光影及各自适用功能。旧设置迁移保留有效偏好。网络获取集中在受限后台，只接受预定义操作和已知作品 ID。

## 已执行检查

| 检查 | 结果与证据 |
| --- | --- |
| 语法、单元/状态/迁移/网络边界/最终包测试 | 两端各 31/31，通过 npm run build；无跳过 |
| 真实 Chrome MV3 界面集成 | 两款合计 58/58，见 [chrome-checks.json](chrome-validation-2026-10-27/chrome-checks.json) |
| 旧版 ZIP 到新版 ZIP | 两款合计 13/13，扩展 ID 不变、偏好迁移；[upgrade-checks.json](chrome-validation-2026-10-27/upgrade-checks.json) |
| 设置、收藏、清除、跨标签与后台重启 | 合计 16/16；[state-capture-checks.json](chrome-validation-2026-10-27/state-capture-checks.json) |
| Chrome 完整关闭后重启 | 合计 6/6；收藏、偏好及产品最后内容/场景恢复；[state-verify-checks.json](chrome-validation-2026-10-27/state-verify-checks.json) |
| 原始资产再生成、重复同步与失败保护 | 合计 10/10；[resource-checks.json](chrome-validation-2026-10-27/resource-checks.json) |
| 开发预览、popup、options | 两端共 6 个入口通过；该项使用明确标注的替身，[preview-checks.json](chrome-validation-2026-10-27/preview-checks.json) |
| 最终 ZIP | CRC、文件白名单、24/1 素材、哈希、重复构建一致；[package-checks.json](chrome-validation-2026-10-27/package-checks.json) |

真实 Chrome 使用官方 Chrome for Testing 156.0.8078.47 与全新独立配置，不接管用户日常浏览器，不使用账号或现有会话。集成页面的 HTTPS 文档由本地测试响应提供，扩展 API、service worker、storage、图片与知识获取均使用真实实现。覆盖 Enter/按钮/表单去重、输入法与重复按键、Esc、阅读保持、自动收起、锁定、重开、滚动恢复、昼夜、原画无滤镜、背景解码和失败回退、小窗口、原生 200% 标签页缩放、减少动态效果及禁用。

## 在线来源与实站边界

ArtBreeze 实际取得 Google Arts & Culture 列表和展示图片。WaitWiki 九类内容都可展示：名言、建议、猫咪趣闻、问答和调酒在线返回；数据真相、偈语读取原有 CSV；当前网络下 Wikipedia 与 Numbers API 使用明确标注的本地备用内容。详情及只含固定 GET 请求、无网页 Referrer/请求正文的记录见 [provider-checks.json](chrome-validation-2026-10-27/provider-checks.json)。没有绕过证书验证或增设付费来源。

对清单中的 21 个 URL 范围做公开页面只读检查，修正 Copilot、Kimi 跳转后的当前域名。普通页面中两款入口和隔离脚本可加载；X 的两个入口受 403/登录跳转限制。ChatGPT、Claude 等遇到验证页，Copilot、DeepSeek 等需要登录；这不等同于全部站点的真实发送流程通过。逐站结果见 [site-checks.json](chrome-validation-2026-10-27/site-checks.json)。未发送 AI 消息。

在真实 Kimi 匿名页面通过入口展开了两款产品，使用真实公开画作或原有知识内容，取得 1280×800 截图；见 [live-screenshot-checks.json](chrome-validation-2026-10-27/live-screenshot-checks.json)。截图未使用测试 SVG 或虚构作品。截图中的展签与画作保持独立居中。

## 交付与未完成项

安装包：[artbreeze-1.2.0.zip](../dist/artbreeze-1.2.0.zip)。最新截图：[画廊展示](chrome-validation-2026-10-27/art-store-1280x800.png)。

代码与本地安装包已交付。公开隐私页随源码同步，后台核对与送审使用 [store-readiness.md](store-readiness.md)。受登录/验证限制的真实发送流程仍未覆盖，不能宣称所有在线站点完整联调通过。既有素材按用户指示保留并注明引用；未据此推断已取得所有第三方分发授权。

## 复查

普通检查在各仓库执行 npm run check / npm run build。原生浏览器验证脚本集中在相邻 artbreeze/tests/chrome-*.mjs，需 Node 22+、Chrome for Testing 的独立临时配置和允许扩展调试的开关；按 profile、两个最终 ZIP 解压目录和输出目录传参。chrome-state.mjs 的 capture 与 verify 之间必须完整重启该测试浏览器。普通运行与构建无需这些测试工具，也无需 ArtDuo、Pillow 或 libwebp。
