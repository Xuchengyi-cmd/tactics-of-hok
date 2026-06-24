/**
 * ai.js — AI战术分析引擎
 * Captures tactical state → builds prompt → calls API → displays analysis
 */

const AiEngine = {
  apiKey: '',
  provider: 'anthropic', // 'anthropic' | 'openai'

  init() {
    this.apiKey = localStorage.getItem('hok_ai_key') || '';
    this.provider = localStorage.getItem('hok_ai_provider') || 'anthropic';
    this.createPanel();
  },

  createPanel() {
    const tools = document.getElementById('tools-section');

    const sec = document.createElement('section');
    sec.id = 'ai-section';
    sec.innerHTML = '<h3>AI战术分析</h3>';

    // API Key input
    const keyRow = document.createElement('div');
    keyRow.style.cssText = 'margin-bottom:4px;';
    const keyInput = document.createElement('input');
    keyInput.id = 'ai-key';
    keyInput.type = 'password';
    keyInput.placeholder = '输入API Key';
    keyInput.value = this.apiKey;
    keyInput.style.cssText = 'width:100%;padding:4px 6px;font-size:10px;background:var(--bg-elevated);border:1px solid var(--border-default);color:var(--text-primary);border-radius:3px;margin-bottom:3px;';
    keyInput.addEventListener('change', () => {
      this.apiKey = keyInput.value;
      localStorage.setItem('hok_ai_key', this.apiKey);
    });
    keyRow.appendChild(keyInput);

    // Provider selector
    const provRow = document.createElement('div');
    provRow.style.cssText = 'display:flex;gap:3px;margin-bottom:4px;';
    ['deepseek','anthropic','openai'].forEach(p => {
      const b = document.createElement('button');
      b.textContent = p === 'deepseek' ? 'DeepSeek' : p === 'anthropic' ? 'Claude' : 'GPT';
      b.className = 'lane-filter-btn' + (p === this.provider ? ' active' : '');
      b.style.cssText = 'flex:1;padding:3px 4px;font-size:10px;';
      b.addEventListener('click', () => {
        this.provider = p;
        localStorage.setItem('hok_ai_provider', p);
        provRow.querySelectorAll('button').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
      });
      provRow.appendChild(b);
    });
    keyRow.appendChild(provRow);

    // Analyze button
    const btn = document.createElement('button');
    btn.id = 'btn-ai-analyze';
    btn.className = 'tool-btn';
    btn.textContent = ' 分析当前战术';
    btn.addEventListener('click', () => this.analyze());
    keyRow.appendChild(btn);

    sec.appendChild(keyRow);
    tools.appendChild(sec);

    // Results area
    const resultDiv = document.createElement('div');
    resultDiv.id = 'ai-result';
    resultDiv.style.cssText = 'margin-top:6px;font-size:11px;color:var(--text-secondary);max-height:300px;overflow-y:auto;display:none;';
    sec.appendChild(resultDiv);
  },

  async analyze() {
    if (!this.apiKey) {
      alert('请先输入API Key（Anthropic或OpenAI的API密钥）');
      return;
    }

    const resultDiv = document.getElementById('ai-result');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div style="color:var(--accent-gold);text-align:center;padding:12px;"> 分析中...</div>';

    const btn = document.getElementById('btn-ai-analyze');
    btn.disabled = true;
    btn.textContent = ' 分析中...';

    try {
      const prompt = this.buildPrompt();
      let analysis;

      if (this.provider === 'anthropic') {
        analysis = await this.callAnthropic(prompt);
      } else if (this.provider === 'deepseek') {
        analysis = await this.callDeepSeek(prompt);
      } else {
        analysis = await this.callOpenAI(prompt);
      }

      resultDiv.innerHTML = this.formatResult(analysis);
    } catch (err) {
      resultDiv.innerHTML = '<div style="color:var(--accent-red);padding:8px;"> 分析失败: ' + this._escape(err.message) + '</div>';
    }

    btn.disabled = false;
    btn.textContent = ' 分析当前战术';
  },

  buildPrompt() {
    const gs = window.GameState;
    const markers = window.MarkerEngine?.markers || [];
    const skills = window.SkillEngine?.skills || [];
    const paths = window.PathEngine?.paths || [];
    const minions = window.MinionEngine?.minions || [];
    const time = gs.time;
    const phase = time < 30 ? '开局准备' : time < 120 ? '对线期' : time < 240 ? '前期' : time < 600 ? '中期' : time < 1200 ? '后期' : '风暴龙王';

    let text = '你是王者荣耀职业教练，正在分析一套战术布局。\n\n';
    text += '【当前游戏时间】' + this._formatTime(time) + '（' + phase + '）\n\n';

    // Blue team heroes
    const blueMarkers = markers.filter(m => m.team === 'blue' && !m.isClone);
    const redMarkers = markers.filter(m => m.team === 'red' && !m.isClone);
    const blueClones = markers.filter(m => m.team === 'blue' && (m.isClone || m.disguiseOf));
    const redClones = markers.filter(m => m.team === 'red' && (m.isClone || m.disguiseOf));

    text += '【蓝方英雄】（' + blueMarkers.length + '人）\n';
    for (const m of blueMarkers) {
      text += '- ' + m.name + '(' + (window.ROLE_NAMES?.[m.role] || m.role) + '/Lv.' + m.level + ') 坐标(' + Math.round(m.x) + ',' + Math.round(m.y) + ')';
      if (m.ultActive) text += ' [大招强化中]';
      // Check carry
      const carrying = gs.carryLinks?.some(l => l.carrierId === m.id);
      const carried = gs.carryLinks?.some(l => l.carriedId === m.id);
      if (carrying) text += ' [托举队友中]';
      if (carried) text += ' [被托举]';
      // Check duel
      if (gs.duelLinks?.some(l => l.casterId === m.id || l.targetId === m.id)) text += ' [幻境对决中]';
      text += '\n';
    }
    if (blueClones.length) {
      text += '蓝方分身/伪装: ' + blueClones.map(m => m.name).join('、') + '\n';
    }
    text += '\n';

    text += '【红方英雄】（' + redMarkers.length + '人）\n';
    for (const m of redMarkers) {
      text += '- ' + m.name + '(' + (window.ROLE_NAMES?.[m.role] || m.role) + '/Lv.' + m.level + ') 坐标(' + Math.round(m.x) + ',' + Math.round(m.y) + ')';
      if (m.ultActive) text += ' [大招强化中]';
      const carrying = gs.carryLinks?.some(l => l.carrierId === m.id);
      const carried = gs.carryLinks?.some(l => l.carriedId === m.id);
      if (carrying) text += ' [托举队友中]';
      if (carried) text += ' [被托举]';
      if (gs.duelLinks?.some(l => l.casterId === m.id || l.targetId === m.id)) text += ' [幻境对决中]';
      text += '\n';
    }
    if (redClones.length) {
      text += '红方分身/伪装: ' + redClones.map(m => m.name).join('、') + '\n';
    }
    text += '\n';

    // Skills
    if (skills.length) {
      text += '【已部署技能范围】\n';
      for (const sk of skills) {
        const c = Math.round(Math.hypot(sk.endX - sk.startX, sk.endY - sk.startY));
        text += '- ' + (sk.label || '技能') + '(' + sk.type + '/范围' + c + ')';
        if (sk.followHeroId) text += ' [跟随英雄]';
        text += '\n';
      }
      text += '\n';
    }

    // Paths
    if (paths.length) {
      text += '【战术路径】\n';
      for (const p of paths) {
        text += '- ' + (p.label || '路径') + '(' + p.points.length + '个节点' + '/' + (p.team === 'red' ? '红' : '蓝') + '方)\n';
      }
      text += '\n';
    }

    // Minions
    if (minions.length) {
      const byLane = {};
      for (const m of minions) {
        const key = m.lane + '_' + m.team;
        if (!byLane[key]) byLane[key] = {};
        byLane[key][m.type] = (byLane[key][m.type] || 0) + 1;
      }
      text += '【已部署兵线】\n';
      for (const [key, counts] of Object.entries(byLane)) {
        const [lane, team] = key.split('_');
        const laneName = lane === 'clash' ? '对抗路' : lane === 'mid' ? '中路' : '发育路';
        text += '- ' + (team === 'red' ? '红' : '蓝') + '方' + laneName + ': ' + Object.entries(counts).map(([t,n]) => n + '个' + t).join('、') + '\n';
      }
      text += '\n';
    }

    // Suppression links
    if (gs.suppressionLinks?.length) {
      text += '【压制连线】' + gs.suppressionLinks.length + '条\n\n';
    }

    // Carry links
    if (gs.carryLinks?.length) {
      text += '【托举关系】' + gs.carryLinks.length + '组\n\n';
    }

    // Duel links
    if (gs.duelLinks?.length) {
      text += '【幻境对决】' + gs.duelLinks.length + '组（涉及的英雄暂时退出主战场）\n\n';
    }

    // Objectives
    text += '【地图目标状态】\n';
    text += '- 防御塔摧毁: ' + (gs.destroyedTowers?.length || 0) + '座\n';
    const killedCampCount = Object.keys(gs.killedCamps || {}).length;
    const killedDragonCount = Object.keys(gs.killedDragons || {}).length;
    text += '- 已击杀野怪: ' + killedCampCount + '处\n';
    text += '- 已击杀龙: ' + killedDragonCount + '次\n';
    text += '\n';

    text += '请从以下几个方面分析这套战术（用中文，分点回答，每点1-2句话，总计200-300字）：\n';
    text += '1. 双方阵容优劣势\n';
    text += '2. 当前布局的战术意图（蓝方想做什么）\n';
    text += '3. 红方应该如何应对\n';
    text += '4. 关键时间点的行动建议';

    return text;
  },

  async callAnthropic(prompt) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'API请求失败: ' + response.status);
    }

    const data = await response.json();
    return data.content[0].text;
  },

  async callDeepSeek(prompt) {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + this.apiKey,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'API请求失败: ' + response.status);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  },

  async callOpenAI(prompt) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + this.apiKey,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'API请求失败: ' + response.status);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  },

  formatResult(text) {
    // Simple markdown-like formatting
    let html = '<div style="color:var(--text-primary);line-height:1.6;white-space:pre-wrap;">';
    html += this._escape(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--accent-gold);">$1</strong>')
      .replace(/^- (.+)$/gm, '<div style="margin:2px 0;padding-left:8px;border-left:2px solid var(--accent-blue);">$1</div>')
      .replace(/^(\d+)\. (.+)$/gm, '<div style="margin:3px 0;padding-left:8px;"><strong style="color:var(--accent-blue);">$1.</strong> $2</div>');
    html += '</div>';
    return html;
  },

  _formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  },

  _escape(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};

window.AiEngine = AiEngine;
