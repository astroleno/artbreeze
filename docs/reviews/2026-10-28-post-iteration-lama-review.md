# ArtBreeze / WaitWiki：本轮迭代后 Lama 独立复核

日期：2026-10-28。

复核版本：ArtBreeze `ecc8fb6d31d988e7f837f3dda39f1ed090802cde`（相对 `e9907f5`）；WaitWiki `79a11d923846289ae075faac4207929e23f05d2e`（相对 `f80ddb1`）。

## 结论与送审建议

这轮迭代改善了实际任务：主动键盘进入已有落点；手动换内容时不再让整个展陈消失；长画名和同名收藏都有就地识别路径。五张当前截图中的视觉层级与已确认概念一致。没有发现需要重做布局、模块或产品定位的 P0 / P1 阻断，**可以继续准备送审**。

仍有两项 P2 使用问题和一项 P3 状态文案问题，详见下文。它们不等于这轮改动发生回归，也不否定已通过的主要路径；建议在锁定最终交付前处理 P2。该判断是 UI / UX 复核结论，不保证 Google 商店一定通过。

严重度口径：P1 为主要任务无法完成或明显破坏宿主 AI 输入；P2 为特定实际任务产生明显障碍但有绕行办法；P3 为局部状态理解或信息准确性问题。

## 方法与边界

- 完整读取 Lama router 与其指定的 `appllama-app-design-skill`。仅采用任务层级、操作连续性、完整状态和认知负担原则；对象是桌面 Chrome 扩展，没有套用 Expo、手机导航或移动控件要求，没有外部研究。
- 独立读取两仓当前源码与提交差异。7 个本轮共享运行文件的 SHA-256 在两仓一致；因此下文共享源码的行号以 ArtBreeze 为链接入口，WaitWiki 同行同逻辑。
- 亲自 `view_image` 查看全部 5 张当前截图，并读取本轮验证 JSON。截图和 JSON 属于真实生产 UI 配开发夹具、Chrome API / 内容源替身的证据；没有把它们当成原生安装、真实 AI 发送、真实网络性能或屏幕阅读器播报验证。
- 两仓分别重跑现有的 `companion-lifecycle`、`session`、`reading-state`、`gallery`、`settings-migration` 五组纯单元测试，各 **26 / 26 通过**。未运行构建、打包或商店操作。
- 未读另一位本轮独立评审的报告，未交换评审发现。

沿用已确认边界：两款的系列重叠接受；Art 为 24 背景、画作独立居中及右侧两行墙签；Wiki 只使用可关闭的 `bg-027`，正文直接上墙；默认 2 秒自动收起、九类随机不作为缺陷；自动展示不得夺取 AI 输入焦点。未重新审问素材授权。

## 已修复与当前保留的优势

| 项目 | 独立判断与用户价值 | 证据与确认程度 |
| --- | --- | --- |
| 主动键盘进入与退出 | 入口原生点击按 `event.detail` 区分主动键盘进入；Wiki 聚焦正文，Art 聚焦工具；关闭时仅在焦点位于面板内才返回入口。更多菜单的第一下 Esc 先回到菜单触发器。键盘用户不必从页面头部重新找面板，自动展示也没有新增焦点调用。 | [companion.js:53](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:53)、[companion.js:64](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:64)、[companion.js:189](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:189)、[companion.js:215](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:215)。源码确认；已有浏览器记录覆盖 Enter、空格、Esc 和模拟输入框焦点。真实 AI 发送未复测。 |
| 手动换内容的连续性 | `next()` 保持旧内容可见，准备期间显示简短反馈；`busy` 暂停自动收起；候选 Art 图片先解码再提交当前条目。关闭、锁定和较新请求能使旧响应失效。用户可继续看旧内容，也可明确退出等待。 | [companion.js:119](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:119)、[companion.js:227](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:227)、[session.js:12](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/session.js:12)。两仓本次单测通过；`art-loading` / `reading-loading` 截图保留旧展陈；已有 JSON 覆盖 200 ms / 1 s / 8 s 延迟及失败。结论限定于手动换内容路径。 |
| 完整画名与作者 | 默认墙签仍是两行；更多菜单提供完整纯文本，能聚焦且有高度边界。用户可在原位辨认长标题，无需为了识别作品先跳出 AI 网页。 | [companion.js:49](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:49)、[companion.js:154](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:154)、[styles.css:57](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/styles.css:57)。源码与 `art-metadata` 截图确认；已有 JSON 覆盖窄面板键盘读取。默认墙签省略不是剩余缺陷。 |
| 同名收藏识别 | Wiki 摘录来自正文且按 Unicode 字符截取，三条同名偈语可以直接区分。已选条目同时有文字、边线与 `aria-pressed`，不是仅靠颜色。 | [options.js:5](/Users/aitoshuu/Documents/GitHub/artbreeze/options.js:5)、[options.js:29](/Users/aitoshuu/Documents/GitHub/artbreeze/options.js:29)。源码与 `library` 截图确认。识别和选择结果已改善，选择后的键盘位置另见 L1。 |
| 概念与文案 | Art 的“最近看过 / 下次看这幅 / 观看中”与看画任务一致；Wiki 的正文、来源与“下次读这条”围绕阅读任务。主画面继续安静，详细操作留在更多菜单和设置页。 | [options.html:2](/Users/aitoshuu/Documents/GitHub/artbreeze/options.html:2)、[options.js:10](/Users/aitoshuu/Documents/GitHub/artbreeze/options.js:10)、[settings.js:34](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/settings.js:34)。源码确认。 |

## 仍有问题

### L1 · P2：收藏选择成功后，整表重绘会中断键盘位置

**影响：** 用户已用摘录找到某一条内容，按 Enter 选择后，后台的状态更新会重新创建收藏和最近列表。当前按钮被移出 DOM，键盘焦点可能回落到 body；继续 Tab 无法可靠地从刚才条目接着访问来源、取消收藏或下一条。选择数据本身能成功，问题是找回内容后的连续操作被打断。这条重绘路径在基线已存在，本轮的键盘入口修复没有覆盖设置页。

**源码链：** [options.js:26](/Users/aitoshuu/Documents/GitHub/artbreeze/options.js:26) 发送 `select` → [background.js:24](/Users/aitoshuu/Documents/GitHub/artbreeze/background.js:24) 选中并在第 29 行写 `reading_state_v2` → [options.js:53](/Users/aitoshuu/Documents/GitHub/artbreeze/options.js:53) 重新 `load()` → [options.js:48](/Users/aitoshuu/Documents/GitHub/artbreeze/options.js:48) 调用两次 `list()` → [options.js:19](/Users/aitoshuu/Documents/GitHub/artbreeze/options.js:19) `replaceChildren()`。没有保存或恢复条目 / 按钮焦点。

**可执行复现：**

1. 在有至少两条收藏的设置页，用 Tab 聚焦一条“下次读这条 / 下次看这幅”。
2. 按 Enter，等待后台选择和列表更新完成。
3. 查看 `document.activeElement`，再按 Tab，检查是否仍由该条目接续到下一操作。
4. 若使用开发夹具，应让 `select` 按生产后台逻辑发出 `reading_state_v2` 存储变化；夹具原有 [fixture-chrome.js:22](/Users/aitoshuu/Documents/GitHub/artbreeze/tests/fixture-chrome.js:22) 只改内存状态，不会发出此事件，单独验证 queued ID 会漏掉此问题。

**确认程度：已确认。** 本评审先独立定位源码事件链，主线程随后补充浏览器复现：两款都使用未改的生产 `background.js` 与 `options.js`，仅以页面内 API 替身适配消息与存储；选择消息实际经过后台 `dispatch → reading → storage.local.set`。聚焦第二条选择按钮按 Enter 后，`reading_state_v2` 写入 1 次、旧按钮 `isConnected=false`、`activeElement=BODY`；下一次 Tab 回到第一条。该结果确认实际焦点中断，但仍不是原生安装验证。[补测截图](/Users/aitoshuu/Documents/GitHub/artbreeze/docs/reviews/assets/2026-10-28-post-review-library-focus.png) 已亲自查看。

**可执行修正与验收：** 无内容变化时原位更新选中状态；确需重建列表时按条目 ID 与操作保留焦点，条目删除则落到相邻合理位置。验收要检查选择完成后的焦点和下一次 Tab 路径，不能只检查选中 ID。

### L2 · P2：没有当前内容时，首次主动打开缺少准备反馈

**影响：** 冷启动或清空本地数据后，手动点击入口会先等内容请求完成，再显示面板和加载提示；键盘进入会先露出空正文 / 空画廊并聚焦，但同样没有“正在准备”的信息。慢响应时用户难以判断操作是否生效，可能重复点按。它属于保留的首次加载缺口，不是本轮“手动换下一项”修复发生回归。

**源码证据：** [companion.js:146](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:146) 先 `await prepareCycle()`，第 150 行才显示面板并写 Art 载入提示；Wiki 此处始终没有首载状态文案。[companion.js:220](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:220) 的主动键盘分支可提前显示面板，但没有设置准备反馈。新的 `setLoading(true)` 只在 [companion.js:230](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:230) 的 `next()` 使用。真实 provider 单次请求的超时设置为 8 秒（[providers.js:19](/Users/aitoshuu/Documents/GitHub/artbreeze/providers.js:19)），这里没有测量真实响应速度。

**可执行复现：**

1. 使用空 `current` 的开发夹具，关闭悬停展开以隔离点击路径。
2. 让 `requestContent()` 延迟 3 秒；指针点击入口一次，观察响应前是否仍只有原入口且没有准备提示。
3. 重新以空状态开始，Tab 到入口并按 Enter，检查空面板中是否有可读的准备提示。
4. 解除延迟，确认内容仍可正常出现；不要把“最终能加载”当作中间状态已有反馈。

**确认程度：已确认，为遗留的冷加载反馈问题。** 主线程用生产前端配 API 替身补测两款 × 指针 / 键盘共 4 组，隔离 `hoverToOpen=false`，向 `requestContent()` 注入 3 秒延迟。约 1.0–1.1 秒时 `current=null`：指针路径入口仍显示、`container.hidden=true`；键盘路径为已显示的空展厅，`status` 与 `updateStatus` 都为空。四组最后均正常载入，因此不是卡死或永久空白。[冷启动截图](/Users/aitoshuu/Documents/GitHub/artbreeze/docs/reviews/assets/2026-10-28-post-review-cold-start.png) 已亲自查看。既有 49 项有效断言针对已有内容的换项，不证明该冷启动路径。

**可执行修正与验收：** 首次主动打开即显示简短、可播报的准备状态；成功、失败和关闭都清理状态。自动展示继续保留 AI 输入焦点。验收同时覆盖指针与键盘、慢响应与失败，不必改变背景、默认时长或引入新页面。

### L3 · P3：“已选，下次打开”在选择已消费后仍可能指向旧内容

**影响：** 新选中标记表达了将要发生的动作，但其来源是持久化的最后一次选择。用户实际打开 A、随后换到 B 后，设置页仍能把 A 标为“已选，下次打开”，而当前 AI 标签页重开显示 B。状态文字与后续动作不一致，可能让用户以为选择失效；重选可恢复，不阻断主要任务。

**源码证据：** [options.js:10](/Users/aitoshuu/Documents/GitHub/artbreeze/options.js:10) 使用“下次”文案；[options.js:45](/Users/aitoshuu/Documents/GitHub/artbreeze/options.js:45) 持续从 `reading_selection_v2` 恢复选中 ID。[companion.js:99](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:99) 接收选择，随后 [companion.js:219](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:219) 只清内存中的 `pendingSelection`。运行源码没有消费后清除该存储标记的路径。

**可执行复现：** 设置页选 A → 返回已打开的 AI 标签页并打开 A → 手动换成不同内容 B → 收起 → 重新加载设置页，检查 A 的标记 → 回到同一 AI 标签页重开，比较实际内容是否为 B。

**确认程度：Wiki 受控浏览器已确认；Art 为共享源码推断，本次未重复完整消费链。** 主线程补测完整流程：设置选择 A（`postreview1`）→入口显示 A→通过真实更多菜单“换一条”切到 B（`1xvv34o`）→关闭重开仍为 B。此时 `pendingSelection=null`，`reading_selection_v2` 仍保存 A，设置页 A 的按钮仍显示“已选，下次打开”。生产 `background.js`、Companion 和 `options.js` 均未修改；Chrome API 为开发替身，两页之间手动中继 state / marker 来模拟同一份 Chrome.local，偈语由真实 provider 从本地 CSV 取得，没有访问外部内容源。该补测确认 Wiki 的状态提示与实际重开结果不一致，仍不属于原生安装验证，严重度维持 P3。

**可执行修正与验收：** 按当前“下次打开”的含义，在选择被消费后同步取消待打开标记；若仅想表达历史选择，应明确写为“上次选择”。验收覆盖消费、后续换内容、设置页重载三步，避免旧标记继续承诺下一次打开的内容。

## 视觉与验证判断

亲自查看的五张截图：[Art 等待换画](/Users/aitoshuu/Documents/GitHub/artbreeze/docs/reviews/assets/2026-10-28-iteration-art-loading.png)、[Wiki 等待换条](/Users/aitoshuu/Documents/GitHub/artbreeze/docs/reviews/assets/2026-10-28-iteration-reading-loading.png)、[Art 完整信息](/Users/aitoshuu/Documents/GitHub/artbreeze/docs/reviews/assets/2026-10-28-iteration-art-metadata.png)、[同名收藏](/Users/aitoshuu/Documents/GitHub/artbreeze/docs/reviews/assets/2026-10-28-iteration-library.png)、[Wiki 窄面板](/Users/aitoshuu/Documents/GitHub/artbreeze/docs/reviews/assets/2026-10-28-iteration-reading-narrow.png)。

可见范围内，换项提示没有替代整面内容；菜单能完整展示长画名；同名偈语能够凭摘录辨认；390 px 视口的暗色 Wiki 仍是透明正文区，未出现白底正文卡片或面板越界。阅读加载截图顶部被截去的一行符合已保留的滚动位置，不能凭此认定排版缺陷。

截图不证明背景更换时逐帧无闪动、原生浏览器 200% 缩放、真实 AI 站点事件识别或屏幕阅读器播报。已有验证 JSON 的 49 / 49 是上一轮记录，本次没有冒称重新执行全部浏览器断言。上述限制是证据边界，不是已发现的故障。

本报告只写评审结果；未改产品代码、生成 ZIP、提交、推送或操作商店。
