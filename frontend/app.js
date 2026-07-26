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

async function searchRecipes(ingredients, mode, tags, topK = 20, showAll = false) {
  FrontendLogger.info("api", "搜索菜谱", { ingredients, mode, tags, topK, showAll });
  const body = JSON.stringify({ ingredients, mode, top_k: topK, tags: tags || [], show_all: showAll });
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

function renderPage(page) {
  FrontendLogger.info("page", `切换到页面: ${page}`);
  currentPage = page;
  // 切换页面时关闭大厨点评面板
  const chefPanel = document.getElementById("chefAgentPanel");
  if (chefPanel) chefPanel.classList.add("hidden");
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.page === page);
  });

  const app = document.getElementById("app");
  switch (page) {
    case "home":
      app.innerHTML = renderHome();
      break;
    case "discover":
      app.innerHTML = renderDiscover();
      break;
    case "calendar":
      renderCalendarPage();
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
        <h1 class="home-title">我的冰箱</h1>
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
    fridge = fridge.filter((i) => i !== existing);
    el.classList.remove("selected");
  } else {
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
  chips.forEach((chip) => {
    const name = chip.dataset.name;
    if (!fridge.find((i) => i.name === name)) {
      fridge.push({ name, addedAt: Date.now() / 1000 });
      added++;
    }
  });
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

// 组合类型标签
function comboTypeLabel(type) {
  switch (type) {
    case "1m1v": return "一主菜一副菜";
    case "2m1v": return "两主菜一副菜";
    case "1m2v": return "一主菜两副菜";
    case "single": return "今日精选";
    default: return "推荐组合";
  }
}

// 构建单个组合对象
function buildCombo(recs, type) {
  const totalMissing = recs.reduce((s, r) => s + (r.missing || []).length, 0);
  const totalSortScore = recs.reduce((s, r) => s + (r.recipe.sortScore || 10), 0);
  const totalMatchPercent = Math.round(
    recs.reduce((s, r) => s + r.matchPercent, 0) / recs.length
  );
  return { recipes: recs, type, totalMissing, totalSortScore, totalMatchPercent };
}

/**
 * 根据搜索结果生成菜单组合
 * 优先级：3菜组合（2荤1素 或 1荤2素）> 2菜组合（1荤1素）> 单菜兜底
 * 排序：缺失食材总数（少→多）+ sortScore 总和（小→大）
 * 兜底：荤或素不足时，只推 1 道菜（缺失最少 + sortScore 最小）
 */
function buildMenuCombinations(results) {
  if (!results || results.length === 0) return [];

  const meatList = results.filter((r) => isMeatDish(r.recipe));
  const vegList = results.filter((r) => isVegDish(r.recipe));

  const combos = [];

  // 3 菜组合：2 荤 1 素
  for (let i = 0; i < meatList.length; i++) {
    for (let j = i + 1; j < meatList.length; j++) {
      for (let k = 0; k < vegList.length; k++) {
        combos.push(buildCombo([meatList[i], meatList[j], vegList[k]], "2m1v"));
      }
    }
  }
  // 3 菜组合：1 荤 2 素
  for (let i = 0; i < meatList.length; i++) {
    for (let j = 0; j < vegList.length; j++) {
      for (let k = j + 1; k < vegList.length; k++) {
        combos.push(buildCombo([meatList[i], vegList[j], vegList[k]], "1m2v"));
      }
    }
  }
  // 2 菜组合：1 荤 1 素
  for (let i = 0; i < meatList.length; i++) {
    for (let j = 0; j < vegList.length; j++) {
      combos.push(buildCombo([meatList[i], vegList[j]], "1m1v"));
    }
  }

  // 排序：缺失总数 + sortScore 总和
  combos.sort((a, b) => {
    if (a.totalMissing !== b.totalMissing) return a.totalMissing - b.totalMissing;
    return a.totalSortScore - b.totalSortScore;
  });

  const maxCombos = 12;
  // 组合级别去重：先移除完全相同的组合（菜品集合相同）
  const comboSignatures = new Set();
  const uniqueCombos = [];
  for (const combo of combos) {
    const sig = combo.recipes.map((r) => r.recipe.id).sort().join(",");
    if (!comboSignatures.has(sig)) {
      comboSignatures.add(sig);
      uniqueCombos.push(combo);
    }
  }

  // 第一轮：严格去重（每道菜只在一个组合中出现）
  let finalCombos = _selectCombosDedup(uniqueCombos, 1, maxCombos);

  // 若严格去重后组合太少，放宽限制：每道菜最多出现 2 次
  if (finalCombos.length < 5) {
    finalCombos = _selectCombosDedup(uniqueCombos, 2, maxCombos);
  }

  // 兜底：没有荤素组合，只推荐单道菜（缺失最少 + sortScore 最小，最多用剩菜）
  if (finalCombos.length === 0) {
    const singles = results.slice().sort((a, b) => {
      const aMissing = (a.missing || []).length;
      const bMissing = (b.missing || []).length;
      if (aMissing !== bMissing) return aMissing - bMissing;
      return (a.recipe.sortScore || 10) - (b.recipe.sortScore || 10);
    });
    return singles.slice(0, 5).map((r) => buildCombo([r], "single"));
  }

  return finalCombos;
}

// 贪心去重选择组合
// maxUsePerRecipe: 每道菜最多在几个组合中出现（1=严格不重复，2=允许出现2次）
function _selectCombosDedup(combos, maxUsePerRecipe, maxCombos) {
  const useCount = new Map(); // recipeId -> 已使用次数
  const finalCombos = [];
  for (const combo of combos) {
    // 检查该组合内所有菜品使用次数是否都未超限
    const allUsable = combo.recipes.every((r) => {
      const cnt = useCount.get(r.recipe.id) || 0;
      return cnt < maxUsePerRecipe;
    });
    if (allUsable) {
      finalCombos.push(combo);
      combo.recipes.forEach((r) => {
        useCount.set(r.recipe.id, (useCount.get(r.recipe.id) || 0) + 1);
      });
      if (finalCombos.length >= maxCombos) break;
    }
  }
  return finalCombos;
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
    // 获取更多结果用于本地标签过滤 + 组合去重（去重需要较大菜谱池）
    const rawResults = await searchRecipes(allIngredients, "scrappy", [], 80);
    // 应用饮食偏好（硬过滤）+ 过敏源（标识 + 排序降权）
    const processed = applyDietAndAllergens(rawResults);
    // 按 sortScore 升序排列（越简单的菜排在前面），便于组合生成时优先选用简单菜
    processed.sort((a, b) => (a.recipe.sortScore || 10) - (b.recipe.sortScore || 10));
    // 保存原始搜索结果（已应用偏好/过敏源），供标签筛选使用
    allSearchResults = processed;
    // 生成菜单组合（2-3 道菜，或兜底单菜）
    searchResults = buildMenuCombinations(processed);
    selectedTags = [];
    swipeIndex = 0;
    FrontendLogger.info("menu", "菜单生成完成", { rawResults: rawResults.length, combos: searchResults.length });
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
        <div style="width:50px"></div>
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
        <button class="swipe-btn swipe-btn-next" onclick="swipeNext()" aria-label="下一个">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
      <div class="swipe-indicator-hint">点击菜品开始做菜 · 点击卡片空白处切换</div>
    </div>
  `;

  setupCardSwipe();
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
  const existing = rec.existing || [];
  const missing = rec.missing || [];
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
    const missingChips = (rec.missing || []).slice(0, 5).map((i) =>
      `<span class="ingredient-chip missing">${i}</span>`
    ).join("");
    const haveChips = (rec.existing || []).slice(0, 5).map((i) =>
      `<span class="ingredient-chip have">${i}</span>`
    ).join("");
    return `
      <div class="swipe-card" data-idx="${swipeIndex + stackIdx}">
        ${image
          ? `<img class="swipe-card-image" src="${assetUrl(image)}" alt="${recipe.title}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
             <div class="swipe-card-placeholder" style="display:none">${emoji}</div>`
          : `<div class="swipe-card-placeholder">${emoji}</div>`
        }
        <div class="swipe-card-match-badge">匹配 ${rec.matchPercent}%</div>
        ${rec.hasAllergen ? `<div class="allergen-flag">含过敏源</div>` : ""}
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
            <span class="combo-item-match">匹配${rec.matchPercent}%</span>
            ${rec.hasAllergen ? `<span class="combo-item-allergen">⚠含过敏源</span>` : ""}
          </div>
          <div class="combo-item-missing">
            ${(rec.missing || []).length === 0
              ? `<span class="combo-missing-ok">食材齐备</span>`
              : `<span class="combo-missing-text">缺 ${(rec.missing || []).slice(0, 3).join("、")}${(rec.missing || []).length > 3 ? "…" : ""}</span>`
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
        <span class="combo-match">综合匹配 ${combo.totalMatchPercent}%</span>
      </div>
      <div class="combo-items">${items}</div>
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

  const onStart = (e) => {
    // 阻止 touchend 后浏览器合成的 mousedown 重新创建 dragState
    // （合成事件会在 touchend 后约 300ms 内触发，导致 click 误判）
    if (e.type === "mousedown" && Date.now() - _lastSwipeAt < 600) return;
    // 动画过程中禁止新一次拖拽
    if (_swipeAnimating) return;

    const point = e.touches ? e.touches[0] : e;
    dragState = {
      card,
      startX: point.clientX,
      startY: point.clientY,
      dx: 0,
      dy: 0,
      pointerType: e.touches ? "touch" : "mouse",
    };
    card.classList.add("dragging");
  };

  let rafId = null;
  const onMove = (e) => {
    if (!dragState) return;
    if (e.cancelable) e.preventDefault();
    const point = e.touches ? e.touches[0] : e;
    dragState.dx = point.clientX - dragState.startX;
    dragState.dy = point.clientY - dragState.startY;
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      if (!dragState) return;
      const rotation = dragState.dx * 0.1;
      dragState.card.style.transform = `translate3d(${dragState.dx}px, ${dragState.dy}px, 0) rotate(${rotation}deg)`;
    });
  };

  const onEnd = (e) => {
    if (!dragState) return;
    const { card, dx, dy } = dragState;
    card.classList.remove("dragging");
    _lastSwipeAt = Date.now();

    if (dx < -100) {
      // 左滑：上一个
      swipePrev();
    } else if (dx > 100) {
      // 右滑：下一个
      swipeNext();
    } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      // 点击
      const combo = searchResults[swipeIndex];
      if (!combo) { dragState = null; return; }

      const targetEl = (e && (e.target || e.srcElement)) || null;
      // 单菜兜底：点击进入菜谱详情页
      if (combo.type === "single") {
        const rec = combo.recipes[0];
        showRecipeDetailFromRecommend(rec);
        dragState = null;
        return;
      }

      // 组合卡片：判断是否点中具体菜品
      const comboItem = targetEl ? targetEl.closest(".combo-item") : null;
      if (comboItem) {
        const idx = parseInt(comboItem.dataset.idx, 10);
        const rec = combo.recipes[idx];
        if (rec) showRecipeDetailFromRecommend(rec);
      } else {
        // 点击卡片空白区域：根据点击位置左右切换上一个/下一个
        let clickX = 0;
        const cardRect = card.getBoundingClientRect();
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
      card.style.transform = "";
    }
    dragState = null;
  };

  card.addEventListener("touchstart", onStart, { passive: true });
  card.addEventListener("touchmove", onMove, { passive: false });
  card.addEventListener("touchend", onEnd);
  card.addEventListener("mousedown", onStart);

  // document 级监听器先移除旧的再添加新的，避免累积
  if (_docMoveRef) {
    document.removeEventListener("mousemove", _docMoveRef);
    document.removeEventListener("mouseup", _docUpRef);
  }
  _docMoveRef = onMove;
  _docUpRef = onEnd;
  document.addEventListener("mousemove", _docMoveRef);
  document.addEventListener("mouseup", _docUpRef);
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
        <h1 class="recipe-detail-title">${recipe.title}</h1>
        <div class="recipe-detail-meta">
          ${recipe.timeMinutes ? `<div class="recipe-detail-meta-item">⏱ ${recipe.timeMinutes}分钟</div>` : ""}
          ${recipe.calories ? `<div class="recipe-detail-meta-item">🔥 ${recipe.calories}卡</div>` : ""}
          ${recipe.difficulty ? `<div class="recipe-detail-meta-item">难度 ${"★".repeat(recipe.difficulty)}</div>` : ""}
          <div class="recipe-detail-meta-item">匹配 ${rec.matchPercent}%</div>
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
  showRecipeDetail(rec);
}

function backToSwipe() {
  document.getElementById("bottomNav").style.display = "none";
  renderSwipePage();
}

// 记录菜谱详情页的返回动作（不同入口返回到不同上级页面）
let recipeDetailBackFn = null;

// ============================================
// 沉浸式烹饪模式
// ============================================
async function startCooking(recipeId, missingIngredients) {
  const recipe = allRecipes.find((r) => r.id === recipeId);
  if (!recipe) return;

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
        </div>

        <div class="recipe-section-title" style="font-family:var(--font-display);font-size:17px;font-weight:700;margin-bottom:12px">热门菜谱</div>
        <div class="recipe-list" id="discoverRecipeList">
          ${allRecipes.slice(0, 20).map((r) => renderRecipeListCard(r)).join("")}
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

// 随机抽一道菜（大厨按钮在发现页的行为）
function pickRandomRecipe() {
  if (allRecipes.length === 0) return;
  FrontendLogger.info("discover", "随机推荐3道菜");
  // 三组类别各选一道：肉/水产/早餐 + 甜品/饮品/半成品/汤粥 + 主食/素菜蛋奶
  const group1 = ["aquatic", "breakfast", "meat_dish"];
  const group2 = ["dessert", "drink", "semi-finished", "soup"];
  const group3 = ["staple", "vegetable_dish"];
  const pickFromGroup = (cats) => {
    const pool = allRecipes.filter((r) => cats.includes(r.category));
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  };
  const picked = [pickFromGroup(group1), pickFromGroup(group2), pickFromGroup(group3)].filter(Boolean);
  if (picked.length === 0) return;
  const content = document.getElementById("discoverContent");
  if (!content) return;
  content.innerHTML = `
    <div class="discover-search-result">
      <div class="discover-search-count">🎲 大厨为你随机推荐 ${picked.length} 道菜</div>
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
    labels.push({ text: "含过敏源", cls: "conflict-allergen" });
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

  return `
    <div class="recipe-list-card" onclick="showRecipeDetailDirect('${recipe.id}')">
      ${image
        ? `<img class="recipe-list-thumb" src="${assetUrl(image)}" alt="${recipe.title}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
           <div class="recipe-list-thumb-placeholder" style="display:none">${emoji}</div>`
        : `<div class="recipe-list-thumb-placeholder">${emoji}</div>`
      }
      ${conflictLabels.length > 0 ? `<div class="recipe-conflict-flags">${conflictLabels.map((l) => `<span class="recipe-conflict-flag ${l.cls}">${l.text}</span>`).join("")}</div>` : ""}
      <div class="recipe-list-info">
        <div class="recipe-list-title">${recipe.title}</div>
        <div class="recipe-list-meta">
          ${recipe.timeMinutes ? `<span>⏱${recipe.timeMinutes}分</span>` : ""}
          ${recipe.calories ? `<span>🔥${recipe.calories}卡</span>` : ""}
          ${recipe.tags.length ? `<span>${recipe.tags[0]}</span>` : ""}
        </div>
      </div>
    </div>
  `;
}

let currentDiscoverCategory = null; // 当前在发现页查看的分类（null 表示分类总览）

function showCategory(category) {
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
  // 根据当前所在页面设置返回动作
  const activeNav = document.querySelector(".nav-btn.active");
  const activePage = activeNav ? activeNav.dataset.page : null;
  if (activePage === "discover") {
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
  const rec = {
    recipe,
    matchPercent: 0,
    existing: [],
    missing: recipe.requiredIngredients,
    reason: "浏览菜谱",
  };
  showRecipeDetail(rec);
}

// 菜谱详情页返回：根据入口回到对应上级页
function goBackFromRecipeDetail() {
  // 离开菜谱页时清除大厨笔记
  if (window.ChefGuides && ChefGuides.isNotesActive()) {
    ChefGuides.clearNotesFromPage();
    const fab = document.getElementById("chefAgentFab");
    if (fab) fab.querySelector(".chef-agent-fab-icon").textContent = "👨‍🍳";
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
  renderCalendarPage();
  showToast("已加载演示数据");
}

function clearDemoCalendarData() {
  if (!confirm("确定清空所有做菜记录？")) return;
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
        <button class="cal-demo-btn" onclick="loadDemoCalendarData()" title="加载演示数据">✨ 演示</button>
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
}

function switchCalendarMode(mode) {
  calendarMode = mode;
  if (mode === 'calendar') timelineHighlightKey = null;
  renderCalendarPage();
}

// 从日历模式点击有做菜的天 → 跳到时间线并滚动到对应卡片
function jumpToTimeline(dateKey) {
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
  const prevMonth = () => { calendarMonth = new Date(year, month - 1, 1); renderCalendarPage(); };
  const nextMonth = () => { calendarMonth = new Date(year, month + 1, 1); renderCalendarPage(); };

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
      <div class="timeline-empty">
        <div style="font-size:48px;margin-bottom:12px">🐟</div>
        <div style="font-size:16px;font-weight:600;margin-bottom:4px">还没有做菜记录</div>
        <div style="font-size:13px;color:var(--text-muted)">完成一次烹饪后这里会显示鱼骨时间线</div>
      </div>
    `;
  }

  // 鱼骨图：左右交替的卡片
  const bones = records.map((r, idx) => {
    const side = idx % 2 === 0 ? "left" : "right";
    const date = new Date(r.timestamp);
    const dateStr = `${date.getMonth() + 1}月${date.getDate()}日`;
    const timeStr = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const isHighlighted = dateKey === timelineHighlightKey;
    const recipe = allRecipes.find((x) => x.id === r.recipeId);
    const emoji = recipe ? getRecipeEmoji(recipe) : "🍽️";
    const image = recipe && recipe.images && recipe.images.length > 0 ? recipe.images[0] : null;

    return `
      <div class="fishbone-item side-${side} ${isHighlighted ? 'highlighted' : ''}" id="fishbone-item-${dateKey}">
        <div class="fishbone-card" onclick="showRecipeDetailDirect('${r.recipeId}')">
          ${image
            ? `<img class="fishbone-card-img" src="${assetUrl(image)}" alt="${r.title}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
               <div class="fishbone-card-emoji" style="display:none">${emoji}</div>`
            : `<div class="fishbone-card-emoji">${emoji}</div>`
          }
          <div class="fishbone-card-body">
            <div class="fishbone-card-title">${r.title}</div>
            <div class="fishbone-card-meta">
              <span>${dateStr}</span>
              <span>${timeStr}</span>
              ${r.count > 1 ? `<span class="fishbone-count">×${r.count}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="fishbone-bone side-${side}"></div>
      </div>
    `;
  }).join("");

  return `
    <div class="fishbone-timeline">
      <div class="fishbone-head">🐟</div>
      <div class="fishbone-spine"></div>
      <div class="fishbone-items">
        ${bones}
      </div>
      <div class="fishbone-tail">
        <div class="fishbone-tail-line"></div>
        <div class="fishbone-tail-fins">
          <div class="fin fin-left"></div>
          <div class="fin fin-right"></div>
        </div>
      </div>
      <div class="fishbone-tail-label">最早记录</div>
    </div>
    <div class="calendar-chef-btn" onclick="analyzeCalendarWithAI()">
      <span class="calendar-chef-avatar">👨‍🍳</span>
      <span class="calendar-chef-text">大厨点评</span>
    </div>
  `;
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
        <div class="me-stat-card clickable" onclick="showCookedRecipes()">
          <div class="me-stat-num">${stats.cooked}</div>
          <div class="me-stat-label">已做菜谱</div>
        </div>
        <div class="me-stat-card clickable" onclick="showConsumedIngredients()">
          <div class="me-stat-num">${stats.saved}</div>
          <div class="me-stat-label">消耗食材</div>
        </div>
        <div class="me-stat-card clickable" onclick="renderPage('home')">
          <div class="me-stat-num">${fridge.length}</div>
          <div class="me-stat-label">冰箱库存</div>
        </div>
      </div>

      <div class="me-section-title">厨房</div>
      <div class="me-menu-item" onclick="showKitchenSection('seasonings')">
        <span>🧂 调料</span>
        <span class="me-menu-value">${seasonings.length} 样</span>
        <span class="me-menu-arrow">›</span>
      </div>
      <div class="me-menu-item" onclick="showKitchenSection('utensils')">
        <span>🍳 厨具</span>
        <span class="me-menu-value">${utensils.length} 样</span>
        <span class="me-menu-arrow">›</span>
      </div>

      <div class="me-section-title">设置</div>
      <div class="me-menu-item" onclick="showChefs()">
        <span>👨‍🍳 厨师管理</span>
        <span class="me-menu-value">${ChefManager.getEnabled().length} 位启用</span>
        <span class="me-menu-arrow">›</span>
      </div>
      <div class="me-menu-item" onclick="showAIModels()">
        <span>🤖 AI模型管理</span>
        <span class="me-menu-arrow">›</span>
      </div>
      <div class="me-menu-item" onclick="showDietPreferences()">
        <span>🍽️ 饮食偏好</span>
        <span class="me-menu-value">${dietPreferences.length > 0 ? `已选 ${dietPreferences.length}` : "未设置"}</span>
        <span class="me-menu-arrow">›</span>
      </div>
      <div class="me-menu-item" onclick="showAllergens()">
        <span>⚠️ 过敏原管理</span>
        <span class="me-menu-value">${allergens.length > 0 ? `已选 ${allergens.length}` : "未设置"}</span>
        <span class="me-menu-arrow">›</span>
      </div>
      <div class="me-menu-item" onclick="clearAllData()">
        <span>🗑️ 清空冰箱</span>
        <span class="me-menu-arrow">›</span>
      </div>
      <div class="me-menu-item" onclick="showToast('菜厨厨 v1.0 — 基于RAG的智能菜谱推荐')">
        <span>ℹ️ 关于</span>
        <span class="me-menu-arrow">›</span>
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
        <div style="width:60px"></div>
      </div>
      <div class="chef-list">
        ${chefs.map((chef) => renderChefCard(chef)).join("")}
      </div>
      <div class="chef-add-section">
        <button class="chef-add-btn" onclick="showAddChefForm()">
          <span class="chef-add-icon">+</span>
          <span>新增自定义大厨</span>
        </button>
      </div>
    </div>
  `;
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

  const app = document.getElementById("app");
  document.getElementById("bottomNav").style.display = "none";

  const recipe = chef.recipes[0] || {};
  const noteContent = recipe.content || "";
  const summaryContent = recipe.summary || "";
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
            <input type="text" class="chef-recipe-search" placeholder="搜索菜谱..." oninput="filterChefRecipeList(this.value)" />
            <div class="chef-recipe-list" id="chefRecipeList">
              ${renderChefRecipeListWithSelection("", recipeTitle)}
            </div>
          </div>
        </div>
        <div class="chef-form-section">
          <label class="chef-form-label">大厨笔记（菜谱做法，支持Markdown格式）</label>
          <textarea id="newChefContent" class="chef-form-textarea" rows="10" placeholder="示例：&#10;## 食材准备&#10;- 猪肉切丝，用生抽、料酒、淀粉腌制10分钟">${noteContent}</textarea>
        </div>
        <div class="chef-form-section">
          <label class="chef-form-label">大厨总结（烹饪技法与要点，支持Markdown格式）</label>
          <textarea id="newChefSummary" class="chef-form-textarea" rows="6" placeholder="示例：&#10;## 食材处理&#10;- 猪肉逆纹切丝更嫩">${summaryContent}</textarea>
        </div>
        <div class="chef-form-actions">
          <button class="chef-form-submit" onclick="updateChef('${chefId}')">保存修改</button>
        </div>
      </div>
    </div>
  `;
}

// 渲染菜谱列表并标记已选项
function renderChefRecipeListWithSelection(filter, selectedTitle) {
  const recipes = allRecipes.filter((r) => {
    if (r.category === "condiment" || r.category === "template") return false;
    if (filter && !r.title.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  }).slice(0, 100);

  return recipes.map((r) => `
    <label class="chef-recipe-item">
      <input type="radio" name="chefRecipeRadio" class="chef-recipe-checkbox" value="${r.title}" ${r.title === selectedTitle ? "checked" : ""} />
      <span class="chef-recipe-item-title">${r.title}</span>
      <span class="chef-recipe-item-category">${r.categoryLabel || r.category}</span>
    </label>
  `).join("");
}

// 更新自定义大厨
function updateChef(chefId) {
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

  const chef = ChefManager.getById(chefId);
  if (!chef) return;

  // 更新厨师信息
  chef.name = name;
  // 更新菜谱笔记
  const existingRecipe = chef.recipes.find(r => r.title === selectedRecipe);
  if (existingRecipe) {
    existingRecipe.content = content;
    existingRecipe.summary = summary;
    existingRecipe.updatedAt = new Date().toISOString();
  } else {
    // 如果选了新菜谱，替换原来的
    chef.recipes = [{
      title: selectedRecipe,
      content: content,
      summary: summary,
      rawContent: content,
      rawSummary: summary,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }];
  }
  ChefManager._save();
  showToast("已保存修改");
  showChefs();
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
      <div class="chef-notes-list" id="defaultChefNotesList">
        <div style="text-align:center;padding:40px;color:#999;">加载中...</div>
      </div>
    </div>
  `;

  try {
    const resp = await fetch("data/guides/index.json");
    if (!resp.ok) throw new Error("加载失败");
    const index = await resp.json();
    const entries = Object.values(index).sort((a, b) => (a.title || "").localeCompare(b.title || ""));

    const listEl = document.getElementById("defaultChefNotesList");
    listEl.innerHTML = entries.map((entry) => `
      <div class="chef-note-item" onclick="viewDefaultChefNote('${entry.file}')">
        <span class="chef-note-item-icon">📄</span>
        <span class="chef-note-item-title">${entry.title}</span>
        <span class="chef-note-item-arrow">›</span>
      </div>
    `).join("");
  } catch (e) {
    document.getElementById("defaultChefNotesList").innerHTML =
      `<div style="text-align:center;padding:40px;color:#999;">加载失败：${e.message}</div>`;
  }
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

function renderChefCard(chef) {
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
      <div class="chef-card-avatar" onclick="showChefAvatarPicker('${chef.id}')">
        ${avatarHtml}
        <div class="chef-card-avatar-edit">✏️</div>
      </div>
      <div class="chef-card-info" onclick="${isDefault ? `showDefaultChefNotes()` : `editChef('${chef.id}')`}">
        <div class="chef-card-name">${chef.name}</div>
        <div class="chef-card-status">${enabled ? "已启用" : "已禁用"} · ${noteCount}</div>
      </div>
      <div class="chef-card-actions">
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

  // 创建隐藏的文件输入
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

    // 压缩并裁剪为方形头像
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
          <label class="chef-form-label">大厨笔记（菜谱做法，支持Markdown格式）</label>
          <textarea id="newChefContent" class="chef-form-textarea" rows="10" placeholder="示例：\n## 食材准备\n- 猪肉切丝，用生抽、料酒、淀粉腌制10分钟\n- 青椒切丝备用\n\n## 烹饪步骤\n1. 热锅凉油，下肉丝滑炒至变色\n2. 加入青椒丝大火快炒\n3. 调入适量盐、糖、生抽，炒匀出锅"></textarea>
        </div>
        <div class="chef-form-section">
          <label class="chef-form-label">大厨总结（烹饪技法与要点，支持Markdown格式）</label>
          <textarea id="newChefSummary" class="chef-form-textarea" rows="6" placeholder="示例：\n## 食材处理\n- 猪肉逆纹切丝更嫩\n- 青椒手掰比刀切更入味\n\n## 火候要点\n- 热锅凉油防粘\n- 大火快炒锁汁"></textarea>
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
      noteProcessed: noteValidation.valid,
      summaryProcessed: summaryValidation.valid,
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

// 验证厨师内容是否为有效菜谱做法
function validateChefContent(content) {
  const trimmed = content.trim();

  // 检查长度
  if (trimmed.length < 20) {
    return { valid: false, reason: "内容过短，请提供更详细的做法" };
  }

  // 检查是否包含烹饪相关关键词
  const cookingKeywords = ["切", "炒", "煮", "蒸", "炸", "煎", "烤", "烧", "炖", "焖", "拌", "腌", "焯", "油", "锅", "火", "盐", "糖", "酱", "料", "食材", "步骤", "做法", "分钟", "克", "勺", "适量"];
  const hasCookingKeyword = cookingKeywords.some((k) => trimmed.includes(k));

  if (!hasCookingKeyword) {
    return { valid: false, reason: "未检测到烹饪相关内容" };
  }

  // 检查是否包含步骤结构
  const hasSteps = /步骤|做法|1[.、]|2[.、]|3[.、]|首先|然后|接着|最后|##|###/.test(trimmed);
  if (!hasSteps) {
    return { valid: false, reason: "建议按步骤格式书写（如：1. 切菜 2. 炒制...）" };
  }

  return { valid: true };
}

// 使用AI处理厨师内容（type: "note" 笔记 | "summary" 总结）
async function processChefContentWithAI(chefId, recipeTitle, content, type = "note") {
  const model = getAIModelByUse("recommend");
  if (!model) {
    console.log("未配置推荐模型，跳过AI处理");
    return;
  }

  const prompt = type === "summary"
    ? `你是一位专业的中餐厨师。请将以下用户输入的烹饪总结，整理成标准的大厨总结格式。

要求：
1. 提取食材处理要点（如有）
2. 提取烹饪技法要点（如火候、油温等）
3. 提取通用注意事项
4. 输出为Markdown格式，包含 ## 食材处理、## 烹饪技法、## 通用要点 三个部分（无内容的可省略）
5. 语言简洁专业，适合作为厨房总结

用户输入内容：
${content}

请输出整理后的Markdown内容：`
    : `你是一位专业的中餐厨师。请将以下用户输入的菜谱做法，整理成标准的菜谱笔记格式。

要求：
1. 提取食材准备部分（包括食材处理方法）
2. 提取烹饪步骤部分（numbered list）
3. 提取关键技巧和注意事项
4. 输出为Markdown格式，包含 ## 食材准备、## 烹饪步骤、## 关键技巧 三个部分
5. 语言简洁专业，适合作为厨房笔记

用户输入内容：
${content}

请输出整理后的Markdown内容：`;

  try {
    const resp = await fetch(model.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${model.apiKey}`,
      },
      body: JSON.stringify({
        model: model.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });

    if (!resp.ok) throw new Error("AI处理失败");
    const data = await resp.json();
    const processedContent = data.choices[0].message.content;

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
      console.log("AI处理完成", processedContent.substring(0, 200));
    }
  } catch (err) {
    console.error("AI处理出错:", err);
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
function showCookedRecipes() {
  const app = document.getElementById("app");
  document.getElementById("bottomNav").style.display = "none";

  const cooked = window.userStats.cookedRecipes || {};
  const entries = Object.entries(cooked).sort((a, b) => b[1].lastCooked - a[1].lastCooked);

  app.innerHTML = `
    <div class="page detail-list-page">
      <div class="swipe-header">
        <button class="swipe-header-back" onclick="document.getElementById('bottomNav').style.display='';renderPage('me')">
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
            return `
              <div class="stamp-card" onclick="${recipe ? `showRecipeDetailDirect('${recipeId}')` : ''}">
                <div class="stamp-count-badge">${info.count}</div>
                <div class="stamp-inner">
                  ${image
                    ? `<img class="stamp-img" src="${assetUrl(image)}" alt="${info.title}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                       <div class="stamp-img-placeholder" style="display:none">${emoji}</div>`
                    : `<div class="stamp-img-placeholder">${emoji}</div>`
                  }
                  <div class="stamp-title">${info.title}</div>
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
        <button class="swipe-header-back" onclick="document.getElementById('bottomNav').style.display='';renderPage('me')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          返回
        </button>
        <div class="swipe-header-title">食材记录</div>
        <div style="width:50px"></div>
      </div>

      <div class="ingredient-record-section">
        <div class="ingredient-record-title">
          <span>🥬 已消耗食材</span>
          <span class="ingredient-record-count">${consumedList.length} 种</span>
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
          <span class="ingredient-record-count">${supplementedList.length} 种</span>
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

  if (enabledChefs.length === 0) {
    // 没有启用的厨师：灰色禁用状态
    fab.classList.add("chef-fab-disabled");
    fab.querySelector(".chef-agent-fab-icon").textContent = "👨‍🍳";
    // 如果有自定义头像且默认厨师被禁用，显示灰色头像
    if (defaultChef && defaultChef.avatar) {
      fab.querySelector(".chef-agent-fab-icon").innerHTML = `<img src="${defaultChef.avatar}" class="chef-fab-avatar-img disabled" />`;
    }
  } else {
    fab.classList.remove("chef-fab-disabled");
    // 使用第一个启用的厨师的头像
    const activeChef = enabledChefs[0];
    if (activeChef.avatar) {
      fab.querySelector(".chef-agent-fab-icon").innerHTML = `<img src="${activeChef.avatar}" class="chef-fab-avatar-img" />`;
    } else {
      fab.querySelector(".chef-agent-fab-icon").textContent = activeChef.isDefault ? "👨‍🍳" : "🧑‍🍳";
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
      fab.querySelector(".chef-agent-fab-icon").textContent = "👨‍🍳";
      showChefAgentToast("已关闭大厨笔记");
      return;
    }
    // 如果总结面板已打开，点击则关闭
    const panel = document.getElementById("chefAgentPanel");
    if (panel && !panel.classList.contains("hidden")) {
      closeChefAgentPanel();
      fab.querySelector(".chef-agent-fab-icon").textContent = "👨‍🍳";
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

  // 食材灵感推荐页面 → 随机推荐3道菜（跳转到发现页展示）
  if (currentPage === "home" && document.querySelector(".swipe-page")) {
    document.getElementById("bottomNav").style.display = "";
    renderPage("discover");
    pickRandomRecipe();
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
    if (fab) fab.querySelector(".chef-agent-fab-icon").textContent = "👨‍🍳";
  }, 300);
}

function confirmClearFridge() {
  if (fridge.length === 0) {
    showChefAgentToast("冰箱已经是空的");
    return;
  }
  if (confirm("确定清空冰箱所有食材？")) {
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
        fab.querySelector(".chef-agent-fab-icon").textContent = "👨‍🍳";
    }
  }, 300);
}

// 激活「大厨笔记」：在原菜谱步骤上直接注入红线+绿色批注
function activateChefNotes() {
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
      fab.querySelector(".chef-agent-fab-icon").textContent = ok ? "📝" : "👨‍🍳";
    }
    if (!ok) showChefAgentToast("暂无可标注的笔记");
    else showChefAgentToast("大厨笔记已标注");
  }).catch(() => {
    if (fab) {
      fab.classList.remove("loading");
      fab.querySelector(".chef-agent-fab-icon").textContent = "👨‍🍳";
    }
    showChefAgentToast("笔记加载失败");
  });
}

// 激活「大厨总结」：弹窗显示通用技法
function activateChefSummary() {
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
      fab.querySelector(".chef-agent-fab-icon").textContent = "👨‍🍳";
    }
  });
}

function closeChefAgentPanel() {
  document.getElementById("chefAgentPanel").classList.add("hidden");
  const fab = document.getElementById("chefAgentFab");
  if (fab && !ChefGuides.isNotesActive()) {
    fab.querySelector(".chef-agent-fab-icon").textContent = "👨‍🍳";
  }
}

// ============================================
// 日历 AI 分析：大厨点评做菜记录
// ============================================
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

  // 收集菜谱信息
  const recipeSummaries = records.map((r) => {
    const recipe = allRecipes.find((x) => x.id === r.recipeId);
    const category = recipe ? (recipe.categoryLabel || recipe.category || "未知") : "未知";
    const date = new Date(r.timestamp);
    const dateStr = `${date.getMonth() + 1}月${date.getDate()}日`;
    return `- ${dateStr}：${r.title}（${category}）${r.count > 1 ? `，做过${r.count}次` : ""}`;
  }).join("\n");

  const prompt = `以下是我最近的做菜记录，请作为一位资深美食顾问进行分析并给出建议：

${recipeSummaries}

请从以下方面给出建议（用中文回答）：
1. **饮食均衡分析**：最近的菜品在荤素搭配、营养均衡方面做得如何？
2. **食材多样性**：食材种类是否丰富？有没有过于单一的食材？
3. **做菜建议**：根据最近的饮食趋势，推荐接下来适合做什么菜（给出3-5道具体菜名和理由）。比如如果肉类太多就推荐清淡的蔬菜类，如果偏清淡可以适当推荐一些肉类。
4. **烹饪技巧建议**：针对已做的菜品，有什么可以改进的烹饪技巧？

请简洁明了地回答，用 markdown 格式。`;

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
    const result = await callAI(prompt, "calendar", "你是一位资深美食顾问和营养师，擅长分析饮食记录并给出均衡饮食建议。请用简洁专业的中文回答。");
    content.innerHTML = `
      <div class="chef-agent-header">
        <span class="chef-agent-emoji">👨‍🍳</span>
        <div>
          <div class="chef-agent-title">大厨点评</div>
          <div class="chef-agent-recipe">基于 ${records.length} 道做菜记录的分析</div>
        </div>
      </div>
      <div class="chef-agent-ai-result">${formatAIResult(result)}</div>
    `;
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
