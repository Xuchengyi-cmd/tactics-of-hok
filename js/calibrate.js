/**
 * calibrate.js — 地图坐标校准工具
 * 拖拽标记到正确位置后，导出坐标JSON
 */

const Calibrate = {
  active: false,
  categories: [],
  currentCategoryIdx: 0,
  markers: [],        // { id, name, x, y, color, icon, elementRef }
  draggedMarker: null,
  dragOffset: { x: 0, y: 0 },
  selectedMarkerId: null,
  highlightPulse: 0,

  // all elements needing calibration
  elementDefs: [],

  initElementDefs() {
    this.elementDefs = [
      // 防御塔
      ...TOWERS.map(t => ({
        id: t.id, name: t.name, type: 'tower', icon: '🗼',
        x: t.x, y: t.y, color: t.team === 'blue' ? '#3b82f6' : '#ef4444',
        refKey: 'tower', refId: t.id,
      })),
      // BUFF
      ...JUNGLE_CAMPS.filter(c => c.type === 'buff').map(c => ({
        id: c.id, name: c.name, type: 'jungle', icon: c.subType === 'blue' ? '💎' : '🔴',
        x: c.x, y: c.y, color: c.team === 'blue' ? '#3b82f6' : '#ef4444',
        refKey: 'jungle', refId: c.id,
      })),
      // 小野
      ...JUNGLE_CAMPS.filter(c => c.type === 'small').map(c => {
        const iconMap = {
          'cheetah': '🐆', 'lizard': '🦎', 'red_armor': '🦀',
          'mountain_boar': '🐗', 'mountain_monkey': '🐒', 'fierce_pheasant': '🦃',
        };
        return {
          id: c.id, name: c.name, type: 'jungle_small',
          icon: iconMap[c.subType] || '🐾',
          x: c.x, y: c.y, color: c.team === 'blue' ? '#3b82f6' : '#ef4444',
          refKey: 'jungle_small', refId: c.id,
        };
      }),
      // 龙坑
      ...DRAGON_PITS.map(d => ({
        id: d.id, name: d.name, type: 'dragon', icon: d.type === 'storm' ? '🌪️' : d.type === 'tyrant' ? '🐲' : '🐉',
        x: 460, y: d.y, color: '#ff8c00', refKey: 'dragon', refId: d.id,
      })),
      // 特殊点位
      ...SPECIAL_POINTS.map(s => ({
        id: s.id, name: s.name, type: 'special', icon: s.type === 'teleport' ? '🌸' : s.type === 'red_falcon' ? '🦅' : s.type === 'hp_pack' ? '💊' : '👁️',
        x: s.x, y: s.y, color: '#ff69b4', refKey: 'special', refId: s.id,
      })),
      // 草丛
      ...BUSH_ZONES.map(b => ({
        id: b.id, name: b.name, type: 'bush', icon: '🌿',
        x: b.x + b.w/2, y: b.y + b.h/2, color: '#228b22',
        refKey: 'bush', refId: b.id, width: b.w, height: b.h,
      })),
    ];

    // 按类型分组
    const specialCount = SPECIAL_POINTS.length;
    const bushCount = BUSH_ZONES.length;
    const categories = [
      { label: '🗼 防御塔 (18座)', filter: d => d.type === 'tower' },
      { label: '💎🔴 BUFF (4个)', filter: d => d.type === 'jungle' },
      { label: '🐾 小野怪 (12个)', filter: d => d.type === 'jungle_small' },
      { label: '🐉🐲 龙坑 (3个)', filter: d => d.type === 'dragon' },
      { label: '🎯 特殊点位 (' + specialCount + '个)', filter: d => d.type === 'special' },
      { label: '🌿 草丛 (' + bushCount + '个)', filter: d => d.type === 'bush' },
    ];

    this.categories = categories.map(c => ({
      ...c,
      items: this.elementDefs.filter(c.filter),
    }));
  },

  // ===== 启动/停止校准模式 =====
  init() {
    this.initElementDefs();
    this.createPanel();
    this.bindEvents();
  },

  toggle() {
    this.active = !this.active;
    const btn = document.getElementById('btn-calibrate');
    btn?.classList.toggle('active', this.active);

    if (this.active) {
      this.startCalibration();
    } else {
      this.stopCalibration();
    }
  },

  startCalibration() {
    this.currentCategoryIdx = 0;
    this.markers = [];
    this.showCategory();
    document.getElementById('map-hint').textContent =
      '📐 校准模式：拖拽标记到地图上的正确位置 | 点击"下一组"切换 | ESC退出';
    MapEngine.canvas.style.cursor = 'grab';
  },

  stopCalibration() {
    this.markers = [];
    this.hideAllPanels();
    document.getElementById('map-hint').textContent =
      '🖱️ 滚轮缩放 · 右键拖拽平移 · 左键拖动英雄';
    MapEngine.canvas.style.cursor = 'default';
  },

  // ===== 显示当前组 =====
  showCategory() {
    this.markers = [];
    this.selectedMarkerId = null;
    const cat = this.categories[this.currentCategoryIdx];
    if (!cat) return;

    this.markers = cat.items.map(item => ({
      id: item.id,
      name: item.name,
      refKey: item.refKey,
      refId: item.refId,
      x: item.x,
      y: item.y,
      color: item.color,
      icon: item.icon,
      adjusted: false,
    }));

    this.updatePanel();
  },

  // ===== 创建校准面板 =====
  createPanel() {
    // 移除旧面板
    const old = document.getElementById('calibrate-panel');
    if (old) old.remove();

    const panel = document.createElement('div');
    panel.id = 'calibrate-panel';
    panel.innerHTML = `
      <div class="cal-header">
        <h3>📐 坐标校准</h3>
        <span id="cal-progress"></span>
      </div>
      <div class="cal-info" id="cal-info"></div>
      <div class="cal-list" id="cal-list"></div>
      <div class="cal-actions">
        <button id="btn-cal-prev">◀ 上一组</button>
        <button id="btn-cal-next">下一组 ▶</button>
      </div>
      <div class="cal-export">
        <button id="btn-cal-export">📋 导出全部坐标</button>
        <button id="btn-cal-import">📂 导入坐标</button>
        <input type="file" id="cal-import-file" accept=".json" style="display:none">
      </div>
    `;

    // 插入到左侧面板底部
    const leftPanel = document.getElementById('left-panel');
    leftPanel.appendChild(panel);

    // 按钮事件
    document.getElementById('btn-cal-prev')?.addEventListener('click', () => this.prevCategory());
    document.getElementById('btn-cal-next')?.addEventListener('click', () => this.nextCategory());
    document.getElementById('btn-cal-export')?.addEventListener('click', () => this.exportCoords());
    document.getElementById('btn-cal-import')?.addEventListener('click', () => {
      document.getElementById('cal-import-file')?.click();
    });
    document.getElementById('cal-import-file')?.addEventListener('change', (e) => this.importCoords(e));
  },

  updatePanel() {
    const container = document.getElementById('cal-list');
    const progress = document.getElementById('cal-progress');
    const info = document.getElementById('cal-info');
    const cat = this.categories[this.currentCategoryIdx];

    if (!container || !cat) return;

    progress.textContent = `${this.currentCategoryIdx + 1}/${this.categories.length}`;
    info.innerHTML = `<strong>${cat.label}</strong> — 拖拽标记到正确位置`;

    container.innerHTML = this.markers.map((m, i) => `
      <div class="cal-item ${m.adjusted ? 'adjusted' : ''} ${m.id === this.selectedMarkerId ? 'selected' : ''}"
           data-idx="${i}"
           style="border-left: 3px solid ${m.color}">
        <span class="cal-icon">${m.icon}</span>
        <span class="cal-name">${m.name.replace('蓝方','').replace('红方','')}</span>
        <span class="cal-coord">(${Math.round(m.x)}, ${Math.round(m.y)})</span>
      </div>
    `).join('');

    // 点击列表项高亮对应标记
    container.querySelectorAll('.cal-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.idx);
        const marker = this.markers[idx];
        if (marker) {
          this.selectedMarkerId = marker.id;
          this.highlightPulse = 0;
          this.updatePanel();
          // center on marker
          MapEngine.view.x = marker.x * MapEngine.mapW / MapEngine.COORD_SCALE * MapEngine.view.zoom - MapEngine.view.canvasW / 2;
          MapEngine.view.y = marker.y * MapEngine.mapH / MapEngine.COORD_SCALE * MapEngine.view.zoom - MapEngine.view.canvasH / 2;
        }
      });
    });
  },

  hideAllPanels() {
    const panel = document.getElementById('calibrate-panel');
    if (panel) panel.style.display = 'none';
  },

  prevCategory() {
    if (this.currentCategoryIdx > 0) {
      this.saveCurrentPositions();
      this.currentCategoryIdx--;
      this.showCategory();
    }
  },

  nextCategory() {
    if (this.currentCategoryIdx < this.categories.length - 1) {
      this.saveCurrentPositions();
      this.currentCategoryIdx++;
      this.showCategory();
    } else {
      // 最后一组完成
      this.saveCurrentPositions();
      alert('全部元素校准完成！点击"📋 导出全部坐标"保存结果。');
    }
  },

  saveCurrentPositions() {
    // 将当前标记位置保存回 elementDefs
    for (const marker of this.markers) {
      const def = this.elementDefs.find(d => d.id === marker.id);
      if (def) {
        def.x = marker.x;
        def.y = marker.y;
      }
    }
  },

  // ===== Canvas 交互 =====
  bindEvents() {
    const canvas = MapEngine.canvas;

    canvas.addEventListener('mousedown', (e) => {
      if (!this.active || e.button !== 0) return;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const mapPos = MapEngine.screenToMap(sx, sy);

      // 检测是否点击了校准标记
      const hit = this.findMarkerAt(mapPos.x, mapPos.y);
      if (hit) {
        this.selectedMarkerId = hit.id;
        this.highlightPulse = 0;
        this.updatePanel();
        this.draggedMarker = hit;
        this.dragOffset = { x: hit.x - mapPos.x, y: hit.y - mapPos.y };
        canvas.style.cursor = 'grabbing';
        e.stopPropagation();
        e.preventDefault();
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!this.active) return;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      if (this.draggedMarker) {
        const mapPos = MapEngine.screenToMap(sx, sy);
        this.draggedMarker.x = mapPos.x + this.dragOffset.x;
        this.draggedMarker.y = mapPos.y + this.dragOffset.y;
        this.draggedMarker.adjusted = true;
        this.updatePanel();
        return;
      }

      // 检测悬浮
      const mapPos = MapEngine.screenToMap(sx, sy);
      const hover = this.findMarkerAt(mapPos.x, mapPos.y);
      canvas.style.cursor = hover ? 'grab' : 'crosshair';
    });

    window.addEventListener('mouseup', () => {
      if (this.draggedMarker) {
        this.draggedMarker = null;
        MapEngine.canvas.style.cursor = 'crosshair';
      }
    });

    // ===== Touch equivalents =====
    canvas.addEventListener('touchstart', (e) => {
      if (!this.active || e.touches.length !== 1) return;
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const mapPos = MapEngine.screenToMap(t.clientX - rect.left, t.clientY - rect.top);
      const hit = this.findMarkerAt(mapPos.x, mapPos.y);
      if (hit) {
        this.selectedMarkerId = hit.id;
        this.highlightPulse = 0;
        this.updatePanel();
        this.draggedMarker = hit;
        this.dragOffset = { x: hit.x - mapPos.x, y: hit.y - mapPos.y };
        e.stopPropagation();
        e.preventDefault();
      }
    });

    canvas.addEventListener('touchmove', (e) => {
      if (!this.active || !this.draggedMarker) return;
      e.preventDefault();
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const mapPos = MapEngine.screenToMap(t.clientX - rect.left, t.clientY - rect.top);
      this.draggedMarker.x = mapPos.x + this.dragOffset.x;
      this.draggedMarker.y = mapPos.y + this.dragOffset.y;
      this.draggedMarker.adjusted = true;
      this.updatePanel();
    });

    canvas.addEventListener('touchend', () => {
      if (this.draggedMarker) { this.draggedMarker = null; }
    });

    // ESC 退出校准模式
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.active) {
        this.toggle();
      }
    });
  },

  findMarkerAt(mapX, mapY, threshold = 20) {
    const thresholdMap = threshold / MapEngine.view.zoom;
    for (let i = this.markers.length - 1; i >= 0; i--) {
      const m = this.markers[i];
      const dx = m.x - mapX;
      const dy = m.y - mapY;
      if (Math.sqrt(dx * dx + dy * dy) < thresholdMap) {
        return m;
      }
    }
    return null;
  },

  // ===== 渲染校准标记 =====
  render() {
    if (!this.active) return;
    const ctx = MapEngine.ctx;
    this.highlightPulse = (this.highlightPulse + 0.05) % (Math.PI * 2);

    for (const marker of this.markers) {
      const s = MapEngine.mapToScreen(marker.x, marker.y);
      const z = Math.min(MapEngine.view.zoom, 2.5);
      const radius = 10 * z;
      const isSelected = marker.id === this.selectedMarkerId;

      // selected: pulsing glow
      if (isSelected) {
        const pulse = Math.sin(this.highlightPulse) * 0.4 + 0.6;
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 20 * pulse;
        // outer pulse ring
        ctx.strokeStyle = 'rgba(255,215,0,' + pulse + ')';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(s.x, s.y, radius + 12, 0, Math.PI * 2);
        ctx.stroke();
        // inner highlight ring
        ctx.strokeStyle = 'rgba(255,255,255,' + (pulse * 0.8) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(s.x, s.y, radius + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // dragged highlight
      if (this.draggedMarker === marker) {
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(s.x, s.y, radius + 8, 0, Math.PI * 2);
        ctx.stroke();
      }

      // fill
      ctx.fillStyle = marker.color;
      ctx.globalAlpha = marker.adjusted ? 0.9 : 0.6;
      ctx.beginPath();
      if (marker.type === 'bush' && marker.width) {
        const bw = marker.width * MapEngine.view.zoom * MapEngine.mapW / MapEngine.COORD_SCALE;
        const bh = marker.height * MapEngine.view.zoom * MapEngine.mapH / MapEngine.COORD_SCALE;
        ctx.fillRect(s.x - bw/2, s.y - bh/2, bw, bh);
        ctx.strokeStyle = isSelected ? '#ffd700' : (marker.adjusted ? '#fff' : 'rgba(255,255,255,0.5)');
        ctx.lineWidth = isSelected ? 3 : (marker.adjusted ? 2 : 1);
        ctx.setLineDash([3,3]);
        ctx.strokeRect(s.x - bw/2, s.y - bh/2, bw, bh);
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      } else {
        ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        // border
        ctx.strokeStyle = isSelected ? '#ffd700' : (marker.adjusted ? '#fff' : 'rgba(255,255,255,0.5)');
        ctx.lineWidth = isSelected ? 3 : (marker.adjusted ? 2 : 1);
        ctx.stroke();
      }

      // icon
      ctx.fillStyle = '#fff';
      ctx.font = Math.round(14 * z) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(marker.icon, s.x, s.y);

      // name
      if (MapEngine.view.zoom > 0.6) {
        const shortName = marker.name.replace('蓝方', '').replace('红方', '').substring(0, 6);
        ctx.fillStyle = isSelected ? '#ffd700' : '#fff';
        ctx.font = 'bold ' + Math.round(9 * Math.min(z, 1.3)) + 'px "Microsoft YaHei"';
        ctx.fillText(shortName, s.x, s.y - radius - 8);
      }
    }
  },

  // ===== 导入/导出 =====
  exportCoords() {
    this.saveCurrentPositions();

    const result = {
      towers: {}, jungles: {}, dragons: {}, specials: {}, bushes: {},
    };

    for (const def of this.elementDefs) {
      const coord = { x: Math.round(def.x), y: Math.round(def.y) };
      if (def.type === 'tower') result.towers[def.refId] = coord;
      else if (def.type === 'jungle' || def.type === 'jungle_small') result.jungles[def.refId] = coord;
      else if (def.type === 'dragon') result.dragons[def.refId] = coord;
      else if (def.type === 'bush') result.bushes[def.refId] = coord;
      else result.specials[def.refId] = coord;
    }

    const json = JSON.stringify(result, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      alert('坐标已复制到剪贴板！请粘贴给我，我来更新代码。');
    }).catch(() => {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = json;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      alert('坐标已复制到剪贴板！');
    });

    console.log('=== 校准坐标导出 ===');
    console.log(json);
  },

  importCoords(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        this.applyImportedCoords(data);
        alert('坐标导入成功！标记已更新到导入的位置。');
        this.showCategory(); // 刷新显示
      } catch (err) {
        alert('导入失败：文件格式错误');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  },

  applyImportedCoords(data) {
    const flat = {};
    if (data.towers) Object.assign(flat, data.towers);
    if (data.jungles) Object.assign(flat, data.jungles);
    if (data.dragons) Object.assign(flat, data.dragons);
    if (data.specials) Object.assign(flat, data.specials);
    if (data.bushes) Object.assign(flat, data.bushes);

    for (const def of this.elementDefs) {
      if (flat[def.refId]) {
        def.x = flat[def.refId].x;
        def.y = flat[def.refId].y;
      }
    }
  },

  // 获取校准后的数据（供外部使用）
  getCalibratedData() {
    this.saveCurrentPositions();
    const result = { towers: {}, jungles: {}, dragons: {}, specials: {}, bushes: {} };
    for (const def of this.elementDefs) {
      const coord = { x: Math.round(def.x), y: Math.round(def.y), name: def.name };
      if (def.type === 'tower') result.towers[def.refId] = coord;
      else if (def.type === 'jungle' || def.type === 'jungle_small') result.jungles[def.refId] = coord;
      else if (def.type === 'dragon') result.dragons[def.refId] = coord;
      else if (def.type === 'bush') result.bushes[def.refId] = coord;
      else result.specials[def.refId] = coord;
    }
    return result;
  },
};

window.Calibrate = Calibrate;
