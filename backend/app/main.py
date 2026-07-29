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
    logger.info("POST /api/search | 食材=%s, 模式=%s, top_k=%d, 标签=%s, show_all=%s",
                request.ingredients, request.mode, request.top_k, request.tags, request.show_all)
    t0 = time.time()
    engine = get_rag_engine()
    results = engine.search(
        ingredients=request.ingredients,
        mode=request.mode,
        top_k=request.top_k,
        tags=request.tags if request.tags else None,
        show_all=request.show_all,
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
