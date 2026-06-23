"""RAG 检索引擎：向量语义检索 + 规则评分

使用 sentence-transformers 生成菜谱和查询的向量嵌入，
通过余弦相似度检索语义相关的菜谱候选，再用规则评分精排。
"""
from __future__ import annotations

import json
import os
import pickle
from pathlib import Path
from typing import Optional

import numpy as np

from .models import Recipe
from .scoring import recommend_recipes, normalize_item

# 默认嵌入模型（多语言，支持中文）
DEFAULT_MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"

# 索引文件路径
INDEX_DIR = Path(__file__).parent.parent / "index"


class RecipeRAG:
    """菜谱 RAG 检索引擎"""

    def __init__(self, model_name: str = DEFAULT_MODEL_NAME):
        self.model_name = model_name
        self.model = None
        self.recipes: list[Recipe] = []
        self.embeddings: Optional[np.ndarray] = None
        self.recipe_texts: list[str] = []

    def _load_model(self):
        """延迟加载嵌入模型"""
        if self.model is None:
            from sentence_transformers import SentenceTransformer

            self.model = SentenceTransformer(self.model_name)

    def _build_recipe_text(self, recipe: Recipe) -> str:
        """将菜谱转换为可嵌入的文本：标题 + 分类 + 食材"""
        parts = [recipe.title, recipe.categoryLabel]
        parts.extend(recipe.coreIngredients)
        parts.extend(recipe.requiredIngredients)
        parts.extend(recipe.seasonings)
        parts.extend(recipe.tags)
        return " ".join(parts)

    def _build_query_text(self, ingredients: list[str]) -> str:
        """将用户输入的食材转换为查询文本"""
        normalized = [normalize_item(item) for item in ingredients if item]
        return " ".join(normalized)

    def build_index(self, recipes: list[Recipe]):
        """构建向量索引"""
        self._load_model()
        self.recipes = recipes
        self.recipe_texts = [self._build_recipe_text(r) for r in recipes]

        print(f"正在为 {len(recipes)} 个菜谱生成嵌入向量...")
        self.embeddings = self.model.encode(
            self.recipe_texts,
            show_progress_bar=True,
            convert_to_numpy=True,
            normalize_embeddings=True,
        )

        # 保存索引
        INDEX_DIR.mkdir(parents=True, exist_ok=True)
        np.save(INDEX_DIR / "embeddings.npy", self.embeddings)
        with open(INDEX_DIR / "recipes.pkl", "wb") as f:
            pickle.dump(
                {"recipes": [r.model_dump() for r in recipes], "texts": self.recipe_texts},
                f,
            )
        print(f"索引已保存到 {INDEX_DIR}")

    def load_index(self) -> bool:
        """加载已有索引，返回是否成功"""
        emb_path = INDEX_DIR / "embeddings.npy"
        recipes_path = INDEX_DIR / "recipes.pkl"
        if not emb_path.exists() or not recipes_path.exists():
            return False

        self.embeddings = np.load(emb_path)
        with open(recipes_path, "rb") as f:
            data = pickle.load(f)
        self.recipes = [Recipe(**r) for r in data["recipes"]]
        self.recipe_texts = data["texts"]
        return True

    def search(
        self,
        ingredients: list[str],
        mode: str = "scrappy",
        top_k: int = 12,
        rag_top_n: int = 60,
        tags: list[str] | None = None,
    ) -> list[dict]:
        """RAG 检索 + 规则评分

        流程：
        1. 将用户食材编码为查询向量
        2. 通过余弦相似度检索 top-N 菜谱候选（语义召回）
        3. 对候选菜谱应用规则评分（覆盖率 + 加权 + 过滤排序）
        """
        if self.embeddings is None or not self.recipes:
            raise RuntimeError("索引未加载，请先调用 build_index 或 load_index")

        self._load_model()

        # 1. 编码查询
        query_text = self._build_query_text(ingredients)
        query_vec = self.model.encode(
            [query_text],
            convert_to_numpy=True,
            normalize_embeddings=True,
        )

        # 2. 余弦相似度检索（embeddings 已归一化，点积即余弦相似度）
        similarities = self.embeddings @ query_vec[0]
        rag_top_n = min(rag_top_n, len(self.recipes))
        top_indices = np.argpartition(similarities, -rag_top_n)[-rag_top_n:]
        top_indices = top_indices[np.argsort(-similarities[top_indices])]

        # 3. 对候选菜谱应用规则评分
        candidates = [self.recipes[i] for i in top_indices]
        results = recommend_recipes(candidates, ingredients, mode, top_k, tags=tags)

        # 附加 RAG 相似度分数
        for result in results:
            recipe_id = result["recipe"].id
            idx = next(
                (i for i, r in enumerate(self.recipes) if r.id == recipe_id),
                None,
            )
            if idx is not None:
                result["ragScore"] = float(similarities[idx])

        return results
