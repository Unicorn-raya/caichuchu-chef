/* ============================================
   菜厨厨 — 前端应用逻辑
   ============================================ */

const API_BASE = ""; // 同源
const STORAGE_KEY = "caichuchu_fridge";
const STATS_KEY = "caichuchu_stats";

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
let searchResults = [];
let swipeIndex = 0;
let selectedTags = [];
let cookingSteps = [];
let cookingStepIndex = 0;
let cookingRecipeTitle = "";

// ============================================
// 初始化
// ============================================
async function init() {
  loadFridge();
  loadStats();
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
    window.userStats = data ? JSON.parse(data) : { cooked: 0, saved: 0, favorites: [] };
  } catch {
    window.userStats = { cooked: 0, saved: 0, favorites: [] };
  }
}

function saveStats() {
  localStorage.setItem(STATS_KEY, JSON.stringify(window.userStats));
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

async function searchRecipes(ingredients, mode, tags) {
  const res = await fetch(`${API_BASE}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ingredients, mode, top_k: 20, tags: tags || [] }),
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
      ${sorted.map((item, idx) => {
        const s = getExpiryStatus(item.name, item.addedAt);
        const emoji = INGREDIENT_EMOJI[item.name] || "🥘";
        return `
          <div class="ingredient-card status-${s.status}">
            <button class="ingredient-delete" onclick="removeIngredient(${fridge.indexOf(item)})">×</button>
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
// 录入底部抽屉
// ============================================
function openInputSheet() {
  document.getElementById("inputSheet").classList.remove("hidden");
  renderQuickTags();
}

function closeInputSheet() {
  document.getElementById("inputSheet").classList.add("hidden");
  document.getElementById("manualInputArea").classList.add("hidden");
  renderPage("home");
}

function showManualInput() {
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
// 一键生成菜单 → 搜索 → Tinder 滑动
// ============================================
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
    searchResults = await searchRecipes(ingredients, "scrappy", []);
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
        ${allTags.map((tag) => `
          <div class="tag-filter ${selectedTags.includes(tag.value) ? "active" : ""}" onclick="toggleTagFilter('${tag.value}')">
            ${tag.label}
          </div>
        `).join("")}
      </div>

      <div class="card-stack-container" id="cardStackContainer">
        ${renderCardStack()}
      </div>

      <div class="swipe-indicators">
        <button class="swipe-btn swipe-btn-pass" onclick="swipeLeft()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
        <button class="swipe-btn swipe-btn-cook" onclick="swipeRight()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 11h.01"/><path d="M11 15h.01"/><path d="M16 16h.01"/><path d="m2 16 20 6-6-20A20 20 0 0 0 2 16"/><path d="M5.71 17.11a17.04 17.04 0 0 1 11.4-11.4"/></svg>
        </button>
      </div>
    </div>
  `;

  setupCardSwipe();
}

function renderCardStack() {
  const remaining = searchResults.slice(swipeIndex, swipeIndex + 3);

  if (remaining.length === 0) {
    return `
      <div class="swipe-empty">
        <div class="swipe-empty-icon">🍽️</div>
        <div style="font-size:16px;font-weight:600;margin-bottom:4px">没有更多推荐了</div>
        <div style="font-size:13px">试试调整标签筛选或添加更多食材</div>
      </div>
    `;
  }

  return `
    <div class="card-stack">
      ${remaining.map((rec, idx) => renderSwipeCard(rec, idx)).join("")}
    </div>
  `;
}

function renderSwipeCard(rec, stackIdx) {
  const recipe = rec.recipe;
  const image = recipe.images && recipe.images.length > 0
    ? recipe.images[0]
    : null;
  const emoji = getRecipeEmoji(recipe);

  // 缺失食材（前5个）
  const missingChips = (rec.missing || []).slice(0, 5).map((i) =>
    `<span class="ingredient-chip missing">${i}</span>`
  ).join("");
  const haveChips = (rec.existing || []).slice(0, 5).map((i) =>
    `<span class="ingredient-chip have">${i}</span>`
  ).join("");

  return `
    <div class="swipe-card" data-idx="${swipeIndex + stackIdx}" style="transform: scale(${1 - stackIdx * 0.05}) translateY(${stackIdx * 12}px); z-index: ${10 - stackIdx}; opacity: ${1 - stackIdx * 0.15}">
      ${image
        ? `<img class="swipe-card-image" src="${image}" alt="${recipe.title}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
           <div class="swipe-card-placeholder" style="display:none">${emoji}</div>`
        : `<div class="swipe-card-placeholder">${emoji}</div>`
      }
      <div class="swipe-card-match-badge">匹配 ${rec.matchPercent}%</div>
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

function setupCardSwipe() {
  const card = document.querySelector(".swipe-card[data-idx='" + swipeIndex + "']");
  if (!card) return;

  const onStart = (e) => {
    const point = e.touches ? e.touches[0] : e;
    dragState = {
      card,
      startX: point.clientX,
      startY: point.clientY,
      dx: 0,
      dy: 0,
    };
    card.classList.add("dragging");
  };

  const onMove = (e) => {
    if (!dragState) return;
    e.preventDefault();
    const point = e.touches ? e.touches[0] : e;
    dragState.dx = point.clientX - dragState.startX;
    dragState.dy = point.clientY - dragState.startY;
    const rotation = dragState.dx * 0.1;
    dragState.card.style.transform = `translate(${dragState.dx}px, ${dragState.dy}px) rotate(${rotation}deg)`;
  };

  const onEnd = () => {
    if (!dragState) return;
    const { card, dx } = dragState;
    card.classList.remove("dragging");

    if (dx < -100) {
      swipeLeft();
    } else if (dx > 100) {
      swipeRight();
    } else {
      card.style.transform = "";
    }
    dragState = null;
  };

  card.addEventListener("touchstart", onStart, { passive: true });
  card.addEventListener("touchmove", onMove, { passive: false });
  card.addEventListener("touchend", onEnd);
  card.addEventListener("mousedown", onStart);
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onEnd);
}

function swipeLeft() {
  const card = document.querySelector(".swipe-card[data-idx='" + swipeIndex + "']");
  if (card) {
    card.classList.add("fly-left");
    setTimeout(() => {
      swipeIndex++;
      renderSwipeCardsOnly();
    }, 300);
  }
}

function swipeRight() {
  const card = document.querySelector(".swipe-card[data-idx='" + swipeIndex + "']");
  if (card) {
    card.classList.add("fly-right");
    setTimeout(() => {
      const rec = searchResults[swipeIndex];
      swipeIndex++;
      showRecipeDetail(rec);
    }, 300);
  }
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

  // 重新搜索
  const ingredients = fridge.map((i) => i.name);
  searchRecipes(ingredients, "scrappy", selectedTags).then((results) => {
    searchResults = results;
    swipeIndex = 0;
    renderSwipeCardsOnly();
  });
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

  app.innerHTML = `
    <div class="page recipe-detail-page">
      <div class="recipe-detail-hero">
        <button class="recipe-detail-back" onclick="backToSwipe()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
        </button>
        ${image
          ? `<img src="${image}" alt="${recipe.title}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
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

        <div class="recipe-section-title">食材清单</div>
        <div class="ingredient-list">
          ${allIngredients.map((ing) => {
            const have = existingSet.has(ing.name);
            return `
              <div class="ingredient-row ${have ? "have" : "missing"}">
                <span class="ingredient-row-name">${ing.name}${ing.type === "optional" ? "（可选）" : ""}</span>
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

        <button class="btn-start-cooking" onclick="startCooking('${recipe.id}')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          开始沉浸烹饪
        </button>
      </div>
    </div>
  `;
}

function backToSwipe() {
  document.getElementById("bottomNav").style.display = "none";
  renderSwipePage();
}

// ============================================
// 沉浸式烹饪模式
// ============================================
async function startCooking(recipeId) {
  const recipe = allRecipes.find((r) => r.id === recipeId);
  if (!recipe) return;

  cookingSteps = recipe.steps || [];
  cookingStepIndex = 0;
  cookingRecipeTitle = recipe.title;

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

function exitCookingMode() {
  document.getElementById("cookingMode").classList.add("hidden");
  if (window.wakeLock) {
    window.wakeLock.release();
    window.wakeLock = null;
  }
  // 返回首页
  document.getElementById("bottomNav").style.display = "";
  renderPage("home");
  showToast("烹饪完成，冰箱已更新");
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
      <div class="category-grid">
        ${catEntries.map(([key, cat], i) => `
          <div class="category-card ${catColors[i % 4]}" onclick="showCategory('${key}')">
            <div class="category-card-title">${cat.label}</div>
            <div class="category-card-count">${cat.count} 道菜</div>
          </div>
        `).join("")}
      </div>

      <div class="recipe-section-title" style="font-family:var(--font-display);font-size:17px;font-weight:700;margin-bottom:12px">热门菜谱</div>
      <div class="recipe-list">
        ${allRecipes.slice(0, 20).map((r) => renderRecipeListCard(r)).join("")}
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
        ? `<img class="recipe-list-thumb" src="${image}" alt="${recipe.title}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
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

function showCategory(category) {
  const recipes = allRecipes.filter((r) => r.category === category);
  const app = document.getElementById("app");
  document.getElementById("bottomNav").style.display = "none";

  app.innerHTML = `
    <div class="page discover-page">
      <div class="swipe-header">
        <button class="swipe-header-back" onclick="document.getElementById('bottomNav').style.display='';renderPage('discover')">
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
  const rec = {
    recipe,
    matchPercent: 0,
    existing: [],
    missing: recipe.requiredIngredients,
    reason: "浏览菜谱",
  };
  showRecipeDetail(rec);
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
        <div class="me-stat-card">
          <div class="me-stat-num">${stats.cooked}</div>
          <div class="me-stat-label">已做菜谱</div>
        </div>
        <div class="me-stat-card">
          <div class="me-stat-num">${stats.saved}</div>
          <div class="me-stat-label">消耗食材</div>
        </div>
        <div class="me-stat-card">
          <div class="me-stat-num">${fridge.length}</div>
          <div class="me-stat-label">冰箱库存</div>
        </div>
      </div>

      <div class="me-section-title">设置</div>
      <div class="me-menu-item" onclick="showToast('偏好设置开发中')">
        <span>🍽️ 饮食偏好</span>
        <span class="me-menu-arrow">›</span>
      </div>
      <div class="me-menu-item" onclick="showToast('过敏原设置开发中')">
        <span>⚠️ 过敏原管理</span>
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

function clearAllData() {
  if (confirm("确定清空冰箱所有食材？")) {
    fridge = [];
    saveFridge();
    renderPage("me");
    showToast("已清空");
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
// 启动
// ============================================
init();
