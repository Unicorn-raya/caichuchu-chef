"""FastAPI 主应用"""
from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .data import load_recipes, get_recipe_by_id
from .models import SearchRequest, Recommendation
from .rag import RecipeRAG

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

# 全局 RAG 引擎
rag_engine: RecipeRAG | None = None
recipes_cache: list = []


def get_rag_engine() -> RecipeRAG:
    global rag_engine
    if rag_engine is None:
        rag_engine = RecipeRAG()
        if not rag_engine.load_index():
            print("索引不存在，正在构建...")
            recipes = load_recipes()
            rag_engine.build_index(recipes)
        print(f"RAG 引擎就绪，共 {len(rag_engine.recipes)} 个菜谱")
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
    return {"recipes": [r.model_dump() for r in get_recipes()]}


@app.get("/api/recipe/{recipe_id}")
async def get_recipe(recipe_id: str):
    """获取单个菜谱详情"""
    recipe = get_recipe_by_id(get_recipes(), recipe_id)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe.model_dump()


@app.post("/api/search", response_model=list[Recommendation])
async def search_recipes(request: SearchRequest):
    """RAG + 规则评分搜索菜谱

    搜索流程：
    1. RAG 语义检索：将用户食材编码为向量，检索语义相关的菜谱候选
    2. 规则评分：对候选菜谱应用食材覆盖率计算 + 加权评分公式
    3. 过滤排序：按模式过滤，按家常主菜排名和评分排序
    """
    engine = get_rag_engine()
    results = engine.search(
        ingredients=request.ingredients,
        mode=request.mode,
        top_k=request.top_k,
        tags=request.tags if request.tags else None,
    )
    return results


@app.get("/api/tags")
async def get_tags():
    """获取所有菜谱标签"""
    recipes = get_recipes()
    tag_counts = {}
    for recipe in recipes:
        for tag in recipe.tags:
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
    return [
        {"value": tag, "label": tag, "count": count}
        for tag, count in sorted(tag_counts.items(), key=lambda x: -x[1])
    ]


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


# ---------- 静态文件服务 ----------


@app.get("/data/images/{path:path}")
async def serve_image(path: str):
    """提供菜谱图片"""
    full_path = IMAGES_DIR / path
    if not full_path.exists() or not full_path.is_file():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(full_path)


# 前端静态文件
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")


@app.on_event("startup")
async def startup_event():
    """启动时预加载菜谱数据"""
    get_recipes()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
