# ArtDuo 场景升级

确认范围：ArtBreeze 默认启用展厅；WaitWiki 默认保留纯色阅读面、场景可选；24 张背景随包分发。保留原有内容、来源、等待触发、时长与开关，不引入远程代码或新的网络服务。

## 模块与接口

- `gallery/scenes.json`：24 个稳定场景 ID、压缩图片、原始挂画区域、配色、光线、来源及哈希。
- `gallery/catalogue.js`：从目录生成的同步浏览器数据入口，避免等待网络或额外资源请求。
- `gallery/experience.js`：偏好归一化、确定性匹配、居中挂画布局及背景渲染；通过 `GalleryExperience.Stage` 对接已有 DOM。
- `gallery/settings.js`：两个产品共用的场景开关、固定／自动场景、昼夜与大小控件，写入原有 `chrome.storage.sync`。
- 原有 `content.js`：继续负责内容与等待触发，只接入场景层。背景照明与原画分层，切换昼夜不改原画颜色。
- ArtBreeze 的 `gallery/` 是共享源；WaitWiki 带相同版本副本。`scripts/sync-gallery.py` 在开发时同步，无运行时跨仓依赖。

## 验收

24 张图可离线解码，来源可追溯；同一内容与自动匹配稳定，手动选中的每个场景可达；原画水平居中、比例完整，小屏不溢出；场景关闭或图片失败后保留素色可用界面；昼夜和减少动态效果可用；旧设置不因升级重置；两端原有内容与等待触发能运行。

通过单元／资源检查和真实浏览器中的开发夹具验证后，更新 README、生成扩展 ZIP，再分别提交并推送原仓。此任务不提交 Chrome 商店发布，也不修改 ArtDuo 或 InIsle。
