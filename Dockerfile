# 菜厨厨后端 Dockerfile
# 适用于 Render / Railway / Fly.io / Koyeb 等 Python 主机
FROM python:3.11-slim

WORKDIR /app

# 安装编译依赖（numpy/scipy 编译需要）
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 先拷贝依赖文件，利用构建缓存
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# 拷贝数据与后端代码（data/images 为符号链接，COPY 会跟随并复制实际图片）
COPY data/ ./data/
COPY backend/ ./backend/

# 构建向量索引（首次会下载 sentence-transformers 模型 ~470MB）
RUN cd backend && python build_index.py

# 运行目录（app 包在 backend/ 下）
WORKDIR /app/backend

# Render/Railway 通过 PORT 注入端口
ENV PORT=8000
EXPOSE 8000

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
