// Cloudflare Worker：将所有请求代理到运行 FastAPI 后端的容器实例
import { Container, getContainer } from "@cloudflare/containers";

// 容器配置：FastAPI 后端监听 8000 端口
export class BackendContainer extends Container {
  // 与 Dockerfile 中 EXPOSE/CMD 的端口一致
  defaultPort = 8000;
  // 空闲 5 分钟后休眠，避免频繁冷启动（模型加载较慢）
  sleepAfter = "5m";

  onStart() {
    console.log("[backend] 容器已启动");
  }

  onStop() {
    console.log("[backend] 容器已休眠");
  }

  onError(error) {
    console.error("[backend] 容器错误:", error);
  }
}

export default {
  async fetch(request, env) {
    // 所有请求路由到同一个后端实例
    const container = getContainer(env.BACKEND, "backend");
    return await container.fetch(request);
  },
};
