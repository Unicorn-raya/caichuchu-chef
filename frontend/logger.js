/* ============================================
   菜厨厨 — 前端日志模块
   将关键事件日志发送到后端 /api/log，在 HF Spaces container logs 中可见
   使用 sendBeacon 非阻塞发送，缓冲批量提交
   ============================================ */

const FrontendLogger = {
  _buffer: [],
  _flushTimer: null,
  _flushInterval: 5000, // 5秒批量发送一次
  _maxBufferSize: 20,   // 缓冲满也立即发送

  /**
   * 记录日志
   * @param {string} level - info / warning / error
   * @param {string} module - 模块名
   * @param {string} message - 日志消息
   * @param {object} [data] - 附加数据
   */
  log(level, module, message, data) {
    const entry = {
      level: level || "info",
      module: module || "unknown",
      message: message || "",
      timestamp: Date.now(),
    };
    if (data !== undefined) {
      // 只保留可序列化的数据，截断过长的值
      try {
        entry.data = this._sanitize(data);
      } catch {
        entry.data = { error: "data not serializable" };
      }
    }
    this._buffer.push(entry);

    // error 立即发送
    if (level === "error") {
      this.flush();
      return;
    }

    // 缓冲满立即发送
    if (this._buffer.length >= this._maxBufferSize) {
      this.flush();
      return;
    }

    // 定时发送
    if (!this._flushTimer) {
      this._flushTimer = setTimeout(() => this.flush(), this._flushInterval);
    }
  },

  info(module, message, data) {
    this.log("info", module, message, data);
  },

  warning(module, message, data) {
    this.log("warning", module, message, data);
  },

  error(module, message, data) {
    this.log("error", module, message, data);
  },

  /** 发送缓冲区中的日志到后端 */
  flush() {
    if (this._flushTimer) {
      clearTimeout(this._flushTimer);
      this._flushTimer = null;
    }
    if (this._buffer.length === 0) return;

    const entries = this._buffer.splice(0);
    const apiBase = window.CCC_API_BASE || "";
    const url = `${apiBase}/api/log`;

    try {
      // 使用 fetch + keepalive 替代 sendBeacon
      // sendBeacon 的 credentials:"include" 在跨域 + CORS allow_origins=["*"] 时
      // 会被浏览器阻止预检，导致日志请求无法发出
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entries),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // 静默失败，日志不能影响正常功能
    }
  },

  /** 清理数据，避免循环引用和过长内容 */
  _sanitize(data, depth) {
    if (depth === undefined) depth = 0;
    if (depth > 3) return "[truncated]";
    if (data === null || data === undefined) return data;
    if (typeof data === "string") return data.slice(0, 500);
    if (typeof data === "number" || typeof data === "boolean") return data;
    if (Array.isArray(data)) {
      return data.slice(0, 10).map((item) => this._sanitize(item, depth + 1));
    }
    if (typeof data === "object") {
      const result = {};
      for (const key of Object.keys(data).slice(0, 20)) {
        result[key] = this._sanitize(data[key], depth + 1);
      }
      return result;
    }
    return String(data).slice(0, 200);
  },
};

// 页面卸载时发送剩余日志
window.addEventListener("beforeunload", () => {
  FrontendLogger.flush();
});

// 暴露到全局
window.FrontendLogger = FrontendLogger;
