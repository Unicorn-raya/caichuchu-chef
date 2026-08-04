/* ============================================
   菜厨厨 — 前端应用逻辑
   ============================================ */

// 后端 API 地址：本地同源为空；线上部署时通过 config.js 设置 window.CCC_API_BASE
const API_BASE = window.CCC_API_BASE || "";

// 资源（图片等）URL：统一走后端 API
function assetUrl(path) {
  if (!path) return path;
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path}`;
}

// 从本地 allRecipes 查找菜谱的正确图片路径
// 后端 API 返回的 images 可能是旧路径，本地 recipes.json 是最新的
function getRecipeImage(recipe) {
  if (!recipe) return null;
  // 优先从本地 allRecipes 查找（路径准确）
  const local = allRecipes.find((r) => r.id === recipe.id);
  if (local && local.images && local.images.length > 0) {
    return local.images[0];
  }
  // 回退到后端返回的路径
  if (recipe.images && recipe.images.length > 0) {
    return recipe.images[0];
  }
  return null;
}
const STORAGE_KEY = "caichuchu_fridge";
const STATS_KEY = "caichuchu_stats";
const AI_MODELS_KEY = "caichuchu_ai_models";
const DIET_PREFS_KEY = "caichuchu_diet_prefs";
const ALLERGENS_KEY = "caichuchu_allergens";
const SEASONINGS_KEY = "caichuchu_seasonings";
const UTENSILS_KEY = "caichuchu_utensils";

const DEFAULT_SEASONINGS = ["酱油", "食用油", "生抽", "老抽", "蚝油", "盐", "糖"];
const DEFAULT_UTENSILS = ["铁锅", "烤箱"];

// 常见家常主菜（与后端 home_main_dish_rank 保持一致）
const COMMON_HOME_DISH_TITLES = new Set([
  "西红柿炒鸡蛋", "酸辣土豆丝", "红烧茄子", "炒茄子", "蒜蓉西兰花",
  "蚝油生菜", "炒青菜", "凉拌黄瓜", "皮蛋豆腐", "麻婆豆腐", "家常豆腐",
  "可乐鸡翅", "红烧鸡翅", "宫保鸡丁", "鱼香肉丝", "回锅肉", "小炒肉",
  "糖醋里脊", "水煮肉片", "糖醋排骨", "番茄炒蛋", "葱烧豆腐",
  "蒜蓉空心菜", "手撕包菜", "地三鲜", "干煸四季豆",
]);
const COMMON_HOME_DISH_KEYWORDS = ["红烧肉", "红烧鱼", "清蒸鱼", "清蒸鲈鱼", "番茄牛腩", "西红柿牛腩", "土豆炖排骨"];
const HOME_MAIN_DISH_CATEGORIES = new Set(["aquatic", "meat_dish", "vegetable_dish"]);

function getHomeRank(recipe) {
  if (!recipe || !HOME_MAIN_DISH_CATEGORIES.has(recipe.category)) return 0;
  if (COMMON_HOME_DISH_TITLES.has(recipe.title)) return 2;
  if (COMMON_HOME_DISH_KEYWORDS.some(kw => recipe.title.includes(kw))) return 2;
  return 1;
}

// 饮食偏好选项（硬过滤：不符合的菜谱不进入推荐队列）
const DIET_PREFERENCE_OPTIONS = [
  { value: "no_spicy", label: "不吃辣", icon: "🌶️" },
  { value: "light", label: "清淡", icon: "🍃" },
  { value: "low_calorie", label: "低卡", icon: "🔥" },
  { value: "low_oil", label: "少油", icon: "💧" },
  { value: "vegetarian", label: "素食", icon: "🥬" },
  { value: "quick", label: "快手", icon: "⚡" },
  { value: "beginner", label: "新手友好", icon: "🎓" },
];

// 过敏源选项（软处理：含过敏源的菜谱会标识，且排序权重降低，但仍可能出现）
const ALLERGEN_OPTIONS = [
  { value: "peanut", label: "花生", icon: "🥜", keywords: ["花生"] },
  { value: "soybean", label: "黄豆", icon: "🫘", keywords: ["黄豆", "大豆", "豆腐", "豆浆", "豆瓣酱", "豆瓣", "豆干", "腐竹", "豆皮", "豆芽"] },
  { value: "milk", label: "牛奶", icon: "🥛", keywords: ["牛奶", "奶酪", "黄油", "奶油", "酸奶", "炼乳", "芝士", "奶粉"] },
  { value: "egg", label: "鸡蛋", icon: "🥚", keywords: ["鸡蛋", "鸭蛋", "鹅蛋", "蛋清", "蛋黄"] },
  { value: "seafood", label: "海鲜", icon: "🦐", keywords: ["虾", "蟹", "贝", "蛤", "蚝", "龙虾", "扇贝", "鱿鱼", "墨鱼", "海带", "紫菜", "鲍鱼", "海参"] },
  { value: "wheat", label: "小麦", icon: "🌾", keywords: ["小麦", "面粉", "面条", "馒头", "饺子皮", "馄饨皮", "面饼"] },
  { value: "nuts", label: "坚果", icon: "🌰", keywords: ["核桃", "杏仁", "腰果", "松子", "榛子", "开心果", "夏威夷果"] },
  { value: "fish", label: "鱼", icon: "🐟", keywords: ["鱼"] },
];

// 常见食材快捷标签
const COMMON_INGREDIENTS = [
  "鸡蛋", "西红柿", "土豆", "洋葱", "胡萝卜", "青菜",
  "猪肉", "牛肉", "鸡肉", "排骨", "五花肉", "鸡翅",
  "豆腐", "黄瓜", "茄子", "青椒", "白菜", "菠菜",
  "葱", "姜", "蒜", "辣椒", "香菇", "蘑菇",
  "虾", "鱼", "米饭", "面条", "面粉", "玉米",
  "芹菜", "韭菜", "豆角", "西兰花", "冬瓜", "南瓜",
  "火腿", "午餐肉", "牛奶", "奶酪", "黄油",
];

// 食材 emoji 映射
const INGREDIENT_EMOJI = {
  "鸡蛋": "🥚", "西红柿": "🍅", "土豆": "🥔", "洋葱": "🧅", "胡萝卜": "🥕",
  "青菜": "🥬", "猪肉": "🥩", "牛肉": "🥩", "鸡肉": "🍗", "排骨": "🍖",
  "五花肉": "🥓", "鸡翅": "🍗", "豆腐": "🧈", "黄瓜": "🥒", "茄子": "🍆",
  "青椒": "🫑", "白菜": "🥬", "菠菜": "🥬", "葱": "🌿", "姜": "🫚",
  "蒜": "🧄", "辣椒": "🌶️", "香菇": "🍄", "蘑菇": "🍄", "虾": "🦐",
  "鱼": "🐟", "米饭": "🍚", "面条": "🍜", "面粉": "🌾", "玉米": "🌽",
  "芹菜": "🥬", "韭菜": "🥬", "豆角": "🫛", "西兰花": "🥦", "冬瓜": "🥒",
  "南瓜": "🎃", "火腿": "🍖", "午餐肉": "🥫", "牛奶": "🥛", "奶酪": "🧀",
  "黄油": "🧈", "螃蟹": "🦀", "小龙虾": "🦞", "鱿鱼": "🦑", "蛤蜊": "🐚",
};

// 全局状态
let currentPage = "home";
let fridge = []; // { name, addedAt }
let shelfLifeData = {};
let allRecipes = [];
let allTags = [];
let allSearchResults = []; // 原始搜索结果（无标签过滤）
let searchResults = []; // 当前显示的结果（可能经过标签过滤）
let swipeIndex = 0;
let selectedTags = [];
let cookingSteps = [];
let cookingStepIndex = 0;
let cookingRecipeTitle = "";
let cookingRecipeId = "";
let cookingMissingIngredients = [];
let dietPreferences = []; // 用户饮食偏好（硬过滤）
let allergens = []; // 用户过敏源（软处理：标识 + 排序权重降低）
let seasonings = []; // 厨房调料（算入库存食材参与推荐）
let utensils = []; // 厨房厨具

// 长按计时器
let longPressTimer = null;
let longPressTarget = null;
const LONG_PRESS_DURATION = 1000; // 1秒

// 弹窗状态
let editingIngredientIndex = -1;
let editingIngredientName = "";
async function init() {
  FrontendLogger.info("app", "应用初始化");
  // 开机动画（与数据加载并行）
  const bootPromise = showBootAnimation();

  loadFridge();
  loadStats();
  loadDietPrefs();
  loadAllergens();
  loadSeasonings();
  loadUtensils();
  FrontendLogger.info("app", "本地数据加载", { fridge: fridge.length, dietPrefs: dietPreferences.length, allergens: allergens.length });
  await Promise.all([fetchShelfLife(), fetchRecipes(), fetchTags()]);

  // 等待开机动画结束
  await bootPromise;

  setupNavigation();
  initClickTracking();
  renderPage("home");
  initChefAgentFab();
  updateChefFabState();
}

// 开机动画：逐字显示问候语，类似苹果开机
async function showBootAnimation() {
  const overlay = document.getElementById("bootOverlay");
  if (!overlay) return;

  // 仅每个会话首次打开时显示
  if (sessionStorage.getItem("caichuchu_boot_shown")) {
    overlay.remove();
    return;
  }
  sessionStorage.setItem("caichuchu_boot_shown", "1");

  // 白天（6-18点）用页面背景色 + 黑色logo，夜晚用黑色背景 + 白色logo
  const h = new Date().getHours();
  const isDaytime = h >= 6 && h < 18;
  if (isDaytime) {
    overlay.classList.add("daytime");
  }
  const logoEl = overlay.querySelector(".boot-logo");
  if (logoEl) {
    logoEl.src = isDaytime ? "assets/logo-day.svg" : "assets/logo-night.svg";
  }

  const textEl = document.getElementById("bootText");
  const greeting = getGreeting();

  // 逐字写出
  for (let i = 0; i < greeting.length; i++) {
    textEl.textContent += greeting[i];
    await new Promise((r) => setTimeout(r, 130));
  }

  // 停留片刻
  await new Promise((r) => setTimeout(r, 700));

  // 淡出
  overlay.classList.add("fade-out");
  await new Promise((r) => setTimeout(r, 800));
  overlay.remove();
}

// ============================================
// 数据持久化
// ============================================
function loadFridge() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    fridge = data ? JSON.parse(data) : [];
  } catch {
    fridge = [];
  }
}

function saveFridge() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fridge));
}

function loadStats() {
  try {
    const data = localStorage.getItem(STATS_KEY);
    const parsed = data ? JSON.parse(data) : {};
    // 兼容旧数据，确保新字段存在
    window.userStats = {
      cooked: parsed.cooked || 0,
      saved: parsed.saved || 0,
      favorites: parsed.favorites || [],
      cookedRecipes: parsed.cookedRecipes || {},   // { recipeId: { title, count, lastCooked } }
      consumedIngredients: parsed.consumedIngredients || {},  // { ingredientName: count }
      supplementedIngredients: parsed.supplementedIngredients || {},  // { ingredientName: count }
    };
  } catch {
    window.userStats = {
      cooked: 0, saved: 0, favorites: [],
      cookedRecipes: {}, consumedIngredients: {}, supplementedIngredients: {},
    };
  }
}

function saveStats() {
  localStorage.setItem(STATS_KEY, JSON.stringify(window.userStats));
}

// ============================================
// 收藏菜谱管理
// ============================================
function getFavoriteRecipeIds() {
  const favs = (window.userStats && Array.isArray(window.userStats.favorites)) ? window.userStats.favorites : [];
  // 兼容旧数据：旧数据是纯ID数组，转换为带时间的对象
  return favs.map(item => {
    if (typeof item === 'string') {
      return { id: item, addedAt: Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000) };
    }
    return item;
  });
}

function isFavorite(recipeId) {
  return getFavoriteRecipeIds().some(item => item.id === recipeId);
}

// 大头钉颜色列表（与CSS对应），基于recipeId哈希分配，确保同一道菜颜色一致
const _pinColorList = ['pin-red', 'pin-pink', 'pin-orange', 'pin-yellow', 'pin-green', 'pin-blue', 'pin-purple', 'pin-brown'];
function getPinColorClass(recipeId) {
  let hash = 0;
  for (let i = 0; i < recipeId.length; i++) {
    hash = ((hash << 5) - hash) + recipeId.charCodeAt(i);
    hash |= 0;
  }
  return _pinColorList[Math.abs(hash) % _pinColorList.length];
}

function toggleFavorite(recipeId) {
  const favs = getFavoriteRecipeIds();
  const idx = favs.findIndex(item => item.id === recipeId);
  if (idx === -1) {
    favs.push({ id: recipeId, addedAt: Date.now() });
    showToast("已收藏");
  } else {
    favs.splice(idx, 1);
    showToast("已取消收藏");
  }
  window.userStats.favorites = favs;
  saveStats();
}

function getFavoriteRecipes() {
  const favItems = getFavoriteRecipeIds();
  return favItems
    .map(item => {
      const recipe = allRecipes.find(r => r.id === item.id);
      if (recipe) {
        return { ...recipe, _favoriteAddedAt: item.addedAt };
      }
      return null;
    })
    .filter(r => r)
    .sort((a, b) => b._favoriteAddedAt - a._favoriteAddedAt);
}

// ============================================
// 饮食偏好 & 过敏源
// ============================================
function loadDietPrefs() {
  try {
    const data = localStorage.getItem(DIET_PREFS_KEY);
    dietPreferences = data ? JSON.parse(data) : [];
  } catch {
    dietPreferences = [];
  }
}

function saveDietPrefs() {
  localStorage.setItem(DIET_PREFS_KEY, JSON.stringify(dietPreferences));
}

function loadAllergens() {
  try {
    const data = localStorage.getItem(ALLERGENS_KEY);
    allergens = data ? JSON.parse(data) : [];
  } catch {
    allergens = [];
  }
}

function saveAllergens() {
  localStorage.setItem(ALLERGENS_KEY, JSON.stringify(allergens));
}

// ============================================
// 厨房：调料 & 厨具
// ============================================
function loadSeasonings() {
  try {
    const data = localStorage.getItem(SEASONINGS_KEY);
    seasonings = data ? JSON.parse(data) : [...DEFAULT_SEASONINGS];
  } catch {
    seasonings = [...DEFAULT_SEASONINGS];
  }
}

function saveSeasonings() {
  localStorage.setItem(SEASONINGS_KEY, JSON.stringify(seasonings));
}

function loadUtensils() {
  try {
    const data = localStorage.getItem(UTENSILS_KEY);
    utensils = data ? JSON.parse(data) : [...DEFAULT_UTENSILS];
  } catch {
    utensils = [...DEFAULT_UTENSILS];
  }
}

function saveUtensils() {
  localStorage.setItem(UTENSILS_KEY, JSON.stringify(utensils));
}

// 收集菜谱所有食材
function getRecipeAllIngredients(recipe) {
  return [
    ...(recipe.requiredIngredients || []),
    ...(recipe.coreIngredients || []),
    ...(recipe.seasonings || []),
    ...(recipe.optionalIngredients || []),
  ];
}

// 辣菜判断：含辣椒类食材
const SPICY_KEYWORDS = ["辣椒", "辣椒粉", "辣椒油", "辣椒酱", "小米椒", "干辣椒", "青辣椒", "红辣椒", "朝天椒", "剁椒", "泡椒"];
function isSpicyRecipe(recipe) {
  const allText = getRecipeAllIngredients(recipe).join(",");
  return SPICY_KEYWORDS.some((kw) => allText.includes(kw));
}

function isVegetarianRecipe(recipe) {
  return (recipe.category || "").includes("vegetable");
}

// 清淡：不辣 + 非煎炸/红烧
function isLightRecipe(recipe) {
  if (isSpicyRecipe(recipe)) return false;
  const method = recipe.method || "";
  if (/(deep|frying|braising)/.test(method)) return false;
  return true;
}

function isLowCalorieRecipe(recipe) {
  return (recipe.calories || 0) > 0 && recipe.calories < 500;
}

function isLowOilRecipe(recipe) {
  const method = recipe.method || "";
  return !/(deep|frying)/.test(method);
}

function isQuickRecipe(recipe) {
  return (recipe.tags || []).includes("快手");
}

function isBeginnerRecipe(recipe) {
  return (recipe.tags || []).includes("新手友好");
}

// 菜谱是否含某过敏源
function recipeContainsAllergen(recipe, allergenValue) {
  const opt = ALLERGEN_OPTIONS.find((o) => o.value === allergenValue);
  if (!opt) return false;
  const allText = getRecipeAllIngredients(recipe).join(",");
  return opt.keywords.some((kw) => allText.includes(kw));
}

// 菜谱是否含用户任一过敏源
function recipeHasUserAllergen(recipe) {
  if (allergens.length === 0) return false;
  return allergens.some((a) => recipeContainsAllergen(recipe, a));
}

// 获取菜谱中含的用户过敏源名称列表
function getRecipeAllergenLabels(recipe) {
  if (allergens.length === 0) return [];
  const labels = [];
  for (const a of allergens) {
    const opt = ALLERGEN_OPTIONS.find((o) => o.value === a);
    if (opt && recipeContainsAllergen(recipe, a)) {
      labels.push(opt.label);
    }
  }
  return labels;
}

// 按饮食偏好过滤（硬过滤）
function filterByDietPrefs(results) {
  if (dietPreferences.length === 0) return results;
  return results.filter((r) => {
    for (const pref of dietPreferences) {
      if (pref === "no_spicy" && isSpicyRecipe(r.recipe)) return false;
      if (pref === "light" && !isLightRecipe(r.recipe)) return false;
      if (pref === "low_calorie" && !isLowCalorieRecipe(r.recipe)) return false;
      if (pref === "low_oil" && !isLowOilRecipe(r.recipe)) return false;
      if (pref === "vegetarian" && !isVegetarianRecipe(r.recipe)) return false;
      if (pref === "quick" && !isQuickRecipe(r.recipe)) return false;
      if (pref === "beginner" && !isBeginnerRecipe(r.recipe)) return false;
    }
    return true;
  });
}

// 标识含过敏源的菜谱，并降低排序权重（软处理：不删除，但排后面 + 红色标识）
function applyAllergenMark(results) {
  if (allergens.length === 0) return results;
  return results.map((r) => {
    const hasAllergen = recipeHasUserAllergen(r.recipe);
    return {
      ...r,
      hasAllergen,
    };
  });
}

// 过敏源硬过滤：推荐结果中移除含过敏源的菜谱
function filterByAllergens(results) {
  if (allergens.length === 0) return results;
  return results.filter((r) => !recipeHasUserAllergen(r.recipe));
}

// 应用饮食偏好 + 过敏源到搜索结果（推荐时：都硬过滤）
function applyDietAndAllergens(results) {
  const filtered = filterByDietPrefs(results);
  return filterByAllergens(filtered);
}

// ============================================
// AI 模型管理
// 模型用途：recommend(推荐菜谱) / recognize(语音图像识别) / calendar(日历分析)
// ============================================

const BUILTIN_DEFAULT_MODEL = {
  id: "builtin_default",
  name: "默认模型",
  model: "gemini-2.5-flash",
  uses: ["recommend", "recognize", "calendar"],
  builtin: true,
};

function loadAIModels() {
  try {
    const data = localStorage.getItem(AI_MODELS_KEY);
    const parsed = data ? JSON.parse(data) : {};
    // 向后兼容：旧数据没有 uses 字段，把 defaultModelId 对应模型标记为 recommend
    const legacyDefault = parsed.defaultModelId || null;
    const models = (parsed.models || []).map((m) => ({
      ...m,
      uses: Array.isArray(m.uses)
        ? m.uses
        : (legacyDefault && m.id === legacyDefault ? ["recommend"] : []),
    }));
    // 确保内置默认模型总是存在且排在首位
    const builtinIdx = models.findIndex((m) => m.id === BUILTIN_DEFAULT_MODEL.id);
    if (builtinIdx === -1) {
      models.unshift({ ...BUILTIN_DEFAULT_MODEL });
    } else {
      // 同步内置模型的最新配置（保留用户设置的用途，允许为空）
      const userUses = models[builtinIdx].uses;
      models[builtinIdx] = { ...BUILTIN_DEFAULT_MODEL, uses: Array.isArray(userUses) ? userUses : [] };
    }
    return { models };
  } catch {
    return { models: [{ ...BUILTIN_DEFAULT_MODEL }] };
  }
}

function saveAIModels(config) {
  localStorage.setItem(AI_MODELS_KEY, JSON.stringify(config));
}

// 获取指定用途的模型
function getAIModelByUse(use) {
  const config = loadAIModels();
  return config.models.find((m) => m.uses && m.uses.includes(use)) || null;
}

function getRecommendModel() {
  return getAIModelByUse("recommend");
}

function getRecognizeModel() {
  return getAIModelByUse("recognize");
}

// 向后兼容
function getDefaultAIModel() {
  return getRecommendModel();
}

/**
 * 调用 AI 模型生成内容（通过后端代理，隐藏密钥）
 * @param {string} prompt 用户提示
 * @param {string} useCase 用途：recommend(默认) / recognize
 * @param {string} systemPrompt 自定义 system 提示
 * @returns {Promise<string>} AI 返回的文本
 */
async function callAI(prompt, useCase = "recommend", systemPrompt) {
  const sys = systemPrompt || "你是一位资深美食顾问，用简洁生动的中文回答用户关于食材搭配和菜谱的问题。详细展开，内容不限字数。";
  const model = getAIModelByUse(useCase);
  const messages = [
    { role: "system", content: sys },
    { role: "user", content: prompt },
  ];

  FrontendLogger.info("ai", `AI调用 useCase=${useCase}`, { promptPreview: prompt.slice(0, 100), model: model ? model.id : "builtin" });

  if (model && !model.builtin) {
    // 自定义模型：前端直接调用，不经过后端
    try {
      const result = await callAIDirect(model, messages);
      FrontendLogger.info("ai", "AI返回(自定义)", { length: result.length });
      return result;
    } catch (e) {
      FrontendLogger.error("ai", "AI调用失败(自定义)", { error: e.message, model: model.id });
      throw e;
    }
  }

  // 内置模型：通过后端代理（隐藏密钥）
  try {
    const res = await fetch(`${API_BASE}/api/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`AI请求失败: ${res.status} ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    const content = data.content || "（AI 未返回内容）";
    FrontendLogger.info("ai", "AI返回(内置)", { length: content.length });
    return content;
  } catch (e) {
    FrontendLogger.error("ai", "AI调用失败(内置)", { error: e.message });
    throw e;
  }
}

/**
 * 调用 AI 视觉模型识别图片中的食材
 * @param {string} imageBase64 带 data:前缀的 base64 图片
 * @param {string} prompt 提示文本
 * @returns {Promise<string>} AI 返回的文本
 */
async function callAIVision(imageBase64, prompt) {
  const model = getAIModelByUse("recognize");
  const messages = [
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: imageBase64 } },
      ],
    },
  ];

  if (model && !model.builtin) {
    // 自定义模型：前端直接调用
    return await callAIDirect(model, messages);
  }

  // 内置模型：通过后端代理
  const res = await fetch(`${API_BASE}/api/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`AI请求失败: ${res.status} ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.content || "";
}

/**
 * 前端直接调用自定义 AI 模型（不经过后端）
 * @param {object} model 模型配置 { url, apiKey, model }
 * @param {array} messages 消息列表
 * @returns {Promise<string>} AI 返回的文本
 */
async function callAIDirect(model, messages) {
  const res = await fetch(`${model.url}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${model.apiKey}`,
    },
    body: JSON.stringify({
      model: model.model,
      messages: messages,
      stream: false,
      max_tokens: 16384,
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`AI请求失败: ${res.status} ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "（AI 未返回内容）";
}

// ============================================
// API 调用
// ============================================
async function fetchShelfLife() {
  try {
    const res = await fetch(`${API_BASE}/api/shelf-life`);
    const data = await res.json();
    shelfLifeData = data.shelfLife || {};
    FrontendLogger.info("api", "保质期数据加载", { count: Object.keys(shelfLifeData).length });
  } catch (e) {
    FrontendLogger.error("api", "保质期数据加载失败", { error: e.message });
    console.error("保质期数据加载失败", e);
  }
}

async function fetchRecipes() {
  // 优先从本地静态 recipes.json 加载（保证图片路径与本地图片一致）
  try {
    const res = await fetch(`/data/recipes.json`);
    if (res.ok) {
      const data = await res.json();
      if (data.recipes && data.recipes.length > 0) {
        allRecipes = data.recipes;
        FrontendLogger.info("api", "菜谱加载(本地)", { count: allRecipes.length });
        return;
      }
    }
  } catch (e) {
    FrontendLogger.warning("api", "本地 recipes.json 加载失败，回退到后端 API", { error: e.message });
    console.warn("本地 recipes.json 加载失败，回退到后端 API", e);
  }
  // 回退：后端 API
  try {
    const res = await fetch(`${API_BASE}/api/recipes`);
    const data = await res.json();
    allRecipes = data.recipes || [];
    FrontendLogger.info("api", "菜谱加载(后端)", { count: allRecipes.length });
  } catch (e) {
    FrontendLogger.error("api", "菜谱加载失败", { error: e.message });
    console.error("菜谱加载失败", e);
  }
}

async function fetchTags() {
  try {
    const res = await fetch(`${API_BASE}/api/tags`);
    allTags = await res.json();
    FrontendLogger.info("api", "标签加载", { count: allTags.length });
  } catch (e) {
    FrontendLogger.error("api", "标签加载失败", { error: e.message });
    console.error("标签加载失败", e);
  }
}

async function searchRecipes(ingredients, mode, tags, topK = 20, showAll = false, expiringIngredients = []) {
  FrontendLogger.info("api", "搜索菜谱", { ingredients, mode, tags, topK, showAll, expiringIngredients });
  const body = JSON.stringify({ ingredients, mode, top_k: topK, tags: tags || [], show_all: showAll, expiring_ingredients: expiringIngredients });
  // 线上后端冷启动需要 30+ 秒（模型延迟加载），移动端网络不稳定，需要超时 + 重试
  const MAX_RETRIES = 1;
  const TIMEOUT_MS = 60000; // 单次请求最多等 60 秒（容忍模型冷启动）
  let lastErr = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${API_BASE}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`后端错误 ${res.status}`);
      const results = await res.json();
      FrontendLogger.info("api", "搜索结果", { count: results.length });
      return results;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      // 超时/网络错误才重试；后端 4xx/5xx 不重试
      if (e.name === "AbortError") {
        lastErr = new Error("请求超时");
      } else if (e.message.startsWith("后端错误")) {
        break;
      }
      // 最后一次失败不再等待
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }
  FrontendLogger.error("api", "搜索失败", { error: lastErr?.message, ingredients });
  throw lastErr || new Error("搜索失败");
}

// ============================================
// 保质期计算
// ============================================
function getExpiryStatus(ingredient, addedAt) {
  const shelfLife = shelfLifeData[ingredient] || 7;
  const now = Date.now() / 1000;
  const daysPassed = (now - addedAt) / 86400;
  const daysLeft = shelfLife - daysPassed;

  if (daysLeft < 0) return { status: "expired", daysLeft: Math.ceil(daysLeft), shelfLife };
  if (daysLeft <= 2) return { status: "expiring", daysLeft: Math.ceil(daysLeft), shelfLife };
  return { status: "fresh", daysLeft: Math.ceil(daysLeft), shelfLife };
}

function getExpiryText(status, daysLeft) {
  if (status === "expired") return `已过期${Math.abs(daysLeft)}天`;
  if (status === "expiring") return `还剩${daysLeft}天`;
  return `${daysLeft}天后过期`;
}

// ============================================
// 导航
// ============================================
function setupNavigation() {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;
      renderPage(page);
    });
  });
}

// ============================================
// 全局点击埋点
// ============================================
function initClickTracking() {
  document.addEventListener("click", (e) => {
    // 从点击目标向上查找最近的可交互元素
    const actionable = e.target.closest(
      "button, a, [onclick], .nav-btn, .ingredient-card, .recipe-card, .tag-chip, .chef-agent-fab, .cta-generate, .btn-add-ingredient, input[type=submit]"
    );
    const el = actionable || e.target;
    const tag = el.tagName.toLowerCase();

    // 提取元素标识：优先 id，其次 data-* 属性，最后 class
    let label = el.id || "";
    if (!label) {
      const dataPage = el.dataset.page;
      if (dataPage) label = `page:${dataPage}`;
    }
    if (!label && el.dataset.recipeId) label = `recipe:${el.dataset.recipeId}`;
    if (!label && el.classList.length) label = `.${[...el.classList].slice(0, 3).join(".")}`;

    // 提取文字内容（截断）
    const text = (el.textContent || "").trim().slice(0, 40);

    // 提取 onclick 函数名
    let onclickFn = "";
    const onclickAttr = el.getAttribute("onclick");
    if (onclickAttr) onclickFn = onclickAttr.slice(0, 60);

    FrontendLogger.info("click", `点击 ${tag}${label ? " #" + label : ""}`, {
      page: currentPage || "unknown",
      tag,
      label: label || undefined,
      text: text || undefined,
      onclick: onclickFn || undefined,
      x: e.clientX,
      y: e.clientY,
    });
  });
}

function renderPage(page) {
  FrontendLogger.info("page", `切换到页面: ${page}`);
  currentPage = page;
  // 切换页面时关闭大厨点评面板和菜单，清理笔记状态
  const chefPanel = document.getElementById("chefAgentPanel");
  if (chefPanel) chefPanel.classList.add("hidden");
  closeChefRecipeMenu();
  // 清除大厨笔记并恢复FAB图标为默认大厨图标
  if (window.ChefGuides && ChefGuides.isNotesActive()) {
    ChefGuides.clearNotesFromPage();
  }
  updateChefFabState();
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.page === page);
  });

  const app = document.getElementById("app");
  switch (page) {
    case "home":
      app.innerHTML = renderHome();
      // 创作者模式：通过DOM插入冰箱演示按钮
      if (_creatorMode) {
        var titleRow = document.getElementById("homeTitleRow");
        if (titleRow) {
          var btn = document.createElement("button");
          btn.className = "cal-demo-btn" + (_fridgeDemoActive ? " demo-active" : "");
          btn.textContent = _fridgeDemoActive ? "↩️ 恢复" : "✨ 演示";
          btn.style.pointerEvents = "auto";
          btn.style.zIndex = "9999";
          btn.addEventListener("click", function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleFridgeDemo();
          });
          titleRow.appendChild(btn);
        }
      }
      break;
    case "discover":
      app.innerHTML = renderDiscover();
      break;
    case "calendar":
      renderCalendarPage();
      // 创作者模式：通过DOM插入日历演示按钮
      if (_creatorMode) {
        var calHeader = document.querySelector(".calendar-page-header");
        if (calHeader) {
          var existingBtn = calHeader.querySelector("[data-demo-cal]");
          if (!existingBtn) {
            var cbtn = document.createElement("button");
            cbtn.className = "cal-demo-btn" + (_calendarDemoActive ? " demo-active" : "");
            cbtn.textContent = _calendarDemoActive ? "↩️ 恢复" : "✨ 演示";
            cbtn.setAttribute("data-demo-cal", "1");
            cbtn.addEventListener("click", function(e) {
              e.preventDefault();
              e.stopPropagation();
              toggleCalendarDemo();
            });
            calHeader.appendChild(cbtn);
          }
        }
      }
      break;
    case "me":
      app.innerHTML = renderMe();
      break;
  }
}

// ============================================
// 首页 — 我的冰箱
// ============================================
function renderHome() {
  const expiringItems = fridge.filter((item) => {
    const s = getExpiryStatus(item.name, item.addedAt);
    return s.status !== "fresh";
  });

  const greeting = getGreeting();
  const hasItems = fridge.length > 0;

  return `
    <div class="page">
      <div class="home-hero">
        <div class="home-greeting">${greeting}</div>
        <div class="home-title-row" id="homeTitleRow">
          <h1 class="home-title">我的冰箱</h1>
        </div>
        <button class="cta-generate" onclick="generateMenu()" ${!hasItems ? "disabled" : ""}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 11h.01"/><path d="M11 15h.01"/><path d="M16 16h.01"/><path d="m2 16 20 6-6-20A20 20 0 0 0 2 16"/><path d="M5.71 17.11a17.04 17.04 0 0 1 11.4-11.4"/>
          </svg>
          一键生成今晚菜单
        </button>
      </div>

      <div class="fridge-section" onclick="clearShakeIfActive()">
        <div class="section-header">
          <div>
            <span class="section-title">库存食材</span>
            <span class="section-count">${fridge.length} 样</span>
          </div>
          <button class="btn-add-ingredient" onclick="event.stopPropagation();openInputSheet()">+</button>
        </div>

        ${expiringItems.length > 0 ? `
          <div class="expiry-banner">
            <div class="expiry-banner-dot"></div>
            <span>${expiringItems.length} 样食材即将过期，建议优先消耗</span>
          </div>
        ` : ""}

        ${hasItems ? renderIngredientGrid() : renderEmptyFridge()}
      </div>
    </div>
  `;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return "夜深了，冰箱里有什么？";
  if (h < 11) return "早上好，今天吃点什么？";
  if (h < 14) return "中午好，看看冰箱里有什么";
  if (h < 18) return "下午好，准备晚餐了吗？";
  return "晚上好，今晚做什么？";
}

function renderIngredientGrid() {
  const sorted = [...fridge].sort((a, b) => {
    const sa = getExpiryStatus(a.name, a.addedAt);
    const sb = getExpiryStatus(b.name, b.addedAt);
    const order = { expired: 0, expiring: 1, fresh: 2 };
    return order[sa.status] - order[sb.status];
  });

  return `
    <div class="ingredient-grid">
      ${sorted.map((item) => {
        const s = getExpiryStatus(item.name, item.addedAt);
        const emoji = INGREDIENT_EMOJI[item.name] || "🥘";
        const idx = fridge.indexOf(item);
        return `
          <div class="ingredient-card status-${s.status}" id="ingredient-card-${idx}"
               onmousedown="handleMouseDown(${idx}, event)"
               onmouseup="handleMouseUp(event)"
               onmouseleave="handleMouseLeave(event)"
               ontouchstart="handleTouchStart(${idx}, event)"
               ontouchend="handleTouchEnd(event)"
               ontouchmove="handleTouchMove(event)">
            <button class="ingredient-delete" onclick="event.stopPropagation();toggleShakeDelete(${idx})">×</button>
            <span class="ingredient-emoji">${emoji}</span>
            <div class="ingredient-name">${item.name}</div>
            <div class="ingredient-expiry ${s.status}">${getExpiryText(s.status, s.daysLeft)}</div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderEmptyFridge() {
  return `
    <div class="empty-fridge">
      <div class="empty-fridge-icon">🧊</div>
      <div class="empty-fridge-text">冰箱还是空的</div>
      <button class="btn-add-ingredient" style="width:auto;height:auto;padding:10px 20px;border-radius:100px;font-size:15px" onclick="openInputSheet()">+ 添加食材</button>
    </div>
  `;
}

// iOS 风格抖动删除：第一次点 × → 抖动；第二次点 × → 删除
let shakingIngredientIdx = -1;

function toggleShakeDelete(index) {
  if (shakingIngredientIdx === index) {
    // 第二次点击：删除
    const name = fridge[index]?.name || "";
    fridge.splice(index, 1);
    saveFridge();
    shakingIngredientIdx = -1;
    renderPage("home");
    showToast(`已移除 ${name}`);
    return;
  }
  // 取消之前的抖动
  if (shakingIngredientIdx >= 0) {
    const prev = document.getElementById(`ingredient-card-${shakingIngredientIdx}`);
    if (prev) prev.classList.remove("shaking");
  }
  // 开启当前卡片抖动
  shakingIngredientIdx = index;
  const card = document.getElementById(`ingredient-card-${index}`);
  if (card) card.classList.add("shaking");
}

// 点击空白处取消抖动
function clearShakeIfActive() {
  if (shakingIngredientIdx >= 0) {
    const card = document.getElementById(`ingredient-card-${shakingIngredientIdx}`);
    if (card) card.classList.remove("shaking");
    shakingIngredientIdx = -1;
  }
}

function removeIngredient(index) {
  const item = fridge[index];
  FrontendLogger.info("fridge", "删除食材", { name: item ? item.name : "", index });
  fridge.splice(index, 1);
  saveFridge();
  shakingIngredientIdx = -1;
  renderPage("home");
  showToast("已移除");
}

// ============================================
// 食材详情页（AI 推荐这个食材常做的菜）
// ============================================
async function openIngredientDetail(index) {
  const item = fridge[index];
  if (!item) return;
  const name = item.name;
  FrontendLogger.info("fridge", "查看食材灵感", { name });
  const emoji = INGREDIENT_EMOJI[name] || "🥘";
  const app = document.getElementById("app");
  document.getElementById("bottomNav").style.display = "none";

  // 预先渲染骨架
  app.innerHTML = `
    <div class="page ingredient-detail-page">
      <div class="swipe-header">
        <button class="swipe-header-back" onclick="backFromIngredientDetail()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          返回
        </button>
        <div class="swipe-header-title">食材灵感</div>
        <div style="width:50px"></div>
      </div>

      <div class="ingredient-detail-hero">
        <div class="ingredient-detail-emoji">${emoji}</div>
        <div class="ingredient-detail-name">${name}</div>
      </div>

      <div id="ingredientDetailContent" class="ingredient-detail-content">
        <div class="ai-loading">
          <div class="loading-spinner"></div>
          <div class="ai-loading-text">AI 正在思考这道食材的灵感菜谱…</div>
        </div>
      </div>
    </div>
  `;

  // 同时查找本地菜谱中含此食材的菜
  const localMatches = allRecipes
    .filter((r) => r.requiredIngredients.some((i) => i.includes(name) || name.includes(i)))
    .slice(0, 6);

  const contentEl = document.getElementById("ingredientDetailContent");
  const defaultModel = getDefaultAIModel();

  if (!defaultModel) {
    contentEl.innerHTML = `
      <div class="ai-empty">
        <div class="ai-empty-icon">🤖</div>
        <div class="ai-empty-title">尚未配置 AI 模型</div>
        <div class="ai-empty-sub">配置 AI 模型后，可获取专属这道食材的灵感菜谱推荐</div>
        <button class="ai-empty-btn" onclick="showAIModels()">前往配置</button>
      </div>
      ${localMatches.length > 0 ? renderLocalIngredientMatches(localMatches, name) : ""}
    `;
    return;
  }

  try {
    const prompt = `我冰箱里有食材「${name}」。请推荐以这个食材为主角的常见家常菜，每道菜说明做法亮点和搭配食材，并给出一些烹饪小贴士。详细展开，不要限制内容长度。`;
    const aiText = await callAI(prompt);
    contentEl.innerHTML = `
      <div class="ai-result">
        <div class="ai-result-header">
          <span class="ai-result-badge">AI 灵感</span>
          <span class="ai-result-model">${defaultModel.name || defaultModel.model}</span>
        </div>
        <div class="ai-result-text">${formatAIText(aiText)}</div>
      </div>
      ${localMatches.length > 0 ? renderLocalIngredientMatches(localMatches, name) : ""}
    `;
  } catch (e) {
    const msg = e.message === "NO_AI_MODEL" ? "尚未配置 AI 模型" : e.message;
    contentEl.innerHTML = `
      <div class="ai-empty">
        <div class="ai-empty-icon">⚠️</div>
        <div class="ai-empty-title">AI 生成失败</div>
        <div class="ai-empty-sub">${msg}</div>
      </div>
      ${localMatches.length > 0 ? renderLocalIngredientMatches(localMatches, name) : ""}
    `;
  }
}

function renderLocalIngredientMatches(matches, name) {
  return `
    <div class="local-match-section">
      <div class="local-match-title">📚 含「${name}」的菜谱</div>
      <div class="recipe-list" style="padding:0">
        ${matches.map((r) => renderRecipeListCard(r)).join("")}
      </div>
    </div>
  `;
}

function formatAIText(text) {
  // 简单的 markdown 转 HTML：换行、加粗、列表
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // ### 等标题转为加粗（加粗到第一个标点符号，如冒号）
  html = html.replace(/^#{1,6}\s+(.+)$/gm, (match, content) => {
    const punctIdx = content.search(/[：:，,.。！？、]/);
    if (punctIdx > 0) {
      return `<strong>${content.slice(0, punctIdx)}</strong>${content.slice(punctIdx)}`;
    }
    return `<strong>${content}</strong>`;
  });
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/^\s*[-•]\s+(.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>[\s\S]+?<\/li>)/g, "<ul>$1</ul>");
  html = html.replace(/\n\n/g, "</p><p>");
  html = `<p>${html}</p>`;
  return html;
}

function backFromIngredientDetail() {
  document.getElementById("bottomNav").style.display = "";
  renderPage("home");
}

// ============================================
// 录入底部抽屉
// ============================================
function openInputSheet() {
  document.getElementById("inputSheet").classList.remove("hidden");
  renderQuickTags();
}

function closeInputSheet() {
  document.getElementById("inputSheet").classList.add("hidden");
  document.getElementById("manualInputArea").classList.add("hidden");
  document.getElementById("voiceInputArea").classList.add("hidden");
  document.getElementById("aiResultArea").classList.add("hidden");
  // 停止语音识别
  if (voiceRecognition) {
    voiceRecognition.stop();
    voiceRecognition = null;
  }
  renderPage("home");
}

function showManualInput() {
  document.getElementById("voiceInputArea").classList.add("hidden");
  document.getElementById("aiResultArea").classList.add("hidden");
  document.getElementById("manualInputArea").classList.remove("hidden");
}

function renderQuickTags() {
  const container = document.getElementById("quickTags");
  const inFridge = new Set(fridge.map((i) => i.name));
  container.innerHTML = COMMON_INGREDIENTS.map((name) => `
    <div class="quick-tag ${inFridge.has(name) ? "selected" : ""}" onclick="toggleQuickTag('${name}', this)">
      ${INGREDIENT_EMOJI[name] || ""} ${name}
    </div>
  `).join("");
}

function toggleQuickTag(name, el) {
  const existing = fridge.find((i) => i.name === name);
  if (existing) {
    FrontendLogger.info("fridge", "取消快捷标签", { name });
    fridge = fridge.filter((i) => i !== existing);
    el.classList.remove("selected");
  } else {
    FrontendLogger.info("fridge", "添加快捷标签", { name });
    fridge.push({ name, addedAt: Date.now() / 1000 });
    el.classList.add("selected");
  }
  saveFridge();
}

function addManualIngredient() {
  const input = document.getElementById("manualIngredientInput");
  const name = input.value.trim();
  if (!name) return;
  if (fridge.find((i) => i.name === name)) {
    showToast("已存在");
    return;
  }
  FrontendLogger.info("fridge", "手动添加食材", { name });
  fridge.push({ name, addedAt: Date.now() / 1000 });
  saveFridge();
  input.value = "";
  renderQuickTags();
  showToast(`已添加 ${name}`);
}

// ============================================
// 语音输入 & 拍照识别（多模态 AI）
// ============================================
let voiceRecognition = null;

function showVoiceInput() {
  // 隐藏其他输入区，显示语音区
  document.getElementById("manualInputArea").classList.add("hidden");
  document.getElementById("aiResultArea").classList.add("hidden");
  const voiceArea = document.getElementById("voiceInputArea");
  voiceArea.classList.remove("hidden");
  voiceArea.innerHTML = `
    <div class="voice-input-panel">
      <div class="voice-mic-btn" id="voiceMicBtn" onclick="toggleVoiceRecording()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
      </div>
      <div class="voice-status" id="voiceStatus">点击麦克风开始说话</div>
      <div class="voice-transcript" id="voiceTranscript"></div>
    </div>
  `;
}

function toggleVoiceRecording() {
  const micBtn = document.getElementById("voiceMicBtn");
  if (voiceRecognition) {
    // 正在录音 → 停止
    voiceRecognition.stop();
    return;
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    showToast("当前浏览器不支持语音识别");
    return;
  }

  const model = getRecognizeModel();
  if (!model) {
    showToast("请先在AI模型管理中设置「语音/图像识别」模型");
    return;
  }

  const recognition = new SR();
  recognition.lang = "zh-CN";
  // continuous=true：持续识别，允许停顿，说多个食材时不会中途断开
  // 用户说完所有食材后点击麦克风手动停止
  recognition.continuous = true;
  recognition.interimResults = true;

  micBtn.classList.add("recording");
  document.getElementById("voiceStatus").textContent = "正在聆听…说完后点击麦克风停止";
  document.getElementById("voiceTranscript").textContent = "";

  // 累积已确认的文本（final 结果），避免每次回调都从头拼接导致 interim 重复
  let finalText = "";
  recognition.onresult = (event) => {
    let interimText = "";
    for (let i = 0; i < event.results.length; i++) {
      const res = event.results[i];
      if (res.isFinal) {
        finalText += res[0].transcript;
      } else {
        interimText += res[0].transcript;
      }
    }
    document.getElementById("voiceTranscript").textContent = (finalText + interimText).trim();
  };

  recognition.onerror = (event) => {
    micBtn.classList.remove("recording");
    document.getElementById("voiceStatus").textContent = "识别失败：" + event.error;
    voiceRecognition = null;
  };

  recognition.onend = () => {
    micBtn.classList.remove("recording");
    voiceRecognition = null;
    const transcript = document.getElementById("voiceTranscript").textContent.trim();
    if (transcript) {
      document.getElementById("voiceStatus").textContent = "正在用AI提取食材…";
      extractIngredientsFromText(transcript);
    } else {
      document.getElementById("voiceStatus").textContent = "未识别到语音，请重试";
    }
  };

  recognition.start();
  voiceRecognition = recognition;
}

async function extractIngredientsFromText(text) {
  try {
    const prompt = `请从以下语音文本中提取食材名称，只返回食材名称列表，用逗号分隔，不要其他文字。例如：番茄,鸡蛋,牛肉。\n\n语音文本：${text}`;
    const result = await callAI(prompt, "recognize", "你是一个食材识别助手，只返回食材名称列表，用逗号分隔，不要任何其他文字。");
    const ingredients = result.split(/[,，、\n]/).map((s) => s.trim()).filter((s) => s && s.length <= 10);
    showAIResult(ingredients, "voice");
  } catch (e) {
    document.getElementById("voiceStatus").textContent = "AI提取失败：" + (e.message || "");
  }
}

function showPhotoInput() {
  document.getElementById("manualInputArea").classList.add("hidden");
  document.getElementById("voiceInputArea").classList.add("hidden");
  document.getElementById("aiResultArea").classList.add("hidden");
  document.getElementById("photoFileInput").click();
}

function handlePhotoSelect(event) {
  const file = event.target.files[0];
  event.target.value = ""; // 允许重复选择同一文件
  if (!file) return;

  const model = getRecognizeModel();
  if (!model) {
    showToast("请先在AI模型管理中设置「语音/图像识别」模型");
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64 = e.target.result;
    // 压缩图片避免过大
    const compressed = await compressImage(base64, 1024);
    showPhotoPreview(compressed);
    try {
      const prompt = "请识别图片中的食材，只返回食材名称列表，用逗号分隔，不要其他文字。例如：番茄,鸡蛋,牛肉。如果没有食材返回空。";
      const result = await callAIVision(compressed, prompt);
      const ingredients = result.split(/[,，、\n]/).map((s) => s.trim()).filter((s) => s && s.length <= 10);
      showAIResult(ingredients, "photo", compressed);
    } catch (err) {
      const resultArea = document.getElementById("aiResultArea");
      resultArea.classList.remove("hidden");
      resultArea.innerHTML = `<div class="ai-result-error">识别失败：${err.message || "请重试"}</div>`;
    }
  };
  reader.readAsDataURL(file);
}

// 压缩图片到指定最大边长
function compressImage(base64, maxSize) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round(height * maxSize / width);
          width = maxSize;
        } else {
          width = Math.round(width * maxSize / height);
          height = maxSize;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

function showPhotoPreview(base64) {
  const aiResultArea = document.getElementById("aiResultArea");
  aiResultArea.classList.remove("hidden");
  aiResultArea.innerHTML = `
    <div class="ai-result-preview">
      <img src="${base64}" alt="预览" class="ai-result-preview-img" />
      <div class="ai-result-loading">
        <div class="loading-spinner"></div>
        <span>正在用AI识别食材…</span>
      </div>
    </div>
  `;
}

// 显示AI识别结果（语音/拍照通用）
function showAIResult(ingredients, source, photoBase64) {
  const resultArea = document.getElementById("aiResultArea");
  resultArea.classList.remove("hidden");
  if (!ingredients || ingredients.length === 0) {
    resultArea.innerHTML = `
      <div class="ai-result-empty">
        <div style="font-size:32px;margin-bottom:8px">🤔</div>
        <div>未识别到食材，请重试</div>
      </div>
    `;
    return;
  }
  const inFridge = new Set(fridge.map((i) => i.name));
  resultArea.innerHTML = `
    ${photoBase64 ? `<img src="${photoBase64}" alt="预览" class="ai-result-preview-img" />` : ""}
    <div class="ai-result-title">AI 识别到 ${ingredients.length} 个食材</div>
    <div class="ai-result-chips" id="aiResultChips">
      ${ingredients.map((name) => `
        <div class="ai-result-chip ${inFridge.has(name) ? "in-fridge" : ""}" data-name="${name}" onclick="toggleAIResultChip(this)">
          <span class="ai-result-chip-name">${name}</span>
          <span class="ai-result-chip-check">${inFridge.has(name) ? "已添加" : "✚"}</span>
        </div>
      `).join("")}
    </div>
    <button class="ai-result-add-btn" onclick="confirmAddAIIngredients()">添加到冰箱</button>
  `;
}

function toggleAIResultChip(el) {
  if (el.classList.contains("in-fridge")) return; // 已在冰箱的不允许操作
  el.classList.toggle("selected");
}

function confirmAddAIIngredients() {
  const chips = document.querySelectorAll(".ai-result-chip.selected");
  if (chips.length === 0) {
    showToast("请选择要添加的食材");
    return;
  }
  let added = 0;
  const addedNames = [];
  chips.forEach((chip) => {
    const name = chip.dataset.name;
    if (!fridge.find((i) => i.name === name)) {
      fridge.push({ name, addedAt: Date.now() / 1000 });
      addedNames.push(name);
      added++;
    }
  });
  FrontendLogger.info("fridge", "AI识别添加食材", { count: added, names: addedNames });
  saveFridge();
  document.getElementById("aiResultArea").classList.add("hidden");
  document.getElementById("voiceInputArea").classList.add("hidden");
  renderQuickTags();
  document.getElementById("manualInputArea").classList.remove("hidden");
  showToast(`已添加 ${added} 个食材`);
}

// ============================================
// 一键生成菜单 → 搜索 → Tinder 滑动
// ============================================

// 主菜关键词（半成品/早餐里判断是否肉菜）
const MEAT_KEYWORDS = [
  "猪", "牛", "羊", "鸡", "鸭", "鹅", "鱼", "虾", "蟹", "贝", "蛤", "鱿", "墨",
  "肉", "排骨", "五花", "里脊", "火腿", "香肠", "培根", "鸡翅", "鸡腿", "牛排",
  "羊排", "猪肉", "牛肉", "羊肉", "鸡肉", "鱼肉", "虾仁", "虾肉", "肉馅",
  "蛋饺", "烧卖", "馄饨", "水饺",
];

// 判断是否为主菜（原荤菜）
// 主菜 = 鱼虾水产 + 肉菜 + 半成品中的肉菜
function isMainDish(recipe) {
  const cat = recipe.category || "";
  // 明确的主菜分类
  if (cat === "aquatic" || cat === "meat_dish") return true;
  // 半成品：通过标题和食材关键词判断
  if (cat === "semi-finished") {
    const text = recipe.title + (recipe.coreIngredients || []).join(",");
    return MEAT_KEYWORDS.some((kw) => text.includes(kw));
  }
  return false;
}

// 判断是否为副菜/主食（原素菜）
// 副菜/主食 = 素菜 + 汤粥 + 主食 + 早餐中的素菜
function isSideDish(recipe) {
  const cat = recipe.category || "";
  // 明确的副菜分类
  if (cat === "vegetable_dish" || cat === "soup" || cat === "staple") return true;
  // 早餐中：不含肉关键词的视为副菜（素的早餐）
  if (cat === "breakfast") {
    const text = recipe.title + (recipe.coreIngredients || []).join(",");
    return !MEAT_KEYWORDS.some((kw) => text.includes(kw));
  }
  // 半成品中：不含肉关键词的视为副菜
  if (cat === "semi-finished") {
    const text = recipe.title + (recipe.coreIngredients || []).join(",");
    return !MEAT_KEYWORDS.some((kw) => text.includes(kw));
  }
  return false;
}

// 兼容旧函数名
function isMeatDish(recipe) { return isMainDish(recipe); }
function isVegDish(recipe) { return isSideDish(recipe); }

// 前端本地食材匹配：检查食材是否在库存中（简化版，不做等价类/泛化匹配）
function localItemMatches(inventorySet, item) {
  if (inventorySet.has(item)) return true;
  // 检查别名
  const aliases = [
    ["番茄", "西红柿"], ["蕃茄", "西红柿"], ["蛋", "鸡蛋"],
    ["大葱", "葱"], ["香葱", "葱"], ["小葱", "葱"], ["葱花", "葱"],
    ["生姜", "姜"], ["大蒜", "蒜"], ["植物油", "食用油"], ["油", "食用油"],
    ["食盐", "盐"], ["白糖", "糖"],
  ];
  for (const [from, to] of aliases) {
    if (item === from && inventorySet.has(to)) return true;
    if (item === to && inventorySet.has(from)) return true;
  }
  return false;
}

// 计算菜谱与冰箱的已有/缺失食材
function computeExistingMissing(recipe) {
  const inventorySet = new Set([...fridge.map((i) => i.name), ...seasonings]);
  const required = recipe.requiredIngredients || [];
  const existing = required.filter((i) => localItemMatches(inventorySet, i));
  const missing = required.filter((i) => !localItemMatches(inventorySet, i));
  const coreIng = recipe.coreIngredients || [];
  const missingCore = coreIng.filter(
    (i) => !localItemMatches(inventorySet, i) && !isLocalBasicSeasoning(i)
  );
  const coverage = required.length > 0 ? existing.length / required.length : 0;
  return {
    existing,
    missing,
    missingCore,
    matchPercent: Math.round(coverage * 100),
  };
}

// 前端版基础调料判断
function isLocalBasicSeasoning(item) {
  const basic = new Set([
    "盐", "糖", "冰糖", "白糖", "酱油", "生抽", "老抽", "醋", "料酒",
    "食用油", "植物油", "油", "葱", "姜", "蒜", "辣椒", "花椒", "八角",
    "桂皮", "香叶", "淀粉", "蚝油", "豆瓣酱", "味精", "鸡精",
    "芝麻", "香油", "清水", "蜂蜜",
  ]);
  return basic.has(item);
}

// 规范化 missingCore：API 结果可能只有 missing（含基础调料），需补充 missingCore
// missingCore = missing 中属于核心食材且非基础调料的部分
function normalizeMissingCore(results) {
  for (const r of results) {
    if (Array.isArray(r.missingCore)) continue;
    const core = (r.recipe && r.recipe.coreIngredients) || [];
    const coreSet = new Set(core);
    r.missingCore = (r.missing || []).filter(
      (i) => coreSet.has(i) && !isLocalBasicSeasoning(i)
    );
  }
  return results;
}

// 本地兜底：补充 RAG 可能遗漏的精确匹配菜谱
// 检查 allRecipes 中不在 API 结果里的菜谱，如果核心食材全部命中则补充
function supplementExactMatches(apiResults, ingredients) {
  if (!allRecipes || allRecipes.length === 0) return apiResults;
  const resultIds = new Set(apiResults.map((r) => r.recipe.id));
  const inventorySet = new Set(ingredients);
  const supplemented = [...apiResults];
  let added = 0;
  for (const recipe of allRecipes) {
    if (resultIds.has(recipe.id)) continue;
    // 检查核心食材是否全部命中（基础调料跳过）
    const coreIng = recipe.coreIngredients || [];
    const missingCore = coreIng.filter(
      (i) => !localItemMatches(inventorySet, i) && !isLocalBasicSeasoning(i)
    );
    if (missingCore.length === 0 && coreIng.length > 0) {
      // 核心食材全部命中，补充到结果中
      const required = recipe.requiredIngredients || [];
      const existing = required.filter((i) => localItemMatches(inventorySet, i));
      const missing = required.filter((i) => !localItemMatches(inventorySet, i));
      const coverage = required.length > 0 ? existing.length / required.length : 0;
      const _hr = getHomeRank(recipe);
      const homeBonus = _hr === 2 ? 30 : (_hr === 1 ? 12 : 0);
      supplemented.push({
        recipe,
        score: coverage * 100 + 20 + homeBonus, // 精确匹配加分+家常菜加分
        matchPercent: Math.round(coverage * 100),
        existing,
        missing,
        missingCore: [],
        missingSeasonings: [],
        optional: recipe.optionalIngredients || [],
        reason: "食材全部匹配",
        homeRank: _hr,
      });
      added++;
    }
  }
  if (added > 0) {
    FrontendLogger.info("api", "本地兜底补充", { added, total: supplemented.length });
  }
  return supplemented;
}

// 组合类型标签
function comboTypeLabel(type) {
  switch (type) {
    case "top2": return "双菜组合";
    case "single": return "今日推荐";
    case "ai": return "AI大厨推荐";
    default: return "推荐组合";
  }
}

// 水类食材：不作为食材在前端展示
const WATER_ITEMS_DISPLAY = new Set(["水", "清水", "开水", "温水", "凉水", "热水", "冷水", "饮用水", "沸水", "100°C沸水", "30°C温水"]);
function filterWaterItems(items) {
  return (items || []).filter(i => !WATER_ITEMS_DISPLAY.has(i));
}

// 构建单个组合对象
function buildCombo(recs, type) {
  // 使用 missingCore（排除基础调料）而非 missing，避免只缺葱/盐等调料的菜谱被误判
  const totalMissing = recs.reduce((s, r) => s + (r.missingCore || r.missing || []).length, 0);
  const totalSortScore = recs.reduce((s, r) => s + (r.recipe.sortScore || 10), 0);
  const totalMatchPercent = Math.round(
    recs.reduce((s, r) => s + r.matchPercent, 0) / recs.length
  );
  return { recipes: recs, type, totalMissing, totalSortScore, totalMatchPercent };
}

/**
 * 根据搜索结果生成菜单推荐
 * 排序规则：按综合评分 score 降序（score已包含家常菜加分、覆盖率、缺失惩罚、难度、快手奖励等）
 * 默认返回排名前12的单菜，第1个是最容易做的，用户可左右切换浏览
 */
function buildMenuCombinations(results) {
  if (!results || results.length === 0) return [];

  const sorted = results.slice().sort((a, b) => {
    // 主排序：综合评分降序
    const scoreDiff = (b.score || 0) - (a.score || 0);
    if (Math.abs(scoreDiff) > 0.01) return scoreDiff;
    // 兜底：缺失核心食材少的优先
    const aMissing = (a.missingCore || []).length;
    const bMissing = (b.missingCore || []).length;
    if (aMissing !== bMissing) return aMissing - bMissing;
    // 兜底：匹配度高的优先
    return (b.matchPercent || 0) - (a.matchPercent || 0);
  });

  // 返回前12个单菜推荐，支持左右切换浏览
  const topN = Math.min(12, sorted.length);
  return sorted.slice(0, topN).map((r) => buildCombo([r], "single"));
}

/**
 * 生成双菜组合推荐（大厨弹窗选择"两个菜组合"时调用）
 * 规则：1荤1素搭配，返回多个组合支持左右切换浏览
 */
function buildDualMenuCombinations(results) {
  if (!results || results.length === 0) return [];

  const sorted = results.slice().sort((a, b) => {
    const scoreDiff = (b.score || 0) - (a.score || 0);
    if (Math.abs(scoreDiff) > 0.01) return scoreDiff;
    const aMissing = (a.missingCore || []).length;
    const bMissing = (b.missingCore || []).length;
    if (aMissing !== bMissing) return aMissing - bMissing;
    return (b.matchPercent || 0) - (a.matchPercent || 0);
  });

  // 分离主菜（荤）和副菜（素）
  const mainDishes = sorted.filter(r => isMainDish(r.recipe));
  const sideDishes = sorted.filter(r => isSideDish(r.recipe));

  // 如果分类后数量不足，尝试用全部结果补充
  const allDishes = sorted;
  const mains = mainDishes.length > 0 ? mainDishes : allDishes;
  const sides = sideDishes.length > 0 ? sideDishes : allDishes;

  // 生成组合：1荤1素，去重，限制最多取前M荤N素进行组合避免爆炸
  const MAX_MAINS = Math.min(8, mains.length);
  const MAX_SIDES = Math.min(8, sides.length);
  const usedCombos = new Set();
  const combos = [];

  for (let i = 0; i < MAX_MAINS; i++) {
    for (let j = 0; j < MAX_SIDES; j++) {
      const main = mains[i];
      const side = sides[j];
      // 同一道菜不能自己和自己组合
      if (main.recipe.id === side.recipe.id) continue;
      // 去重：组合key按ID排序
      const ids = [main.recipe.id, side.recipe.id].sort();
      const key = ids.join("|");
      if (usedCombos.has(key)) continue;
      usedCombos.add(key);

      // 组合评分：两菜平均得分 + 缺失食材总数惩罚
      const avgScore = ((main.score || 0) + (side.score || 0)) / 2;
      const totalMissing = ((main.missingCore || []).length + (side.missingCore || []).length);
      const comboScore = avgScore - totalMissing * 0.3;

      combos.push({
        dishes: [main, side],
        comboScore,
        totalMissing
      });
    }
  }

  // 按组合评分排序
  combos.sort((a, b) => {
    if (Math.abs(b.comboScore - a.comboScore) > 0.01) return b.comboScore - a.comboScore;
    return a.totalMissing - b.totalMissing;
  });

  // 返回最多12个组合，支持左右切换浏览
  const topN = Math.min(12, combos.length);
  return combos.slice(0, topN).map(c => buildCombo(c.dishes, "dual"));
}

/**
 * 通过AI生成双菜推荐（大厨弹窗选择"AI推荐"时调用）
 */
async function generateAIRecommendedMenu() {
  const ingredients = fridge.map((i) => i.name);
  const allIngredients = [...ingredients, ...seasonings];
  if (ingredients.length === 0) {
    showToast("冰箱还是空的，先添加食材吧");
    return;
  }

  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="page" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:80vh">
      <div class="loading-spinner"></div>
      <div style="margin-top:12px;color:var(--text-muted)">AI大厨正在联网搜索…</div>
      <div style="margin-top:6px;font-size:12px;color:var(--text-muted);opacity:0.7">结合冰箱食材和全网菜谱为你搭配</div>
    </div>
  `;

  try {
    const expiringItems = getExpiringIngredients();
    const expiringHint = expiringItems.length > 0
      ? `\n临期食材（优先使用）：${expiringItems.join("、")}`
      : "";

    // AI联网推荐：不局限于本地菜谱，让AI基于食材自由推荐
    const prompt = `你是一位专业厨师。用户冰箱里有以下食材：${ingredients.join("、")}。
可用调料：${seasonings.join("、")}。${expiringHint}

请基于这些食材，推荐2道搭配合理的菜。可以是任何菜谱，不限于本地菜谱库。要求：
1. 优先考虑使用临期食材的菜
2. 两道菜应该互补（如一荤一素、一主一副）
3. 总烹饪时间合理（不超过1小时）
4. 尽量使用用户已有的食材，减少需要购买的食材

请以JSON格式返回，格式如下：
{"dish1": "菜名1", "dish2": "菜名2", "reason": "推荐理由（简短一句话）", "dish1_ingredients": ["食材1","食材2"], "dish2_ingredients": ["食材1","食材2"], "dish1_steps": ["步骤1详细描述","步骤2详细描述","步骤3详细描述"], "dish2_steps": ["步骤1详细描述","步骤2详细描述","步骤3详细描述"]}`;

    const aiResponse = await callAI(prompt, "recommend");
    FrontendLogger.info("menu", "AI推荐结果", { aiResponse });

    // 解析AI返回的JSON
    let aiResult;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("AI未返回有效JSON");
      }
    } catch (e) {
      FrontendLogger.warning("menu", "AI返回解析失败，使用默认推荐", { error: e.message });
      // 解析失败则使用默认推荐
      const rawResults = await searchRecipes(allIngredients, "scrappy", [], 30, false, expiringItems);
      const supplemented = supplementExactMatches(rawResults, allIngredients);
      const processed = applyDietAndAllergens(supplemented);
      normalizeMissingCore(processed);
      searchResults = buildDualMenuCombinations(processed);
      renderSwipePage();
      return;
    }

    // 先尝试从本地菜谱库匹配
    let dish1Rec = null, dish2Rec = null;
    if (allRecipes && allRecipes.length > 0) {
      // 模糊匹配菜名
      const findRecipe = (name) => {
        if (!name) return null;
        // 精确匹配
        let match = allRecipes.find(r => r.title === name);
        if (match) return match;
        // 包含匹配
        match = allRecipes.find(r => r.title.includes(name) || name.includes(r.title));
        return match || null;
      };
      const r1 = findRecipe(aiResult.dish1);
      const r2 = findRecipe(aiResult.dish2);

      // 构建推荐结果
      const allIngredientsSet = new Set(allIngredients);
      const buildRecFromRecipe = (recipe) => {
        const required = recipe.requiredIngredients || [];
        const existing = required.filter(i => localItemMatches(allIngredientsSet, i));
        const missing = required.filter(i => !localItemMatches(allIngredientsSet, i));
        const missingCore = (recipe.coreIngredients || []).filter(
          i => !localItemMatches(allIngredientsSet, i) && !isLocalBasicSeasoning(i)
        );
        const coverage = required.length > 0 ? existing.length / required.length : 0;
        return {
          recipe,
          score: coverage * 100,
          matchPercent: Math.round(coverage * 100),
          existing,
          missing,
          missingCore,
          missingSeasonings: [],
          optional: recipe.optionalIngredients || [],
          reason: aiResult.reason || "AI大厨推荐",
          homeRank: getHomeRank(recipe),
        };
      };

      if (r1) dish1Rec = buildRecFromRecipe(r1);
      if (r2) dish2Rec = buildRecFromRecipe(r2);
    }

    // 如果本地匹配失败，构建虚拟菜谱
    if (!dish1Rec) {
      dish1Rec = buildVirtualRecipe(aiResult.dish1, aiResult.dish1_ingredients || [], allIngredients, aiResult.dish1_steps || []);
    }
    if (!dish2Rec) {
      dish2Rec = buildVirtualRecipe(aiResult.dish2, aiResult.dish2_ingredients || [], allIngredients, aiResult.dish2_steps || []);
    }

    const combo = buildCombo([dish1Rec, dish2Rec], "ai");
    combo.aiReason = aiResult.reason || "AI大厨推荐";
    searchResults = [combo];

    selectedTags = [];
    swipeIndex = 0;
    renderSwipePage();
  } catch (e) {
    FrontendLogger.error("menu", "AI推荐失败", { error: e.message });
    showToast("AI推荐失败，使用默认推荐");
    generateMenu();
  }
}

// 构建虚拟菜谱（AI推荐的菜不在本地库中时）
function buildVirtualRecipe(title, aiIngredients, userIngredients, aiSteps) {
  const ingSet = new Set(userIngredients);
  const existing = aiIngredients.filter(i => localItemMatches(ingSet, i));
  const missing = aiIngredients.filter(i => !localItemMatches(ingSet, i));
  const coverage = aiIngredients.length > 0 ? existing.length / aiIngredients.length : 0;
  const recipeId = "ai_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
  const steps = (aiSteps && Array.isArray(aiSteps) && aiSteps.length > 0) ? aiSteps : [];
  const recipe = {
    id: recipeId,
    title,
    category: "ai_recipe",
    categoryLabel: "联网搜索",
    sourcePath: "",
    difficulty: 2,
    calories: null,
    timeMinutes: 30,
    requiredIngredients: aiIngredients,
    coreIngredients: aiIngredients,
    seasonings: [],
    optionalIngredients: [],
    steps,
    images: [],
    tags: ["AI推荐"],
    description: "AI大厨联网搜索推荐菜谱",
    quantities: {},
    tips: [],
  };
  // 保存到本地AI菜谱库
  saveAIRecipe(recipe);
  return {
    recipe,
    score: coverage * 100,
    matchPercent: Math.round(coverage * 100),
    existing,
    missing,
    missingCore: missing,
    missingSeasonings: [],
    optional: [],
    reason: "AI大厨推荐",
    homeRank: 0,
  };
}

// ============================================
// AI联网搜索菜谱本地存储
// ============================================
const AI_RECIPES_KEY = "ccc_ai_recipes";

function getAIRecipes() {
  try {
    return JSON.parse(localStorage.getItem(AI_RECIPES_KEY) || "[]");
  } catch { return []; }
}

function saveAIRecipe(recipe) {
  const list = getAIRecipes();
  // 同名菜谱不重复保存
  if (!list.find(r => r.title === recipe.title)) {
    list.unshift(recipe);
    if (list.length > 50) list.length = 50;
    localStorage.setItem(AI_RECIPES_KEY, JSON.stringify(list));
  }
}

function deleteAIRecipe(recipeId) {
  const list = getAIRecipes().filter(r => r.id !== recipeId);
  localStorage.setItem(AI_RECIPES_KEY, JSON.stringify(list));
}

async function generateMenu() {
  const ingredients = fridge.map((i) => i.name);
  // 调料算入库存食材参与推荐
  const allIngredients = [...ingredients, ...seasonings];
  if (ingredients.length === 0) {
    FrontendLogger.warning("menu", "生成菜单失败：冰箱为空");
    showToast("冰箱还是空的，先添加食材吧");
    return;
  }
  FrontendLogger.info("menu", "生成菜单", { ingredients });

  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="page" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:80vh">
      <div class="loading-spinner"></div>
      <div style="margin-top:12px;color:var(--text-muted)">正在匹配最佳菜谱…</div>
      <div id="loadingHint" style="margin-top:6px;font-size:12px;color:var(--text-muted);opacity:0.7">首次请求可能需要 10-20 秒（服务器冷启动）</div>
    </div>
  `;

  try {
    // 获取临期食材，用于生成推荐理由
    const expiringItems = getExpiringIngredients();
    // 获取更多结果用于本地标签过滤 + 组合去重（去重需要较大菜谱池）
    const rawResults = await searchRecipes(allIngredients, "scrappy", [], 150, false, expiringItems);
    // 本地兜底：补充 RAG 可能遗漏的精确匹配菜谱
    const supplemented = supplementExactMatches(rawResults, allIngredients);
    // 应用饮食偏好（硬过滤）+ 过敏源（标识 + 排序降权）
    const processed = applyDietAndAllergens(supplemented);
    // 规范化：API 结果可能只有 missing（含基础调料），需补充 missingCore（排除基础调料的核心缺失）
    normalizeMissingCore(processed);
    // 保存原始搜索结果（已应用偏好/过敏源），供标签筛选使用
    allSearchResults = processed;
    // 生成菜单推荐（取排名最前的2道菜）
    searchResults = buildMenuCombinations(processed);
    selectedTags = [];
    swipeIndex = 0;
    FrontendLogger.info("menu", "菜单生成完成", { rawResults: rawResults.length, supplemented: supplemented.length, combos: searchResults.length });
    renderSwipePage();
  } catch (e) {
    FrontendLogger.error("menu", "生成菜单失败", { error: e.message });
    console.error("生成菜单失败:", e);
    const reason = e.message || "未知错误";
    showToast(`搜索失败：${reason}，请重试`);
    renderPage("home");
  }
}

// 推荐页自定义标签：基于 allSearchResults 本地过滤
function getExpiringIngredients() {
  return fridge.filter((item) => {
    const s = getExpiryStatus(item.name, item.addedAt);
    return s.status !== "fresh"; // expiring (≤3天) 或 expired
  }).map((i) => i.name);
}

function getCustomSwipeTags() {
  const cookNow = allSearchResults.filter((r) => (r.missing || []).length === 0).length;
  const missingOne = allSearchResults.filter((r) => (r.missing || []).length === 1).length;
  const expiringNames = getExpiringIngredients();
  const clearExpiring = allSearchResults.filter((r) => {
    const existing = r.existing || [];
    return existing.some((ing) => expiringNames.includes(ing));
  }).length;
  return [
    { value: "cook_now", label: "现在就能做", count: cookNow },
    { value: "missing_one", label: "只差一样", count: missingOne },
    { value: "clear_expiring", label: "优先清理临期食材", count: clearExpiring },
  ];
}

function filterByCustomTag(results, tags) {
  if (!tags || tags.length === 0) return results;
  const expiringNames = getExpiringIngredients();
  return results.filter((r) => {
    for (const tag of tags) {
      if (tag === "cook_now" && (r.missing || []).length === 0) return true;
      if (tag === "missing_one" && (r.missing || []).length === 1) return true;
      if (tag === "clear_expiring") {
        const existing = r.existing || [];
        if (existing.some((ing) => expiringNames.includes(ing))) return true;
      }
    }
    return false;
  });
}

function renderSwipePage() {
  const app = document.getElementById("app");
  document.getElementById("bottomNav").style.display = "none";

  app.innerHTML = `
    <div class="page swipe-page">
      <div class="swipe-header">
        <button class="swipe-header-back" onclick="backToHome()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          返回
        </button>
        <div class="swipe-header-title">为你推荐</div>
        <button class="swipe-chef-btn" onclick="showChefRecommendMenu()" title="大厨推荐">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 11h.01"/><path d="M11 15h.01"/><path d="M16 16h.01"/><path d="m2 16 20 6-6-20A20 20 0 0 0 2 16"/><path d="M5.71 17.11a17.04 17.04 0 0 1 11.4-11.4"/></svg>
        </button>
      </div>

      <div class="tag-filter-bar">
        ${getCustomSwipeTags().map((tag) => {
          const isActive = selectedTags.includes(tag.value);
          return `
            <div class="tag-filter ${isActive ? "active" : ""}" onclick="toggleTagFilter('${tag.value}')">
              ${isActive ? '<svg class="tag-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ""}
              ${tag.label}
              <span class="tag-count">${tag.count}</span>
            </div>
          `;
        }).join("")}
      </div>

      <div class="swipe-result-count">
        ${selectedTags.length > 0
          ? `已选 ${selectedTags.length} 个标签 · 匹配 ${searchResults.length} 个组合`
          : `共 ${searchResults.length} 个推荐组合`}
      </div>

      <div class="card-stack-container" id="cardStackContainer">
        ${renderCardStack()}
      </div>

      <div class="swipe-indicators">
        <button class="swipe-btn swipe-btn-prev" onclick="swipePrev()" aria-label="上一个">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <span class="swipe-page-indicator" id="swipePageIndicator">${swipeIndex + 1}/${searchResults.length}</span>
        <button class="swipe-btn swipe-btn-next" onclick="swipeNext()" aria-label="下一个">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
      <div class="swipe-indicator-hint">点击菜品查看详情 · 左右滑动切换 · 键盘←→切换</div>
    </div>
  `;

  setupCardSwipe();
  setupSwipeKeyboard();
}

// 键盘左右箭头切换
var _swipeKeyHandler = null;
function setupSwipeKeyboard() {
  // 先移除旧的监听
  if (_swipeKeyHandler) {
    document.removeEventListener("keydown", _swipeKeyHandler);
  }
  _swipeKeyHandler = function(e) {
    // 只有在推荐页面才响应
    if (page !== "swipe") return;
    // 如果焦点在输入框中不响应
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      swipePrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      swipeNext();
    }
  };
  document.addEventListener("keydown", _swipeKeyHandler);
}
function removeSwipeKeyboard() {
  if (_swipeKeyHandler) {
    document.removeEventListener("keydown", _swipeKeyHandler);
    _swipeKeyHandler = null;
  }
}

function renderCardStack() {
  const hasItems = searchResults.length > 0;

  if (!hasItems) {
    const hasTagFilter = selectedTags.length > 0;
    return `
      <div class="swipe-empty">
        <div class="swipe-empty-icon">${hasTagFilter ? "🏷️" : "🍽️"}</div>
        <div style="font-size:16px;font-weight:600;margin-bottom:4px">
          ${hasTagFilter ? "该标签下暂无匹配菜谱" : "没有更多推荐了"}
        </div>
        <div style="font-size:13px">
          ${hasTagFilter ? "试试取消标签或选择其他标签" : "试试调整标签筛选或添加更多食材"}
        </div>
      </div>
    `;
  }

  const current = searchResults[swipeIndex];

  return `
    <div class="card-stack">
      ${renderSwipeCard(current, 0)}
    </div>
  `;
}

// 生成推荐原因：临期食材提示 / 食材齐全 / 只差一样
function getRecommendReason(rec) {
  const expiringNames = getExpiringIngredients();
  const existing = filterWaterItems(rec.existing || []);
  const missing = filterWaterItems(rec.missing || []);
  // 优先使用后端返回的详细理由
  if (rec.reason && rec.reason.includes("使用冰箱") || rec.reason && rec.reason.includes("可消耗临期")) {
    return rec.reason;
  }
  // 找出这道菜用到的临期食材
  const usedExpiring = existing.filter((ing) => expiringNames.includes(ing));
  if (usedExpiring.length > 0) {
    return `${usedExpiring.slice(0, 2).join("、")}快过期了哦，赶紧用掉`;
  }
  if (missing.length === 0) {
    return "食材齐全，立刻就能做";
  }
  if (missing.length === 1) {
    return `只差一样：${missing[0]}就能做`;
  }
  // 兜底用后端生成的 reason
  return rec.reason || `缺${missing.length}样食材`;
}

function renderSwipeCard(combo, stackIdx) {
  // 单菜兜底：直接走老的渲染逻辑，避免组合卡片样式显得空旷
  if (combo.type === "single") {
    const rec = combo.recipes[0];
    const recipe = rec.recipe;
    const image = getRecipeImage(recipe);
    const emoji = getRecipeEmoji(recipe);
    const missingChips = filterWaterItems(rec.missing || []).slice(0, 5).map((i) =>
      `<span class="ingredient-chip missing">${i}</span>`
    ).join("");
    const haveChips = filterWaterItems(rec.existing || []).slice(0, 5).map((i) =>
      `<span class="ingredient-chip have">${i}</span>`
    ).join("");
    return `
      <div class="swipe-card" data-idx="${swipeIndex + stackIdx}">
        ${image
          ? `<img class="swipe-card-image" src="${assetUrl(image)}" alt="${recipe.title}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
             <div class="swipe-card-placeholder" style="display:none">${emoji}</div>`
          : `<div class="swipe-card-placeholder">${emoji}</div>`
        }
        ${_creatorMode ? `<div class="swipe-card-match-badge">匹配 ${rec.matchPercent}%</div>` : ""}
        ${rec.hasAllergen ? `<div class="allergen-flag">含过敏源：${(getRecipeAllergenLabels(recipe) || []).join("、")}</div>` : ""}
        <div class="swipe-card-body">
          <div class="swipe-card-title">${recipe.title}</div>
          <div class="swipe-card-meta">
            ${recipe.timeMinutes ? `<span>⏱ ${recipe.timeMinutes}分钟</span>` : ""}
            ${recipe.calories ? `<span>🔥 ${recipe.calories}卡</span>` : ""}
            ${recipe.difficulty ? `<span>难度 ${"★".repeat(recipe.difficulty)}</span>` : ""}
          </div>
          <div class="swipe-card-reason">${getRecommendReason(rec)}</div>
          <div class="swipe-card-ingredients">
            ${haveChips}
            ${missingChips}
          </div>
        </div>
      </div>
    `;
  }

  // 组合卡片：展示 2-3 道菜
  const items = combo.recipes.map((rec, i) => {
    const recipe = rec.recipe;
    const image = getRecipeImage(recipe);
    const emoji = getRecipeEmoji(recipe);
    const dishKindTag = isMainDish(recipe)
      ? `<span class="combo-item-kind meat">主</span>`
      : `<span class="combo-item-kind veg">副</span>`;
    // 用 data-* 把做菜需要的参数编码进去，避免 onclick 拼接 JSON 的转义问题
    return `
      <div class="combo-item" data-recipe-id="${recipe.id}" data-idx="${i}">
        <div class="combo-item-image">
          ${image
            ? `<img src="${assetUrl(image)}" alt="${recipe.title}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
               <div class="combo-item-placeholder" style="display:none">${emoji}</div>`
            : `<div class="combo-item-placeholder">${emoji}</div>`
          }
          ${dishKindTag}
        </div>
        <div class="combo-item-info">
          <div class="combo-item-title">${recipe.title}</div>
          <div class="combo-item-meta">
            ${recipe.timeMinutes ? `<span>⏱${recipe.timeMinutes}'</span>` : ""}
            ${recipe.difficulty ? `<span>${"★".repeat(recipe.difficulty)}</span>` : ""}
            ${_creatorMode ? `<span class="combo-item-match">匹配${rec.matchPercent}%</span>` : ""}
            ${rec.hasAllergen ? `<span class="combo-item-allergen">⚠含过敏源：${(getRecipeAllergenLabels(recipe) || []).join("、")}</span>` : ""}
          </div>
          <div class="combo-item-missing">
            ${filterWaterItems(rec.missing || []).length === 0
              ? `<span class="combo-missing-ok">食材齐备</span>`
              : `<span class="combo-missing-text">缺 ${filterWaterItems(rec.missing || []).slice(0, 3).join("、")}${filterWaterItems(rec.missing || []).length > 3 ? "…" : ""}</span>`
            }
          </div>
          <div class="combo-item-reason">${getRecommendReason(rec)}</div>
        </div>
      </div>
    `;
  }).join("");

  return `
    <div class="swipe-card combo-card" data-idx="${swipeIndex + stackIdx}">
      <div class="combo-card-header">
        <span class="combo-badge">${comboTypeLabel(combo.type)}</span>
        ${_creatorMode ? `<span class="combo-match">综合匹配 ${combo.totalMatchPercent}%</span>` : ""}
      </div>
      <div class="combo-items">${items}</div>
      ${combo.aiReason ? `<div class="combo-ai-reason">🤖 ${combo.aiReason}</div>` : ""}
      <div class="combo-card-footer">
        <span class="combo-footer-hint">点击菜品开始做菜 · 点击空白处切换</span>
      </div>
    </div>
  `;
}

function getRecipeEmoji(recipe) {
  const cat = recipe.category || "";
  if (cat.includes("aquatic")) return "🐟";
  if (cat.includes("meat")) return "🍖";
  if (cat.includes("vegetable")) return "🥬";
  if (cat.includes("soup")) return "🍲";
  if (cat.includes("staple")) return "🍚";
  return "🍳";
}

// ============================================
// 卡片拖拽
// ============================================
let dragState = null;
// 上次交互时间戳：用于阻止触摸后合成的鼠标事件重新触发 onStart
let _lastSwipeAt = 0;
// document 级监听器引用：避免每次 setupCardSwipe 累积新监听器
let _docMoveRef = null;
let _docUpRef = null;
// 正在飞出的卡片锁：避免动画过程中重复触发滑动
let _swipeAnimating = false;

function setupCardSwipe() {
  const card = document.querySelector(".swipe-card[data-idx='" + swipeIndex + "']");
  if (!card) return;

  const SWIPE_THRESHOLD = 70; // 滑动触发阈值（像素）

  const onStart = (e) => {
    if (e.type === "mousedown" && Date.now() - _lastSwipeAt < 600) return;
    if (_swipeAnimating) return;

    const point = e.touches ? e.touches[0] : e;
    dragState = {
      card,
      startX: point.clientX,
      startY: point.clientY,
      dx: 0,
      dy: 0,
      pointerType: e.touches ? "touch" : "mouse",
      locked: false, // 是否锁定为水平滑动
    };
    card.classList.add("dragging");
  };

  let rafId = null;
  const onMove = (e) => {
    if (!dragState) return;
    const point = e.touches ? e.touches[0] : e;
    dragState.dx = point.clientX - dragState.startX;
    dragState.dy = point.clientY - dragState.startY;

    // 判断是否锁定为水平滑动（防止垂直滚动时误触发）
    if (!dragState.locked && Math.abs(dragState.dx) > 8 && Math.abs(dragState.dy) > 8) {
      if (Math.abs(dragState.dx) > Math.abs(dragState.dy) * 1.2) {
        dragState.locked = true;
      } else {
        // 垂直滚动为主，取消拖拽
        dragState = null;
        card.classList.remove("dragging");
        card.style.transform = "";
        return;
      }
    }

    if (dragState.locked && e.cancelable) e.preventDefault();

    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      if (!dragState) return;
      const rotation = dragState.dx * 0.1;
      dragState.card.style.transform = `translate3d(${dragState.dx}px, ${dragState.locked ? 0 : dragState.dy}px, 0) rotate(${rotation}deg)`;
    });
  };

  const onEnd = (e) => {
    if (!dragState) return;
    const { card: c, dx, dy, locked } = dragState;
    c.classList.remove("dragging");
    _lastSwipeAt = Date.now();

    if (locked && dx < -SWIPE_THRESHOLD) {
      // 左滑：下一个（卡片向左飞出，显示右侧的下一张）
      swipeNext();
    } else if (locked && dx > SWIPE_THRESHOLD) {
      // 右滑：上一个（卡片向右飞出，显示左侧的上一张）
      swipePrev();
    } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      // 点击
      const combo = searchResults[swipeIndex];
      if (!combo) { dragState = null; return; }

      const targetEl = (e && (e.target || e.srcElement)) || null;
      if (combo.type === "single") {
        const rec = combo.recipes[0];
        showRecipeDetailFromRecommend(rec);
        dragState = null;
        return;
      }

      const comboItem = targetEl ? targetEl.closest(".combo-item") : null;
      if (comboItem) {
        const idx = parseInt(comboItem.dataset.idx, 10);
        const rec = combo.recipes[idx];
        if (rec) showRecipeDetailFromRecommend(rec);
      } else {
        let clickX = 0;
        const cardRect = c.getBoundingClientRect();
        if (e.changedTouches && e.changedTouches[0]) {
          clickX = e.changedTouches[0].clientX - cardRect.left;
        } else if (e.clientX != null) {
          clickX = e.clientX - cardRect.left;
        }
        if (clickX < cardRect.width / 2) {
          swipePrev();
        } else {
          swipeNext();
        }
      }
    } else {
      c.style.transform = "";
    }
    dragState = null;
  };

  card.addEventListener("touchstart", onStart, { passive: true });
  card.addEventListener("touchmove", onMove, { passive: false });
  card.addEventListener("touchend", onEnd);
  card.addEventListener("mousedown", onStart);

  if (_docMoveRef) {
    document.removeEventListener("mousemove", _docMoveRef);
    document.removeEventListener("mouseup", _docUpRef);
  }
  _docMoveRef = onMove;
  _docUpRef = onEnd;
  document.addEventListener("mousemove", _docMoveRef);
  document.addEventListener("mouseup", _docUpRef);

  // 更新按钮禁用状态
  updateSwipeNavButtons();
}

// 更新左右导航按钮的禁用状态和页码
function updateSwipeNavButtons() {
  var prevBtn = document.querySelector(".swipe-btn-prev");
  var nextBtn = document.querySelector(".swipe-btn-next");
  var indicator = document.getElementById("swipePageIndicator");
  if (prevBtn) {
    var isFirst = swipeIndex <= 0;
    prevBtn.disabled = isFirst;
    prevBtn.style.opacity = isFirst ? "0.3" : "1";
    prevBtn.style.pointerEvents = isFirst ? "none" : "auto";
  }
  if (nextBtn) {
    var isLast = swipeIndex >= searchResults.length - 1;
    nextBtn.disabled = isLast;
    nextBtn.style.opacity = isLast ? "0.3" : "1";
    nextBtn.style.pointerEvents = isLast ? "none" : "auto";
  }
  if (indicator) {
    indicator.textContent = (swipeIndex + 1) + "/" + searchResults.length;
  }
}

// 滑动切换：单卡片模式，新卡片从对应方向滑入
function swipePrev() {
  if (_swipeAnimating) return;
  if (swipeIndex <= 0) return;
  const stack = document.querySelector(".card-stack");
  if (!stack) return;

  const currentCard = stack.querySelector(".swipe-card");
  if (!currentCard) {
    swipeIndex--;
    renderSwipeCardsOnly();
    return;
  }

  _swipeAnimating = true;
  dragState = null;
  _lastSwipeAt = Date.now();

  // 创建新卡片（从左侧滑入）
  const newCombo = searchResults[swipeIndex - 1];
  const newCardHtml = renderSwipeCard(newCombo, 0);
  const wrap = document.createElement("div");
  wrap.innerHTML = newCardHtml;
  const newCard = wrap.firstElementChild;
  newCard.style.transform = "translate3d(-105%, 0, 0)";
  newCard.style.opacity = "0.8";
  newCard.style.transition = "none";
  stack.appendChild(newCard);

  // 当前卡片向右飞出
  currentCard.classList.remove("dragging");
  currentCard.style.transform = "";

  requestAnimationFrame(() => {
    currentCard.classList.add("fly-right");
    newCard.style.transition = "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s";
    newCard.style.transform = "translate3d(0, 0, 0)";
    newCard.style.opacity = "1";
  });

  setTimeout(() => {
    swipeIndex--;
    // 清空后重新渲染单卡片，保证状态干净
    stack.innerHTML = renderSwipeCard(searchResults[swipeIndex], 0);
    setupCardSwipe();
    _swipeAnimating = false;
  }, 400);
}

function swipeNext() {
  if (_swipeAnimating) return;
  if (swipeIndex >= searchResults.length - 1) return;
  const stack = document.querySelector(".card-stack");
  if (!stack) return;

  const currentCard = stack.querySelector(".swipe-card");
  if (!currentCard) {
    swipeIndex++;
    renderSwipeCardsOnly();
    return;
  }

  _swipeAnimating = true;
  dragState = null;
  _lastSwipeAt = Date.now();

  // 创建新卡片（从右侧滑入）
  const newCombo = searchResults[swipeIndex + 1];
  const newCardHtml = renderSwipeCard(newCombo, 0);
  const wrap = document.createElement("div");
  wrap.innerHTML = newCardHtml;
  const newCard = wrap.firstElementChild;
  newCard.style.transform = "translate3d(105%, 0, 0)";
  newCard.style.opacity = "0.8";
  newCard.style.transition = "none";
  stack.appendChild(newCard);

  // 当前卡片向左飞出
  currentCard.classList.remove("dragging");
  currentCard.style.transform = "";

  requestAnimationFrame(() => {
    currentCard.classList.add("fly-left");
    newCard.style.transition = "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s";
    newCard.style.transform = "translate3d(0, 0, 0)";
    newCard.style.opacity = "1";
  });

  setTimeout(() => {
    swipeIndex++;
    // 清空后重新渲染单卡片，保证状态干净
    stack.innerHTML = renderSwipeCard(searchResults[swipeIndex], 0);
    setupCardSwipe();
    _swipeAnimating = false;
  }, 400);
}

function renderSwipeCardsOnly() {
  const container = document.getElementById("cardStackContainer");
  if (container) {
    container.innerHTML = renderCardStack();
    setupCardSwipe();
  }
}

function toggleTagFilter(tag) {
  const idx = selectedTags.indexOf(tag);
  if (idx >= 0) selectedTags.splice(idx, 1);
  else selectedTags.push(tag);

  if (selectedTags.length === 0) {
    // 取消所有标签，基于原始搜索结果重新生成组合
    searchResults = buildMenuCombinations(allSearchResults);
  } else {
    // 自定义标签：本地过滤 allSearchResults
    const filtered = filterByCustomTag(allSearchResults, selectedTags);
    // "只差一样" 标签：只显示单菜，不生成组合
    if (selectedTags.includes("missing_one")) {
      searchResults = filtered.slice(0, 20).map((r) => ({
        type: "single",
        recipes: [r],
        totalMissing: (r.missing || []).length,
        totalMatchPercent: r.matchPercent || 0,
      }));
    } else {
      searchResults = buildMenuCombinations(filtered);
    }
  }
  swipeIndex = 0;
  renderSwipePage();
}

function backToHome() {
  document.getElementById("bottomNav").style.display = "";
  removeSwipeKeyboard();
  // 清理document级别的鼠标监听器
  if (_docMoveRef) {
    document.removeEventListener("mousemove", _docMoveRef);
    document.removeEventListener("mouseup", _docUpRef);
    _docMoveRef = null;
    _docUpRef = null;
  }
  renderPage("home");
}

// ============================================
// 菜谱详情
// ============================================
function showRecipeDetail(rec) {
  // 打开新菜谱前清除大厨笔记状态
  if (window.ChefGuides && ChefGuides.isNotesActive()) {
    ChefGuides.clearNotesFromPage();
  }
  closeChefAgentPanel();
  closeChefRecipeMenu();
  // 更新FAB头像为当前启用厨师
  updateChefFabState();
  document.getElementById("bottomNav").style.display = "";
  const recipe = rec.recipe;
  const app = document.getElementById("app");
  const image = getRecipeImage(recipe);
  const emoji = getRecipeEmoji(recipe);

  // 从本地 allRecipes 补全后端缺失的字段（description/quantities/tips）
  const localRecipe = allRecipes.find((r) => r.id === recipe.id);
  const quantities = (localRecipe && localRecipe.quantities) || recipe.quantities || {};
  const tips = (localRecipe && localRecipe.tips) || recipe.tips || [];
  const description = (localRecipe && localRecipe.description) || recipe.description || "";

  const existingSet = new Set(rec.existing || []);
  const allIngredients = [
    ...recipe.coreIngredients.map((i) => ({ name: i, type: "core" })),
    ...recipe.seasonings.map((i) => ({ name: i, type: "seasoning" })),
    ...recipe.optionalIngredients.map((i) => ({ name: i, type: "optional" })),
  ];

  app.innerHTML = `
    <div class="page recipe-detail-page">
      <div class="recipe-detail-hero">
        <button class="recipe-detail-back" onclick="goBackFromRecipeDetail()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
        </button>
        ${image
          ? `<img src="${assetUrl(image)}" alt="${recipe.title}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
             <div class="recipe-detail-hero-placeholder" style="display:none">${emoji}</div>`
          : `<div class="recipe-detail-hero-placeholder">${emoji}</div>`
        }
      </div>

      <div class="recipe-detail-body">
        <div class="recipe-detail-title-row">
          <h1 class="recipe-detail-title">${recipe.title}</h1>
          <button class="recipe-fav-btn-large ${isFavorite(recipe.id) ? 'active' : ''}" onclick="toggleFavoriteDetail('${recipe.id}')" title="${isFavorite(recipe.id) ? '取消收藏' : '收藏'}">
            ${isFavorite(recipe.id) ? '❤️' : '🤍'}
          </button>
        </div>
        <div class="recipe-detail-meta">
          ${recipe.timeMinutes ? `<div class="recipe-detail-meta-item">⏱ ${recipe.timeMinutes}分钟</div>` : ""}
          ${recipe.calories ? `<div class="recipe-detail-meta-item">🔥 ${recipe.calories}卡</div>` : ""}
          ${recipe.difficulty ? `<div class="recipe-detail-meta-item">难度 ${"★".repeat(recipe.difficulty)}</div>` : ""}
          ${_creatorMode ? `<div class="recipe-detail-meta-item">匹配 ${rec.matchPercent}%</div>` : ""}
        </div>

        ${description ? `<p class="recipe-detail-desc">${description}</p>` : ""}

        <div class="recipe-section-title">食材清单</div>
        <div class="ingredient-list">
          ${allIngredients.map((ing) => {
            const have = existingSet.has(ing.name);
            const qty = quantities[ing.name];
            return `
              <div class="ingredient-row ${have ? "have" : "missing"}">
                <span class="ingredient-row-name">${ing.name}${ing.type === "optional" ? "（可选）" : ""}${qty ? `<span class="ingredient-row-qty">${qty}</span>` : ""}</span>
                <span class="ingredient-row-status ${have ? "have" : "missing"}">${have ? "已有" : "需采买"}</span>
              </div>
            `;
          }).join("")}
        </div>

        <div class="recipe-section-title">烹饪步骤</div>
        <div class="step-list">
          ${recipe.steps.map((step, i) => `
            <div class="step-item">
              <div class="step-num">${i + 1}</div>
              <div class="step-text">${step}</div>
            </div>
          `).join("")}
        </div>

        ${tips.length > 0 ? `
          <div class="recipe-section-title">附加内容</div>
          <div class="tips-list">
            ${tips.map((tip) => `
              <div class="tip-item">
                <span class="tip-icon">💡</span>
                <span class="tip-text">${tip}</span>
              </div>
            `).join("")}
          </div>
        ` : ""}

        <button class="btn-start-cooking" onclick="startCooking('${recipe.id}', ${JSON.stringify(rec.missing || []).replace(/"/g, '&quot;')})">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          开始沉浸烹饪
        </button>
      </div>
    </div>
  `;
}

// 从推荐页进入菜谱详情页：保留 rec 信息，返回时回到推荐页
function showRecipeDetailFromRecommend(rec) {
  // 设置返回函数：回到推荐页
  recipeDetailBackFn = () => {
    document.getElementById("bottomNav").style.display = "none";
    renderSwipePage();
  };
  FrontendLogger.info("recipe", "查看推荐菜谱详情", { recipeId: rec.recipe.id, title: rec.recipe.title });
  showRecipeDetail(rec);
}

function backToSwipe() {
  document.getElementById("bottomNav").style.display = "none";
  renderSwipePage();
}

// 记录菜谱详情页的返回动作（不同入口返回到不同上级页面）
let recipeDetailBackFn = null;
let currentMeSubPage = null; // "我的"页面下的子页面：favorites/cooked/consumed/supplemented

// ============================================
// 沉浸式烹饪模式
// ============================================
async function startCooking(recipeId, missingIngredients) {
  // 先从本地菜谱找，找不到再从AI联网搜索菜谱找
  let recipe = allRecipes.find((r) => r.id === recipeId);
  let isAIRecipe = false;
  if (!recipe) {
    const aiRecipes = getAIRecipes();
    recipe = aiRecipes.find((r) => r.id === recipeId);
    isAIRecipe = true;
  }
  if (!recipe) return;

  FrontendLogger.info("cooking", "开始做菜", { recipeId, title: recipe.title, missingCount: (missingIngredients || []).length, isAIRecipe });
  cookingSteps = recipe.steps || [];
  cookingStepIndex = 0;
  cookingRecipeTitle = recipe.title;
  cookingRecipeId = recipeId;
  cookingMissingIngredients = missingIngredients || [];

  // 重置烹饪主体结构（完成态会用 innerHTML 覆盖，需恢复原始元素）
  document.getElementById("cookingBody").innerHTML = `
    <div class="cooking-step-num" id="cookingStepNum">第 1 步</div>
    <div class="cooking-step-text" id="cookingStepText"></div>
    <div class="cooking-tap-hint">轻点进入下一步 · 双击返回上一步</div>
  `;

  const mode = document.getElementById("cookingMode");
  mode.classList.remove("hidden");
  renderCookingStep();

  // 屏幕常亮
  try {
    window.wakeLock = await navigator.wakeLock.request("screen");
  } catch {}
}

function renderCookingStep() {
  const progress = document.getElementById("cookingProgress");
  const stepNum = document.getElementById("cookingStepNum");
  const stepText = document.getElementById("cookingStepText");
  const body = document.getElementById("cookingBody");

  if (cookingStepIndex >= cookingSteps.length) {
    // 烹饪完成
    FrontendLogger.info("cooking", "做菜完成", { recipeId: cookingRecipeId, title: cookingRecipeTitle });
    body.innerHTML = `
      <div class="cooking-done-icon">🎉</div>
      <div class="cooking-done-text">大功告成！</div>
      <div class="cooking-done-sub">${cookingRecipeTitle} 已完成</div>
      <div style="margin-top:24px">
        <button class="cooking-nav-btn cooking-nav-next" style="padding:14px 32px" onclick="exitCookingMode()">完成</button>
      </div>
    `;
    progress.textContent = "完成";
    stepNum.style.display = "none";
    stepText.style.display = "none";

    // 更新统计
    window.userStats.cooked++;
    window.userStats.saved += fridge.length;

    // 记录已做菜谱（含次数）
    if (!window.userStats.cookedRecipes) {
      window.userStats.cookedRecipes = {};
    }
    const cookKey = cookingRecipeId;
    if (window.userStats.cookedRecipes[cookKey]) {
      window.userStats.cookedRecipes[cookKey].count++;
      window.userStats.cookedRecipes[cookKey].lastCooked = Date.now();
    } else {
      window.userStats.cookedRecipes[cookKey] = {
        title: cookingRecipeTitle,
        count: 1,
        lastCooked: Date.now(),
      };
    }

    // 记录消耗的食材（冰箱里的）
    if (!window.userStats.consumedIngredients) {
      window.userStats.consumedIngredients = {};
    }
    fridge.forEach((item) => {
      window.userStats.consumedIngredients[item.name] =
        (window.userStats.consumedIngredients[item.name] || 0) + 1;
    });

    // 记录经常补充的食材（推荐菜谱中需采买的）
    if (!window.userStats.supplementedIngredients) {
      window.userStats.supplementedIngredients = {};
    }
    cookingMissingIngredients.forEach((ing) => {
      window.userStats.supplementedIngredients[ing] =
        (window.userStats.supplementedIngredients[ing] || 0) + 1;
    });

    saveStats();
    return;
  }

  stepNum.style.display = "";
  stepText.style.display = "";
  progress.textContent = `${cookingStepIndex + 1} / ${cookingSteps.length}`;
  stepNum.textContent = `第 ${cookingStepIndex + 1} 步`;
  stepText.textContent = cookingSteps[cookingStepIndex];
}

function cookingNext() {
  if (cookingStepIndex < cookingSteps.length) {
    cookingStepIndex++;
    renderCookingStep();
  }
}

function cookingPrev() {
  if (cookingStepIndex > 0) {
    cookingStepIndex--;
    renderCookingStep();
  }
}

// 单击/双击检测：单击→下一步，双击→上一步
let cookingTapTimer = null;
function handleCookingTap() {
  // 烹饪已完成时不处理点击（由"完成"按钮控制）
  if (cookingStepIndex >= cookingSteps.length) return;
  if (cookingTapTimer) {
    // 第二次点击（双击）：取消单击，执行上一步
    clearTimeout(cookingTapTimer);
    cookingTapTimer = null;
    cookingPrev();
  } else {
    // 第一次点击（单击）：等待 280ms 判断是否双击
    cookingTapTimer = setTimeout(() => {
      cookingTapTimer = null;
      cookingNext();
    }, 280);
  }
}

function exitCookingMode() {
  document.getElementById("cookingMode").classList.add("hidden");
  if (window.wakeLock) {
    window.wakeLock.release();
    window.wakeLock = null;
  }
  // 不强制跳页：底层页面（推荐页或详情页）仍在，用户可继续操作
  if (cookingStepIndex >= cookingSteps.length) {
    showToast("烹饪完成，冰箱已更新");
    // 滚动回页面顶部
    window.scrollTo({ top: 0, behavior: "smooth" });
    // 记录到 Agent memory
    if (window.ChefMemory && cookingRecipeId) {
      ChefMemory.recordCooked(cookingRecipeId, cookingRecipeTitle);
    }
  }
}

// ============================================
// 发现页
// ============================================
function renderDiscover() {
  const categories = {};
  allRecipes.forEach((r) => {
    if (!categories[r.category]) {
      categories[r.category] = { label: r.categoryLabel, count: 0, recipes: [] };
    }
    categories[r.category].count++;
    categories[r.category].recipes.push(r);
  });

  const catEntries = Object.entries(categories);
  const catColors = ["category-card-1", "category-card-2", "category-card-3", "category-card-4"];

  return `
    <div class="page discover-page">
      <h1 class="discover-title">发现好菜</h1>

      <div class="discover-search-bar">
        <svg class="discover-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input type="text" id="discoverSearchInput" class="discover-search-input" placeholder="搜索菜谱名或食材…" oninput="filterDiscoverRecipes(this.value)" />
      </div>

      <div id="discoverContent">
        <div class="category-grid">
          ${catEntries.map(([key, cat], i) => `
            <div class="category-card ${catColors[i % 4]}" onclick="showCategory('${key}')">
              <div class="category-card-title">${cat.label}</div>
              <div class="category-card-count">${cat.count} 道菜</div>
            </div>
          `).join("")}
          <div class="category-card category-card-ai" onclick="showAIRecipeCategory()">
            <div class="category-card-title">🌐 联网搜索</div>
            <div class="category-card-count">${getAIRecipes().length} 道菜</div>
          </div>
        </div>

        <div class="recipe-section-title" style="font-family:var(--font-display);font-size:17px;font-weight:700;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:8px">
            <span>${discoverListMode === "curated" ? "精选菜谱" : "最近浏览"}</span>
            <button class="discover-toggle-btn ${discoverListMode === 'curated' ? 'active' : ''}" onclick="toggleDiscoverListMode('curated')" title="精选菜谱">精选</button>
            <button class="discover-toggle-btn ${discoverListMode === 'recent' ? 'active' : ''}" onclick="toggleDiscoverListMode('recent')" title="最近浏览">最近浏览</button>
          </div>
          ${discoverListMode === "curated" ? `<button class="refresh-btn" onclick="refreshCuratedRecipes()" title="换一批">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
          </button>` : ""}
        </div>
        <div class="recipe-list" id="discoverRecipeList">
          ${discoverListMode === "curated"
            ? getCuratedRecipes().map((r) => renderRecipeListCard(r)).join("")
            : (getRecentlyViewedRecipes(5).length > 0
              ? getRecentlyViewedRecipes(5).map((r) => renderRecipeListCard(r)).join("")
              : `<div style="text-align:center;padding:32px;color:var(--text-muted)"><div style="font-size:36px;margin-bottom:8px">📖</div><div>还没有浏览记录</div><div style="font-size:13px;margin-top:4px">去看看菜谱吧</div></div>`)
          }
        </div>
      </div>
    </div>
  `;
}

function filterDiscoverRecipes(query) {
  query = query.trim().toLowerCase();
  const content = document.getElementById("discoverContent");
  if (!content) return;

  if (!query) {
    // 恢复原始内容
    renderPage("discover");
    return;
  }

  // 搜索菜谱名或食材
  const matched = allRecipes.filter((r) => {
    const titleMatch = r.title.toLowerCase().includes(query);
    const ingredientMatch = r.requiredIngredients.some((ing) =>
      ing.toLowerCase().includes(query)
    );
    return titleMatch || ingredientMatch;
  });

  content.innerHTML = `
    <div class="discover-search-result">
      <div class="discover-search-count">找到 ${matched.length} 道相关菜谱</div>
      <div class="recipe-list">
        ${matched.length > 0
          ? matched.map((r) => renderRecipeListCard(r)).join("")
          : `<div class="discover-search-empty">
               <div style="font-size:36px;margin-bottom:8px">🔍</div>
               <div>没有找到相关菜谱</div>
               <div style="font-size:13px;color:var(--text-muted);margin-top:4px">试试其他关键词</div>
             </div>`
        }
      </div>
    </div>
  `;
}

// 最近浏览记录
const RECENTLY_VIEWED_KEY = "ccc_recently_viewed";
const RECENTLY_VIEWED_MAX = 20;

function getRecentlyViewed() {
  try {
    return JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || "[]");
  } catch { return []; }
}

function addRecentlyViewed(recipeId) {
  let list = getRecentlyViewed();
  list = list.filter(id => id !== recipeId);
  list.unshift(recipeId);
  if (list.length > RECENTLY_VIEWED_MAX) list = list.slice(0, RECENTLY_VIEWED_MAX);
  localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(list));
}

function getRecentlyViewedRecipes(limit = 5) {
  const ids = getRecentlyViewed().slice(0, limit);
  return ids.map(id => allRecipes.find(r => r.id === id)).filter(r => r);
}

// 精选菜谱 / 最近浏览 切换状态
let discoverListMode = "curated"; // "curated" | "recent"

// 精选菜谱：基于最近做过的菜推荐相似菜
let curatedRecipesPool = [];
let curatedOffset = 0;
const CURATED_PAGE_SIZE = 5;

// 获取最近做过的菜（最多10道）
function getRecentCookedRecipes() {
  const history = getCookedHistory();
  return history.slice(0, 10);
}

// 计算菜谱相似度：基于分类、标签、核心食材
function computeRecipeSimilarity(recipeA, recipeB) {
  let score = 0;
  // 同分类 +3分
  if (recipeA.category === recipeB.category) score += 3;
  // 共同标签每个+1分
  const tagsA = new Set(recipeA.tags || []);
  const tagsB = new Set(recipeB.tags || []);
  for (const t of tagsA) {
    if (tagsB.has(t)) score += 1;
  }
  // 共同核心食材每个+2分
  const coreA = new Set(recipeA.coreIngredients || []);
  const coreB = new Set(recipeB.coreIngredients || []);
  for (const c of coreA) {
    if (coreB.has(c)) score += 2;
  }
  return score;
}

// 构建精选菜谱池：基于最近做过的菜推荐相似菜
function buildCuratedRecipesPool() {
  const recentCooked = getRecentCookedRecipes();
  if (recentCooked.length === 0 || !allRecipes || allRecipes.length === 0) {
    // 没有做菜记录，随机选20道
    const shuffled = [...allRecipes].sort(() => Math.random() - 0.5);
    curatedRecipesPool = shuffled.slice(0, 20);
    return;
  }

  // 获取最近做过的菜谱对象
  const cookedIds = new Set(recentCooked.map(r => r.recipeId));
  const cookedRecipes = allRecipes.filter(r => cookedIds.has(r.id));

  // 为每道未做过的菜计算与最近做过菜的最高相似度
  const scored = allRecipes
    .filter(r => !cookedIds.has(r.id))
    .map(r => {
      let maxSim = 0;
      for (const cooked of cookedRecipes) {
        const sim = computeRecipeSimilarity(r, cooked);
        if (sim > maxSim) maxSim = sim;
      }
      return { recipe: r, similarity: maxSim };
    });

  // 按相似度降序排序
  scored.sort((a, b) => b.similarity - a.similarity);
  curatedRecipesPool = scored.map(s => s.recipe);
}

// 获取当前页的精选菜谱
function getCuratedRecipes() {
  if (curatedRecipesPool.length === 0) {
    buildCuratedRecipesPool();
  }
  return curatedRecipesPool.slice(curatedOffset, curatedOffset + CURATED_PAGE_SIZE);
}

// 切换发现页列表模式：精选菜谱 / 最近浏览
function toggleDiscoverListMode(mode) {
  if (discoverListMode === mode) return;
  discoverListMode = mode;
  renderPage("discover");
}

// 刷新精选菜谱（换一批）
function refreshCuratedRecipes() {
  curatedOffset += CURATED_PAGE_SIZE;
  // 如果到底了，重新打乱
  if (curatedOffset >= curatedRecipesPool.length) {
    curatedOffset = 0;
    // 重新打乱池子
    curatedRecipesPool.sort(() => Math.random() - 0.5);
  }
  renderPage("discover");
  showToast("已换一批精选菜谱");
}

// 随机抽一道菜（大厨按钮在发现页的行为）
function pickRandomRecipe() {
  if (allRecipes.length === 0) return;
  FrontendLogger.info("discover", "大厨推荐3道菜（冰箱菜/新菜/随机）");

  const used = new Set();
  const picked = [];

  // 从池中随机选一个不重复的
  function pickOne(pool) {
    const available = pool.filter((r) => !used.has(r.id));
    if (available.length === 0) return null;
    const r = available[Math.floor(Math.random() * available.length)];
    used.add(r.id);
    return r;
  }

  // ===== 第1道菜：冰箱能做的菜 =====
  var fridgePool = [];
  if (fridge.length > 0) {
    for (const r of allRecipes) {
      var match = computeExistingMissing(r);
      if (match.missingCore.length === 0 && r.coreIngredients && r.coreIngredients.length > 0) {
        fridgePool.push({ recipe: r, matchPercent: match.matchPercent });
      }
    }
  }
  if (fridgePool.length > 0) {
    // 按匹配度从高到低排序，取前50%中随机
    fridgePool.sort((a, b) => b.matchPercent - a.matchPercent);
    var topN = Math.max(1, Math.floor(fridgePool.length / 2));
    var topFridge = fridgePool.slice(0, topN);
    var picked1 = topFridge[Math.floor(Math.random() * topFridge.length)].recipe;
    picked1._chefTag = "冰箱能做";
    picked1._chefTagCls = "tag-fridge";
    used.add(picked1.id);
    picked.push(picked1);
  } else {
    // 冰箱做不了任何菜，随机一个
    var r1 = pickOne(allRecipes);
    if (r1) {
      r1._chefTag = "冰箱能做";
      r1._chefTagCls = "tag-fridge";
      picked.push(r1);
    }
  }

  // ===== 第2道菜：学一道新菜（做菜日历中没做过的） =====
  var cookedIds = new Set();
  if (window.userStats && window.userStats.cookedRecipes) {
    cookedIds = new Set(Object.keys(window.userStats.cookedRecipes));
  }
  var newPool = allRecipes.filter((r) => !cookedIds.has(r.id) && !used.has(r.id));
  if (newPool.length > 0 && cookedIds.size > 0) {
    var r2 = newPool[Math.floor(Math.random() * newPool.length)];
    r2._chefTag = "学道新菜";
    r2._chefTagCls = "tag-new";
    used.add(r2.id);
    picked.push(r2);
  } else {
    // 都做过了或日历为空，随机一个
    var r2b = pickOne(allRecipes);
    if (r2b) {
      r2b._chefTag = "学道新菜";
      r2b._chefTagCls = "tag-new";
      picked.push(r2b);
    }
  }

  // ===== 第3道菜：随便看看（完全随机） =====
  var r3 = pickOne(allRecipes);
  if (r3) {
    r3._chefTag = "随便看看";
    r3._chefTagCls = "tag-random";
    picked.push(r3);
  }

  if (picked.length === 0) return;
  const content = document.getElementById("discoverContent");
  if (!content) return;
  content.innerHTML = `
    <div class="discover-search-result">
      <div class="discover-search-count">🎲 大厨为你推荐 ${picked.length} 道菜</div>
      <div class="recipe-list">
        ${picked.map((r) => renderRecipeListCard(r)).join("")}
      </div>
    </div>
  `;
  content.scrollIntoView({ behavior: "smooth", block: "start" });
}

// 获取菜谱与用户饮食偏好/过敏源的冲突标签（用于发现页标记）
function getRecipeConflictLabels(recipe) {
  const labels = [];
  // 过敏源标记
  if (allergens.length > 0 && recipeHasUserAllergen(recipe)) {
    const allergenLabels = getRecipeAllergenLabels(recipe);
    labels.push({ text: `含过敏源：${allergenLabels.join("、")}`, cls: "conflict-allergen" });
  }
  // 饮食偏好标记
  if (dietPreferences.length > 0) {
    for (const pref of dietPreferences) {
      if (pref === "no_spicy" && isSpicyRecipe(recipe)) {
        labels.push({ text: "不吃辣", cls: "conflict-diet" });
      } else if (pref === "light" && !isLightRecipe(recipe)) {
        labels.push({ text: "非清淡", cls: "conflict-diet" });
      } else if (pref === "low_calorie" && !isLowCalorieRecipe(recipe)) {
        labels.push({ text: "非低卡", cls: "conflict-diet" });
      } else if (pref === "low_oil" && !isLowOilRecipe(recipe)) {
        labels.push({ text: "非少油", cls: "conflict-diet" });
      } else if (pref === "vegetarian" && !isVegetarianRecipe(recipe)) {
        labels.push({ text: "非素食", cls: "conflict-diet" });
      }
    }
  }
  return labels;
}

function renderRecipeListCard(recipe) {
  const image = recipe.images && recipe.images.length > 0
    ? recipe.images[0]
    : null;
  const emoji = getRecipeEmoji(recipe);
  const conflictLabels = getRecipeConflictLabels(recipe);
  const fav = isFavorite(recipe.id);
  const pinColor = getPinColorClass(recipe.id);
  const chefTag = recipe._chefTag
    ? `<span class="chef-rec-tag ${recipe._chefTagCls}">${recipe._chefTag}</span>`
    : "";

  return `
    <div class="recipe-list-card" onclick="showRecipeDetailDirect('${recipe.id}')">
      ${image
        ? `<img class="recipe-list-thumb" src="${assetUrl(image)}" alt="${recipe.title}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
           <div class="recipe-list-thumb-placeholder" style="display:none">${emoji}</div>`
        : `<div class="recipe-list-thumb-placeholder">${emoji}</div>`
      }
      <button class="recipe-fav-btn ${pinColor} ${fav ? 'active' : ''}" onclick="event.stopPropagation();toggleFavoriteAndUpdate('${recipe.id}')" title="${fav ? '取消收藏' : '收藏'}"></button>
      ${conflictLabels.length > 0 ? `<div class="recipe-conflict-flags">${conflictLabels.map((l) => `<span class="recipe-conflict-flag ${l.cls}">${l.text}</span>`).join("")}</div>` : ""}
      <div class="recipe-list-info">
        <div class="recipe-list-title-row">
          <div class="recipe-list-title">${recipe.title}</div>
          ${chefTag}
        </div>
        <div class="recipe-list-meta">
          ${recipe.timeMinutes ? `<span>⏱${recipe.timeMinutes}分</span>` : ""}
          ${recipe.calories ? `<span>🔥${recipe.calories}卡</span>` : ""}
          ${recipe.tags.length ? `<span>${recipe.tags[0]}</span>` : ""}
        </div>
      </div>
    </div>
  `;
}

function toggleFavoriteAndUpdate(recipeId) {
  toggleFavorite(recipeId);
  // 就地更新按钮状态，不重新渲染页面（避免丢失分类视图/滚动位置）
  const fav = isFavorite(recipeId);
  const titleText = fav ? '取消收藏' : '收藏';

  // 更新发现页/搜索页/分类页列表卡片上的大头钉
  document.querySelectorAll(`.recipe-fav-btn`).forEach((btn) => {
    const card = btn.closest('.recipe-list-card');
    if (card && card.getAttribute('onclick') && card.getAttribute('onclick').includes(recipeId)) {
      btn.classList.toggle('active', fav);
      btn.title = titleText;
      btn.textContent = ''; // 大头钉不需要文字
    }
  });

  // 更新收藏页stamp卡片上的大头钉（只更新active状态，不刷新页面避免打乱位置）
  document.querySelectorAll(`.stamp-fav-btn`).forEach((btn) => {
    const card = btn.closest('.stamp-card');
    if (card && card.getAttribute('onclick') && card.getAttribute('onclick').includes(recipeId)) {
      btn.classList.toggle('active', fav);
      btn.title = titleText;
    }
  });

  // 如果在收藏页面取消收藏，刷新列表移除该项
  if (!fav && document.querySelector(".favorites-page")) {
    showFavoriteRecipes();
  }
}

function toggleFavoriteDetail(recipeId) {
  toggleFavorite(recipeId);
  // 更新按钮状态（不重新渲染整个页面，避免丢失滚动位置）
  const btn = document.querySelector(".recipe-fav-btn-large");
  if (btn) {
    const fav = isFavorite(recipeId);
    btn.textContent = fav ? '❤️' : '🤍';
    btn.classList.toggle('active', fav);
    btn.title = fav ? '取消收藏' : '收藏';
  }
}

let currentDiscoverCategory = null; // 当前在发现页查看的分类（null 表示分类总览）

// 联网搜索菜谱分类页
function showAIRecipeCategory() {
  const app = document.getElementById("app");
  document.getElementById("bottomNav").style.display = "none";
  const aiRecipes = getAIRecipes();

  app.innerHTML = `
    <div class="page discover-page">
      <div class="swipe-header">
        <button class="swipe-header-back" onclick="document.getElementById('bottomNav').style.display='';renderPage('discover')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          返回
        </button>
        <div class="swipe-header-title">🌐 联网搜索</div>
        <div style="width:50px"></div>
      </div>
      <div class="recipe-list" style="padding:20px" id="aiRecipeList">
        ${aiRecipes.length === 0 ? `
          <div style="text-align:center;padding:32px;color:var(--text-muted)">
            <div style="font-size:36px;margin-bottom:8px">🌐</div>
            <div>还没有联网搜索菜谱</div>
            <div style="font-size:13px;margin-top:4px">在推荐页点击大厨按钮 → AI推荐即可联网搜索</div>
          </div>
        ` : aiRecipes.map((r) => renderAIRecipeCard(r)).join("")}
      </div>
    </div>
  `;
  // 设置长按删除监听
  setupAIRecipeLongPress();
}

// 渲染AI菜谱卡片（支持长按删除）
function renderAIRecipeCard(recipe) {
  const emoji = "🌐";
  const fav = isFavorite(recipe.id);
  const pinColor = getPinColorClass(recipe.id);

  return `
    <div class="recipe-list-card ai-recipe-card" onclick="showAIRecipeDetail('${recipe.id}')" oncontextmenu="return false;" data-ai-id="${recipe.id}">
      <div class="recipe-list-thumb-placeholder">${emoji}</div>
      <button class="recipe-fav-btn ${pinColor} ${fav ? 'active' : ''}" onclick="event.stopPropagation();toggleFavoriteAndUpdate('${recipe.id}')" title="${fav ? '取消收藏' : '收藏'}"></button>
      <div class="recipe-conflict-flags"><span class="recipe-conflict-flag flag-ai">AI</span></div>
      <div class="recipe-list-info">
        <div class="recipe-list-title">${recipe.title}</div>
        <div class="recipe-list-meta">
          ${recipe.steps && recipe.steps.length ? `<span>📋${recipe.steps.length}步</span>` : ""}
          ${recipe.requiredIngredients && recipe.requiredIngredients.length ? `<span>🥘${recipe.requiredIngredients.length}种食材</span>` : ""}
        </div>
      </div>
    </div>
  `;
}

// 长按删除AI菜谱
let _aiRecipeLongPressTimer = null;
function setupAIRecipeLongPress() {
  document.querySelectorAll('.ai-recipe-card').forEach(card => {
    const id = card.getAttribute('data-ai-id');
    card.addEventListener('touchstart', (e) => {
      _aiRecipeLongPressTimer = setTimeout(() => {
        _aiRecipeLongPressTimer = null;
        if (confirm('删除这道联网搜索菜谱？')) {
          deleteAIRecipe(id);
          showAIRecipeCategory();
        }
      }, 600);
    }, { passive: true });
    card.addEventListener('touchend', () => { if (_aiRecipeLongPressTimer) { clearTimeout(_aiRecipeLongPressTimer); _aiRecipeLongPressTimer = null; } });
    card.addEventListener('touchmove', () => { if (_aiRecipeLongPressTimer) { clearTimeout(_aiRecipeLongPressTimer); _aiRecipeLongPressTimer = null; } });
    // 右键长按（桌面端）
    card.addEventListener('mousedown', (e) => {
      _aiRecipeLongPressTimer = setTimeout(() => {
        _aiRecipeLongPressTimer = null;
        if (confirm('删除这道联网搜索菜谱？')) {
          deleteAIRecipe(id);
          showAIRecipeCategory();
        }
      }, 600);
    });
    card.addEventListener('mouseup', () => { if (_aiRecipeLongPressTimer) { clearTimeout(_aiRecipeLongPressTimer); _aiRecipeLongPressTimer = null; } });
    card.addEventListener('mouseleave', () => { if (_aiRecipeLongPressTimer) { clearTimeout(_aiRecipeLongPressTimer); _aiRecipeLongPressTimer = null; } });
  });
}

// 查看AI菜谱详情
function showAIRecipeDetail(recipeId) {
  const recipe = getAIRecipes().find(r => r.id === recipeId);
  if (!recipe) return;
  addRecentlyViewed(recipeId);
  document.getElementById("bottomNav").style.display = "none";

  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="page detail-list-page">
      <div class="swipe-header">
        <button class="swipe-header-back" onclick="showAIRecipeCategory()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          返回
        </button>
        <div class="swipe-header-title">菜谱详情</div>
        <div style="width:50px"></div>
      </div>
      <div class="recipe-detail-body" style="padding:16px">
        <div class="recipe-detail-title-row">
          <h1 class="recipe-detail-title">${recipe.title}</h1>
          <button class="recipe-fav-btn-large ${isFavorite(recipe.id) ? 'active' : ''}" onclick="toggleFavoriteDetail('${recipe.id}')" title="${isFavorite(recipe.id) ? '取消收藏' : '收藏'}">
            ${isFavorite(recipe.id) ? '❤️' : '🤍'}
          </button>
        </div>
        <div class="recipe-detail-tags">
          <span class="recipe-tag" style="background:var(--carrot-light);color:var(--carrot)">🌐 联网搜索</span>
        </div>

        <div class="recipe-detail-section">
          <div class="recipe-detail-section-title">🥘 食材清单</div>
          <div class="ingredient-chips">
            ${(recipe.requiredIngredients || []).map(ing => `<div class="ingredient-chip">${ing}</div>`).join("")}
          </div>
        </div>

        ${recipe.steps && recipe.steps.length > 0 ? `
        <div class="recipe-detail-section">
          <div class="recipe-detail-section-title">📋 烹饪步骤</div>
          <div class="recipe-steps">
            ${recipe.steps.map((step, i) => `
              <div class="recipe-step">
                <div class="recipe-step-num">${i + 1}</div>
                <div class="recipe-step-text">${step}</div>
              </div>
            `).join("")}
          </div>
        </div>
        ` : ''}

        ${recipe.tips && recipe.tips.length > 0 ? `
        <div class="recipe-detail-section">
          <div class="recipe-detail-section-title">💡 小贴士</div>
          <ul class="recipe-tips-list">
            ${recipe.tips.map(tip => `<li>${tip}</li>`).join("")}
          </ul>
        </div>
        ` : ''}

        <button class="btn-start-cooking" onclick="startCooking('${recipe.id}')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          开始沉浸烹饪
        </button>
      </div>
    </div>
  `;
}

function showCategory(category) {
  FrontendLogger.info("discover", "查看分类", { category });
  const recipes = allRecipes.filter((r) => r.category === category);
  const app = document.getElementById("app");
  document.getElementById("bottomNav").style.display = "none";
  currentDiscoverCategory = category;

  app.innerHTML = `
    <div class="page discover-page">
      <div class="swipe-header">
        <button class="swipe-header-back" onclick="currentDiscoverCategory=null;document.getElementById('bottomNav').style.display='';renderPage('discover')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          返回
        </button>
        <div class="swipe-header-title">${recipes[0]?.categoryLabel || category}</div>
        <div style="width:50px"></div>
      </div>
      <div class="recipe-list" style="padding:20px">
        ${recipes.map((r) => renderRecipeListCard(r)).join("")}
      </div>
    </div>
  `;
}

function showRecipeDetailDirect(recipeId) {
  const recipe = allRecipes.find((r) => r.id === recipeId);
  if (!recipe) return;
  // 记录浏览历史
  addRecentlyViewed(recipeId);
  // 根据当前所在页面设置返回动作
  const activeNav = document.querySelector(".nav-btn.active");
  const activePage = activeNav ? activeNav.dataset.page : null;
  FrontendLogger.info("recipe", "查看菜谱详情", { recipeId, title: recipe.title, from: currentMeSubPage || activePage || "unknown" });
  if (currentMeSubPage === "favorites") {
    // 从收藏页进入：返回收藏页
    recipeDetailBackFn = () => showFavoriteRecipes();
  } else if (currentMeSubPage === "cooked") {
    // 从已做页进入：返回已做页
    recipeDetailBackFn = () => showCookedRecipes();
  } else if (currentMeSubPage === "consumed") {
    // 从消耗食材页进入
    recipeDetailBackFn = () => showConsumedIngredients();
  } else if (currentMeSubPage === "supplemented") {
    // 从补充食材页进入
    recipeDetailBackFn = () => showSupplementedIngredients();
  } else if (activePage === "discover") {
    // 从发现页进入：如果在分类列表视图，返回分类列表；否则返回发现首页
    const cat = currentDiscoverCategory;
    if (cat) {
      recipeDetailBackFn = () => showCategory(cat);
    } else {
      recipeDetailBackFn = () => {
        document.getElementById("bottomNav").style.display = "";
        renderPage("discover");
      };
    }
  } else if (activePage === "calendar") {
    recipeDetailBackFn = () => renderPage("calendar");
  } else if (activePage === "me") {
    recipeDetailBackFn = () => {
      document.getElementById("bottomNav").style.display = "";
      currentMeSubPage = null;
      renderPage("me");
    };
  } else if (activePage === "home") {
    recipeDetailBackFn = () => {
      document.getElementById("bottomNav").style.display = "";
      renderPage("home");
    };
  } else {
    recipeDetailBackFn = () => {
      document.getElementById("bottomNav").style.display = "none";
      renderSwipePage();
    };
  }
  // 从冰箱+调料中计算已有/缺失食材，同步到菜谱详情页
  const matchInfo = computeExistingMissing(recipe);
  const rec = {
    recipe,
    matchPercent: matchInfo.matchPercent,
    existing: matchInfo.existing,
    missing: matchInfo.missing,
    reason: matchInfo.matchPercent === 100 ? "食材齐备" : "浏览菜谱",
  };
  showRecipeDetail(rec);
}

// 菜谱详情页返回：根据入口回到对应上级页
function goBackFromRecipeDetail() {
  // 离开菜谱页时清除大厨笔记
  if (window.ChefGuides && ChefGuides.isNotesActive()) {
    ChefGuides.clearNotesFromPage();
    updateChefFabState();
  }
  closeChefAgentPanel();
  closeChefRecipeMenu();
  if (recipeDetailBackFn) {
    recipeDetailBackFn();
    recipeDetailBackFn = null;
  } else {
    backToSwipe();
  }
}

// ============================================
// 做菜日历（日历模式 + 鱼骨图时间线模式）
// ============================================
let calendarMode = "timeline"; // 'calendar' | 'timeline'
let calendarMonth = new Date();
let timelineHighlightKey = null; // 时间线模式下高亮的日期 key

function getCookedHistory() {
  // 从 userStats.cookedRecipes 读取所有做菜记录
  const cooked = (window.userStats && window.userStats.cookedRecipes) || {};
  const records = [];
  Object.entries(cooked).forEach(([recipeId, info]) => {
    // 同一菜做过多次：每次都算一条记录（用 count 推算时间，但只有 lastCooked 准确）
    // 简化：只显示最后一次做的时间，但显示总次数
    records.push({
      recipeId,
      title: info.title,
      count: info.count,
      timestamp: info.lastCooked,
    });
  });
  return records.sort((a, b) => b.timestamp - a.timestamp); // 新→旧
}

function getCookedDatesSet() {
  // 返回 Set<YYYY-MM-DD>
  const set = new Set();
  getCookedHistory().forEach((r) => {
    const d = new Date(r.timestamp);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    set.add(key);
  });
  return set;
}

// 获取 calendarMonth 当月的做菜天数
function getCookedDaysThisMonth() {
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
  let count = 0;
  getCookedDatesSet().forEach((key) => {
    if (key.startsWith(prefix)) count++;
  });
  return count;
}

function showCalendar() {
  // 兼容旧入口：直接跳到 calendar 标签页
  renderPage("calendar");
}

// 注入演示数据（用于查看日历/时间线效果）
function loadDemoCalendarData() {
  FrontendLogger.info("calendar", "加载演示数据");
  if (!allRecipes || allRecipes.length === 0) {
    showToast("菜谱未加载完成，请稍候");
    return;
  }
  // 从真实菜谱中挑 8 道，分布在过去 30 天
  const picks = [];
  const usedIds = new Set();
  const sampleCount = Math.min(8, allRecipes.length);
  while (picks.length < sampleCount) {
    const r = allRecipes[Math.floor(Math.random() * allRecipes.length)];
    if (usedIds.has(r.id)) continue;
    usedIds.add(r.id);
    picks.push(r);
  }

  const now = Date.now();
  const dayMs = 86400000;
  const cookedRecipes = {};
  picks.forEach((r, i) => {
    // 分布在最近 30 天，越靠前时间越近
    const daysAgo = Math.floor(i * 3.5) + Math.floor(Math.random() * 2);
    const ts = now - daysAgo * dayMs - Math.floor(Math.random() * 8) * 3600000;
    cookedRecipes[r.id] = {
      title: r.title,
      count: 1 + Math.floor(Math.random() * 3),
      lastCooked: ts,
    };
  });

  window.userStats = window.userStats || {
    cooked: 0, saved: 0, favorites: [],
    cookedRecipes: {}, consumedIngredients: {}, supplementedIngredients: {},
  };
  window.userStats.cookedRecipes = cookedRecipes;
  window.userStats.cooked = Object.keys(cookedRecipes).length;
  saveStats();
  showToast("已加载演示数据");
}

function clearDemoCalendarData() {
  if (!confirm("确定清空所有做菜记录？")) return;
  FrontendLogger.info("calendar", "清空做菜记录");
  window.userStats = window.userStats || {};
  window.userStats.cookedRecipes = {};
  window.userStats.cooked = 0;
  saveStats();
  renderCalendarPage();
  showToast("已清空");
}

function renderCalendarPage() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="page calendar-page">
      <div class="calendar-page-header">
        <h1 class="calendar-page-title">做菜日历</h1>
      </div>

      <div class="calendar-tabs">
        <button class="calendar-tab ${calendarMode === 'timeline' ? 'active' : ''}" onclick="switchCalendarMode('timeline')">🐟 时间线</button>
        <button class="calendar-tab ${calendarMode === 'calendar' ? 'active' : ''}" onclick="switchCalendarMode('calendar')">📅 日历模式</button>
      </div>

      <div id="calendarContent">
        ${calendarMode === 'calendar' ? renderCalendarMode() : renderTimelineMode()}
      </div>
    </div>
  `;
  // 创作者模式：在renderCalendarPage内部插入演示按钮（确保tab切换后也存在）
  if (_creatorMode) {
    var calHeader = document.querySelector(".calendar-page-header");
    if (calHeader && !calHeader.querySelector("[data-demo-cal]")) {
      var cbtn = document.createElement("button");
      cbtn.className = "cal-demo-btn" + (_calendarDemoActive ? " demo-active" : "");
      cbtn.textContent = _calendarDemoActive ? "↩️ 恢复" : "✨ 演示";
      cbtn.setAttribute("data-demo-cal", "1");
      cbtn.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleCalendarDemo();
      });
      calHeader.appendChild(cbtn);
    }
  }
}

function switchCalendarMode(mode) {
  FrontendLogger.info("calendar", "切换日历模式", { mode });
  calendarMode = mode;
  if (mode === 'calendar') timelineHighlightKey = null;
  renderCalendarPage();
}

// 从日历模式点击有做菜的天 → 跳到时间线并滚动到对应卡片
function jumpToTimeline(dateKey) {
  FrontendLogger.info("calendar", "点击日历日期跳转时间线", { dateKey });
  timelineHighlightKey = dateKey;
  calendarMode = 'timeline';
  renderCalendarPage();
  // 渲染后滚动到对应卡片
  setTimeout(() => {
    const el = document.getElementById('fishbone-item-' + dateKey);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      // 没有精确匹配，提示
      showToast('该日期记录已在时间线中');
    }
  }, 50);
}

// 日历模式：月历视图
function renderCalendarMode() {
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const cookedSet = getCookedDatesSet();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = firstDay.getDay(); // 0=周日
  const daysInMonth = lastDay.getDate();

  const monthLabel = `${year}年${month + 1}月`;
  const prevMonth = () => { FrontendLogger.info("calendar", "上一月", { month: `${year}-${month}` }); calendarMonth = new Date(year, month - 1, 1); renderCalendarPage(); };
  const nextMonth = () => { FrontendLogger.info("calendar", "下一月", { month: `${year}-${month + 2}` }); calendarMonth = new Date(year, month + 1, 1); renderCalendarPage(); };

  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  let cells = "";

  // 周标题
  weekdays.forEach((w) => {
    cells += `<div class="cal-weekday">${w}</div>`;
  });

  // 前置空格
  for (let i = 0; i < startWeekday; i++) {
    cells += `<div class="cal-cell empty"></div>`;
  }

  // 当月每一天
  let cookedCount = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const hasCooked = cookedSet.has(key);
    const isToday = key === todayKey;
    if (hasCooked) cookedCount++;
    cells += `
      <div class="cal-cell ${hasCooked ? 'has-cooked' : ''} ${isToday ? 'is-today' : ''}"
            ${hasCooked ? `onclick="jumpToTimeline('${key}')"` : ''}>
        <div class="cal-day-num">${d}</div>
        ${hasCooked ? '<div class="cal-dot"></div>' : ''}
      </div>
    `;
  }

  return `
    <div class="calendar-mode">
      <div class="cal-nav">
        <button class="cal-nav-btn" onclick="prevCalMonth()">‹</button>
        <div class="cal-nav-label">${monthLabel}</div>
        <button class="cal-nav-btn" onclick="nextCalMonth()">›</button>
      </div>
      <div class="cal-grid">
        ${cells}
      </div>
      <div class="cal-legend">
        <div class="cal-legend-item"><div class="cal-dot"></div><span>有做菜</span></div>
        <div class="cal-legend-item"><div class="cal-today-marker"></div><span>今天</span></div>
      </div>
    </div>
  `;
}

function prevCalMonth() {
  const y = calendarMonth.getFullYear();
  const m = calendarMonth.getMonth();
  calendarMonth = new Date(y, m - 1, 1);
  renderCalendarPage();
}

function nextCalMonth() {
  const y = calendarMonth.getFullYear();
  const m = calendarMonth.getMonth();
  calendarMonth = new Date(y, m + 1, 1);
  renderCalendarPage();
}

// 时间线模式：鱼骨图
function renderTimelineMode() {
  const records = getCookedHistory();

  if (records.length === 0) {
    return `
      <div class="journal-empty">
        <div class="journal-empty-icon">🍳</div>
        <div class="journal-empty-title">还没有做菜记录</div>
        <div class="journal-empty-desc">完成一次烹饪后，你的美食手账就会开始记录啦</div>
      </div>
      <div class="calendar-chef-btn" onclick="analyzeCalendarWithAI()">
        <span class="calendar-chef-avatar">👨‍🍳</span>
        <span class="calendar-chef-text">大厨点评</span>
      </div>
    `;
  }

  // ===== 统计数据 =====
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  let monthDays = 0;
  let totalCount = 0;
  const recipeCount = {};
  const monthDaySet = new Set();

  records.forEach((r) => {
    const d = new Date(r.timestamp);
    totalCount += r.count;
    if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
      const mKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      monthDaySet.add(mKey);
    }
    if (!recipeCount[r.recipeId] || recipeCount[r.recipeId].count < r.count) {
      recipeCount[r.recipeId] = { title: r.title, count: r.count };
    }
  });
  monthDays = monthDaySet.size;

  let mostCooked = "—";
  let mostCookedCount = 0;
  Object.values(recipeCount).forEach((rc) => {
    if (rc.count > mostCookedCount) {
      mostCookedCount = rc.count;
      mostCooked = rc.title;
    }
  });

  // ===== 按日期分组 =====
  const weekNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const grouped = {}; // dateKey -> { date, weekday, items: [] }
  records.forEach((r) => {
    const d = new Date(r.timestamp);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!grouped[dateKey]) {
      grouped[dateKey] = {
        date: d,
        dateKey,
        weekday: weekNames[d.getDay()],
        dayNum: d.getDate(),
        month: d.getMonth() + 1,
        items: [],
        isToday: dateKey === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
      };
    }
    grouped[dateKey].items.push(r);
  });

  // 按日期倒序排列
  const sortedGroups = Object.values(grouped).sort((a, b) => b.date - a.date);

  // ===== 按月份分隔 =====
  const monthNames = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
  let lastMonthKey = "";
  const sections = [];
  sortedGroups.forEach((g) => {
    const monthKey = `${g.date.getFullYear()}-${g.date.getMonth()}`;
    if (monthKey !== lastMonthKey) {
      sections.push({ type: "month", label: `${g.date.getFullYear()}年${monthNames[g.date.getMonth()]}`, monthKey });
      lastMonthKey = monthKey;
    }
    sections.push({ type: "day", data: g });
  });

  // ===== 渲染HTML =====
  const statsHtml = `
    <div class="journal-stats">
      <div class="journal-stat">
        <div class="journal-stat-num">${monthDays}</div>
        <div class="journal-stat-label">本月做菜</div>
      </div>
      <div class="journal-stat-divider"></div>
      <div class="journal-stat">
        <div class="journal-stat-num">${totalCount}</div>
        <div class="journal-stat-label">累计道数</div>
      </div>
      <div class="journal-stat-divider"></div>
      <div class="journal-stat">
        <div class="journal-stat-num journal-stat-fav" title="${mostCooked}">${mostCooked.length > 5 ? mostCooked.slice(0, 5) + "…" : mostCooked}</div>
        <div class="journal-stat-label">最常做${mostCookedCount > 1 ? " ×" + mostCookedCount : ""}</div>
      </div>
    </div>
  `;

  const timelineHtml = sections.map((sec) => {
    if (sec.type === "month") {
      return `<div class="journal-month-sticker">${sec.label}</div>`;
    }
    const g = sec.data;
    const isHighlighted = g.dateKey === timelineHighlightKey;
    const itemsHtml = g.items.map((r) => {
      const recipe = allRecipes.find((x) => x.id === r.recipeId);
      const emoji = recipe ? getRecipeEmoji(recipe) : "🍽️";
      const image = recipe && recipe.images && recipe.images.length > 0 ? recipe.images[0] : null;
      const timeStr = (() => {
        const d = new Date(r.timestamp);
        return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      })();
      const tagText = recipe && recipe.tags && recipe.tags.length > 0 ? recipe.tags[0] : "";
      const timeMins = recipe && recipe.timeMinutes ? recipe.timeMinutes : null;
      return `
        <div class="journal-card ${isHighlighted ? 'journal-card-highlight' : ''}" onclick="showRecipeDetailDirect('${r.recipeId}')">
          ${image
            ? `<img class="journal-card-img" src="${assetUrl(image)}" alt="${r.title}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
               <div class="journal-card-emoji" style="display:none">${emoji}</div>`
            : `<div class="journal-card-emoji">${emoji}</div>`
          }
          <div class="journal-card-body">
            <div class="journal-card-title-row">
              <span class="journal-card-title">${r.title}</span>
              ${r.count > 1 ? `<span class="journal-card-count">×${r.count}</span>` : ''}
            </div>
            <div class="journal-card-meta">
              <span class="journal-card-time">⏱ ${timeStr}</span>
              ${timeMins ? `<span class="journal-card-dur">🕐 ${timeMins}分</span>` : ''}
              ${tagText ? `<span class="journal-card-tag">${tagText}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join("");

    return `
      <div class="journal-day ${isHighlighted ? 'journal-day-highlighted' : ''}" id="fishbone-item-${g.dateKey}">
        <div class="journal-day-marker">
          <div class="journal-day-dot ${g.isToday ? 'is-today' : ''}"></div>
          <div class="journal-day-date">
            <div class="journal-day-num">${g.dayNum}</div>
            <div class="journal-day-week">${g.weekday}${g.isToday ? ' · 今天' : ''}</div>
          </div>
        </div>
        <div class="journal-day-cards">
          ${itemsHtml}
        </div>
      </div>
    `;
  }).join("");

  return `
    <div class="journal-container">
      ${statsHtml}
      <div class="journal-timeline">
        <div class="journal-line"></div>
        ${timelineHtml}
        <div class="journal-end">
          <div class="journal-end-dot"></div>
          <div class="journal-end-text">继续烹饪吧 🍳</div>
        </div>
      </div>
    </div>
    <div class="calendar-chef-btn" onclick="analyzeCalendarWithAI()">
      <span class="calendar-chef-avatar">👨‍🍳</span>
      <span class="calendar-chef-text">大厨点评</span>
    </div>
  `;
}

// ============================================
// 创作者模式 & 演示数据（全局变量+函数，确保内联onclick可访问）
// ============================================
var _creatorMode = false;
var _aboutClickCount = 0;
var _aboutClickTimer = null;

var _fridgeDemoActive = false;
var _fridgeBackup = null;

var _chefsDemoActive = false;
var _chefsBackup = null;

var _calendarDemoActive = false;
var _calendarBackup = null;

function handleAboutClick() {
  _aboutClickCount++;
  if (_aboutClickTimer) clearTimeout(_aboutClickTimer);
  _aboutClickTimer = setTimeout(function() { _aboutClickCount = 0; }, 3000);

  if (_aboutClickCount >= 5) {
    _aboutClickCount = 0;
    _creatorMode = !_creatorMode;
    if (_creatorMode) {
      showToast("已进入创作者模式");
    } else {
      restoreAllDemoData();
      showToast("已退出创作者模式");
    }
    renderPage("me");
  } else {
    showToast("菜厨厨 v1.0 (build-2024) — 点击5次进入创作者模式");
  }
}

function restoreAllDemoData() {
  // 恢复冰箱
  if (_fridgeDemoActive && _fridgeBackup !== null) {
    fridge = _fridgeBackup;
    saveFridge();
    _fridgeBackup = null;
    _fridgeDemoActive = false;
  }
  // 恢复厨师
  if (_chefsDemoActive && _chefsBackup !== null) {
    localStorage.setItem("ccc_chefs", JSON.stringify(_chefsBackup));
    ChefManager._chefs = JSON.parse(JSON.stringify(_chefsBackup));
    _chefsBackup = null;
    _chefsDemoActive = false;
  }
  // 恢复日历
  if (_calendarDemoActive && _calendarBackup !== null) {
    window.userStats = _calendarBackup;
    saveStats();
    _calendarBackup = null;
    _calendarDemoActive = false;
  }
}

// 冰箱演示：新增西红柿、鸡蛋
function toggleFridgeDemo() {
  if (_fridgeDemoActive) {
    // 恢复
    if (_fridgeBackup !== null) {
      fridge = _fridgeBackup;
      saveFridge();
      _fridgeBackup = null;
    }
    _fridgeDemoActive = false;
    showToast("已恢复冰箱数据");
  } else {
    // 备份并添加
    _fridgeBackup = JSON.parse(JSON.stringify(fridge));
    var demoItems = [
      { name: "西红柿", addedAt: Date.now() },
      { name: "鸡蛋", addedAt: Date.now() },
    ];
    var existingNames = {};
    fridge.forEach(function(i) { existingNames[i.name] = true; });
    demoItems.forEach(function(item) {
      if (!existingNames[item.name]) {
        fridge.push(item);
      }
    });
    saveFridge();
    _fridgeDemoActive = true;
    showToast("已添加演示食材：西红柿、鸡蛋");
  }
  renderPage("home");
}

// 日历演示：加载/恢复
function toggleCalendarDemo() {
  if (_calendarDemoActive) {
    // 恢复
    if (_calendarBackup !== null) {
      window.userStats = _calendarBackup;
      saveStats();
      _calendarBackup = null;
    }
    _calendarDemoActive = false;
    showToast("已恢复做菜记录");
  } else {
    // 备份并加载演示数据
    _calendarBackup = JSON.parse(JSON.stringify(window.userStats || {}));
    _calendarDemoActive = true;
    loadDemoCalendarData();
  }
  renderPage("calendar");
}

// 厨师演示：新增4个厨师
function toggleChefsDemo() {
  if (_chefsDemoActive) {
    // 恢复
    if (_chefsBackup !== null) {
      localStorage.setItem("ccc_chefs", JSON.stringify(_chefsBackup));
      ChefManager._chefs = JSON.parse(JSON.stringify(_chefsBackup));
      _chefsBackup = null;
    }
    _chefsDemoActive = false;
    showToast("已恢复厨师数据");
  } else {
    // 备份
    _chefsBackup = JSON.parse(JSON.stringify(ChefManager.getAll()));
    // 添加4个演示厨师
    var recipeTitle = "咖喱炒蟹";
    var demoChefs = [
      {
        name: "粤菜师傅",
        color: "#ff6b6b",
        content: "## 食材准备\n螃蟹洗净斩件，去除蟹腮和蟹胃。咖喱粉、咖喱叶、椰浆备好。姜切片，蒜拍碎，葱切段。\n## 详细做法\n热锅下油，爆香姜片蒜蓉，下螃蟹大火翻炒至变色。加入咖喱粉炒出红油，倒入椰浆调匀。加盖中火焖煮5分钟，开盖收汁，撒葱花出锅。\n## 关键技巧\n螃蟹要先高温快炒锁住鲜味，咖喱粉需小火炒出红油但不可炒糊，椰浆的量要刚好没过蟹块。",
        summary: "## 食材处理\n蟹要选鲜活膏蟹或肉蟹，斩件后蟹钳拍裂便于入味。咖喱粉用印度黄咖喱粉最佳。\n## 烹饪技法\n大火爆炒锁鲜 → 中火焖煮入味 → 大火收汁挂芡，三段火候缺一不可。\n## 通用要点\n咖喱蟹的灵魂在于椰浆与咖喱的平衡，椰浆过多则寡淡，过少则辛辣呛喉。",
      },
      {
        name: "东南亚料理师",
        color: "#4ecdc4",
        content: "## 食材准备\n青蟹2只约500g，咖喱叶10g，香茅1根拍扁，南姜3片。咖喱酱3大勺，鱼露1勺，椰奶200ml。\n## 详细做法\n螃蟹刷净斩块，蟹钳拍裂。锅中热油，下香茅南姜咖喱叶爆香，加咖喱酱炒散。倒入螃蟹翻炒裹酱，淋鱼露，加椰奶半碗水煮开。中火烧8分钟收浓汤汁。\n## 关键技巧\n香茅和南姜是东南亚风味的灵魂，不可省略。咖喱酱要比咖喱粉更浓稠，挂汁更好。",
        summary: "## 食材处理\n选用东南亚青蟹，肉质清甜。香茅只取根部白色部分，外层老皮去除。\n## 烹饪技法\n南洋风格讲究香料层叠爆香，先下硬香料（南姜），再下软香料（香茅），最后下咖喱叶。\n## 通用要点\n鱼露替代盐，椰奶替代水，是东南亚咖喱蟹与粤式咖喱蟹的本质区别。",
      },
      {
        name: "海鲜专家",
        color: "#45b7d1",
        content: "## 食材准备\n梭子蟹1只约800g，日式咖喱块2块，洋葱半个切丁，黄油20g。白葡萄酒50ml，淡奶油50ml。\n## 详细做法\n螃蟹蒸5分钟至半熟后斩件。黄油融化炒洋葱至透明，加咖喱块炒化。下蟹块裹酱，淋白葡萄酒去腥，加淡奶油和少量水。中小火煮6分钟至酱汁浓稠。\n## 关键技巧\n先蒸后炒可以保持蟹肉完整不散，黄油炒洋葱的甜味能中和咖喱的辛辣。",
        summary: "## 食材处理\n大只梭子蟹先蒸5分钟定型，避免直接炒导致蟹脚脱落。洋葱切小丁更易融化进酱汁。\n## 烹饪技法\n日式融合做法：黄油打底 + 白葡萄酒去腥 + 淡奶油增稠，口感柔和。\n## 通用要点\n日式咖喱块已含面粉，无需额外勾芡，收汁时注意火候防止糊底。",
      },
      {
        name: "家常厨娘",
        color: "#feca57",
        content: "## 食材准备\n大闸蟹4只，咖喱粉2勺，土豆1个切块，洋葱半个切丝。蒜末、姜末适量，牛奶100ml。\n## 详细做法\n螃蟹洗净对半切，拍裂蟹钳。热油爆香蒜末姜末，下洋葱炒软。加咖喱粉小火炒香，放蟹块翻炒上色。加土豆块和水没过食材，大火煮开转小火10分钟。最后倒牛奶拌匀煮2分钟。\n## 关键技巧\n土豆切块一起煮可以增加汤汁浓稠度，牛奶替代椰浆更适合家常口味。",
        summary: "## 食材处理\n大闸蟹个小肉鲜，对半切更易入味。土豆选粉质品种，炖煮后自然收汁。\n## 烹饪技法\n家常简化版：咖喱粉直接炒 → 加水炖煮 → 牛奶增香，步骤简单易上手。\n## 通用要点\n没有椰浆用牛奶代替，没有咖喱酱用咖喱粉代替，做菜灵活变通比照本宣科更重要。",
      },
    ];

    demoChefs.forEach(function(config) {
      ChefManager.addChef({
        name: config.name,
        color: config.color,
        recipes: [{
          title: recipeTitle,
          content: config.content,
          summary: config.summary,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }],
      });
    });
    _chefsDemoActive = true;
    showToast("已添加4个演示厨师");
  }
  showChefs();
}

// ============================================
// 我的页
// ============================================
function renderMe() {
  const stats = window.userStats || { cooked: 0, saved: 0, favorites: [] };
  return `
    <div class="page me-page">
      <div class="me-header">
        <div class="me-avatar">🧑‍🍳</div>
        <div class="me-name">美食探索家</div>
        <div class="me-sub">减少浪费，从冰箱开始</div>
      </div>

      <div class="me-stats">
        <div class="me-stat-card clickable" onclick="showConsumedIngredients()">
          <div class="me-stat-num">${Object.keys(window.userStats.consumedIngredients || {}).length}</div>
          <div class="me-stat-label">消耗食材</div>
        </div>
        <div class="me-stat-card clickable" onclick="showFavoriteRecipes()">
          <div class="me-stat-num">${getFavoriteRecipes().length}</div>
          <div class="me-stat-label">收藏菜谱</div>
        </div>
      </div>

      <div class="me-section-title">厨房</div>
      <div class="me-option-grid">
        <div class="me-option-card" onclick="showKitchenSection('seasonings')">
          <div class="me-option-icon">🧂</div>
          <div class="me-option-label">调料</div>
          <div class="me-option-sub">${seasonings.length}样</div>
        </div>
        <div class="me-option-card" onclick="showKitchenSection('utensils')">
          <div class="me-option-icon">🍳</div>
          <div class="me-option-label">厨具</div>
          <div class="me-option-sub">${utensils.length}样</div>
        </div>
      </div>

      <div class="me-section-title">设置</div>
      <div class="me-option-grid">
        <div class="me-option-card" onclick="showChefs()">
          <div class="me-option-icon">👨‍🍳</div>
          <div class="me-option-label">厨师管理</div>
          <div class="me-option-sub">${ChefManager.getEnabled().length}位</div>
        </div>
        <div class="me-option-card" onclick="showAIModels()">
          <div class="me-option-icon">🤖</div>
          <div class="me-option-label">AI模型</div>
          <div class="me-option-sub">管理</div>
        </div>
        <div class="me-option-card" onclick="showDietPreferences()">
          <div class="me-option-icon">🍽️</div>
          <div class="me-option-label">饮食偏好</div>
          <div class="me-option-sub">${dietPreferences.length > 0 ? `已选${dietPreferences.length}` : "未设置"}</div>
        </div>
        <div class="me-option-card" onclick="showAllergens()">
          <div class="me-option-icon">⚠️</div>
          <div class="me-option-label">过敏原</div>
          <div class="me-option-sub">${allergens.length > 0 ? `已选${allergens.length}` : "未设置"}</div>
        </div>
        <div class="me-option-card" onclick="handleAboutClick()">
          <div class="me-option-icon">ℹ️</div>
          <div class="me-option-label">关于</div>
          <div class="me-option-sub">${_creatorMode ? "创作者模式" : "v1.0"}</div>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// 厨师管理页
// ============================================
function showChefs() {
  const app = document.getElementById("app");
  document.getElementById("bottomNav").style.display = "none";
  const chefs = ChefManager.getAll();
  app.innerHTML = `
    <div class="page detail-list-page">
      <div class="swipe-header">
        <button class="swipe-header-back" onclick="document.getElementById('bottomNav').style.display='';renderPage('me')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          返回
        </button>
        <div class="swipe-header-title">厨师管理</div>
        <div id="chefDemoBtnContainer" style="width:60px;display:flex;align-items:center;justify-content:flex-end;">
        </div>
      </div>
      <div class="chef-list">
        ${chefs.map((chef, i) => renderChefCard(chef, i)).join("")}
      </div>
      <div class="chef-add-section">
        <button class="chef-add-btn" onclick="showAddChefForm()">
          <span class="chef-add-icon">+</span>
          <span>新增自定义大厨</span>
        </button>
      </div>
    </div>
  `;
  // 创作者模式：通过DOM插入厨师演示按钮
  if (_creatorMode) {
    var chefBtnContainer = document.getElementById("chefDemoBtnContainer");
    if (chefBtnContainer) {
      var chBtn = document.createElement("button");
      chBtn.className = "cal-demo-btn" + (_chefsDemoActive ? " demo-active" : "");
      chBtn.textContent = _chefsDemoActive ? "↩️ 恢复" : "✨ 演示";
      chBtn.style.marginRight = "4px";
      chBtn.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleChefsDemo();
      });
      chefBtnContainer.appendChild(chBtn);
    }
  }
  // 异步加载默认大厨笔记数量
  loadDefaultChefNoteCount();
}

// 加载默认大厨的笔记数量（从 index.json 获取）
async function loadDefaultChefNoteCount() {
  try {
    const resp = await fetch("data/guides/index.json");
    if (!resp.ok) return;
    const index = await resp.json();
    const count = Object.keys(index).length;
    document.querySelectorAll(".chef-note-count[data-default-count]").forEach((el) => {
      el.textContent = `${count} 条笔记`;
    });
  } catch (e) {
    document.querySelectorAll(".chef-note-count[data-default-count]").forEach((el) => {
      el.textContent = "笔记加载失败";
    });
  }
}

// 编辑自定义大厨（预填表单）
function editChef(chefId) {
  const chef = ChefManager.getById(chefId);
  if (!chef) return;

  window._editingChefId = chefId;

  const app = document.getElementById("app");
  document.getElementById("bottomNav").style.display = "none";

  const recipe = chef.recipes[0] || {};
  const recipeTitle = recipe.title || "";

  app.innerHTML = `
    <div class="page detail-list-page">
      <div class="swipe-header">
        <button class="swipe-header-back" onclick="showChefs()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          返回
        </button>
        <div class="swipe-header-title">编辑大厨</div>
        <div style="width:60px"></div>
      </div>
      <div class="chef-form">
        <div class="chef-form-section">
          <label class="chef-form-label">大厨名称</label>
          <input type="text" id="newChefName" class="chef-form-input" placeholder="如：川菜大师" value="${chef.name}" />
        </div>
        <div class="chef-form-section">
          <label class="chef-form-label">选择菜谱</label>
          <div class="chef-recipe-picker" id="chefRecipePicker">
            <input type="text" class="chef-recipe-search" placeholder="搜索菜谱..." oninput="filterChefRecipeListForEdit(this.value)" />
            <div class="chef-recipe-filter-bar">
              <button class="chef-recipe-filter-btn active" data-filter="all" onclick="setChefRecipeFilter('all')">全部</button>
              <button class="chef-recipe-filter-btn" data-filter="written" onclick="setChefRecipeFilter('written')">已写</button>
              <button class="chef-recipe-filter-btn" data-filter="unwritten" onclick="setChefRecipeFilter('unwritten')">未写</button>
            </div>
            <div class="chef-recipe-list" id="chefRecipeList">
              ${renderChefRecipeListForEdit("", "all", recipeTitle)}
            </div>
          </div>
        </div>
        <div class="chef-form-section">
          <label class="chef-form-label">大厨笔记（菜谱做法，按模板填写）</label>
          <textarea id="newChefContent" class="chef-form-textarea" rows="14"></textarea>
        </div>
        <div class="chef-form-section">
          <label class="chef-form-label">大厨总结（烹饪技法与要点，按模板填写）</label>
          <textarea id="newChefSummary" class="chef-form-textarea" rows="10"></textarea>
        </div>
        <div class="chef-form-actions">
          <button class="chef-form-submit" onclick="updateChef('${chefId}')">保存修改</button>
        </div>
      </div>
    </div>
  `;
  // 初始加载第一个菜谱的内容
  loadChefRecipeContent(chefId, recipeTitle);
}

// 当前编辑状态
window._chefRecipeFilter = "all";
window._chefRecipeSearch = "";
window._chefCurrentRecipe = "";

// 渲染编辑页菜谱列表（支持已写/未写筛选）
function renderChefRecipeListForEdit(keyword, statusFilter, selectedTitle) {
  const chef = ChefManager.getById(window._editingChefId);
  if (!chef) return "";
  const writtenTitles = new Set(chef.recipes.filter(r => r.content || r.summary).map(r => r.title));

  const recipes = allRecipes.filter((r) => {
    if (r.category === "condiment" || r.category === "template") return false;
    if (keyword && !r.title.toLowerCase().includes(keyword.toLowerCase())) return false;
    if (statusFilter === "written" && !writtenTitles.has(r.title)) return false;
    if (statusFilter === "unwritten" && writtenTitles.has(r.title)) return false;
    return true;
  }).slice(0, 100);

  return recipes.map((r) => {
    const isWritten = writtenTitles.has(r.title);
    const badge = isWritten ? '<span class="chef-recipe-written-badge">已写</span>' : "";
    return `
    <label class="chef-recipe-item">
      <input type="radio" name="chefRecipeRadio" class="chef-recipe-checkbox" value="${r.title}" ${r.title === selectedTitle ? "checked" : ""} onchange="switchChefRecipe('${r.title}')" />
      <span class="chef-recipe-item-title">${r.title}</span>
      ${badge}
      <span class="chef-recipe-item-category">${r.categoryLabel || r.category}</span>
    </label>
  `}).join("");
}

// 搜索过滤编辑页菜谱列表
function filterChefRecipeListForEdit(keyword) {
  window._chefRecipeSearch = keyword;
  const list = document.getElementById("chefRecipeList");
  if (list) {
    const selectedRadio = document.querySelector(".chef-recipe-checkbox:checked");
    const selectedTitle = selectedRadio ? selectedRadio.value : "";
    list.innerHTML = renderChefRecipeListForEdit(keyword, window._chefRecipeFilter, selectedTitle);
  }
}

// 设置已写/未写筛选
function setChefRecipeFilter(filter) {
  window._chefRecipeFilter = filter;
  document.querySelectorAll(".chef-recipe-filter-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === filter);
  });
  filterChefRecipeListForEdit(window._chefRecipeSearch);
}

// 切换菜谱时保存当前内容并加载新内容
function switchChefRecipe(newRecipeTitle) {
  const chefId = window._editingChefId;
  const chef = ChefManager.getById(chefId);
  if (!chef) return;

  // 保存当前菜谱的内容
  if (window._chefCurrentRecipe) {
    const content = document.getElementById("newChefContent").value.trim();
    const summary = document.getElementById("newChefSummary").value.trim();
    const existing = chef.recipes.find(r => r.title === window._chefCurrentRecipe);
    if (existing) {
      existing.content = content;
      existing.summary = summary;
      existing.rawContent = content;
      existing.rawSummary = summary;
    } else if (content || summary) {
      chef.recipes.push({
        title: window._chefCurrentRecipe,
        content: content,
        summary: summary,
        rawContent: content,
        rawSummary: summary,
        noteProcessed: false,
        summaryProcessed: false,
        createdAt: new Date().toISOString(),
      });
    }
    ChefManager._save();
  }

  // 加载新菜谱的内容
  loadChefRecipeContent(chefId, newRecipeTitle);
}

// 加载指定菜谱的笔记和总结到编辑表单
function loadChefRecipeContent(chefId, recipeTitle) {
  window._chefCurrentRecipe = recipeTitle;
  const chef = ChefManager.getById(chefId);
  if (!chef) return;

  const recipe = chef.recipes.find(r => r.title === recipeTitle);
  const noteContent = recipe ? (recipe.content || "") : "";
  const summaryContent = recipe ? (recipe.summary || "") : "";

  const noteEl = document.getElementById("newChefContent");
  const summaryEl = document.getElementById("newChefSummary");
  if (noteEl) {
    noteEl.value = noteContent || "## 食材准备\n\n## 详细做法\n\n## 关键技巧\n";
  }
  if (summaryEl) {
    summaryEl.value = summaryContent || "## 食材处理\n\n## 烹饪技法\n\n## 通用要点\n";
  }
}

// 更新自定义大厨
function updateChef(chefId) {
  const name = document.getElementById("newChefName").value.trim();
  const content = document.getElementById("newChefContent").value.trim();
  const summary = document.getElementById("newChefSummary").value.trim();
  const checkedRadio = document.querySelector(".chef-recipe-checkbox:checked");
  const selectedRecipe = checkedRadio ? checkedRadio.value : window._chefCurrentRecipe || "";

  if (!name) {
    showToast("请输入大厨名称");
    return;
  }
  if (!selectedRecipe) {
    showToast("请选择一道菜谱");
    return;
  }

  const chef = ChefManager.getById(chefId);
  if (!chef) return;

  // 更新厨师信息
  chef.name = name;

  // 保存当前选中菜谱的内容（不替换其他菜谱）
  const existingRecipe = chef.recipes.find(r => r.title === selectedRecipe);
  const contentChanged = existingRecipe ? existingRecipe.content !== content : true;
  const summaryChanged = existingRecipe ? (existingRecipe.summary || "") !== summary : true;

  if (existingRecipe) {
    existingRecipe.content = content;
    existingRecipe.summary = summary;
    existingRecipe.rawContent = content;
    existingRecipe.rawSummary = summary;
    existingRecipe.updatedAt = new Date().toISOString();
  } else {
    chef.recipes.push({
      title: selectedRecipe,
      content: content,
      summary: summary,
      rawContent: content,
      rawSummary: summary,
      noteProcessed: false,
      summaryProcessed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  ChefManager._save();
  showChefs();

  // 如果笔记内容有变化，重新提交AI处理
  if (contentChanged) {
    processChefContentWithAI(chefId, selectedRecipe, content, "note");
  }
  // 如果总结内容有变化，重新提交AI处理
  if (summary && summaryChanged) {
    processChefContentWithAI(chefId, selectedRecipe, summary, "summary");
  }

  if (!contentChanged && !summaryChanged) {
    showToast("已保存修改");
  }
}

// 查看默认大厨笔记列表
async function showDefaultChefNotes() {
  const app = document.getElementById("app");
  document.getElementById("bottomNav").style.display = "none";

  app.innerHTML = `
    <div class="page detail-list-page">
      <div class="swipe-header">
        <button class="swipe-header-back" onclick="showChefs()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          返回
        </button>
        <div class="swipe-header-title">默认大厨笔记</div>
        <div style="width:60px"></div>
      </div>
      <div class="chef-notes-search-bar">
        <input type="text" id="defaultNotesSearch" class="chef-recipe-search" placeholder="搜索菜谱..." oninput="filterDefaultChefNotes(this.value)" />
      </div>
      <div class="chef-notes-list" id="defaultChefNotesList">
        <div style="text-align:center;padding:40px;color:#999;">加载中...</div>
      </div>
    </div>
  `;

  try {
    const resp = await fetch("data/guides/index.json");
    if (!resp.ok) throw new Error("加载失败");
    const index = await resp.json();
    // 存到全局供搜索使用
    window._defaultChefNotesIndex = Object.values(index).sort((a, b) =>
      (a.title || "").localeCompare(b.title || "")
    );
    renderDefaultChefNotesList("");
  } catch (e) {
    document.getElementById("defaultChefNotesList").innerHTML =
      `<div style="text-align:center;padding:40px;color:#999;">加载失败：${e.message}</div>`;
  }
}

// 渲染默认大厨笔记列表（带过滤）
function renderDefaultChefNotesList(keyword) {
  const entries = window._defaultChefNotesIndex || [];
  const filtered = keyword
    ? entries.filter((e) => e.title.toLowerCase().includes(keyword.toLowerCase()))
    : entries;

  const listEl = document.getElementById("defaultChefNotesList");
  if (filtered.length === 0) {
    listEl.innerHTML = `<div style="text-align:center;padding:40px;color:#999;">未找到匹配的菜谱</div>`;
    return;
  }
  listEl.innerHTML = filtered.map((entry) => `
    <div class="chef-note-item" onclick="viewDefaultChefNote('${entry.file}')">
      <span class="chef-note-item-icon">📄</span>
      <span class="chef-note-item-title">${entry.title}</span>
      <span class="chef-note-item-arrow">›</span>
    </div>
  `).join("");
}

// 搜索过滤默认大厨笔记
function filterDefaultChefNotes(keyword) {
  renderDefaultChefNotesList(keyword);
}

// 查看默认大厨某道菜的笔记详情（只读，可复制）
async function viewDefaultChefNote(file) {
  const app = document.getElementById("app");
  document.getElementById("bottomNav").style.display = "none";

  app.innerHTML = `
    <div class="page detail-list-page">
      <div class="swipe-header">
        <button class="swipe-header-back" onclick="showDefaultChefNotes()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          返回
        </button>
        <div class="swipe-header-title">笔记详情</div>
        <div style="width:60px"></div>
      </div>
      <div id="defaultNoteDetail" style="padding:16px;">
        <div style="text-align:center;padding:40px;color:#999;">加载中...</div>
      </div>
    </div>
  `;

  try {
    const resp = await fetch("data/guides/recipes/" + file);
    if (!resp.ok) throw new Error("加载失败");
    const md = await resp.text();
    const detailEl = document.getElementById("defaultNoteDetail");
    detailEl.innerHTML = `
      <div class="cg-readonly-note">
        ${ChefGuides.renderMarkdown(md)}
      </div>
      <button class="chef-copy-btn" onclick="copyDefaultChefNote('${file}')">📋 复制笔记内容</button>
    `;
  } catch (e) {
    document.getElementById("defaultNoteDetail").innerHTML =
      `<div style="text-align:center;padding:40px;color:#999;">加载失败：${e.message}</div>`;
  }
}

// 复制默认大厨笔记内容
async function copyDefaultChefNote(file) {
  try {
    const resp = await fetch("data/guides/recipes/" + file);
    const md = await resp.text();
    await navigator.clipboard.writeText(md);
    showToast("已复制到剪贴板");
  } catch (e) {
    showToast("复制失败");
  }
}

function renderChefCard(chef, index) {
  const isDefault = chef.isDefault;
  const enabled = chef.enabled;
  const avatarHtml = chef.avatar
    ? `<img class="chef-card-avatar-img" src="${chef.avatar}" alt="${chef.name}" />`
    : `<span class="chef-card-avatar-emoji">${isDefault ? "👨‍🍳" : "🧑‍🍳"}</span>`;

  const noteCount = isDefault
    ? `<span class="chef-note-count" data-default-count="1">加载中...</span>`
    : `${chef.recipes.length} 条笔记`;

  return `
    <div class="chef-card ${enabled ? "" : "chef-card-disabled"}" data-chef-id="${chef.id}">
      <div class="chef-card-color-dot" style="background:${chef.color}" onclick="showChefColorPicker('${chef.id}', this)" title="点击更换颜色"></div>
      <div class="chef-card-avatar" onclick="showChefAvatarPicker('${chef.id}')">
        ${avatarHtml}
        <div class="chef-card-avatar-edit">✏️</div>
      </div>
      <div class="chef-card-info" onclick="${isDefault ? `showDefaultChefNotes()` : `editChef('${chef.id}')`}">
        <div class="chef-card-name">${chef.name}</div>
        <div class="chef-card-status">${enabled ? "已启用" : "已禁用"} · ${noteCount} · 优先级 ${index + 1}</div>
      </div>
      <div class="chef-card-actions">
        <div class="chef-reorder-btns">
          <button class="chef-reorder-btn" onclick="event.stopPropagation(); moveChefOrder('${chef.id}', 'up')" title="上移">▲</button>
          <button class="chef-reorder-btn" onclick="event.stopPropagation(); moveChefOrder('${chef.id}', 'down')" title="下移">▼</button>
        </div>
        ${isDefault
          ? `<button class="chef-card-view-btn" onclick="event.stopPropagation(); showDefaultChefNotes()" title="查看笔记">📖</button>`
          : `<button class="chef-card-edit-btn" onclick="event.stopPropagation(); editChef('${chef.id}')" title="编辑笔记">✏️</button>`
        }
        <button class="chef-card-toggle ${enabled ? "active" : ""}" onclick="event.stopPropagation(); toggleChefEnabled('${chef.id}')">
          <span class="chef-card-toggle-dot"></span>
        </button>
        ${!isDefault ? `<button class="chef-card-delete" onclick="event.stopPropagation(); deleteChef('${chef.id}')">🗑️</button>` : ""}
      </div>
    </div>
  `;
}

function toggleChefEnabled(chefId) {
  ChefManager.toggleEnabled(chefId);
  showChefs();
  // 更新FAB状态
  updateChefFabState();
}

// 移动厨师顺序
function moveChefOrder(chefId, direction) {
  ChefManager.moveChef(chefId, direction);
  showChefs();
}

// 颜色选择弹窗
function showChefColorPicker(chefId, dotEl) {
  event.stopPropagation();
  const chef = ChefManager.getById(chefId);
  if (!chef) return;

  const existing = document.getElementById("chefColorPicker");
  if (existing) { existing.remove(); return; }

  const rect = dotEl.getBoundingClientRect();
  const colors = ChefManager.COLOR_PALETTE;
  const usedColors = new Set(ChefManager.getAll().map(c => c.color));

  const picker = document.createElement("div");
  picker.id = "chefColorPicker";
  picker.className = "chef-color-picker";

  const colorDots = colors.map(c => {
    const isCurrent = c === chef.color;
    const isUsed = usedColors.has(c) && !isCurrent;
    return `<div class="chef-color-option ${isCurrent ? 'current' : ''} ${isUsed ? 'used' : ''}" 
              style="background:${c}" 
              onclick="selectChefColor('${chefId}', '${c}')"
              title="${isUsed ? '已被其他厨师使用' : '点击选择'}">
              ${isCurrent ? '✓' : ''}
            </div>`;
  }).join("");

  // 自定义颜色输入
  const customSection = `
    <div class="chef-color-custom">
      <input type="color" id="customColorInput" value="${chef.color}" onchange="selectChefColor('${chefId}', this.value)" />
      <span>自定义</span>
    </div>
  `;

  picker.innerHTML = colorDots + customSection;
  document.body.appendChild(picker);

  // 定位
  const pickerRect = picker.getBoundingClientRect();
  let top = rect.top - pickerRect.height - 8;
  let left = rect.left + rect.width / 2 - pickerRect.width / 2;
  if (top < 8) top = rect.bottom + 8;
  if (left < 8) left = 8;
  if (left + pickerRect.width > window.innerWidth - 8) left = window.innerWidth - pickerRect.width - 8;
  picker.style.top = top + "px";
  picker.style.left = left + "px";

  // 点击外部关闭
  const closeHandler = (e) => {
    if (!picker.contains(e.target) && e.target !== dotEl) {
      picker.remove();
      document.removeEventListener("click", closeHandler, true);
    }
  };
  setTimeout(() => document.addEventListener("click", closeHandler, true), 0);
}

function selectChefColor(chefId, color) {
  ChefManager.updateColor(chefId, color);
  document.getElementById("chefColorPicker")?.remove();
  showChefs();
  updateChefFabState();
  showToast("颜色已更新");
}

function deleteChef(chefId) {
  if (confirm("确定删除这位大厨？其所有笔记将被清除。")) {
    ChefManager.removeChef(chefId);
    showChefs();
    updateChefFabState();
    showToast("已删除");
  }
}

// 头像选择弹窗
function showChefAvatarPicker(chefId) {
  const chef = ChefManager.getById(chefId);
  if (!chef) return;

  const existing = document.getElementById("chefAvatarMenu");
  if (existing) existing.remove();

  // 找到被点击的头像元素用于定位
  const avatarEl = event && event.currentTarget ? event.currentTarget : null;
  const rect = avatarEl ? avatarEl.getBoundingClientRect() : null;

  const menu = document.createElement("div");
  menu.id = "chefAvatarMenu";
  menu.className = "chef-avatar-menu";
  menu.innerHTML = `
    <div class="chef-avatar-menu-option" onclick="setChefAvatarDefault('${chefId}')">
      <span class="chef-avatar-menu-icon">👨‍🍳</span>
      <span>默认头像</span>
    </div>
    <div class="chef-avatar-menu-option" onclick="setChefAvatarCustom('${chefId}')">
      <span class="chef-avatar-menu-icon">📷</span>
      <span>自定义头像</span>
    </div>
  `;
  document.body.appendChild(menu);

  // 定位弹窗
  if (rect) {
    const menuRect = menu.getBoundingClientRect();
    let top = rect.top - menuRect.height - 8;
    let left = rect.left + rect.width / 2 - menuRect.width / 2;
    if (top < 8) top = rect.bottom + 8;
    if (left < 8) left = 8;
    if (left + menuRect.width > window.innerWidth - 8) left = window.innerWidth - menuRect.width - 8;
    menu.style.top = top + "px";
    menu.style.left = left + "px";
  } else {
    menu.style.top = "50%";
    menu.style.left = "50%";
    menu.style.transform = "translate(-50%, -50%)";
  }

  const closeHandler = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener("click", closeHandler, true);
    }
  };
  setTimeout(() => document.addEventListener("click", closeHandler, true), 0);
}

// 设置默认emoji头像
function setChefAvatarDefault(chefId) {
  ChefManager.updateAvatar(chefId, null);
  document.getElementById("chefAvatarMenu")?.remove();
  showChefs();
  updateChefFabState();
  showToast("已使用默认头像");
}

// 上传自定义头像
function setChefAvatarCustom(chefId) {
  document.getElementById("chefAvatarMenu")?.remove();

  let input = document.getElementById("chefAvatarInput");
  if (!input) {
    input = document.createElement("input");
    input.type = "file";
    input.id = "chefAvatarInput";
    input.accept = "image/*";
    input.style.display = "none";
    document.body.appendChild(input);
  }

  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const dataUrl = await resizeAndCropImage(file, 200, 200);
    ChefManager.updateAvatar(chefId, dataUrl);
    showChefs();
    updateChefFabState();
    showToast("头像已更新");
  };

  input.click();
}

// 图片压缩裁剪工具
function resizeAndCropImage(file, targetWidth, targetHeight) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");

        // 计算裁剪区域（中心裁剪为正方形）
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;

        ctx.drawImage(img, sx, sy, size, size, 0, 0, targetWidth, targetHeight);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// 新增厨师表单
function showAddChefForm() {
  const app = document.getElementById("app");
  document.getElementById("bottomNav").style.display = "none";
  app.innerHTML = `
    <div class="page detail-list-page">
      <div class="swipe-header">
        <button class="swipe-header-back" onclick="showChefs()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          返回
        </button>
        <div class="swipe-header-title">新增大厨</div>
        <div style="width:60px"></div>
      </div>
      <div class="chef-form">
        <div class="chef-form-section">
          <label class="chef-form-label">大厨名称</label>
          <input type="text" id="newChefName" class="chef-form-input" placeholder="如：川菜大师" value="" />
        </div>
        <div class="chef-form-section">
          <label class="chef-form-label">选择菜谱</label>
          <div class="chef-recipe-picker" id="chefRecipePicker">
            <input type="text" class="chef-recipe-search" placeholder="搜索菜谱..." oninput="filterChefRecipeList(this.value)" />
            <div class="chef-recipe-list" id="chefRecipeList">
              ${renderChefRecipeList("")}
            </div>
          </div>
        </div>
        <div class="chef-form-section">
          <label class="chef-form-label">大厨笔记（菜谱做法，按模板填写）</label>
          <textarea id="newChefContent" class="chef-form-textarea" rows="14">## 食材准备

## 详细做法

## 关键技巧
</textarea>
        </div>
        <div class="chef-form-section">
          <label class="chef-form-label">大厨总结（烹饪技法与要点，按模板填写）</label>
          <textarea id="newChefSummary" class="chef-form-textarea" rows="10">## 食材处理

## 烹饪技法

## 通用要点
</textarea>
        </div>
        <div class="chef-form-actions">
          <button class="chef-form-submit" onclick="submitNewChef()">提交并保存</button>
        </div>
      </div>
    </div>
  `;
}

function renderChefRecipeList(filter) {
  const recipes = allRecipes.filter((r) => {
    if (r.category === "condiment" || r.category === "template") return false;
    if (filter && !r.title.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  }).slice(0, 100); // 限制显示数量

  return recipes.map((r) => `
    <label class="chef-recipe-item">
      <input type="radio" name="chefRecipeRadio" class="chef-recipe-checkbox" value="${r.title}" />
      <span class="chef-recipe-item-title">${r.title}</span>
      <span class="chef-recipe-item-category">${r.categoryLabel || r.category}</span>
    </label>
  `).join("");
}

function filterChefRecipeList(keyword) {
  const list = document.getElementById("chefRecipeList");
  if (list) {
    list.innerHTML = renderChefRecipeList(keyword);
  }
}

function submitNewChef() {
  const name = document.getElementById("newChefName").value.trim();
  const content = document.getElementById("newChefContent").value.trim();
  const summary = document.getElementById("newChefSummary").value.trim();
  const checkedRadio = document.querySelector(".chef-recipe-checkbox:checked");
  const selectedRecipe = checkedRadio ? checkedRadio.value : "";

  if (!name) {
    showToast("请输入大厨名称");
    return;
  }

  if (!selectedRecipe) {
    showToast("请选择一道菜谱");
    return;
  }

  if (!content) {
    showToast("请输入大厨笔记内容");
    return;
  }

  // 验证笔记内容是否为有效菜谱做法
  const noteValidation = validateChefContent(content);
  if (!noteValidation.valid) {
    showToast("笔记内容无效：" + noteValidation.reason + "。已保存但未处理。");
  }

  // 验证总结内容（如果填写了）
  let summaryValidation = { valid: true };
  if (summary) {
    summaryValidation = validateChefContent(summary);
    if (!summaryValidation.valid) {
      showToast("总结内容无效：" + summaryValidation.reason + "。已保存但未处理。");
    }
  }

  // 创建新厨师
  const newChef = ChefManager.addChef({
    name: name,
    recipes: [{
      title: selectedRecipe,
      content: content,
      summary: summary,
      rawContent: content,
      rawSummary: summary,
      noteProcessed: false,
      summaryProcessed: false,
      createdAt: new Date().toISOString(),
    }],
  });

  // 如果笔记内容有效，调用AI处理
  if (noteValidation.valid) {
    processChefContentWithAI(newChef.id, selectedRecipe, content, "note");
  }
  // 如果总结内容有效，调用AI处理
  if (summary && summaryValidation.valid) {
    processChefContentWithAI(newChef.id, selectedRecipe, summary, "summary");
  }

  const hasProcessing = noteValidation.valid || (summary && summaryValidation.valid);
  showToast(hasProcessing ? "大厨已创建，AI正在处理内容..." : "大厨已创建（内容未处理）");
  showChefs();
}

// 验证厨师内容（当前不限制内容，所有内容都提交给AI处理）
function validateChefContent(content) {
  return { valid: true };
}

// 使用AI处理厨师内容（type: "note" 笔记 | "summary" 总结）
async function processChefContentWithAI(chefId, recipeTitle, content, type = "note") {
  const model = getAIModelByUse("recommend");
  if (!model) {
    console.log("未配置推荐模型，跳过AI处理");
    showToast("未配置AI模型，内容已保存但未经AI处理");
    return;
  }

  const systemPrompt = "你是一位专业的中餐厨师，擅长将用户输入的菜谱内容整理成标准格式的厨房笔记。";

  const prompt = type === "summary"
    ? `请将以下用户输入的烹饪总结，整理成标准的大厨总结格式。

要求：
1. 提取食材处理要点（如有）
2. 提取烹饪技法要点（如火候、油温等）
3. 提取通用注意事项
4. 输出为Markdown格式，包含 ## 食材处理、## 烹饪技法、## 通用要点 三个部分（无内容的可省略）
5. 语言简洁专业，适合作为厨房总结

用户输入内容：
${content}

请输出整理后的Markdown内容：`
    : `请将以下用户输入的菜谱做法，整理成标准的菜谱笔记格式。

要求：
1. 提取食材准备部分（包括食材处理方法，如切法、腌制等）
2. 提取详细做法部分（按步骤编号，每步一个要点）
3. 提取关键技巧和注意事项
4. 输出为Markdown格式，必须包含以下三个二级标题：
   - ## 食材准备
   - ## 详细做法
   - ## 关键技巧
5. 每个部分用列表项（- 开头）或编号（1. 开头）列出具体内容
6. 语言简洁专业，适合作为厨房笔记

用户输入内容：
${content}

请输出整理后的Markdown内容：`;

  try {
    const processedContent = await callAI(prompt, "recommend", systemPrompt);

    // 更新厨师的菜谱内容为处理后的版本
    const chef = ChefManager.getById(chefId);
    if (chef) {
      const recipe = chef.recipes.find((r) => r.title === recipeTitle);
      if (recipe) {
        if (type === "summary") {
          recipe.summary = processedContent;
          recipe.summaryProcessed = true;
        } else {
          recipe.content = processedContent;
          recipe.noteProcessed = true;
        }
      }
      ChefManager._save();
      console.log("AI处理完成", type, processedContent.substring(0, 200));
      showToast(type === "summary" ? "大厨总结已由AI处理完成" : "大厨笔记已由AI处理完成");
    }
  } catch (err) {
    console.error("AI处理出错:", err);
    showToast("AI处理失败：" + err.message + "，内容已保存原始版本");
  }
}

// ============================================
// 饮食偏好 / 过敏源 选择页
// ============================================
function renderPrefPage({ title, options, selected, onToggle, intro }) {
  const app = document.getElementById("app");
  document.getElementById("bottomNav").style.display = "none";
  app.innerHTML = `
    <div class="page detail-list-page">
      <div class="swipe-header">
        <button class="swipe-header-back" onclick="document.getElementById('bottomNav').style.display='';renderPage('me')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          返回
        </button>
        <div class="swipe-header-title">${title}</div>
        <button class="pref-clear-btn" onclick="${onToggle}('__CLEAR__')">清空</button>
      </div>
      <div class="pref-intro">${intro}</div>
      <div class="pref-tags">
        ${options.map((opt) => {
          const active = selected.includes(opt.value);
          return `
            <div class="pref-tag ${active ? "active" : ""}" onclick="${onToggle}('${opt.value}')">
              <span class="pref-tag-icon">${opt.icon}</span>
              <span class="pref-tag-label">${opt.label}</span>
              ${active ? '<svg class="pref-tag-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ""}
            </div>
          `;
        }).join("")}
      </div>
      <div class="pref-actions">
        <button class="pref-btn-save" onclick="savePrefsAndBack('${onToggle}')">保存并返回</button>
      </div>
    </div>
  `;
}

function showDietPreferences() {
  renderPrefPage({
    title: "饮食偏好",
    options: DIET_PREFERENCE_OPTIONS,
    selected: dietPreferences,
    onToggle: "toggleDietPref",
    intro: "选择你的饮食偏好，不符合的菜谱将不会出现在推荐中（可多选）",
  });
}

function showAllergens() {
  renderPrefPage({
    title: "过敏原管理",
    options: ALLERGEN_OPTIONS,
    selected: allergens,
    onToggle: "toggleAllergen",
    intro: "选择你的过敏原，含过敏原的菜谱会被红色标识并排序靠后（可多选）",
  });
}

function toggleDietPref(value) {
  if (value === "__CLEAR__") {
    dietPreferences = [];
  } else {
    const idx = dietPreferences.indexOf(value);
    if (idx >= 0) dietPreferences.splice(idx, 1);
    else dietPreferences.push(value);
  }
  showDietPreferences();
}

function toggleAllergen(value) {
  if (value === "__CLEAR__") {
    allergens = [];
  } else {
    const idx = allergens.indexOf(value);
    if (idx >= 0) allergens.splice(idx, 1);
    else allergens.push(value);
  }
  showAllergens();
}

function savePrefsAndBack(type) {
  if (type === "toggleDietPref") {
    saveDietPrefs();
    showToast("饮食偏好已保存");
  } else if (type === "toggleAllergen") {
    saveAllergens();
    showToast("过敏原已保存");
  }
  document.getElementById("bottomNav").style.display = "";
  renderPage("me");
}

// ============================================
// 已做菜谱页面
// ============================================
function showFavoriteRecipes() {
  currentMeSubPage = "favorites";
  const app = document.getElementById("app");
  document.getElementById("bottomNav").style.display = "none";

  const favorites = getFavoriteRecipes();

  app.innerHTML = `
    <div class="page detail-list-page favorites-page">
      <div class="swipe-header">
        <button class="swipe-header-back" onclick="currentMeSubPage=null;document.getElementById('bottomNav').style.display='';renderPage('me')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          返回
        </button>
        <div class="swipe-header-title">📌 收藏菜谱</div>
        <div style="width:50px"></div>
      </div>

      ${favorites.length === 0 ? `
        <div class="detail-empty">
          <div style="font-size:48px;margin-bottom:12px">📌</div>
          <div style="font-size:16px;font-weight:600;margin-bottom:4px">还没有收藏菜谱</div>
          <div style="font-size:13px;color:var(--text-muted)">看到喜欢的菜谱，点击菜谱详情里的收藏按钮钉起来</div>
        </div>
      ` : `
        <div class="stamp-grid">
          ${favorites.map((r) => {
            const emoji = getRecipeEmoji(r);
            const image = r.images && r.images.length > 0 ? r.images[0] : null;
            const fav = isFavorite(r.id);
            const tagText = r.tags && r.tags.length > 0 ? r.tags[0] : "";
            const timeMins = r.timeMinutes ? r.timeMinutes : null;
            const addedDate = new Date(r._favoriteAddedAt || Date.now());
            const dateStr = `${addedDate.getMonth() + 1}月${addedDate.getDate()}日`;
            // 基于recipeId分配图钉颜色（与发现页保持一致）
            const pinColor = getPinColorClass(r.id);
            // 获取做菜次数
            const cookedInfo = (window.userStats && window.userStats.cookedRecipes) ? window.userStats.cookedRecipes[r.id] : null;
            const cookCount = cookedInfo ? cookedInfo.count : 0;
            const countText = cookCount > 0 ? String(cookCount) : '';
            const countLen = countText.length;
            return `
              <div class="stamp-card" onclick="showRecipeDetailDirect('${r.id}')">
                <button class="stamp-fav-btn ${fav ? 'active' : ''} ${pinColor}" ${countLen >= 3 ? `data-count-length="${countLen}"` : ''} onclick="event.stopPropagation();toggleFavoriteAndUpdate('${r.id}')" title="${fav ? '取消收藏' : '收藏'}${cookCount > 0 ? ` · 已做${cookCount}次` : ''}">${countText}</button>
                <div class="stamp-inner">
                  ${image
                    ? `<img class="stamp-img" src="${assetUrl(image)}" alt="${r.title}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                       <div class="stamp-img-placeholder" style="display:none">${emoji}</div>`
                    : `<div class="stamp-img-placeholder">${emoji}</div>`
                  }
                </div>
                <div class="stamp-title">${r.title}</div>
                <div class="stamp-subtitle">
                  ${tagText ? `<span>${tagText}</span>` : ''}
                  ${timeMins ? `<span>⏱${timeMins}分</span>` : ''}
                  <span class="stamp-date">${dateStr}</span>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `}
    </div>
  `;
}

function showCookedRecipes() {
  currentMeSubPage = "cooked";
  const app = document.getElementById("app");
  document.getElementById("bottomNav").style.display = "none";

  const cooked = window.userStats.cookedRecipes || {};
  const entries = Object.entries(cooked).sort((a, b) => b[1].lastCooked - a[1].lastCooked);

  app.innerHTML = `
    <div class="page detail-list-page">
      <div class="swipe-header">
        <button class="swipe-header-back" onclick="currentMeSubPage=null;document.getElementById('bottomNav').style.display='';renderPage('me')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          返回
        </button>
        <div class="swipe-header-title">已做菜谱</div>
        <div style="width:50px"></div>
      </div>

      ${entries.length === 0 ? `
        <div class="detail-empty">
          <div style="font-size:48px;margin-bottom:12px">🍳</div>
          <div style="font-size:16px;font-weight:600;margin-bottom:4px">还没有做过菜</div>
          <div style="font-size:13px;color:var(--text-muted)">完成一次烹饪后这里会显示记录</div>
        </div>
      ` : `
        <div class="stamp-grid">
          ${entries.map(([recipeId, info]) => {
            const recipe = allRecipes.find((r) => r.id === recipeId);
            const image = recipe && recipe.images && recipe.images.length > 0
              ? recipe.images[0] : null;
            const emoji = recipe ? getRecipeEmoji(recipe) : "🍽️";
            const tagText = recipe && recipe.tags && recipe.tags.length > 0 ? recipe.tags[0] : "";
            const lastDate = new Date(info.lastCooked);
            const dateStr = `${lastDate.getMonth() + 1}月${lastDate.getDate()}日`;
            // 基于recipeId分配图钉颜色（与发现页/收藏页一致）
            const pinColor = getPinColorClass(recipeId);
            return `
              <div class="stamp-card" onclick="${recipe ? `showRecipeDetailDirect('${recipeId}')` : ''}">
                <div class="stamp-fav-btn active ${pinColor}" style="pointer-events:none;"></div>
                <div class="stamp-count-badge">×${info.count}</div>
                <div class="stamp-inner">
                  ${image
                    ? `<img class="stamp-img" src="${assetUrl(image)}" alt="${info.title}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                       <div class="stamp-img-placeholder" style="display:none">${emoji}</div>`
                    : `<div class="stamp-img-placeholder">${emoji}</div>`
                  }
                </div>
                <div class="stamp-title">${info.title}</div>
                <div class="stamp-subtitle">
                  ${tagText ? `<span>${tagText}</span>` : ''}
                  <span class="stamp-cooked">🍳做过${info.count}次</span>
                  <span class="stamp-date">${dateStr}</span>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `}
    </div>
  `;
}

// ============================================
// 消耗食材页面
// ============================================
function showConsumedIngredients() {
  currentMeSubPage = "consumed";
  const app = document.getElementById("app");
  document.getElementById("bottomNav").style.display = "none";

  const consumed = window.userStats.consumedIngredients || {};
  const supplemented = window.userStats.supplementedIngredients || {};

  // 消耗食材按次数排序
  const consumedList = Object.entries(consumed).sort((a, b) => b[1] - a[1]);
  // 经常补充按次数排序
  const supplementedList = Object.entries(supplemented).sort((a, b) => b[1] - a[1]);

  app.innerHTML = `
    <div class="page detail-list-page">
      <div class="swipe-header">
        <button class="swipe-header-back" onclick="currentMeSubPage=null;document.getElementById('bottomNav').style.display='';renderPage('me')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          返回
        </button>
        <div class="swipe-header-title">食材记录</div>
        <div style="width:50px"></div>
      </div>

      <div class="ingredient-record-section">
        <div class="ingredient-record-title">
          <span>🥬 已消耗食材</span>
          <div style="display:flex;align-items:center;gap:10px">
            <span class="ingredient-record-count">${consumedList.length} 种</span>
            ${consumedList.length > 0 ? `<button class="ingredient-record-clear" onclick="clearConsumedIngredients()">清空</button>` : ""}
          </div>
        </div>
        ${consumedList.length === 0 ? `
          <div class="detail-empty-small">还没有消耗记录</div>
        ` : `
          <div class="ingredient-tag-list">
            ${consumedList.map(([name, count]) => `
              <div class="ingredient-tag-item consumed">
                <span class="ingredient-tag-emoji">${INGREDIENT_EMOJI[name] || "🥘"}</span>
                <span class="ingredient-tag-name">${name}</span>
                <span class="ingredient-tag-badge">${count}</span>
              </div>
            `).join("")}
          </div>
        `}
      </div>

      <div class="ingredient-record-section">
        <div class="ingredient-record-title">
          <span>🛒 经常补充的食材</span>
          <div style="display:flex;align-items:center;gap:10px">
            <span class="ingredient-record-count">${supplementedList.length} 种</span>
            ${supplementedList.length > 0 ? `<button class="ingredient-record-clear" onclick="clearSupplementedIngredients()">清空</button>` : ""}
          </div>
        </div>
        <div class="ingredient-record-hint">推荐菜谱中需要采买的食材，建议下次购物时补充</div>
        ${supplementedList.length === 0 ? `
          <div class="detail-empty-small">还没有补充记录</div>
        ` : `
          <div class="ingredient-tag-list">
            ${supplementedList.map(([name, count]) => `
              <div class="ingredient-tag-item supplemented">
                <span class="ingredient-tag-emoji">${INGREDIENT_EMOJI[name] || "🥘"}</span>
                <span class="ingredient-tag-name">${name}</span>
                <span class="ingredient-tag-badge">${count}</span>
              </div>
            `).join("")}
          </div>
        `}
      </div>
    </div>
  `;
}

function clearConsumedIngredients() {
  if (confirm("确定清空所有已消耗食材记录吗？此操作不可恢复。")) {
    window.userStats.consumedIngredients = {};
    saveStats();
    showConsumedIngredients();
    showToast("已清空消耗记录");
  }
}

function clearSupplementedIngredients() {
  if (confirm("确定清空所有经常补充的食材记录吗？此操作不可恢复。")) {
    window.userStats.supplementedIngredients = {};
    saveStats();
    showConsumedIngredients();
    showToast("已清空补充记录");
  }
}

function clearAllData() {
  if (confirm("确定清空冰箱所有食材？")) {
    fridge = [];
    saveFridge();
    renderPage("me");
    showToast("已清空");
  }
}

// ============================================
// 厨房：调料 / 厨具 管理页面
// ============================================
function showKitchenSection(type) {
  const isSeasonings = type === "seasonings";
  const title = isSeasonings ? "调料管理" : "厨具管理";
  const items = isSeasonings ? seasonings : utensils;
  const emoji = isSeasonings ? "🧂" : "🍳";
  const hint = isSeasonings ? "调料会自动算入库存食材参与菜谱推荐" : "厨具记录你厨房里已有的烹饪工具";
  const placeholder = isSeasonings ? "输入调料名称…" : "输入厨具名称…";

  const app = document.getElementById("app");
  document.getElementById("bottomNav").style.display = "none";
  app.innerHTML = `
    <div class="page detail-list-page">
      <div class="swipe-header">
        <button class="swipe-header-back" onclick="document.getElementById('bottomNav').style.display='';renderPage('me')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          返回
        </button>
        <div class="swipe-header-title">${title}</div>
        <div style="width:50px"></div>
      </div>

      <div class="kitchen-hint">${emoji} ${hint}</div>

      <div class="kitchen-items">
        ${items.map((item, idx) => `
          <div class="kitchen-item">
            <span class="kitchen-item-name">${emoji} ${item}</span>
            <button class="kitchen-item-delete" onclick="removeKitchenItem('${type}', ${idx})">×</button>
          </div>
        `).join("")}
      </div>

      <div class="kitchen-add-row">
        <input type="text" id="kitchenAddInput" placeholder="${placeholder}"
          onkeydown="if(event.key==='Enter')addKitchenItem('${type}')"
          class="kitchen-add-input" />
        <button class="kitchen-add-btn" onclick="addKitchenItem('${type}')">添加</button>
      </div>
    </div>
  `;
}

function addKitchenItem(type) {
  const input = document.getElementById("kitchenAddInput");
  if (!input) return;
  const name = input.value.trim();
  if (!name) return;
  const items = type === "seasonings" ? seasonings : utensils;
  if (items.includes(name)) {
    showToast("已存在");
    return;
  }
  items.push(name);
  if (type === "seasonings") saveSeasonings();
  else saveUtensils();
  showKitchenSection(type);
}

function removeKitchenItem(type, index) {
  const items = type === "seasonings" ? seasonings : utensils;
  const name = items[index];
  items.splice(index, 1);
  if (type === "seasonings") saveSeasonings();
  else saveUtensils();
  showKitchenSection(type);
  showToast(`已移除 ${name}`);
}

// ============================================
// AI 模型管理页面
// ============================================
function showAIModels() {
  const app = document.getElementById("app");
  document.getElementById("bottomNav").style.display = "none";
  const config = loadAIModels();

  // 使用中：有用途标签的模型
  const inUseModels = config.models.filter((m) => m.uses && m.uses.length > 0);
  const recommendModel = config.models.find((m) => m.uses && m.uses.includes("recommend"));
  const recognizeModel = config.models.find((m) => m.uses && m.uses.includes("recognize"));
  const calendarModel = config.models.find((m) => m.uses && m.uses.includes("calendar"));

  const useLabel = (use) => use === "recommend" ? "推荐菜谱" : use === "recognize" ? "语音/图像识别" : "日历分析";

  app.innerHTML = `
    <div class="page ai-models-page">
      <div class="swipe-header">
        <button class="swipe-header-back" onclick="document.getElementById('bottomNav').style.display='';renderPage('me')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          返回
        </button>
        <div class="swipe-header-title">AI模型管理</div>
        <div style="width:50px"></div>
      </div>

      <div class="ai-models-intro">
        <div class="ai-models-intro-icon">🤖</div>
        <div class="ai-models-intro-text">
          配置 OpenAI 兼容的模型后，可为「推荐菜谱」、「语音/图像识别」和「日历分析」分别指定模型。点击下方模型卡片设置用途。
        </div>
      </div>

      <div class="ai-default-section">
        <div class="ai-section-title">使用中</div>
        ${inUseModels.length > 0 ? `
          <div class="ai-inuse-list">
            ${inUseModels.map((m) => `
              <div class="ai-inuse-card">
                <div class="ai-inuse-name">${m.name}</div>
                <div class="ai-inuse-model">${m.model}</div>
                <div class="ai-inuse-tags">
                  ${m.uses.map((u) => `<span class="ai-use-tag ${u}">${useLabel(u)}</span>`).join("")}
                </div>
              </div>
            `).join("")}
          </div>
        ` : `
          <div class="ai-default-empty">
            <div class="ai-default-empty-text">尚未指定使用中的模型</div>
            <div class="ai-default-empty-sub">点击下方模型卡片设置用途</div>
          </div>
        `}
        ${(!recommendModel || !recognizeModel || !calendarModel) && config.models.length > 0 ? `
          <div class="ai-use-hint">
            ${!recommendModel ? '⚠️ 未指定「推荐菜谱」模型，食材灵感推荐不可用<br>' : ''}
            ${!recognizeModel ? '⚠️ 未指定「语音/图像识别」模型，语音和拍照功能不可用<br>' : ''}
            ${!calendarModel ? '⚠️ 未指定「日历分析」模型，做菜日历的大厨建议不可用' : ''}
          </div>
        ` : ''}
      </div>

      <div class="ai-list-section">
        <div class="ai-section-title">
          <span>所有模型</span>
          <button class="ai-add-btn" onclick="openAIModelEditor()">+ 新增模型</button>
        </div>

        ${config.models.length === 0 ? `
          <div class="ai-list-empty">
            <div style="font-size:40px;margin-bottom:8px">📭</div>
            <div>还没有模型，点击右上角新增</div>
          </div>
        ` : `
          <div class="ai-model-list">
            ${config.models.map((m) => `
              <div class="ai-model-item ${m.uses && m.uses.length > 0 ? 'is-default' : ''}" onclick="openAIUseEditor('${m.id}')">
                <div class="ai-model-item-info">
                  <div class="ai-model-item-name">
                    ${m.name}${m.builtin ? ' <span class="ai-builtin-badge">内置</span>' : ''}
                    ${m.uses && m.uses.length > 0 ? m.uses.map((u) => `<span class="ai-use-tag ${u}">${useLabel(u)}</span>`).join("") : ''}
                  </div>
                  ${m.builtin ? `
                    <div class="ai-model-item-hint">已预配置，无需填写</div>
                  ` : `
                    <div class="ai-model-item-model">${m.model}</div>
                    <div class="ai-model-item-url">${m.url}</div>
                  `}
                  <div class="ai-model-item-hint">点击设置用途</div>
                </div>
                <div class="ai-model-item-actions">
                  ${m.builtin ? '' : `<button class="ai-model-action-btn" onclick="event.stopPropagation();openAIModelEditor('${m.id}')">编辑</button>`}
                  ${m.builtin ? '' : `<button class="ai-model-action-btn danger" onclick="event.stopPropagation();deleteAIModel('${m.id}')">删除</button>`}
                </div>
              </div>
            `).join("")}
          </div>
        `}
      </div>
    </div>
  `;
}

// 点击模型卡片 → 弹窗设置用途标签（多选）
function openAIUseEditor(modelId) {
  const config = loadAIModels();
  const model = config.models.find((m) => m.id === modelId);
  if (!model) return;
  const currentUses = model.uses || [];

  // 如果该用途已被其他模型占用，提示将切换
  const recommendOwner = config.models.find((m) => m.id !== modelId && m.uses && m.uses.includes("recommend"));
  const recognizeOwner = config.models.find((m) => m.id !== modelId && m.uses && m.uses.includes("recognize"));
  const calendarOwner = config.models.find((m) => m.id !== modelId && m.uses && m.uses.includes("calendar"));

  const modal = document.getElementById("aiUseModal");
  document.getElementById("aiUseModalModelName").textContent = model.name;
  document.getElementById("aiUseModalModelId").value = modelId;

  const tagRecommend = document.getElementById("aiUseTagRecommend");
  const tagRecognize = document.getElementById("aiUseTagRecognize");
  const tagCalendar = document.getElementById("aiUseTagCalendar");
  tagRecommend.classList.toggle("selected", currentUses.includes("recommend"));
  tagRecognize.classList.toggle("selected", currentUses.includes("recognize"));
  tagCalendar.classList.toggle("selected", currentUses.includes("calendar"));

  // 提示
  const hintEl = document.getElementById("aiUseModalHint");
  const hints = [];
  if (!currentUses.includes("recommend") && recommendOwner) hints.push(`「推荐菜谱」当前由 ${recommendOwner.name} 使用，选中后将切换`);
  if (!currentUses.includes("recognize") && recognizeOwner) hints.push(`「语音/图像识别」当前由 ${recognizeOwner.name} 使用，选中后将切换`);
  if (!currentUses.includes("calendar") && calendarOwner) hints.push(`「日历分析」当前由 ${calendarOwner.name} 使用，选中后将切换`);
  hintEl.innerHTML = hints.length > 0 ? hints.join("<br>") : "";

  modal.classList.remove("hidden");
}

function toggleAIUseTag(el) {
  el.classList.toggle("selected");
}

function confirmAIUses() {
  const modelId = document.getElementById("aiUseModalModelId").value;
  const config = loadAIModels();
  const model = config.models.find((m) => m.id === modelId);
  if (!model) return;

  const uses = [];
  if (document.getElementById("aiUseTagRecommend").classList.contains("selected")) uses.push("recommend");
  if (document.getElementById("aiUseTagRecognize").classList.contains("selected")) uses.push("recognize");
  if (document.getElementById("aiUseTagCalendar").classList.contains("selected")) uses.push("calendar");

  // 同一用途只允许一个模型使用：清除其他模型的相同用途
  uses.forEach((u) => {
    config.models.forEach((m) => {
      if (m.id !== modelId && m.uses && m.uses.includes(u)) {
        m.uses = m.uses.filter((x) => x !== u);
      }
    });
  });

  model.uses = uses;
  saveAIModels(config);
  document.getElementById("aiUseModal").classList.add("hidden");
  showAIModels();
  showToast(uses.length > 0 ? "已设置用途" : "已清除用途");
}

function cancelAIUses() {
  document.getElementById("aiUseModal").classList.add("hidden");
}

function deleteAIModel(modelId) {
  const config = loadAIModels();
  const model = config.models.find((m) => m.id === modelId);
  if (!model) return;
  if (model.builtin) {
    showToast("内置模型不可删除");
    return;
  }
  if (!confirm(`确定删除模型「${model.name}」？`)) return;
  config.models = config.models.filter((m) => m.id !== modelId);
  saveAIModels(config);
  showAIModels();
  showToast("已删除");
}

function openAIModelEditor(modelId) {
  const config = loadAIModels();
  const editing = modelId ? config.models.find((m) => m.id === modelId) : null;

  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="page ai-editor-page">
      <div class="swipe-header">
        <button class="swipe-header-back" onclick="showAIModels()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          返回
        </button>
        <div class="swipe-header-title">${editing ? '编辑模型' : '新增模型'}</div>
        <div style="width:50px"></div>
      </div>

      <div class="ai-editor-form">
        <div class="ai-form-group">
          <label class="ai-form-label">模型名称</label>
          <input type="text" id="aiFormName" class="ai-form-input" placeholder="如：我的GPT" value="${editing ? editing.name : ''}" />
          <div class="ai-form-hint">用于在列表中识别</div>
        </div>

        <div class="ai-form-group">
          <label class="ai-form-label">API 地址 (Base URL)</label>
          <input type="text" id="aiFormUrl" class="ai-form-input" placeholder="如：https://api.openai.com/v1" value="${editing ? editing.url : ''}" />
          <div class="ai-form-hint">OpenAI 兼容协议，不要带末尾斜杠</div>
        </div>

        <div class="ai-form-group">
          <label class="ai-form-label">API Key</label>
          <input type="password" id="aiFormKey" class="ai-form-input" placeholder="sk-..." value="${editing ? editing.apiKey : ''}" />
          <div class="ai-form-hint">仅保存在本地浏览器</div>
        </div>

        <div class="ai-form-group">
          <label class="ai-form-label">模型 ID</label>
          <input type="text" id="aiFormModel" class="ai-form-input" placeholder="如：gpt-4o-mini" value="${editing ? editing.model : ''}" />
          <div class="ai-form-hint">模型供应商提供的模型标识</div>
        </div>

        <button class="ai-form-save" onclick="saveAIModelForm('${modelId || ''}')">保存</button>
        ${!editing && config.models.length === 0 ? '<div class="ai-form-hint-center">保存后请在模型卡片上设置用途</div>' : ''}
      </div>
    </div>
  `;
}

function saveAIModelForm(modelId) {
  const name = document.getElementById("aiFormName").value.trim();
  const url = document.getElementById("aiFormUrl").value.trim();
  const apiKey = document.getElementById("aiFormKey").value.trim();
  const model = document.getElementById("aiFormModel").value.trim();

  if (!name || !url || !apiKey || !model) {
    showToast("请填写完整信息");
    return;
  }
  // 去掉末尾斜杠
  const cleanUrl = url.replace(/\/+$/, "");

  const config = loadAIModels();
  if (modelId) {
    // 编辑
    const idx = config.models.findIndex((m) => m.id === modelId);
    if (idx >= 0) {
      config.models[idx] = { ...config.models[idx], name, url: cleanUrl, apiKey, model };
    }
  } else {
    // 新增
    const newModel = {
      id: "m_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      name, url: cleanUrl, apiKey, model, uses: [],
    };
    config.models.push(newModel);
    // 第一个模型自动设为推荐用途
    if (!config.models.some((m) => m.uses && m.uses.includes("recommend"))) {
      newModel.uses = ["recommend"];
    }
  }
  saveAIModels(config);
  showAIModels();
  showToast(modelId ? "已更新" : "已添加");
}

// ============================================
// 厨师FAB状态管理
// ============================================
function updateChefFabState() {
  const fab = document.getElementById("chefAgentFab");
  if (!fab) return;

  const enabledChefs = ChefManager.getEnabled();
  const defaultChef = ChefManager.getDefault();
  const defaultEnabled = defaultChef && defaultChef.enabled;

  if (enabledChefs.length === 0) {
    // 没有启用的厨师：灰色禁用状态
    fab.classList.add("chef-fab-disabled");
    const iconEl = fab.querySelector(".chef-agent-fab-icon");
    if (defaultChef && defaultChef.avatar) {
      iconEl.innerHTML = `<img src="${defaultChef.avatar}" class="chef-fab-avatar-img disabled" />`;
    } else {
      iconEl.textContent = "👨‍🍳";
    }
    fab.style.background = "";
    fab.style.boxShadow = "";
  } else {
    fab.classList.remove("chef-fab-disabled");
    const iconEl = fab.querySelector(".chef-agent-fab-icon");
    // 优先显示默认厨师头像；默认厨师未启用时显示自定义厨师头像
    const displayChef = defaultEnabled ? defaultChef : enabledChefs[0];
    if (displayChef.avatar) {
      iconEl.innerHTML = `<img src="${displayChef.avatar}" class="chef-fab-avatar-img" />`;
    } else {
      iconEl.textContent = displayChef.isDefault ? "👨‍🍳" : "🧑‍🍳";
    }
    // FAB背景色跟随厨师颜色
    const color = displayChef.color || "var(--carrot)";
    fab.style.background = color;
    // 将hex颜色转为半透明rgba用于阴影
    if (color.startsWith("#") && color.length === 7) {
      const r = parseInt(color.slice(1,3), 16);
      const g = parseInt(color.slice(3,5), 16);
      const b = parseInt(color.slice(5,7), 16);
      fab.style.boxShadow = `0 4px 16px rgba(${r},${g},${b},0.4)`;
    }
  }
}

// ============================================
// Toast
// ============================================
function showToast(msg) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// ============================================
// 过期时间修改弹窗
// ============================================
function openExpiryModal(index) {
  editingIngredientIndex = index;
  const item = fridge[index];
  editingIngredientName = item.name;

  const s = getExpiryStatus(item.name, item.addedAt);
  const daysLeft = Math.max(0, Math.ceil(s.daysLeft));
  const shelfLife = s.shelfLife;

  document.getElementById("expiryEditInfo").innerHTML = `
    <div class="expiry-edit-name">${item.name}</div>
    <div class="expiry-edit-current">
      当前：剩余 ${daysLeft} 天（保质期 ${shelfLife} 天）
    </div>
  `;

  document.getElementById("expiryDaysInput").value = Math.max(1, daysLeft);
  document.getElementById("expiryEditModal").classList.remove("hidden");

  // 重置快速选择按钮状态
  document.querySelectorAll(".expiry-preset-btn").forEach(btn => btn.classList.remove("selected"));
}

function closeExpiryModal() {
  document.getElementById("expiryEditModal").classList.add("hidden");
  editingIngredientIndex = -1;
  editingIngredientName = "";
}

function setExpiryDays(days) {
  document.getElementById("expiryDaysInput").value = days;

  // 高亮选中的按钮
  document.querySelectorAll(".expiry-preset-btn").forEach(btn => {
    btn.classList.toggle("selected", parseInt(btn.textContent) === days);
  });
}

function confirmExpiryChange() {
  const days = parseInt(document.getElementById("expiryDaysInput").value);
  if (days < 1 || days > 365 || isNaN(days)) {
    showToast("请输入 1-365 之间的天数");
    return;
  }

  // 重新计算 addedAt，让剩余保质期为指定天数
  const s = getExpiryStatus(fridge[editingIngredientIndex].name, fridge[editingIngredientIndex].addedAt);
  const elapsed = s.shelfLife - days; // 已经过去的天数
  const newAddedAt = Date.now() / 1000 - elapsed * 86400;

  fridge[editingIngredientIndex].addedAt = newAddedAt;
  saveFridge();

  closeExpiryModal();
  renderPage("home");
  showToast(`已将 ${editingIngredientName} 保质期设为 ${days} 天`);
}

// ============================================
// 长按处理
// ============================================

// 长按视觉反馈元素
let longPressIndicator = null;

function showLongPressIndicator(element) {
  if (!longPressIndicator) {
    longPressIndicator = document.createElement("div");
    longPressIndicator.className = "long-press-indicator";
    document.body.appendChild(longPressIndicator);
  }

  const rect = element.getBoundingClientRect();
  longPressIndicator.style.left = rect.left + rect.width / 2 + "px";
  longPressIndicator.style.top = rect.top + rect.height / 2 + "px";
  longPressIndicator.classList.add("active");
}

function hideLongPressIndicator() {
  if (longPressIndicator) {
    longPressIndicator.classList.remove("active");
  }
}

function handleLongPress(index) {
  hideLongPressIndicator();
  // 尝试震动反馈
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }
  openExpiryModal(index);
}

function handleTouchStart(index, event) {
  // 跳过删除按钮
  if (event.target.classList.contains("ingredient-delete")) {
    return;
  }

  event.preventDefault();

  // 清除之前的计时器
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }

  longPressTarget = index;
  const element = event.currentTarget;
  showLongPressIndicator(element);

  longPressTimer = setTimeout(() => {
    handleLongPress(index);
    longPressTimer = null;
    longPressTarget = null;
  }, LONG_PRESS_DURATION);
}

function handleTouchEnd(event) {
  hideLongPressIndicator();
  // 短按：长按计时器还在（说明未触发长按）→ 打开食材详情
  if (longPressTimer && longPressTarget !== null && longPressTarget !== undefined) {
    const targetIdx = longPressTarget;
    clearTimeout(longPressTimer);
    longPressTimer = null;
    longPressTarget = null;
    openIngredientDetail(targetIdx);
    return;
  }
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
  longPressTarget = null;
}

function handleTouchMove(event) {
  // 如果手指滑动了，取消长按
  if (longPressTimer) {
    const touch = event.touches[0];
    if (touch) {
      const element = event.currentTarget;
      const rect = element.getBoundingClientRect();
      const distance = Math.sqrt(
        Math.pow(touch.clientX - (rect.left + rect.width / 2), 2) +
        Math.pow(touch.clientY - (rect.top + rect.height / 2), 2)
      );
      // 移动超过 10px 取消
      if (distance > 10) {
        hideLongPressIndicator();
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }
  }
}

// 鼠标长按支持（桌面端）
let mouseDownTime = 0;

function handleMouseDown(index, event) {
  // 跳过删除按钮
  if (event.target.classList.contains("ingredient-delete")) {
    return;
  }

  event.preventDefault();
  mouseDownTime = Date.now();

  // 清除之前的计时器
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }

  longPressTarget = index;
  const element = event.currentTarget;
  showLongPressIndicator(element);

  longPressTimer = setTimeout(() => {
    handleLongPress(index);
    longPressTimer = null;
    longPressTarget = null;
    mouseDownTime = 0;
  }, LONG_PRESS_DURATION);
}

function handleMouseUp(event) {
  hideLongPressIndicator();
  // 短按：长按计时器还在（说明未触发长按）→ 打开食材详情
  if (longPressTimer && longPressTarget !== null && longPressTarget !== undefined) {
    const targetIdx = longPressTarget;
    clearTimeout(longPressTimer);
    longPressTimer = null;
    longPressTarget = null;
    mouseDownTime = 0;
    openIngredientDetail(targetIdx);
    return;
  }
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
  longPressTarget = null;
  mouseDownTime = 0;
}

function handleMouseLeave(event) {
  hideLongPressIndicator();
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
  longPressTarget = null;
  mouseDownTime = 0;
}

// ============================================
// 厨师 Agent 浮动图标
// ============================================
function initChefAgentFab() {
  const fab = document.getElementById("chefAgentFab");
  if (!fab) return;

  let isDragging = false;
  let startX = 0, startY = 0;
  let fabX = 0, fabY = 0;
  let hasMoved = false;

  // 触摸事件 — 仅用于拖拽
  fab.addEventListener("touchstart", (e) => {
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    const rect = fab.getBoundingClientRect();
    fabX = rect.left;
    fabY = rect.top;
    isDragging = true;
    hasMoved = false;
  }, { passive: true });

  fab.addEventListener("touchmove", (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    // 仅在确认是拖拽（移动超过阈值）时才 preventDefault 和更新位置
    // 这样点击（微小移动）不会阻止后续 click 事件的触发
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      hasMoved = true;
      e.preventDefault();
      let newX = fabX + dx;
      let newY = fabY + dy;
      const fabSize = 56;
      newX = Math.max(0, Math.min(window.innerWidth - fabSize, newX));
      newY = Math.max(0, Math.min(window.innerHeight - fabSize, newY));
      fab.style.left = newX + "px";
      fab.style.top = newY + "px";
      fab.style.right = "auto";
      fab.style.bottom = "auto";
      updateChefHomeMenuPosition();
    }
  }, { passive: false });

  fab.addEventListener("touchend", () => {
    isDragging = false;
    // 点击处理统一交给 click 事件
  });

  // 鼠标事件 — 仅用于拖拽
  fab.addEventListener("mousedown", (e) => {
    startX = e.clientX;
    startY = e.clientY;
    const rect = fab.getBoundingClientRect();
    fabX = rect.left;
    fabY = rect.top;
    isDragging = true;
    hasMoved = false;
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) hasMoved = true;

    let newX = fabX + dx;
    let newY = fabY + dy;
    const fabSize = 56;
    newX = Math.max(0, Math.min(window.innerWidth - fabSize, newX));
    newY = Math.max(0, Math.min(window.innerHeight - fabSize, newY));
    fab.style.left = newX + "px";
    fab.style.top = newY + "px";
    fab.style.right = "auto";
    fab.style.bottom = "auto";
    updateChefHomeMenuPosition();
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
  });

  // 统一 click 事件处理（桌面和手机端都会触发）
  fab.addEventListener("click", () => {
    if (hasMoved) {
      hasMoved = false; // 拖拽后重置，不触发点击
      return;
    }
    handleChefAgentClick();
  });
}

function handleChefAgentClick() {
  const fab = document.getElementById("chefAgentFab");
  if (!fab) return;
  FrontendLogger.info("chef", "大厨按钮点击", { page: currentPage, isRecipePage: ChefAgent.isOnRecipePage() });

  // 检查是否有启用的厨师
  const enabledChefs = ChefManager.getEnabled();
  if (enabledChefs.length === 0) {
    showChefAgentToast("当前大厨功能还未启用");
    return;
  }

  // 菜谱详情页 → 显示大厨菜单（大厨笔记 / 大厨总结）
  if (ChefAgent.isOnRecipePage()) {
    // 如果笔记模式已开启，点击则关闭笔记恢复原样
    if (ChefGuides.isNotesActive()) {
      ChefGuides.clearNotesFromPage();
      updateChefFabState();
      showChefAgentToast("已关闭大厨笔记");
      return;
    }
    // 如果总结面板已打开，点击则关闭
    const panel = document.getElementById("chefAgentPanel");
    if (panel && !panel.classList.contains("hidden")) {
      closeChefAgentPanel();
      updateChefFabState();
      return;
    }
    // 否则弹出双选项菜单
    showChefRecipeMenu();
    return;
  }

  // 冰箱首页 → 弹出大厨菜单（生成菜谱 / 清空冰箱）
  // 注意：食材灵感滑动页 currentPage 仍为 home，需通过 DOM 排除
  if (currentPage === "home" && !document.querySelector(".swipe-page")) {
    showChefHomeMenu();
    return;
  }

  // 食材灵感推荐页面 → 弹出大厨推荐菜单（两个菜组合 / AI推荐）
  if (currentPage === "home" && document.querySelector(".swipe-page")) {
    showChefRecommendMenu();
    return;
  }

  // 发现页面 → 随机抽一道菜
  if (currentPage === "discover") {
    pickRandomRecipe();
    return;
  }

  // 日历时间线 → 大厨点评
  if (currentPage === "calendar" && calendarMode === "timeline") {
    analyzeCalendarWithAI();
    return;
  }

  // 日历模式 → 提示本月做菜天数
  if (currentPage === "calendar" && calendarMode === "calendar") {
    const cookedCount = getCookedDaysThisMonth();
    showChefAgentToast(`本月做菜 ${cookedCount} 天`);
    return;
  }

  showChefAgentToast("此页面暂不支持大厨功能");
}

// 冰箱首页大厨弹窗：生成菜谱 / 清空冰箱（从FAB向上展开圆形按钮）
function showChefHomeMenu() {
  // 已存在则不重复创建
  if (document.getElementById("chefHomeMenu")) return;
  FrontendLogger.info("chef", "弹出冰箱页大厨菜单");
  const fab = document.getElementById("chefAgentFab");
  if (!fab) return;
  // 大厨emoji变成思考
  fab.querySelector(".chef-agent-fab-icon").textContent = "🤔";

  const popup = document.createElement("div");
  popup.id = "chefHomeMenu";
  popup.className = "chef-home-menu";
  popup.innerHTML = `
    <button class="chef-home-menu-circle" style="--delay: 0.1s" onclick="closeChefHomeMenu(); setTimeout(generateMenu, 250);" title="生成菜谱">
      <span>🍳</span>
    </button>
    <button class="chef-home-menu-circle chef-home-menu-danger" style="--delay: 0.2s" onclick="closeChefHomeMenu(); setTimeout(confirmClearFridge, 250);" title="清空冰箱">
      <span>🗑️</span>
    </button>
  `;
  document.body.appendChild(popup);
  updateChefHomeMenuPosition();

  // 点击页面其他地方关闭（下一帧添加，避免当前click事件触发）
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.addEventListener("click", closeChefHomeMenuOutside, true);
      document.addEventListener("touchstart", closeChefHomeMenuOutside, true);
    });
  });
}

// 根据FAB位置更新弹窗位置（拖拽FAB时同步调用）
function updateChefHomeMenuPosition() {
  const popup = document.getElementById("chefHomeMenu");
  const fab = document.getElementById("chefAgentFab");
  if (!popup || !fab) return;
  const fabRect = fab.getBoundingClientRect();
  const fabCenterX = fabRect.left + fabRect.width / 2;
  popup.style.left = fabCenterX + "px";
  popup.style.bottom = (window.innerHeight - fabRect.top) + "px";
}

function closeChefHomeMenuOutside(e) {
  const popup = document.getElementById("chefHomeMenu");
  if (!popup) return;
  if (popup.contains(e.target)) return;
  closeChefHomeMenu();
}

function closeChefHomeMenu() {
  document.removeEventListener("click", closeChefHomeMenuOutside, true);
  document.removeEventListener("touchstart", closeChefHomeMenuOutside, true);
  const popup = document.getElementById("chefHomeMenu");
  const fab = document.getElementById("chefAgentFab");
  if (!popup) return;
  // 退出动画：逆向气泡下降
  const circles = popup.querySelectorAll(".chef-home-menu-circle");
  circles.forEach((c, i) => {
    c.style.animation = "chefBubbleDown 0.25s ease-in forwards";
    c.style.animationDelay = `${0.15 - i * 0.07}s`;
  });
  // 动画结束后移除
  setTimeout(() => {
    popup.remove();
    if (fab) updateChefFabState();
  }, 300);
}

// 推荐页大厨弹窗：两个菜组合 / AI推荐
function showChefRecommendMenu() {
  // 已存在则不重复创建
  if (document.getElementById("chefRecommendMenu")) return;
  FrontendLogger.info("chef", "弹出推荐页大厨菜单");
  const fab = document.getElementById("chefAgentFab");
  if (!fab) return;
  // 大厨emoji变成思考
  fab.querySelector(".chef-agent-fab-icon").textContent = "🤔";

  const popup = document.createElement("div");
  popup.id = "chefRecommendMenu";
  popup.className = "chef-home-menu";
  popup.innerHTML = `
    <button class="chef-home-menu-circle" style="--delay: 0.05s" onclick="event.stopPropagation();closeChefRecommendMenu(true);showShoppingList();" title="购物清单">
      <span>🛒</span>
    </button>
    <button class="chef-home-menu-circle" style="--delay: 0.12s" onclick="event.stopPropagation();closeChefRecommendMenu(true);switchToDualMenu();" title="两个菜组合">
      <span>🍱</span>
    </button>
    <button class="chef-home-menu-circle" style="--delay: 0.2s" onclick="event.stopPropagation();closeChefRecommendMenu(true);generateAIRecommendedMenu();" title="AI推荐">
      <span>✨</span>
    </button>
  `;
  document.body.appendChild(popup);
  updateChefRecommendMenuPosition();

  // 点击页面其他地方关闭（下一帧添加，避免当前click事件触发）
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.addEventListener("click", closeChefRecommendMenuOutside, true);
      document.addEventListener("touchstart", closeChefRecommendMenuOutside, true);
    });
  });
}

// 根据FAB位置更新弹窗位置
function updateChefRecommendMenuPosition() {
  const popup = document.getElementById("chefRecommendMenu");
  const fab = document.getElementById("chefAgentFab");
  if (!popup || !fab) return;
  const fabRect = fab.getBoundingClientRect();
  const fabCenterX = fabRect.left + fabRect.width / 2;
  popup.style.left = fabCenterX + "px";
  popup.style.bottom = (window.innerHeight - fabRect.top) + "px";
}

function closeChefRecommendMenuOutside(e) {
  const popup = document.getElementById("chefRecommendMenu");
  if (!popup) return;
  if (popup.contains(e.target)) return;
  closeChefRecommendMenu();
}

function closeChefRecommendMenu(immediate = false) {
  document.removeEventListener("click", closeChefRecommendMenuOutside, true);
  document.removeEventListener("touchstart", closeChefRecommendMenuOutside, true);
  const popup = document.getElementById("chefRecommendMenu");
  const fab = document.getElementById("chefAgentFab");
  if (!popup) return;
  // 立即关闭（点击按钮时使用，不需要退出动画）
  if (immediate) {
    popup.remove();
    if (fab) updateChefFabState();
    return;
  }
  // 退出动画：逆向气泡下降
  const circles = popup.querySelectorAll(".chef-home-menu-circle");
  circles.forEach((c, i) => {
    c.style.animation = "chefBubbleDown 0.25s ease-in forwards";
    c.style.animationDelay = `${0.15 - i * 0.07}s`;
  });
  // 动画结束后移除
  setTimeout(() => {
    popup.remove();
    if (fab) updateChefFabState();
  }, 300);
}

// 购物清单（当前推荐组合中缺失的食材汇总）
function showShoppingList() {
  try {
    const combo = searchResults[swipeIndex];
    if (!combo || !combo.recipes || combo.recipes.length === 0) {
      showToast("当前没有推荐菜谱，请先生成推荐");
      return;
    }

    // 汇总当前推荐组合中所有缺失的食材（去重，包括调料）
    const missingMap = new Map(); // name -> {from: [菜名列表], checked: false}
    combo.recipes.forEach(rec => {
      const recipe = rec.recipe || rec;
      // 合并所有缺失食材：missingCore(核心食材) + missing(所有食材，含调料)
      const allMissing = new Set();
      (rec.missingCore || []).forEach(i => { if (typeof i === 'string') allMissing.add(i); });
      (rec.missing || []).forEach(i => { if (typeof i === 'string') allMissing.add(i); });
      // 不过滤基础调料，全部显示
      allMissing.forEach(ing => {
        if (!missingMap.has(ing)) {
          missingMap.set(ing, { from: [], checked: false });
        }
        const title = recipe.title || "这道菜";
        if (!missingMap.get(ing).from.includes(title)) {
          missingMap.get(ing).from.push(title);
        }
      });
    });

    const missingList = Array.from(missingMap.entries()).map(([name, data]) => ({
      name,
      from: data.from,
      checked: false
    }));

    // 保存勾选状态到window，方便后续更新
    window._shoppingListItems = missingList;

    const dishNames = combo.recipes.map(r => (r.recipe || r).title).join(" + ");

    const app = document.getElementById("app");
    document.getElementById("bottomNav").style.display = "none";

    app.innerHTML = `
      <div class="page shopping-list-page">
        <div class="swipe-header">
          <button class="swipe-header-back" onclick="closeShoppingList()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
            返回
          </button>
          <div class="swipe-header-title">🛒 购物清单</div>
          <div style="width:50px"></div>
        </div>

        <div class="shopping-list-dish-info">
          <div class="shopping-list-dish-name">${dishNames}</div>
          <div class="shopping-list-count">共需购买 <strong>${missingList.length}</strong> 种食材</div>
        </div>

        ${missingList.length === 0 ? `
          <div class="shopping-list-empty">
            <div style="font-size:48px;margin-bottom:12px">🎉</div>
            <div style="font-size:16px;font-weight:600;color:var(--text)">食材已备齐！</div>
            <div style="font-size:13px;color:var(--text-muted);margin-top:6px">冰箱里的食材足够做这道菜了</div>
          </div>
        ` : `
          <div class="shopping-list-container" id="shoppingListContainer">
            ${missingList.map((item, idx) => `
              <div class="shopping-item ${item.checked ? 'checked' : ''}" data-idx="${idx}" onclick="toggleShoppingItem(${idx})">
                <div class="shopping-item-checkbox">
                  ${item.checked ? '✅' : '⬜'}
                </div>
                <div class="shopping-item-content">
                  <div class="shopping-item-name">${item.name}</div>
                  <div class="shopping-item-from">用于：${item.from.join("、")}</div>
                </div>
              </div>
            `).join("")}
          </div>

          <div class="shopping-list-actions">
            <button class="shopping-btn shopping-btn-copy" onclick="copyShoppingList()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              复制清单
            </button>
            <button class="shopping-btn shopping-btn-clear" onclick="clearShoppingChecked()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              清除已买
            </button>
          </div>
        `}
      </div>
    `;
  } catch (e) {
    console.error("购物清单出错：", e);
    showToast("购物清单加载失败：" + e.message);
  }
}

// 切换购物清单项勾选状态
function toggleShoppingItem(idx) {
  if (!window._shoppingListItems) return;
  window._shoppingListItems[idx].checked = !window._shoppingListItems[idx].checked;
  const el = document.querySelector(`.shopping-item[data-idx="${idx}"]`);
  if (el) {
    el.classList.toggle("checked", window._shoppingListItems[idx].checked);
    const checkbox = el.querySelector(".shopping-item-checkbox");
    if (checkbox) checkbox.textContent = window._shoppingListItems[idx].checked ? '✅' : '⬜';
  }
}

// 复制购物清单到剪贴板
function copyShoppingList() {
  if (!window._shoppingListItems || window._shoppingListItems.length === 0) return;
  const unchecked = window._shoppingListItems.filter(i => !i.checked).map(i => `□ ${i.name}`).join("\n");
  const checked = window._shoppingListItems.filter(i => i.checked).map(i => `☑ ${i.name}`).join("\n");
  let text = "🛒 购物清单\n\n";
  if (unchecked) text += "待购买：\n" + unchecked + "\n\n";
  if (checked) text += "已购买：\n" + checked;
  text = text.trim();

  navigator.clipboard.writeText(text).then(() => {
    showToast("清单已复制到剪贴板");
  }).catch(() => {
    // Fallback: 创建临时textarea
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    showToast("清单已复制");
  });
}

// 清除已勾选（已买）的项目
function clearShoppingChecked() {
  if (!window._shoppingListItems) return;
  window._shoppingListItems = window._shoppingListItems.filter(i => !i.checked);
  // 重新渲染
  const container = document.getElementById("shoppingListContainer");
  const countEl = document.querySelector(".shopping-list-count strong");
  if (countEl) countEl.textContent = window._shoppingListItems.length;

  if (window._shoppingListItems.length === 0) {
    // 全部买完了，显示空状态
    const page = document.querySelector(".shopping-list-page");
    if (page) {
      const container = page.querySelector(".shopping-list-container");
      const actions = page.querySelector(".shopping-list-actions");
      if (container) container.remove();
      if (actions) actions.remove();
      const emptyHtml = `
        <div class="shopping-list-empty">
          <div style="font-size:48px;margin-bottom:12px">🎉</div>
          <div style="font-size:16px;font-weight:600;color:var(--text)">全部买齐啦！</div>
          <div style="font-size:13px;color:var(--text-muted);margin-top:6px">可以开始做饭了~</div>
        </div>
      `;
      page.querySelector(".shopping-list-dish-info").insertAdjacentHTML("afterend", emptyHtml);
    }
  } else if (container) {
    container.innerHTML = window._shoppingListItems.map((item, idx) => `
      <div class="shopping-item ${item.checked ? 'checked' : ''}" data-idx="${idx}" onclick="toggleShoppingItem(${idx})">
        <div class="shopping-item-checkbox">
          ${item.checked ? '✅' : '⬜'}
        </div>
        <div class="shopping-item-content">
          <div class="shopping-item-name">${item.name}</div>
          <div class="shopping-item-from">用于：${item.from.join("、")}</div>
        </div>
      </div>
    `).join("");
  }
  showToast("已清除已购买项");
}

// 关闭购物清单，返回推荐页
function closeShoppingList() {
  window._shoppingListItems = null;
  renderSwipePage();
}

// 切换双菜/单菜模式（再点击一次切回单菜）
function switchToDualMenu() {
  if (!allSearchResults || allSearchResults.length === 0) {
    generateMenu();
    return;
  }
  // 判断当前是否已是双菜模式
  const isDualNow = searchResults.length > 0 && searchResults[0].recipes.length > 1;
  if (isDualNow) {
    // 切回单菜模式
    searchResults = buildMenuCombinations(allSearchResults);
    showToast("已切换回单菜推荐");
  } else {
    // 切换到双菜模式
    searchResults = buildDualMenuCombinations(allSearchResults);
    showToast("已切换到双菜组合模式");
  }
  selectedTags = [];
  swipeIndex = 0;
  renderSwipePage();
}

function confirmClearFridge() {
  if (fridge.length === 0) {
    showChefAgentToast("冰箱已经是空的");
    return;
  }
  if (confirm("确定清空冰箱所有食材？")) {
    FrontendLogger.info("fridge", "清空冰箱", { count: fridge.length });
    fridge = [];
    saveFridge();
    renderPage("home");
    showToast("冰箱已清空");
  }
}

// 菜谱页大厨菜单：大厨笔记 / 大厨总结（始终显示，不区分厨师）
function showChefRecipeMenu() {
  if (document.getElementById("chefRecipeMenu")) return;
  const fab = document.getElementById("chefAgentFab");
  if (!fab) return;

  FrontendLogger.info("chef", "弹出菜谱页大厨菜单");
  // 始终显示大厨笔记 / 大厨总结
  fab.querySelector(".chef-agent-fab-icon").textContent = "🤔";
  const popup = document.createElement("div");
  popup.id = "chefRecipeMenu";
  popup.className = "chef-recipe-menu";
  popup.innerHTML = `
    <button class="chef-recipe-menu-btn" style="--delay: 0.08s" onclick="closeChefRecipeMenu(); setTimeout(activateChefNotes, 250);">
      <span class="chef-recipe-menu-icon">📝</span>
      <span class="chef-recipe-menu-label">大厨笔记</span>
    </button>
    <button class="chef-recipe-menu-btn" style="--delay: 0.18s" onclick="closeChefRecipeMenu(); setTimeout(activateChefSummary, 250);">
      <span class="chef-recipe-menu-icon">📌</span>
      <span class="chef-recipe-menu-label">大厨总结</span>
    </button>
  `;
  document.body.appendChild(popup);
  updateChefRecipeMenuPosition();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.addEventListener("click", closeChefRecipeMenuOutside, true);
      document.addEventListener("touchstart", closeChefRecipeMenuOutside, true);
    });
  });
}

function updateChefRecipeMenuPosition() {
  const popup = document.getElementById("chefRecipeMenu");
  const fab = document.getElementById("chefAgentFab");
  if (!popup || !fab) return;
  const rect = fab.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  popup.style.left = centerX + "px";
  popup.style.bottom = (window.innerHeight - rect.top) + "px";
}

function closeChefRecipeMenuOutside(e) {
  const popup = document.getElementById("chefRecipeMenu");
  if (!popup) return;
  if (popup.contains(e.target)) return;
  closeChefRecipeMenu();
}

function closeChefRecipeMenu() {
  document.removeEventListener("click", closeChefRecipeMenuOutside, true);
  document.removeEventListener("touchstart", closeChefRecipeMenuOutside, true);
  const popup = document.getElementById("chefRecipeMenu");
  const fab = document.getElementById("chefAgentFab");
  if (!popup) return;
  const btns = popup.querySelectorAll(".chef-recipe-menu-btn");
  btns.forEach((b, i) => {
    b.style.animation = "chefBubbleDown 0.25s ease-in forwards";
    b.style.animationDelay = `${0.12 - i * 0.06}s`;
  });
  setTimeout(() => {
    popup.remove();
    if (fab && !ChefGuides.isNotesActive()) {
      const p = document.getElementById("chefAgentPanel");
      if (!p || p.classList.contains("hidden"))
        updateChefFabState();
    }
  }, 300);
}

// 激活「大厨笔记」：在原菜谱步骤上直接注入红线+绿色批注
function activateChefNotes() {
  FrontendLogger.info("chef", "激活大厨笔记");
  const fab = document.getElementById("chefAgentFab");
  if (fab) {
    fab.classList.add("loading");
    fab.querySelector(".chef-agent-fab-icon").textContent = "🤔";
  }
  const recipe = ChefAgent.readCurrentRecipe();
  const title = recipe ? recipe.title : "";
  ChefGuides.injectNotesToPage(title).then((ok) => {
    if (fab) {
      fab.classList.remove("loading");
      if (ok) {
        fab.querySelector(".chef-agent-fab-icon").textContent = "📝";
      } else {
        updateChefFabState();
      }
    }
    if (!ok) showChefAgentToast("暂无可标注的笔记");
    else showChefAgentToast("大厨笔记已标注");
  }).catch(() => {
    if (fab) {
      fab.classList.remove("loading");
      updateChefFabState();
    }
    showChefAgentToast("笔记加载失败");
  });
}

// 激活「大厨总结」：弹窗显示通用技法
function activateChefSummary() {
  FrontendLogger.info("chef", "激活大厨总结");
  const fab = document.getElementById("chefAgentFab");
  if (fab) {
    fab.classList.add("loading");
    fab.querySelector(".chef-agent-fab-icon").textContent = "🤔";
  }
  const recipe = ChefAgent.readCurrentRecipe();
  const title = recipe ? recipe.title : "";
  ChefGuides.buildSummaryHTML(title).then((html) => {
    if (fab) {
      fab.classList.remove("loading");
      fab.querySelector(".chef-agent-fab-icon").textContent = "📌";
    }
    const panel = document.getElementById("chefAgentPanel");
    const content = document.getElementById("chefAgentPanelContent");
    content.innerHTML = html;
    panel.classList.remove("hidden");
  }).catch(() => {
    if (fab) {
      fab.classList.remove("loading");
      updateChefFabState();
    }
  });
}

function closeChefAgentPanel() {
  document.getElementById("chefAgentPanel").classList.add("hidden");
  const fab = document.getElementById("chefAgentFab");
  if (fab && !ChefGuides.isNotesActive()) {
    updateChefFabState();
  }
}

// ============================================
// 日历 AI 分析：大厨点评做菜记录
// ============================================

// 收集做菜统计数据
function collectCookingStats() {
  const history = getCookedHistory();
  const records = []; // 带菜谱详情的记录
  const methodDistribution = {}; // 技法分布
  const ingredientFreq = {}; // 食材频率
  const categoryDist = {}; // 分类分布
  const dateSet = new Set(); // 做菜日期集合
  let totalSessions = 0;
  let difficultySum = 0;
  let maxDifficulty = 0;
  let stepSum = 0; // 累计步骤数（用于计算平均步骤数）

  history.forEach((record) => {
    const recipe = allRecipes.find((r) => r.id === record.recipeId);
    if (!recipe) return;

    // 根据 count 展开为多次做菜会话
    const sessions = Math.max(1, record.count || 1);
    totalSessions += sessions;

    // 累计难度（按会话次数加权）
    const difficulty = recipe.difficulty || 1;
    difficultySum += difficulty * sessions;
    if (difficulty > maxDifficulty) maxDifficulty = difficulty;

    // 累计步骤数（按会话次数加权）
    const stepCount = (recipe.steps && recipe.steps.length) || 0;
    stepSum += stepCount * sessions;

    // 统计技法分布
    const methodLabel = recipe.methodLabel || "未知";
    methodDistribution[methodLabel] = (methodDistribution[methodLabel] || 0) + sessions;

    // 统计食材频率（requiredIngredients + coreIngredients，同一次会话内去重）
    const ingredients = [
      ...(recipe.requiredIngredients || []),
      ...(recipe.coreIngredients || []),
    ];
    const uniqueIngredients = [...new Set(ingredients)];
    uniqueIngredients.forEach((ing) => {
      ingredientFreq[ing] = (ingredientFreq[ing] || 0) + sessions;
    });

    // 统计分类分布
    const category = recipe.category || "unknown";
    categoryDist[category] = (categoryDist[category] || 0) + sessions;

    // 统计做菜日期
    const d = new Date(record.timestamp);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    dateSet.add(dateKey);

    records.push({
      ...record,
      recipe,
      sessions,
      stepCount,
    });
  });

  const uniqueDishes = records.length;
  const cookingDays = dateSet.size;
  const avgDifficulty = totalSessions > 0 ? difficultySum / totalSessions : 0;
  const avgSteps = totalSessions > 0 ? stepSum / totalSessions : 0;
  const repeatRate = totalSessions > 0 ? (totalSessions - uniqueDishes) / totalSessions : 0;
  const uniqueMethods = Object.keys(methodDistribution).length;

  // 食材频率排序，取前10
  const topIngredients = Object.entries(ingredientFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  // 最近30天的记录
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const recentRecords = records.filter((r) => r.timestamp >= thirtyDaysAgo);

  return {
    totalSessions,
    uniqueDishes,
    cookingDays,
    avgDifficulty,
    maxDifficulty,
    methodDistribution,
    uniqueMethods,
    ingredientFreq,
    categoryDist,
    repeatRate,
    topIngredients,
    recentRecords,
    records,
    avgSteps,
  };
}

// 计算雷达图评分（5个维度，0-5分，保留1位小数）
function computeRadarScores(stats) {
  const { totalSessions, uniqueDishes, avgDifficulty, maxDifficulty, methodDistribution, uniqueMethods, categoryDist, repeatRate, records } = stats;

  // 平均每道菜的食材数
  let totalIngredients = 0;
  records.forEach((r) => {
    const ingredients = [
      ...(r.recipe.requiredIngredients || []),
      ...(r.recipe.coreIngredients || []),
    ];
    totalIngredients += [...new Set(ingredients)].length;
  });
  const avgIngredients = uniqueDishes > 0 ? totalIngredients / uniqueDishes : 0;

  // 类别数对应的多样性加分
  const categoryCount = Object.keys(categoryDist).length;
  const varietyBonus = categoryCount <= 1 ? 0 : categoryCount === 2 ? 1 : 2;

  // 食材处理：平均食材数 + 类别多样性
  let ingredientProcessing = Math.min(avgIngredients / 6 * 2.5 + varietyBonus, 5);
  // 调味：技法多样性 + 菜谱丰富度
  let seasoning = Math.min(uniqueMethods / 4 * 2 + uniqueDishes / 15 * 1.5, 5);
  // 火候：需要精确火候控制的技法（炒、炸、煎、烧、烤）次数 + 平均难度
  const heatMethods = ["炒", "炸", "煎", "烧", "烤"];
  let heatCount = 0;
  Object.entries(methodDistribution).forEach(([label, count]) => {
    if (heatMethods.includes(label)) heatCount += count;
  });
  let heatControl = Math.min(heatCount / 4 * 2 + avgDifficulty / 3, 5);
  // 做菜技巧：技法多样性 + 平均难度 + 最高难度
  let techniques = Math.min(uniqueMethods / 3 * 1.5 + avgDifficulty / 3 + maxDifficulty / 5, 5);
  // 稳定性：重复率 + 总次数
  let stability = Math.min(repeatRate * 3 + Math.min(totalSessions, 20) / 20 * 2, 5);

  // 最小0.5，保留1位小数
  const clamp = (v) => Math.max(0.5, Math.round(v * 10) / 10);

  return {
    ingredientProcessing: clamp(ingredientProcessing),
    seasoning: clamp(seasoning),
    heatControl: clamp(heatControl),
    techniques: clamp(techniques),
    stability: clamp(stability),
  };
}

// 判断做菜倾向类型
function determineTendency(stats) {
  const { repeatRate, avgDifficulty, uniqueMethods, avgSteps, uniqueDishes } = stats;

  if (repeatRate > 0.4) {
    return { type: "稳定型", icon: "🔄", description: "偏爱熟悉的味道，反复打磨拿手菜" };
  }
  if (avgDifficulty >= 3.5) {
    return { type: "挑战型", icon: "🏔️", description: "勇于挑战高难度菜谱，追求技艺突破" };
  }
  if (uniqueMethods >= 6) {
    return { type: "探索型", icon: "🧭", description: "喜欢尝试不同技法，探索多元风味" };
  }
  if (avgSteps < 6 && uniqueDishes >= 3) {
    return { type: "效率型", icon: "⚡", description: "追求高效烹饪，偏爱简洁菜谱" };
  }
  return { type: "消耗型", icon: "♻️", description: "灵活利用现有食材，实用为主" };
}

// 在 canvas 上绘制 JoJo 风格五角星雷达图
function renderRadarChart(canvas, scores) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const size = 360;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + "px";
  canvas.style.height = size + "px";
  ctx.scale(dpr, dpr);

  const center = { x: size / 2, y: size / 2 };
  const maxRadius = 95;
  const labels = ["食材处理", "调味", "火候", "做菜技巧", "稳定性"];
  const keys = ["ingredientProcessing", "seasoning", "heatControl", "techniques", "stability"];
  const values = keys.map((k) => scores[k] || 0);

  // 5个轴的角度，从 -90°（正上方）开始，顺时针每个 72°
  const angles = [];
  for (let i = 0; i < 5; i++) {
    angles.push((-90 + i * 72) * Math.PI / 180);
  }

  // 计算指定角度和半径的顶点坐标
  const pointAt = (angle, radius) => ({
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius,
  });

  // 1. 深色圆形背景（半径要覆盖所有标签文字）
  const bgRadius = maxRadius + 70;
  ctx.beginPath();
  ctx.arc(center.x, center.y, bgRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#1a1a2e";
  ctx.fill();

  // 2. 5层同心五边形网格（深色线）
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 1;
  for (let layer = 1; layer <= 5; layer++) {
    const r = (maxRadius / 5) * layer;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const p = pointAt(angles[i], r);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // 3. 从中心到各顶点的轴线（深色线）
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const p = pointAt(angles[i], maxRadius);
    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  // 4. 用户分数的多边形（金黄色半透明填充 + 粗边线）
  ctx.fillStyle = "rgba(255, 215, 0, 0.3)";
  ctx.strokeStyle = "#FFD700";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const r = (values[i] / 5) * maxRadius;
    const p = pointAt(angles[i], r);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 5. 各顶点的圆点（金黄色实心圆，带光晕效果）
  for (let i = 0; i < 5; i++) {
    const r = (values[i] / 5) * maxRadius;
    const p = pointAt(angles[i], r);
    // 光晕
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 12);
    gradient.addColorStop(0, "rgba(255, 215, 0, 0.8)");
    gradient.addColorStop(1, "rgba(255, 215, 0, 0)");
    ctx.beginPath();
    ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    // 实心圆点（半径4px）
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#FFD700";
    ctx.fill();
  }

  // 6. 各轴标签文字（分两行：标签名 + 分数，居中对齐避免截断）
  const labelRadius = maxRadius + 25;
  for (let i = 0; i < 5; i++) {
    const p = pointAt(angles[i], labelRadius);
    const labelText = labels[i];
    const scoreText = values[i].toFixed(1);

    // 判断水平对齐：左右两侧用对应方向对齐，顶部和底部居中
    const dx = Math.cos(angles[i]);
    let align;
    if (dx > 0.2) align = "left";
    else if (dx < -0.2) align = "right";
    else align = "center";
    ctx.textAlign = align;
    ctx.textBaseline = "middle";

    // 水平偏移：让左右标签向内收一点
    let offsetX = 0;
    if (align === "left") offsetX = 2;
    if (align === "right") offsetX = -2;

    // 第一行：标签名称（白色 14px）
    ctx.font = "14px -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.fillText(labelText, p.x + offsetX, p.y - 9);

    // 第二行：分数（金黄色 13px，加粗）
    ctx.font = "bold 13px -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif";
    ctx.fillStyle = "#FFD700";
    ctx.fillText(scoreText, p.x + offsetX, p.y + 9);
  }
}

async function analyzeCalendarWithAI() {
  FrontendLogger.info("calendar", "日历AI分析");
  const model = getAIModelByUse("calendar");
  if (!model) {
    showToast("请先在AI模型管理中设置「日历分析」模型");
    return;
  }

  const records = getCookedHistory();
  if (records.length === 0) {
    showToast("还没有做菜记录");
    return;
  }

  // 收集做菜统计数据
  const stats = collectCookingStats();
  // 计算雷达图评分
  const scores = computeRadarScores(stats);
  // 判断做菜倾向
  const tendency = determineTendency(stats);

  // 构造技法分布列表
  const methodList = Object.entries(stats.methodDistribution)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => `- ${label}：${count} 次`)
    .join("\n");

  // 构造食材偏好列表
  const ingredientList = stats.topIngredients
    .map((item) => `- ${item.name}：${item.count} 次`)
    .join("\n");

  // 构造最近做菜记录（最近10条）
  const recentList = stats.records.slice(0, 10).map((r) => {
    const d = new Date(r.timestamp);
    const dateStr = `${d.getMonth() + 1}月${d.getDate()}日`;
    return `- ${dateStr}：${r.title}（${r.recipe.methodLabel || "未知"}，难度${r.recipe.difficulty || 1}/5）${r.count > 1 ? `，做过${r.count}次` : ""}`;
  }).join("\n");

  const prompt = `以下是用户的做菜数据分析结果，请作为一位资深中餐大厨进行深入分析：

## 基础数据
- 总做菜次数：${stats.totalSessions} 次
- 独立菜谱数：${stats.uniqueDishes} 道
- 做菜天数：${stats.cookingDays} 天
- 平均菜谱难度：${stats.avgDifficulty.toFixed(1)}/5
- 最高难度：${stats.maxDifficulty}/5

## 技法分布
${methodList}

## 食材偏好（Top 10）
${ingredientList}

## 能力雷达评分（基于做菜数据计算）
- 食材处理：${scores.ingredientProcessing}/5
- 调味：${scores.seasoning}/5
- 火候：${scores.heatControl}/5
- 做菜技巧：${scores.techniques}/5
- 稳定性：${scores.stability}/5

## 最近做菜记录
${recentList}

请从以下三个方面给出分析（用中文，markdown格式，每个部分2-3句话即可）：

### 做菜水平
根据数据评估用户的做菜水平等级（新手/进阶/熟练/高手），说明评分依据，特别指出优势和待提升的维度。

### 做菜偏好
分析用户偏好的食材类型和口味特征，指出营养均衡方面的建议。

### 做菜倾向
判断用户的做菜倾向（${tendency.type}），分析其做菜习惯特点，给出针对性建议。`;

  // 显示加载状态
  const panel = document.getElementById("chefAgentPanel");
  const content = document.getElementById("chefAgentPanelContent");
  content.innerHTML = `
    <div class="chef-agent-header">
      <span class="chef-agent-emoji">👨‍🍳</span>
      <div>
        <div class="chef-agent-title">大厨点评</div>
        <div class="chef-agent-recipe">正在分析做菜记录...</div>
      </div>
    </div>
    <div class="chef-agent-loading">
      <div class="chef-agent-loading-spinner"></div>
      <div>AI 正在分析您的饮食记录</div>
    </div>
  `;
  panel.classList.remove("hidden");

  try {
    const result = await callAI(prompt, "calendar", "你是一位资深中餐大厨和美食顾问，擅长基于做菜数据分析用户的烹饪水平、偏好和倾向，并给出专业建议。请用简洁专业的中文回答，使用 markdown 格式。");
    content.innerHTML = `
      <div class="chef-agent-header">
        <span class="chef-agent-emoji">👨‍🍳</span>
        <div>
          <div class="chef-agent-title">大厨点评</div>
          <div class="chef-agent-recipe">基于 ${stats.records.length} 道做菜记录的分析</div>
        </div>
      </div>
      <div class="cooking-report">
        <div class="radar-section">
          <div class="radar-title">🍳 做菜能力雷达</div>
          <canvas id="radarCanvas" width="360" height="360"></canvas>
          <div class="tendency-badge">
            <span class="tendency-icon">${tendency.icon}</span>
            <span class="tendency-text">${tendency.type} · ${tendency.description}</span>
          </div>
        </div>
        <div class="chef-agent-ai-result">${formatAIResult(result)}</div>
        <div class="stats-summary">
          <div class="stats-title">📊 做菜统计</div>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">${stats.totalSessions}</div>
              <div class="stat-label">总做菜次数</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${stats.uniqueDishes}</div>
              <div class="stat-label">独立菜谱</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${stats.cookingDays}</div>
              <div class="stat-label">做菜天数</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${stats.uniqueMethods}</div>
              <div class="stat-label">技法种类</div>
            </div>
          </div>
        </div>
      </div>
    `;
    // 使用 requestAnimationFrame 确保 canvas 已渲染到 DOM 后再绘制
    requestAnimationFrame(() => {
      const canvas = document.getElementById("radarCanvas");
      renderRadarChart(canvas, scores);
    });
  } catch (e) {
    content.innerHTML = `
      <div class="chef-agent-header">
        <span class="chef-agent-emoji">👨‍🍳</span>
        <div>
          <div class="chef-agent-title">大厨点评</div>
          <div class="chef-agent-recipe">分析失败</div>
        </div>
      </div>
      <div class="chef-agent-ai-error">AI 分析失败：${e.message || "请重试"}</div>
    `;
  }
}

// 简单 markdown 格式化
function formatAIResult(text) {
  if (!text) return "";
  let html = text;
  // 代码块
  html = html.replace(/```[\s\S]*?```/g, (m) => `<pre>${m.replace(/```/g, "")}</pre>`);
  // 标题
  html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  // 粗体
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // 列表
  html = html.replace(/^(\d+)\. (.+)$/gm, '<div class="ai-result-item">$2</div>');
  html = html.replace(/^- (.+)$/gm, '<div class="ai-result-item">• $1</div>');
  // 换行
  html = html.replace(/\n/g, '<br>');
  return html;
}

function showChefAgentToast(msg) {
  // 移除已有的 toast
  const existing = document.querySelector(".chef-agent-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "chef-agent-toast";
  toast.textContent = msg;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 2000);
}

// ============================================
// 启动
// ============================================
init();
