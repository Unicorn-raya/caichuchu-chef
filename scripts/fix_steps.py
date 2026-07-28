#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复菜谱步骤截断问题：从 markdown 源文件重新解析所有步骤。

问题原因：build-recipes.mjs 中 extractSteps 有 .slice(0, 6) 限制，
导致超过6步的菜谱步骤被截断。

此脚本：
1. 读取现有 recipes.json
2. 对每个菜谱，读取其 sourcePath 指向的 markdown 文件
3. 重新解析 "## 操作" 部分的所有编号步骤
4. 更新 steps 字段
5. 保存

用法: cd caichuchu-chef && python3 scripts/fix_steps.py
"""

import json
import os
import re
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)  # caichuchu-chef
RECIPES_JSON = os.path.join(PROJECT_DIR, "data", "recipes.json")


def extract_all_steps(md_text):
    """从 markdown 中提取 ## 操作 部分的所有编号步骤。

    步骤格式：数字. 文字内容
    只匹配以数字+点开头的行，跳过子项目（- 开头的行）和空行。
    """
    lines = md_text.split("\n")

    # 找到 ## 操作 部分
    in_section = False
    section_lines = []
    for line in lines:
        # 检测二级标题
        m = re.match(r"^##\s+(.+?)\s*$", line)
        if m:
            if in_section:
                # 遇到下一个二级标题，结束操作部分
                break
            if m.group(1).strip() == "操作":
                in_section = True
                continue
        elif in_section:
            section_lines.append(line)

    if not section_lines:
        return None  # 没有找到操作部分

    # 提取编号步骤
    steps = []
    for line in section_lines:
        stripped = line.strip()
        if not stripped:
            continue
        # 匹配 "1. xxx" 格式
        m = re.match(r"^(\d+)\.\s+(.+)$", stripped)
        if m:
            steps.append(m.group(2).strip())

    return steps


def main():
    print("=" * 60)
    print("菜谱步骤修复脚本")
    print("=" * 60)

    # 加载 recipes.json
    print(f"\n加载: {RECIPES_JSON}")
    with open(RECIPES_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)

    recipes = data["recipes"]
    print(f"共 {len(recipes)} 个菜谱")

    fixed_count = 0
    skipped_count = 0
    failed_count = 0

    for i, recipe in enumerate(recipes):
        title = recipe.get("title", "?")
        source_path = recipe.get("sourcePath", "")
        old_steps = recipe.get("steps", [])
        old_count = len(old_steps)

        if not source_path.endswith(".md"):
            skipped_count += 1
            continue

        abs_path = os.path.normpath(os.path.join(PROJECT_DIR, source_path))
        if not os.path.exists(abs_path):
            failed_count += 1
            if i < 5 or i % 50 == 0:
                print(f"  [{i+1}] ✗ {title}: 文件不存在 {abs_path}")
            continue

        try:
            with open(abs_path, "r", encoding="utf-8") as f:
                md_text = f.read()
        except Exception as e:
            failed_count += 1
            continue

        new_steps = extract_all_steps(md_text)
        if new_steps is None:
            # 没有找到操作部分，保留原步骤
            skipped_count += 1
            continue

        if len(new_steps) == old_count:
            # 步骤数没变化，跳过
            skipped_count += 1
            continue

        if len(new_steps) < old_count:
            # 新步骤比旧步骤少，可能是解析问题，保留原步骤
            skipped_count += 1
            if i < 5:
                print(f"  [{i+1}] ⚠ {title}: 新步骤({len(new_steps)})少于旧步骤({old_count})，跳过")
            continue

        # 更新步骤
        recipe["steps"] = new_steps
        fixed_count += 1
        if i < 10 or i % 50 == 0:
            print(f"  [{i+1}] ✓ {title}: {old_count} → {len(new_steps)} 步")

    # 统计
    print(f"\n{'=' * 60}")
    print(f"处理完成:")
    print(f"  修复: {fixed_count}")
    print(f"  跳过: {skipped_count}")
    print(f"  失败: {failed_count}")

    if fixed_count == 0:
        print("\n无需更新。")
        return

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
