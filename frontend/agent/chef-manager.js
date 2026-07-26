/* ============================================
   chef-manager.js — 厨师管理模块
   管理默认厨师和用户自定义厨师
   ============================================ */

const ChefManager = {
  _storageKey: "ccc_chefs",
  _chefs: null,

  // 默认厨师配置
  DEFAULT_CHEF_ID: "default_chef",

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

  // 新增自定义厨师
  addChef(config) {
    this.init();
    const newChef = {
      id: "chef_" + Date.now(),
      name: config.name || "自定义大厨",
      avatar: config.avatar || null,
      enabled: true,
      isDefault: false,
      color: config.color || "#ff6b6b", // 用户自定义厨师用红色系
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
  addRecipeNote(chefId, recipeTitle, noteContent) {
    this.init();
    const chef = this._chefs.find(c => c.id === chefId);
    if (chef) {
      // 检查是否已存在该菜谱
      const existing = chef.recipes.find(r => r.title === recipeTitle);
      if (existing) {
        existing.content = noteContent;
        existing.updatedAt = new Date().toISOString();
      } else {
        chef.recipes.push({
          title: recipeTitle,
          content: noteContent,
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

  // 检查厨师是否启用
  isEnabled(id) {
    this.init();
    const chef = this._chefs.find(c => c.id === id);
    return chef ? chef.enabled : false;
  },
};

// 全局初始化
ChefManager.init();
