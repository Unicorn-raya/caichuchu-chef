/* ============================================
   chef-guides.js — 大厨烹饪指南
   菜谱页点击大厨头像时展示：
   1. 通用技巧（按菜谱做法+核心食材匹配）
   2. 本菜详细做法（data/guides/recipes/{菜名}.md）
   ============================================ */

const ChefGuides = {
  _generalMd: null,
  _sections: null,
  _index: null,
  _recipeCache: {},
  _annotate: false,
  _termRegex: null,

  // 关键烹饪术语（详细做法中会被"画线"标注，像教科书笔记）
  _getTermRegex() {
    if (this._termRegex) return this._termRegex;
    const terms = [
      "热锅凉油", "中小火", "中大火", "炒糖色",
      "焯水", "腌制", "去腥", "去膻", "飞水",
      "大火", "小火", "中火", "火候", "油温",
      "勾芡", "芡汁", "复炸", "上浆", "挂糊",
      "收汁", "爆香", "定型", "翻面",
      "滑嫩", "酥烂", "焦黄", "焦脆",
    ];
    terms.sort((a, b) => b.length - a.length);
    this._termRegex = new RegExp("(" + terms.join("|") + ")", "g");
    return this._termRegex;
  },

  // 加载并缓存通用技巧 markdown
  async _loadGeneral() {
    if (this._generalMd) return this._generalMd;
    const resp = await fetch("data/guides/general-techniques.md");
    if (!resp.ok) throw new Error("通用技巧加载失败");
    this._generalMd = await resp.text();
    return this._generalMd;
  },

  // 加载菜谱 id → 指南文件映射
  async _loadIndex() {
    if (this._index) return this._index;
    const resp = await fetch("data/guides/index.json");
    if (!resp.ok) throw new Error("指南索引加载失败");
    this._index = await resp.json();
    return this._index;
  },

  // 把通用技巧 markdown 按二级标题切分为章节
  _parseSections() {
    if (this._sections) return this._sections;
    const md = this._generalMd || "";
    const sections = [];
    const parts = md.split(/^## /m);
    for (let i = 1; i < parts.length; i++) {
      const nl = parts[i].indexOf("\n");
      const title = parts[i].slice(0, nl).trim();
      const body = parts[i].slice(nl + 1).trim();
      sections.push({ title, body });
    }
    this._sections = sections;
    return sections;
  },

  // 根据菜谱做法 + 食材匹配通用章节
  _matchSections(recipe) {
    const sections = this._parseSections();
    const matched = [];

    // 1. 技法章节：按 methodLabel 精确匹配
    const methodLabel = recipe.methodLabel || "";
    if (methodLabel) {
      const sec = sections.find((s) => s.title === `技法：${methodLabel}`);
      if (sec) matched.push(sec);
    }

    // 2. 食材处理章节：按核心食材关键词匹配
    const text = [
      recipe.title || "",
      ...(recipe.coreIngredients || []),
      ...(recipe.requiredIngredients || []),
    ].join(" ");

    const ingredientRules = [
      { section: "食材处理：猪肉", re: /猪肉|猪骨|猪排|猪里脊|猪肘|猪蹄|猪五花|猪腩|猪颈|猪舌|猪耳|猪肠|猪肝|猪腰|猪心|猪肺|猪板油|猪网油|五花|排骨|里脊|肉末|肉馅|肘子|蹄髈|蹄花|培根|火腿|腊肠|午餐肉|腊肉|咸肉/ },
      { section: "食材处理：牛肉", re: /牛肉|牛腩|肥牛|牛排|牛腱|牛里脊|牛百叶|牛肚|牛筋|牛尾|牛骨|牛舌|牛杂/ },
      { section: "食材处理：鸡肉", re: /鸡(?!蛋|精|汤|油)|鸡翅|鸡腿|鸡胸|鸡爪|鸡胗|鸡肝|鸡心|鸡架|土鸡|三黄鸡|乌鸡|童子鸡|老母鸡/ },
      { section: "食材处理：鱼虾水产", re: /鱼(?!露)|虾|蟹|贝|蛤|蛏|鱿|海参|鳕|鲈|桂鱼|鲫|鲤|鳊|翘嘴|生蚝|小龙虾|田螺|墨鱼|章鱼|鱿鱼|带鱼|黄花鱼|多宝鱼|石斑|鲑鱼|三文鱼|金枪鱼|鳗鱼|泥鳅|黄鳝|甲鱼|龟|牛蛙|田鸡/ },
      { section: "食材处理：蔬菜", re: /青菜|白菜|菠菜|芹菜|韭菜|生菜|油麦菜|空心菜|苋菜|芥蓝|菜心|西兰花|花菜|卷心菜|紫甘蓝|娃娃菜|茼蒿|香菜|香椿|芽菜|豆芽|豆角|四季豆|豇豆|荷兰豆|毛豆|蚕豆|豌豆|黄瓜|冬瓜|南瓜|丝瓜|苦瓜|茄子|番茄|西红柿|土豆|山药|芋头|红薯|紫薯|莲藕|萝卜|胡萝卜|白萝卜|青萝卜|竹笋|芦笋|莴笋|茭白|玉米|青椒|红椒|彩椒|尖椒|线椒|螺丝椒|洋葱|大葱|小葱|蒜苗|蒜苔|韭黄|菌|菇|香菇|平菇|金针菇|杏鲍菇|口蘑|木耳|银耳|海带|紫菜|豆腐|豆干|豆皮|腐竹|千张|素鸡/ },
      { section: "食材处理：米饭面食", re: /米饭|炒饭|烩饭|焗饭|煲仔饭|粥|面条|拉面|刀削面|手擀面|挂面|意面|米粉|河粉|粉丝|粉条|凉粉|凉皮|米线|年糕|馒头|包子|饺子|馄饨|汤圆|烧卖|花卷|烙饼|煎饼|馕|吐司|面包|燕麦|糯米|粽子|汤圆|麻团|油条|烧饼|锅盔/ },
    ];
    for (const rule of ingredientRules) {
      if (rule.re.test(text)) {
        const sec = sections.find((s) => s.title === rule.section);
        if (sec) matched.push(sec);
      }
    }

    // 3. 油温与勾芡：炒/炸/烧/煎类菜谱附加
    if (["炒", "炸", "烧", "煎"].includes(methodLabel)) {
      const sec = sections.find((s) => s.title.startsWith("通用：油温与勾芡"));
      if (sec) matched.push(sec);
    }

    return matched;
  },

  // 轻量 markdown → HTML（标题/加粗/列表/表格/引用/分隔线/段落）
  renderMarkdown(md) {
    const esc = (s) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const inline = (s) => {
      let out = esc(s)
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/`([^`]+)`/g, "<code>$1</code>");
      if (this._annotate) {
        out = out.replace(this._getTermRegex(), '<u class="cg-mark">$1</u>');
      }
      return out;
    };

    const lines = md.split("\n");
    let html = "";
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // 空行
      if (!trimmed) { i++; continue; }

      // 分隔线
      if (/^-{3,}$/.test(trimmed)) { html += "<hr>"; i++; continue; }

      // 标题
      const h = trimmed.match(/^(#{1,4})\s+(.*)$/);
      if (h) {
        const level = h[1].length + 2; // # → h3, ## → h4, ### → h5
        html += `<h${level}>${inline(h[2])}</h${level}>`;
        i++; continue;
      }

      // 表格
      if (trimmed.startsWith("|")) {
        const rows = [];
        while (i < lines.length && lines[i].trim().startsWith("|")) {
          rows.push(lines[i].trim());
          i++;
        }
        const cells = (r) =>
          r.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        if (rows.length >= 2) {
          html += "<table><thead><tr>";
          for (const c of cells(rows[0])) html += `<th>${inline(c)}</th>`;
          html += "</tr></thead><tbody>";
          for (let r = 2; r < rows.length; r++) { // 跳过分隔行
            html += "<tr>";
            for (const c of cells(rows[r])) html += `<td>${inline(c)}</td>`;
            html += "</tr>";
          }
          html += "</tbody></table>";
        }
        continue;
      }

      // 无序列表
      if (/^[-*]\s+/.test(trimmed)) {
        html += "<ul>";
        while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
          html += `<li>${inline(lines[i].trim().replace(/^[-*]\s+/, ""))}</li>`;
          i++;
        }
        html += "</ul>";
        continue;
      }

      // 有序列表（允许条目之间有空行，保持编号连续）
      if (/^\d+[.、]\s*/.test(trimmed)) {
        html += "<ol>";
        while (i < lines.length) {
          const t = lines[i].trim();
          if (/^\d+[.、]\s*/.test(t)) {
            html += `<li>${inline(t.replace(/^\d+[.、]\s*/, ""))}</li>`;
            i++;
            continue;
          }
          if (!t) {
            let j = i + 1;
            while (j < lines.length && !lines[j].trim()) j++;
            if (j < lines.length && /^\d+[.、]\s*/.test(lines[j].trim())) {
              i = j;
              continue;
            }
          }
          break;
        }
        html += "</ol>";
        continue;
      }

      // 引用
      if (trimmed.startsWith(">")) {
        html += `<blockquote>${inline(trimmed.replace(/^>\s*/, ""))}</blockquote>`;
        i++; continue;
      }

      // 普通段落
      html += `<p>${inline(trimmed)}</p>`;
      i++;
    }
    return html;
  },

  // 加载单个菜谱的详细指南（带缓存）
  async _loadRecipeGuide(file) {
    if (this._recipeCache[file]) return this._recipeCache[file];
    const resp = await fetch(`data/guides/recipes/${encodeURIComponent(file)}`);
    if (!resp.ok) return null;
    const md = await resp.text();
    this._recipeCache[file] = md;
    return md;
  },

  // 构建面板 HTML：通用技法 + 菜谱笔记（原步骤 + markdown 标注）
  async buildGuideHTML(recipeTitle) {
    try {
      await Promise.all([this._loadGeneral(), this._loadIndex()]);

      const recipe =
        (typeof allRecipes !== "undefined" &&
          allRecipes.find((r) => r.title === recipeTitle)) ||
        { title: recipeTitle };

      // 获取原菜谱步骤（优先 allRecipes，其次 DOM）
      let steps = recipe.steps || [];
      if (steps.length === 0 && window.ChefAgent) {
        const domRecipe = ChefAgent.readCurrentRecipe();
        if (domRecipe) steps = domRecipe.steps || [];
      }

      let html = "";

      // 头部
      html += `<div class="cg-notebook-header">
        <span class="cg-notebook-icon">📝</span>
        <div>
          <div class="cg-notebook-title">${recipe.title} · 做菜笔记</div>
          <div class="cg-notebook-sub">原菜谱步骤 + 大厨标注笔记</div>
        </div>
      </div>`;

      // 做菜记忆
      if (window.ChefMemory) {
        const cooked = ChefMemory.getCookedRecipes();
        const mem = cooked.find((r) => r.title === recipe.title);
        if (mem) {
          const date = new Date(mem.lastCooked).toLocaleDateString();
          html += `<div class="cg-memory-note">
            <span class="cg-memory-icon">🧠</span>
            <span>你做过这道菜 ${mem.count} 次，上次 ${date}。</span>
          </div>`;
        }
      }

      // 通用技法（3 维度批注）
      const sections = this._matchSections(recipe);
      const ingredientSecs = sections.filter((s) => s.title.startsWith("食材处理"));
      const techniqueSecs = sections.filter((s) => s.title.startsWith("技法"));
      const generalSecs = sections.filter((s) => s.title.startsWith("通用"));
      this._annotate = false;
      if (ingredientSecs.length || techniqueSecs.length || generalSecs.length) {
        html += `<div class="cg-annotations">
          <div class="cg-annotations-label">📌 通用技法</div>`;
        for (const sec of ingredientSecs)
          html += this._renderAnnotationCard("🥩", sec.title.replace("食材处理：", ""), sec.body, "ingredient");
        for (const sec of techniqueSecs)
          html += this._renderAnnotationCard("🔥", sec.title.replace("技法：", ""), sec.body, "technique");
        for (const sec of generalSecs)
          html += this._renderAnnotationCard("💧", sec.title.replace("通用：", ""), sec.body, "general");
        html += `</div>`;
      }

      // 菜谱笔记：原菜谱步骤（书本）+ markdown 标注（笔记）
      const entry = this._index[recipe.id] ||
        Object.values(this._index).find((e) => e.title === recipeTitle);
      if (entry && steps.length > 0) {
        const md = await this._loadRecipeGuide(entry.file);
        if (md) {
          const parsed = this._parseRecipeMarkdown(md);
          const pool = [
            ...parsed.prep.map((t) => ({ text: t, section: "食材准备" })),
            ...parsed.steps.map((t) => ({ text: t, section: "详细做法" })),
            ...parsed.tips.map((t) => ({ text: t, section: "关键技巧" })),
            ...parsed.problems.map((t) => ({ text: t, section: "常见问题" })),
          ];

          // 全局匹配：按关键词重合度评分，贪心分配
          const allPairs = [];
          for (let si = 0; si < steps.length; si++) {
            const stepKw = new Set(this._extractKeywords(steps[si]));
            if (stepKw.size === 0) continue;
            for (let pi = 0; pi < pool.length; pi++) {
              const noteKw = this._extractKeywords(pool[pi].text);
              const overlap = noteKw.filter((k) => stepKw.has(k));
              if (overlap.length > 0)
                allPairs.push({ si, pi, score: overlap.length });
            }
          }
          allPairs.sort((a, b) => b.score - a.score);

          const stepNotes = steps.map(() => []);
          const usedIndices = new Set();
          const maxPerStep = 3;
          for (const pair of allPairs) {
            if (usedIndices.has(pair.pi)) continue;
            if (stepNotes[pair.si].length >= maxPerStep) continue;
            stepNotes[pair.si].push(pool[pair.pi]);
            usedIndices.add(pair.pi);
          }

          // 渲染：原步骤（带红色下划线锚点）+ 绿色引线批注
          html += `<div class="cg-recipe-notes">
            <div class="cg-recipe-notes-label">烹饪步骤</div>`;
          for (let si = 0; si < steps.length; si++) {
            const notes = stepNotes[si];
            // 为步骤文本中的锚点词加红色下划线
            const highlightedStep = this._highlightStepText(steps[si], notes);
            html += `<div class="cg-step-block">
              <div class="cg-step-text">
                <span class="cg-step-num">${si + 1}</span>
                <span class="cg-step-content">${highlightedStep}</span>
              </div>`;
            if (notes.length > 0) {
              html += `<div class="cg-notes-wrapper">`;
              for (const note of notes) {
                html += `<div class="cg-annotation-bubble">
                  <span class="cg-anno-dot"></span>
                  <span class="cg-step-note-tag">${note.section}</span>
                  <span class="cg-anno-text">${this.renderMarkdownInline(note.text)}</span>
                </div>`;
              }
              html += `</div>`;
            }
            html += `</div>`;
          }
          html += `</div>`;

          // 补充笔记
          const remaining = pool.filter((_, idx) => !usedIndices.has(idx)).slice(0, 8);
          if (remaining.length > 0) {
            html += `<div class="cg-supplementary">
              <div class="cg-supplementary-label">附加内容</div>`;
            for (const note of remaining) {
              html += `<div class="cg-supplementary-note">
                <span class="cg-step-note-tag">${note.section}</span>
                <span>${this.renderMarkdownInline(note.text)}</span>
              </div>`;
            }
            html += `</div>`;
          }
        }
      }

      return html || `<div class="chef-guide-empty">暂无这道菜的烹饪指南</div>`;
    } catch (e) {
      return `<div class="chef-guide-empty">烹饪指南加载失败：${e.message}</div>`;
    }
  },

  // 渲染单张批注卡片（左侧色条 + 图标 + 标题 + 正文）
  _renderAnnotationCard(icon, name, body, type) {
    return `<div class="cg-anno-card ${type}">
      <div class="cg-anno-card-head"><span>${icon}</span><span>${name}</span></div>
      <div class="cg-anno-card-body">${this.renderMarkdown(body)}</div>
    </div>`;
  },

  // HTML 转义
  _escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  },

  // 找步骤文本中的锚点词：从笔记中找在步骤里出现的最长有意义短语
  _findAnchorPhrase(stepText, noteText) {
    const badTail = new Set([
      "朝","让","用","在","把","从","向","到","给","对","为","与","和","等",
      "着","过","的","了","一","不","也","就","才","很","最","再","又","还",
      "将","被","比","按","照","据","沿","顺","经","靠",
      "轻","轻","大","小","多","少","好","快","慢","高","低","长","短","厚","薄",
      "太","非","未","已","正","刚","恰","稍","略","些","点",
    ]);
    const badHead = new Set(["的","了","在","是","和","与","或","而","但","如","以","为","对","从","到","被","把","将","让","向","朝","给","跟","比","按","照"]);
    // 把笔记按标点/空格切分，提取所有中文片段
    const segments = noteText.split(/[，。；：！？、\s\d\.a-zA-Z,;:!?""'()（）\[\]【】%℃~\-—…·]+/).filter(Boolean);
    const candidates = new Set();
    for (const seg of segments) {
      const chinese = seg.replace(/[^\u4e00-\u9fa5]/g, "");
      if (chinese.length < 2) continue;
      // 取 2-5 字的子串（避免过长标注）
      for (let len = Math.min(5, chinese.length); len >= 2; len--) {
        for (let i = 0; i <= chinese.length - len; i++) {
          const sub = chinese.slice(i, i + len);
          if (!badTail.has(sub[sub.length - 1]) && !badHead.has(sub[0])) {
            candidates.add(sub);
          }
        }
      }
    }
    // 按长度降序，找第一个在步骤中出现的
    const sorted = [...candidates].sort((a, b) => b.length - a.length);
    for (const cand of sorted) {
      if (stepText.includes(cand)) return cand;
    }
    return "";
  },

  // 在步骤文本中给锚点词加红色下划线（合并重叠/相邻的锚点）
  _highlightStepText(stepText, notes) {
    const anchors = [];
    for (const note of notes) {
      const anchor = this._findAnchorPhrase(stepText, note.text);
      if (anchor && anchor.length >= 2) anchors.push(anchor);
    }
    if (anchors.length === 0) return this._escapeHtml(stepText);
    // 在原文本中找到每个锚点的位置（每个锚点只取第一次出现）
    const positions = [];
    const used = new Set();
    for (const a of anchors) {
      const idx = stepText.indexOf(a);
      if (idx !== -1 && !used.has(a)) {
        positions.push({ start: idx, end: idx + a.length });
        used.add(a);
      }
    }
    if (positions.length === 0) return this._escapeHtml(stepText);
    // 按起始位置排序，合并重叠/相邻但不跨标点的区间
    positions.sort((a, b) => a.start - b.start);
    const merged = [positions[0]];
    const punctRE = /[，。；：！？、,;:!?""'()（）\[\]【】\s]/;
    for (let i = 1; i < positions.length; i++) {
      const last = merged[merged.length - 1];
      const cur = positions[i];
      // 检查间隔中是否有标点
      const gap = stepText.slice(last.end, cur.start);
      if (cur.start <= last.end + 2 && !punctRE.test(gap)) {
        last.end = Math.max(last.end, cur.end);
      } else {
        merged.push(cur);
      }
    }
    // 从后往前切片，转义各段再拼接 u 标签
    let result = "";
    let cursor = stepText.length;
    for (let i = merged.length - 1; i >= 0; i--) {
      const { start, end } = merged[i];
      const after = stepText.slice(end, cursor);   // 锚点后面的文本
      const marked = stepText.slice(start, end);   // 锚点本身
      result =
        '<u class="cg-underline">' + this._escapeHtml(marked) + "</u>" +
        this._escapeHtml(after) +
        result;
      cursor = start;
    }
    result = this._escapeHtml(stepText.slice(0, cursor)) + result;
    return result;
  },

  // 内联 markdown 渲染（用于批注气泡内，不产生块级元素）
  renderMarkdownInline(text) {
    const esc = (s) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    let out = esc(text);
    out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
    // 把冒号后的内容略做分段处理
    out = out.replace(/：/g, "：");
    return out;
  },

  // 解析菜谱 markdown，拆分为各章节的笔记单元
  _parseRecipeMarkdown(md) {
    const result = { prep: [], steps: [], tips: [], problems: [], variations: [] };
    const body = md.replace(/^#\s+.*\n/, "");
    const sections = body.split(/^## /m);
    for (let i = 1; i < sections.length; i++) {
      const nl = sections[i].indexOf("\n");
      const title = sections[i].slice(0, nl).trim();
      const content = sections[i].slice(nl + 1).trim();
      let bucket = null;
      if (/食材|准备|处理/.test(title)) bucket = result.prep;
      else if (/详细做法|做法|步骤/.test(title)) bucket = result.steps;
      else if (/关键技巧|技巧|要点/.test(title)) bucket = result.tips;
      else if (/常见问题|问题|注意/.test(title)) bucket = result.problems;
      else if (/变化做法|变化|延伸|拓展/.test(title)) bucket = result.variations;
      if (!bucket) continue;

      const lines = content.split("\n");
      let current = "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) { if (current) { bucket.push(current); current = ""; } continue; }
        if (/^\*\*.+\*\*$/.test(trimmed)) { if (current) { bucket.push(current); current = ""; } continue; }
        if (/^[-*]\s+/.test(trimmed) || /^\d+[.、]\s*/.test(trimmed)) {
          if (current) { bucket.push(current); }
          current = trimmed.replace(/^[-*]\s+/, "").replace(/^\d+[.、]\s*/, "");
        } else {
          current = current ? current + " " + trimmed : trimmed;
        }
      }
      if (current) { bucket.push(current); }
    }
    return result;
  },

  _notesActive: false,
  _originalStepHtml: null,

  // 共享逻辑：为步骤数组匹配笔记，返回 stepNotes 二维数组
  async _matchNotesToSteps(steps, recipe) {
    await Promise.all([this._loadGeneral(), this._loadIndex()]);
    const entry = this._index[recipe.id] ||
      Object.values(this._index).find((e) => e.title === recipe.title);
    if (!entry) return steps.map(() => []);
    const md = await this._loadRecipeGuide(entry.file);
    if (!md) return steps.map(() => []);
    const parsed = this._parseRecipeMarkdown(md);
    const pool = [
      ...parsed.prep.map((t) => ({ text: t, section: "食材准备" })),
      ...parsed.steps.map((t) => ({ text: t, section: "详细做法" })),
      ...parsed.tips.map((t) => ({ text: t, section: "关键技巧" })),
      ...parsed.problems.map((t) => ({ text: t, section: "常见问题" })),
    ];
    const allPairs = [];
    for (let si = 0; si < steps.length; si++) {
      const stepKw = new Set(this._extractKeywords(steps[si]));
      if (stepKw.size === 0) continue;
      for (let pi = 0; pi < pool.length; pi++) {
        const noteKw = this._extractKeywords(pool[pi].text);
        const overlap = noteKw.filter((k) => stepKw.has(k));
        if (overlap.length > 0)
          allPairs.push({ si, pi, score: overlap.length });
      }
    }
    allPairs.sort((a, b) => b.score - a.score);
    const stepNotes = steps.map(() => []);
    const usedIndices = new Set();
    const maxPerStep = 3;
    for (const pair of allPairs) {
      if (usedIndices.has(pair.pi)) continue;
      if (stepNotes[pair.si].length >= maxPerStep) continue;
      stepNotes[pair.si].push(pool[pair.pi]);
      usedIndices.add(pair.pi);
    }
    return stepNotes;
  },

  // 构建「大厨总结」面板 HTML（默认厨师AI总结 + 自定义厨师总结）
  async buildSummaryHTML(recipeTitle) {
    // 检查是否有启用的厨师
    const enabledChefs = ChefManager.getEnabled();
    if (enabledChefs.length === 0) {
      return `<div class="chef-guide-empty">当前大厨功能还未启用</div>`;
    }
    try {
      const recipe =
        (typeof allRecipes !== "undefined" &&
          allRecipes.find((r) => r.title === recipeTitle)) ||
        { title: recipeTitle };
      let html = "";
      html += `<div class="cg-notebook-header">
        <span class="cg-notebook-icon">📌</span>
        <div>
          <div class="cg-notebook-title">${recipe.title} · 大厨总结</div>
          <div class="cg-notebook-sub">3个要点 + 2个坑 + 1个升级</div>
        </div>
      </div>`;
      if (window.ChefMemory) {
        const cooked = ChefMemory.getCookedRecipes();
        const mem = cooked.find((r) => r.title === recipe.title);
        if (mem) {
          const date = new Date(mem.lastCooked).toLocaleDateString();
          html += `<div class="cg-memory-note">
            <span class="cg-memory-icon">🧠</span>
            <span>你做过这道菜 ${mem.count} 次，上次 ${date}。</span>
          </div>`;
        }
      }

      let hasContent = false;

      // 1. 默认大厨总结：AI针对该菜谱生成（3+2+1格式），带缓存
      if (ChefManager.isEnabled(ChefManager.DEFAULT_CHEF_ID)) {
        hasContent = true;
        const cacheKey = `chef_summary_${recipe.id || recipe.title}`;
        let cached = null;
        try {
          cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
        } catch (e) { cached = null; }

        if (cached && cached.text) {
          html += `<div class="cg-ai-summary" style="border-left:3px solid #3cb371;padding-left:12px;margin-top:12px;">
            <div style="font-size:13px;font-weight:600;color:#3cb371;margin-bottom:10px;">👨‍🍳 默认大厨总结</div>
            <div class="cg-ai-summary-content">${this.renderMarkdown(cached.text)}</div>
          </div>`;
        } else {
          // 显示加载中，同时触发异步生成
          const loadingId = `ai_summary_loading_${Date.now()}`;
          html += `<div class="cg-ai-summary" id="${loadingId}" style="border-left:3px solid #3cb371;padding-left:12px;margin-top:12px;">
            <div style="font-size:13px;font-weight:600;color:#3cb371;margin-bottom:10px;">👨‍🍳 默认大厨总结</div>
            <div style="color:var(--text-muted);font-size:14px;display:flex;align-items:center;gap:8px;">
              <span class="loading-spinner" style="width:16px;height:16px;border-width:2px;"></span>
              大厨正在总结这道菜的要点...
            </div>
          </div>`;
          // 异步生成AI总结
          setTimeout(async () => {
            try {
              const ingredients = (recipe.coreIngredients || recipe.ingredients || []).join("、");
              const steps = (recipe.steps || []).join("；");
              const prompt = `你是一位经验丰富的中餐大厨，现在要给用户总结「${recipe.title}」这道菜的关键要点。

这道菜的食材：${ingredients}
这道菜的步骤：${steps}

请严格按照以下格式输出总结，只针对这道菜，不要输出无关内容（不要提其他菜、不要提叶菜/土豆/勾芡/上浆等不相关技法，除非这道菜确实用到）：

## 最重要的3个点
1. （第一点，一句话说清楚核心关键）
2. （第二点）
3. （第三点）

## 最容易失败的2个点
1. （第一个坑，具体说是什么问题以及如何避免）
2. （第二个坑）

## 下次可以升级的1个点
1. （具体可操作的一个改进方向，比如调味、火候、搭配等，不要泛泛而谈）

要求：语言简洁接地气，像大厨说话，每点不要超过2行。`;
              const aiText = await callAI(prompt, "chef_summary");
              // 缓存结果
              localStorage.setItem(cacheKey, JSON.stringify({ text: aiText, time: Date.now() }));
              // 更新DOM
              const el = document.getElementById(loadingId);
              if (el) {
                el.innerHTML = `<div style="font-size:13px;font-weight:600;color:#3cb371;margin-bottom:10px;">👨‍🍳 默认大厨总结</div>
                <div class="cg-ai-summary-content">${this.renderMarkdown(aiText)}</div>`;
              }
            } catch (e) {
              console.error("AI总结生成失败", e);
              const el = document.getElementById(loadingId);
              if (el) {
                el.innerHTML = `<div style="font-size:13px;font-weight:600;color:#3cb371;margin-bottom:10px;">👨‍🍳 默认大厨总结</div>
                <div style="color:#999;font-size:13px;">总结生成失败，请稍后重试</div>
                <button onclick="this.parentElement.remove();ChefGuides.buildSummaryHTML('${recipeTitle}').then(html=>{this.closest('.chef-guide-section').querySelector('.chef-guide-content').innerHTML=html;})" style="margin-top:8px;padding:4px 12px;border:1px solid #3cb371;border-radius:8px;background:white;color:#3cb371;font-size:12px;cursor:pointer;">重试</button>`;
              }
            }
          }, 100);
        }
      }

      // 2. 自定义大厨总结
      const customSummaries = ChefManager.getEnabledChefSummariesForRecipe(recipeTitle);
      for (const { chef, summary } of customSummaries) {
        if (!chef.isDefault && summary) {
          hasContent = true;
          const avatarHtml = chef.avatar
            ? `<img src="${chef.avatar}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;vertical-align:middle;" />`
            : "🧑‍🍳";
          html += `<div class="cg-custom-summary-block" style="border-left:3px solid ${chef.color};padding-left:12px;margin-top:16px;">`;
          html += `<div style="font-size:13px;font-weight:600;color:${chef.color};margin-bottom:8px;">${avatarHtml} ${chef.name}的总结</div>`;
          // 润色后内容
          html += `<div class="cg-custom-note-content">${this.renderMarkdown(this._fillEmptySections(summary))}</div>`;
          // 原始内容（润色前）
          const note = chef.recipes.find(r => r.title === recipeTitle);
          if (note && note.rawSummary && note.rawSummary.trim() && note.rawSummary.trim() !== summary.trim()) {
            html += `<div class="cg-raw-content-block">`;
            html += `<div class="cg-raw-content-label">原始输入</div>`;
            html += `<div class="cg-raw-content-text">${this.renderMarkdown(this._fillEmptySections(note.rawSummary))}</div>`;
            html += `</div>`;
          }
          html += `</div>`;
        }
      }

      if (!hasContent) {
        html += `<div class="chef-guide-empty">暂无这道菜的大厨总结</div>`;
      }
      return html;
    } catch (e) {
      return `<div class="chef-guide-empty">大厨总结加载失败：${e.message}</div>`;
    }
  },

  // 「大厨笔记」：在原菜谱页面注入所有启用厨师的笔记（默认绿色 + 自定义彩色）
  async injectNotesToPage(recipeTitle) {
    // 检查是否有启用的厨师
    const enabledChefs = ChefManager.getEnabled();
    if (enabledChefs.length === 0) return false;

    if (this._notesActive) this.clearNotesFromPage();
    const recipe =
      (typeof allRecipes !== "undefined" &&
        allRecipes.find((r) => r.title === recipeTitle)) ||
      { title: recipeTitle };
    const stepItems = document.querySelectorAll(".recipe-detail .step-item, .recipe-detail-body .step-item");
    if (stepItems.length === 0) return false;
    const steps = [];
    stepItems.forEach((item) => {
      const textEl = item.querySelector(".step-text");
      steps.push(textEl ? textEl.textContent.trim() : "");
    });

    // 保存原始HTML用于恢复
    this._originalStepHtml = [];
    stepItems.forEach((item) => {
      const textEl = item.querySelector(".step-text");
      if (!textEl) return;
      this._originalStepHtml.push({ item, textEl, originalHtml: textEl.innerHTML, afterEls: [] });
    });

    let hasAnyNotes = false;

    // 1. 默认大厨笔记（跟随大厨颜色，从markdown文件加载）
    if (ChefManager.isEnabled(ChefManager.DEFAULT_CHEF_ID)) {
      const defaultChef = ChefManager.getDefault();
      const defaultColor = (defaultChef && defaultChef.color) || "#3cb371";
      const stepNotes = await this._matchNotesToSteps(steps, recipe);
      stepItems.forEach((item, si) => {
        const textEl = item.querySelector(".step-text");
        if (!textEl) return;
        const notes = stepNotes[si];
        if (notes && notes.length > 0) {
          hasAnyNotes = true;
          // 高亮步骤文本
          const currentHtml = textEl.innerHTML;
          textEl.innerHTML = this._highlightStepText(steps[si], notes);
          // 构建批注容器（跟随大厨颜色）
          const wrapper = this._buildNotesWrapper(notes, defaultColor);
          const notesContainer = document.createElement("div");
          notesContainer.className = "cg-page-notes-container";
          notesContainer.appendChild(wrapper);
          item.parentNode.insertBefore(notesContainer, item.nextSibling);
          const entry = this._originalStepHtml.find(e => e.item === item);
          if (entry) entry.afterEls.push(notesContainer);
        }
      });
    }

    // 2. 自定义大厨笔记（各厨师自有颜色，从用户输入内容匹配）
    const customNotes = ChefManager.getEnabledChefNotesForRecipe(recipeTitle);
    console.log("[ChefGuides] 自定义大厨笔记:", customNotes.length, "条", "for recipe:", recipeTitle);
    for (const { chef, note } of customNotes) {
      if (!chef.isDefault && note.content) {
        console.log("[ChefGuides] 处理厨师:", chef.name, "content长度:", note.content.length, "content前80字:", note.content.substring(0, 80));
        const customStepNotes = this._matchCustomNotesToSteps(steps, note.content);
        const totalMatches = customStepNotes.reduce((s, n) => s + n.length, 0);
        console.log("[ChefGuides] 匹配结果:", totalMatches, "条笔记");
        stepItems.forEach((item, si) => {
          const textEl = item.querySelector(".step-text");
          if (!textEl) return;
          const notes = customStepNotes[si];
          if (notes && notes.length > 0) {
            hasAnyNotes = true;
            // 如果默认厨师没有高亮过，需要高亮
            const currentText = textEl.textContent.trim();
            if (!textEl.querySelector("u.cg-underline")) {
              textEl.innerHTML = this._highlightStepText(currentText, notes);
            }
            // 构建批注容器（厨师自有颜色）
            const wrapper = this._buildNotesWrapper(notes, chef.color, chef.name);
            const notesContainer = document.createElement("div");
            notesContainer.className = "cg-page-notes-container";
            notesContainer.appendChild(wrapper);
            item.parentNode.insertBefore(notesContainer, item.nextSibling);
            const entry = this._originalStepHtml.find(e => e.item === item);
            if (entry) entry.afterEls.push(notesContainer);
          }
        });

        // 原始内容只显示一次，放在最后一个步骤后面
        const hasRaw = note.rawContent && note.rawContent.trim() && note.rawContent.trim() !== note.content.trim();
        if (hasRaw && stepItems.length > 0) {
          const lastItem = stepItems[stepItems.length - 1];
          const rawBlock = document.createElement("div");
          rawBlock.className = "cg-page-notes-container chef-notes-custom";
          rawBlock.style.setProperty("--cg-color", chef.color);
          const rawInner = document.createElement("div");
          rawInner.className = "cg-page-notes-wrapper";
          rawInner.style.setProperty("--cg-color", chef.color);
          rawInner.innerHTML =
            '<div class="cg-page-annotation-bubble" style="color:' + chef.color + '">' +
            '<span class="cg-step-note-tag">' + chef.name + ' · 原始输入</span>' +
            '<div class="cg-raw-content-text">' + this.renderMarkdown(this._fillEmptySections(note.rawContent)) + '</div>' +
            '</div>';
          rawBlock.appendChild(rawInner);
          // 找到最后一个步骤的下一个兄弟元素，插入到它后面
          const afterLast = lastItem.nextElementSibling;
          if (afterLast) {
            lastItem.parentNode.insertBefore(rawBlock, afterLast);
          } else {
            lastItem.parentNode.appendChild(rawBlock);
          }
          const entry = this._originalStepHtml.find(e => e.item === lastItem);
          if (entry) entry.afterEls.push(rawBlock);
        }
      }
    }

    this._notesActive = true;
    document.body.classList.add("chef-notes-active");
    return hasAnyNotes;
  },

  // 构建批注容器（支持自定义颜色和厨师名）
  _buildNotesWrapper(notes, color, chefName) {
    const wrapper = document.createElement("div");
    wrapper.className = "cg-page-notes-wrapper";
    if (chefName) wrapper.classList.add("cg-page-notes-custom");
    // 始终设置 --cg-color，使默认大厨笔记也能跟随大厨颜色
    wrapper.style.setProperty("--cg-color", color);
    for (const note of notes) {
      const bubble = document.createElement("div");
      bubble.className = "cg-page-annotation-bubble";
      bubble.style.setProperty("--cg-color", color);
      const tagText = chefName ? `${chefName}·${note.section}` : note.section;
      bubble.innerHTML =
        '<span class="cg-anno-dot"></span>' +
        '<span class="cg-step-note-tag">' + tagText + "</span>" +
        '<span class="cg-anno-text">' + this.renderMarkdownInline(note.text) + "</span>";
      wrapper.appendChild(bubble);
    }
    return wrapper;
  },

  // 填充空标题部分为"暂无"（用于自定义大厨内容渲染）
  _fillEmptySections(md) {
    const lines = md.split("\n");
    const result = [];
    for (let i = 0; i < lines.length; i++) {
      result.push(lines[i]);
      // 如果是 ## 标题行，检查后面是否有内容
      if (/^##\s+/.test(lines[i].trim())) {
        let j = i + 1;
        let hasContent = false;
        while (j < lines.length && !/^##\s+/.test(lines[j].trim())) {
          if (lines[j].trim()) { hasContent = true; break; }
          j++;
        }
        if (!hasContent) {
          result.push("暂无");
        }
      }
    }
    return result.join("\n");
  },

  // 匹配自定义厨师笔记到步骤（从用户输入的markdown文本）
  // 分类步骤类型：prep=备料, cook=烹饪, other=其他
  _classifyStepType(stepText) {
    const prepKw = /切|丝|片|丁|块|条|末|腌|渍|泡|洗|净|剥|削|剁|碎|抹|涂|裹|沾|蘸|拌|绞|撕|择|理|浸泡|焯水|去皮|去骨|去腥/;
    const cookKw = /炒|煎|炸|蒸|煮|炖|焖|烧|烤|扒|焗|爆|煸|熘|烩|焖|熬|汆|烫|焯|煸|锅|油|火|大火|小火|中火|热锅|温油|爆香|翻炒|收汁|勾芡|淋油|出锅|装盘/;
    if (prepKw.test(stepText) && !cookKw.test(stepText)) return "prep";
    if (cookKw.test(stepText)) return "cook";
    return "other";
  },

  _matchCustomNotesToSteps(steps, noteContent) {
    const parsed = this._parseRecipeMarkdown(noteContent);
    let pool = [
      ...parsed.prep.map((t) => ({ text: t, section: "食材准备" })),
      ...parsed.steps.map((t) => ({ text: t, section: "详细做法" })),
      ...parsed.tips.map((t) => ({ text: t, section: "关键技巧" })),
      ...parsed.problems.map((t) => ({ text: t, section: "常见问题" })),
    ];

    // 回退：如果 markdown 解析结果为空（纯文本内容未经AI处理），
    // 按行分割，每行作为一条笔记
    if (pool.length === 0) {
      const lines = noteContent.split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !/^#{1,6}\s/.test(l) && l.length > 3);
      pool = lines.map((text) => ({ text, section: "笔记" }));
    }

    // 最终仍为空则返回空
    if (pool.length === 0) return steps.map(() => []);

    // 分类每个步骤的类型
    const stepTypes = steps.map((s) => this._classifyStepType(s));
    const firstPrepIdx = stepTypes.indexOf("prep");
    const firstCookIdx = stepTypes.indexOf("cook");
    const lastStepIdx = steps.length - 1;

    // 分区匹配：不同section的笔记只匹配对应类型的步骤
    const stepNotes = steps.map(() => []);
    const usedIndices = new Set();
    const maxPerStep = 3;

    // 按section分组
    const sections = ["食材准备", "详细做法", "关键技巧", "常见问题", "笔记"];
    for (const section of sections) {
      const sectionNotes = pool
        .map((n, idx) => ({ ...n, idx }))
        .filter((n) => n.section === section && !usedIndices.has(n.idx));
      if (sectionNotes.length === 0) continue;

      // 确定该section可匹配的步骤范围
      let candidateSteps;
      if (section === "食材准备") {
        candidateSteps = firstPrepIdx >= 0 ? [firstPrepIdx] : [0];
      } else if (section === "详细做法") {
        candidateSteps = firstCookIdx >= 0 ? stepTypes.map((t, i) => t === "cook" ? i : -1).filter(i => i >= 0) : [lastStepIdx];
      } else {
        // 关键技巧/常见问题/笔记 → 匹配所有步骤
        candidateSteps = steps.map((_, i) => i);
      }

      // 先尝试关键词匹配
      const pairs = [];
      for (const si of candidateSteps) {
        const stepKw = new Set(this._extractKeywords(steps[si]));
        if (stepKw.size === 0) continue;
        for (const n of sectionNotes) {
          const noteKw = this._extractKeywords(n.text);
          const overlap = noteKw.filter((k) => stepKw.has(k));
          if (overlap.length > 0)
            pairs.push({ si, note: n, score: overlap.length });
        }
      }

      pairs.sort((a, b) => b.score - a.score);
      for (const pair of pairs) {
        if (usedIndices.has(pair.note.idx)) continue;
        if (stepNotes[pair.si].length >= maxPerStep) continue;
        stepNotes[pair.si].push(pair.note);
        usedIndices.add(pair.note.idx);
      }

      // 未匹配的笔记：分配到该section的默认步骤
      for (const n of sectionNotes) {
        if (usedIndices.has(n.idx)) continue;
        let targetIdx;
        if (section === "食材准备") {
          targetIdx = firstPrepIdx >= 0 ? firstPrepIdx : 0;
        } else if (section === "详细做法") {
          targetIdx = firstCookIdx >= 0 ? firstCookIdx : lastStepIdx;
        } else {
          targetIdx = lastStepIdx;
        }
        if (stepNotes[targetIdx].length < maxPerStep) {
          stepNotes[targetIdx].push(n);
          usedIndices.add(n.idx);
        }
      }
    }

    return stepNotes;
  },

  // 清除页面上的大厨笔记，恢复原样
  clearNotesFromPage() {
    if (!this._notesActive || !this._originalStepHtml) return;
    for (const { textEl, originalHtml, afterEls } of this._originalStepHtml) {
      if (textEl) textEl.innerHTML = originalHtml;
      if (afterEls) {
        for (const el of afterEls) {
          if (el && el.parentNode) el.parentNode.removeChild(el);
        }
      }
    }
    this._originalStepHtml = null;
    this._notesActive = false;
    document.body.classList.remove("chef-notes-active");
  },

  // 当前是否处于笔记模式
  isNotesActive() {
    return this._notesActive;
  },

  // 提取中文关键词：2-gram 滑动窗口（中文无空格，需拆成二元词组）
  _extractKeywords(text) {
    const chinese = text.replace(/[^\u4e00-\u9fa5]/g, "");
    const stop = new Set([
      "备用","然后","这一","不要","可以","一下","轻轻","就是","这样",
      "一个","准备","进行","直接","同时","最后","首先","已经","时候",
      "时间","适量","少许","大约","需要","主要","方便","放入","锅中",
      "均匀","分钟","左右","即可","不够","记得","另外","表面","出来",
      "接着","没有","不能","还是","或者","比如","例如","现在","开始",
      "一直","部分","里面","上面","下面","前面","后面","中间","一次",
      "以后","以前","之前","之后","因为","所以","但是","不过","如果",
      "尽量","最好","建议","推荐","比较","非常","特别","稍微","略微",
      // 常见非烹饪 2-gram，容易产生误匹配
      "不超","超过","不到","不可","不太","不会","不一","不足",
      "大小","多少","以下","以上","以外","以内","此时","此刻",
      "这种","那种","各种","这种","那种","什么","怎么","为什么",
      "为了","什么","如何","是否","是否","应该","应当","必须",
      "可以","能够","使得","使用","利用","通过","这种","方式",
      "时候","情况","问题","方面","方法","过程","结果","效果",
      "导致","引起","造成","出现","发生","变成","成为","形成",
      "同样","不同","相同","类似","大概","也许","可能","似乎",
      "得到","做到","完成","结束","继续","停止","开始","保持",
      "加入","倒入","放入","盛盘","出锅","关火","开火", // 动作太泛，所有步骤都有
    ]);
    const terms = new Set();
    for (let i = 0; i < chinese.length - 1; i++) {
      const t = chinese.slice(i, i + 2);
      if (!stop.has(t)) terms.add(t);
    }
    return [...terms];
  },
};

if (typeof window !== "undefined") {
  window.ChefGuides = ChefGuides;
}
