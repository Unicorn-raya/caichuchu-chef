/* 部署配置
 *
 * 本地开发：保持 window.CCC_API_BASE = "" （前端由后端同源提供）
 * 线上部署：
 *   1. 先部署后端（Render/Railway），获得后端域名，如 https://caichuchu-backend.onrender.com
 *   2. 把下方域名改成你的后端地址（不要带末尾斜杠）
 *   3. 前端部署到 Vercel 后即可调用后端 API
 */
window.CCC_API_BASE = "http://localhost:8000";
