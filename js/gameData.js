/**
 * gameData.js - Honor of Kings static game data
 * Coordinate system: normalized 0-1000, calibrated against map image
 */

const ELEMENT_TYPES = { TOWER:'tower', JUNGLE:'jungle', DRAGON_PIT:'dragon_pit', BUSH:'bush', SPECIAL:'special', PATH:'path' };

// ===== Towers (calibrated) =====
const TOWERS = [
  // Blue side
  { id:'blue_clash_t1', team:'blue', lane:'clash', tier:1, x:291, y:345, name:'蓝方对抗路一塔' },
  { id:'blue_clash_t2', team:'blue', lane:'clash', tier:2, x:293, y:548, name:'蓝方对抗路二塔' },
  { id:'blue_clash_t3', team:'blue', lane:'clash', tier:3, x:298, y:693, name:'蓝方对抗路高地塔' },
  { id:'blue_mid_t1',   team:'blue', lane:'mid',   tier:1, x:452, y:561, name:'蓝方中路一塔' },
  { id:'blue_mid_t2',   team:'blue', lane:'mid',   tier:2, x:418, y:660, name:'蓝方中路二塔' },
  { id:'blue_mid_t3',   team:'blue', lane:'mid',   tier:3, x:360, y:744, name:'蓝方中路高地塔' },
  { id:'blue_farm_t1',  team:'blue', lane:'farm',  tier:1, x:603, y:855, name:'蓝方发育路一塔' },
  { id:'blue_farm_t2',  team:'blue', lane:'farm',  tier:2, x:488, y:852, name:'蓝方发育路二塔' },
  { id:'blue_farm_t3',  team:'blue', lane:'farm',  tier:3, x:388, y:855, name:'蓝方发育路高地塔' },
  // Red side
  { id:'red_clash_t1',  team:'red',  lane:'clash', tier:1, x:414, y:126, name:'红方对抗路一塔' },
  { id:'red_clash_t2',  team:'red',  lane:'clash', tier:2, x:511, y:141, name:'红方对抗路二塔' },
  { id:'red_clash_t3',  team:'red',  lane:'clash', tier:3, x:609, y:139, name:'红方对抗路高地塔' },
  { id:'red_mid_t1',    team:'red',  lane:'mid',   tier:1, x:546, y:429, name:'红方中路一塔' },
  { id:'red_mid_t2',    team:'red',  lane:'mid',   tier:2, x:579, y:336, name:'红方中路二塔' },
  { id:'red_mid_t3',    team:'red',  lane:'mid',   tier:3, x:637, y:251, name:'红方中路高地塔' },
  { id:'red_farm_t1',   team:'red',  lane:'farm',  tier:1, x:701, y:683, name:'红方发育路一塔' },
  { id:'red_farm_t2',   team:'red',  lane:'farm',  tier:2, x:704, y:445, name:'红方发育路二塔' },
  { id:'red_farm_t3',   team:'red',  lane:'farm',  tier:3, x:700, y:300, name:'红方发育路高地塔' },
];

// ===== Jungle camps (calibrated) =====
// Blue: upper(cheetah/lizard/blue/red_armor), lower(boar/monkey/red/pheasant)
const JUNGLE_CAMPS = [
  // Blue upper half
  { id:'blue_bluebuff', team:'blue', type:'buff', subType:'blue', x:397, y:481, name:'蓝BUFF', respawn:90 },
  { id:'blue_cheetah', team:'blue', type:'small', subType:'cheetah', x:374, y:569, name:'猎豹', respawn:70 },
  { id:'blue_lizard', team:'blue', type:'small', subType:'lizard', x:346, y:470, name:'蜥蜴', respawn:70 },
  { id:'blue_red_armor', team:'blue', type:'small', subType:'red_armor', x:350, y:329, name:'赤甲', respawn:70 },
  // Blue lower half
  { id:'blue_redbuff', team:'blue', type:'buff', subType:'red', x:512, y:725, name:'红BUFF', respawn:90 },
  { id:'blue_mountain_boar', team:'blue', type:'small', subType:'mountain_boar', x:486, y:636, name:'山豪', respawn:70 },
  { id:'blue_mountain_monkey', team:'blue', type:'small', subType:'mountain_monkey', x:439, y:720, name:'山猕', respawn:70 },
  { id:'blue_fierce_pheasant', team:'blue', type:'small', subType:'fierce_pheasant', x:571, y:772, name:'烈雉', respawn:70 },
  // Red upper half
  { id:'red_bluebuff', team:'red', type:'buff', subType:'blue', x:601, y:515, name:'蓝BUFF', respawn:90 },
  { id:'red_cheetah', team:'red', type:'small', subType:'cheetah', x:624, y:423, name:'猎豹', respawn:70 },
  { id:'red_lizard', team:'red', type:'small', subType:'lizard', x:653, y:523, name:'蜥蜴', respawn:70 },
  { id:'red_red_armor', team:'red', type:'small', subType:'red_armor', x:645, y:655, name:'赤甲', respawn:70 },
  // Red lower half
  { id:'red_redbuff', team:'red', type:'buff', subType:'red', x:484, y:269, name:'红BUFF', respawn:90 },
  { id:'red_mountain_boar', team:'red', type:'small', subType:'mountain_boar', x:513, y:354, name:'山豪', respawn:70 },
  { id:'red_mountain_monkey', team:'red', type:'small', subType:'mountain_monkey', x:558, y:270, name:'山猕', respawn:70 },
  { id:'red_fierce_pheasant', team:'red', type:'small', subType:'fierce_pheasant', x:428, y:220, name:'烈雉', respawn:70 },
];

// ===== Dragon pits (calibrated) =====
const DRAGON_PITS = [
  { id:'tyrant_pit', type:'tyrant', x:573, y:663, name:'暴君坑',
    stages:[{name:'暴君',startTime:120,endTime:600},{name:'暗影暴君',startTime:600,endTime:Infinity}], respawn:240 },
  { id:'overlord_pit', type:'overlord', x:424, y:331, name:'主宰坑',
    stages:[{name:'先知主宰',startTime:120,endTime:600},{name:'暗影主宰',startTime:600,endTime:Infinity}], respawn:240 },
  { id:'storm_dragon', type:'storm', x:390, y:369, name:'风暴龙王',
    stages:[{name:'风暴龙王',startTime:1200,endTime:Infinity}], respawn:180 },
];

// ===== Special points (calibrated + 6 blood packs) =====
const SPECIAL_POINTS = [
  // Teleport array
  { id:'teleport_array', type:'teleport', x:287, y:121, name:'传送阵(对抗路)',
    firstAppear:60, disappear:600, cooldown:30 },
  // Red falcon
  { id:'red_falcon_special', type:'red_falcon', x:706, y:868, name:'红隼(发育路)',
    firstAppear:30, respawn:null },
  // Blue blood packs (3 lanes)
  { id:'blue_hp_clash', team:'blue', type:'hp_pack', lane:'clash', x:292, y:368, name:'蓝方血包(对抗路)',
    firstAppear:60, respawn:75, stopOnT1Destroyed:true },
  { id:'blue_hp_mid',   team:'blue', type:'hp_pack', lane:'mid',   x:443, y:576, name:'蓝方血包(中路)',
    firstAppear:60, respawn:75, stopOnT1Destroyed:true },
  { id:'blue_hp_farm',  team:'blue', type:'hp_pack', lane:'farm',  x:591, y:856, name:'蓝方血包(发育路)',
    firstAppear:60, respawn:75, stopOnT1Destroyed:true },
  // Red blood packs (3 lanes)
  { id:'red_hp_clash',  team:'red',  type:'hp_pack', lane:'clash', x:427, y:125, name:'红方血包(对抗路)',
    firstAppear:60, respawn:75, stopOnT1Destroyed:true },
  { id:'red_hp_mid',    team:'red',  type:'hp_pack', lane:'mid',   x:555, y:415, name:'红方血包(中路)',
    firstAppear:60, respawn:75, stopOnT1Destroyed:true },
  { id:'red_hp_farm',   team:'red',  type:'hp_pack', lane:'farm',  x:701, y:660, name:'红方血包(发育路)',
    firstAppear:60, respawn:75, stopOnT1Destroyed:true },
  // Vision spirits (spawn at T2 ruins)
  { id:'blue_vision_clash', team:'blue', type:'vision_spirit', x:294, y:569, name:'蓝方视野之灵(对抗路)',
    requiresT2Destroyed:true, lane:'clash', duration:60, respawn:120 },
  { id:'red_vision_clash',  team:'red',  type:'vision_spirit', x:522, y:141, name:'红方视野之灵(对抗路)',
    requiresT2Destroyed:true, lane:'clash', duration:60, respawn:120 },
  { id:'blue_vision_farm',  team:'blue', type:'vision_spirit', x:475, y:853, name:'蓝方视野之灵(发育路)',
    requiresT2Destroyed:true, lane:'farm', duration:60, respawn:120 },
  { id:'red_vision_farm',   team:'red',  type:'vision_spirit', x:705, y:423, name:'红方视野之灵(发育路)',
    requiresT2Destroyed:true, lane:'farm', duration:60, respawn:120 },
];

// ===== Bushes (approximate, to be calibrated) =====
// Bushes: calibrated centers → top-left (x = cx - w/2, y = cy - h/2)
// w/h: river=40x22, lane_river=35x25, side=28x22, tower=28x20, jungle=38x28
const BUSH_ZONES = [
  // === 河道中草 (shared, w40 h22) ===
  { id:'rv_ctr_l',  x:417, y:399, w:40, h:22, name:'河道中草(左)' },
  { id:'rv_ctr_r',  x:542, y:571, w:40, h:22, name:'河道中草(右)' },
  // === 中路河道草 (w35 h25) ===
  { id:'rv_mid_l',  x:449, y:438, w:35, h:25, name:'中路河道草(左)' },
  { id:'rv_mid_r',  x:515, y:540, w:35, h:25, name:'中路河道草(右)' },
  // === 对抗路河道草 (w35 h25) ===
  { id:'rv_clash_u', x:373, y:249, w:35, h:25, name:'对抗路河道草(上)' },
  { id:'rv_clash_d', x:347, y:275, w:35, h:25, name:'对抗路河道草(下)' },
  // === 发育路河道草 (w35 h25) ===
  { id:'rv_farm_u', x:611, y:678, w:35, h:25, name:'发育路河道草(上)' },
  { id:'rv_farm_d', x:588, y:726, w:35, h:25, name:'发育路河道草(下)' },
  // === 对抗路边草 (shared, w28 h22) ===
  { id:'sd_clash_u', x:323, y:121, w:28, h:22, name:'对抗路上边草' },
  { id:'sd_clash_d', x:277, y:201, w:28, h:22, name:'对抗路下边草' },
  // === 发育路边草 (shared, w28 h22) ===
  { id:'sd_farm_u', x:691, y:787, w:28, h:22, name:'发育路上边草' },
  { id:'sd_farm_d', x:655, y:847, w:28, h:22, name:'发育路下边草' },

  // === Blue side (tower w28h20, jungle w38h28) ===
  { id:'b_mid_t1_u',  team:'blue', x:424, y:469, w:28, h:20, name:'蓝方中路一塔上草' },
  { id:'b_mid_t1_d',  team:'blue', x:410, y:532, w:28, h:20, name:'蓝方中路一塔下草' },
  { id:'b_cl_t1',     team:'blue', x:318, y:320, w:28, h:20, name:'蓝方对抗路一塔草' },
  { id:'b_fm_t1',     team:'blue', x:590, y:756, w:28, h:20, name:'蓝方发育路一塔草' },
  { id:'b_mid_t2',    team:'blue', x:447, y:688, w:28, h:20, name:'蓝方中路二塔草' },
  { id:'b_cl_t2',     team:'blue', x:273, y:456, w:28, h:20, name:'蓝方对抗路二塔草' },
  { id:'b_fm_t2',     team:'blue', x:524, y:866, w:28, h:20, name:'蓝方发育路二塔草' },
  { id:'b_blue_j1',   team:'blue', x:339, y:422, w:38, h:28, name:'蓝方蓝区草1' },
  { id:'b_blue_j2',   team:'blue', x:361, y:486, w:38, h:28, name:'蓝方蓝区草2' },
  { id:'b_red_j1',    team:'blue', x:500, y:744, w:38, h:28, name:'蓝方红区草1' },
  { id:'b_red_j2',    team:'blue', x:515, y:680, w:38, h:28, name:'蓝方红区草2' },
  { id:'b_red_j3',    team:'blue', x:461, y:772, w:38, h:28, name:'蓝方红区草3' },

  // === Red side (tower w28h20, jungle w38h28) ===
  { id:'r_mid_t1_u',  team:'red', x:544, y:506, w:28, h:20, name:'红方中路一塔上草' },
  { id:'r_mid_t1_d',  team:'red', x:558, y:439, w:28, h:20, name:'红方中路一塔下草' },
  { id:'r_cl_t1',     team:'red', x:379, y:217, w:28, h:20, name:'红方对抗路一塔草' },
  { id:'r_fm_t1',     team:'red', x:645, y:647, w:28, h:20, name:'红方发育路一塔草' },
  { id:'r_mid_t2',    team:'red', x:522, y:287, w:28, h:20, name:'红方中路二塔草' },
  { id:'r_cl_t2',     team:'red', x:445, y:107, w:28, h:20, name:'红方对抗路二塔草' },
  { id:'r_fm_t2',     team:'red', x:697, y:518, w:28, h:20, name:'红方发育路二塔草' },
  { id:'r_blue_j1',   team:'red', x:598, y:473, w:38, h:28, name:'红方蓝区草1' },
  { id:'r_blue_j2',   team:'red', x:621, y:546, w:38, h:28, name:'红方蓝区草2' },
  { id:'r_red_j1',    team:'red', x:445, y:291, w:38, h:28, name:'红方红区草1' },
  { id:'r_red_j2',    team:'red', x:463, y:222, w:38, h:28, name:'红方红区草2' },
  { id:'r_red_j3',    team:'red', x:499, y:192, w:38, h:28, name:'红方红区草3' },
];

// ===== Minion paths =====
const MINION_PATHS = [
  { id:'path_clash', lane:'clash', points:[
    {x:30,y:140},{x:130,y:160},{x:250,y:200},{x:380,y:260},{x:480,y:320},{x:550,y:360},{x:650,y:440},{x:730,y:530},{x:800,y:650},{x:860,y:750}
  ]},
  { id:'path_mid', lane:'mid', points:[
    {x:60,y:460},{x:150,y:450},{x:280,y:440},{x:400,y:445},{x:520,y:450},{x:650,y:460},{x:780,y:470},{x:880,y:480}
  ]},
  { id:'path_farm', lane:'farm', points:[
    {x:30,y:800},{x:130,y:780},{x:250,y:740},{x:380,y:680},{x:480,y:620},{x:550,y:570},{x:650,y:500},{x:730,y:410},{x:800,y:290},{x:860,y:190}
  ]},
];

// ===== Time events =====
const TIME_EVENTS = [
  { time:10, type:'minion_spawn', name:'第一波兵线出发', repeat:33 },
  { time:30, type:'jungle_spawn', name:'野怪首次刷新' },
  { time:30, type:'red_falcon_spawn', name:'红隼出现' },
  { time:60, type:'hp_pack_spawn', name:'血包首次登场', repeat:75 },
  { time:60, type:'space_spirit_spawn', name:'空间之灵出现', repeat:60, endRepeat:240 },
  { time:120, type:'dragon_spawn', name:'先知主宰/暴君首次刷新' },
  { time:240, type:'shield_off', name:'防御塔护盾+野区保护消失' },
  { time:240, type:'space_spirit_end', name:'空间之灵不再出现' },
  { time:600, type:'dragon_enhance', name:'主宰/暴君获得强化' },
  { time:600, type:'teleport_end', name:'传送阵消失' },
  { time:1200, type:'storm_dragon_spawn', name:'风暴龙王降临' },
];

// ===== Heroes =====
const HEROES = [
  // === 打野 Jungle ===
  { id:'h_chanye', name:'嫦娥', role:'mage', icon:'娥', positions:'打野 边路' },
  { id:'h_jing', name:'镜', role:'assassin', icon:'镜', positions:'打野' },
  { id:'h_peiqinhu', name:'裴擒虎', role:'assassin', icon:'虎', positions:'打野' },
  { id:'h_machao', name:'马超', role:'fighter', icon:'超', positions:'打野 边路' },
  { id:'h_luna', name:'露娜', role:'assassin', icon:'娜', positions:'打野' },
  { id:'h_hanxin', name:'韩信', role:'assassin', icon:'信', positions:'打野' },
  { id:'h_fei', name:'暃', role:'assassin', icon:'暃', positions:'打野' },
  { id:'h_yunzj', name:'云中君', role:'assassin', icon:'君', positions:'打野' },
  { id:'h_caocao', name:'曹操', role:'fighter', icon:'操', positions:'打野 边路' },
  { id:'h_yangjian', name:'杨戬', role:'fighter', icon:'戬', positions:'打野 边路' },
  { id:'h_zhugeliang', name:'诸葛亮', role:'mage', icon:'亮', positions:'中路 打野' },
  { id:'h_bailixuance', name:'百里玄策', role:'assassin', icon:'策', positions:'打野' },
  { id:'h_gongben', name:'宫本武藏', role:'fighter', icon:'藏', positions:'打野' },
  { id:'h_aguduo', name:'阿古朵', role:'marksman', icon:'朵', positions:'发育路 打野' },
  { id:'h_kai', name:'铠', role:'fighter', icon:'铠', positions:'打野 边路' },
  { id:'h_dianwei', name:'典韦', role:'fighter', icon:'韦', positions:'打野' },
  { id:'h_pangu', name:'盘古', role:'fighter', icon:'古', positions:'打野 边路' },
  { id:'h_juyoujing', name:'橘右京', role:'assassin', icon:'京', positions:'打野 边路' },
  { id:'h_liubei', name:'刘备', role:'fighter', icon:'备', positions:'打野' },
  { id:'h_yadianna', name:'雅典娜', role:'fighter', icon:'娜', positions:'打野' },
  { id:'h_dasiming', name:'大司命', role:'fighter', icon:'命', positions:'打野 边路' },
  { id:'h_lan', name:'澜', role:'assassin', icon:'澜', positions:'打野' },
  { id:'h_yao', name:'曜', role:'fighter', icon:'曜', positions:'打野 边路' },
  { id:'h_sikongzhen', name:'司空震', role:'fighter', icon:'震', positions:'发育路 打野 边路' },
  { id:'h_ying', name:'影', role:'fighter', icon:'影', positions:'打野 边路' },
  { id:'h_simayi', name:'司马懿', role:'assassin', icon:'懿', positions:'中路 打野' },
  { id:'h_libai', name:'李白', role:'assassin', icon:'白', positions:'打野' },
  { id:'h_zhaoyun', name:'赵云', role:'fighter', icon:'云', positions:'打野' },
  { id:'h_lanlingwang', name:'兰陵王', role:'assassin', icon:'陵', positions:'打野' },
  { id:'h_yunying', name:'云缨', role:'fighter', icon:'缨', positions:'打野' },
  { id:'h_cang', name:'苍', role:'marksman', icon:'苍', positions:'发育路 打野' },
  { id:'h_mengqi', name:'梦奇', role:'tank', icon:'奇', positions:'打野 边路' },
  { id:'h_nakelulu', name:'娜可露露', role:'assassin', icon:'露', positions:'打野' },
  { id:'h_sunwukong', name:'孙悟空', role:'assassin', icon:'空', positions:'打野' },
  { id:'h_ake', name:'阿轲', role:'assassin', icon:'轲', positions:'打野' },
  { id:'h_yuanliu_ck', name:'元流之子(刺客)', role:'support', icon:'元', positions:'打野' },
  { id:'h_zhubajie', name:'猪八戒', role:'tank', icon:'戒', positions:'打野 边路' },
  { id:'h_zhaohuaizhen', name:'赵怀真', role:'fighter', icon:'真', positions:'打野 辅助 边路' },
  { id:'h_zhongwuyan', name:'钟无艳', role:'fighter', icon:'艳', positions:'打野 边路' },
  { id:'h_chiya', name:'蚩奼', role:'fighter', icon:'奼', positions:'发育路 打野 边路' },
  { id:'h_miyue', name:'芈月', role:'mage', icon:'月', positions:'打野 边路' },
  { id:'h_nezha', name:'哪吒', role:'fighter', icon:'吒', positions:'打野 边路' },
  { id:'h_sunce', name:'孙策', role:'tank', icon:'策', positions:'打野 边路' },
  { id:'h_liyuanfang', name:'李元芳', role:'marksman', icon:'芳', positions:'发育路 打野' },
  { id:'h_yuanliu_tk', name:'元流之子(坦克)', role:'tank', icon:'坦', positions:'打野 边路' },
  { id:'h_xiahoudun', name:'夏侯惇', role:'tank', icon:'惇', positions:'打野 辅助 边路' },
  { id:'h_yase', name:'亚瑟', role:'fighter', icon:'瑟', positions:'打野 边路' },
  // === 中路 Mid ===
  { id:'h_shenmengxi', name:'沈梦溪', role:'mage', icon:'溪', positions:'中路' },
  { id:'h_haiyue', name:'海月', role:'mage', icon:'月', positions:'中路' },
  { id:'h_nvwa', name:'女娲', role:'mage', icon:'娲', positions:'中路' },
  { id:'h_daqiao', name:'大乔', role:'support', icon:'乔', positions:'中路 辅助' },
  { id:'h_shangguan', name:'上官婉儿', role:'mage', icon:'儿', positions:'中路' },
  { id:'h_huowu', name:'不知火舞', role:'assassin', icon:'舞', positions:'中路' },
  { id:'h_diaochan', name:'貂蝉', role:'mage', icon:'蝉', positions:'中路 边路' },
  { id:'h_zhangliang', name:'张良', role:'mage', icon:'良', positions:'中路 辅助' },
  { id:'h_zhenji', name:'甄姬', role:'mage', icon:'姬', positions:'中路' },
  { id:'h_yixing', name:'弈星', role:'mage', icon:'星', positions:'中路' },
  { id:'h_xishi', name:'西施', role:'mage', icon:'施', positions:'中路' },
  { id:'h_yangyuhuan', name:'杨玉环', role:'mage', icon:'环', positions:'中路 辅助' },
  { id:'h_ganjiang', name:'干将莫邪', role:'mage', icon:'邪', positions:'中路' },
  { id:'h_wuzetian', name:'武则天', role:'mage', icon:'天', positions:'中路' },
  { id:'h_anqila', name:'安琪拉', role:'mage', icon:'琪', positions:'中路' },
  { id:'h_xiaoqiao', name:'小乔', role:'mage', icon:'乔', positions:'中路' },
  { id:'h_yuanliu_fs', name:'元流之子(法师)', role:'mage', icon:'法', positions:'中路' },
  { id:'h_jiangziya', name:'姜子牙', role:'mage', icon:'牙', positions:'中路 辅助' },
  { id:'h_hainuo', name:'海诺', role:'fighter', icon:'诺', positions:'中路 边路' },
  { id:'h_gaojianli', name:'高渐离', role:'mage', icon:'离', positions:'中路' },
  { id:'h_wangzhaojun', name:'王昭君', role:'mage', icon:'君', positions:'中路 辅助' },
  { id:'h_zhouyu', name:'周瑜', role:'mage', icon:'瑜', positions:'中路' },
  { id:'h_yingzheng', name:'嬴政', role:'mage', icon:'政', positions:'中路' },
  { id:'h_daji', name:'妲己', role:'mage', icon:'己', positions:'中路' },
  { id:'h_milaidi', name:'米莱狄', role:'mage', icon:'狄', positions:'中路' },
  { id:'h_bianque', name:'扁鹊', role:'mage', icon:'鹊', positions:'中路 辅助' },
  { id:'h_jinchan', name:'金蝉', role:'mage', icon:'蝉', positions:'中路 辅助' },
  { id:'h_mozi', name:'墨子', role:'mage', icon:'墨', positions:'中路 辅助' },
  // === 边路 Solo/Clash ===
  { id:'h_xialuote', name:'夏洛特', role:'fighter', icon:'特', positions:'边路' },
  { id:'h_yuange', name:'元歌', role:'assassin', icon:'歌', positions:'发育路 边路' },
  { id:'h_guanyu', name:'关羽', role:'fighter', icon:'羽', positions:'边路' },
  { id:'h_kuangtie', name:'狂铁', role:'fighter', icon:'铁', positions:'边路' },
  { id:'h_sulie', name:'苏烈', role:'support', icon:'烈', positions:'辅助 边路' },
  { id:'h_huamulan', name:'花木兰', role:'fighter', icon:'兰', positions:'边路' },
  { id:'h_laofuzi', name:'老夫子', role:'fighter', icon:'子', positions:'边路' },
  { id:'h_lixin', name:'李信', role:'fighter', icon:'信', positions:'发育路 边路' },
  { id:'h_mengtian', name:'蒙恬', role:'tank', icon:'恬', positions:'边路' },
  { id:'h_lvbu', name:'吕布', role:'fighter', icon:'布', positions:'边路' },
  { id:'h_lianpo', name:'廉颇', role:'tank', icon:'颇', positions:'辅助 边路' },
  { id:'h_baiqi', name:'白起', role:'tank', icon:'起', positions:'边路' },
  { id:'h_jixiaoman', name:'姬小满', role:'fighter', icon:'满', positions:'边路' },
  { id:'h_yalian', name:'亚连', role:'fighter', icon:'连', positions:'边路' },
  { id:'h_liubang', name:'刘邦', role:'tank', icon:'邦', positions:'辅助 边路' },
  { id:'h_damo', name:'达摩', role:'fighter', icon:'摩', positions:'边路' },
  { id:'h_xiangyu', name:'项羽', role:'tank', icon:'羽', positions:'辅助 边路' },
  { id:'h_chengyaojin', name:'程咬金', role:'tank', icon:'金', positions:'边路' },
  { id:'h_donghuang', name:'东皇太一', role:'support', icon:'一', positions:'辅助 边路' },
  // === 发育路 ADC ===
  { id:'h_gongsunli', name:'公孙离', role:'marksman', icon:'离', positions:'发育路' },
  { id:'h_aoyin', name:'敖隐', role:'marksman', icon:'隐', positions:'发育路' },
  { id:'h_yuanliu_ss', name:'元流之子(射手)', role:'marksman', icon:'射', positions:'发育路' },
  { id:'h_ailin', name:'艾琳', role:'marksman', icon:'琳', positions:'发育路' },
  { id:'h_geya', name:'戈娅', role:'marksman', icon:'娅', positions:'发育路' },
  { id:'h_sunshangxiang', name:'孙尚香', role:'marksman', icon:'香', positions:'发育路' },
  { id:'h_direnjie', name:'狄仁杰', role:'marksman', icon:'杰', positions:'发育路' },
  { id:'h_yuji', name:'虞姬', role:'marksman', icon:'姬', positions:'发育路' },
  { id:'h_houyi', name:'后羿', role:'marksman', icon:'羿', positions:'发育路' },
  { id:'h_sunquan', name:'孙权', role:'marksman', icon:'权', positions:'发育路' },
  { id:'h_makeboluo', name:'马可波罗', role:'marksman', icon:'罗', positions:'发育路' },
  { id:'h_bailishouyue', name:'百里守约', role:'marksman', icon:'约', positions:'发育路' },
  { id:'h_huangzhong', name:'黄忠', role:'marksman', icon:'忠', positions:'发育路' },
  { id:'h_luban', name:'鲁班七号', role:'marksman', icon:'班', positions:'发育路' },
  { id:'h_jialuo', name:'伽罗', role:'marksman', icon:'罗', positions:'发育路' },
  { id:'h_mengya', name:'蒙犽', role:'marksman', icon:'犽', positions:'发育路' },
  { id:'h_laixiao', name:'莱西奥', role:'marksman', icon:'奥', positions:'发育路' },
  // === 辅助 Support ===
  { id:'h_dunshan', name:'盾山', role:'support', icon:'山', positions:'辅助' },
  { id:'h_dayu', name:'大禹', role:'support', icon:'禹', positions:'辅助' },
  { id:'h_shaosiyuan', name:'少司缘', role:'support', icon:'缘', positions:'辅助' },
  { id:'h_kongkonger', name:'空空儿', role:'support', icon:'空', positions:'辅助' },
  { id:'h_zhangfei', name:'张飞', role:'tank', icon:'飞', positions:'辅助' },
  { id:'h_zhuangzhou', name:'庄周', role:'support', icon:'周', positions:'辅助' },
  { id:'h_taiyizhenren', name:'太乙真人', role:'support', icon:'乙', positions:'辅助' },
  { id:'h_sunbin', name:'孙膑', role:'support', icon:'膑', positions:'辅助' },
  { id:'h_guiguzi', name:'鬼谷子', role:'support', icon:'谷', positions:'辅助' },
  { id:'h_zhongkui', name:'钟馗', role:'support', icon:'馗', positions:'辅助' },
  { id:'h_lubandashi', name:'鲁班大师', role:'support', icon:'师', positions:'辅助' },
  { id:'h_sangqi', name:'桑启', role:'support', icon:'启', positions:'辅助' },
  { id:'h_caiwenji', name:'蔡文姬', role:'support', icon:'姬', positions:'辅助' },
  { id:'h_yao_sup', name:'瑶', role:'support', icon:'瑶', positions:'辅助' },
  { id:'h_duoliya', name:'朵莉亚', role:'support', icon:'亚', positions:'辅助' },
  { id:'h_liushan', name:'刘禅', role:'support', icon:'禅', positions:'辅助' },
  { id:'h_niumo', name:'牛魔', role:'support', icon:'魔', positions:'辅助' },
  { id:'h_mingshiyin', name:'明世隐', role:'support', icon:'隐', positions:'辅助' },
  { id:'h_yuanliu_sup', name:'元流之子(辅助)', role:'support', icon:'辅', positions:'辅助' },
];

const ROLE_COLORS = { fighter:'#d4a574', assassin:'#8b5cf6', mage:'#06b6d4', marksman:'#f59e0b', tank:'#10b981', support:'#ec4899' };
const ROLE_NAMES = { fighter:'战士', assassin:'刺客', mage:'法师', marksman:'射手', tank:'坦克', support:'辅助' };

// Export
// shared helper: find CLOSEST map element at coords (not first match)
window.findElementAt = function(mapX, mapY, threshold) {
  let best = null, bestDist = Infinity;
  for (const t of TOWERS) {
    const d = Math.hypot(t.x-mapX, t.y-mapY);
    if (d < threshold && d < bestDist) { best = {type:'tower', id:t.id, data:t}; bestDist = d; }
  }
  for (const c of JUNGLE_CAMPS) {
    const d = Math.hypot(c.x-mapX, c.y-mapY);
    if (d < threshold && d < bestDist) { best = {type:'camp', id:c.id, data:c}; bestDist = d; }
  }
  for (const d of DRAGON_PITS) {
    const dist = Math.hypot(d.x-mapX, d.y-mapY);
    if (dist < threshold*1.1 && dist < bestDist) { best = {type:'dragon', id:d.id, data:d}; bestDist = dist; }
  }
  for (const s of SPECIAL_POINTS) {
    const dist = Math.hypot(s.x-mapX, s.y-mapY);
    if (dist < threshold && dist < bestDist) { best = {type:'special', id:s.id, data:s}; bestDist = dist; }
  }
  for (const b of BUSH_ZONES) {
    if (mapX>=b.x && mapX<=b.x+b.w && mapY>=b.y && mapY<=b.y+b.h) {
      const cx = b.x + b.w/2, cy = b.y + b.h/2;
      const dist = Math.hypot(cx-mapX, cy-mapY);
      if (dist < bestDist) { best = {type:'bush', id:b.id, data:b}; bestDist = dist; }
    }
  }
  return best;
};

// find ALL elements at coords (for conflict resolution popup)
window.findAllElementsAt = function(mapX, mapY, threshold) {
  const results = [];
  for (const t of TOWERS) { if (Math.hypot(t.x-mapX, t.y-mapY) < threshold) results.push({type:'tower', id:t.id, data:t}); }
  for (const c of JUNGLE_CAMPS) { if (Math.hypot(c.x-mapX, c.y-mapY) < threshold) results.push({type:'camp', id:c.id, data:c}); }
  for (const d of DRAGON_PITS) { if (Math.hypot(d.x-mapX, d.y-mapY) < threshold*1.1) results.push({type:'dragon', id:d.id, data:d}); }
  for (const s of SPECIAL_POINTS) { if (Math.hypot(s.x-mapX, s.y-mapY) < threshold) results.push({type:'special', id:s.id, data:s}); }
  return results;
};

// check if a point is inside any bush
window.isInBush = function(mapX, mapY) {
  for (const b of BUSH_ZONES) {
    if (mapX >= b.x && mapX <= b.x + b.w && mapY >= b.y && mapY <= b.y + b.h) return b;
  }
  return null;
};

window.ELEMENT_TYPES = ELEMENT_TYPES;
window.TOWERS = TOWERS;
window.JUNGLE_CAMPS = JUNGLE_CAMPS;
window.DRAGON_PITS = DRAGON_PITS;
window.SPECIAL_POINTS = SPECIAL_POINTS;
window.BUSH_ZONES = BUSH_ZONES;
window.MINION_PATHS = MINION_PATHS;
window.TIME_EVENTS = TIME_EVENTS;
window.HEROES = HEROES;
window.ROLE_COLORS = ROLE_COLORS;
window.ROLE_NAMES = ROLE_NAMES;
