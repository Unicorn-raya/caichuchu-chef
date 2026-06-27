"""为 recipes.json 中无图菜谱从 Wikipedia/Wikimedia 下载图片。

策略：
1. 主：Wikipedia API 搜索菜名，取页面 thumbnail（页面图片更准）
2. 辅：Wikimedia Commons 直接搜图（覆盖更广）

筛选规则：
- 宽 >= 400，高 >= 300
- 排除 SVG/GIF/Logo/图标
- 优先 jpg/png/jpeg

输出：
- frontend/data/images/{recipe_id}/main.{ext}
- 更新 data/recipes.json 和 frontend/data/recipes.json 的 images 字段
- 输出失败列表到 scripts/wikimedia_failures.json
"""
from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).parent.parent
DATA_RECIPES = ROOT / "data" / "recipes.json"
FRONTEND_RECIPES = ROOT / "frontend" / "data" / "recipes.json"
FRONTEND_IMG_ROOT = ROOT / "frontend" / "data" / "images"
FAILURES_FILE = ROOT / "scripts" / "wikimedia_failures.json"

USER_AGENT = "caichuchu-chef/1.0 (https://github.com/Unicorn-raya/caichuchu-chef; recipe image fetcher)"


def build_queries(title: str) -> list[str]:
    """按优先级生成搜索关键词变体。"""
    base = title.strip()
    queries = [
        base,                  # 1. 纯菜名
        f"{base} 菜",          # 2. 加"菜"
        f"{base} 美食",        # 3. 加"美食"
        f"{base} 中餐",        # 4. 加"中餐"
        f"{base} dish",        # 5. 英文
        f"{base} food",        # 6. 英文 food
    ]
    # 去重保序
    seen = set()
    out = []
    for q in queries:
        if q not in seen:
            seen.add(q)
            out.append(q)
    return out


def http_get_json(url: str, timeout: int = 15) -> dict | None:
    """带 429 重试的 GET JSON。"""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 2:
                wait = 10 * (attempt + 1)
                print(f"  429 限流，等待 {wait}s 重试…")
                time.sleep(wait)
                continue
            print(f"  HTTP 错误: {e}")
            return None
        except Exception as e:
            print(f"  请求失败: {e}")
            return None
    return None


def http_download(url: str, dest_path: Path, timeout: int = 30) -> bool:
    """下载二进制到本地。"""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = resp.read()
            if len(data) < 5 * 1024:  # 小于 5KB 视为无效
                return False
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            with open(dest_path, "wb") as f:
                f.write(data)
            return True
    except Exception as e:
        print(f"  下载失败: {e}")
        return False


def search_wikipedia(query: str) -> dict | None:
    """用中文 Wikipedia API 搜索，返回带 thumbnail 的页面。"""
    api = "https://zh.wikipedia.org/w/api.php"
    params = {
        "action": "query",
        "generator": "search",
        "gsrsearch": query,
        "gsrlimit": "8",
        "prop": "pageimages",
        "piprop": "thumbnail|name",
        "pithumbsize": "800",
        "format": "json",
        "origin": "*",
    }
    url = api + "?" + urllib.parse.urlencode(params)
    return http_get_json(url)


def search_commons(query: str) -> dict | None:
    """用 Wikimedia Commons API 搜索文件。"""
    api = "https://commons.wikimedia.org/w/api.php"
    params = {
        "action": "query",
        "generator": "search",
        "gsrsearch": f"filetype:bitmap {query}",
        "gsrnamespace": "6",
        "gsrlimit": "10",
        "prop": "imageinfo",
        "iiprop": "url|size|mime|metadata",
        "iiurlwidth": "800",
        "format": "json",
        "origin": "*",
    }
    url = api + "?" + urllib.parse.urlencode(params)
    return http_get_json(url)


def pick_from_wikipedia(data: dict | None, recipe_title: str) -> dict | None:
    """从 Wikipedia 搜索结果挑一张合适的 thumbnail。

    相关性判断：page title 与 recipe_title 至少共享 2 个非通用汉字。
    通用汉字：的色香味菜肴饮食中国中华等。
    """
    if not data or "query" not in data:
        return None
    pages = data["query"].get("pages", {})
    sorted_pages = sorted(pages.values(), key=lambda p: p.get("index", 999))
    # 通用字符集（不参与相关性判断）
    COMMON_CHARS = set("的色香味菜肴饮食中国中华之道与和及系列文化特色传统")
    candidates = []
    for page in sorted_pages:
        thumb = page.get("thumbnail")
        if not thumb:
            continue
        source = thumb.get("source", "")
        width = thumb.get("width", 0)
        height = thumb.get("height", 0)
        if width < 400 or height < 300:
            continue
        src_lower = source.lower()
        if any(x in src_lower for x in ["logo", "icon", "flag", "emblem"]):
            continue
        if ".pdf" in src_lower or ".svg" in src_lower:
            continue
        page_title = page.get("title", "")
        # 计算 title 与 recipe_title 的共享汉字数（排除通用字符）
        title_chars = set(page_title) - COMMON_CHARS
        recipe_chars = set(recipe_title) - COMMON_CHARS
        common_chars = title_chars & recipe_chars
        common_count = len(common_chars)
        # 相关性阈值：至少共享 2 个非通用汉字
        # 但对于短菜名（<= 3 字），共享 1 个核心字也接受
        threshold = 2 if len(recipe_chars) >= 3 else 1
        if common_count < threshold:
            continue
        candidates.append({
            "title": page_title,
            "thumb_url": source,
            "width": width,
            "height": height,
            "source": "wikipedia",
            "desc_url": page.get("fullurl", ""),
            "common_count": common_count,
            "search_index": page.get("index", 999),
        })
    if not candidates:
        return None
    # 优先共享字符最多的，其次按搜索 index（更靠前）
    candidates.sort(key=lambda p: (-p["common_count"], p["search_index"]))
    return candidates[0]


def pick_from_commons(data: dict | None) -> dict | None:
    """从 Commons 搜索结果挑一张合适的图片。"""
    if not data or "query" not in data:
        return None
    pages = data["query"].get("pages", {})
    candidates = []
    # 文件名黑名单：明显非菜品图
    FILENAME_BLACKLIST = [
        "icon", "logo", "diagram", "map.", "flag", "emblem",
        "design", "painting", "illustration", "drawing", "engraving",
        "lithograph", "print", "book", "magazine", "theatre", "theatrical",
        "wdl", "poster", "art.", "artwork", "scan", "page", "manuscript",
        "title", "cover", "label", "card", "advertisement",
    ]
    for page_id, page in pages.items():
        imageinfo = page.get("imageinfo", [])
        if not imageinfo:
            continue
        info = imageinfo[0]
        mime = info.get("mime", "")
        if mime not in ("image/jpeg", "image/png", "image/webp"):
            continue
        width = info.get("width", 0)
        height = info.get("height", 0)
        if width < 400 or height < 300:
            continue
        ratio = max(width, height) / max(min(width, height), 1)
        if ratio > 2.5:
            continue
        thumb_url = info.get("thumburl") or info.get("url")
        if not thumb_url:
            continue
        title_lower = page.get("title", "").lower()
        if any(x in title_lower for x in FILENAME_BLACKLIST):
            continue
        candidates.append({
            "title": page.get("title", ""),
            "thumb_url": thumb_url,
            "width": width,
            "height": height,
            "mime": mime,
            "source": "commons",
            "desc_url": info.get("descriptionurl", ""),
        })
    if not candidates:
        return None
    def score(c):
        w, h = c["width"], c["height"]
        w_score = abs(w - 1000) if w > 1000 else abs(w - 600)
        h_score = abs(h - 750) if h > 750 else abs(h - 450)
        return w_score + h_score
    candidates.sort(key=score)
    return candidates[0]


def ext_from_url(url: str) -> str:
    """从 URL 推断扩展名。"""
    path = urllib.parse.urlparse(url).path
    ext = os.path.splitext(path)[1].lower()
    if ext in (".jpg", ".jpeg", ".png", ".webp"):
        return ext
    return ".jpg"


def find_image_for_recipe(title: str) -> dict | None:
    """对一道菜尝试多个 query，找到第一张合适的图片。"""
    for q in build_queries(title):
        # 优先 Wikipedia
        wiki_data = search_wikipedia(q)
        chosen = pick_from_wikipedia(wiki_data, title)
        if chosen:
            print(f"  ✓ [wiki] Q={q!r}: {chosen['title'][:50]} ({chosen['width']}x{chosen['height']})")
            return chosen
        time.sleep(0.3)
        # Fallback Commons
        commons_data = search_commons(q)
        chosen = pick_from_commons(commons_data)
        if chosen:
            print(f"  ✓ [commons] Q={q!r}: {chosen['title'][:50]} ({chosen['width']}x{chosen['height']})")
            return chosen
        time.sleep(0.3)
    return None


def main():
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    with open(DATA_RECIPES, "r", encoding="utf-8") as f:
        data = json.load(f)
    recipes = data["recipes"]

    no_img_recipes = [r for r in recipes if not r.get("images")]
    if limit > 0:
        no_img_recipes = no_img_recipes[:limit]
    print(f"共 {len(no_img_recipes)} 道无图菜谱需要处理")

    successes = []
    failures = []
    for i, r in enumerate(no_img_recipes, 1):
        rid = r["id"]
        title = r["title"]
        print(f"\n[{i}/{len(no_img_recipes)}] {title} ({rid})")

        chosen = find_image_for_recipe(title)
        if not chosen:
            print(f"  ✗ 未找到合适图片")
            failures.append({"id": rid, "title": title, "reason": "no_match"})
            time.sleep(1.0)
            continue

        ext = ext_from_url(chosen["thumb_url"])
        dest = FRONTEND_IMG_ROOT / rid / f"main{ext}"
        if http_download(chosen["thumb_url"], dest):
            r["images"] = [f"/data/images/{rid}/main{ext}"]
            successes.append({"id": rid, "title": title, "url": chosen.get("desc_url", "")})
            print(f"  ✓ 保存到 {dest.relative_to(ROOT)}")
        else:
            failures.append({"id": rid, "title": title, "reason": "download_failed"})

        time.sleep(1.0)

    # 保存更新后的 recipes.json
    with open(DATA_RECIPES, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    FRONTEND_RECIPES.parent.mkdir(parents=True, exist_ok=True)
    with open(FRONTEND_RECIPES, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    with open(FAILURES_FILE, "w", encoding="utf-8") as f:
        json.dump({"successes": len(successes), "failures": failures}, f, ensure_ascii=False, indent=2)

    print(f"\n========== 完成 ==========")
    print(f"成功: {len(successes)}")
    print(f"失败: {len(failures)}")
    if failures:
        print(f"失败列表见: {FAILURES_FILE.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
