/* ============================================
   chef-cn.skill — 中式烹饪技巧
   猪肉、牛肉、羊肉、鸡肉的去腥与腌制方法
   ============================================ */

const CHEF_CN_SKILL = {
  name: "chef-cn",
  description: "中式烹饪核心技巧：肉类的去腥与腌制",

  // 肉类去腥腌制规则
  meatRules: [
    {
      meat: "猪肉",
      keywords: ["猪肉", "五花肉", "瘦肉", "排骨", "里脊", "前腿肉", "后腿肉", "梅花肉", "肉末", "肉馅"],
      deodorize: {
        method: "八角 + 姜 + 料酒",
        detail: "猪肉用八角、姜片和料酒去腥效果最佳。焯水时加入八角和姜片，可以有效去除猪肉的腥味。炒制时用料酒沿锅边淋入，利用高温挥发腥味。",
        tips: [
          "焯水时冷水下锅，加八角 2-3 颗、姜片 3-4 片、料酒 1 勺",
          "炒制时料酒沿锅边淋入，不要直接倒在肉上",
          "炖煮时加入八角，可使猪肉更加香浓",
        ],
      },
      marinate: {
        method: "生抽 + 料酒 + 淀粉",
        detail: "猪肉腌制用生抽提鲜、料酒去腥、淀粉锁水。切片后腌制 10-15 分钟，口感更嫩滑。",
        tips: [
          "肉丝/肉片加 1 勺生抽、半勺料酒、1 勺淀粉，抓匀腌 10 分钟",
          "淀粉可以锁住肉汁，炒出来更嫩",
          "加少许蛋清可以让肉片更加滑嫩",
        ],
      },
    },
    {
      meat: "牛肉",
      keywords: ["牛肉", "牛腩", "牛排", "牛里脊", "牛腱", "肥牛", "牛柳", "牛肉末"],
      deodorize: {
        method: "黑胡椒 + 姜葱水",
        detail: "牛肉用黑胡椒和姜葱水去腥效果最佳。黑胡椒不仅能去腥，还能提升牛肉的香气。姜葱水浸泡可以渗透去腥，比直接用料酒更温和。",
        tips: [
          "姜丝 + 葱段泡温水 10 分钟，制成姜葱水，用于浸泡牛肉",
          "腌制时加适量黑胡椒碎，去腥同时增香",
          "焯水时加姜片和料酒，撇去浮沫",
        ],
      },
      marinate: {
        method: "黑胡椒 + 生抽 + 小苏打",
        detail: "牛肉腌制用黑胡椒提香、生抽调味、小苏打嫩化纤维。小苏打是牛肉嫩化的关键，但不可过量（少许即可），否则会有碱味。",
        tips: [
          "牛肉片加半勺小苏打、1 勺生抽、适量黑胡椒、1 勺淀粉，抓匀腌 15-20 分钟",
          "小苏打用量极少（约 1/4 茶匙配 250g 牛肉），过多会发苦",
          "逆纹理切牛肉，口感更嫩",
          "腌制时加少许食用油，可锁住水分",
        ],
      },
    },
    {
      meat: "羊肉",
      keywords: ["羊肉", "羊排", "羊腿", "羊腩", "羊肉卷", "羊蝎子"],
      deodorize: {
        method: "草寇 + 花椒 + 白萝卜",
        detail: "羊肉用草寇去腥是传统做法，草寇能有效压制羊肉的膻味。搭配花椒和白萝卜，去膻效果更佳。焯水时加入草寇和花椒，炖煮时加白萝卜。",
        tips: [
          "焯水时加草寇 2-3 颗、花椒 10 粒、姜片 3 片",
          "炖羊肉时加白萝卜块，萝卜能吸收膻味",
          "孜然粉也是去羊膻的好帮手，炒制时撒入",
          "羊肉汤中加少许香菜，可进一步去膻提鲜",
        ],
      },
      marinate: {
        method: "孜然 + 料酒 + 洋葱",
        detail: "羊肉腌制用孜然去膻增香、料酒去腥、洋葱提鲜。洋葱的硫化物能中和羊肉的膻味，孜然是羊肉的经典搭配。",
        tips: [
          "羊肉片加 1 勺孜然粉、1 勺料酒、洋葱丝，腌 20 分钟",
          "烤羊肉串前用孜然粉和辣椒粉腌制，风味更佳",
          "洋葱切丝与羊肉一起腌制，去膻效果翻倍",
        ],
      },
    },
    {
      meat: "鸡肉",
      keywords: ["鸡肉", "鸡腿", "鸡翅", "鸡胸肉", "鸡块", "整鸡", "三黄鸡", "土鸡", "鸡丁"],
      deodorize: {
        method: "姜 + 葱 + 料酒",
        detail: "鸡肉用姜、葱、料酒去腥是经典三件套。姜的姜辣素能去腥，葱的挥发油能提香，料酒帮助溶解腥味物质。焯水时加入这三样，效果最佳。",
        tips: [
          "焯水时冷水下锅，加姜片 3-4 片、葱段 2 根、料酒 1 勺",
          "蒸鸡时在鸡肚内塞姜片和葱段，去腥更彻底",
          "炒鸡块前用姜葱水浸泡 10 分钟，去腥效果更好",
        ],
      },
      marinate: {
        method: "生抽 + 料酒 + 姜汁",
        detail: "鸡肉腌制用生抽调味、料酒去腥、姜汁渗透去腥。姜汁比姜丝效果更好，能更均匀地包裹鸡肉。",
        tips: [
          "鸡肉加 1 勺生抽、半勺料酒、姜汁（姜末挤汁），腌 15-20 分钟",
          "鸡胸肉腌制时加少许淀粉和蛋清，口感更嫩",
          "烤鸡翅前用叉子扎几个孔，腌料更易渗透",
          "加少许蚝油可以提升鸡肉的鲜味",
        ],
      },
    },
  ],

  // 通用烹饪技巧
  generalTips: [
    { trigger: "焯水", tip: "焯水要冷水下锅，热水下锅会使肉类表面迅速收缩，血水锁在里面出不来了。" },
    { trigger: "炒", tip: "炒肉时要热锅凉油，先炒香调料再下肉，这样肉不粘锅且更香。" },
    { trigger: "炖", tip: "炖肉要大火烧开后转小火慢炖，保持微沸状态，肉质更酥烂。" },
    { trigger: "蒸", tip: "蒸菜要水开后再放入，大火足汽，蒸出来的菜口感更好。" },
    { trigger: "煎", tip: "煎制时不要频繁翻动，等一面定型后再翻，外皮更酥脆。" },
    { trigger: "炸", tip: "炸制要控制油温，五六成热下锅炸至金黄，复炸一次更酥脆。" },
  ],

  // 匹配菜谱中涉及的肉类
  matchMeats(ingredients, steps) {
    const text = [...(ingredients || []), ...(steps || [])].join(" ");
    const matched = [];
    for (const rule of this.meatRules) {
      if (rule.keywords.some((kw) => text.includes(kw))) {
        matched.push(rule);
      }
    }
    return matched;
  },

  // 匹配通用技巧
  matchGeneralTips(steps) {
    const text = (steps || []).join(" ");
    return this.generalTips.filter((t) => text.includes(t.trigger));
  },

  // 为菜谱生成建议
  generateAdvice(recipe) {
    const ingredients = [
      ...(recipe.coreIngredients || []),
      ...(recipe.requiredIngredients || []),
      ...(recipe.seasonings || []),
    ];
    const steps = recipe.steps || [];

    const matchedMeats = this.matchMeats(ingredients, steps);
    const generalTips = this.matchGeneralTips(steps);

    const advices = [];

    // 肉类去腥腌制建议
    for (const meat of matchedMeats) {
      // 检查步骤中是否涉及去腥/焯水/腌制
      const stepText = steps.join(" ");
      const needDeodorize = /焯水|去腥|去血|去膻|飞水/.test(stepText) || !stepText.includes("腌制");
      const needMarinate = /腌制|腌/.test(stepText) || stepText.length === 0;

      if (needDeodorize) {
        advices.push({
          type: "deodorize",
          meat: meat.meat,
          title: `${meat.meat}去腥技巧：${meat.deodorize.method}`,
          detail: meat.deodorize.detail,
          tips: meat.deodorize.tips,
        });
      }

      if (needMarinate) {
        advices.push({
          type: "marinate",
          meat: meat.meat,
          title: `${meat.meat}腌制技巧：${meat.marinate.method}`,
          detail: meat.marinate.detail,
          tips: meat.marinate.tips,
        });
      }
    }

    // 通用技巧
    for (const tip of generalTips) {
      advices.push({
        type: "general",
        title: `烹饪技巧：${tip.trigger}`,
        detail: tip.tip,
      });
    }

    return advices;
  },
};

// 导出供 agent 使用
if (typeof window !== "undefined") {
  window.CHEF_CN_SKILL = CHEF_CN_SKILL;
}
