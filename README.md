POE2 技能数据提取与合并工具

## 使用步骤

### 第1步：提取三个语言版本的数据

分别打开以下三个页面，在浏览器控制台运行 `extract_skills.js` 中的代码：

| 语言 | URL | 保存文件 |
|------|-----|----------|
| 英文 | https://poe2db.tw/us/Gem | skills_en.json |
| 简体 | https://poe2db.tw/cn/Gem | skills_sc.json |
| 繁体 | https://poe2db.tw/tw/Gem | skills_tc.json |

每个页面操作：
1. F12 打开开发者工具
2. 切换到 Console 标签
3. 粘贴 extract_skills.js 的代码，回车
4. 浏览器会自动下载对应的 JSON 文件

### 第2步：把三个文件放到 data/ 目录

把下载的三个文件重命名后放入 `d:\poe2trans\data\`：
- skills_en.json
- skills_sc.json
- skills_tc.json

### 第3步：运行合并

```bash
cd d:\poe2trans
go run tools/merge_skills.go
```

合并后的文件会保存为 `data/skills.json`，自动覆盖旧数据。

### 第4步：重启 Web 服务

按 Ctrl+C 停止服务，然后重新运行：
```bash
go run main.go
```

## 注意事项

- 如果控制台脚本报错，把错误信息发给我
- 三个页面需要分别访问、分别运行脚本
- 如果数据量太大导致页面卡顿，可以在脚本里加过滤条件