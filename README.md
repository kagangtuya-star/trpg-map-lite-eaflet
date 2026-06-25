# trpg-map-lite-leaflet TRPG 瓦片交互地图

<img width="1723" height="913" alt="image" src="https://github.com/user-attachments/assets/3a3d0d7b-0061-4088-ace5-aa2303c43439" />
<img width="1695" height="928" alt="image" src="https://github.com/user-attachments/assets/23f8f49f-3a25-4947-a6ee-2f4310334e9c" />

TRPG Tile Map Creator 是一个面向 TRPG 跑团场景的轻量级瓦片地图创建器。它可以将一张大尺寸地图切分为多个地图瓦片，并生成可缩放、可拖动、可分享的交互式地图页面，适合用于世界地图、城市地图、学院地图、地下城地图等大型场景的展示与管理。

## 功能特性

- 支持上传大尺寸地图并自动生成瓦片切片
- 支持类似在线地图的缩放、拖动与分块加载
- 支持生成玩家访问用的分享页面
- 支持地图编辑模式
- 支持添加、编辑、删除地图标记
- 支持自定义鼠标光标与地图标记图标
- 支持设置标记标题、描述、图标、颜色、大小
- 支持为标记添加跳转 URL
- 支持控制地名与简介是否常驻显示
- 支持快速定位并二次编辑已有标记
- 支持导出 / 导入 ZIP 文件
- 导出结果可部署到任意静态网站，也可本地打开查看

## 使用场景

这个工具主要用于跑团中的地图管理和场景展示。GM / KP 可以将大型地图转换为可浏览的交互式地图，并在地图上标注重要地点、建筑、NPC 区域、线索点或事件触发点。玩家可以通过分享链接访问地图，像使用在线地图一样缩放、拖动并查看地点信息。

典型使用场景包括：

- 城市或学院地图展示
- 大型世界地图浏览
- COC 调查地点索引
- 战役地图与地区管理
- 玩家可访问的交互式地图页面
- 静态网站部署或跑团工具嵌入

## 安装

首次运行前手动执行：

```bash
npm install
```

## 开发

```bash
npm run dev
```

- 后端默认 `http://localhost:3000`
- 前端默认 `http://localhost:5173`

## 验证

```bash
npm run test
npm run build
```

## 使用

1. 调用 `POST /api/campaigns` 上传地图文件字段 `map`，可附带 `name`、`default_cursor_url`、`pointer_cursor_url`、`max_zoom`。
2. 使用返回的 `edit_token` 访问 `/:edit_token` 进入编辑模式。
3. 使用返回的 `view_token` 访问 `/:view_token` 进入查看模式。
4. 编辑模式右键地图创建地点，侧栏保存标点和 cursor 配置。
5. 编辑模式点击 `Export ZIP` 导出离线包。
