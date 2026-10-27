# 已确认的扩展画廊同步设计

日期：2026-10-27。用户已批准按 EnIsle 对照方案实现。

艺息 ArtBreeze 1.2.0 保留原有 24 个背景，画作居中、右侧两行纯文字，自动场景每轮从适配候选选择并避免连续重复。

共享模块分别负责渲染（gallery/experience.js）、等待与收起（gallery/session.js）、有界本地内容状态（gallery/reading-state.js）、浏览器界面和事件适配（gallery/companion.js）。各产品独立生成目录，不在运行时读取 ArtDuo 或 EnIsle。

内容与场景仅由新周期或用户主动操作改变；悬停、焦点、昼夜、尺寸和普通重开均保持。锁定阻止自动换内容和换景，手动换一条解除锁定。重复发送通知合并，输入法选字 Enter 不触发。后台页面隐藏时收起，异步过期结果不会重新显示。

偏好使用 storage.sync；收藏、最近、场景与滚动位置使用 storage.local；标签恢复点使用 storage.session。两端不读取聊天文本或模型回复，不保存或外发聊天地址/对话 ID，仅在本地校验站点和必要路径。后台只接受预定义内容操作和有效作品 ID，校验发送方，省略网络凭证及 Referrer，限制响应大小，超时和来源失败有明确回退。

快速设置使用 popup，完整设置与收藏/最近使用本地 options 页面。WaitWiki 不显示场景选择器或画作占比。来源与版权信息位于来源链接及更多操作内，必要署名保留。

完整设计依据见相邻 EnIsle 仓库 docs/plans/2026-10-27-001-feat-extension-gallery-sync-plan.md。实际测试及剩余上架事项见本仓库的同步验证与 store-readiness 文档。
