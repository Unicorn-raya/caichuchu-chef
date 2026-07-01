/* ============================================
   菜厨厨 — 前端应用逻辑
   ============================================ */

// 后端 API 地址：本地同源为空；线上部署时通过 config.js 设置 window.CCC_API_BASE
const API_BASE = window.CCC_API_BASE || "";

// 资源（图片等）URL：若设置后端地址，则资源也走后端
function assetUrl(path) {
  if (!path) return path;
  if (path.startsWith("http")) return path;
  // 本地静态资源走相对路径（Vercel 同源部署 + CDN）
  if (path.startsWith("/data/images/")) {
    return path;  // /data/images/xxx -> 同源 frontend/data/images/xxx
  }
  return `${API_BASE}${path}`;
}
const STORAGE_KEY = "caichuchu_fridge";
const STATS_KEY = "caichuchu_stats";
const AI_MODELS_KEY = "caichuchu_ai_models";
const DIET_PREFS_KEY = "caichuchu_diet_prefs";
const ALLERGENS_KEY = "caichuchu_allergens";

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

// 长按计时器
let longPressTimer = null;
let longPressTarget = null;
const LONG_PRESS_DURATION = 1000; // 1秒

// 弹窗状态
let editingIngredientIndex = -1;
let editingIngredientName = "";
async function init() {
  loadFridge();
  loadStats();
  loadDietPrefs();
  loadAllergens();
  await Promise.all([fetchShelfLife(), fetchRecipes(), fetchTags()]);
  setupNavigation();
  renderPage("home");
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
      recipe: {
        ...r.recipe,
        sortScore: hasAllergen ? (r.recipe.sortScore || 10) + 50 : r.recipe.sortScore,
      },
    };
  });
}

// 应用饮食偏好 + 过敏源到搜索结果
function applyDietAndAllergens(results) {
  const filtered = filterByDietPrefs(results);
  return applyAllergenMark(filtered);
}

// ============================================
// AI 模型管理
// 模型用途：recommend(推荐菜谱) / recognize(语音图像识别)
// ============================================
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
    return { models };
  } catch {
    return { models: [] };
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
 * 调用 AI 模型生成内容（OpenAI 兼容协议）
 * @param {string} prompt 用户提示
 * @param {string} useCase 用途：recommend(默认) / recognize
 * @param {string} systemPrompt 自定义 system 提示
 * @returns {Promise<string>} AI 返回的文本
 */
async function callAI(prompt, useCase = "recommend", systemPrompt) {
  const model = useCase === "recognize" ? getRecognizeModel() : getRecommendModel();
  if (!model) {
    throw new Error("NO_AI_MODEL");
  }
  const sys = systemPrompt || "你是一位资深美食顾问，用简洁生动的中文回答用户关于食材搭配和菜谱的问题。回答控制在 300 字以内。";
  const res = await fetch(`${model.url}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${model.apiKey}`,
    },
    body: JSON.stringify({
      model: model.model,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`AI请求失败: ${res.status} ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "（AI 未返回内容）";
}

/**
 * 调用 AI 视觉模型识别图片中的食材（OpenAI 兼容协议 vision）
 * @param {string} imageBase64 带 data:前缀的 base64 图片
 * @param {string} prompt 提示文本
 * @returns {Promise<string>} AI 返回的文本
 */
async function callAIVision(imageBase64, prompt) {
  const model = getRecognizeModel();
  if (!model) {
    throw new Error("NO_AI_MODEL");
  }
  const res = await fetch(`${model.url}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${model.apiKey}`,
    },
    body: JSON.stringify({
      model: model.model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageBase64 } },
          ],
        },
      ],
      temperature: 0.2,
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`AI请求失败: ${res.status} ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

// ============================================
// API 调用
// ============================================
async function fetchShelfLife() {
  try {
    const res = await fetch(`${API_BASE}/api/shelf-life`);
    const data = await res.json();
    shelfLifeData = data.shelfLife || {};
  } catch (e) {
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
        return;
      }
    }
  } catch (e) {
    console.warn("本地 recipes.json 加载失败，回退到后端 API", e);
  }
  // 回退：后端 API
  try {
    const res = await fetch(`${API_BASE}/api/recipes`);
    const data = await res.json();
    allRecipes = data.recipes || [];
  } catch (e) {
    console.error("菜谱加载失败", e);
  }
}

async function fetchTags() {
  try {
    const res = await fetch(`${API_BASE}/api/tags`);
    allTags = await res.json();
  } catch (e) {
    console.error("标签加载失败", e);
  }
}

async function searchRecipes(ingredients, mode, tags, topK = 20, showAll = false) {
  const res = await fetch(`${API_BASE}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ingredients, mode, top_k: topK, tags: tags || [], show_all: showAll }),
  });
  if (!res.ok) throw new Error("搜索失败");
  return res.json();
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
  currentPage = page;
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

      <div class="fridge-section">
        <div class="section-header">
          <div>
            <span class="section-title">库存食材</span>
            <span class="section-count">${fridge.length} 样</span>
          </div>
          <button class="btn-add-ingredient" onclick="openInputSheet()">+</button>
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
          <div class="ingredient-card status-${s.status}"
               onmousedown="handleMouseDown(${idx}, event)"
               onmouseup="handleMouseUp(event)"
               onmouseleave="handleMouseLeave(event)"
               ontouchstart="handleTouchStart(${idx}, event)"
               ontouchend="handleTouchEnd(event)"
               ontouchmove="handleTouchMove(event)">
            <button class="ingredient-delete" onclick="event.stopPropagation();removeIngredient(${idx})">×</button>
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

function removeIngredient(index) {
  fridge.splice(index, 1);
  saveFridge();
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
    const prompt = `我冰箱里有食材「${name}」。请推荐 4-5 道以这个食材为主角的常见家常菜，每道菜用一句话说明做法亮点和搭配食材。用列表形式输出，开头用一句话概括这个食材的特点。`;
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
  if (ingredients.length === 0) return;

  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="page" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:80vh">
      <div class="loading-spinner"></div>
      <div style="margin-top:12px;color:var(--text-muted)">正在匹配最佳菜谱…</div>
    </div>
  `;

  try {
    // 获取更多结果用于本地标签过滤 + 组合去重（去重需要较大菜谱池）
    const rawResults = await searchRecipes(ingredients, "scrappy", [], 80);
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
    renderSwipePage();
  } catch (e) {
    showToast("搜索失败，请重试");
    renderPage("home");
  }
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
        ${allTags.map((tag) => {
          const isActive = selectedTags.includes(tag.value);
          return `
            <div class="tag-filter ${isActive ? "active" : ""}" onclick="toggleTagFilter('${tag.value}')">
              ${isActive ? '<svg class="tag-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ""}
              ${tag.label}
              ${tag.count ? `<span class="tag-count">${tag.count}</span>` : ""}
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

function renderSwipeCard(combo, stackIdx) {
  // 单菜兜底：直接走老的渲染逻辑，避免组合卡片样式显得空旷
  if (combo.type === "single") {
    const rec = combo.recipes[0];
    const recipe = rec.recipe;
    const image = recipe.images && recipe.images.length > 0 ? recipe.images[0] : null;
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
          <div class="swipe-card-reason">${rec.reason}</div>
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
    const image = recipe.images && recipe.images.length > 0 ? recipe.images[0] : null;
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
    swipeIndex = 0;
    renderSwipePage();
  } else {
    // 有标签选中：重新搜索，获取该标签下所有匹配菜谱
    const ingredients = fridge.map((i) => i.name);
    const tagBar = document.querySelector(".tag-filter-bar");
    if (tagBar) {
      // 显示加载状态
      const cards = document.querySelector(".card-stack-container");
      if (cards) {
        cards.innerHTML = `<div style="display:flex;justify-content:center;padding:60px 0"><div class="loading-spinner"></div></div>`;
      }
    }

    searchRecipes(ingredients, "scrappy", selectedTags, 200, true).then((rawResults) => {
      // 标签筛选后同样应用饮食偏好 + 过敏源
      const results = applyDietAndAllergens(rawResults);
      // 按 sortScore 升序，便于组合生成时优先选用简单菜
      results.sort((a, b) => (a.recipe.sortScore || 10) - (b.recipe.sortScore || 10));
      // 在过滤后的菜谱基础上生成组合
      searchResults = buildMenuCombinations(results);
      swipeIndex = 0;
      renderSwipePage();
    }).catch(() => {
      showToast("筛选失败，请重试");
      searchResults = buildMenuCombinations(allSearchResults);
      swipeIndex = 0;
      renderSwipePage();
    });
  }
}

function backToHome() {
  document.getElementById("bottomNav").style.display = "";
  renderPage("home");
}

// ============================================
// 菜谱详情
// ============================================
function showRecipeDetail(rec) {
  document.getElementById("bottomNav").style.display = "";
  const recipe = rec.recipe;
  const app = document.getElementById("app");
  const image = recipe.images && recipe.images.length > 0
    ? recipe.images[0]
    : null;
  const emoji = getRecipeEmoji(recipe);

  const existingSet = new Set(rec.existing || []);
  const allIngredients = [
    ...recipe.coreIngredients.map((i) => ({ name: i, type: "core" })),
    ...recipe.seasonings.map((i) => ({ name: i, type: "seasoning" })),
    ...recipe.optionalIngredients.map((i) => ({ name: i, type: "optional" })),
  ];

  // 食材用量映射
  const quantities = recipe.quantities || {};
  // 贴士
  const tips = recipe.tips || [];
  // 简介
  const description = recipe.description || "";

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

function renderRecipeListCard(recipe) {
  const image = recipe.images && recipe.images.length > 0
    ? recipe.images[0]
    : null;
  const emoji = getRecipeEmoji(recipe);

  return `
    <div class="recipe-list-card" onclick="showRecipeDetailDirect('${recipe.id}')">
      ${image
        ? `<img class="recipe-list-thumb" src="${assetUrl(image)}" alt="${recipe.title}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
           <div class="recipe-list-thumb-placeholder" style="display:none">${emoji}</div>`
        : `<div class="recipe-list-thumb-placeholder">${emoji}</div>`
      }
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
let calendarMode = "calendar"; // 'calendar' | 'timeline'
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
        <button class="calendar-tab ${calendarMode === 'calendar' ? 'active' : ''}" onclick="switchCalendarMode('calendar')">📅 日历模式</button>
        <button class="calendar-tab ${calendarMode === 'timeline' ? 'active' : ''}" onclick="switchCalendarMode('timeline')">🐟 时间线</button>
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
      <div class="cal-summary">本月做菜 <strong>${cookedCount}</strong> 天</div>
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

      <div class="me-section-title">设置</div>
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

  const useLabel = (use) => use === "recommend" ? "推荐菜谱" : "语音/图像识别";

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
          配置 OpenAI 兼容的模型后，可为「推荐菜谱」和「语音/图像识别」分别指定模型。点击下方模型卡片设置用途。
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
        ${(!recommendModel || !recognizeModel) && config.models.length > 0 ? `
          <div class="ai-use-hint">
            ${!recommendModel ? '⚠️ 未指定「推荐菜谱」模型，食材灵感推荐不可用<br>' : ''}
            ${!recognizeModel ? '⚠️ 未指定「语音/图像识别」模型，语音和拍照功能不可用' : ''}
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
                    ${m.name}
                    ${m.uses && m.uses.length > 0 ? m.uses.map((u) => `<span class="ai-use-tag ${u}">${useLabel(u)}</span>`).join("") : ''}
                  </div>
                  <div class="ai-model-item-model">${m.model}</div>
                  <div class="ai-model-item-url">${m.url}</div>
                  <div class="ai-model-item-hint">点击设置用途</div>
                </div>
                <div class="ai-model-item-actions">
                  <button class="ai-model-action-btn" onclick="event.stopPropagation();openAIModelEditor('${m.id}')">编辑</button>
                  <button class="ai-model-action-btn danger" onclick="event.stopPropagation();deleteAIModel('${m.id}')">删除</button>
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

  const modal = document.getElementById("aiUseModal");
  document.getElementById("aiUseModalModelName").textContent = model.name;
  document.getElementById("aiUseModalModelId").value = modelId;

  const tagRecommend = document.getElementById("aiUseTagRecommend");
  const tagRecognize = document.getElementById("aiUseTagRecognize");
  tagRecommend.classList.toggle("selected", currentUses.includes("recommend"));
  tagRecognize.classList.toggle("selected", currentUses.includes("recognize"));

  // 提示
  const hintEl = document.getElementById("aiUseModalHint");
  const hints = [];
  if (!currentUses.includes("recommend") && recommendOwner) hints.push(`「推荐菜谱」当前由 ${recommendOwner.name} 使用，选中后将切换`);
  if (!currentUses.includes("recognize") && recognizeOwner) hints.push(`「语音/图像识别」当前由 ${recognizeOwner.name} 使用，选中后将切换`);
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
// 启动
// ============================================
init();
