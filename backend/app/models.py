"""Pydantic 数据模型"""
from pydantic import BaseModel
from typing import Optional


class Recipe(BaseModel):
    id: str
    title: str
    category: str
    categoryLabel: str
    sourcePath: str
    difficulty: int
    calories: Optional[int] = None
    timeMinutes: Optional[int] = None
    requiredIngredients: list[str] = []
    coreIngredients: list[str] = []
    seasonings: list[str] = []
    optionalIngredients: list[str] = []
    steps: list[str] = []
    images: list[str] = []
    tags: list[str] = []


class RecipePayload(BaseModel):
    source: dict
    recipes: list[Recipe]


class SearchRequest(BaseModel):
    ingredients: list[str]
    mode: str = "scrappy"  # "scrappy" | "proper"
    top_k: int = 12
    tags: list[str] = []  # 标签筛选（如：快手, 素菜, 下饭肉菜）


class Recommendation(BaseModel):
    recipe: Recipe
    score: float
    matchPercent: int
    existing: list[str]
    missing: list[str]
    missingCore: list[str]
    missingSeasonings: list[str]
    optional: list[str]
    reason: str
    ragScore: Optional[float] = None
