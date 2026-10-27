# ArtDuo 场景升级验证 · 2026-10-27

## 交付范围

ArtBreeze 1.1.0 默认开启展厅；WaitWiki 1.3.0 默认纯色阅读、可选展厅。两端保留独立仓库与现有网页等待触发，共用同版本 `gallery/` 副本，不依赖 InIsle、ArtDuo 服务端或新增 CDN。

24 个场景取自用户指定的 ArtDuo 原始场景目录。每张压缩到 1280 像素宽 WebP，合计 **886,902 字节**。挂画位置沿用 ArtDuo 的 mount 区域；`bg-015` 使用已避开前景座椅的修正区域。匹配读取原画的本地缩略配色，跨域采样失败时使用中性色；不会发送图片或聊天到匹配服务。

## 已执行的验证

| 验证 | ArtBreeze | WaitWiki |
| --- | --- | --- |
| 生产 JavaScript 语法检查 | 通过 | 通过 |
| Node 回归测试 | 9/9 | 8/8 |
| 实际浏览器夹具检查 | 37/37 | 35/35 |
| 24 张 WebP 解码、SHA-256、目录与打包一致性 | 通过 | 通过 |
| 手动固定全部 24 个场景 | 通过 | 通过 |
| 原画比例、水平居中、原画无夜间滤镜 | 通过 | 阅读模式不适用 |
| 纯色回退、关闭背景、背景错误回退 | 通过 | 通过 |
| 夜间切换保持内容与场景 | 通过 | 通过 |
| 旧设置升级保留：禁用、固定场景、旧暗夜偏好 | 通过 | 通过 |
| Enter 触发原有展示路径 | 通过 | 通过 |
| 按原有展示时长收起 | 20 秒通过 | 10 秒通过 |
| 设置选择、重开保留、可操作的原生控件 | 通过 | 通过 |
| 焦点在区域内时 Esc 收起 | 通过 | 通过 |
| 跟随系统夜间、减少动态效果 | 通过 | 通过 |
| 390 × 700 窗口布局 | 通过 | 通过 |
| ZIP CRC、必需资源和排除开发资料 | 通过 | 通过 |
| Impeccable 检测 | 无报告项 | 无报告项 |

浏览器运行真实的 `content.js`、共享渲染器、原有 Enter 监听与实际 popup HTML / JS。Chrome API 和远程内容由本地开发夹具提供；画作使用明确标注的横幅／竖幅／方幅 SVG 排版样本。24 张展厅均为生产随包素材。完整浏览器断言记录在 [browser-checks.txt](browser-checks.txt)，截图见 `screenshots/`。

首轮检查后修正了纯色界面的宽度约束、深色墙面的展签明暗、控件的明确可访问名称。确认轮通过。小窗口中展厅宽度为 358 像素，距左右窗口边界各 16 像素；正文使用不透明且可滚动的阅读面。

## 发布包

- ArtBreeze：`dist/artbreeze-1.1.0.zip`，**约 0.94 MB**，42 个文件。
- WaitWiki：`dist/waitwiki-1.3.0.zip`，**约 0.98 MB**，44 个文件。

发布脚本使用明确的运行文件清单；不包含 Git、测试夹具、截图、开发脚本、旧 `chrome_store/` 或约 229 MB 的研究资料。WaitWiki 保留实际运行所用的 `datafacts.csv` 与 `gathas.csv`。ZIP 时间戳固定，重复构建可复现。

## 上架边界与未覆盖项

本轮完成源码、资源、发布包和浏览器夹具验证，**没有安装到用户日常浏览器，也没有向 Chrome Web Store 提交**。未把夹具中的通过等同于所有在线 AI 站点或全部外部内容 API 的真实联调通过。站点 DOM、服务可用性与用户浏览器扩展状态仍需发布前抽检。

图片随包是可行的内容分发方式；所有逻辑保持本地。发布前应以构建 ZIP 做一次真正的已解压扩展安装检查，准备商店说明与截图，并确认 ArtDuo 图片及内容来源的分发权。代码许可不能替代素材许可。偏好使用 `storage.sync`，缓存使用 `storage.local`，隐私说明已据此修正。

参考的官方规则：

- [远程托管代码规则](https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code)：本模块的 JavaScript、配置和场景都随包。
- [Web Accessible Resources](https://developer.chrome.com/docs/extensions/reference/manifest/web-accessible-resources)：场景按 AI 站点范围声明，通过扩展资源 URL 加载。
- [权限政策](https://developer.chrome.com/docs/webstore/program-policies/permissions)：页面注入从所有 URL 缩减到支持的 AI 站点。
- [商店政策](https://developer.chrome.com/docs/webstore/program-policies/policies)：正式上架仍需要正确的内容权利、说明与隐私披露。

## 复查命令

在各仓库根目录执行 `npm run check` 与 `npm run build`。`npm run preview` 启动仅绑定本机的开发夹具；WaitWiki 可用 `npm run preview -- --port 8768` 避免端口冲突。点击“运行界面检查”可复现场景、主题、回退与收起断言。
