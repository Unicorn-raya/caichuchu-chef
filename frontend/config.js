/* 部署配置
 * 自动检测：同源部署（Docker/HF Space）时使用相对路径，本地 file:// 打开时使用线上后端
 */
(function () {
  const isFileProtocol = window.location.protocol === "file:";
  const HF_BACKEND = "https://sealray-caichuchu-backend.hf.space";
  window.CCC_API_BASE = isFileProtocol ? HF_BACKEND : "";
})();
