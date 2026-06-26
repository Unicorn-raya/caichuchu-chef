# 菜厨厨后端 Dockerfile
# 适用于 Hugging Face Spaces / Render / Railway 等
FROM python:3.11-slim

# 创建非 root 用户（HF Spaces 要求 user ID 1000）
RUN useradd -m -u 1000 user

WORKDIR /app

# 换源：apt 用阿里云镜像，pip 用清华镜像（加速国内构建）
RUN sed -i 's|deb.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list.d/debian.sources 2>/dev/null \
    || sed -i 's|deb.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list 2>/dev/null \
    || true

# 安装编译依赖（numpy/scipy 编译需要）
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 切换到非 root 用户
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# 先拷贝依赖文件，利用构建缓存
COPY --chown=user backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple \
    -r backend/requirements.txt

# 拷贝数据与后端代码
COPY --chown=user data/ ./data/
COPY --chown=user backend/ ./backend/

# 构建向量索引（首次会下载 sentence-transformers 模型 ~470MB）
# 使用 HuggingFace 镜像加速国内下载
ENV HF_ENDPOINT=https://hf-mirror.com
RUN cd backend && python build_index.py

# 运行目录（app 包在 backend/ 下）
WORKDIR $HOME/app/backend

# HF Spaces 默认端口 7860
ENV PORT=7860
EXPOSE 7860

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
