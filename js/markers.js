/**
 * markers.js — 英雄标记管理
 * 在地图上放置、移动、删除英雄标记
 */

const CARRY_HEROES = ['h_dunshan', 'h_yao_sup', 'h_shaosiyuan'];
const CLONE_HEROES = ['h_kongkonger', 'h_yuange', 'h_aguduo'];
const DUEL_HEROES = ['h_haiyue'];
const DISGUISE_HEROES = ['h_yuange']; // 空空儿、元歌、阿古朵

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
    window.UndoManager?.push();
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
    window.UndoManager?.push();
    this.markers = this.markers.filter(m => m.id !== id);
    if (this.selectedMarker?.id === id) this.selectedMarker = null;
    if (window.InfoPanel) window.InfoPanel.updatePlacedList();
  },

  clearAllMarkers() {
    window.UndoManager?.push();
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
        // Shift+click = suppress link
        if (e.shiftKey && this.selectedMarker && this.selectedMarker.id !== hit.id) {
          window.UndoManager?.push();
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
        const prevSelected = this.selectedMarker;
        this.selectedMarker = hit;
        this.isDragging = true;
        this.dragTarget = hit;
        this.dragOffset = { x: hit.x - mapPos.x, y: hit.y - mapPos.y };
        if (window.InfoPanel) window.InfoPanel.showMarkerDetail(hit, prevSelected);
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
        window.UndoManager?.push();
        MapEngine.canvas.style.cursor = this.hoveredMarker ? 'grab' : 'grab';
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
        e.stopImmediatePropagation();
        this.showHeroContextMenu(hit, e.clientX, e.clientY);
      } else {
        this.hideHeroContextMenu();
      }
    }, true); // capture phase: fire before other handlers

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

    // 检查托举关系
    let isCarrying = false, isCarried = false;
    if (gs?.carryLinks) {
      isCarrying = gs.carryLinks.some(l => l.carrierId === marker.id);
      isCarried = gs.carryLinks.some(l => l.carriedId === marker.id);
    }

    const menu = document.createElement('div');
    menu.id = 'hero-context-menu';
    menu.style.left = clientX + 'px';
    menu.style.top = clientY + 'px';

    const items = [];

    // "托举" — 仅当已选中可托举英雄且右键目标不是自己
    if (sel && CARRY_HEROES.includes(sel.heroId) && sel.id !== marker.id && !isCarried && !isCarrying) {
      const selCarrying = gs?.carryLinks?.some(l => l.carrierId === sel.id);
      if (!selCarrying) {
        items.push({ action:'carry', text:'🛡️ 托举该队友', cls:'carry' });
      }
    }

    // "断开托举"
    if (isCarrying || isCarried) {
      items.push({ action:'uncarry', text:'🔓 断开托举', cls:'uncarry' });
    }

    // "创建分身" — 空空儿/元歌/阿古朵
    if (CLONE_HEROES.includes(marker.heroId) && !marker.isClone && !marker.cloneOf) {
      const cloneCount = this.markers.filter(m => m.cloneOf === marker.id).length;
      if (cloneCount < 3) {
        items.push({ action:'clone', text:'👥 创建分身', cls:'' });
      }
    }
    // "删除所有分身"
    const hasClones = this.markers.some(m => m.cloneOf === marker.id);
    if (hasClones) {
      items.push({ action:'deleteClones', text:'👥 删除所有分身', cls:'danger' });
    }

    // 大招强化自身 (铠/姬小满/苍等)
    if (!marker.isClone) {
      const label = marker.ultActive ? '🔆 关闭大招强化' : '🔆 开启大招强化';
      items.push({ action:'ult', text: label, cls: marker.ultActive ? '' : 'carry' });
    }

    // 通用操作
    items.push({ action:'edit', text:'✏️ 编辑等级/经济', cls:'' });
    items.push({ action:'delete', text:'🗑️ 删除该英雄', cls:'danger' });

    for (const item of items) {
      const div = document.createElement('div');
      div.className = 'ctx-item';
      if (item.cls === 'danger') div.style.color = 'var(--accent-red)';
      if (item.cls === 'carry') div.style.color = 'var(--accent-gold)';
      div.textContent = item.text;
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
      case 'clone':
        this.addClone(marker);
        break;
      case 'deleteClones':
        this.removeAllClones(marker.id);
        break;
      case 'ult':
        window.UndoManager?.push();
        marker.ultActive = !marker.ultActive;
        break;
      case 'edit':
        this.showEditDialog(marker);
        break;
      case 'delete':
        this.removeCarryLink(marker.id);
        this.removeAllClones(marker.id);
        this.markers = this.markers.filter(m => m.disguiseOf !== marker.id);
        this.removeMarker(marker.id);
        break;
    }
  },

  // ===== 分身管理 =====
  addClone(original) {
    window.UndoManager?.push();
    const offset = 15 + Math.random() * 20;
    const angle = Math.random() * Math.PI * 2;
    const marker = {
      id: 'clone_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      heroId: original.heroId,
      name: original.name + '(分身)',
      icon: original.icon,
      role: original.role,
      x: original.x + Math.cos(angle) * offset,
      y: original.y + Math.sin(angle) * offset,
      level: original.level,
      gold: 0,
      team: original.team,
      isClone: true,
      cloneOf: original.id,
    };
    this.markers.push(marker);
    if (window.InfoPanel) window.InfoPanel.updatePlacedList();
    return marker;
  },

  removeAllClones(originalId) {
    window.UndoManager?.push();
    this.markers = this.markers.filter(m => m.cloneOf !== originalId);
    if (window.InfoPanel) window.InfoPanel.updatePlacedList();
  },

  // ===== 托举关系管理 =====
  addCarryLink(carrierId, carriedId) {
    window.UndoManager?.push();
    const gs = window.GameState;
    if (!gs.carryLinks) gs.carryLinks = [];
    // 防止重复
    if (gs.carryLinks.some(l => l.carrierId === carrierId || l.carriedId === carrierId)) return;
    if (gs.carryLinks.some(l => l.carrierId === carriedId || l.carriedId === carriedId)) return;
    gs.carryLinks.push({ carrierId, carriedId });
  },

  removeCarryLink(markerId) {
    window.UndoManager?.push();
    const gs = window.GameState;
    if (!gs.carryLinks) return;
    gs.carryLinks = gs.carryLinks.filter(
      l => l.carrierId !== markerId && l.carriedId !== markerId
    );
  },

  addDisguise(yuangeId, targetId) {
    window.UndoManager?.push();
    const origin = this.markers.find(m => m.id === yuangeId);
    const target = this.markers.find(m => m.id === targetId);
    if (!origin || !target) return;
    // Remove existing disguises
    this.markers = this.markers.filter(m => m.disguiseOf !== yuangeId);
    // Create disguised marker (looks like target, but is 元歌)
    const marker = {
      id: 'disguise_' + Date.now(),
      heroId: target.heroId,
      name: target.name + '(元歌伪装)',
      icon: target.icon,
      role: target.role,
      x: origin.x + 25, y: origin.y,
      level: origin.level,
      gold: 0,
      team: origin.team,
      disguiseOf: yuangeId,
    };
    this.markers.push(marker);
    if (window.InfoPanel) window.InfoPanel.updatePlacedList();
    return marker;
  },

  addDuelLink(casterId, targetId) {
    window.UndoManager?.push();
    const gs = window.GameState;
    if (!gs.duelLinks) gs.duelLinks = [];
    if (gs.duelLinks.some(l => l.casterId === casterId || l.targetId === casterId)) return;
    if (gs.duelLinks.some(l => l.casterId === targetId || l.targetId === targetId)) return;
    gs.duelLinks.push({ casterId, targetId });
  },

  removeDuelLink(markerId) {
    window.UndoManager?.push();
    const gs = window.GameState;
    if (!gs.duelLinks) return;
    gs.duelLinks = gs.duelLinks.filter(
      l => l.casterId !== markerId && l.targetId !== markerId
    );
  },

  // ===== 幻境对决渲染 =====
  drawDuelLinks(ctx) {
    const gs = window.GameState;
    if (!gs?.duelLinks?.length) return;

    for (const link of gs.duelLinks) {
      const caster = this.markers.find(m => m.id === link.casterId);
      const target = this.markers.find(m => m.id === link.targetId);
      if (!caster || !target) continue;

      const s1 = MapEngine.mapToScreen(caster.x, caster.y);
      const s2 = MapEngine.mapToScreen(target.x, target.y);
      const z = Math.min(MapEngine.view.zoom, 2.0);
      const t = Date.now() / 1000;

      // Purple connecting beam
      ctx.strokeStyle = 'rgba(192,132,252,0.6)';
      ctx.lineWidth = 3 * z;
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 10 * z;
      ctx.beginPath();
      ctx.moveTo(s1.x, s1.y);
      ctx.lineTo(s2.x, s2.y);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Pulsing rings around both heroes
      for (const m of [caster, target]) {
        const s = MapEngine.mapToScreen(m.x, m.y);
        const pulse = Math.sin(t * 3 + (m === caster ? 0 : Math.PI)) * 0.3 + 0.7;
        ctx.strokeStyle = 'rgba(192,132,252,' + (0.5 + pulse * 0.3) + ')';
        ctx.lineWidth = 2.5 * z;
        ctx.setLineDash([6 * z, 3 * z]);
        ctx.beginPath();
        ctx.arc(s.x, s.y, 20 * z * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Flowing particles along beam
      const dotCount = 4;
      for (let i = 0; i < dotCount; i++) {
        const frac = ((t * 0.4 + i / dotCount) % 1);
        const dx = s1.x + (s2.x - s1.x) * frac;
        const dy = s1.y + (s2.y - s1.y) * frac;
        ctx.fillStyle = 'rgba(192,132,252,0.8)';
        ctx.beginPath(); ctx.arc(dx, dy, 3 * z, 0, Math.PI * 2); ctx.fill();
      }

      // Label at midpoint
      const mx = (s1.x + s2.x) / 2, my = (s1.y + s2.y) / 2 - 14 * z;
      ctx.fillStyle = '#c084fc';
      ctx.font = 'bold ' + Math.round(10 * z) + 'px "Microsoft YaHei"';
      ctx.textAlign = 'center';
      ctx.fillText('幻境', mx, my);
    }
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

    // draw clone connections (分身连线)
    for (const marker of this.markers) {
      if (!marker.cloneOf) continue;
      const original = this.markers.find(m => m.id === marker.cloneOf);
      if (!original) continue;
      const s1 = MapEngine.mapToScreen(original.x, original.y);
      const s2 = MapEngine.mapToScreen(marker.x, marker.y);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(s1.x, s1.y);
      ctx.lineTo(s2.x, s2.y);
      ctx.stroke();
      ctx.setLineDash([]);
      // small diamond at midpoint
      const mx = (s1.x + s2.x) / 2, my = (s1.y + s2.y) / 2;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(mx, my, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // draw duel links (海月幻境)
    this.drawDuelLinks(ctx);

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
    const isClone = marker.isClone;
    const radius = (isClone ? 10 : 14) * Math.min(z, 2);

    // In duel (海月幻境): render semi-transparent
    const gs = window.GameState;
    const inDuel = gs?.duelLinks?.some(l => l.casterId === marker.id || l.targetId === marker.id);
    if (inDuel) ctx.globalAlpha = 0.3;

    // Disguised marker (元歌伪装): dashed purple border + purple connect line to 元歌
    if (marker.disguiseOf) {
      const yuange = this.markers.find(m => m.id === marker.disguiseOf);
      if (yuange) {
        const sy = MapEngine.mapToScreen(yuange.x, yuange.y);
        ctx.strokeStyle = 'rgba(167,139,250,0.5)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(sy.x, sy.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // Purple dashed border on disguised marker
      ctx.strokeStyle = 'rgba(167,139,250,0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(s.x, s.y, radius + 8 * z, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Ult active: pulsing golden aura
    if (marker.ultActive && !isClone) {
      const pulse = Math.sin(Date.now() / 400) * 0.3 + 0.7;
      const auraR = radius + 12 * z * pulse;
      // Outer glow
      ctx.fillStyle = 'rgba(255,215,0,' + (0.15 * pulse) + ')';
      ctx.beginPath();
      ctx.arc(s.x, s.y, auraR + 6 * z, 0, Math.PI * 2);
      ctx.fill();
      // Inner ring
      ctx.strokeStyle = 'rgba(255,215,0,' + (0.7 * pulse) + ')';
      ctx.lineWidth = 2.5 * z;
      ctx.setLineDash([4 * z, 2 * z]);
      ctx.beginPath();
      ctx.arc(s.x, s.y, auraR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      // Label
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold ' + Math.round(9 * z) + 'px "Microsoft YaHei"';
      ctx.textAlign = 'center';
      ctx.fillText('🔆强化', s.x, s.y - radius - 14 * z);
    }

    // Clone: semi-transparent, dashed border
    if (isClone) {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.arc(s.x + 1, s.y + 2, radius, 0, Math.PI * 2);
      ctx.fill();

      const teamColor = marker.team === 'red' ? '#ef4444' : '#3b82f6';
      ctx.fillStyle = teamColor;
      ctx.beginPath();
      ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 2]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + Math.round(11 * Math.min(z, 2)) + 'px "Microsoft YaHei"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(marker.icon, s.x, s.y);

      // "分身" label
      if (z > 0.5) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = Math.round(8 * z) + 'px "Microsoft YaHei"';
        ctx.fillText('分身', s.x, s.y + radius + 10 * z);
      }
      ctx.globalAlpha = 1;
      return;
    }

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

    if (inDuel) ctx.globalAlpha = 1;
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
window.CARRY_HEROES = CARRY_HEROES;
window.CLONE_HEROES = CLONE_HEROES;
window.DUEL_HEROES = DUEL_HEROES;
window.DISGUISE_HEROES = DISGUISE_HEROES;
