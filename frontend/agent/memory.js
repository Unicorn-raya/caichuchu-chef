/* ============================================
   memory.js — Agent 记忆模块
   记忆用户做过的菜谱
   ============================================ */

const ChefMemory = {
  STORAGE_KEY: "caichuchu_chef_memory",

  // 获取记忆
  load() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : { cookedRecipes: [] };
    } catch {
      return { cookedRecipes: [] };
    }
  },

  // 保存记忆
  save(memory) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(memory));
  },

  // 记录做过的菜
  recordCooked(recipeId, title) {
    const memory = this.load();
    const existing = memory.cookedRecipes.find((r) => r.recipeId === recipeId);
    if (existing) {
      existing.count = (existing.count || 0) + 1;
      existing.lastCooked = Date.now();
    } else {
      memory.cookedRecipes.push({
        recipeId,
        title,
        count: 1,
        firstCooked: Date.now(),
        lastCooked: Date.now(),
      });
    }
    this.save(memory);
    return memory;
  },

  // 获取做过的菜
  getCookedRecipes() {
    return this.load().cookedRecipes || [];
  },

  // 检查是否做过某道菜
  hasCooked(recipeId) {
    return this.load().cookedRecipes.some((r) => r.recipeId === recipeId);
  },

  // 获取做过的菜的数量
  getCookedCount() {
    return this.load().cookedRecipes.length;
  },

  // 清空记忆
  clear() {
    localStorage.removeItem(this.STORAGE_KEY);
  },
};

if (typeof window !== "undefined") {
  window.ChefMemory = ChefMemory;
}
