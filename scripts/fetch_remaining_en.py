"""为剩余无图菜谱用英文关键词补充搜索图片。

针对 fetch_wikimedia_images.py 未命中的菜，用英文翻译再搜一轮。
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).parent.parent
DATA_RECIPES = ROOT / "data" / "recipes.json"
FRONTEND_RECIPES = ROOT / "frontend" / "data" / "recipes.json"
FRONTEND_IMG_ROOT = ROOT / "frontend" / "data" / "images"
FAILURES_FILE = ROOT / "scripts" / "wikimedia_failures.json"

# 菜名 -> 英文关键词映射（针对剩余 88 道菜）
ENGLISH_QUERIES = {
    # 水产
    "微波葱姜黑鳕鱼": ["pan seared cod", "black cod dish", "cod fillet"],
    "清蒸生蚝": ["steamed oyster", "oyster dish", "raw oyster"],
    "红烧鱼头": ["braised fish head", "fish head stew", "fish head"],
    "酱炖蟹": ["braised crab", "crab stew", "crab dish"],
    # 早餐
    "太阳蛋": ["sunny side up egg", "fried egg", "egg breakfast"],
    "完美水煮蛋": ["boiled egg", "soft boiled egg", "hard boiled egg"],
    "微波炉荷包蛋": ["poached egg", "fried egg"],
    "微波炉蒸蛋": ["steamed egg", "egg custard", "chawanmushi"],
    "意式香肠北非蛋": ["shakshuka", "egg tomato dish", "italian sausage egg"],
    "手抓饼": ["scallion pancake", "chinese pancake", "hand torn pancake"],
    "桂圆红枣粥": ["red date porridge", "congee", "rice porridge"],
    "燕麦鸡蛋饼": ["oat egg pancake", "oatmeal pancake"],
    "空气炸锅面包片": ["toast", "bread toast", "french toast"],
    "蒸花卷": ["hua juan", "steamed flower roll", "steamed bun roll"],
    "蛋煎糍粑": ["fried rice cake", "cilaba", "rice cake egg"],
    "韩国麻药鸡蛋": ["korean marinated egg", "mayak eggs", "soy marinated egg"],
    # 调料
    "炸串酱料": ["chinese dipping sauce", "chili sauce", "satay sauce"],
    "简易版炒糖色": ["caramelized sugar", "burnt sugar", "sugar caramel"],
    "蒜香酱油": ["garlic soy sauce", "soy sauce", "chinese sauce"],
    # 甜点
    "红柚蛋糕": ["pomelo cake", "citrus cake", "fruit cake"],
    "魔芋蛋糕": ["konjac cake", "sponge cake"],
    # 饮品
    "可乐桶": ["cola drink", "cola glass", "soda drink"],
    "牛油果拉西": ["avocado lassi", "avocado smoothie", "lassi"],
    "酸梅汤（半成品加工）": ["sour plum drink", "sour plum soup", "plum juice"],
    # 肉菜
    "乡村啤酒鸭": ["beer duck", "braised duck", "duck stew"],
    "冷吃兔": ["cold rabbit dish", "spicy rabbit", "rabbit meat"],
    "商芝肉": ["braised pork", "red braised pork", "dongpo pork"],
    "姜葱捞鸡": ["ginger scallion chicken", "white cut chicken", "cold chicken"],
    "小米辣炒肉": ["spicy stir fry pork", "chili pork", "sichuan pork"],
    "尖椒炒牛肉": ["pepper beef", "green pepper beef", "beef stir fry"],
    "山西过油肉": ["shanxi fried pork", "twice fried pork", "chinese pork"],
    "椒盐排条": ["salt pepper pork ribs", "fried pork strips", "jiaoyan pork"],
    "洋葱炒猪肉": ["onion pork stir fry", "pork onion", "chinese pork"],
    "煎烤羊排": ["lamb chops", "grilled lamb", "pan fried lamb"],
    "猪肉烩酸菜": ["pork sauerkraut stew", "pork stew", "chinese stew"],
    "甜辣烤全翅": ["sweet chili chicken wings", "roasted wings", "chicken wings"],
    "白菜猪肉炖粉条": ["pork cabbage vermicelli", "chinese stew", "northeast dish"],
    "红烧鸡翅": ["braised chicken wings", "soy chicken wings", "chinese wings"],
    "肉饼炖蛋": ["meat pie egg", "steamed meat egg", "chinese dish"],
    "萝卜炖羊排": ["lamb radish stew", "lamb ribs stew", "lamb soup"],
    "蒜苔炒肉末": ["garlic sprout pork", "chinese stir fry", "minced pork"],
    "虎皮肘子": ["tiger skin pork trotter", "braised pork trotter", "pork knuckle"],
    "西红柿牛腩": ["tomato beef brisket", "beef tomato stew", "chinese beef"],
    "香干肉丝": ["dried tofu pork", "tofu strips pork", "chinese stir fry"],
    "黄油鸡": ["butter chicken", "indian butter chicken", "chicken curry"],
    # 主食/半成品
    "半成品意面": ["pasta", "spaghetti", "italian pasta"],
    "牛油火锅底料": ["hotpot base", "sichuan hotpot", "spicy soup base"],
    "速冻水饺": ["frozen dumplings", "chinese dumplings", "jiaozi"],
    "速冻馄饨": ["frozen wonton", "wonton soup", "chinese wonton"],
    # 汤
    "排骨山药玉米汤": ["pork rib soup", "chinese soup", "rib soup"],
    "排骨苦瓜汤": ["bitter melon rib soup", "pork rib soup", "chinese soup"],
    "紫菜蛋花汤": ["seaweed egg soup", "egg drop soup", "chinese soup"],
    "西红柿鸡蛋汤": ["tomato egg soup", "chinese soup", "egg drop soup"],
    "黄瓜皮蛋汤": ["cucumber century egg soup", "chinese soup", "egg soup"],
    # 主食
    "中式馅饼": ["chinese meat pie", "xianbing", "chinese pie"],
    "利提巧卡": ["roti canai", "indian flatbread", "paratha"],
    "印度烤饼": ["naan", "indian bread", "tandoori bread"],
    "印度焖饭": ["biryani", "indian rice", "spiced rice"],
    "手工水饺": ["chinese dumplings", "jiaozi", "boiled dumplings"],
    "照烧鸡腿饭": ["teriyaki chicken rice", "japanese rice bowl", "chicken rice"],
    "煮泡面加蛋": ["instant noodles egg", "ramen egg", "noodle soup"],
    "红芸豆拌饭": ["red bean rice", "bibimbap", "korean rice"],
    "老干妈拌面": ["chili oil noodles", "laoganma noodles", "chinese noodles"],
    "蒸卤面": ["steamed braised noodles", "chinese noodles", "henan noodles"],
    "豆角焖面": ["braised green bean noodles", "chinese noodles", "stewed noodles"],
    "酸辣蕨根粉": ["spicy fern noodles", "chinese cold noodles", "fern root"],
    "醪糟小汤圆": ["rice wine tangyuan", "sweet dumpling soup", "glutinous rice ball"],
    "鲜肉烧卖": ["pork shumai", "shaomai", "chinese dumpling"],
    "麻油拌面": ["sesame oil noodles", "chinese noodles", "cold noodles"],
    "麻辣减脂荞麦面": ["buckwheat noodles", "soba noodles", "spicy noodles"],
    # 蔬菜
    "凉拌油麦菜": ["cold lettuce salad", "chinese vegetable", "cold dish"],
    "印度土豆花菜": ["indian potato cauliflower", "aloo gobi", "indian curry"],
    "印度葫芦丸子": ["lauki kofta", "indian curry", "bottle gourd"],
    "松仁玉米": ["pine nut corn", "sweet corn dish", "chinese vegetable"],
    "水油焖蔬菜": ["braised vegetables", "chinese vegetables", "stewed greens"],
    "油醋爆蛋": ["vinegar egg", "chinese egg", "fried egg"],
    "清炒花菜": ["stir fried cauliflower", "cauliflower dish", "chinese vegetable"],
    "清蒸南瓜": ["steamed pumpkin", "pumpkin dish", "squash"],
    "素炒豆角": ["stir fried green beans", "chinese vegetable", "string bean"],
    "蒜蓉西兰花": ["garlic broccoli", "broccoli garlic", "steamed broccoli"],
    "蒲烧茄子": ["grilled eggplant", "braised eggplant", "chinese eggplant"],
    "蚝油生菜": ["oyster sauce lettuce", "lettuce oyster sauce", "chinese greens"],
    "酸辣土豆丝": ["hot sour shredded potato", "chinese potato", "shredded potato"],
    "金针菇日本豆腐煲": ["enoki mushroom tofu claypot", "japanese tofu", "chinese stew"],
    "金钱蛋": ["money egg", "fried egg", "chinese egg"],
    "陕北熬豆角": ["braised green beans", "chinese vegetable", "northern dish"],
    "雷椒皮蛋": ["century egg pepper", "chinese cold dish", "preserved egg"],
    "鸡蛋火腿炒黄瓜": ["egg ham cucumber stir fry", "chinese stir fry", "cucumber dish"],
}


def main():
    # 导入主脚本的函数
    sys.path.insert(0, str(ROOT / "scripts"))
    from fetch_wikimedia_images import (
        search_wikipedia, search_commons,
        pick_from_wikipedia, pick_from_commons,
        http_download, ext_from_url,
    )

    with open(DATA_RECIPES, "r", encoding="utf-8") as f:
        data = json.load(f)
    recipes = data["recipes"]

    # 找出仍无图的菜
    no_img_recipes = [r for r in recipes if not r.get("images")]
    print(f"仍无图菜谱: {len(no_img_recipes)}")

    successes = []
    failures = []
    for i, r in enumerate(no_img_recipes, 1):
        rid = r["id"]
        title = r["title"]
        english_queries = ENGLISH_QUERIES.get(title, [])
        if not english_queries:
            failures.append({"id": rid, "title": title, "reason": "no_english_query"})
            continue

        print(f"\n[{i}/{len(no_img_recipes)}] {title} ({rid})")
        chosen = None
        for q in english_queries:
            # 先 Wikipedia
            wiki_data = search_wikipedia(q)
            chosen = pick_from_wikipedia(wiki_data, title)
            if chosen:
                print(f"  ✓ [wiki] Q={q!r}: {chosen['title'][:50]} ({chosen['width']}x{chosen['height']})")
                break
            time.sleep(0.3)
            # 再 Commons
            commons_data = search_commons(q)
            chosen = pick_from_commons(commons_data)
            if chosen:
                print(f"  ✓ [commons] Q={q!r}: {chosen['title'][:50]} ({chosen['width']}x{chosen['height']})")
                break
            time.sleep(0.3)

        if not chosen:
            print(f"  ✗ 未找到合适图片")
            failures.append({"id": rid, "title": title, "reason": "no_match"})
            time.sleep(1.0)
            continue

        ext = ext_from_url(chosen["thumb_url"])
        dest = FRONTEND_IMG_ROOT / rid / f"main{ext}"
        if http_download(chosen["thumb_url"], dest):
            r["images"] = [f"/data/images/{rid}/main{ext}"]
            successes.append({"id": rid, "title": title})
            print(f"  ✓ 保存到 {dest.relative_to(ROOT)}")
        else:
            failures.append({"id": rid, "title": title, "reason": "download_failed"})
        time.sleep(1.0)

    # 保存更新后的 recipes.json
    with open(DATA_RECIPES, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    with open(FRONTEND_RECIPES, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # 合并失败列表
    with open(FAILURES_FILE, "w", encoding="utf-8") as f:
        json.dump({"successes": len(successes), "failures": failures}, f, ensure_ascii=False, indent=2)

    print(f"\n========== 补充完成 ==========")
    print(f"成功: {len(successes)}")
    print(f"失败: {len(failures)}")


if __name__ == "__main__":
    main()
