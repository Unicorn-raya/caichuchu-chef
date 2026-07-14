"""菜谱数据加载"""
from __future__ import annotations

import json
import logging
from pathlib import Path

from .models import Recipe, RecipePayload

logger = logging.getLogger(__name__)

# 数据文件路径
DATA_DIR = Path(__file__).parent.parent.parent / "data"
RECIPES_FILE = DATA_DIR / "recipes.json"


def load_recipes() -> list[Recipe]:
    """从 JSON 文件加载菜谱数据"""
    logger.info("加载菜谱数据 | 文件=%s", RECIPES_FILE)
    with open(RECIPES_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    payload = RecipePayload(**data)
    recipes = payload.recipes
    logger.info("菜谱加载完成 | 共 %d 个菜谱", len(recipes))
    return recipes


def get_recipe_by_id(recipes: list[Recipe], recipe_id: str) -> Recipe | None:
    """根据 ID 获取菜谱"""
    for recipe in recipes:
        if recipe.id == recipe_id:
            return recipe
    return None
