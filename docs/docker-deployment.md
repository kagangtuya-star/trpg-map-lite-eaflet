# Docker 部署

本项目可用单个 Node 镜像部署。镜像内包含 Express API、Vite 构建后的前端静态文件、默认 public 资源。

## 本地 Docker Compose

```bash
docker compose up --build -d
```

访问：

- 应用：`http://localhost:3000`
- 健康检查：`http://localhost:3000/api/health`

停止：

```bash
docker compose down
```

## 直接拉 GHCR 镜像

`docker-compose.ghcr.yml` 用于不本地构建，直接拉 GHCR 镜像。

默认拉取：

```bash
docker compose -f docker-compose.ghcr.yml up -d
```

默认镜像：

```text
ghcr.io/kagangtuya-star/trpg-map-lite-eaflet:latest
```

也可以指定其它标签：

```bash
export TRPG_MAP_IMAGE=ghcr.io/kagangtuya-star/trpg-map-lite-eaflet:<tag>
docker compose -f docker-compose.ghcr.yml up -d
```

或写进同目录 `.env`：

```env
TRPG_MAP_IMAGE=ghcr.io/kagangtuya-star/trpg-map-lite-eaflet:<tag>
```

## 持久化目录

`docker-compose.yml` 默认挂载：

- `./data:/app/data`：SQLite 数据库 `trpg_map.db` 和 WAL 文件
- `./data/uploads:/app/public/uploads`：上传的 cursor、marker icon
- `./data/tiles:/app/public/tiles`：地图瓦片

迁移或备份服务时，保留 `./data` 即可保留运行数据。

## 手动构建镜像

```bash
docker build -t trpg-map-lite-leaflet:local .
docker run --rm -p 3000:3000 \
  -v "$PWD/data:/app/data" \
  -v "$PWD/data/uploads:/app/public/uploads" \
  -v "$PWD/data/tiles:/app/public/tiles" \
  trpg-map-lite-leaflet:local
```

## GitHub Actions 发布镜像

`.github/workflows/docker-release.yml` 提供手动触发的 GHCR 构建发布流程。

使用步骤：

1. 打开 GitHub 仓库的 `Actions` 页面。
2. 选择 `Docker Release`。
3. 点击 `Run workflow`。
4. 输入 `tag`，例如 `v0.1.0`。
5. 需要同步 `latest` 时勾选 `push_latest`。

发布后镜像名：

```text
ghcr.io/kagangtuya-star/trpg-map-lite-eaflet:<tag>
```

拉取运行：

```bash
docker login ghcr.io
docker pull ghcr.io/kagangtuya-star/trpg-map-lite-eaflet:<tag>
docker run -d --name trpg-map-lite-leaflet \
  -p 3000:3000 \
  -v "$PWD/data:/app/data" \
  -v "$PWD/data/uploads:/app/public/uploads" \
  -v "$PWD/data/tiles:/app/public/tiles" \
  ghcr.io/kagangtuya-star/trpg-map-lite-eaflet:<tag>
```
