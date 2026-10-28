# Lama 独立审阅：ArtBreeze 与 WaitWiki

> 后续说明（2026-10-28）：本报告保留独立审阅初稿。用户已接受系列重叠；后续补测确认键盘存在 Shift+Tab 可行路径，汇总定级已调整。当前结论以 [严重度复核报告](2026-10-28-severity-recheck.md) 为准。

审阅日期：2026-10-28。审阅对象：ArtBreeze 1.2.0，提交 `e9907f51`；WaitWiki 1.4.0，提交 `f80ddb19`。本报告独立形成，只提出建议，没有修改产品、改变已批准设计或执行发布。

## 结论

两款产品已经具有明确的内容主角和克制的展示层级。ArtBreeze 的“看画”概念比 WaitWiki 的“读知识”更完整：画作确实是空间中心，WaitWiki 的混凝土墙面也已摆脱白色阅读底板，但长短不一、语言不同的九类内容和默认 2 秒收起，使“开始阅读—读完—回到 AI”仍需要用户主动管理。

下一轮最有价值的工作是保证停留节奏、找回内容和键盘往返。继续增加背景、动效或装饰，对这些问题帮助有限。本轮没有足够证据将任何项判为 P1 发布阻断；表中的 P2 包含已证实问题和明确标注的条件风险，不代表 Chrome 商店合规结论。

## 范围与方法

使用 [Lama 路由 Skill](/Users/aitoshuu/.codex/skills/lama/SKILL.md)，按最小适用范围读取 [Appllama App Design Skill](/Users/aitoshuu/.cc-switch/skills/appllama-app-design-skill/SKILL.md)。采用其主任务层级、低认知负担、状态完整、上下文保持、克制高频反馈和浅深主题一致性的原则。对象为桌面 Chrome 扩展，未要求改成 Expo、使用移动端导航/SF Symbols，也未套用手机触控尺寸；未开展外部竞品研究或调用 Appllama MCP。

阅读了两仓库 README、`docs/gallery-design.md`，以及 `gallery/companion.js`、`session.js`、`reading-state.js`、`experience.js`、`settings.js`、`styles.css`、`settings.css`、`options.js`、`popup.js`。九份实现文件在两个仓库逐字节相同，但分别结合产品目录和入口分析。另读 WaitWiki 内容提供器、场景描述和前次 Chrome 验证记录。

本轮亲自查看以下 **12 张前次真实 Chrome 截图**，目录为 [chrome-validation-2026-10-27](/Users/aitoshuu/Documents/GitHub/artbreeze/docs/chrome-validation-2026-10-27)：

- `art-detail.png`、`art-light.png`、`art-dark.png`、`art-small.png`、`art-settings.png`、`art-zoom200.png`。
- `reading-detail.png`、`reading-light.png`、`reading-dark.png`、`reading-small.png`、`reading-settings.png`、`reading-zoom200.png`。

这些图能证明当时的排版和静态状态，不能证明本轮实测、动画流畅度、主任务完成时机或所有在线站点表现。本审阅者未操作浏览器，未测量帧率、阅读时长或用户行为；旧验证 JSON 仅作为历史证据。开发夹具使用本地替身内容并关闭自动收起，不能把夹具默认值当作正式默认值。

## 认可并保留的设计约束

| 产品 | 核心承诺 | 本次审阅接受的边界 |
|---|---|---|
| ArtBreeze | 等一段回答，看一幅画；一次短暂、安静的观看 | 保留 24 个展厅；画作独立居中；右侧画名、作者共两行纯文字；原画不施加夜间滤镜；背景可关闭 |
| WaitWiki | 等一段回答，读一段知识；可以短暂离开，也能接着读 | 只使用 bg-027 混凝土展墙；默认纯色、背景可关闭；开启后文字直接落在干净墙面，不恢复白色卡片/底板；保留九类内容 |
| 共同 | 内容是 AI 等待时的伴随体验，AI 对话仍是主任务 | 不读取聊天正文或模型回复；不把定时器称作回答完成；新周期或明确操作才换内容；悬停、聚焦、重开、昼夜与尺寸变化保持内容；收藏和进度留在本地 |

设计来源：[ArtBreeze 设计第 5 行](/Users/aitoshuu/Documents/GitHub/artbreeze/docs/gallery-design.md:5)、[WaitWiki 设计第 5 行](/Users/aitoshuu/Documents/GitHub/WaitWiki/docs/gallery-design.md:5)。对这些边界的改变，下文均单独标为产品决策建议，不视为已获得修改授权。

## 逐产品判断

| 维度 | ArtBreeze | WaitWiki |
|---|---|---|
| 前端 UI/UX | 视觉主次清楚，昼夜保持原画色彩，少量工具按需出现。主要缺口是画名被截断后缺少原位查看完整信息，以及收藏后的跨页返回成本 | 无白底板的墙面阅读已成立，窄屏和 200% 下文本仍落在墙内。收藏/最近的辨识度不足；完整设置中主阅读节奏和大量内容选择平级展开 |
| 概念一致性 | 展厅、居中画作、右侧标签和隐去工具相互支持。通用“下次阅读/最近阅读”文案与看画动作略有偏离 | 固定一个安静背景符合阅读定位。诗句、数字趣闻、英文问答、调酒配方的阅读负担差距较大，默认随机轮换更接近内容抽取器，尚未形成稳定的阅读节奏 |
| 心流沉浸感 | 静止画面和稳定重开有利于短暂休息；默认 2 秒适合瞥见，未必支持持续观看。源内容冷加载、主动换画和返回 AI 的边界仍需验证 | 自动收起把“没有鼠标/焦点互动”当作离开，眼睛正在阅读时也可能收起。进度恢复是重要优点，但到收藏页再选“下次阅读”的操作链会使一次短暂阅读变成导航任务 |

## 等待 → 进入 → 停留 → 返回

1. **等待与进入。** 自动进入保持原输入框焦点，是必要的克制。另一方面，`Session.begin()` 先等待 `onCycle()`；远端知识尚未返回时面板并不出现。ArtBreeze 还会在图像解码期间隐藏画作与标签。8 秒网络超时意味着首次进入可能错过用户愿意短暂观看的时机，但这里没有实际冷启动延迟测量，不能声称每次都慢。
2. **停留。** 指针进入或键盘焦点进入会暂停收起，滚动位置会保存，昼夜/尺寸改变不换内容。这些支持连续阅读。问题是视觉专注并不等于指针专注；用户手离开鼠标看诗句时，正式默认仍在 2 秒后收起。锁定的语义是防换内容，代码并未让锁定自动暂停收起。
3. **收藏与接续。** 面板内的心形收藏很轻，适合不打断观看。检索需要打开设置页；WaitWiki 列表不展示正文摘录，多条“偈语”或“猫咪趣闻”会难以辨认。选择“下次阅读”后还需回 AI 页并打开入口，虽然状态链条已有历史自动验证，但操作方向缺少直接视觉连接。
4. **返回主任务。** 手动收起、Esc 和自动收起都存在；也明确不伪装成 AI 完成信号。自动出现不应抢输入焦点；主动用键盘进入时则需要明确焦点落点，退出应按进入方式返回。现在 Esc 统一把焦点移到入口，并没有记录原输入框。这一策略在旧测试中被作为“恢复入口焦点”验证通过，却仍可能增加回到 AI 输入的路径。

上述行为依据：[等待控制](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/session.js:13)、[指针及焦点交互](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:54)、[读取与解码](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:120)、[正文恢复](/Users/aitoshuu/Documents/GitHub/WaitWiki/gallery/companion.js:155)、[来源超时](/Users/aitoshuu/Documents/GitHub/WaitWiki/providers.js:19)。

## 排序的问题表

优先级口径：P1 为有证据的关键流程阻断；P2 为明显增加理解、操作或沉浸成本；P3 为局部质感/一致性改进。**已证实**指源码或确实看过的截图能直接支持；**推断**指行为事实明确但用户影响尚需验证；**待验证**指仍需运行对应路径。

| 编号 / 优先级 / 状态 | 触发场景与用户影响 | 证据 | 建议与可验收标准 |
|---|---|---|---|
| L1 · P2 · 行为已证实，体验影响推断 | 用户发送后只用眼睛看画/读字，不移动鼠标到面板。正式默认 2 秒收起；重新打开又要找入口。锁定内容不等于保持展开，主观看动作受隐含规则控制 | [默认时长](/Users/aitoshuu/Documents/GitHub/WaitWiki/gallery/experience.js:23)、[计时/交互条件](/Users/aitoshuu/Documents/GitHub/WaitWiki/gallery/session.js:12)、[锁定行为](/Users/aitoshuu/Documents/GitHub/WaitWiki/gallery/session.js:16)；旧 Chrome JSON 第 215–223 行验证的“active reading”实际是指针/焦点保持，未证明无交互静读 | **产品决策建议：**先验证 2 秒是否符合“短瞥/阅读”的定位，再决定是否提供容易理解的“保持展开”入口或不同停留预设，不直接改默认值。验收：短诗、长百科、看画三种场景分别记录无指针静读体验；用户能不离开当前内容找到明确的停留/退出方式；不把 AI 完成状态引入计时语义 |
| L2 · P2 · 已证实 | ArtBreeze 常规、窄屏与 200% 下画名呈“Landscape at …”，窄屏作者也变成“Childe H…”。想知道自己看到什么，需要开来源或离开展示去设置页 | [两行截断样式](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/styles.css:31)、[标签最大宽 100px](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/experience.js:66)、[标题赋值无完整标题提示](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:126)；已查看 `art-detail`、`art-small`、`art-zoom200` | 保留居中与右侧两行约束，为截断标签提供轻量原位完整信息，如聚焦/明确操作后的详情；作者也需可取全。验收：长标题、长作者在 360px、600px、200% 下，用户均可不导航离开查看完整文字；详情不挤动画作 |
| L3 · P2 · 已证实 | WaitWiki 收藏多条同类内容后，列表只显示通用标题和来源。`reading-settings.png` 中多条“偈语”及重复来源不能让用户辨认哪一段是想续读的内容，收藏完成却无法高效找回 | [列表只输出 title 与 artist/source](/Users/aitoshuu/Documents/GitHub/WaitWiki/options.js:13)、[多种来源采用通用标题](/Users/aitoshuu/Documents/GitHub/WaitWiki/providers.js:157)；已查看 `reading-settings` | 在现有收藏/最近列表提供短正文摘录，必要时补充进度或最近时间；不新增内容系统。验收：收藏三条同标题、同来源且正文不同的内容，仅看列表就能区分并选回目标；选中后正文与原位置一致 |
| L4 · P2 · 源码路径已证实，键盘体验待验证 | 用户用键盘主动打开入口：入口随展开隐藏，但没有主动给正文/工具设置焦点；Esc 则统一聚焦入口。自动进入保持输入框焦点是正确的，但主动进入和自动进入未区分，返回 AI 可能需要重新寻找输入位置 | [入口与隐藏](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:47)、[Esc 处理](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:58)、[展开](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:125)、[主动打开](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:177)；旧 `chrome-checks.json` 验证了自动不抢焦点与 Esc 回入口，没有验证整条主动键盘接续路径 | 按自动/主动、键盘/指针保留适当的上下文；不要为修此问题让所有自动面板抢焦点。验收：从输入框发送自动进入仍可连续输入；从入口按 Enter 后可直接访问内容与工具；Esc 回到符合进入来源的位置；无需从宿主页顶部重新 Tab 一遍 |
| L5 · P2 · 源码事实已证实，实际延迟待测 | 首次抽取知识或远端变慢时，面板等内容返回后才显示；此前没有当前周期状态。等待内容自身又引入等待，返回可能已晚于用户的短暂休息窗口 | [onCycle 完成后 visible](/Users/aitoshuu/Documents/GitHub/WaitWiki/gallery/session.js:17)、[请求完成后赋内容](/Users/aitoshuu/Documents/GitHub/WaitWiki/gallery/companion.js:110)、[8 秒超时](/Users/aitoshuu/Documents/GitHub/WaitWiki/providers.js:19)、[Art 隐藏整帧](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:125) | 先测冷/热缓存与慢网，不先加常驻加载 UI。可考虑立即保留当前可读内容或本地短内容，远端结果延后使用，并保持已开始阅读的内容稳定。验收：受控 0/2/8 秒内容延迟均有明确、一致且可取消的表现；迟到结果不突然盖回已回到的主任务；重开不丢当前内容 |
| L6 · P2 · 已证实的跨页成本 | 用户只是想接着看收藏，却进入“完整设置、收藏与最近”的独立页，选“下次阅读”后再回 AI 页打开入口。功能可用，但几步管理动作超过一次短阅读本身；Art 的“下次阅读/最近阅读”还沿用通用阅读措辞 | [菜单入口](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:42)、[选择后的说明](/Users/aitoshuu/Documents/GitHub/artbreeze/options.js:15)、[待选项在重开时应用](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:179)；已查看两张 settings 图；旧 state-capture JSON 只证明选项能打开正确内容 | 保留已批准 options 架构，先改善方向与信息：明确选中项、返回后打开方式，区分“下次看这幅/继续阅读”。**若要新增面板内最近列表，属于范围/产品决策。**验收：两端各选一条历史内容，用户无需猜测当前选中项和下一步；返回后保持选中内容与阅读位置 |
| L7 · P2 · 条件推断，未运行双装验证 | 同一 AI 页同时启用两款：入口都在右下同一位置，两面板都在右上同一位置、同一层级，同时监听发送。后插入界面可能遮住另一款，选择与退出缺少可预测关系 | 两端共用 [面板位置](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/styles.css:7)、[入口位置](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/styles.css:57)、[发送监听](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:62)。本轮没有双装截图，不能称已证实遮挡 | 先在双装场景验证，再由用户决定互斥、优先或避让关系；不要自行增加跨扩展通信/权限。验收：同时启用后两个入口可辨认、可点击；发送不会产生不可操作的叠层；逐一收起与返回主任务的结果可预期 |
| L8 · P3 · 已证实 | 完整设置的启用、主题、宽度、时长、入口、光影、来源和内容种类连续铺开，预览放在所有控件之后。调整顶部背景时看不到本应帮助理解的预览；WaitWiki 预览比截图底部还靠后 | [控件生成顺序与末尾预览](/Users/aitoshuu/Documents/GitHub/WaitWiki/gallery/settings.js:9)、[预览在第 35 行创建](/Users/aitoshuu/Documents/GitHub/WaitWiki/gallery/settings.js:35)、[控件区同权重](/Users/aitoshuu/Documents/GitHub/WaitWiki/gallery/settings.css:13)；已查看 `art-settings` 与 `reading-settings` | 在现有页内按“外观/停留/内容”分组，调整视觉选项时让预览易于看到；保留原生控件和现有单页架构。验收：常规 1200×900 下调整背景/宽度能同时看到相关预览，窄屏不产生横向滚动或固定区遮挡 |
| L9 · P3 · 默认事实已证实，概念影响推断 | WaitWiki 新装默认九类全选、每轮随机；不同长度、主题和语言可连续出现。读一首中文诗之后突然进入英文问答或调酒步骤，可能破坏用户预期的安静节奏 | [默认类型全集与随机](/Users/aitoshuu/Documents/GitHub/WaitWiki/gallery/experience.js:25)、[等概率选类型](/Users/aitoshuu/Documents/GitHub/WaitWiki/gallery/companion.js:104)、[英文在线内容](/Users/aitoshuu/Documents/GitHub/WaitWiki/providers.js:153)、[语言设置明确只指百科](/Users/aitoshuu/Documents/GitHub/WaitWiki/gallery/settings.js:24) | **产品决策建议：**明确“随机知识”还是“安静阅读”优先；可提供保持九类能力的阅读偏好预设与长度预期，不擅自删类型、翻译内容或更改默认。验收：选择一个预设后，用户能预期语言、长度与主题跨度；切换时旧收藏/来源仍保留 |

## 应保留的优点

- **空间和内容有共同叙事。** Art 主画居中，桌椅和环境只是背景；WaitWiki 文字落在墙面安全区，bench/floor 不再充当正文区域。灰墙比上一轮“白画布”表达更符合用户要求。参见已查看的 `art-detail`、`reading-detail`、`reading-small`、`reading-zoom200`，以及 [墙面投影](/Users/aitoshuu/Documents/GitHub/WaitWiki/gallery/experience.js:112) 和 [无底板样式](/Users/aitoshuu/Documents/GitHub/WaitWiki/gallery/styles.css:35)。
- **昼夜与重开保持身份。** 原画不变色、主题不换内容，阅读位置能恢复，用户无需重新判断“这是刚才那幅/那段吗”。[原画样式](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/styles.css:29)、[只调环境](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/styles.css:19)、[进度存储](/Users/aitoshuu/Documents/GitHub/WaitWiki/gallery/companion.js:61)。
- **把控制留在需要时。** 工具随悬停/聚焦出现，不推动正文；收藏是单个轻动作；原生 checkbox、select 和清晰标签可直接理解。不要为了“原生感”重造复杂开关。[工具布局](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/styles.css:47)、[原生表单生成](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/settings.js:39)。
- **退出和失效处理尊重当前操作。** 新周期去重、输入法 Enter 过滤、异步 revision 防止旧请求重新显示；自动展示保留宿主输入焦点，隐藏页面会收起；有 reduced-motion。[发送守卫](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:63)、[异步取消](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:133)、[减少动效](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/styles.css:67)。
- **内容可信度没有完全让位于装饰。** 必要来源仍可见，离线备用有说明，背景开关移除图片 src 而非仅遮住画面；应继续保持这些与概念一致的诚实反馈。[来源保留](/Users/aitoshuu/Documents/GitHub/WaitWiki/gallery/companion.js:149)、[移除背景源](/Users/aitoshuu/Documents/GitHub/WaitWiki/gallery/experience.js:104)。

## 建议路线与验证边界

1. **先补关键路径证据。** 只用键盘完成自动进入、主动重开、收藏、Esc、返回输入框；测无指针静读和两端同页启用；记录冷/热/慢网进入时序。用户已批准的 2 秒默认、锁定语义和不读模型回复边界先保持。此步骤消除 L1/L4/L5/L7 的不确定性。
2. **优先修正有直接证据的信息缺口。** 给 Art 完整标签原位查看方式，给 WaitWiki 收藏列表摘录和可识别的选中状态；统一“看画/阅读”的各自措辞。保留 24/1 背景、两行标签、透明墙面与现有 options 架构。分别验收 L2/L3/L6。
3. **再整理配置层级。** 分组设置、让预览跟随视觉控件；验证短内容、长百科、调酒配方在浅深主题与窄屏下的阅读空间。不要新增一套设计系统或再加一层阅读底板。对应 L8。
4. **最后讨论产品节奏。** 根据实测决定默认停留、内容预设及双装关系。这些是用户需要确认的设计选择；报告中的建议本身不授权实现。L1/L9 不应仅靠延长动画或加提示文案就视为解决。

完整心流验收仍需真实运动画面或逐步现场观察。现有静态图不能证明 60fps、动画被打断后的连续性、网站真实回答完成后的注意力返回，也不能证明所有 24 个 Art 场景在所有画幅下都同样优良。相应能力应保留为待验证范围，不把旧功能测试的“通过”转换成沉浸感已经达成。
