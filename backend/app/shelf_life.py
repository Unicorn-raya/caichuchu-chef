"""常见食材保质期数据库（天）

用于冰箱库存的临期/过期红绿灯警示。
数据来源：常见家庭储存经验，冷藏温度下的参考值。
"""

# 食材 -> 冷藏保质期（天）
SHELF_LIFE_DAYS: dict[str, int] = {
    # 叶菜类
    "青菜": 3,
    "菠菜": 2,
    "生菜": 3,
    "白菜": 7,
    "西兰花": 5,
    "芹菜": 7,
    "韭菜": 3,
    "油麦菜": 3,
    "空心菜": 2,
    "茼蒿": 3,
    # 瓜果类
    "西红柿": 7,
    "黄瓜": 5,
    "茄子": 7,
    "辣椒": 7,
    "青椒": 7,
    "冬瓜": 14,
    "南瓜": 14,
    "苦瓜": 7,
    "丝瓜": 5,
    "西葫芦": 7,
    # 根茎类
    "土豆": 30,
    "胡萝卜": 21,
    "白萝卜": 14,
    "洋葱": 30,
    "大蒜": 30,
    "蒜": 30,
    "姜": 30,
    "葱": 7,
    "山药": 30,
    "芋头": 21,
    "莲藕": 7,
    # 菌菇豆制品
    "蘑菇": 5,
    "香菇": 7,
    "金针菇": 5,
    "杏鲍菇": 7,
    "木耳": 30,
    "豆腐": 3,
    "豆干": 7,
    "腐竹": 180,
    # 肉类
    "猪肉": 3,
    "牛肉": 3,
    "羊肉": 3,
    "鸡肉": 2,
    "鸭肉": 2,
    "排骨": 3,
    "五花肉": 3,
    "里脊": 2,
    "鸡翅": 2,
    "鸡腿": 2,
    "鸡胸肉": 2,
    "牛肉末": 2,
    "猪肉末": 2,
    "肉末": 2,
    # 水产
    "鱼": 1,
    "鲈鱼": 1,
    "鲫鱼": 1,
    "虾": 1,
    "小龙虾": 1,
    "螃蟹": 1,
    "带鱼": 2,
    "鱿鱼": 2,
    "蛤蜊": 1,
    # 蛋奶
    "鸡蛋": 30,
    "鸭蛋": 30,
    "鹌鹑蛋": 30,
    "牛奶": 7,
    "酸奶": 7,
    "奶酪": 30,
    "黄油": 30,
    # 主食
    "米饭": 2,
    "面条": 7,
    "挂面": 180,
    "馒头": 5,
    "饺子": 5,
    "包子": 3,
    "面包": 5,
    "面粉": 365,
    "大米": 365,
    # 其他
    "火腿": 14,
    "午餐肉": 14,
    "香肠": 14,
    "腊肉": 90,
    "海带": 180,
    "粉条": 180,
    "花生": 90,
    "玉米": 5,
}

# 默认保质期（未在数据库中的食材）
DEFAULT_SHELF_LIFE_DAYS = 7


def get_shelf_life(ingredient: str) -> int:
    """获取食材的冷藏保质期（天）"""
    return SHELF_LIFE_DAYS.get(ingredient, DEFAULT_SHELF_LIFE_DAYS)


def get_expiry_status(added_at: float, ingredient: str) -> dict:
    """计算食材的过期状态

    返回:
        {
            "daysLeft": 剩余天数,
            "status": "fresh" | "expiring" | "expired",
            "shelfLife": 保质期天数,
        }
    """
    import time

    shelf_life = get_shelf_life(ingredient)
    now = time.time()
    days_passed = (now - added_at) / 86400
    days_left = shelf_life - days_passed

    if days_left < 0:
        status = "expired"
    elif days_left <= 2:
        status = "expiring"
    else:
        status = "fresh"

    return {
        "daysLeft": round(days_left, 1),
        "status": status,
        "shelfLife": shelf_life,
    }
