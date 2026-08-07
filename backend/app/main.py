"""FastAPI 主应用"""
from __future__ import annotations

import logging
import os
import time
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from starlette.middleware.base import BaseHTTPMiddleware

from .data import load_recipes, get_recipe_by_id
from .models import SearchRequest, Recommendation
from .rag import RecipeRAG
from .ai_proxy import call_ai_proxy, DEFAULT_AI_MODEL, get_ai_config_status

logger = logging.getLogger(__name__)

app = FastAPI(title="菜厨厨 Chef API", version="1.0.0")

# 允许跨域（前端开发用）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class NoCacheMiddleware(BaseHTTPMiddleware):
    """对 JS/CSS/HTML 文件设置 no-cache，防止浏览器缓存旧版本"""
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        path = request.url.path
        if path.endswith((".js", ".css", ".html")) or path == "/":
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        return response


app.add_middleware(NoCacheMiddleware)

# 数据目录
DATA_DIR = Path(__file__).parent.parent.parent / "data"
IMAGES_DIR = DATA_DIR / "images"
FRONTEND_DIR = Path(__file__).parent.parent.parent / "frontend"
# 图片目录：优先用 frontend/data/images/（已提交到 git），回退到 data/images/
IMG_SOURCE_DIR = (FRONTEND_DIR / "data" / "images") if (FRONTEND_DIR / "data" / "images").exists() else IMAGES_DIR

# 全局 RAG 引擎
rag_engine: RecipeRAG | None = None
recipes_cache: list = []


def get_rag_engine() -> RecipeRAG:
    global rag_engine
    if rag_engine is None:
        rag_engine = RecipeRAG()
        if not rag_engine.load_index():
            logger.warning("索引不存在，正在构建...")
            recipes = load_recipes()
            rag_engine.build_index(recipes)
        logger.info("RAG 引擎就绪，共 %d 个菜谱", len(rag_engine.recipes))
    return rag_engine


def get_recipes():
    global recipes_cache
    if not recipes_cache:
        recipes_cache = load_recipes()
    return recipes_cache


# ---------- API 路由 ----------


@app.get("/api/recipes")
async def get_all_recipes():
    """获取所有菜谱列表"""
    recipes = get_recipes()
    logger.info("GET /api/recipes → 返回 %d 个菜谱", len(recipes))
    return {"recipes": [r.model_dump() for r in recipes]}


@app.get("/api/recipe/{recipe_id}")
async def get_recipe(recipe_id: str):
    """获取单个菜谱详情"""
    logger.info("GET /api/recipe/%s", recipe_id)
    recipe = get_recipe_by_id(get_recipes(), recipe_id)
    if recipe is None:
        logger.warning("菜谱未找到: %s", recipe_id)
        raise HTTPException(status_code=404, detail="Recipe not found")
    logger.info("→ 返回菜谱: %s", recipe.title)
    return recipe.model_dump()


@app.post("/api/search", response_model=list[Recommendation])
async def search_recipes(request: SearchRequest):
    """RAG + 规则评分搜索菜谱

    搜索流程：
    1. RAG 语义检索：将用户食材编码为向量，检索语义相关的菜谱候选
    2. 规则评分：对候选菜谱应用食材覆盖率计算 + 加权评分公式
    3. 过滤排序：按模式过滤，按家常主菜排名和评分排序
    """
    logger.info("POST /api/search | 食材=%s, 模式=%s, top_k=%d, 标签=%s, show_all=%s, 临期=%s",
                request.ingredients, request.mode, request.top_k, request.tags, request.show_all, request.expiring_ingredients)
    t0 = time.time()
    engine = get_rag_engine()
    results = engine.search(
        ingredients=request.ingredients,
        mode=request.mode,
        top_k=request.top_k,
        tags=request.tags if request.tags else None,
        show_all=request.show_all,
        expiring_ingredients=request.expiring_ingredients if request.expiring_ingredients else None,
    )
    elapsed = (time.time() - t0) * 1000
    logger.info("→ 返回 %d 条推荐, 耗时 %.0fms", len(results), elapsed)
    return results


@app.get("/api/tags")
async def get_tags():
    """获取所有菜谱标签"""
    recipes = get_recipes()
    tag_counts = {}
    for recipe in recipes:
        for tag in recipe.tags:
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
    tags_list = [
        {"value": tag, "label": tag, "count": count}
        for tag, count in sorted(tag_counts.items(), key=lambda x: -x[1])
    ]
    logger.info("GET /api/tags → %d 个标签", len(tags_list))
    return tags_list


@app.get("/api/shelf-life")
async def get_shelf_life_data():
    """获取食材保质期数据库"""
    from .shelf_life import SHELF_LIFE_DAYS, DEFAULT_SHELF_LIFE_DAYS

    return {
        "shelfLife": SHELF_LIFE_DAYS,
        "default": DEFAULT_SHELF_LIFE_DAYS,
    }


@app.get("/api/categories")
async def get_categories():
    """获取菜谱分类列表"""
    recipes = get_recipes()
    categories = {}
    for recipe in recipes:
        if recipe.category not in categories:
            categories[recipe.category] = {
                "value": recipe.category,
                "label": recipe.categoryLabel,
                "count": 0,
            }
        categories[recipe.category]["count"] += 1
    return list(categories.values())


# ---------- AI 代理服务 ----------


class AIChatRequest(BaseModel):
    messages: list[dict]


@app.post("/api/ai/chat")
async def ai_chat(request: AIChatRequest):
    """AI 对话代理接口（仅代理内置默认模型，自定义模型由前端直连）"""
    msg_count = len(request.messages)
    last_msg_preview = (request.messages[-1].get("content", "")[:100] if request.messages else "")
    logger.info("POST /api/ai/chat | 消息数=%d, 末条预览=%s...", msg_count, last_msg_preview)
    t0 = time.time()
    content = call_ai_proxy(messages=request.messages)
    elapsed = (time.time() - t0) * 1000
    logger.info("→ AI 返回 %d 字, 耗时 %.0fms", len(content), elapsed)
    return {"content": content}


@app.get("/api/ai/config")
async def ai_config_status():
    """AI 配置状态诊断接口（不暴露敏感值）"""
    return get_ai_config_status()


# ---------- AI 菜谱图片搜索：AI 生成真实图搜索关键词 + loremflickr（Flickr 授权真实图片） ----------

class SearchRecipeImagesRequest(BaseModel):
    dishes: list[str]


# 常用尺寸（与前端 _parseImgSize 保持一致）
_IMAGE_SIZES: dict[str, tuple[int, int]] = {
    "square": (512, 512),
    "square_hd": (720, 720),
    "landscape_16_9": (960, 540),
    "landscape_4_3": (800, 600),
    "portrait_4_3": (600, 800),
    "portrait_16_9": (540, 960),
}


def _stable_hash(text: str) -> str:
    """稳定 hash（与前端 _stableHash 算法不同域没关系，只要同菜名同一keyword稳定就行）"""
    import hashlib
    return hashlib.md5(text.encode("utf-8")).hexdigest()[:10]


def _loremflickr_url(keyword: str, width: int, height: int, lock_suffix: str = "") -> str:
    """构建基于 Flickr 授权真实图片的 loremflickr URL"""
    from urllib.parse import quote
    encoded = quote(keyword)
    lock = _stable_hash(keyword + "|" + lock_suffix)
    return f"https://loremflickr.com/{width}/{height}/{encoded}?lock={lock}"


def _build_keywords_for_dish(dish_name: str) -> list[str]:
    """调用 AI 生成 2 组最适合真实图片搜索的关键词；失败则用通用兜底关键词"""
    if not dish_name:
        return ["chinese food, dish, cooking, meal"]
    prompt = (
        "你是美食图库检索专家。给出中文菜名，请输出该菜在真实图库中最适合的2组搜索关键词。\n"
        "要求：\n"
        "1. 只输出JSON数组，不要任何解释文字、注释、Markdown 包裹；\n"
        "2. 每组是一个字符串短语，中英混合可以；\n"
        "3. 绝对不要 AI生成、CG、3D渲染、虚拟、卡通、插画、手绘、生图 等风格词；\n"
        "4. 必须是真实菜品摄影相关，优先包含：烹饪方式/菜系/盛盘角度（45度俯拍、特写）/光线（自然光线）/ 构图（美食摄影）/环境（家常餐桌、木桌、瓷盘、浅盘）；\n"
        "5. 第一组偏中文关键词、第二组偏英文关键词，确保两个关键词组不要重复，覆盖不同的搜索角度。\n"
        f"\n菜名：{dish_name}\n"
        "输出示例（仅示意格式）：\n"
        '[ "酱爆洋葱炒肉丝 家常炒菜 俯拍 美食摄影 木桌 自然光线 特写", '
        '"onion shredded pork stir fry chinese authentic dish food photography close up 45 degree" ]'
    )
    messages = [
        {"role": "system", "content": "你是美食图库检索专家，只输出JSON数组。"},
        {"role": "user", "content": prompt},
    ]
    try:
        content = call_ai_proxy(messages)
        # 容错：剥离可能的 Markdown 代码块
        if content.startswith("```"):
            content = content.strip("`")
            if content.lower().startswith("json"):
                content = content[4:]
        content = content.strip()
        # 找数组
        import json
        start = content.find("[")
        end = content.rfind("]")
        if start >= 0 and end > start:
            arr = json.loads(content[start : end + 1])
            if isinstance(arr, list) and arr:
                cleaned = [str(x).strip() for x in arr if str(x).strip()]
                if cleaned:
                    # 确保至少2组，不够则用菜名通用补齐
                    base = [dish_name + ", chinese food, dish, cooking, meal, homemade cuisine"]
                    while len(cleaned) < 2:
                        cleaned.append(base[0] + f", variant{len(cleaned)}")
                    return cleaned[:2]
    except Exception as e:  # noqa: BLE001
        logger.warning("AI生成菜品图片关键词失败，使用兜底: dish=%s err=%s", dish_name, e)
    # 兜底关键词：菜名 + 通用美食摄影词
    kw1 = f"{dish_name}, 家常菜品, 美食摄影, 俯拍, 自然光线, 真实菜品"
    kw2 = f"{dish_name}, chinese authentic dish, food photography, plated meal, natural light"
    return [kw1, kw2]


def _build_image_map_for_dish(dish_name: str, keywords: list[str]) -> dict[str, list[str]]:
    """为单个菜生成不同尺寸、不同关键词的真实图片URL映射（每个尺寸2个用于primary/fallback）"""
    result: dict[str, list[str]] = {}
    for size_name, (w, h) in _IMAGE_SIZES.items():
        urls: list[str] = []
        for idx, kw in enumerate(keywords):
            urls.append(_loremflickr_url(kw, w, h, lock_suffix=f"{size_name}|{idx}"))
        # 保证至少2个URL（用不同lock seed的同一关键词）
        if len(urls) == 1:
            urls.append(_loremflickr_url(keywords[0], w, h, lock_suffix=f"{size_name}|v2"))
        result[size_name] = urls
    return result


@app.post("/api/ai/search_recipe_images")
async def search_recipe_images(request: SearchRecipeImagesRequest):
    """AI 联网搜索菜谱真实配图：
    - 用 AI 为每道菜生成最适合真实图搜索的关键词（分中英文两组）
    - 基于 loremflickr（Flickr 免费授权真实图片库）构建稳定 URL
    - 返回每个菜 × 每种尺寸 × 2 个 URL（primary / fallback，前端 onerror 切换）
    注意：此接口只做 URL 构建，不拉取图片二进制，返回速度快。
    """
    dishes = [d.strip() for d in request.dishes if d and d.strip()]
    dishes = list(dict.fromkeys(dishes))  # 去重保序
    if not dishes:
        return {"images": {}}

    logger.info("POST /api/ai/search_recipe_images | dishes=%s", dishes)
    t0 = time.time()
    images_out: dict[str, dict[str, list[str]]] = {}

    for dish in dishes:
        keywords = _build_keywords_for_dish(dish)
        images_out[dish] = _build_image_map_for_dish(dish, keywords)

    elapsed = (time.time() - t0) * 1000
    logger.info("→ 生成 %d 道菜的真实图关键词, 耗时 %.0fms", len(dishes), elapsed)
    return {"images": images_out}


# ---------- 前端日志收集 ----------


class FrontendLogEntry(BaseModel):
    level: str = "info"
    module: str = "unknown"
    message: str = ""
    data: dict | None = None


@app.post("/api/log")
async def frontend_log(entries: list[FrontendLogEntry]):
    """接收前端日志并输出到 stdout（HF container logs 可见）"""
    fe_logger = logging.getLogger("app.frontend")
    for entry in entries:
        data_str = f" | data={entry.data}" if entry.data else ""
        msg = f"[FE][{entry.module}] {entry.message}{data_str}"
        if entry.level == "error":
            fe_logger.error(msg)
        elif entry.level == "warning":
            fe_logger.warning(msg)
        else:
            fe_logger.info(msg)
    return {"ok": True}


# ---------- 静态文件服务 ----------


@app.get("/data/images/{path:path}")
async def serve_image(path: str):
    """提供菜谱图片"""
    full_path = IMG_SOURCE_DIR / path
    if not full_path.exists() or not full_path.is_file():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(full_path)


@app.get("/health")
async def health():
    """健康检查"""
    return {"status": "healthy"}


# 前端静态文件（挂载在最后，确保 /api/* 等路由优先匹配）
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")


@app.on_event("startup")
async def startup_event():
    """启动时预加载菜谱数据"""
    logger.info("=== 服务启动 ===")
    get_recipes()
    logger.info("菜谱数据预加载完成")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
