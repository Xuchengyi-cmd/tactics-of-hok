/**
 * heroPanel.js — 左侧英雄面板
 * 英雄列表渲染、搜索过滤、拖拽到地图
 */

const HeroPanel = {
  currentTeam: 'blue',
  filterText: '',
  filterLane: '',
  draggedHero: null,
  selectedHero: null,  // mobile tap-to-place: { heroData, team }

  init() {
    this.createLaneFilter();
    this.renderHeroList();
    this.bindEvents();
  },

  createLaneFilter() {
    const searchEl = document.getElementById('hero-search');
    const div = document.createElement('div');
    div.id = 'lane-filter';
    div.style.cssText = 'display:flex;flex-wrap:wrap;gap:3px;margin-bottom:6px;';
    const lanes = ['全部','打野','中路','边路','发育路','辅助'];
    lanes.forEach(l => {
      const btn = document.createElement('button');
      btn.className = 'lane-filter-btn' + (l === '全部' ? ' active' : '');
      btn.textContent = l;
      btn.style.cssText = 'padding:2px 6px;font-size:10px;border:1px solid #2a3350;background:'+(l==='全部'?'#3b82f6':'#1e2740')+';color:#ccc;border-radius:3px;cursor:pointer;';
      btn.addEventListener('click', () => {
        div.querySelectorAll('button').forEach(b => { b.style.background='#1e2740'; b.classList.remove('active'); });
        btn.style.background = '#3b82f6'; btn.classList.add('active');
        this.filterLane = l === '全部' ? '' : l;
        this.renderHeroList();
      });
      div.appendChild(btn);
    });
    searchEl.parentNode.insertBefore(div, searchEl);
  },

  // ===== 渲染英雄列表 =====
  renderHeroList() {
    const container = document.getElementById('hero-list');
    const searchText = this.filterText.toLowerCase();

    let filtered = HEROES;
    // lane filter
    if (this.filterLane) {
      filtered = filtered.filter(h => h.positions && h.positions.includes(this.filterLane));
    }
    // text filter
    if (searchText) {
      filtered = filtered.filter(h =>
        h.name.includes(searchText) || h.icon.includes(searchText) ||
        (ROLE_NAMES[h.role]||'').includes(searchText) || (h.positions||'').includes(searchText)
      );
    }

    container.innerHTML = filtered.map(h => `
      <div class="hero-icon"
           draggable="true"
           data-hero-id="${h.id}"
           title="${h.name} · ${ROLE_NAMES[h.role]||h.role} · ${h.positions||''}"
           style="border-color:${ROLE_COLORS[h.role]||'#888'}">
        <span>${h.icon}</span>
        <span class="hero-tooltip">${h.name}</span>
      </div>
    `).join('');

    // count display
    const existing = document.getElementById('hero-count');
    const label = (existing) || (() => { const el = document.createElement('div'); el.id='hero-count'; el.style.cssText='font-size:10px;color:#5a6380;margin-top:2px;text-align:right;'; container.parentNode.appendChild(el); return el; })();
    label.textContent = filtered.length + '/' + HEROES.length;

    this.bindHeroDragEvents();
  },

  // ===== 事件绑定 =====
  bindEvents() {
    // 阵营切换
    document.querySelectorAll('.team-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.team-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentTeam = tab.dataset.team;
        window.GameState.currentTeam = this.currentTeam;
      });
    });

    // 搜索
    const searchInput = document.getElementById('hero-search');
    searchInput.addEventListener('input', () => {
      this.filterText = searchInput.value;
      this.renderHeroList();
    });

    // 清除按钮
    document.getElementById('btn-erase')?.addEventListener('click', () => {
      if (confirm('确定要清除所有英雄标记吗？')) {
        window.MarkerEngine.clearAllMarkers();
      }
    });
  },

  // ===== 拖拽事件 + 点击放置 =====
  bindHeroDragEvents() {
    const icons = document.querySelectorAll('#hero-list .hero-icon');
    icons.forEach(icon => {
      // Desktop: drag
      icon.addEventListener('dragstart', (e) => {
        const heroId = icon.dataset.heroId;
        const hero = HEROES.find(h => h.id === heroId);
        if (hero) {
          this.draggedHero = { ...hero, team: this.currentTeam };
          e.dataTransfer.setData('text/plain', heroId);
          e.dataTransfer.effectAllowed = 'copy';
          icon.classList.add('dragging');
          this.selectHero(null); // clear tap selection
        }
      });

      icon.addEventListener('dragend', (e) => {
        icon.classList.remove('dragging');
        this.draggedHero = null;
      });

      // Mobile + Desktop: click to select for tap-to-place
      icon.addEventListener('click', (e) => {
        const heroId = icon.dataset.heroId;
        const hero = HEROES.find(h => h.id === heroId);
        if (!hero) return;
        // Toggle: clicking same hero deselects
        if (this.selectedHero && this.selectedHero.id === heroId) {
          this.selectHero(null);
        } else {
          this.selectHero({ ...hero, team: this.currentTeam });
        }
      });
    });
  },

  // Highlight/unhighlight the selected hero icon
  selectHero(heroData) {
    this.selectedHero = heroData;
    // Update visual
    document.querySelectorAll('#hero-list .hero-icon').forEach(el => {
      el.classList.toggle('selected', heroData && el.dataset.heroId === heroData.id);
    });
    document.getElementById('map-hint').textContent = heroData
      ? '👆 点击地图放置 ' + heroData.name + ' | 再次点击英雄取消'
      : '🖱️ 左键拖拽平移 · 滚轮缩放 · 左键拖动英雄';
  },

  // ===== 通过点击放置英雄 =====
  placeHeroOnMap(heroId) {
    const hero = HEROES.find(h => h.id === heroId);
    if (!hero) return;
    const defaultX = 400 + Math.random() * 100;
    const defaultY = 550 + Math.random() * 80;
    window.MarkerEngine.addMarker({ ...hero, team: this.currentTeam }, defaultX, defaultY);
  },
};

// Canvas 接收拖放
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('map-canvas');
  canvas?.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });

  canvas?.addEventListener('drop', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const mapPos = window.MapEngine.screenToMap(sx, sy);

    if (window.HeroPanel.draggedHero) {
      window.MarkerEngine.addMarker(window.HeroPanel.draggedHero, mapPos.x, mapPos.y);
      window.HeroPanel.draggedHero = null;
    }
  });

  // Mobile tap-to-place: click canvas with selected hero
  canvas?.addEventListener('click', (e) => {
    const hp = window.HeroPanel;
    if (!hp?.selectedHero) return;
    // Skip if it was a drag (moved mouse >5px) or interacting with map element
    if (window.MarkerEngine?.isDragging) return;
    if (window.Calibrate?.active || window.PathEngine?.drawing || window.SkillEngine?.active) return;
    const rect = canvas.getBoundingClientRect();
    const mapPos = window.MapEngine.screenToMap(e.clientX - rect.left, e.clientY - rect.top);
    // Don't place on existing map element
    const threshold = 14 / window.MapEngine.view.zoom;
    const el = window.findElementAt && window.findElementAt(mapPos.x, mapPos.y, threshold);
    const hitMarker = window.MarkerEngine?.findMarkerAt(mapPos.x, mapPos.y, 14);
    if (el || hitMarker) return;
    window.MarkerEngine.addMarker(hp.selectedHero, mapPos.x, mapPos.y);
    hp.selectHero(null); // Deselect after placing
  });
});

window.HeroPanel = HeroPanel;
