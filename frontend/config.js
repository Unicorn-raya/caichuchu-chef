/* 部署配置
 * 前端部署在 Vercel，后端部署在 HuggingFace Space
 * 本地开发(localhost)使用相对路径，其他环境(file://、Vercel)都指向 HF 后端
 */
(function () {
  var HF_BACKEND = "https://sealray-caichuchu-backend.hf.space";
  var isLocalDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  window.CCC_API_BASE = isLocalDev ? "" : HF_BACKEND;
})();
