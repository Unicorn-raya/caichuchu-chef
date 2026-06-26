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
    "五花肉": "猪肉",
    "带皮五花肉": "猪肉",
    "后腿肉": "猪肉",
    "里脊肉": "猪肉",
    "梅花肉": "猪肉",
    "前腿肉": "猪肉",
    "活虾": "虾",
    "明虾": "虾",
    "基围虾": "虾",
    "黑虎虾": "虾",
    "虾仁": "虾",
    "草鱼": "鱼",
    "鲫鱼": "鱼",
    "鲤鱼": "鱼",
    "鲈鱼": "鱼",
    "带鱼": "鱼",
    "鳕鱼": "鱼",
}

# ============================================
# 食材等价类（同一组内的食材可以互相替代）
# 例如：猪肉末和牛肉末可互换
# ============================================
EQUIVALENCE_GROUPS: list[list[str]] = [
    # 肉末类互换（不同肉类的肉末可以互相替代）
    ["猪肉末", "牛肉末", "羊肉末", "鸡肉末", "肉末", "肉沫", "肉糜"],
    # 肉丁类互换
    ["猪肉丁", "牛肉丁", "羊肉丁", "鸡肉丁", "鸡丁", "肉丁"],
    # 肉丝类互换
    ["猪肉丝", "牛肉丝", "羊肉丝", "鸡肉丝", "鸡丝", "肉丝"],
    # 肉片类互换
    ["猪肉片", "牛肉片", "羊肉片", "鸡肉片", "鸡片", "肉片"],
    # 猪肉部位等价
    ["猪肉", "五花肉", "里脊", "排骨"],
    # 鸡肉部位等价
    ["鸡肉", "鸡胸肉", "鸡腿", "鸡翅"],
    # 牛肉部位等价
    ["牛肉", "牛腩"],
    # 蔬菜等价
    ["辣椒", "干辣椒", "小米辣", "小米椒", "青椒", "彩椒"],
    ["葱", "大葱", "小葱", "香葱", "葱花"],
    ["姜", "生姜", "姜片", "姜末"],
    ["蒜", "大蒜", "蒜瓣", "蒜末"],
    # 酱油类
    ["酱油", "生抽", "老抽"],
    # 食用油类
    ["食用油", "植物油", "花生油", "菜籽油", "橄榄油"],
    # 糖类
    ["糖", "白糖", "冰糖", "红糖"],
    # 豆制品
    ["豆腐", "嫩豆腐", "老豆腐", "内酯豆腐"],
]

# 泛化映射：菜谱需要的食材 -> 库存中可以替代的"泛化形式"
# 例如：菜谱要"肉末"，库存有"猪肉"就算匹配（猪肉可以剁成肉末）
GENERALIZATION_MAP: dict[str, list[str]] = {
    # 肉末形态 -> 整块肉类可替代
    "肉末": ["猪肉", "牛肉", "羊肉", "鸡肉"],
    "肉沫": ["猪肉", "牛肉", "羊肉", "鸡肉"],
    "肉糜": ["猪肉", "牛肉", "羊肉", "鸡肉"],
    "猪肉末": ["猪肉"],
    "牛肉末": ["牛肉"],
    "羊肉末": ["羊肉"],
    "鸡肉末": ["鸡肉"],
    # 肉丁形态
    "肉丁": ["猪肉", "牛肉", "羊肉", "鸡肉"],
    "猪肉丁": ["猪肉"],
    "牛肉丁": ["牛肉"],
    "鸡肉丁": ["鸡肉"],
    "鸡丁": ["鸡肉"],
    # 肉丝形态
    "肉丝": ["猪肉", "牛肉", "羊肉", "鸡肉"],
    "猪肉丝": ["猪肉"],
    "牛肉丝": ["牛肉"],
    "鸡肉丝": ["鸡肉"],
    "鸡丝": ["鸡肉"],
    # 肉片形态
    "肉片": ["猪肉", "牛肉", "羊肉", "鸡肉"],
    "猪肉片": ["猪肉"],
    "牛肉片": ["牛肉"],
    "鸡肉片": ["鸡肉"],
    "鸡片": ["鸡肉"],
}


def _build_equivalence_map() -> dict[str, str]:
    """用并查集构建食材等价映射，返回 {食材: 等价类代表}"""
    parent: dict[str, str] = {}

    def find(x: str) -> str:
        if x not in parent:
            parent[x] = x
        if parent[x] != x:
            parent[x] = find(parent[x])
        return parent[x]

    def union(x: str, y: str) -> None:
        px, py = find(x), find(y)
        if px != py:
            parent[px] = py

    for group in EQUIVALENCE_GROUPS:
        for i in range(1, len(group)):
            union(group[0], group[i])

    return {x: find(x) for x in parent}


# 预计算等价映射
_EQUIV_MAP = _build_equivalence_map()


def _equiv_key(item: str) -> str:
    """获取食材的等价类代表，若无等价类则返回自身"""
    return _EQUIV_MAP.get(item, item)

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


# 常见基础调料集合：这些在 missingCore 中会被排除，
# 因为大多数家庭厨房常备，不需要专门采买。
# 用 normalize_item 归一化后的小写形式。
BASIC_SEASONINGS: set[str] = {
    "盐", "糖", "冰糖", "白糖", "红糖", "酱油", "生抽", "老抽",
    "醋", "香醋", "料酒", "黄酒", "米酒", "食用油", "植物油", "花生油", "菜籽油", "橄榄油", "油",
    "葱", "大葱", "小葱", "香葱", "葱花",
    "姜", "生姜", "姜片", "姜末",
    "蒜", "大蒜", "蒜瓣", "蒜末",
    "辣椒", "干辣椒", "小米辣", "小米椒", "青椒",
    "花椒", "八角", "桂皮", "香叶", "丁香", "草果", "小茴香", "五香粉", "十三香",
    "胡椒粉", "白胡椒粉", "黑胡椒粉", "白胡椒", "黑胡椒", "胡椒",
    "淀粉", "生粉", "水淀粉",
    "蚝油", "豆瓣酱", "甜面酱", "黄豆酱", "海鲜酱", "番茄酱", "芝麻酱",
    "味精", "鸡精",
    "芝麻", "白芝麻", "黑芝麻", "芝麻油", "香油",
    "清水", "开水", "温水", "凉水",
    "蜂蜜", "可乐", "啤酒",
}

# 标点/数量修饰词，用于判断食材名是否带修饰（如"生抽3汤匙"）


def is_basic_seasoning(item: str) -> bool:
    """判断食材是否属于常见基础调料（应从 missingCore 中排除）。

    判断逻辑：对食材名做归一化后，若命中 BASIC_SEASONINGS 集合，
    或去掉数量/单位后命中，则视为调料。
    注意：不做宽松的前缀匹配，避免把"蒜薹"误判为"蒜"。
    """
    norm = normalize_item(item)
    if not norm:
        return True
    if norm in BASIC_SEASONINGS:
        return True
    # 处理带数量/单位的调料，如"生抽3汤匙" -> "生抽"
    import re
    stripped = re.sub(
        r"[0-9０-９一二三四五六七八九十百千万半两]+|(克|千克|斤|两|毫升|升|g|kg|ml|l|L|个|颗|枚|根|片|瓣|勺|匙|碗|盒|支|只|条|块|朵|把|杯|份|汤匙|茶匙|大匙|小匙)",
        "",
        item,
    )
    stripped = re.sub(r"[，。；;、,./\\|!！?？:：()\[\]{}（）【】\s]+", "", stripped).strip()
    if stripped in BASIC_SEASONINGS:
        return True
    # 组合调料拆分判断（如"葱姜蒜"整体算调料）
    if norm in ("葱姜蒜", "葱姜末", "蒜末姜末"):
        return True
    return False


def normalize_item(value: str) -> str:
    """归一化食材名称：去除数量、单位、标点，应用别名映射"""
    import re

    # 修复：先把"五花肉"等含数字的食材名替换成占位符，避免被数字正则误删
    # 数字正则会把"五花肉"->"花肉"，所以先保护含"五"的食材
    protected = value
    protect_map = {"五花肉": "__WC_PROTECT_WUHUA__"}
    for k, v in protect_map.items():
        protected = protected.replace(k, v)

    cleaned = re.sub(r"[0-9０-９一二三四五六七八九十百千万半两]+", "", protected)
    # 恢复被保护的食材名
    for v, k in {v: k for k, v in protect_map.items()}.items():
        cleaned = cleaned.replace(v, k)
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
    """检查食材是否在库存中（含等价类匹配、泛化匹配和组合拆分）

    匹配优先级：
    1. 精确匹配（含对菜谱食材做归一化后再匹配）
    2. 等价类匹配（猪肉末↔牛肉末等互换）
    3. 泛化匹配（猪肉可替代菜谱中的肉末/肉丁形态）
    4. 组合食材拆分（葱姜蒜、酱油等）

    注意：inventory 中的值已经是 normalize_item 处理过的，
    但 item（来自菜谱）是原始字符串，需要先归一化再比较。
    """
    # 0. 先对菜谱食材做归一化（库存已归一化）
    norm_item = normalize_item(item)

    # 1. 精确匹配（用归一化后的值比较）
    if norm_item in inventory:
        return True
    if item in inventory:
        return True

    # 2. 等价类匹配
    item_key = _equiv_key(norm_item)
    if item_key != norm_item:
        for inv_item in inventory:
            if _equiv_key(inv_item) == item_key:
                return True
    # 也用原始 item 试一次等价类（兼容未归一化的等价组定义）
    item_key_orig = _equiv_key(item)
    if item_key_orig != item:
        for inv_item in inventory:
            if _equiv_key(inv_item) == item_key_orig:
                return True

    # 3. 泛化匹配：菜谱要肉末/肉丁，库存有整块肉
    for check_item in (norm_item, item):
        if check_item in GENERALIZATION_MAP:
            for gen_item in GENERALIZATION_MAP[check_item]:
                if gen_item in inventory:
                    return True
                gen_key = _equiv_key(gen_item)
                if gen_key != gen_item:
                    for inv_item in inventory:
                        if _equiv_key(inv_item) == gen_key:
                            return True

    # 4. 组合食材拆分
    if norm_item in ("葱姜蒜", "葱姜") or item == "葱姜蒜":
        return "葱" in inventory or "姜" in inventory or "蒜" in inventory
    if norm_item in ("酱油",) or item == "酱油":
        return "酱油" in inventory or "生抽" in inventory or "老抽" in inventory
    if norm_item == "辣椒" or item == "辣椒":
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

    missingCore 会排除常见基础调料（盐/糖/酱油/醋/油/葱姜蒜等），
    只保留"需要专门采买的主料/配菜"。
    """
    required = list(dict.fromkeys(recipe.requiredIngredients))
    existing = [item for item in required if item_matches(inventory, item)]
    missing = [item for item in required if not item_matches(inventory, item)]
    # missingCore 排除常见基础调料，只算需要专门采买的主料/配菜
    missing_core = [
        item for item in recipe.coreIngredients
        if not item_matches(inventory, item) and not is_basic_seasoning(item)
    ]
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
    show_all: bool = False,
) -> list[dict]:
    """过滤和排序推荐结果

    show_all=True 时跳过严格过滤（用于标签筛选，显示所有匹配标签的菜谱）
    """
    results = []
    for item in recommendations:
        if not show_all:
            # 放宽过滤：只要有1个已有食材就保留，不再要求 matchPercent >= 35%
            if len(item["existing"]) == 0:
                continue
            # 模式过滤：scrappy 模式允许缺核心 5 个（原为3）
            if mode == "scrappy":
                if len(item["missingCore"]) > 5 or item["recipe"].category == "drink":
                    continue
            else:
                if len(item["missingCore"]) > 7 or item["recipe"].category in ("drink", "condiment"):
                    continue
        else:
            # show_all 模式：不做分类过滤，显示所有匹配标签的菜谱
            pass
        results.append(item)

    if show_all:
        # 标签筛选模式：按缺失食材数量升序排序（前端也会再排一次）
        results.sort(key=lambda x: (len(x["missingCore"]), -x["score"]))
    else:
        # 正常模式：家常主菜排名 > 评分
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
    show_all: bool = False,
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
    return filter_and_sort(recommendations, mode, top_k, show_all=show_all)
