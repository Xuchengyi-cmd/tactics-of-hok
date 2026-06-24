# 王者荣耀战术板 (Honor of Kings Tactics Board)

基于 HTML5 Canvas 的 MOBA 战术可视化系统。在浏览器中打开即用，无需安装。

**在线地址**: https://zippy-sunshine-7a919a.netlify.app/

## 功能

### 英雄管理
- 130位英雄按分路筛选（打野/中路/边路/发育路/辅助）
- 拖拽部署到地图任意位置，编辑等级和经济
- 大招强化状态标识（铠/姬小满/苍等）
- 盾山/瑶/少司缘托举队友联动
- 空空儿/元歌/阿古朵分身
- 元歌秘术变伪装敌方英雄
- 海月幻境对决

### 地图交互
- 高精度峡谷地图底图
- 30+游戏元素精确标注（塔/野怪/龙坑/草丛/血包/传送阵/视野之灵）
- 点击击杀野怪和龙（自动倒计时）
- 右键摧毁/修复防御塔
- 草丛视野博弈模拟（占领+隐身+互视）

### 战术标注
- 四种技能范围形状（圆形/直线/扇形/矩形）
- 技能范围跟随英雄移动
- 自由路径/箭头绘制
- 英雄间压制连线（Shift+点击）

### 兵线系统
- 6种兵种拖拽部署（小兵/炮车/超级兵/主宰先锋/大主宰先锋/风暴龙王兵）
- 一键三路快速布一波
- 大主宰先锋清除敌方该路兵线

### 时间系统
- 覆盖00:00-20:00完整游戏时间线
- 实时计时和手动调节双模式
- 0.5x-4x倍速播放
- 10个关键时间事件自动触发

### 数据管理
- 战术方案JSON保存/加载
- 撤销/恢复（Ctrl+Z / Ctrl+Y）
- 交互式坐标校准工具

### AI分析
- 支持 DeepSeek / Claude / GPT
- 自动分析阵容优劣、战术意图、应对建议

## 技术栈

纯前端架构，双击 index.html 即可运行：

| 层级 | 技术 |
|------|------|
| 渲染 | HTML5 Canvas 2D API，五层分离+离屏缓存 |
| 样式 | CSS3 自定义属性，暗色电竞主题 |
| 逻辑 | ES6+ JavaScript，13个独立模块 |
| 存储 | localStorage + JSON文件导入/导出 |

## 快速开始

```bash
# 方式1：直接打开
双击 index.html

# 方式2：本地服务器
python -m http.server 8080
# 浏览器打开 http://localhost:8080

# 方式3：部署到 Netlify
# 将项目文件夹拖到 https://app.netlify.com/drop
```

## 项目结构

```
tactics-of-hok/
├── index.html          # 入口HTML
├── css/
│   └── style.css       # 样式表
├── js/
│   ├── gameData.js     # 静态数据（英雄/地图/时间事件）
│   ├── map.js          # Canvas渲染引擎
│   ├── main.js         # 入口 + GameState + UndoManager
│   ├── markers.js      # 英雄标记管理（含特殊机制）
│   ├── heroPanel.js    # 英雄选择面板
│   ├── infoPanel.js    # 信息面板
│   ├── timeline.js     # 时间系统
│   ├── skills.js       # 技能范围绘制
│   ├── paths.js        # 路径绘制
│   ├── minion.js       # 兵线部署
│   ├── storage.js      # 数据持久化
│   ├── calibrate.js    # 坐标校准
│   └── ai.js           # AI战术分析
└── assets/
    └── map.jpg         # 峡谷地图（2500x1406）
```

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| Space | 播放/暂停 |
| Ctrl+Z | 撤销 |
| Ctrl+Y | 恢复 |
| Shift+点击英雄 | 建立压制连线 |
| P | 路径绘制模式 |
| Ctrl+S | 保存战术 |

## License

MIT License
