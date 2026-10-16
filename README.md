# 初星育成 3D · SillyTavern 前端

这是可由 GitHub 接入 Vercel 的独立部署仓库。主前端与 3D 播放器保持同级：

```text
hatsu-produce-local/    育成 UI、NIA、Beat 业务及酒馆桥接
mmd-dialogue-stage/     Three.js、Beat 播放器、口型、物理及资源索引
tools/                 同步、静态构建与本地预览
tests/                 部署与远程嵌入路径检查
vercel.json            静态发布与云资源路由
```

## Vercel 导入

导入 `a1415102876-alt/Hatsuboshi3D_ST`，使用仓库根目录作为 Root Directory。

- Framework Preset：Other。
- Build Command：`npm run build`。
- Output Directory：`dist`。
- 不要把 Root Directory 改成任意一个前端子目录。

这些设置已经写入 `vercel.json`。根网址自动进入 `/hatsu-produce-local/st.html`；`/st.html` 也提供同一个酒馆入口，独立页面为 `/hatsu-produce-local/index.html`，Stage 为 `/mmd-dialogue-stage/`。

构建使用 Vercel 的 `VERCEL_URL` 写入本次部署的资源基址，供酒馆远程嵌入使用。如需固定自定义域名，可设置公开环境变量 `HATSU_PUBLIC_ORIGIN=https://你的域名`。这个变量只包含网址。

## 酒馆中加载

优先使用现有的酒馆加载方式，地址换成本次 Vercel 部署的 `/st.html`。新站构建后的入口内已填写绝对资源基址，3D 模块和 Three.js 都从同一部署加载。

静态站本身不运行 SillyTavern 后端。角色卡、世界书和已有聊天存档仍由用户自己的酒馆管理；独立模式沿用原前端的 API 配置流程。

## 云资源与 TTS

- 3D 模型、贴图、动作、场景与 NPC 差分：沿用 `library.json` 指定的 gakuen R2 桶及浏览器按需缓存。
- 常规前端图集与媒体：沿用另一个既有 R2 桶。Vercel 路由为独立页面提供同源读取入口；云端缺少的本地图片随站保留。
- Loading 图案与 Q 版小人随站部署，可以在大资源下载前显示。
- Fish TTS 沿用已有 Cloudflare Worker 地址，用户仍可在设置中修改代理。此仓库不会把 Worker 自动部署到 Vercel，也不包含 API 密钥。

## 本地验证

需要 Node.js 20 或更新版本，无运行依赖安装要求。

```sh
npm run build
npm test
npm run preview
```

预览地址为 `http://127.0.0.1:8767/`，可通过 `PORT` 环境变量修改。本地预览实现与 `vercel.json` 一致的静态优先和 R2 回源规则；云资源仍需要联网。

## 从原工程更新

在本仓库运行：

```sh
node tools/import-source.mjs "G:/SillyTavern/SillyTavern/public"
npm run build
npm test
```

同步工具只读取原工程，复制运行代码和本地界面资源，并检查常规图集在 R2 的可用性。模型大文件、解包目录、工程、凭据、日志、测试备份与源目录的 `.git` 不会被复制。`docs/source-snapshot.json` 记录本次同步文件数及媒体缺项。

不要手工提交生成的 `dist/`、`.vercel/` 或 `.env`。此仓库保留源代码中的第三方许可声明；原游戏素材的权利归各自权利人。
