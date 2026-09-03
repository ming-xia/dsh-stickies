# dsh-stickies

一个面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的本地优先 Markdown 便利贴插件。

Stickies 将轻量笔记放在当前对话旁边，方便记录需求、问题、清单和工作上下文，不需要离开 Harness 页面。

## 功能

- 对话页面内嵌便利贴目录，始终与当前对话并列显示。
- 支持将便利贴拖出为可调整大小的悬浮卡片。
- 支持 Markdown 编辑和预览，包括标题、列表、清单、链接、图片、代码块、引用、表格和强调样式。
- Markdown 清单支持直接勾选，并将状态写回原始内容。
- 支持便利贴颜色、排序、尺寸调整、修订历史和版本回滚。
- 通过 Harness Web Server 在本地保存数据，不需要云端账号，也不依赖外部数据服务。

## 安装

在已安装 DSH CLI 的 DeepSeek Harness 环境中执行：

```bash
dsh plugin --profile web add https://github.com/ming-xia/dsh-stickies
```

按提示重启 Web profile，然后打开 Harness Web 页面。对话标题栏中会出现 `🗒️ 便利贴` 按钮。

## 本地开发

本项目采用标准 DSH 插件包结构。`package.json` 中声明了 `dsh.bundle`，`cordis.patch.yml` 负责注册运行时插件。

启动本地界面预览：

```bash
node scripts/serve-local.mjs --port 3401
```

然后访问 `http://localhost:3401/stickies/ui`。

本地预览默认将便利贴保存在插件目录同级项目的 `work/notebooks` 中，也可以通过 `--notes <path>` 指定其他本地数据目录。

## 隐私说明

便利贴保存在插件配置的 `notesRoot` 目录中。仓库只包含源代码，不包含个人便利贴内容。

## 许可证

本项目采用 MIT 许可证，详见 [LICENSE](LICENSE)。
