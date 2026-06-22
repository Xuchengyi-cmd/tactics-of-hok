/**
 * markers.js — 英雄标记管理
 * 在地图上放置、移动、删除英雄标记
 */

const CARRY_HEROES = ['h_dunshan', 'h_yao_sup', 'h_shaosiyuan']; // 盾山、瑶、少司缘

const MarkerEngine = {
  markers: [],        // HeroMarker[]
  selectedMarker: null,
  isDragging: false,
  dragTarget: null,
  dragOffset: { x: 0, y: 0 },
  hoveredMarker: null,

  // ===== 初始化 =====
  init() {
    this.bindCanvasEvents();
  },

  // ===== 标记操作 =====
  addMarker(heroData, mapX, mapY) {
    const marker = {
      id: 'marker_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      heroId: heroData.id,
      name: heroData.name,
      icon: heroData.icon,
      role: heroData.role,
      x: mapX,
      y: mapY,
      level: 1,
      gold: 0,
      team: heroData.team || window.GameState?.currentTeam || 'blue',
    };
    this.markers.push(marker);
    if (window.InfoPanel) window.InfoPanel.updatePlacedList();
    return marker;
  },

  removeMarker(id) {
    this.markers = this.markers.filter(m => m.id !== id);
    if (this.selectedMarker?.id === id) this.selectedMarker = null;
    if (window.InfoPanel) window.InfoPanel.updatePlacedList();
  },

  clearAllMarkers() {
    this.markers = [];
    this.selectedMarker = null;
    if (window.InfoPanel) window.InfoPanel.updatePlacedList();
  },

  findMarkerAt(mapX, mapY, threshold = 15) {
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

  // ===== Canvas 事件 =====
  bindCanvasEvents() {
    const canvas = MapEngine.canvas;

    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || MapEngine.isPanning) return;
      if (window.Calibrate?.active) return;
      if (window.PathEngine?.drawing) return;
      if (window.SkillEngine?.active) return;

      // Dismiss context menu on any click
      this.hideHeroContextMenu();

      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const mapPos = MapEngine.screenToMap(sx, sy);

      const hit = this.findMarkerAt(mapPos.x, mapPos.y);
      if (hit) {
        // Mobile suppress mode (button toggle)
        if (window._handleSuppressTap && window._handleSuppressTap(hit)) {
          return;
        }
        // Shift+click = suppress link
        if (e.shiftKey && this.selectedMarker && this.selectedMarker.id !== hit.id) {
          const gs = window.GameState;
          const existing = gs.suppressionLinks.findIndex(
            l => l.from === this.selectedMarker.id && l.to === hit.id
          );
          if (existing >= 0) {
            gs.suppressionLinks.splice(existing, 1);
          } else {
            gs.suppressionLinks.push({ from: this.selectedMarker.id, to: hit.id });
          }
          return;
        }
        this.selectedMarker = hit;
        this.isDragging = true;
        this.dragTarget = hit;
        this.dragOffset = { x: hit.x - mapPos.x, y: hit.y - mapPos.y };
        if (window.InfoPanel) window.InfoPanel.showMarkerDetail(hit);
      } else {
        // Shift+click empty = clear selection
        if (!e.shiftKey) {
          this.selectedMarker = null;
          if (window.InfoPanel) window.InfoPanel.hideMarkerDetail();
        }
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      if (window.Calibrate?.active) return;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const mapPos = MapEngine.screenToMap(sx, sy);

      if (this.isDragging && this.dragTarget) {
        const dx = (mapPos.x + this.dragOffset.x) - this.dragTarget.x;
        const dy = (mapPos.y + this.dragOffset.y) - this.dragTarget.y;
        this.dragTarget.x = mapPos.x + this.dragOffset.x;
        this.dragTarget.y = mapPos.y + this.dragOffset.y;

        // 联动移动：拖拽托举关系中的任一方，另一方同步跟随
        const gs = window.GameState;
        if (gs?.carryLinks) {
          for (const link of gs.carryLinks) {
            if (link.carrierId === this.dragTarget.id) {
              const carried = this.markers.find(m => m.id === link.carriedId);
              if (carried) { carried.x += dx; carried.y += dy; }
            } else if (link.carriedId === this.dragTarget.id) {
              const carrier = this.markers.find(m => m.id === link.carrierId);
              if (carrier) { carrier.x += dx; carrier.y += dy; }
            }
          }
        }
        canvas.style.cursor = 'grabbing';
        return;
      }

      // 路径绘制
      if (window.PathEngine?.drawing) {
        window.PathEngine.handleMouseMove(mapPos.x, mapPos.y);
        canvas.style.cursor = 'crosshair';
        return;
      }

      // 悬浮检测
      const hover = this.findMarkerAt(mapPos.x, mapPos.y);
      this.hoveredMarker = hover;
    });

    window.addEventListener('mouseup', (e) => {
      if (this.isDragging) {
        this.isDragging = false;
        this.dragTarget = null;
        MapEngine.canvas.style.cursor = this.hoveredMarker ? 'grab' : 'grab';
      }
    });

    // ===== Touch events (mobile marker drag) =====
    canvas.addEventListener('touchstart', (e) => {
      if (window.Calibrate?.active) return;
      if (window.PathEngine?.drawing) return;
      if (window.SkillEngine?.active) return;
      if (MapEngine.isPanning) return;
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const mapPos = MapEngine.screenToMap(t.clientX - rect.left, t.clientY - rect.top);
      const hit = this.findMarkerAt(mapPos.x, mapPos.y);
      if (hit) {
        this.selectedMarker = hit;
        this.isDragging = true;
        this.dragTarget = hit;
        this.dragOffset = { x: hit.x - mapPos.x, y: hit.y - mapPos.y };
        // Prevent map pan while dragging marker
        MapEngine._touchMoved = true;
        clearTimeout(MapEngine._longPressTimer);
        if (window.InfoPanel) window.InfoPanel.showMarkerDetail(hit);
      }
    });

    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const mapPos = MapEngine.screenToMap(t.clientX - rect.left, t.clientY - rect.top);

      // Path drawing via touch
      if (window.PathEngine?.drawing) {
        window.PathEngine.handleMouseMove(mapPos.x, mapPos.y);
        return;
      }

      // Marker dragging via touch
      if (!this.isDragging || !this.dragTarget) return;
      e.preventDefault();
      const dx = (mapPos.x + this.dragOffset.x) - this.dragTarget.x;
      const dy = (mapPos.y + this.dragOffset.y) - this.dragTarget.y;
      this.dragTarget.x = mapPos.x + this.dragOffset.x;
      this.dragTarget.y = mapPos.y + this.dragOffset.y;
      // Carry linkage
      const gs = window.GameState;
      if (gs?.carryLinks) {
        for (const link of gs.carryLinks) {
          if (link.carrierId === this.dragTarget.id) {
            const carried = this.markers.find(m => m.id === link.carriedId);
            if (carried) { carried.x += dx; carried.y += dy; }
          } else if (link.carriedId === this.dragTarget.id) {
            const carrier = this.markers.find(m => m.id === link.carrierId);
            if (carrier) { carrier.x += dx; carrier.y += dy; }
          }
        }
      }
    });

    canvas.addEventListener('touchend', (e) => {
      if (this.isDragging) {
        this.isDragging = false;
        this.dragTarget = null;
      }
    });

    // 右键菜单：英雄托举操作
    canvas.addEventListener('contextmenu', (e) => {
      if (window.Calibrate?.active) return;
      if (window.SkillEngine?.active && window.SkillEngine.editing) return;
      const rect = canvas.getBoundingClientRect();
      const mapPos = MapEngine.screenToMap(e.clientX - rect.left, e.clientY - rect.top);
      const hit = this.findMarkerAt(mapPos.x, mapPos.y);
      if (hit) {
        e.preventDefault();
        e.stopPropagation();
        this.showHeroContextMenu(hit, e.clientX, e.clientY);
      } else {
        this.hideHeroContextMenu();
      }
    });

    // 双击编辑
    canvas.addEventListener('dblclick', (e) => {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const mapPos = MapEngine.screenToMap(sx, sy);
      const hit = this.findMarkerAt(mapPos.x, mapPos.y);
      if (hit) {
        this.showEditDialog(hit);
      }
    });

    // 点击页面其他地方关闭菜单
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#hero-context-menu')) {
        this.hideHeroContextMenu();
      }
    });
  },

  // ===== 右键菜单 =====
  showHeroContextMenu(marker, clientX, clientY) {
    this.hideHeroContextMenu();

    const sel = this.selectedMarker;
    const gs = window.GameState;
    const canCarry = CARRY_HEROES.includes(marker.heroId);

    // 检查托举关系
    let isCarrying = false, isCarried = false;
    if (gs?.carryLinks) {
      isCarrying = gs.carryLinks.some(l => l.carrierId === marker.id);
      isCarried = gs.carryLinks.some(l => l.carriedId === marker.id);
    }

    const menu = document.createElement('div');
    menu.id = 'hero-context-menu';
    menu.style.cssText = `
      position:fixed; left:${clientX}px; top:${clientY}px;
      background:#1e2740; border:1px solid #3b82f6; border-radius:6px;
      padding:4px 0; z-index:9999; min-width:160px;
      box-shadow:0 4px 16px rgba(0,0,0,0.5); font-size:13px;
    `;

    const items = [];

    // "托举" — 仅当已选中可托举英雄（盾山/瑶/少司缘）且右键目标不是自己
    if (sel && CARRY_HEROES.includes(sel.heroId) && sel.id !== marker.id && !isCarried && !isCarrying) {
      // 检查是否已在托举中
      const selCarrying = gs?.carryLinks?.some(l => l.carrierId === sel.id);
      if (!selCarrying) {
        items.push({ action:'carry', text:'🛡️ 托举该队友', cls:'carry' });
      }
    }

    // "断开托举"
    if (isCarrying || isCarried) {
      items.push({ action:'uncarry', text:'🔓 断开托举', cls:'uncarry' });
    }

    // 通用操作
    items.push({ action:'edit', text:'✏️ 编辑等级/经济', cls:'' });
    items.push({ action:'delete', text:'🗑️ 删除该英雄', cls:'danger' });

    for (const item of items) {
      const div = document.createElement('div');
      div.className = 'ctx-item';
      div.textContent = item.text;
      div.style.cssText = `
        padding:6px 14px; cursor:pointer; color:#ccc;
        ${item.cls === 'danger' ? 'color:#e94560;' : ''}
        ${item.cls === 'carry' ? 'color:#ffd700;' : ''}
      `;
      div.addEventListener('mouseenter', () => { div.style.background = '#2a3350'; });
      div.addEventListener('mouseleave', () => { div.style.background = ''; });
      div.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this.handleContextAction(item.action, marker);
        this.hideHeroContextMenu();
      });
      menu.appendChild(div);
    }

    document.body.appendChild(menu);
  },

  hideHeroContextMenu() {
    const el = document.getElementById('hero-context-menu');
    if (el) el.remove();
  },

  handleContextAction(action, marker) {
    switch (action) {
      case 'carry':
        this.addCarryLink(this.selectedMarker.id, marker.id);
        break;
      case 'uncarry':
        this.removeCarryLink(marker.id);
        break;
      case 'edit':
        this.showEditDialog(marker);
        break;
      case 'delete':
        this.removeCarryLink(marker.id); // 先断开托举
        this.removeMarker(marker.id);
        break;
    }
  },

  // ===== 托举关系管理 =====
  addCarryLink(carrierId, carriedId) {
    const gs = window.GameState;
    if (!gs.carryLinks) gs.carryLinks = [];
    // 防止重复
    if (gs.carryLinks.some(l => l.carrierId === carrierId || l.carriedId === carrierId)) return;
    if (gs.carryLinks.some(l => l.carrierId === carriedId || l.carriedId === carriedId)) return;
    gs.carryLinks.push({ carrierId, carriedId });
  },

  removeCarryLink(markerId) {
    const gs = window.GameState;
    if (!gs.carryLinks) return;
    gs.carryLinks = gs.carryLinks.filter(
      l => l.carrierId !== markerId && l.carriedId !== markerId
    );
  },

  // ===== 托举平台渲染 =====
  drawCarryPlatforms(ctx) {
    const gs = window.GameState;
    if (!gs?.carryLinks?.length) return;

    for (const link of gs.carryLinks) {
      const carrier = this.markers.find(m => m.id === link.carrierId);
      const carried = this.markers.find(m => m.id === link.carriedId);
      if (!carrier || !carried) continue;

      const c1 = MapEngine.mapToScreen(carrier.x, carrier.y);
      const c2 = MapEngine.mapToScreen(carried.x, carried.y);
      const z = Math.min(MapEngine.view.zoom, 2.0);

      // === 光环底座 ===
      for (const m of [carrier, carried]) {
        const s = MapEngine.mapToScreen(m.x, m.y);
        ctx.fillStyle = m.team === 'red'
          ? 'rgba(239,68,68,0.35)'
          : 'rgba(59,130,246,0.35)';
        ctx.beginPath();
        ctx.ellipse(s.x, s.y + 16 * z, 16 * z, 4 * z, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = m === carried
          ? 'rgba(255,255,255,0.5)'
          : 'rgba(255,215,0,0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // === 金色横梁 ===
      ctx.strokeStyle = 'rgba(255,215,0,0.8)';
      ctx.lineWidth = 4 * z;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 10 * z;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(c1.x, c1.y);
      ctx.lineTo(c2.x, c2.y);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 横梁内发光线
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1.5 * z;
      ctx.beginPath();
      ctx.moveTo(c1.x, c1.y);
      ctx.lineTo(c2.x, c2.y);
      ctx.stroke();

      // === 流动光点 ===
      const t = Date.now() / 1000;
      const dotCount = 5;
      for (let i = 0; i < dotCount; i++) {
        const frac = ((t * 0.7 + i / dotCount) % 1);
        const dx = c1.x + (c2.x - c1.x) * frac;
        const dy = c1.y + (c2.y - c1.y) * frac;
        // 光晕
        ctx.fillStyle = 'rgba(255,255,200,0.3)';
        ctx.beginPath(); ctx.arc(dx, dy, 5 * z, 0, Math.PI * 2); ctx.fill();
        // 亮点
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(dx, dy, 2.5 * z, 0, Math.PI * 2); ctx.fill();
      }

      // === 平台文字标识 ===
      const midX = (c1.x + c2.x) / 2;
      const midY = (c1.y + c2.y) / 2 - 12 * z;
      if (z > 0.5) {
        ctx.fillStyle = 'rgba(255,215,0,0.9)';
        ctx.font = 'bold ' + Math.round(11 * z) + 'px "Microsoft YaHei"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('🛡️托举', midX, midY);
      }
    }
  },

  // ===== 编辑对话框 =====
  showEditDialog(marker) {
    const level = prompt('设置英雄等级 (1-15):', marker.level);
    if (level !== null) {
      marker.level = Math.max(1, Math.min(15, parseInt(level) || 1));
    }
    const gold = prompt('设置经济:', marker.gold);
    if (gold !== null) {
      marker.gold = Math.max(0, parseInt(gold) || 0);
    }
    if (window.InfoPanel) {
      window.InfoPanel.updatePlacedList();
      window.InfoPanel.showMarkerDetail(marker);
    }
  },

  // ===== 渲染 (Layer 3) =====
  render() {
    const ctx = MapEngine.ctx;

    // draw suppression links
    const gs = window.GameState;
    if (gs?.suppressionLinks) {
      for (const link of gs.suppressionLinks) {
        const from = this.markers.find(m => m.id === link.from);
        const to = this.markers.find(m => m.id === link.to);
        if (from && to) {
          const s1 = MapEngine.mapToScreen(from.x, from.y);
          const s2 = MapEngine.mapToScreen(to.x, to.y);
          // chain line
          ctx.strokeStyle = 'rgba(255,50,50,0.7)';
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 4]);
          ctx.beginPath();
          ctx.moveTo(s1.x, s1.y);
          ctx.lineTo(s2.x, s2.y);
          ctx.stroke();
          ctx.setLineDash([]);
          // pulse dots along line
          const t = Date.now() / 1000;
          const dotCount = 3;
          for (let i = 0; i < dotCount; i++) {
            const frac = ((t * 0.5 + i / dotCount) % 1);
            const dx = s1.x + (s2.x - s1.x) * frac;
            const dy = s1.y + (s2.y - s1.y) * frac;
            ctx.fillStyle = 'rgba(255,50,50,0.9)';
            ctx.beginPath(); ctx.arc(dx, dy, 4, 0, Math.PI*2); ctx.fill();
          }
          // chain icon at midpoint
          const mx = (s1.x + s2.x) / 2, my = (s1.y + s2.y) / 2;
          ctx.fillStyle = '#fff';
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('🔗', mx, my);
        }
      }
    }

    // draw carry platforms (盾山托举) — behind markers
    this.drawCarryPlatforms(ctx);

    for (const marker of this.markers) {
      // check if suppressed
      const isSuppressed = gs?.suppressionLinks?.some(l => l.to === marker.id);
      if (isSuppressed) {
        const s = MapEngine.mapToScreen(marker.x, marker.y);
        const z = MapEngine.view.zoom;
        ctx.fillStyle = 'rgba(255,0,0,0.25)';
        ctx.beginPath();
        ctx.arc(s.x, s.y, 18 * Math.min(z, 2), 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = Math.round(14 * Math.min(z, 2)) + 'px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🔒', s.x, s.y - 18 * Math.min(z, 2));
      }
      this.drawMarker(ctx, marker);
    }

    if (this.hoveredMarker && this.hoveredMarker !== this.dragTarget) {
      this.drawMarkerHighlight(ctx, this.hoveredMarker, 'rgba(255,255,255,0.3)');
    }
    if (this.selectedMarker) {
      this.drawMarkerHighlight(ctx, this.selectedMarker, 'rgba(245,158,11,0.5)');
    }
  },

  drawMarker(ctx, marker) {
    const s = MapEngine.mapToScreen(marker.x, marker.y);
    const z = MapEngine.view.zoom;
    const radius = 14 * Math.min(z, 2);

    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.arc(s.x + 1, s.y + 2, radius, 0, Math.PI * 2);
    ctx.fill();

    // 主体圆形
    const teamColor = marker.team === 'red' ? '#ef4444' : '#3b82f6';
    ctx.fillStyle = teamColor;
    ctx.beginPath();
    ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 英雄文字
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + Math.round(14 * Math.min(z, 2)) + 'px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(marker.icon, s.x, s.y);

    // 等级标签
    const lvlFontSize = Math.round(10 * Math.min(z, 1.5));
    if (lvlFontSize >= 7) {
      ctx.fillStyle = teamColor;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.font = 'bold ' + lvlFontSize + 'px "Microsoft YaHei"';
      ctx.strokeText('Lv.' + marker.level, s.x + radius + 2, s.y - radius + 2);
      ctx.fillText('Lv.' + marker.level, s.x + radius + 2, s.y - radius + 2);

      // 经济
      if (marker.gold > 0) {
        const goldText = '💰' + marker.gold;
        ctx.strokeText(goldText, s.x + radius + 2, s.y + radius + lvlFontSize);
        ctx.fillText(goldText, s.x + radius + 2, s.y + radius + lvlFontSize);
      }
    }

    // in-bush concealment: only if no enemy heroes in same bush
    let concealed = false;
    if (window.isInBush && window.isInBush(marker.x, marker.y)) {
      const bush = window.isInBush(marker.x, marker.y);
      // check if any hero from the OTHER team is also in this bush
      const hasEnemy = this.markers.some(m =>
        m.id !== marker.id && m.team !== marker.team &&
        window.isInBush(m.x, m.y) && window.isInBush(m.x, m.y).id === bush.id
      );
      concealed = !hasEnemy;
    }
    if (concealed) {
      ctx.strokeStyle = 'rgba(50,255,50,0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.arc(s.x, s.y, radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#fff';
      ctx.font = Math.round(12 * Math.min(z, 2)) + 'px sans-serif';
      ctx.fillText('👁️‍🗨️', s.x - radius - 2, s.y - radius + 2);
    }

    // name
    const nameFontSize = Math.round(10 * Math.min(z, 1.2));
    if (nameFontSize >= 6) {
      ctx.font = nameFontSize + 'px "Microsoft YaHei"';
      ctx.fillStyle = '#fff';
      ctx.fillText(marker.name, s.x, s.y + radius + nameFontSize + 2);
    }
  },

  drawMarkerHighlight(ctx, marker, color) {
    const s = MapEngine.mapToScreen(marker.x, marker.y);
    const z = MapEngine.view.zoom;
    const radius = 14 * Math.min(z, 2) + 4;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  },
};

window.MarkerEngine = MarkerEngine;
