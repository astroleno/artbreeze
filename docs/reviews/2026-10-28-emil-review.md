# ArtBreeze / WaitWiki：Emil 视角独立体验审阅

> 后续说明（2026-10-28）：本报告保留独立审阅初稿。用户已接受系列重叠；后续补测确认键盘存在 Shift+Tab 可行路径，汇总定级已调整。当前结论以 [严重度复核报告](2026-10-28-severity-recheck.md) 为准。

审阅日期：2026-10-28。审阅者：独立 Emil 子 agent。范围为 ArtBreeze 1.2.0（源码基线 `e9907f5`）与 WaitWiki 1.4.0（源码基线 `f80ddb1`）的前端 UI/UX、概念一致性及心流沉浸感。本轮仅形成建议，没有修改产品、配置或既有文档，也没有提交或推送。

## 判断

ArtBreeze 的展厅、原画及墙签已经形成清楚的视觉概念；WaitWiki 直接在混凝土墙面排文也遵守了已确认的方向。当前更值得优先解决的是“如何进入、停留和返回”：键盘手动打开后的焦点、双扩展共存、主动换内容时的整体消失，比再加装饰或动效更影响体验。

两款的共享交互基础很好，但产品的停留成本不同。看一幅画可以先感知整体，读一段知识必须逐字推进。共同采用两秒默认收起和每轮随机内容，不能自然推导出两者具有同样的心流体验。这里涉及已确认默认值，本文将其列为待产品决策，不把既有设计直接判为实现错误。

## 方法与边界

- 按 [emil 路由技能](/Users/aitoshuu/.codex/skills/emil/SKILL.md) 的 interface / product craft 路由，使用 [emil-design-eng](/Users/aitoshuu/.cc-switch/skills/emil-design-eng/SKILL.md)。只应用与本次界面审阅有关的部分，没有展开其他技能、外部研究或额外 agent。
- 独立阅读两端 README、gallery-design、companion、session、experience、reading-state、styles、settings、options、popup，以及必要的入口与 manifest。已直接比较：两端所审阅的共享 gallery 文件、options.js、popup.js 内容相同；产品目录与入口不同，因此共享代码的定位同时适用于两端。
- 亲自查看两端 `docs/chrome-validation-2026-10-27/` 中 art/reading 的 detail、light、dark、small、settings、zoom200，共 12 张图。这些是上一轮真实 Chrome 留存，**不是本轮重新安装或在线联调的证据**。
- 本报告区分「源码确定」「历史视觉观察」「体验推断」。没有从静态截图推断动画实际帧率、跨站误触发频率或真实用户满意度；也没有审查其他独立 reviewer 的材料。
- 保持已批准约束：ArtBreeze 保留 24 个场景；WaitWiki 只有 bg-027，允许关闭背景；开启时无白卡、正文在墙面安全范围内排版。建议不以破坏这些约束为前提。

## 三个维度的逐产品评价

| 产品 | 前端 UI/UX | 概念一致性 | 心流沉浸感 |
| --- | --- | --- | --- |
| ArtBreeze | 视觉基础稳固。画作、环境、墙签分工清楚，工具隐藏且不挤压内容；小屏墙签双重截断和手动打开后的焦点需要改进。 | “等一段回答，看一幅画”与单幅展陈一致。夜间保留原画色彩很合适；收藏页沿用“最近阅读、下次阅读”则更像 WaitWiki 的语言。 | 悬停、聚焦、重开保持当前画作是强项。双扩展叠放、换画先消失、重复入场位移，容易把微休息变成界面注意力任务。 |
| WaitWiki | 短诗在墙面上的位置、行距、来源都可读；历史小屏图也没有回到白卡方案。但当前证据主要是短诗，尚不足以证明长摘要、不同语言及全部内容类型同样舒适。 | 单一混凝土场景与可选纯色使空间保持稳定。九类内容全部默认随机，从百科到调酒和偈语的语义跨度很大，产品究竟提供“知识小憩”还是“随机内容流”仍需明确。 | 本地进度与重开续读支持连续感；两秒停留和整面隐藏的“换一条”会截断阅读。收藏列表只用通用标题，续读时还要再次辨认。 |

以上为基于源码与已见画面的编辑判断，不是用户实验评分。

## 排序问题表

P1 表示主要操作或跨产品使用受到明显妨碍，建议优先验证并解决；P2 表示连续体验或核心内容辨认受到影响；P3 为后续打磨。体验推断均单独标注，优先级不表示已发生线上故障。

| ID / 优先级 | 产品及触发 | 证据、置信与定位 | 用户后果 | 验收标准 |
| --- | --- | --- | --- | --- |
| E01 / P1 | 两端：键盘聚焦“艺 / 知”后按 Enter 手动打开；从面板 Esc 返回。 | **源码确定，高置信**：render 隐藏入口，open 没有把焦点移入新显示内容；只有容器内部监听 Esc。关闭后总是聚焦入口，没有记录进入前焦点。[companion.js:47](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:47)、[58](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:58)、[125](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:125)、[177](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:177)。**浏览器具体焦点落点待本轮补测**。 | 手动键盘进入与 pointer / focus 暂停收起机制没有接通。隐藏入口后，用户可能丢失操作位置、需要重新遍历宿主网页；这时面板还会依默认计时收起。 | 键盘手动打开后，document.activeElement 位于面板可操作区域，工具可达、正文可滚动；超过收起时长仍因 focus 保持。Esc 关闭后回到合理的原触发点。AI 发送引发的自动展示保持宿主输入焦点，不能为解决此项一律抢焦点。 |
| E02 / P1 | 同一 AI 网页同时安装并启用两款；手动打开或发送一次。 | **源码确定，高置信**：两端入口均 bottom/right 22px、42px、同一 z-index；面板均 top/right 16px、同一 z-index。两端默认启用，入口和发送检测分别独立注册。[styles.css:7](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/styles.css:7)、[57](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/styles.css:57)、[experience.js:17](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/experience.js:17)、[companion.js:62](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:62)；[Art 入口](/Users/aitoshuu/Documents/GitHub/artbreeze/content.js:2)、[Wiki 入口](/Users/aitoshuu/Documents/GitHub/WaitWiki/content.js:2)。**重叠几何可确定，双安装现场视觉与前后顺序待证**。 | “艺”和“知”有明确身份却争夺同一位置；后绘制入口遮住另一入口，一次发送可能出现两层互相遮挡的内容。用户难以知道哪款响应、如何切换，暂停交互也只作用于命中的上层。 | 双安装时两个入口均独立可见可点；一次触发的展示规则可预测、无需先关闭另一款。任何共存规则都需由产品确认，不能擅自为用户自动禁用其中一款。 |
| E03 / P2 | 两端：已展开时选“换一幅 / 换一条”，尤其公共来源较慢时。 | **源码确定，高置信**：next 先 close(false)，清除 pointer / focus 状态并隐藏整面板，再等待 prepareCycle，最后 open。[companion.js:158](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:158)、[182](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:182)、[session.js:30](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/session.js:30)。**消失持续时间及鼠标重新进入事件的具体表现待实测**。 | 用户主动换内容时，刚建立的展厅空间整体消失，入口重新出现；等待中没有稳定的容器和明确反馈。完成后再次入场，且上一段交互保持状态被重置。 | 0.2 / 1 / 8 秒模拟延迟下，场景边界和外层位置持续存在，旧内容或轻量加载状态可见；重复换内容只有最后结果生效；关闭后迟到结果不能重新打开；焦点保持在有效、可见的操作位置。 |
| E04 / P2，待产品决策 | 两端新装，尤其 Wiki 正文超过一句、用户尚未把鼠标移上去时。 | **源码确定，高置信**：默认 2 秒；计时在 onShow 完成后开始，悬停 / focus 可暂停，锁定不阻止自动收起。[experience.js:23](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/experience.js:23)、[session.js:12](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/session.js:12)、[22](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/session.js:22)。两端 README 均已明确此默认。 | 两秒能让人注意到面板，不一定足够读完一段知识。用户必须先学会“移上去才留住”，注意力从内容转向避免消失。锁定图标也不等同于“保持展开”，需要避免心智混淆。**阅读是否被实际打断仍需用户验证**。 | 不擅自修改已确认默认。先让首用者不经说明完成“看到 → 停留 → 返回”，分别测短句与 150–300 字摘要；比较现行 2 秒、可理解的显式停留动作、按产品分别设时长的候选。最终规则与“锁定当前内容 / 保持展开”语义一致且用户可预测。 |
| E05 / P2 | Wiki：回到收藏 / 最近，寻找一条此前的偈语、数字趣闻或猫咪趣闻。 | **历史视觉确定＋源码确定，高置信**：[reading-settings.png](/Users/aitoshuu/Documents/GitHub/WaitWiki/docs/chrome-validation-2026-10-27/reading-settings.png) 中多条“偈语”；列表只显示 item.title 和 artist / source，没有正文摘要。[options.js:13](/Users/aitoshuu/Documents/GitHub/WaitWiki/options.js:13)、[15](/Users/aitoshuu/Documents/GitHub/WaitWiki/options.js:15)；通用标题见 [providers.js:157](/Users/aitoshuu/Documents/GitHub/WaitWiki/providers.js:157)、[159](/Users/aitoshuu/Documents/GitHub/WaitWiki/providers.js:159)。 | 技术上保存了不同条目，视觉上却可能同标题、同来源；用户要先选中再回 AI 页打开，才能确认是不是想读的那一条。续读路径变成猜选。 | 同一类型、同一来源保存至少 3 条时，每条可凭正文开头等最少信息区分；在收藏页直接完成辨认，无需多次切回 AI 页。来源与版权信息保留。 |
| E06 / P2 | Art：长作品名；360px 面板；想识别作者或去找原画。 | **历史视觉确定＋源码确定，高置信**：[art-detail.png](/Users/aitoshuu/Documents/GitHub/artbreeze/docs/chrome-validation-2026-10-27/art-detail.png) 中 Landscape at …，[art-small.png](/Users/aitoshuu/Documents/GitHub/artbreeze/docs/chrome-validation-2026-10-27/art-small.png) 中作者也被截断。墙签最大宽 100px，每行 nowrap + ellipsis，标题没有视觉展开机制。[experience.js:66](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/experience.js:66)、[styles.css:30](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/styles.css:30)、[companion.js:28](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:28)。 | 精简墙签保持了展厅气氛，却删去了识别作品所需的信息。点击标题直接去外站，用户不能只在当前空间确认完整标题。 | 保持默认“右侧两行纯文字”，不加长期底板；长画名 / 长作者至少有一个明确、可键盘触达的轻量方式读取完整文本，不必先离开 AI 页。测试中英长标题及长作者，360 / 600 / 800px 均可完成。 |
| E07 / P2 | 两端：发送 AI 消息、键盘手动重开或短时间反复进出。 | **源码确定，高置信**：surface 每次从 hidden 恢复都会使用 180ms ease-out 的向下 5px keyframe，未区分键盘 / 自动 / pointer 来源；关闭直接 hidden。[styles.css:11](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/styles.css:11)、[59](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/styles.css:59)、[companion.js:125](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:125)、[158](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:158)。reduced-motion 已正确覆盖。**没有实测动画流畅度，本项针对频次和控制来源**。 | 入场位移可以说明出现，但“等一段回答”是一天会重复多次的动作。相同的小位移反复抢眼，快速开关还会重新开始 keyframe，缺少可中断的连续状态。 | 明确每种触发是否需要动效；键盘手动动作直接响应，自动展示优先避免位置运动；如保留 pointer 手动淡入，使用可中断的短 transition，并验证连续开关不闪回初始位。reduced-motion 保持无位移动作。 |
| E08 / P3，待产品决策 | Wiki：采用默认全部 9 类随机内容；从同一 AI 工作流连续发送多轮。 | **源码确定，高置信**：所有类型默认选中，requestContent 从启用类型均匀随机。[experience.js:9](/Users/aitoshuu/Documents/GitHub/WaitWiki/gallery/experience.js:9)、[28](/Users/aitoshuu/Documents/GitHub/WaitWiki/gallery/experience.js:28)、[companion.js:104](/Users/aitoshuu/Documents/GitHub/WaitWiki/gallery/companion.js:104)。**是否造成注意力碎片化属于体验假设，中等置信**。 | 单一场景提供了空间连续性，内容语义仍可能在百科、调酒、诗句、问答之间跳转。对部分用户是惊喜，对另一些用户会形成难以预期的内容频道。 | 保留所有 9 类和当前能力；先确认主概念，再比较“全部随机”与用户少量自选类型的体验。观察用户是否理解每轮变化、是否需要为避开不喜欢的类型立即换条；不凭个人审美删类型。 |
| E09 / P3 | 两端：首次调整宽度、收起与背景；需要对照设置理解实际效果。 | **历史视觉确定＋源码确定，高置信**：full 设置为连续约 12–14 行，preview 在所有控件后构建；Art 图中预览在 900px 截图底部才开始，Wiki 的预览还在更下方。[settings.js:12](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/settings.js:12)、[35](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/settings.js:35)、[settings.css:34](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/settings.css:34)；[art-settings.png](/Users/aitoshuu/Documents/GitHub/artbreeze/docs/chrome-validation-2026-10-27/art-settings.png)、[reading-settings.png](/Users/aitoshuu/Documents/GitHub/WaitWiki/docs/chrome-validation-2026-10-27/reading-settings.png)。 | 用户调参数时看不到预览，只能在上下滚动中记住变化；空间设置、触发行为、内容类型混排，隐藏了“先选内容，再调停留”的因果关系。Art 列表仍显示“最近阅读 / 下次阅读”，概念词也没有完全按看画校准。 | 在 1280×800 与窄窗下，用户调整核心外观能同时或就近看到预览；设置按可理解任务分组，不增添无必要选项；Art 的看画语义与 Wiki 的阅读语义各自连贯。 |

## Before / After / Why

这是改进提案，不代表已经修改。E02、E04、E08 的行为选择仍需产品确认；E06 保持已批准的两行墙签，Wiki 所有建议都保持单背景、无白卡。

| Before | After | Why |
| --- | --- | --- |
| E01：手动键盘打开后隐藏触发按钮；未将焦点带入可见内容，Esc 固定返回入口。 | 区分自动展示与手动键盘展示；只在后者建立明确的焦点进入、保持与返回路径。 | 看得见的界面必须接得住发起操作的人；自动展示同时应保留 AI 主任务的焦点。 |
| E02：两款入口和面板完全同位，各自响应同一发送。 | 先确认共存规则，再让入口身份与当前展示状态都清楚可见。 | 两个独立产品需要可预测的并存方式，不能依赖 DOM 插入先后来决定谁可用。 |
| E03：点击换内容先隐藏整个容器，等待后重新打开。 | 保持外层空间、来源状态与有效焦点；在内部替换内容，提供轻量载入反馈。 | “换一幅 / 换一条”是同一空间里的继续，外层消失让用户误以为退出。 |
| E04：新装两款均 2 秒；停留依赖提前发现悬停或聚焦机制。 | 保留现状作为基线，验证可理解的停留方式；是否按产品区分时长另做决策。 | 画作的整体感知和文本的逐行阅读成本不同，默认值应服务实际停留。 |
| E05：多个最近条目只显示同样的类别标题与来源。 | 在条目内呈现一小段可区分的正文，不增加跨页辨认步骤。 | 收藏的价值是回到具体内容；保存成功不等于找得到。 |
| E06：两行墙签均可被省略号截断，完整信息只能转去来源页。 | 保留安静两行，在明确的一次交互内展示完整画名和作者。 | 原画的身份也是观看的一部分，轻量细节应在需要时可得。 |
| E07：所有打开来源共用同一个位移 keyframe。 | 先移除高频键盘路径的位移；需要过渡的路径使用可中断、短促的状态变化。 | 高频操作应让用户感觉直接响应，动效只承担必要的解释。 |
| E08：九种语义跨度较大的内容默认均匀随机。 | 先明确“知识小憩”的预期，再验证全部随机或少量自选的默认。 | 固定场景只能保持空间连续性，主题连续性需要另外判断。 |
| E09：长控件列表之后才出现预览；两端共用“阅读”操作词。 | 让关键调整与预览靠近；按空间 / 停留 / 内容分组，校准看画与阅读文案。 | 用户应能直接感知设置后果，而不是反复滚动、记忆和翻译产品概念。 |

## 值得保留的设计

1. **场景和内容稳定，交互不会洗牌。** 悬停、焦点、主题、尺寸和普通重开都保持当下内容；新周期与主动换内容的责任边界清楚。见 [设计说明](/Users/aitoshuu/Documents/GitHub/artbreeze/docs/gallery-design.md:9)、[prepareCycle](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:107)。不建议把 hover 改成自动换画或轮播。
2. **工具渐隐且不占版面。** toolbar 绝对定位、150ms opacity，不推动画作或正文；触摸无 hover 时常显，键盘 focus-within 也能出现。见 [styles.css:47](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/styles.css:47)、[66](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/styles.css:66)。这里的修复重点是焦点可达，不是让所有工具长期抢占视觉。
3. **白天与暗夜表达克制。** 历史 dark 图中环境压暗、原画保持色彩；Wiki 在同一墙面用浅字，未重新引入白卡。见 [styles.css:19](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/styles.css:19)、[art-dark](/Users/aitoshuu/Documents/GitHub/artbreeze/docs/chrome-validation-2026-10-27/art-dark.png)、[reading-dark](/Users/aitoshuu/Documents/GitHub/WaitWiki/docs/chrome-validation-2026-10-27/reading-dark.png)。
4. **Wiki 的背景是阅读空间，不是正文卡片外的装饰。** 墙面 mount 与背景 cover 后的坐标一起投影，文字避开地面与座椅；小屏与 200% 历史图保持同一概念。见 [experience.js:112](/Users/aitoshuu/Documents/GitHub/WaitWiki/gallery/experience.js:112)、[styles.css:35](/Users/aitoshuu/Documents/GitHub/WaitWiki/gallery/styles.css:35)。改进可读性时应先处理文字范围、密度和停留，不退回白色底板。
5. **有界本地进度和收藏支持“暂时离开”。** recent 50、favorites 100、按条目保存进度，重开读取位置；手动收起、隐藏标签页及过期异步结果有统一生命周期。见 [reading-state.js:14](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/reading-state.js:14)、[companion.js:155](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/companion.js:155)、[session.js:17](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/session.js:17)。这比添加更多动态效果更能建立连续体验。
6. **明确尊重减少动效偏好。** 两端 production CSS 与设置 CSS 均提供覆盖。见 [styles.css:67](/Users/aitoshuu/Documents/GitHub/artbreeze/gallery/styles.css:67)。优化时不要丢失这个基线。

## 产品决策建议

首先处理可用性和连续性：E01 焦点路径与 E02 双安装共存需先实测，E03 换内容应保持稳定容器；这三项优先于换字体、加动画和增加场景。E05、E06 解决具体内容的可识别性，仍保持安静的默认外观。

随后决定“微休息”的边界：Art 是观看一幅作品，Wiki 是阅读一段内容；两者可共享生命周期与组件，却不必共享每一个默认停留策略或操作文案。E04 的两秒默认已确认，本报告只提供重新评估依据；E08 也不授权删减九类内容。

沉浸感不等于持续占住用户。推荐以“可轻松进入、当前内容稳定、可自愿停留、知道如何返回 AI”为验收框架，避免用更长自动展示、更多装饰或连续随机推送去代替用户控制。

## 后续验证方案

| 场景 | 方法与观测 | 通过依据 |
| --- | --- | --- |
| 键盘与 AI 主任务 | 真实安装，Tab 到入口 → Enter → 操作正文 / 工具 → Esc；再从 AI 输入框发消息。记录 activeElement、面板 visible、interacting 和返回焦点。 | 手动进入可达、停留可控，Esc 可返回；自动展示不抢 AI 输入。 |
| 双扩展共存 | 两端同时启用并重新载入同一真实 AI 站点，分别点两个入口，再执行一次发送。留图并记录可命中的目标。 | 两个产品身份清楚、入口均可达，展示顺序不依赖安装或 DOM 时序；没有两层内容互相遮挡。 |
| 换内容与取消 | 对受控公开内容响应施加 0.2 / 1 / 8 秒延迟；鼠标停在面板与纯键盘分别操作“换一条”；中途关闭与重复换条。 | 不整体消失、不丢有效焦点；只显示最后合法结果，主动关闭后不再冒出。 |
| 阅读节奏 | 短句、150–300 字摘要、长来源、中文与英文；开启 bg-027 / 关闭背景分别观察。让用户自行发现停留方式。 | 正文能自然读完；背景状态不改变停留语义；无需追着面板移动鼠标才能保住内容。 |
| 内容身份 | Wiki 同类同源收藏至少 3 条；Art 中文 / 英文长标题及长作者；面板 360 / 600 / 800px。 | 直接识别想看的具体条目；保持两行墙签默认和 Wiki 无白卡。 |
| 高频与动效 | 键盘 / pointer / 自动三种来源各反复 10 次，含快速开关、reduced-motion。视频慢放仅用于检查过渡接续，不替代真实速度观察。 | 不回跳初始帧，不产生跟手延迟或反复位移干扰；减少动效模式无位置运动。 |
| 前台与离开 | 收起后重开、切换标签页、切换昼夜、resize、200% 放大、恢复正文中部。 | 当前内容与适用场景不变，滚动位置不丢；返回宿主任务的路径明确。 |

未完成的验证：本独立报告尚未执行本轮真实 Chrome 安装、登录 AI 发消息、双扩展同时启用及动画录屏；长篇正文在全部知识类型、语言、无背景组合下也未获得足够视觉样本。上述项目应据实补证，不能以历史截图或源码推断替代现场通过记录。
