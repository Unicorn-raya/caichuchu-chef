#!/usr/bin/env python3
"""
为菜谱自动标注做法标签（凉拌/煮/蒸/炖/煎/炒/焖/烧/烤/炸）
并计算时长+复杂度综合评分用于排序
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).parent.parent
DATA_RECIPES = ROOT / "data" / "recipes.json"

# 做法难度阶梯（从易到难）
METHOD_ORDER = [
    ("tossing", "凉拌", ["凉拌", "拌", "沙拉"]),
    ("boiling", "煮", ["煮", "汤", "水煮", "清汤", "白煮"]),
    ("steaming", "蒸", ["蒸", "清蒸", "粉蒸", "蒸蛋"]),
    ("stewing", "炖", ["炖", "煲", "慢炖", "老火汤", "煲汤"]),
    ("pan-frying", "煎", ["煎", "煎蛋", "煎豆腐", "煎饼", "烙"]),
    ("stir-frying", "炒", ["炒", "翻炒", "爆炒", "小炒", "快炒"]),
    ("smothering", "焖", ["焖", "焖制", "焖煮"]),
    ("braising", "烧", ["烧", "红烧", "焖烧", "干烧", "烧制"]),
    ("roasting", "烤", ["烤", "烤箱", "烤制", "烤肉", "烘烤"]),
    ("deep-frying", "炸", ["炸", "油炸", "酥炸", "软炸", "干炸", "酥"]),
]

# 难度评分（综合难度）
METHOD_SCORE = {
    "tossing": 1,
    "boiling": 2,
    "steaming": 3,
    "stewing": 4,
    "pan-frying": 5,
    "stir-frying": 6,
    "smothering": 7,
    "braising": 8,
    "roasting": 9,
    "deep-frying": 10,
}

def detect_method(recipe):
    """根据菜名和步骤关键词判断做法"""
    title = recipe.get("title", "")
    steps = recipe.get("steps", [])
    steps_text = " ".join(steps) if steps else ""
    
    # 优先级：炸 > 烤 > 烧 > 炒 > 煎 > 焖 > 炖 > 蒸 > 站 > 凉拌
    # 从难到易匹配，避免"红烧鱼"被匹配为"煮"
    for method_id, method_label, keywords in reversed(METHOD_ORDER):
        # 菜名关键词优先级更高
        for kw in keywords:
            if kw in title:
                return method_id, method_label
        # 步骤关键词作为补充
        for kw in keywords:
            if kw in steps_text:
                return method_id, method_label
    
    # 默认返回炒（中餐最常见的做法）
    return "stir-frying", "炒"

def calc_sort_score(recipe):
    """
    计算综合排序评分（用于搜索结果排序）
    评分 = 时长因子 + 复杂度因子
    时长因子：timeMinutes 越短越好（简单菜优先）
    复杂度因子：difficulty 越低越好 + method_score 越低越好
    
    返回值越小表示越简单/容易做
    """
    time_minutes = recipe.get("timeMinutes") or 30
    difficulty = recipe.get("difficulty") or 3
    method_score = recipe.get("methodScore") or 6  # 默认炒
    
    # 时长因子：0-60分钟映射为 0-3 分
    time_factor = min(time_minutes / 20, 3)
    
    # 复杂度因子：difficulty(1-5) + method_score(1-10) / 2
    complexity_factor = difficulty + method_score / 2
    
    # 综合评分（越小越简单）
    score = time_factor + complexity_factor
    return round(score, 2)

def main():
    with open(DATA_RECIPES, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    recipes = data["recipes"]
    print(f"菜谱总数: {len(recipes)}")
    
    # 统计各做法数量
    method_counts = {}
    
    for r in recipes:
        method_id, method_label = detect_method(r)
        r["method"] = method_id
        r["methodLabel"] = method_label
        r["methodScore"] = METHOD_SCORE[method_id]
        r["sortScore"] = calc_sort_score(r)
        
        method_counts[method_label] = method_counts.get(method_label, 0) + 1
    
    # 输出统计
    print("\n做法统计:")
    for _, method_label, _ in METHOD_ORDER:
        count = method_counts.get(method_label, 0)
        print(f"  {method_label}: {count}")
    
    # 保存
    with open(DATA_RECIPES, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\n已保存到 {DATA_RECIPES}")

if __name__ == "__main__":
    main()