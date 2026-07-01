#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
迁移脚本：从 chinese_home_recipes_downloads 的 markdown 源文件中补充菜谱内容。

补充内容：
1. 简介（description）：markdown 开头的描述段落
2. 食材用量（quantities）：## 计算 章节中的每份用量，映射到食材名
3. 附加内容（tips）：## 附加内容 章节的贴士列表

用法：
    cd caichuchu-chef
    python3 scripts/migrate_recipe_content.py
"""

import json
import os
import re
import sys

# 路径配置
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)  # caichuchu-chef
RECIPES_JSON = os.path.join(PROJECT_DIR, "data", "recipes.json")
# sourcePath 是相对于 data/ 的路径：../chinese_home_recipes_downloads/...
DATA_DIR = os.path.join(PROJECT_DIR, "data")


def parse_markdown_sections(md_text):
    """将 markdown 按 ## 标题切分为多个章节。返回 dict: {section_name: [lines]}"""
    sections = {}
    current_section = "_intro"
    current_lines = []
    for line in md_text.split("\n"):
        # 检测二级标题
        m = re.match(r"^##\s+(.+?)\s*$", line)
        if m:
            if current_lines:
                sections[current_section] = current_lines
            current_section = m.group(1).strip()
            current_lines = []
        else:
            current_lines.append(line)
    if current_lines:
        sections[current_section] = current_lines
    return sections


def extract_description(intro_lines):
    """从 intro 章节提取简介段落。

    跳过：标题(# xxx)、图片(![xxx](xxx))、预估烹饪难度、预估卡路里、空行。
    取第一个实质性段落。
    """
    paragraphs = []
    current_para = []
    for line in intro_lines:
        stripped = line.strip()
        if not stripped:
            if current_para:
                paragraphs.append(current_para)
                current_para = []
            continue
        # 跳过一级标题
        if stripped.startswith("# ") and not stripped.startswith("## "):
            continue
        # 跳过图片
        if stripped.startswith("!["):
            continue
        # 跳过预估难度/卡路里
        if stripped.startswith("预估烹饪难度") or stripped.startswith("预估卡路里"):
            continue
        # 跳过引用链接行
        if stripped.startswith(">") :
            continue
        current_para.append(stripped)

    if current_para:
        paragraphs.append(current_para)

    # 取最长的实质性段落作为简介
    if not paragraphs:
        return ""
    best = max(paragraphs, key=lambda p: sum(len(s) for s in p))
    return " ".join(best).strip()


def parse_calculation_section(calc_lines):
    """解析 ## 计算 章节，返回 list of (name, quantity) 元组。

    每行格式：- 食材名 用量
    或：* 食材名 用量
    """
    entries = []
    for line in calc_lines:
        stripped = line.strip()
        if not stripped:
            continue
        # 匹配列表项
        m = re.match(r"^[-*]\s+(.+)$", stripped)
        if not m:
            continue
        content = m.group(1).strip()
        # 跳过说明性文字（不是食材条目）
        if content.startswith("每次制作") or content.startswith("一份正好") or content.startswith("注：") or content.startswith("使用上述"):
            continue

        # 尝试分离食材名和用量
        # 用量通常以数字开头，或者以括号开头
        # 找到第一个数字的位置
        name = content
        quantity = ""
        # 找第一个数字或全角数字或括号
        match = re.search(r"[\d０-９（(]", content)
        if match:
            split_pos = match.start()
            name = content[:split_pos].strip()
            quantity = content[split_pos:].strip()
            # 去掉用量末尾的备注括号（如 "（不太喜欢重口的可以不放）"）保留主要用量
            # 但如果整个用量就是一个括号备注，保留它

        # 处理 "小葱挽成结" 这种没有用量的情况
        if not quantity:
            # 没有用量信息，跳过
            continue

        entries.append((name, quantity))
    return entries


def parse_tips_section(tips_lines):
    """解析 ## 附加内容 章节，返回 list of tips 字符串。"""
    tips = []
    for line in tips_lines:
        stripped = line.strip()
        if not stripped:
            continue
        # 匹配列表项
        m = re.match(r"^[-*]\s+(.+)$", stripped)
        if m:
            tips.append(m.group(1).strip())
        # 跳过非列表项（如 "如果您遵循..." ）
    return tips


def match_quantity_to_ingredient(ingredient_name, quantity_entries):
    """将食材名匹配到计算条目。

    匹配策略：
    1. 精确匹配
    2. 食材名以条目名开头（如 "醋（推荐镇江香醋）" 匹配 "醋"）
    3. 条目名以食材名开头
    4. 食材名包含条目名
    """
    # 去掉食材名中的括号备注
    clean_ing = re.sub(r"[（(].*?[)）]", "", ingredient_name).strip()

    for name, qty in quantity_entries:
        # 精确匹配
        if clean_ing == name or ingredient_name == name:
            return qty
        # 食材名以条目名开头
        if clean_ing.startswith(name) and len(name) >= 1:
            return qty
        # 条目名以食材名开头
        if name.startswith(clean_ing) and len(clean_ing) >= 1:
            return qty
        # 包含关系
        if name in clean_ing or clean_ing in name:
            return qty
    return None


def process_recipe(recipe):
    """处理单个菜谱，补充 description、quantities、tips 字段。"""
    source_path = recipe.get("sourcePath", "")
    if not source_path.endswith(".md"):
        return recipe, False, "no md source"

    # 解析 markdown 文件路径（sourcePath 相对于 caichuchu-chef/ 目录）
    abs_path = os.path.normpath(os.path.join(PROJECT_DIR, source_path))
    if not os.path.exists(abs_path):
        return recipe, False, f"file not found: {abs_path}"

    try:
        with open(abs_path, "r", encoding="utf-8") as f:
            md_text = f.read()
    except Exception as e:
        return recipe, False, f"read error: {e}"

    # 切分章节
    sections = parse_markdown_sections(md_text)

    # 提取简介
    intro_lines = sections.get("_intro", [])
    description = extract_description(intro_lines)

    # 提取计算条目
    calc_lines = sections.get("计算", [])
    quantity_entries = parse_calculation_section(calc_lines)

    # 将用量匹配到食材
    quantities = {}
    all_ingredients = (
        recipe.get("requiredIngredients", [])
        + recipe.get("coreIngredients", [])
        + recipe.get("seasonings", [])
        + recipe.get("optionalIngredients", [])
    )
    for ing in all_ingredients:
        qty = match_quantity_to_ingredient(ing, quantity_entries)
        if qty:
            quantities[ing] = qty

    # 提取附加内容
    tips_lines = sections.get("附加内容", [])
    tips = parse_tips_section(tips_lines)

    # 更新菜谱
    recipe["description"] = description
    recipe["quantities"] = quantities
    recipe["tips"] = tips

    return recipe, True, f"desc={len(description)}c, qty={len(quantities)}, tips={len(tips)}"


def main():
    print("=" * 60)
    print("菜谱内容迁移脚本")
    print("=" * 60)

    # 加载 recipes.json
    print(f"\n加载: {RECIPES_JSON}")
    with open(RECIPES_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)

    recipes = data["recipes"]
    print(f"共 {len(recipes)} 个菜谱")

    success_count = 0
    fail_count = 0
    skip_count = 0

    for i, recipe in enumerate(recipes):
        recipe, ok, msg = process_recipe(recipe)
        if ok:
            success_count += 1
            if i < 3 or i % 50 == 0:
                print(f"  [{i+1}] ✓ {recipe['title']}: {msg}")
        else:
            fail_count += 1
            print(f"  [{i+1}] ✗ {recipe.get('title', '?')}: {msg}")

    # 统计
    has_desc = sum(1 for r in recipes if r.get("description"))
    has_qty = sum(1 for r in recipes if r.get("quantities"))
    has_tips = sum(1 for r in recipes if r.get("tips"))

    print(f"\n{'=' * 60}")
    print(f"处理完成:")
    print(f"  成功: {success_count}")
    print(f"  失败: {fail_count}")
    print(f"  有简介: {has_desc}/{len(recipes)}")
    print(f"  有用量: {has_qty}/{len(recipes)}")
    print(f"  有贴士: {has_tips}/{len(recipes)}")

    # 备份原文件
    backup_path = RECIPES_JSON + ".bak"
    if not os.path.exists(backup_path):
        import shutil
        shutil.copy2(RECIPES_JSON, backup_path)
        print(f"\n已备份原文件到: {backup_path}")

    # 保存
    print(f"\n保存到: {RECIPES_JSON}")
    with open(RECIPES_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("完成!")


if __name__ == "__main__":
    main()
