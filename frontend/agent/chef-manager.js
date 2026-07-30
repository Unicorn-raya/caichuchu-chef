/* ============================================
   chef-manager.js — 厨师管理模块
   管理默认厨师和用户自定义厨师
   ============================================ */

const ChefManager = {
  _storageKey: "ccc_chefs",
  _chefs: null,

  // 默认厨师配置
  DEFAULT_CHEF_ID: "default_chef",

  // 预设色板（用于自动分配新厨师颜色）
  COLOR_PALETTE: [
    "#ff6b6b", // 珊瑚红
    "#4ecdc4", // 青绿
    "#45b7d1", // 天蓝
    "#96ceb4", // 薄荷绿
    "#feca57", // 金黄
    "#ff9ff3", // 粉红
    "#54a0ff", // 钴蓝
    "#5f27cd", // 紫色
    "#ff9f43", // 橙色
    "#1dd1a1", // 青绿
    "#ee5a24", // 橙红
    "#009432", // 深绿
    "#0652DD", // 深蓝
    "#833471", // 深紫
    "#b33939", // 砖红
    "#218c74", // 墨绿
  ],

  // 初始化
  init() {
    if (this._chefs) return;
    const raw = localStorage.getItem(this._storageKey);
    if (raw) {
      try {
        this._chefs = JSON.parse(raw);
      } catch {
        this._chefs = this._createDefault();
      }
    } else {
      this._chefs = this._createDefault();
    }
    // 确保默认厨师存在
    if (!this._chefs.find(c => c.id === this.DEFAULT_CHEF_ID)) {
      this._chefs.unshift(this._defaultChefConfig());
    }
    this._save();
  },

  _createDefault() {
    return [this._defaultChefConfig()];
  },

  _defaultChefConfig() {
    return {
      id: this.DEFAULT_CHEF_ID,
      name: "默认大厨",
      avatar: null, // null 表示使用默认 emoji 👨‍🍳
      enabled: true,
      isDefault: true,
      color: "#3cb371", // 默认绿色
      recipes: [], // 绑定的菜谱笔记
    };
  },

  _save() {
    localStorage.setItem(this._storageKey, JSON.stringify(this._chefs));
  },

  // 获取所有厨师
  getAll() {
    this.init();
    return this._chefs;
  },

  // 获取启用的厨师
  getEnabled() {
    this.init();
    return this._chefs.filter(c => c.enabled);
  },

  // 获取默认厨师
  getDefault() {
    this.init();
    return this._chefs.find(c => c.id === this.DEFAULT_CHEF_ID);
  },

  // 根据ID获取厨师
  getById(id) {
    this.init();
    return this._chefs.find(c => c.id === id);
  },

  // 切换启用状态
  toggleEnabled(id) {
    this.init();
    const chef = this._chefs.find(c => c.id === id);
    if (chef) {
      chef.enabled = !chef.enabled;
      this._save();
    }
    return chef;
  },

  // 设置启用状态
  setEnabled(id, enabled) {
    this.init();
    const chef = this._chefs.find(c => c.id === id);
    if (chef) {
      chef.enabled = enabled;
      this._save();
    }
    return chef;
  },

  // 更新厨师头像
  updateAvatar(id, avatarDataUrl) {
    this.init();
    const chef = this._chefs.find(c => c.id === id);
    if (chef) {
      chef.avatar = avatarDataUrl;
      this._save();
    }
    return chef;
  },

  // 更新厨师颜色
  updateColor(id, color) {
    this.init();
    const chef = this._chefs.find(c => c.id === id);
    if (chef) {
      chef.color = color;
      this._save();
    }
    return chef;
  },

  // 自动分配一个未被使用的颜色
  _pickNextColor() {
    this.init();
    const usedColors = new Set(this._chefs.map(c => c.color));
    for (const color of this.COLOR_PALETTE) {
      if (!usedColors.has(color)) return color;
    }
    // 所有色板颜色都用完了，随机生成一个
    return "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
  },

  // 新增自定义厨师
  addChef(config) {
    this.init();
    const newChef = {
      id: "chef_" + Date.now(),
      name: config.name || "自定义大厨",
      avatar: config.avatar || null,
      enabled: true,
      isDefault: false,
      color: config.color || this._pickNextColor(), // 自动分配未使用的颜色
      recipes: config.recipes || [],
    };
    this._chefs.push(newChef);
    this._save();
    return newChef;
  },

  // 删除厨师
  removeChef(id) {
    this.init();
    const idx = this._chefs.findIndex(c => c.id === id);
    if (idx >= 0 && !this._chefs[idx].isDefault) {
      this._chefs.splice(idx, 1);
      this._save();
      return true;
    }
    return false;
  },

  // 为厨师添加菜谱笔记
  addRecipeNote(chefId, recipeTitle, noteContent, summaryContent) {
    this.init();
    const chef = this._chefs.find(c => c.id === chefId);
    if (chef) {
      // 检查是否已存在该菜谱
      const existing = chef.recipes.find(r => r.title === recipeTitle);
      if (existing) {
        existing.content = noteContent;
        if (summaryContent !== undefined) existing.summary = summaryContent;
        existing.updatedAt = new Date().toISOString();
      } else {
        chef.recipes.push({
          title: recipeTitle,
          content: noteContent,
          summary: summaryContent || "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      this._save();
      return true;
    }
    return false;
  },

  // 获取厨师的菜谱笔记
  getRecipeNote(chefId, recipeTitle) {
    this.init();
    const chef = this._chefs.find(c => c.id === chefId);
    if (chef) {
      return chef.recipes.find(r => r.title === recipeTitle);
    }
    return null;
  },

  // 获取厨师的菜谱总结
  getRecipeSummary(chefId, recipeTitle) {
    const note = this.getRecipeNote(chefId, recipeTitle);
    return note ? note.summary : null;
  },

  // 获取所有启用厨师对某菜谱的笔记列表 [{chef, note}]（最多3条，按优先级排序）
  getEnabledChefNotesForRecipe(recipeTitle) {
    this.init();
    const result = [];
    for (const chef of this._chefs) {
      if (!chef.enabled) continue;
      const note = chef.recipes.find(r => r.title === recipeTitle);
      if (note && note.content) {
        result.push({ chef, note });
      }
    }
    return result.slice(0, 3);
  },

  // 获取所有启用厨师对某菜谱的总结列表 [{chef, summary}]（最多3条，按优先级排序）
  getEnabledChefSummariesForRecipe(recipeTitle) {
    this.init();
    const result = [];
    for (const chef of this._chefs) {
      if (!chef.enabled) continue;
      const note = chef.recipes.find(r => r.title === recipeTitle);
      if (note && note.summary) {
        result.push({ chef, summary: note.summary });
      }
    }
    return result.slice(0, 3);
  },

  // 检查厨师是否启用
  isEnabled(id) {
    this.init();
    const chef = this._chefs.find(c => c.id === id);
    return chef ? chef.enabled : false;
  },

  // 移动厨师顺序（上移/下移）
  moveChef(id, direction) {
    this.init();
    const idx = this._chefs.findIndex(c => c.id === id);
    if (idx < 0) return;
    if (direction === "up" && idx > 0) {
      [this._chefs[idx - 1], this._chefs[idx]] = [this._chefs[idx], this._chefs[idx - 1]];
    } else if (direction === "down" && idx < this._chefs.length - 1) {
      [this._chefs[idx + 1], this._chefs[idx]] = [this._chefs[idx], this._chefs[idx + 1]];
    }
    this._save();
  },

  // 设置厨师排序（传入有序ID数组）
  reorder(orderIds) {
    this.init();
    const map = new Map(this._chefs.map(c => [c.id, c]));
    const newOrder = orderIds.map(id => map.get(id)).filter(c => c);
    // 补上未包含在orderIds中的厨师
    for (const chef of this._chefs) {
      if (!orderIds.includes(chef.id)) newOrder.push(chef);
    }
    this._chefs = newOrder;
    this._save();
  },
};

// 全局初始化
ChefManager.init();
