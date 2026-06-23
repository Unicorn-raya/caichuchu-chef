"""构建向量索引脚本

用法: python build_index.py
"""
import sys
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent))

from app.data import load_recipes
from app.rag import RecipeRAG


def main():
    print("加载菜谱数据...")
    recipes = load_recipes()
    print(f"共 {len(recipes)} 个菜谱")

    print("\n构建 RAG 向量索引...")
    engine = RecipeRAG()
    engine.build_index(recipes)

    print("\n索引构建完成！")
    print(f"菜谱数量: {len(engine.recipes)}")
    print(f"向量维度: {engine.embeddings.shape}")


if __name__ == "__main__":
    main()
