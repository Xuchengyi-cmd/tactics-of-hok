/**
 * storage.js — 战术数据持久化
 * localStorage 存取，支持 JSON 文件导入导出
 */

const Storage = {
  STORAGE_KEY: 'hok_tactics_board',

  init() {
    this.bindEvents();
  },

  bindEvents() {
    // 保存
    document.getElementById('btn-save')?.addEventListener('click', () => {
      this.saveTactics();
    });

    // 加载
    document.getElementById('btn-load')?.addEventListener('click', () => {
      this.loadTactics();
    });

    // 文件导入
    const fileInput = document.getElementById('load-file');
    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          this.restoreState(data);
          alert('战术数据导入成功！');
        } catch (err) {
          alert('文件格式错误，导入失败。');
        }
      };
      reader.readAsText(file);
      fileInput.value = '';
    });
  },

  // ===== 保存 =====
  saveTactics() {
    const state = this.captureState();
    const name = prompt('战术名称:', '战术_' + new Date().toLocaleDateString());
    if (!name) return;

    // 保存到 localStorage
    const savedList = this.getSavedList();
    const entry = {
      name: name,
      timestamp: new Date().toISOString(),
      data: state,
    };
    savedList.push(entry);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(savedList));

    // 同时触发 JSON 文件下载
    this.downloadJSON(name + '.json', entry);

    console.log('战术已保存:', name);
  },

  // ===== 加载 =====
  loadTactics() {
    const savedList = this.getSavedList();
    if (savedList.length === 0) {
      alert('没有已保存的战术。你可以通过"📂 加载战术"旁边的文件选择导入 JSON 文件。\n\n点击确定后选择 .json 文件导入。');
      document.getElementById('load-file').click();
      return;
    }

    // 构建选择列表
    const options = savedList.map((entry, i) =>
      `${i + 1}. ${entry.name} (${new Date(entry.timestamp).toLocaleString()})`
    ).join('\n');

    const choice = prompt(
      `选择要加载的战术（输入序号，或输入 0 导入文件）:\n\n${options}`,
      '1'
    );

    if (choice === null) return;

    if (choice === '0') {
      document.getElementById('load-file').click();
      return;
    }

    const index = parseInt(choice) - 1;
    if (index >= 0 && index < savedList.length) {
      this.restoreState(savedList[index].data);
      console.log('战术已加载:', savedList[index].name);
    }
  },

  // ===== 获取保存列表 =====
  getSavedList() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  // ===== 状态捕获 =====
  captureState() {
    return {
      version: 1,
      gameTime: window.GameState?.time || 0,
      currentTeam: window.GameState?.currentTeam || 'blue',
      markers: (window.MarkerEngine?.markers || []).map(m => ({
        id: m.id,
        heroId: m.heroId,
        name: m.name,
        icon: m.icon,
        role: m.role,
        x: m.x,
        y: m.y,
        level: m.level,
        gold: m.gold,
        team: m.team,
        ultActive: m.ultActive,
        isClone: m.isClone,
        cloneOf: m.cloneOf,
        disguiseOf: m.disguiseOf,
      })),
      paths: (window.PathEngine?.paths || []).map(p => ({
        points: p.points,
        color: p.color,
        label: p.label,
        team: p.team,
        lineWidth: p.lineWidth,
      })),
      killedCamps: window.GameState?.killedCamps || {},
      killedDragons: window.GameState?.killedDragons || {},
      bushControl: window.GameState?.bushControl || {},
      skills: window.SkillEngine?.skills || [],
      minions: window.MinionEngine?.minions || [],
      suppressionLinks: window.GameState?.suppressionLinks || [],
      carryLinks: window.GameState?.carryLinks || [],
      duelLinks: window.GameState?.duelLinks || [],
      killedRedFalcon: window.GameState?.killedRedFalcon || null,
      killedSpaceSpirit: window.GameState?.killedSpaceSpirit || null,
      killedHpPacks: window.GameState?.killedHpPacks || {},
      destroyedTowers: window.GameState?.destroyedTowers || [],
    };
  },

  // ===== 状态恢复 =====
  restoreState(data) {
    if (!data) return;

    // 恢复时间
    if (window.GameState) {
      window.GameState.time = data.gameTime || 0;
      window.GameState.currentTeam = data.currentTeam || 'blue';
      window.GameState.killedCamps = data.killedCamps || {};
      window.GameState.killedDragons = data.killedDragons || {};
      window.GameState.bushControl = data.bushControl || {};
      if (window.SkillEngine && data.skills) window.SkillEngine.skills = data.skills;
      if (window.MinionEngine && data.minions) window.MinionEngine.minions = data.minions.map(m => ({...m}));
      window.GameState.suppressionLinks = data.suppressionLinks || [];
      window.GameState.carryLinks = data.carryLinks || [];
      window.GameState.duelLinks = data.duelLinks || [];
      window.GameState.killedRedFalcon = data.killedRedFalcon || null;
      window.GameState.killedSpaceSpirit = data.killedSpaceSpirit || null;
      window.GameState.killedHpPacks = data.killedHpPacks || {};
      window.GameState.destroyedTowers = data.destroyedTowers || [];
    }

    // 恢复标记（保留原始ID）
    if (window.MarkerEngine) {
      window.MarkerEngine.markers = [];
      if (data.markers) {
        for (const m of data.markers) {
          window.MarkerEngine.markers.push({
            id: m.id || ('marker_' + Date.now() + '_' + Math.random().toString(36).substr(2,5)),
            heroId: m.heroId, name: m.name, icon: m.icon, role: m.role,
            x: m.x, y: m.y, level: m.level || 1, gold: m.gold || 0,
            team: m.team || 'blue',
            ultActive: m.ultActive, isClone: m.isClone, cloneOf: m.cloneOf,
            disguiseOf: m.disguiseOf,
          });
        }
      }
    }

    // 恢复路径
    if (window.PathEngine) {
      window.PathEngine.clearAllPaths();
      if (data.paths) {
        for (const p of data.paths) {
          window.PathEngine.paths.push({
            id: 'path_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            points: p.points,
            color: p.color,
            label: p.label,
            team: p.team,
            lineWidth: p.lineWidth,
          });
        }
      }
    }

    // 同步UI
    if (window.Timeline) {
      window.Timeline.syncUI();
      window.Timeline.triggeredEvents.clear();
    }
    if (window.InfoPanel) {
      window.InfoPanel.update(window.GameState.time);
      window.InfoPanel.updatePlacedList();
    }
  },

  // ===== JSON 文件下载 =====
  downloadJSON(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

window.Storage = Storage;
