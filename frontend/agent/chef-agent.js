/* ============================================
   chef-agent.js — 厨师 Agent 主逻辑
   读取当前菜谱页面，通过 skill 给出做菜建议
   ============================================ */

const ChefAgent = {
  // 判断当前是否在菜谱详情页
  isOnRecipePage() {
    return !!document.querySelector(".recipe-detail-page");
  },

  // 读取当前页面的菜谱信息
  readCurrentRecipe() {
    if (!this.isOnRecipePage()) return null;

    // 从 DOM 中提取菜谱信息
    const titleEl = document.querySelector(".recipe-detail-title");
    const stepEls = document.querySelectorAll(".step-item .step-text");
    const ingredientEls = document.querySelectorAll(".ingredient-row .ingredient-row-name");

    if (!titleEl) return null;

    const title = titleEl.textContent.trim();
    const steps = Array.from(stepEls).map((el) => el.textContent.trim());
    const ingredients = Array.from(ingredientEls).map((el) => {
      // 去掉用量部分
      const text = el.textContent.trim();
      return text.replace(/\d+.*$/, "").trim();
    });

    return { title, steps, ingredients, coreIngredients: ingredients, seasonings: [] };
  },

  // 生成建议
  generateAdvice() {
    const recipe = this.readCurrentRecipe();
    if (!recipe) return null;

    // 使用 chef-cn skill 生成建议
    const advices = [];
    if (window.CHEF_CN_SKILL) {
      const skillAdvices = window.CHEF_CN_SKILL.generateAdvice(recipe);
      advices.push(...skillAdvices);
    }

    // 记忆模块：检查用户是否做过这道菜
    if (window.ChefMemory) {
      const cooked = ChefMemory.getCookedRecipes();
      const matched = cooked.find((r) => r.title === recipe.title);
      if (matched) {
        advices.unshift({
          type: "memory",
          title: `你之前做过这道菜 ${matched.count} 次`,
          detail: matched.count > 1
            ? `这是你第 ${matched.count} 次做「${recipe.title}」，上次做的时间是 ${new Date(matched.lastCooked).toLocaleDateString()}。试试这次在原有基础上改进吧！`
            : `你之前做过一次「${recipe.title}」，上次做的时间是 ${new Date(matched.lastCooked).toLocaleDateString()}。`,
        });
      }
    }

    return { recipe, advices };
  },

  // 渲染建议面板
  renderAdvicePanel(result) {
    if (!result || !result.advices || result.advices.length === 0) {
      return `<div class="chef-agent-empty">暂无特别的烹饪建议，按步骤做就行！</div>`;
    }

    const { recipe, advices } = result;
    let html = `<div class="chef-agent-header">
      <span class="chef-agent-emoji">👨‍🍳</span>
      <div>
        <div class="chef-agent-title">厨师建议</div>
        <div class="chef-agent-recipe">${recipe.title}</div>
      </div>
    </div>`;

    html += `<div class="chef-agent-advices">`;
    for (const advice of advices) {
      const icon = advice.type === "deodorize" ? "🌿" : advice.type === "marinate" ? "🧂" : advice.type === "memory" ? "🧠" : "💡";
      html += `<div class="chef-agent-advice ${advice.type}">
        <div class="chef-agent-advice-header">
          <span class="chef-agent-advice-icon">${icon}</span>
          <span class="chef-agent-advice-title">${advice.title}</span>
        </div>
        <div class="chef-agent-advice-detail">${advice.detail}</div>`;
      if (advice.tips && advice.tips.length > 0) {
        html += `<ul class="chef-agent-advice-tips">`;
        for (const tip of advice.tips) {
          html += `<li>${tip}</li>`;
        }
        html += `</ul>`;
      }
      html += `</div>`;
    }
    html += `</div>`;

    return html;
  },
};

if (typeof window !== "undefined") {
  window.ChefAgent = ChefAgent;
}
