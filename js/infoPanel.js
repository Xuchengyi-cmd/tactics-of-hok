/**
 * infoPanel.js — 右侧信息面板
 * 实时显示：游戏时间、龙状态、防御塔、野怪刷新、特殊点位
 */

const InfoPanel = {
  // ===== 初始化 =====
  init() {
    this.renderLegend();
    this.bindEvents();
  },

  // ===== 每帧更新（由 timeline 调用）=====
  update(gameTime) {
    this.updateTime(gameTime);
    this.updateDragons(gameTime);
    this.updateTowers(gameTime);
    this.updateJungle(gameTime);
    this.updateSpecials(gameTime);
  },

  // ===== 时间显示 =====
  updateTime(seconds) {
    document.getElementById('time-display').textContent = this.formatTime(seconds);
  },

  // ===== 龙状态 =====
  updateDragons(gameTime) {
    const container = document.getElementById('dragon-info');
    let html = '';

    for (const pit of DRAGON_PITS) {
      let currentStage = pit.stages[0];
      for (const stage of pit.stages) {
        if (gameTime >= stage.startTime) currentStage = stage;
      }

      const isActive = gameTime >= currentStage.startTime;
      const icon = pit.type === 'storm' ? '🌪️' : pit.type === 'tyrant' ? '🐲' : '🐉';
      const statusClass = isActive ? 'ready' : 'counting';
      const statusText = isActive ? '已刷新' :
        '⏳ ' + this.formatTime(currentStage.startTime - gameTime);

      html += `<div class="info-row">
        <span class="label">${icon} ${currentStage.name}</span>
        <span class="value ${statusClass}">${statusText}</span>
      </div>`;

      // 强化提示
      if (pit.type !== 'storm') {
        const enhanceTime = 600;
        const nextStage = pit.stages.find(s => s.startTime === 600);
        if (nextStage && gameTime >= 120 && gameTime < enhanceTime) {
          html += `<div class="info-row">
            <span class="label">  ↳ 强化倒计时</span>
            <span class="value counting">⏳ ${this.formatTime(enhanceTime - gameTime)}</span>
          </div>`;
        } else if (nextStage && gameTime >= enhanceTime) {
          html += `<div class="info-row">
            <span class="label">  ↳ 暗影形态</span>
            <span class="value ready">✅ 已强化</span>
          </div>`;
        }
      }
    }

    container.innerHTML = html;
  },

  // ===== 防御塔状态 =====
  updateTowers(gameTime) {
    const container = document.getElementById('tower-info');
    const shieldActive = gameTime < 240;
    const jungleProtected = gameTime < 240;

    let html = '';

    // 护盾状态
    html += `<div class="info-row">
      <span class="label">🛡️ 防御塔护盾</span>
      <span class="value ${shieldActive ? 'ready' : 'expired'}">${shieldActive ? '生效中' : '已消失'}</span>
    </div>`;

    if (shieldActive) {
      html += `<div class="info-row">
        <span class="label">  ↳ 剩余时间</span>
        <span class="value counting">⏳ ${this.formatTime(240 - gameTime)}</span>
      </div>`;
    }

    // 野区保护
    html += `<div class="info-row">
      <span class="label">🔰 野区保护</span>
      <span class="value ${jungleProtected ? 'ready' : 'expired'}">${jungleProtected ? '生效中' : '已消失'}</span>
    </div>`;

    // 统计已摧毁的塔
    if (window.GameState?.destroyedTowers?.length > 0) {
      html += `<div class="info-row">
        <span class="label">💥 已摧毁</span>
        <span class="value danger">${window.GameState.destroyedTowers.length}座</span>
      </div>`;
    }

    container.innerHTML = html;
  },

  // ===== 野怪状态 =====
  updateJungle(gameTime) {
    const container = document.getElementById('jungle-info');
    let html = '';

    // 首次刷新
    if (gameTime < 30) {
      html += `<div class="info-row">
        <span class="label">🌱 首次刷新</span>
        <span class="value counting">⏳ ${this.formatTime(30 - gameTime)}</span>
      </div>`;
    } else {
      // BUFF统计
      html += `<div class="info-row">
        <span class="label">💎 蓝BUFF</span>
        <span class="value ready">可争夺</span>
      </div>`;
      html += `<div class="info-row">
        <span class="label">🔴 红BUFF</span>
        <span class="value ready">可争夺</span>
      </div>`;
    }

    container.innerHTML = html;
  },

  // ===== 特殊点位 =====
  updateSpecials(gameTime) {
    // if user selected an element, keep showing its detail
    if (window.GameState?.selectedElement) return;
    const container = document.getElementById('special-info');
    let html = '';

    // 传送阵
    if (gameTime < 60) {
      html += `<div class="info-row">
        <span class="label">🌸 空间之灵</span>
        <span class="value counting">⏳ ${this.formatTime(60 - gameTime)}</span>
      </div>`;
    } else if (gameTime < 240) {
      html += `<div class="info-row">
        <span class="label">🌸 传送阵</span>
        <span class="value ready">可用</span>
      </div>`;
      html += `<div class="info-row">
        <span class="label">  ↳ 空间之灵停刷</span>
        <span class="value counting">⏳ ${this.formatTime(240 - gameTime)}</span>
      </div>`;
    } else if (gameTime < 600) {
      html += `<div class="info-row">
        <span class="label">🌸 传送阵</span>
        <span class="value ready">可用</span>
      </div>`;
    } else {
      html += `<div class="info-row">
        <span class="label">🌸 传送阵</span>
        <span class="value expired">已消失</span>
      </div>`;
    }

    // 红隼
    if (gameTime < 30) {
      html += `<div class="info-row">
        <span class="label">🦅 红隼</span>
        <span class="value counting">⏳ ${this.formatTime(30 - gameTime)}</span>
      </div>`;
    } else {
      html += `<div class="info-row">
        <span class="label">🦅 红隼</span>
        <span class="value ready">已出现</span>
      </div>`;
    }

    // 血包
    if (gameTime < 60) {
      html += `<div class="info-row">
        <span class="label">💊 血包</span>
        <span class="value counting">⏳ ${this.formatTime(60 - gameTime)}</span>
      </div>`;
    } else {
      html += `<div class="info-row">
        <span class="label">💊 血包</span>
        <span class="value ready">可拾取</span>
      </div>`;
    }

    // 视野之灵
    const hasBlueVision = window.GameState?.isT2Destroyed?.('blue', 'clash') ||
                          window.GameState?.isT2Destroyed?.('blue', 'farm');
    const hasRedVision = window.GameState?.isT2Destroyed?.('red', 'clash') ||
                         window.GameState?.isT2Destroyed?.('red', 'farm');

    if (hasBlueVision || hasRedVision) {
      html += `<div class="info-row">
        <span class="label">👁️ 视野之灵</span>
        <span class="value ready">${hasBlueVision ? '蓝方' : ''}${hasBlueVision && hasRedVision ? '/' : ''}${hasRedVision ? '红方' : ''}可用</span>
      </div>`;
    }

    container.innerHTML = html;
  },

  // ===== 已放置英雄列表 =====
  updatePlacedList() {
    const container = document.getElementById('placed-list');
    const markers = window.MarkerEngine?.markers || [];

    if (markers.length === 0) {
      container.innerHTML = '<div style="color:#5a6380;font-size:11px;padding:4px;">暂无英雄放置</div>';
      return;
    }

    container.innerHTML = markers.map(m => `
      <div class="placed-entry" data-marker-id="${m.id}"
           style="border-left: 3px solid ${m.team === 'red' ? '#ef4444' : '#3b82f6'}">
        <span>${m.icon}</span>
        <span>${m.name}</span>
        <span style="font-size:10px;color:#888;">Lv${m.level}</span>
        <span class="remove-btn" data-remove="${m.id}" title="移除">×</span>
      </div>
    `).join('');

    // 点击移除
    container.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.remove;
        window.MarkerEngine.removeMarker(id);
      });
    });

    // 点击选中
    container.querySelectorAll('.placed-entry').forEach(entry => {
      entry.addEventListener('click', () => {
        const id = entry.dataset.markerId;
        const marker = window.MarkerEngine.markers.find(m => m.id === id);
        if (marker) {
          window.MarkerEngine.selectedMarker = marker;
          this.showMarkerDetail(marker);
        }
      });
    });
  },

  showMarkerDetail(marker) {
    // 将信息显示在已放置列表上方
    const container = document.getElementById('placed-list');
    const existing = container.querySelector('.marker-detail');
    if (existing) existing.remove();

    const detail = document.createElement('div');
    detail.className = 'marker-detail';
    detail.style.cssText = 'background:#1e2740;padding:8px;border-radius:4px;margin-bottom:4px;font-size:11px;';
    detail.innerHTML = `
      <div style="font-weight:bold;margin-bottom:4px;">${marker.icon} ${marker.name}</div>
      <div>等级: Lv.${marker.level} | 经济: 💰${marker.gold}</div>
      <div>阵营: ${marker.team === 'red' ? '🔴红方' : '💎蓝方'}</div>
      <button style="margin-top:4px;padding:2px 8px;font-size:10px;background:#e94560;border:none;color:#fff;border-radius:3px;cursor:pointer;"
              onclick="window.MarkerEngine.removeMarker('${marker.id}')">删除</button>
      <button style="margin-top:4px;margin-left:4px;padding:2px 8px;font-size:10px;background:#3b82f6;border:none;color:#fff;border-radius:3px;cursor:pointer;"
              onclick="window.MarkerEngine.showEditDialog(window.MarkerEngine.markers.find(m=>m.id==='${marker.id}'))">编辑</button>
    `;
    container.insertBefore(detail, container.firstChild);
  },

  hideMarkerDetail() {
    const existing = document.querySelector('.marker-detail');
    if (existing) existing.remove();
  },

  // ===== 图例 =====
  renderLegend() {
    const container = document.getElementById('legend');
    container.innerHTML = `
      <div class="legend-item"><span class="legend-dot" style="background:#3b82f6"></span>蓝方</div>
      <div class="legend-item"><span class="legend-dot" style="background:#ef4444"></span>红方</div>
      <div class="legend-item"><span class="legend-dot" style="background:#ffd700"></span>防御塔</div>
      <div class="legend-item">💎 蓝BUFF</div>
      <div class="legend-item">🔴 红BUFF</div>
      <div class="legend-item">🐾 小野怪</div>
      <div class="legend-item">🐉 主宰坑</div>
      <div class="legend-item">🐲 暴君坑</div>
      <div class="legend-item">🌿 草丛</div>
      <div class="legend-item">🌸 传送阵</div>
      <div class="legend-item">💊 血包</div>
    `;
  },

  showElementDetail(el) {
    const section = document.getElementById('special-section');
    if (!el) {
      section.querySelector('h3').textContent = '🎯 特殊点位';
      return;
    }

    let detailHtml = '';
    const gs = window.GameState;

    switch (el.type) {
      case 'tower':
        section.querySelector('h3').textContent = '🗼 ' + el.data.name;
        const destroyed = gs.destroyedTowers.some(
          t => t.team === el.data.team && t.lane === el.data.lane && t.tier === el.data.tier
        );
        detailHtml = `<div class="info-row"><span>状态</span><span class="value ${destroyed?'danger':'ready'}">${destroyed?'已摧毁':'存活'}</span></div>
          <div class="info-row"><span>护盾</span><span class="value ${gs.time<240?'ready':'expired'}">${gs.time<240?'生效中':'已消失'}</span></div>
          <div style="font-size:10px;color:#888;margin-top:4px;">右键点击切换摧毁/修复</div>`;
        break;
      case 'camp':
        section.querySelector('h3').textContent = el.data.name;
        const alive = gs.isCampAlive(el.id);
        const campEntry = gs.killedCamps[el.id];
        detailHtml = `<div class="info-row"><span>状态</span><span class="value ${alive?'ready':'danger'}">${alive?'存活':'已击杀'}</span></div>
          ${!alive && campEntry ? `<div class="info-row"><span>归属</span><span class="value" style="color:${campEntry.team==='red'?'#ef4444':'#3b82f6'}">${campEntry.team==='red'?'🔴红方':'💎蓝方'}击杀</span></div>` : ''}
          ${!alive ? `<div class="info-row"><span>重生</span><span class="value counting">${Math.ceil(gs.campRespawnIn(el.id))}秒</span></div>` : ''}
          <div class="info-row"><span>刷新间隔</span><span>${el.data.respawn}秒</span></div>
          <div style="font-size:10px;color:#888;margin-top:4px;">左键点击切换击杀/复活 (切换左侧阵营改变归属)</div>`;
        break;
      case 'dragon':
        section.querySelector('h3').textContent = el.data.name;
        const dalive = gs.isDragonAlive(el.id);
        const dragEntry = gs.killedDragons[el.id];
        detailHtml = `<div class="info-row"><span>状态</span><span class="value ${dalive?'ready':'danger'}">${dalive?'存活':'已击杀'}</span></div>
          ${!dalive && dragEntry ? `<div class="info-row"><span>归属</span><span class="value" style="color:${dragEntry.team==='red'?'#ef4444':'#3b82f6'}">${dragEntry.team==='red'?'🔴红方':'💎蓝方'}击杀</span></div>` : ''}
          ${!dalive ? `<div class="info-row"><span>重生</span><span class="value counting">${Math.ceil(gs.dragonRespawnIn(el.id))}秒</span></div>` : ''}
          <div style="font-size:10px;color:#888;margin-top:4px;">左键点击切换击杀/复活</div>`;
        break;
      case 'special':
        section.querySelector('h3').textContent = '🎯 ' + el.data.name;
        detailHtml = `<div style="font-size:11px;color:#aaa;">${el.data.description || ''}</div>`;
        break;
    }
    document.getElementById('special-info').innerHTML = detailHtml;
  },

  // ===== 事件绑定 =====
  bindEvents() {
  },

  // ===== 工具函数 =====
  formatTime(seconds) {
    if (seconds < 0) seconds = 0;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  },
};

window.InfoPanel = InfoPanel;
