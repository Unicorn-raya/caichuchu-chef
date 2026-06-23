"""规则评分引擎：食材覆盖率计算 + 加权评分公式 + 过滤和排序

移植自 leftover-chef-app/app/leftover-chef-app.tsx 的 recommendRecipes 逻辑。
"""
from __future__ import annotations

from typing import Iterable

from .models import Recipe

# 食材别名映射（同义词归一化）
ALIAS_MAP: dict[str, str] = {
    "番茄": "西红柿",
    "蕃茄": "西红柿",
    "马铃薯": "土豆",
    "蛋": "鸡蛋",
    "大葱": "葱",
    "香葱": "葱",
    "小葱": "葱",
    "葱花": "葱",
    "生姜": "姜",
    "姜片": "姜",
    "姜末": "姜",
    "大蒜": "蒜",
    "蒜瓣": "蒜",
    "蒜末": "蒜",
    "小米辣": "辣椒",
    "小米椒": "辣椒",
    "鸡胸肉": "鸡肉",
    "鸡腿": "鸡肉",
    "肉末": "猪肉",
    "肉糜": "猪肉",
    "剩饭": "米饭",
    "冷饭": "米饭",
    "植物油": "食用油",
    "花生油": "食用油",
    "油": "食用油",
    "食盐": "盐",
    "食用盐": "盐",
    "白糖": "糖",
    "香醋": "醋",
    "生抽酱油": "生抽",
    "老抽酱油": "老抽",
}

# 家常主菜分类
HOME_MAIN_DISH_CATEGORIES = {"aquatic", "meat_dish", "vegetable_dish"}

# 常见家常主菜标题
COMMON_HOME_MAIN_DISH_TITLES = {
    "西红柿炒鸡蛋",
    "酸辣土豆丝",
    "红烧茄子",
    "炒茄子",
    "蒜蓉西兰花",
    "蚝油生菜",
    "炒青菜",
    "凉拌黄瓜",
    "皮蛋豆腐",
    "麻婆豆腐",
    "家常豆腐",
    "可乐鸡翅",
    "红烧鸡翅",
    "宫保鸡丁",
    "鱼香肉丝",
    "回锅肉",
    "小炒肉",
    "糖醋里脊",
    "水煮肉片",
    "糖醋排骨",
    "土豆炖排骨",
    "清蒸鲈鱼",
    "红烧鱼",
    "红烧鲤鱼",
    "西红柿牛腩",
}

COMMON_HOME_MAIN_DISH_KEYWORDS = [
    "红烧肉",
    "红烧鱼",
    "清蒸鱼",
    "清蒸鲈鱼",
    "番茄牛腩",
    "西红柿牛腩",
    "土豆炖排骨",
    "糖醋排骨",
    "宫保鸡丁",
    "麻婆豆腐",
    "鱼香肉丝",
    "回锅肉",
]


def normalize_item(value: str) -> str:
    """归一化食材名称：去除数量、单位、标点，应用别名映射"""
    import re

    cleaned = re.sub(r"[0-9０-９一二三四五六七八九十百千万半两]+", "", value)
    cleaned = re.sub(
        r"(克|千克|斤|两|毫升|升|g|kg|ml|l|L|个|颗|枚|根|片|瓣|勺|匙|碗|盒|支|只|条|块|朵|把|杯|份)",
        "",
        cleaned,
    )
    cleaned = re.sub(r"[，。；;、,./\\|!！?？:：()\[\]{}（）【】]", " ", cleaned)
    cleaned = re.sub(r"\s+", "", cleaned).strip()

    if not cleaned:
        return ""
    return ALIAS_MAP.get(cleaned, cleaned)


def item_matches(inventory: set[str], item: str) -> bool:
    """检查食材是否在库存中（含组合食材的拆分匹配）"""
    if item in inventory:
        return True
    if item == "葱姜蒜":
        return "葱" in inventory or "姜" in inventory or "蒜" in inventory
    if item == "酱油":
        return "酱油" in inventory or "生抽" in inventory or "老抽" in inventory
    if item == "辣椒":
        return "辣椒" in inventory or "干辣椒" in inventory
    return False


def home_main_dish_rank(recipe: Recipe) -> int:
    """家常主菜排名权重：常见菜 > 一般主菜 > 非主菜"""
    if recipe.category not in HOME_MAIN_DISH_CATEGORIES:
        return 0
    if recipe.title in COMMON_HOME_MAIN_DISH_TITLES:
        return 2
    if any(keyword in recipe.title for keyword in COMMON_HOME_MAIN_DISH_KEYWORDS):
        return 2
    return 1


def score_recipe(
    recipe: Recipe,
    inventory: set[str],
    mode: str,
) -> dict | None:
    """对单个菜谱计算评分，返回推荐结果或 None（不匹配）

    评分公式：
    - 食材覆盖率 = 加权命中 / 加权总数
      - 核心食材权重 2，调料权重 0.75
    - scrappy 模式（凑凑吃）：覆盖率*100 - 缺核心*18 - 缺调料*4 - 难度*3 + 快手奖励 + 少买奖励
    - proper 模式（出好菜）：覆盖率*72 - 缺核心*8 - 缺调料*2 + 难度奖励 + 卖相奖励 - 超时惩罚
    """
    required = list(dict.fromkeys(recipe.requiredIngredients))
    existing = [item for item in required if item_matches(inventory, item)]
    missing = [item for item in required if not item_matches(inventory, item)]
    missing_core = [item for item in recipe.coreIngredients if not item_matches(inventory, item)]
    missing_seasonings = [item for item in recipe.seasonings if not item_matches(inventory, item)]

    core_hits = len([item for item in recipe.coreIngredients if item_matches(inventory, item)])
    seasoning_hits = len([item for item in recipe.seasonings if item_matches(inventory, item)])

    weighted_total = (len(recipe.coreIngredients) * 2 + len(recipe.seasonings) * 0.75) or 1
    weighted_hits = core_hits * 2 + seasoning_hits * 0.75
    coverage = weighted_hits / weighted_total

    time = recipe.timeMinutes if recipe.timeMinutes is not None else 35
    quick_bonus = 8 if time <= 20 else (3 if time <= 35 else -4)
    few_things_bonus = 12 if len(missing_core) <= 1 else (5 if len(missing_core) <= 2 else 0)
    beauty_bonus = (
        9 if recipe.category in ("aquatic", "meat_dish")
        else (5 if recipe.category == "vegetable_dish" else 0)
    )
    proper_difficulty_bonus = 8 if recipe.difficulty >= 3 else 2

    if mode == "scrappy":
        score = (
            coverage * 100
            - len(missing_core) * 18
            - len(missing_seasonings) * 4
            - recipe.difficulty * 3
            + quick_bonus
            + few_things_bonus
        )
    else:
        score = (
            coverage * 72
            - len(missing_core) * 8
            - len(missing_seasonings) * 2
            + proper_difficulty_bonus
            + beauty_bonus
            - max(0, time - 75) * 0.08
        )

    # 生成推荐理由
    if mode == "scrappy":
        if len(missing_core) == 0:
            reason = "基本不用买主料"
        elif len(missing_core) <= 2:
            reason = "补少量菜就能开火"
        else:
            reason = "能消耗一部分剩菜"
    else:
        if recipe.difficulty >= 3:
            reason = "更像正经出品"
        else:
            reason = "简单但卖相稳"

    return {
        "recipe": recipe,
        "score": score,
        "matchPercent": round(coverage * 100),
        "existing": existing,
        "missing": missing,
        "missingCore": missing_core,
        "missingSeasonings": missing_seasonings,
        "optional": recipe.optionalIngredients,
        "reason": reason,
    }


def filter_and_sort(
    recommendations: Iterable[dict],
    mode: str,
    top_k: int = 12,
) -> list[dict]:
    """过滤和排序推荐结果"""
    results = []
    for item in recommendations:
        # 过滤：至少有一个已有食材，或覆盖率 >= 35%
        if len(item["existing"]) == 0 and item["matchPercent"] < 35:
            continue
        # 模式过滤
        if mode == "scrappy":
            if len(item["missingCore"]) > 3 or item["recipe"].category == "drink":
                continue
        else:
            if len(item["missingCore"]) > 5 or item["recipe"].category in ("drink", "condiment"):
                continue
        results.append(item)

    # 排序：家常主菜排名 > 评分
    results.sort(
        key=lambda x: (-home_main_dish_rank(x["recipe"]), -x["score"])
    )
    return results[:top_k]


def recommend_recipes(
    recipes: list[Recipe],
    inventory_items: list[str],
    mode: str = "scrappy",
    top_k: int = 12,
    tags: list[str] | None = None,
) -> list[dict]:
    """完整的规则推荐流程：标签过滤 → 评分 → 过滤 → 排序"""
    # 标签筛选
    filtered = recipes
    if tags:
        tag_set = set(tags)
        filtered = [r for r in recipes if tag_set & set(r.tags)]

    inventory = {normalize_item(item) for item in inventory_items if item}
    recommendations = []
    for recipe in filtered:
        result = score_recipe(recipe, inventory, mode)
        if result is not None:
            recommendations.append(result)
    return filter_and_sort(recommendations, mode, top_k)
