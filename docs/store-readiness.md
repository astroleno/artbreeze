# 艺息 ArtBreeze 1.2.0 · Chrome Web Store 提交材料

最新复核：2026-10-28 18:12（Asia/Shanghai）。**1.2.0 已手动公开发布；新版本 1.2.2 已成功送审，后台显示“待审核”。** 新版继续采用审核通过后手动发布。详情见 [新版送审记录](store-submission-2026-10-28-ui-follow-up.md) 和 [本轮修复与验证](2026-10-28-review-follow-up-release.md)。

下文保留原 1.2.0 的提交材料与当时核对记录；新包需按最终代码另行核对并提交。

## 单一目的与说明

产品名称：艺息 ArtBreeze。

简短说明：在 AI 网页等待时欣赏名画与展厅背景，收藏喜欢的作品，随时继续上次观看。

单一目的：为用户在 AI 网页中的等待时间提供可继续观看的画作展示。

详细说明可使用：

> 艺息 ArtBreeze 在适配的 AI 网页识别用户的发送操作，展开画作展示窗口，也可通过页面入口随时打开。保留 24 个本地展厅背景，支持每轮适配换景或固定场景，完整显示画作并提供作者与来源。支持收藏、最近内容、重开保留、锁定、昼夜和可调收起时间。悬停或聚焦时保持阅读，离开后按所设时间收起。扩展不读取聊天正文或模型回复，不保存聊天地址，不代替用户发送消息。背景离线，在线内容仍依赖公开来源的可用性；来源失效时展示明确标注的备用内容。站点适配会受登录条件及页面更新影响。

两款继续作为已有独立产品更新；共享渲染代码不改变画作欣赏与知识阅读的产品差别。不增加换皮条目或无关功能。[单一目的](https://developer.chrome.com/docs/webstore/program-policies/quality-guidelines)、[重复体验政策](https://developer.chrome.com/docs/webstore/program-policies/spam-and-abuse)。

## 权限与数据流

| 范围 | 提交时的说明 |
| --- | --- |
| storage | 保存用户选择的外观与行为偏好；在本机保存收藏、最近内容、阅读位置与有限缓存。偏好可由 Chrome storage.sync 同步 |
| AI 页面 content_scripts.matches | 仅在清单中的具体 AI 域名及 Grok 路径识别发送控件/Enter，注入本地展示组件；不读取输入文字或模型回复 |
| 内容 host_permissions | gstatic 作品列表，两个 Google 图片域名及 Wikimedia 备用图片域名，供后台获取公开图片；不接受任意网址请求 |
| web_accessible_resources | 仅将随包的展厅 WebP 向相应 AI 页面来源开放，用于背景；不公开本地阅读数据 |

只保留 storage API 权限；移除 activeTab、宽泛站点和未使用来源。没有 tabs、history、剪贴板、全站或 contextMenus 权限。代码仍可使用无需 tabs 权限的标签关闭事件清理临时快照。[最小权限要求](https://developer.chrome.com/docs/webstore/program-policies/permissions)。

所有执行逻辑、样式和背景在 ZIP 内，CSP 限制本地脚本。远程只返回文字/JSON/图片；不执行远程 JavaScript/WASM。后台验证发送方、操作与作品 ID，省略凭证和网页 Referrer，拒绝重定向，限制响应大小并设置超时。[MV3 要求](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements)。

隐私政策已覆盖本地发送操作识别、Chrome 偏好同步、本机收藏/最近/滚动恢复、有限缓存、第三方普通网络信息及清除方式。用途仅限产品功能，不出售、广告追踪或人工读取本地记录。发布者仍需在后台按实际字段披露本地操作检测及阅读管理；不能因“不上传到开发者服务器”就直接声明完全不处理用户数据。后台、商店说明与公开隐私页应一致。[本地处理说明](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)、[隐私字段说明](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)。

本地隐私页：[privacy.html](../privacy.html) / [privacy.md](../privacy.md)。公开 URL：[GitHub 隐私说明](https://github.com/astroleno/artbreeze/blob/main/privacy.md)。隐私页已随源码推送，公开页面已核对为 1.2.0，并用于后台隐私链接。

## 来源与署名

展厅来自用户指定的 ArtDuo 集合，分发原图路径和 SHA-256 保存在 gallery/scenes.json；分发既有 24 个背景。这些是生成的想象展厅，不是真实博物馆摄影。

画作保留 Google Arts & Culture/馆藏来源、画名、作者与原页面入口；版权说明位于更多操作中。

用户确认沿用既有素材并注明引用；本次不再索取额外记录。引用与既往上架不作为已取得全部第三方分发权的证明，代码 MIT 声明不覆盖第三方素材。正式提交仍需与来源使用条件一致。[知识产权政策](https://developer.chrome.com/docs/webstore/program-policies/impersonation-and-intellectual-property)。

## 审核复现与截图

1. 解压 dist/artbreeze-1.2.0.zip，在独立 Chrome 配置中加载扩展；最低声明 Chrome 102，本轮实际验证 Chrome 156。
2. 工具栏图标打开快速设置，进入完整设置查看尺寸、时长及本地收藏/最近；有自动/24 个固定背景及画作占比。
3. 在可访问的适配 AI 网页点页面入口即可展开，检查昼夜、收起后重开、收藏和最近选择。若需要验证真实发送，请在你自己的可用账号里提交正常请求；本次未发送 AI 消息。
4. 设置 1 秒收起：鼠标/键盘焦点位于内容中应保持，离开后收起；Esc 手动收起。重开应保留内容。
5. 完整设置的清除按钮需要两次明确点击，删除本扩展本地内容和缓存，保留同步偏好。

1280×800 的真实 Kimi 页面截图：[画廊展示](chrome-validation-2026-10-27/art-store-1280x800.png)。不要使用旧 tests/fixtures SVG 排版样本作为商店效果图；提交说明不可声称百科全文、全部内容离线或所有站点已完整实测。[商店资料要求](https://developer.chrome.com/docs/webstore/program-policies/listing-requirements)。

## 送审核对

- 2026-10-28 已登录后台核对原有条目 dknoefdahnmdaodahdlbfdfabhgaeoog，已发布版本为 1.0.9。本次上传 1.2.0，保留原条目与扩展 ID。
- 公开隐私页、后台单一用途、storage 和主机权限理由、远程代码声明、数据使用、说明、截图与测试说明已更新并保存；送审后后台显示“该草稿尚待审核”。
- 登录/验证受限的完整发送流程仍未覆盖；X 两个路径在本机受 403/登录跳转影响，不声明全面支持。公开页面及入口检查见 site-checks.json。
- 素材按用户要求引用保留；本次没有独立权利证明，不能写“所有素材均已获授权”。

本地结果、安装包及证据见 [同步验证](2026-10-27-extension-sync-verification.md)。用户已授权提交、推送与商店更新；送审选择审核通过后手动发布。
