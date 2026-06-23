# trpg-map-lite-eaflet

TRPG 魔法学院交互地图原型。后端提供地图上传、瓦片生成、双 token、标点、ZIP 导出；前端提供 Vue + Leaflet 地图编辑/查看界面。

## 安装

本仓不自动安装依赖。首次运行前手动执行：

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
