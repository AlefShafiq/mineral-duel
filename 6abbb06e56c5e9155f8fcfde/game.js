/* =====================================================================
   矿物对决 v2 · 切割与神话武器
   动作制（无能量）：出牌 / 切割 / 镶嵌 / 攻击
   原石 --切割--> 宝石 --镶嵌--> 武器增益  或  宝石直接打出当攻击
   ===================================================================== */

/* ---------------- 1. 常量与卡牌数据 ---------------- */
const MAX_HP = 30;
// 无动作点：自由出牌，仅对下列动作设每回合次数上限
// atk = 所有攻击（原石直接攻击 / 宝石直接打出 / 武器攻击）合并为一类，每回合合计 1 次；kusanagiAtk = 草薙剑专用，不占 atk
const TURN_LIMITS = { rawDef:1, atk:1, kusanagiAtk:1, cut:6 };
const MAX_GEMS = 6;      // 宝石栏上限
const MAX_HAND = 8;

// 原石 → 宝石：一块原石可切割出多种真实宝石变种（切割成功时按权重加权随机）
// 耐久 = 原石莫氏硬度；bonus 为镶嵌后的加成；weight 越大越常见
const RAW = {
  talc: { id:'talc', name:'滑石', hardness:1, gems:[
    { id:'soapstone', name:'皂石', color:'#b9c2d6', bonusText:'武器耐久 +3', bonus:{ dur:3 }, weight:1 },
  ]},
  graphite: { id:'graphite', name:'石墨', hardness:2, gems:[
    { id:'graphiteXtal', name:'石墨晶', color:'#7d879b', bonusText:'武器攻击 +1', bonus:{ atk:1 }, weight:1 },
  ]},
  gypsum: { id:'gypsum', name:'石膏', hardness:2, gems:[
    { id:'alabaster', name:'雪花石膏', color:'#dfe7f5', bonusText:'镶嵌时主晶 +3 护盾', bonus:{ shieldOnSocket:3 }, weight:2 },
    { id:'selenite', name:'透石膏', color:'#eef4ff', bonusText:'武器耐久 +2', bonus:{ dur:2 }, weight:1 },
  ]},
  amber: { id:'amber', name:'琥珀', hardness:2, gems:[
    { id:'amberGem', name:'琥珀', color:'#d9b26a', bonusText:'每回合开始主晶回复 1', bonus:{ regen:1 }, weight:1 },
  ]},
  mica: { id:'mica', name:'云母', hardness:3, gems:[
    { id:'micaSheet', name:'云母片', color:'#9fb4e8', bonusText:'武器插槽 +1', bonus:{ sockets:1 }, weight:1 },
  ]},
  calcite: { id:'calcite', name:'方解石', hardness:3, gems:[
    { id:'icelandSpar', name:'冰洲石', color:'#cfeaff', bonusText:'攻击 50% 穿透护盾', bonus:{ pierce:0.5 }, weight:2 },
    { id:'calciteGem', name:'方解石', color:'#e8f2ff', bonusText:'镶嵌时主晶 +2 护盾', bonus:{ shieldOnSocket:2 }, weight:2 },
  ]},
  malachite: { id:'malachite', name:'孔雀石', hardness:4, gems:[
    { id:'malachiteGem', name:'孔雀石', color:'#3fae86', bonusText:'受到攻击伤害 -1', bonus:{ armor:1 }, weight:1 },
  ]},
  fluorite: { id:'fluorite', name:'萤石', hardness:4, gems:[
    { id:'fluoriteGem', name:'萤石', color:'#86efc9', bonusText:'对手下回合切割成功率 -20%', bonus:{ debuffCut:0.2 }, weight:2 },
    { id:'purpleFluorite', name:'紫萤石', color:'#b39ff0', bonusText:'对手下回合切割成功率 -30%', bonus:{ debuffCut:0.3 }, weight:1 },
  ]},
  azurite: { id:'azurite', name:'蓝铜矿', hardness:4, gems:[
    { id:'azuriteGem', name:'蓝铜矿', color:'#4a7fd8', bonusText:'攻击 35% 穿透护盾', bonus:{ pierce:0.35 }, weight:1 },
  ]},
  apatite: { id:'apatite', name:'磷灰石', hardness:5, gems:[
    { id:'apatiteGem', name:'磷灰石', color:'#9fb4e8', bonusText:'武器攻击 +2', bonus:{ atk:2 }, weight:2 },
    { id:'blueApatite', name:'蓝磷灰石', color:'#7fd0e8', bonusText:'武器攻击 +3', bonus:{ atk:3 }, weight:1 },
  ]},
  turquoise: { id:'turquoise', name:'绿松石', hardness:5, gems:[
    { id:'turquoiseGem', name:'绿松石', color:'#59c9c0', bonusText:'镶嵌时主晶 +3 护盾', bonus:{ shieldOnSocket:3 }, weight:1 },
  ]},
  lapis: { id:'lapis', name:'青金石', hardness:5, gems:[
    { id:'lapisGem', name:'青金石', color:'#3b5bd9', bonusText:'武器插槽 +1', bonus:{ sockets:1 }, weight:1 },
  ]},
  pyrite: { id:'pyrite', name:'黄铁矿', hardness:6, gems:[
    { id:'foolsGold', name:'愚人金', color:'#d8c46a', bonusText:'攻击 30% 概率双倍', bonus:{ doubleChance:0.3 }, weight:1 },
  ]},
  feldspar: { id:'feldspar', name:'长石', hardness:6, gems:[
    { id:'moonstone', name:'月光石', color:'#cfe0ff', bonusText:'每回合开始主晶回复 1', bonus:{ regen:1 }, weight:2 },
    { id:'labradorite', name:'拉长石', color:'#8fb8e8', bonusText:'受到攻击伤害 -1', bonus:{ armor:1 }, weight:2 },
    { id:'sunstone', name:'日光石', color:'#e8b56a', bonusText:'武器攻击 +2', bonus:{ atk:2 }, weight:1 },
    { id:'amazonite', name:'天河石', color:'#6fd3c0', bonusText:'每回合开始主晶回复 2', bonus:{ regen:2 }, weight:1 },
  ]},
  magnetite: { id:'magnetite', name:'磁铁矿', hardness:6, gems:[
    { id:'lodestone', name:'磁石', color:'#8a93a8', bonusText:'受到攻击伤害 -1', bonus:{ armor:1 }, weight:1 },
  ]},
  opal: { id:'opal', name:'欧泊', hardness:6, gems:[
    { id:'whiteOpal', name:'白欧泊', color:'#dff0ff', bonusText:'每回合开始主晶回复 1', bonus:{ regen:1 }, weight:2 },
    { id:'blackOpal', name:'黑欧泊', color:'#4a5578', bonusText:'武器攻击 +3', bonus:{ atk:3 }, weight:1 },
  ]},
  garnet: { id:'garnet', name:'石榴石', hardness:7, gems:[
    { id:'pyrope', name:'镁铝榴石', color:'#b05fd8', bonusText:'武器耐久 +5', bonus:{ dur:5 }, weight:2 },
    { id:'almandine', name:'铁铝榴石', color:'#8a4fd8', bonusText:'武器攻击 +3', bonus:{ atk:3 }, weight:2 },
    { id:'demantoid', name:'翠榴石', color:'#4fd89a', bonusText:'每次攻击后主晶回复 1', bonus:{ lifesteal:1 }, weight:1 },
    { id:'tsavorite', name:'沙弗莱石', color:'#3fd07a', bonusText:'武器攻击 +4', bonus:{ atk:4 }, weight:1 },
  ]},
  quartz: { id:'quartz', name:'石英', hardness:7, gems:[
    { id:'rockCrystal', name:'水晶', color:'#7fe3ff', bonusText:'其它宝石效果 +1', bonus:{ amp:1 }, weight:3 },
    { id:'amethyst', name:'紫水晶', color:'#a77bff', bonusText:'武器攻击 +2', bonus:{ atk:2 }, weight:2 },
    { id:'citrine', name:'黄水晶', color:'#e8c46a', bonusText:'武器攻击 +2', bonus:{ atk:2 }, weight:2 },
    { id:'roseQuartz', name:'蔷薇石英', color:'#e8a8c8', bonusText:'每回合开始主晶回复 1', bonus:{ regen:1 }, weight:2 },
    { id:'smokyQuartz', name:'烟晶', color:'#9a8f9e', bonusText:'受到攻击伤害 -1', bonus:{ armor:1 }, weight:1 },
  ]},
  olivine: { id:'olivine', name:'橄榄石', hardness:7, gems:[
    { id:'peridot', name:'橄榄石', color:'#8fd85a', bonusText:'武器攻击 +2', bonus:{ atk:2 }, weight:1 },
    { id:'preciousPeridot', name:'贵橄榄石', color:'#a8e05a', bonusText:'每次攻击后主晶回复 1', bonus:{ lifesteal:1 }, weight:1 },
  ]},
  iolite: { id:'iolite', name:'堇青石', hardness:7, gems:[
    { id:'ioliteGem', name:'堇青石', color:'#6f8fe8', bonusText:'武器耐久 +4', bonus:{ dur:4 }, weight:1 },
  ]},
  tourmaline: { id:'tourmaline', name:'碧玺', hardness:7, gems:[
    { id:'verdelite', name:'绿碧玺', color:'#4fd8b0', bonusText:'武器插槽 +1', bonus:{ sockets:1 }, weight:2 },
    { id:'paraiba', name:'帕拉伊巴碧玺', color:'#3fe0e0', bonusText:'武器攻击 +4', bonus:{ atk:4 }, weight:1 },
  ]},
  zircon: { id:'zircon', name:'锆石', hardness:7, gems:[
    { id:'zirconGem', name:'锆石', color:'#8fd0e8', bonusText:'武器耐久 +3', bonus:{ dur:3 }, weight:1 },
  ]},
  beryl: { id:'beryl', name:'绿柱石', hardness:8, gems:[
    { id:'emerald', name:'祖母绿', color:'#5fd39a', bonusText:'每次攻击后主晶回复 2', bonus:{ lifesteal:2 }, weight:2 },
    { id:'aquamarine', name:'海蓝宝石', color:'#6fc8e8', bonusText:'每回合开始主晶回复 2', bonus:{ regen:2 }, weight:2 },
    { id:'morganite', name:'摩根石', color:'#e8a8c0', bonusText:'每回合开始主晶回复 2', bonus:{ regen:2 }, weight:1 },
    { id:'heliodor', name:'金绿柱石', color:'#d8d86a', bonusText:'武器攻击 +3', bonus:{ atk:3 }, weight:1 },
  ]},
  spinel: { id:'spinel', name:'尖晶石', hardness:8, gems:[
    { id:'spinelGem', name:'尖晶石', color:'#c060d8', bonusText:'武器攻击 +3', bonus:{ atk:3 }, weight:1 },
  ]},
  topaz: { id:'topaz', name:'托帕石', hardness:8, gems:[
    { id:'topazGem', name:'托帕石', color:'#6fd0e8', bonusText:'攻击 40% 穿透护盾', bonus:{ pierce:0.4 }, weight:1 },
    { id:'imperialTopaz', name:'帝王托帕石', color:'#e8a86a', bonusText:'武器攻击 +4', bonus:{ atk:4 }, weight:1 },
  ]},
  chrysoberyl: { id:'chrysoberyl', name:'金绿宝石', hardness:9, gems:[
    { id:'chrysoberylGem', name:'金绿宝石', color:'#c8d86a', bonusText:'武器攻击 +4', bonus:{ atk:4 }, weight:1 },
    { id:'alexandrite', name:'变石', color:'#5fd8b0', bonusText:'攻击 40% 概率双倍', bonus:{ doubleChance:0.4 }, weight:1 },
  ]},
  corundum: { id:'corundum', name:'刚玉', hardness:9, gems:[
    { id:'ruby', name:'红宝石', color:'#e0568c', bonusText:'武器攻击 +4', bonus:{ atk:4 }, weight:2 },
    { id:'sapphire', name:'蓝宝石', color:'#4f7fe8', bonusText:'武器攻击 +4', bonus:{ atk:4 }, weight:2 },
    { id:'padparadscha', name:'帕帕拉恰', color:'#e88f6a', bonusText:'武器攻击 +5', bonus:{ atk:5 }, weight:1 },
    { id:'pinkSapphire', name:'粉红蓝宝石', color:'#e878b0', bonusText:'武器攻击 +4', bonus:{ atk:4 }, weight:1 },
  ]},
  diamond: { id:'diamond', name:'金刚石', hardness:10, gems:[
    { id:'diamondGem', name:'钻石', color:'#dff6ff', bonusText:'武器攻击 +5，免疫耐久损耗', bonus:{ atk:5, noDur:true }, weight:1 },
  ]},
};

// 宝石索引：gemId → 宝石定义（附所属原石 id，便于查硬度）
const GEM = {};
Object.values(RAW).forEach(r => r.gems.forEach(g => { g.rawId = r.id; GEM[g.id] = g; }));

// 世界各地神话武器
const WEAPONS = {
  excalibur: { id:'excalibur', name:'圣剑 Excalibur', origin:'不列颠 · 亚瑟王', atk:4, dur:8, sockets:2, feat:'王者：每镶嵌 1 颗宝石，攻击 +1' },
  panguAxe:  { id:'panguAxe',  name:'盘古斧',         origin:'中国 · 开天辟地', atk:6, dur:6, sockets:1, feat:'开天：攻击无视护盾' },
  kusanagi:  { id:'kusanagi',  name:'草薙剑',         origin:'日本 · 三神器',   atk:3, dur:6, sockets:2, feat:'风切：武器攻击不占用每回合「武器/宝石」攻击次数' },
  gungnir:   { id:'gungnir',   name:'冈格尼尔',       origin:'北欧 · 奥丁',     atk:5, dur:5, sockets:1, feat:'必中：攻击额外 +2 伤害' },
  mjolnir:   { id:'mjolnir',   name:'妙尔尼尔',       origin:'北欧 · 雷神',     atk:5, dur:7, sockets:2, feat:'雷击：攻击后震碎对手 1 颗宝石' },
  longinus:  { id:'longinus',  name:'朗基努斯之枪',   origin:'基督教传说',      atk:4, dur:5, sockets:2, feat:'贯穿：攻击时对手武器耐久 -1' },
  xuanyuan:  { id:'xuanyuan',  name:'轩辕剑',         origin:'中国 · 黄帝',     atk:5, dur:8, sockets:2, feat:'圣道：装备时主晶回复 3' },
  muramasa:  { id:'muramasa',  name:'妖刀村正',       origin:'日本 · 妖刀',     atk:7, dur:3, sockets:1, feat:'嗜血：每次攻击自身耐久 -1' },
};

// 卡组配方：全部为矿物原石 + 神话武器（共 46 张）
const DECK_RECIPE = [
  ['talc',2],['graphite',2],['gypsum',2],['amber',1],['mica',2],['calcite',2],
  ['malachite',1],['fluorite',2],['azurite',1],['apatite',2],['turquoise',1],['lapis',1],
  ['pyrite',2],['feldspar',2],['magnetite',1],['opal',1],['garnet',1],['quartz',2],
  ['olivine',1],['iolite',1],['tourmaline',1],['zircon',1],
  ['beryl',1],['spinel',1],['topaz',1],['chrysoberyl',1],['corundum',1],['diamond',1],
  ['excalibur',1],['panguAxe',1],['kusanagi',1],['gungnir',1],['mjolnir',1],['longinus',1],['xuanyuan',1],['muramasa',1],
];

/* ---------------- 2. 状态 ---------------- */
let state = null;
let uidSeq = 0;
let mpSeq = 0;           // 联机状态包序号（主机每次快照递增）

function makeSide() {
  return {
    hp: MAX_HP, shield: 0, deck: [], hand: [], gems: [], weapon: null,
    fatigue: 0, cutBuff: 0, cutPenalty: 0, pendingCutPenalty: 0, used: {},
    bonusDur: 0,
  };
}
function sideOf(side) { return side === 'player' ? state.player : state.ai; }
function otherOf(side) { return side === 'player' ? 'ai' : 'player'; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function rnd(a) { return Math.random() < a; }
// 矿物“直接打出”的战斗数值 = 硬度对半取整（金刚石 5，滑石 1）；硬度本身仍决定切割难度与宝石耐久
function pwr(h) { return Math.ceil(h / 2); }

// 宝石实例 { uid, rawId, gemId, dur, maxDur }
function gemDef(g) { return GEM[g.gemId]; }               // 宝石定义（名称/颜色/加成）
function gemPower(g) { return pwr(RAW[g.rawId].hardness); } // 宝石直接打出 = 所属原石硬度对半
// 切割产出：按 weight 加权随机一种宝石变种
function pickGem(raw) {
  const total = raw.gems.reduce((s, g) => s + (g.weight || 1), 0);
  let r = Math.random() * total;
  for (const g of raw.gems) { r -= (g.weight || 1); if (r < 0) return g; }
  return raw.gems[raw.gems.length - 1];
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function buildDeck() {
  const deck = [];
  DECK_RECIPE.forEach(([id, n]) => { for (let i = 0; i < n; i++) deck.push({ id, uid: ++uidSeq }); });
  return shuffle(deck);
}

/* 武器数值 = 基础 + 宝石加成 + 强化 + 特性 */
function weaponStats(w) {
  const base = WEAPONS[w.id];
  let atk = base.atk + (w.bonusAtk || 0);
  let maxDur = base.dur + (w.bonusDur || 0);
  let maxSockets = base.sockets;
  const f = { pierce: 0, doubleChance: 0, regen: 0, armor: 0, lifesteal: 0, noDur: false };
  const amp = w.sockets.filter(g => gemDef(g).bonus.amp).length;   // 水晶：放大其它宝石
  w.sockets.forEach(g => {
    const b = gemDef(g).bonus, boost = b.amp ? 0 : amp;
    atk += (b.atk || 0) + (b.atk ? boost : 0);
    maxDur += (b.dur || 0) + (b.dur ? boost : 0);
    maxSockets += (b.sockets || 0);
    if (b.pierce) f.pierce = Math.max(f.pierce, b.pierce);
    if (b.doubleChance) f.doubleChance = Math.max(f.doubleChance, b.doubleChance + boost * 0.1);
    f.regen += (b.regen || 0);
    f.armor += (b.armor || 0);
    f.lifesteal += (b.lifesteal || 0) + (b.lifesteal ? boost : 0);
    if (b.noDur) f.noDur = true;
  });
  if (w.id === 'excalibur') atk += w.sockets.length;   // 王者
  if (w.id === 'gungnir') atk += 2;                     // 必中
  return { atk, maxDur, maxSockets, f };
}

/* ---------------- 3. 基础动作 ---------------- */
function log(msg, cls) {
  const el = document.getElementById('log');
  const d = document.createElement('div');
  if (cls) d.className = cls;
  d.textContent = msg;
  el.appendChild(d);
  el.scrollTop = el.scrollHeight;
  while (el.children.length > 40) el.removeChild(el.firstChild);
}

function fxAt(rect, count) {
  for (let i = 0; i < count; i++) {
    const shard = document.createElement('div');
    shard.className = 'shard';
    const ang = Math.random() * Math.PI * 2, dist = 30 + Math.random() * 55;
    shard.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
    shard.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
    shard.style.left = (rect.left + rect.width / 2) + 'px';
    shard.style.top = (rect.top + rect.height / 2) + 'px';
    shard.style.background = Math.random() < 0.5 ? 'var(--c-gem)' : '#ffffff';
    document.body.appendChild(shard);
    setTimeout(() => shard.remove(), 620);
  }
}

function drawGems(side, n) {
  for (let i = 0; i < n; i++) {
    const s = sideOf(side);
    if (!s.deck.length) {
      s.fatigue += 1;
      damageCore(side, s.fatigue);
      log(`${side === 'player' ? '你' : '对手'}的牌库已空，主晶受到 ${s.fatigue} 点反噬。`, 'bad');
      continue;
    }
    const card = s.deck.shift();
    if (s.hand.length >= MAX_HAND) { log('手牌已满，一张牌被销毁。'); continue; }
    s.hand.push(card);
  }
  checkGameOver();
}

function damageCore(side, amount, ignoreShield) {
  if (amount <= 0) return;
  const s = sideOf(side);
  if (ignoreShield) { s.hp -= amount; return; }
  const absorbed = Math.min(s.shield, amount);
  s.shield -= absorbed;
  if (absorbed > 0) log(`护盾抵消 ${absorbed} 点。`);
  s.hp -= (amount - absorbed);
}

function damageWeapon(side, n) {
  const s = sideOf(side), w = s.weapon;
  if (!w) return;
  if (weaponStats(w).f.noDur) { log(`${WEAPONS[w.id].name} 免疫耐久损耗。`, 'gold'); return; }
  w.dur -= n;
  log(`${WEAPONS[w.id].name} 耐久 -${n}（剩余 ${Math.max(0, w.dur)}）。`, side === 'ai' ? 'bad' : 'hl');
  if (w.dur <= 0) breakWeapon(side);
}

function breakWeapon(side) {
  const s = sideOf(side);
  if (!s.weapon) return;
  log(`${WEAPONS[s.weapon.id].name} 碎裂了，插槽中的宝石一并失去。`, 'bad');
  s.weapon = null;
}

function damageRandomGem(side, n) {
  const s = sideOf(side);
  if (!s.gems.length) return;
  const g = s.gems[Math.floor(Math.random() * s.gems.length)];
  g.dur -= n;
  if (g.dur <= 0) {
    s.gems = s.gems.filter(x => x.uid !== g.uid);
    log(`雷击震碎了 ${gemDef(g).name}。`, side === 'ai' ? 'good' : 'bad');
  } else {
    log(`${gemDef(g).name} 耐久 -${n}。`);
  }
}

function checkGameOver() {
  if (!state || state.over) return;
  if (state.ai.hp <= 0 || state.player.hp <= 0) {
    state.over = true;
    state.sel = null;
    const win = state.ai.hp <= 0 && state.player.hp > 0;
    setTimeout(() => showOverlay(win), 420);
  }
}

function showOverlay(win) {
  const t = document.getElementById('overlay-title');
  t.textContent = win ? '胜利' : '败北';
  t.classList.toggle('lose', !win);
  document.getElementById('overlay-sub').textContent = win
    ? '对手主晶被彻底击碎。'
    : '你的主晶碎裂了……再来一次？';
  document.getElementById('overlay').classList.remove('hidden');
}

/* ---------------- 4. 动作 ---------------- */
// 每回合次数校验（无动作点）
function limitFor(s, key) { return TURN_LIMITS[key]; }
function remaining(s, key) { return Math.max(0, limitFor(s, key) - (s.used[key] || 0)); }
function canUse(s, key) { return remaining(s, key) > 0; }
function useUp(s, key) { s.used[key] = (s.used[key] || 0) + 1; }
// 武器攻击所用的次数键：草薙剑专用键（不占合并的 atk），其余武器共用 atk
// 注意：原石直接攻击、宝石直接打出、普通武器攻击三者共用 atk（每回合合计 1 次）
function weaponAtkKey(s) { return (s.weapon && s.weapon.id === 'kusanagi') ? 'kusanagiAtk' : 'atk'; }

// 行动①：装备武器（未装备前无法进行武器攻击）
function playWeapon(side, i) {
  const s = sideOf(side);
  const inst = s.hand.splice(i, 1)[0];
  const base = WEAPONS[inst.id];
  s.weapon = { uid: ++uidSeq, id: inst.id, dur: base.dur, bonusDur: 0, bonusAtk: 0, sockets: [] };
  log(`${side === 'player' ? '你' : '对手'}装备了 ${base.name}。`, side === 'player' ? 'hl' : 'bad');
  if (inst.id === 'xuanyuan') { s.hp = Math.min(MAX_HP, s.hp + 3); log('轩辕剑圣道，主晶回复 3 点。', 'good'); }
  state.sel = null;
  render();
}

// 回炉：弃掉一张手牌武器，摸 1 张牌（不限次）
function recycleWeapon(side, i) {
  const s = sideOf(side);
  const inst = s.hand[i];
  if (!inst || !WEAPONS[inst.id]) return;
  s.hand.splice(i, 1);
  log(`${side === 'player' ? '你' : '对手'}将 ${WEAPONS[inst.id].name} 回炉，摸 1 张牌。`, side === 'player' ? 'hl' : 'bad');
  drawGems(side, 1);
  state.sel = null;
  render();
}

// 行动②：切割原石 → 宝石
function cutRaw(side, i, silent) {
  const s = sideOf(side);
  const inst = s.hand[i];
  const raw = RAW[inst.id];
  if (!raw) return false;
  if (s.gems.length >= MAX_GEMS) { log('宝石栏已满，无法再切割。', 'bad'); return false; }
  if (!canUse(s, 'cut')) { log('本回合切割次数已用尽（6 次）。', 'bad'); return false; }
  useUp(s, 'cut');

  const chance = clamp(0.98 - raw.hardness * 0.07 + s.cutBuff - s.cutPenalty, 0.05, 0.98);
  if (rnd(chance)) {
    s.hand.splice(i, 1);
    const picked = pickGem(raw);
    s.gems.push({ uid: ++uidSeq, rawId: inst.id, gemId: picked.id, dur: raw.hardness, maxDur: raw.hardness });
    log(`切割成功：${raw.name} → ${picked.name}（硬度 ${raw.hardness}）。`, side === 'player' ? 'good' : 'bad');
  } else {
    log(`切割失败，${raw.name} 原石保留（成功率 ${Math.round(chance * 100)}%）。`, 'bad');
  }
  if (!silent) render();
  return true;
}

// 行动③：镶嵌宝石 → 武器
function socketGem(side, gemUid) {
  const s = sideOf(side), w = s.weapon;
  if (!w) { log('没有武器可镶嵌。', 'bad'); return; }
  const st = weaponStats(w);
  if (w.sockets.length >= st.maxSockets) { log('武器插槽已满。', 'bad'); return; }
  const gi = s.gems.findIndex(g => g.uid === gemUid);
  if (gi < 0) return;
  const gem = s.gems.splice(gi, 1)[0];
  const gd = gemDef(gem);
  const before = weaponStats(w);
  w.sockets.push(gem);
  const after = weaponStats(w);
  const durGain = after.maxDur - before.maxDur;
  if (durGain) w.dur = Math.min(w.dur + durGain, after.maxDur);   // 耐久提升同时回补
  if (gd.bonus.shieldOnSocket) { s.shield += gd.bonus.shieldOnSocket; log(`${gd.name}为主晶附上护盾。`, 'good'); }
  if (gd.bonus.debuffCut) { sideOf(otherOf(side)).pendingCutPenalty += gd.bonus.debuffCut; }
  log(`将 ${gd.name} 镶嵌到 ${WEAPONS[w.id].name}：${gd.bonusText}。`, side === 'player' ? 'good' : 'bad');
  state.sel = null;
  render();
}

// 行动③·二选一：宝石直接打出当攻击
function strikeWithGem(side, gemUid) {
  const s = sideOf(side);
  if (!canUse(s, 'atk')) { log('本回合攻击已用尽。', 'bad'); return; }
  const gi = s.gems.findIndex(g => g.uid === gemUid);
  if (gi < 0) return;
  useUp(s, 'atk');
  const gem = s.gems.splice(gi, 1)[0];
  const gd = gemDef(gem), gp = gemPower(gem);
  log(`${side === 'player' ? '你' : '对手'}打出 ${gd.name}，造成 ${gp} 点磨蚀！`, side === 'player' ? 'hl' : 'bad');
  const el = document.querySelector(`.core-bar.${side === 'player' ? 'opponent' : 'player'}`);
  if (el) fxAt(el.getBoundingClientRect(), 10);
  damageCore(otherOf(side), gp);
  checkGameOver();
  state.sel = null;
  render();
}

// 行动④：原石直接打出（无需切割）——攻击：造成等于硬度的伤害
function strikeRaw(side, i) {
  const s = sideOf(side);
  const inst = s.hand[i];
  if (!inst) return;
  const raw = RAW[inst.id];
  if (!raw) return;
  if (!canUse(s, 'atk')) { log('本回合攻击已用尽。', 'bad'); return; }
  useUp(s, 'atk');
  s.hand.splice(i, 1);
  log(`${side === 'player' ? '你' : '对手'}直接打出 ${raw.name}，造成 ${pwr(raw.hardness)} 点磨蚀！`, side === 'player' ? 'hl' : 'bad');
  const el = document.querySelector(`.core-bar.${side === 'player' ? 'opponent' : 'player'}`);
  if (el) fxAt(el.getBoundingClientRect(), 10);
  damageCore(otherOf(side), pwr(raw.hardness));
  checkGameOver();
  state.sel = null;
  render();
}

// 行动④：原石直接打出——防御：获得等于硬度的护盾
function defendRaw(side, i) {
  const s = sideOf(side);
  const inst = s.hand[i];
  if (!inst) return;
  const raw = RAW[inst.id];
  if (!raw) return;
  if (!canUse(s, 'rawDef')) { log('本回合普通防御已用尽。', 'bad'); return; }
  useUp(s, 'rawDef');
  s.hand.splice(i, 1);
  s.shield += pwr(raw.hardness);
  log(`${side === 'player' ? '你' : '对手'}献出 ${raw.name} 铸成护盾，主晶获得 ${pwr(raw.hardness)} 点护盾。`, side === 'player' ? 'good' : 'bad');
  state.sel = null;
  render();
}

// 行动⑤：武器攻击
function doAttack(side) {
  const s = sideOf(side), foe = otherOf(side), fs = sideOf(foe);
  const w = s.weapon;
  if (!w) { log('你没有武器，无法攻击。', 'bad'); return false; }
  if (w.dur <= 0) { log('武器已碎裂。', 'bad'); return false; }
  const st = weaponStats(w);

  const key = weaponAtkKey(s);
  if (!canUse(s, key)) { log('本回合攻击已用尽。', 'bad'); return false; }
  useUp(s, key);
  if (key === 'kusanagiAtk') log('草薙剑·风切：本次攻击不占用每回合攻击次数。', 'gold');

  let dmg = st.atk;
  if (st.f.doubleChance && rnd(st.f.doubleChance)) { dmg *= 2; log('愚人金闪光，伤害翻倍！', 'gold'); }
  const armor = fs.weapon ? weaponStats(fs.weapon).f.armor : 0;
  if (armor) { dmg = Math.max(0, dmg - armor); log(`磁石抵消了 ${armor} 点伤害。`); }

  let ignoreShield = (w.id === 'panguAxe');
  if (!ignoreShield && st.f.pierce && rnd(st.f.pierce)) { ignoreShield = true; log('冰洲石折射，攻击穿透护盾！', 'gold'); }

  const el = document.querySelector(`.core-bar.${side === 'player' ? 'opponent' : 'player'}`);
  if (el) fxAt(el.getBoundingClientRect(), 10);
  log(`${WEAPONS[w.id].name} 命中，造成 ${dmg} 点伤害。`, side === 'player' ? 'hl' : 'bad');
  damageCore(foe, dmg, ignoreShield);

  if (st.f.lifesteal) { s.hp = Math.min(MAX_HP, s.hp + st.f.lifesteal); log(`祖母绿治愈主晶 ${st.f.lifesteal} 点。`, 'good'); }
  if (w.id === 'mjolnir' && fs.gems.length) damageRandomGem(foe, 1);
  if (w.id === 'longinus' && fs.weapon) damageWeapon(foe, 1);
  if (w.id === 'muramasa') damageWeapon(side, 1);

  checkGameOver();
  render();
  return true;
}

/* ---------------- 5. 渲染 ---------------- */
function limitsHTML(s) {
  const rem = k => remaining(s, k);
  const cell = (k, label) => `<span class="lp ${rem(k) ? '' : 'off'}">${label} ${rem(k)}/${limitFor(s, k)}</span>`;
  let html = cell('atk', '攻击') + cell('rawDef', '防御') + cell('cut', '切割');
  if (s.weapon && s.weapon.id === 'kusanagi') html += cell('kusanagiAtk', '草薙剑');
  return html;
}

function weaponHTML(w) {
  const base = WEAPONS[w.id], st = weaponStats(w);
  const dots = Array.from({ length: st.maxSockets }, (_, i) =>
    `<span class="socket-dot ${i < w.sockets.length ? 'filled' : ''}"></span>`).join('');
  return `
    <div class="weapon-card">
      <div class="w-sockets">${dots}</div>
      <div class="w-cat">武器</div>
      <div class="w-name">${base.name}</div>
      <div class="w-origin">${base.origin}</div>
      <div class="w-feat">${base.feat}</div>
      <div class="w-stats">
        <div><div class="w-num w-atk">${st.atk}</div><span class="w-lab">攻击</span></div>
        <div><div class="w-num w-dur">${w.dur}<span style="font-size:12px;color:var(--text-dim)">/${st.maxDur}</span></div><span class="w-lab">耐久</span></div>
      </div>
    </div>`;
}

function gemHTML(g, opts = {}) {
  const gd = gemDef(g);
  return `
    <div class="gem ${opts.selected ? 'selected' : ''} ${opts.readonly ? 'readonly' : ''} ${g.dur < g.maxDur ? 'cracked' : ''}"
         style="--gem-color:${gd.color}" ${opts.readonly ? '' : `data-gem="${g.uid}"`}>
      <div class="g-name">${gd.name}</div>
      <div class="g-bonus">${gd.bonusText}</div>
      <div class="g-foot">
        <div><span class="g-dur">${g.dur}</span><span class="g-hlab">/${g.maxDur}</span></div>
      </div>
    </div>`;
}

function handCardHTML(inst, i, playable, selected) {
  const id = inst.id;
  const raw = RAW[id], wp = WEAPONS[id];
  const cls = ['card'].concat(playable ? [] : ['disabled']);
  if (selected) cls.push('selected');

  if (raw) {
    return `<div class="${cls.join(' ')}" style="--cat-color:${raw.gems[0].color}" data-hand="${i}">
      <div class="c-cat">原石</div>
      <div class="c-name">${raw.name}</div>
      <div class="c-sub">切割 → ${raw.gems[0].name}${raw.gems.length > 1 ? ` 等${raw.gems.length}种` : ''}</div>
      <div class="c-text">攻击 ${pwr(raw.hardness)} / 防御 ${pwr(raw.hardness)}</div>
      <div class="c-foot"><div><div class="c-num c-hard">${raw.hardness}</div><span class="c-lab">硬度</span></div></div>
    </div>`;
  }
  return `<div class="${cls.join(' ')}" style="--cat-color:var(--c-weapon)" data-hand="${i}">
      <div class="c-cat">武器</div>
      <div class="c-name">${wp.name}</div>
      <div class="c-sub">${wp.origin}</div>
      <div class="c-text">${wp.feat}</div>
      <div class="c-foot">
        <div><div class="c-num c-hard">${wp.atk}</div><span class="c-lab">攻击</span></div>
        <div><div class="c-num c-dur">${wp.dur}</div><span class="c-lab">耐久</span></div>
        <div><span class="c-sock">${'●'.repeat(wp.sockets)}</span><span class="c-lab">插槽</span></div>
      </div>
    </div>`;
}

function renderField(side, el) {
  const s = sideOf(side);
  const isPlayer = side === 'player';
  const st = s.weapon ? weaponStats(s.weapon) : null;
  const canSocket = isPlayer && state.turn === 'player' && !state.over &&
    state.sel && state.sel.kind === 'gem' && st && s.weapon.sockets.length < st.maxSockets;

  const weaponBlock = s.weapon
    ? `<div class="weapon-slot ${canSocket ? 'socketable' : ''}">${weaponHTML(s.weapon)}</div>`
    : `<div class="weapon-slot empty">未装备武器</div>`;

  const gems = s.gems.map(g => gemHTML(g, {
    readonly: !isPlayer,
    selected: state.sel && state.sel.kind === 'gem' && state.sel.uid === g.uid,
  })).join('');

  el.innerHTML = `${weaponBlock}<div class="gem-tray"><span class="tray-title">宝石栏</span>${gems}</div>`;
}

function renderActions() {
  const el = document.getElementById('card-actions');
  const sel = state.sel;
  if (!sel || state.turn !== 'player' || state.over) { el.classList.add('hidden'); return; }
  const s = state.player;

  // 宝石：镶嵌 / 直接打出
  if (sel.kind === 'gem') {
    const g = s.gems.find(x => x.uid === sel.uid);
    if (!g) { el.classList.add('hidden'); return; }
    const gd = gemDef(g), gp = gemPower(g);
    const st = s.weapon ? weaponStats(s.weapon) : null;
    const canSocket = !!(s.weapon && st && s.weapon.sockets.length < st.maxSockets);
    const canStrike = canUse(s, 'atk');
    el.classList.remove('hidden');
    el.innerHTML = `
      <span>已选 <b>${gd.name}</b> <small>硬度 ${RAW[g.rawId].hardness} · ${gd.bonusText}</small></span>
      <button class="btn-primary" data-act="socket" ${canSocket ? '' : 'disabled'}>镶嵌武器</button>
      <button class="btn-primary" data-act="gstrike" ${canStrike ? '' : 'disabled'}>直接打出（${gp} 点）</button>
      <button class="btn-ghost" data-act="cancel">取消</button>`;
    return;
  }

  // 原石：切割 / 直接攻击 / 防御
  if (sel.kind === 'mineral') {
    const inst = s.hand.find(c => c.uid === sel.uid);
    if (!inst) { el.classList.add('hidden'); return; }
    const raw = RAW[inst.id];
    const okCut = canUse(s, 'cut') && s.gems.length < MAX_GEMS;
    const okAtk = canUse(s, 'atk');
    const okDef = canUse(s, 'rawDef');
    const gemNames = raw.gems.map(g => g.name).join(' / ');
    el.classList.remove('hidden');
    el.innerHTML = `
      <span>已选 <b>${raw.name}</b> <small>硬度 ${raw.hardness} · 可切出：${gemNames}</small></span>
      <button class="btn-primary" data-act="cut" ${okCut ? '' : 'disabled'}>切割成宝石</button>
      <button class="btn-primary" data-act="mstrike" ${okAtk ? '' : 'disabled'}>攻击（${pwr(raw.hardness)} 点）</button>
      <button class="btn-primary" data-act="mdefend" ${okDef ? '' : 'disabled'}>防御（${pwr(raw.hardness)} 护盾）</button>
      <button class="btn-ghost" data-act="cancel">取消</button>`;
    return;
  }

  // 武器：装备 / 替换 / 回炉
  if (sel.kind === 'weapon') {
    const inst = s.hand.find(c => c.uid === sel.uid);
    if (!inst) { el.classList.add('hidden'); return; }
    const wp = WEAPONS[inst.id];
    const hasW = !!s.weapon;
    el.classList.remove('hidden');
    el.innerHTML = `
      <span>已选 <b>${wp.name}</b> <small>${wp.origin} · 攻击 ${wp.atk} · 耐久 ${wp.dur}</small></span>
      <button class="btn-primary" data-act="equip">${hasW ? '替换武器' : '装备'}</button>
      <button class="btn-primary" data-act="recycle">回炉（摸 1 张）</button>
      <button class="btn-ghost" data-act="cancel">取消</button>`;
    return;
  }
  el.classList.add('hidden');
}

function render() {
  const p = state.player, a = state.ai;
  document.getElementById('player-hp').textContent = p.hp;
  document.getElementById('ai-hp').textContent = a.hp;
  document.getElementById('player-deck').textContent = '牌库 ' + p.deck.length;
  document.getElementById('ai-deck').textContent = '牌库 ' + a.deck.length;
  document.getElementById('player-limits').innerHTML = limitsHTML(p);

  showShield('player-shield', p.shield);
  showShield('ai-shield', a.shield);

  const banner = document.getElementById('turn-banner');
  banner.textContent = state.over ? '对局结束' : (state.turn === 'player' ? '你的回合' : '对手回合');
  banner.classList.toggle('enemy', state.turn === 'ai' && !state.over);

  renderField('ai', document.getElementById('ai-field'));
  renderField('player', document.getElementById('player-field'));

  const myTurn = state.turn === 'player' && !state.over;
  const handEl = document.getElementById('player-hand');
  handEl.innerHTML = p.hand.map((inst, i) => handCardHTML(inst, i, myTurn,
    !!(state.sel && state.sel.uid === inst.uid))).join('');

  const canAttack = myTurn && p.weapon && p.weapon.dur > 0 && canUse(p, weaponAtkKey(p));
  document.getElementById('attack-btn').disabled = !canAttack;
  document.getElementById('end-turn-btn').disabled = !myTurn;

  renderActions();
}

function showShield(id, v) {
  const el = document.getElementById(id);
  if (v > 0) { el.classList.remove('hidden'); el.textContent = '+' + v; }
  else el.classList.add('hidden');
}

/* ---------------- 6. 交互 ---------------- */
function onHandClick(i) {
  if (!state || state.turn !== 'player' || state.over) return;
  const inst = state.player.hand[i];
  if (!inst) return;
  if (WEAPONS[inst.id]) {                                              // 武器：弹出操作条（装备/替换 · 回炉）
    state.sel = (state.sel && state.sel.kind === 'weapon' && state.sel.uid === inst.uid)
      ? null : { kind: 'weapon', uid: inst.uid };
    render();
    return;
  }
  if (RAW[inst.id]) {                                                 // 原石：弹出操作条
    state.sel = (state.sel && state.sel.kind === 'mineral' && state.sel.uid === inst.uid)
      ? null : { kind: 'mineral', uid: inst.uid };
    render();
  }
}

function onFieldClick(e) {
  if (!state || state.turn !== 'player' || state.over) return;
  const gemEl = e.target.closest('.gem[data-gem]');
  if (gemEl) {
    const uid = Number(gemEl.dataset.gem);
    state.sel = (state.sel && state.sel.kind === 'gem' && state.sel.uid === uid) ? null : { kind: 'gem', uid };
    render();
    return;
  }
  const slot = e.target.closest('.weapon-slot');
  if (slot && slot.classList.contains('socketable') && state.sel && state.sel.kind === 'gem') {
    request({ t: 'socket', uid: state.sel.uid });
  }
}

function onCardAction(act) {
  if (!state) return;
  const sel = state.sel;
  if (!sel) return;
  if (act === 'cancel') { state.sel = null; render(); return; }
  if (sel.kind === 'gem') {
    if (act === 'socket') request({ t: 'socket', uid: sel.uid });
    else if (act === 'gstrike') request({ t: 'gstrike', uid: sel.uid });
    return;
  }
  if (sel.kind === 'weapon') {
    const i = state.player.hand.findIndex(c => c.uid === sel.uid);
    if (i < 0) return;
    if (act === 'equip') {
      if (state.player.weapon) openReplaceConfirm(i);
      else request({ t: 'equip', uid: sel.uid });
    } else if (act === 'recycle') {
      request({ t: 'recycle', uid: sel.uid });
    }
    return;
  }
  if (sel.kind === 'mineral') {
    const i = state.player.hand.findIndex(c => c.uid === sel.uid);
    if (i < 0) return;
    if (act === 'cut') request({ t: 'cut', uid: sel.uid });
    else if (act === 'mstrike') request({ t: 'mstrike', uid: sel.uid });
    else if (act === 'mdefend') request({ t: 'mdefend', uid: sel.uid });
  }
}

function clearSelection() {
  if (!state || !state.sel) return;
  state.sel = null;
  render();
}

// 替换武器确认
function openReplaceConfirm(i) {
  const s = state.player;
  const inst = s.hand[i];
  if (!inst || !WEAPONS[inst.id]) return;
  const next = WEAPONS[inst.id];
  const cur = WEAPONS[s.weapon.id];
  const lost = s.weapon.sockets.length;
  document.getElementById('confirm-sub').innerHTML =
    `当前武器 <b>${cur.name}</b>（剩余耐久 ${s.weapon.dur}）将被替换为 <b>${next.name}</b>。` +
    (lost ? `<br><span class="warn">插槽中的 ${lost} 颗宝石会随之失去。</span>` : '<br>当前武器未镶嵌宝石。');
  state.pendingWeapon = inst.uid;
  document.getElementById('confirm').classList.remove('hidden');
}

function closeReplaceConfirm() {
  state.pendingWeapon = null;
  document.getElementById('confirm').classList.add('hidden');
}

function confirmReplace() {
  const uid = state.pendingWeapon;
  closeReplaceConfirm();
  if (uid == null) return;
  if (!state || state.turn !== 'player' || state.over) return;
  request({ t: 'equip', uid });
}

/* ---------------- 7. 回合流程 ---------------- */
// 回合结束：摸 2 张牌
function endTurnDraw(side) {
  if (state.over) return;
  log(`${side === 'player' ? '你' : '对手'}的回合结束，摸 2 张牌。`);
  drawGems(side, 2);
}

function startTurn(side) {
  state.turn = side;
  state.sel = null;
  const s = sideOf(side);
  s.used = {};
  s.cutBuff = 0;
  s.cutPenalty = s.pendingCutPenalty || 0;   // 萤石的下回合惩罚在此生效
  s.pendingCutPenalty = 0;

  // 月光石：每回合开始回复
  const regen = s.weapon ? weaponStats(s.weapon).f.regen : 0;
  if (regen) { s.hp = Math.min(MAX_HP, s.hp + regen); log(`月光石微光，主晶回复 ${regen} 点。`, 'good'); }

  drawGems(side, 1);
  log(`—— ${side === 'player' ? '你的回合' : '对手的回合'}开始 ——`, side === 'player' ? 'good' : 'bad');
  render();
  if (side === 'ai' && !state.over && !MP.active) setTimeout(aiTurn, 700);
}

// 结束指定一方的回合（单人与联机同构）
function endTurn(side) {
  if (!state || state.turn !== side || state.over) return;
  state.sel = null;
  endTurnDraw(side);
  if (state.over) return;
  startTurn(otherOf(side));
}

// 玩家点击「结束回合」：单人/主机本地执行，客人发意图
function onEndTurn() {
  if (!state || state.turn !== 'player' || state.over) return;
  request({ t: 'endTurn' });
}

/* ---------------- 8. 贪心 AI ---------------- */
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function aiTurn() {
  if (MP.active) return;        // 联机时本地 AI 不参与
  const s = state.ai;
  let guard = 0, recycled = false;
  while (guard++ < 20 && !state.over) {
    // 1) 没有武器 → 先装备
    if (!s.weapon) {
      const wi = s.hand.findIndex(c => WEAPONS[c.id]);
      if (wi >= 0) { playWeapon('ai', wi); await sleep(450); continue; }
    }
    // 2) 有宝石且有空插槽 → 镶嵌（自由，不限次）
    if (s.weapon && s.gems.length) {
      const st = weaponStats(s.weapon);
      if (s.weapon.sockets.length < st.maxSockets) {
        const best = s.gems.slice().sort((a, b) => RAW[b.rawId].hardness - RAW[a.rawId].hardness)[0];
        socketGem('ai', best.uid);
        await sleep(450); continue;
      }
    }
    // 3) 武器攻击（与原石/宝石攻击合并计数，每回合 1 次；草薙剑不占该次数）
    if (s.weapon && s.weapon.dur > 0 && canUse(s, weaponAtkKey(s))) {
      doAttack('ai'); await sleep(560); continue;
    }
    // 4) 矿物牌：有武器且有空插槽 → 切割攒宝石；否则直接攻击 / 残血时防御
    const ri = s.hand.findIndex(c => RAW[c.id]);
    if (ri >= 0) {
      const st = s.weapon ? weaponStats(s.weapon) : null;
      const wantCut = !!(s.weapon && st && s.weapon.sockets.length < st.maxSockets && s.gems.length < MAX_GEMS && canUse(s, 'cut'));
      if (wantCut) cutRaw('ai', ri);
      else if (s.hp <= 12 && canUse(s, 'rawDef')) defendRaw('ai', ri);
      else if (canUse(s, 'atk')) strikeRaw('ai', ri);
      else if (canUse(s, 'rawDef')) defendRaw('ai', ri);
      else break;
      await sleep(480); continue;
    }
    // 5) 手牌将满且有多余武器 → 回炉换牌（每回合至多一次）
    if (!recycled && s.hand.length >= MAX_HAND - 1) {
      const wi = s.hand.findIndex(c => WEAPONS[c.id]);
      if (wi >= 0) { recycled = true; recycleWeapon('ai', wi); await sleep(420); continue; }
    }
    break;
  }
  if (!state.over) {
    endTurnDraw('ai');
    if (!state.over) { await sleep(300); startTurn('player'); }
  }
}

/* ---------------- 9. 联机（主机权威 + 全量状态同步） ---------------- */
// 主机把权威 state 序列化：深拷贝 → 清除纯 UI 字段 → 交换视角并翻转回合 → 附递增序号
function snapshot() {
  if (!state) return null;
  const clone = JSON.parse(JSON.stringify(state));
  clone.sel = null;                                      // 纯 UI，禁止同步
  clone.pendingWeapon = null;
  const tmp = clone.player; clone.player = clone.ai; clone.ai = tmp;   // 视角互换：客人看到的 player 是自己
  clone.turn = clone.turn === 'player' ? 'ai' : 'player';              // 回合也随之翻转
  mpSeq += 1;
  return { type: 'state', seq: mpSeq, state: clone };
}

// 客人套用主机下发的镜像状态（此时 state.player 即客人自己）
function applyState(payload) {
  if (!payload || !payload.state) return;
  const prevOver = state ? state.over : false;
  state = payload.state;
  state.sel = null;
  state.pendingWeapon = null;
  document.getElementById('confirm').classList.add('hidden');
  document.getElementById('card-actions').classList.add('hidden');
  if (!state.over) document.getElementById('overlay').classList.add('hidden');
  render();
  if (state.over && !prevOver) {
    const win = state.player.hp > 0;   // 客人视角：state.player 是自己，透视角互换
    setTimeout(() => showOverlay(win), 420);
  }
}

// 用 uid 定位手牌下标（双端手牌顺序一致，但用 uid 更稳妥）
function handIndexByUid(side, uid) {
  return sideOf(side).hand.findIndex(c => c.uid === uid);
}

// 唯一权威分发入口：把一条意图应用到指定 side 的状态上
function applyIntent(intent, side) {
  if (!intent) return false;
  if (intent.t === 'newGame') { newGame(); return true; }   // 重开不受回合 / 结束状态限制
  if (!state || state.over) return false;
  if (state.turn !== side) return false;
  const s = sideOf(side);
  const i = handIndexByUid(side, intent.uid);
  switch (intent.t) {
    case 'equip':
      if (i < 0 || !WEAPONS[s.hand[i].id]) return false;
      playWeapon(side, i); return true;
    case 'recycle':
      if (i < 0 || !WEAPONS[s.hand[i].id]) return false;
      recycleWeapon(side, i); return true;
    case 'cut':
      if (i < 0 || !RAW[s.hand[i].id]) return false;
      cutRaw(side, i); return true;
    case 'mstrike':
      if (i < 0 || !RAW[s.hand[i].id]) return false;
      strikeRaw(side, i); return true;
    case 'mdefend':
      if (i < 0 || !RAW[s.hand[i].id]) return false;
      defendRaw(side, i); return true;
    case 'socket':
      if (!s.gems.some(g => g.uid === intent.uid)) return false;
      socketGem(side, intent.uid); return true;
    case 'gstrike':
      if (!s.gems.some(g => g.uid === intent.uid)) return false;
      strikeWithGem(side, intent.uid); return true;
    case 'attack':
      doAttack(side); return true;
    case 'endTurn':
      endTurn(side); return true;
  }
  return false;
}

// 提交一条动作：客人 → 发给主机；单人 / 主机 → 本地权威执行（主机再广播新状态）
function request(intent) {
  if (MP.active && MP.role === 'guest') { MP.send({ type: 'intent', intent }); return; }
  applyIntent(intent, 'player');
  if (MP.active && MP.role === 'host') MP.broadcastState();
}

/* ---------------- 10. 开局 ---------------- */
function newGame() {
  uidSeq = 0;
  state = { player: makeSide(), ai: makeSide(), turn: 'player', over: false, sel: null, pendingWeapon: null };
  document.getElementById('log').innerHTML = '';
  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('confirm').classList.add('hidden');
  document.getElementById('card-actions').classList.add('hidden');
  state.player.deck = buildDeck();
  state.ai.deck = buildDeck();
  drawGems('player', 4);
  drawGems('ai', 4);
  log('对局开始：自由出牌——普通攻击（原石直接打出）/ 宝石直接打出 / 武器攻击合并为每回合合计 1 次，普通防御每回合 1 次，切割每回合最多 6 次；装备与镶嵌不限次（草薙剑武器攻击不占该次数）。回合开始摸 1 张，回合结束摸 2 张；手牌武器可「回炉」弃掉换 1 张牌。');
  startTurn('player');
}

function bind() {
  document.getElementById('player-hand').addEventListener('click', e => {
    const card = e.target.closest('[data-hand]');
    if (card) onHandClick(Number(card.dataset.hand));
    else clearSelection();
  });
  document.getElementById('player-field').addEventListener('click', onFieldClick);
  document.getElementById('card-actions').addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (btn) onCardAction(btn.dataset.act);
  });
  document.getElementById('attack-btn').addEventListener('click', () => {
    if (state && state.turn === 'player' && !state.over) request({ t: 'attack' });
  });
  document.getElementById('end-turn-btn').addEventListener('click', onEndTurn);
  document.getElementById('restart-btn').addEventListener('click', () => request({ t: 'newGame' }));
  document.getElementById('overlay-btn').addEventListener('click', () => request({ t: 'newGame' }));
  document.getElementById('confirm-yes').addEventListener('click', confirmReplace);
  document.getElementById('confirm-no').addEventListener('click', closeReplaceConfirm);
  // 点空白清空选择
  document.getElementById('app').addEventListener('click', e => {
    if (!e.target.isConnected) return;   // 渲染已重建节点，忽略
    if (!e.target.closest('[data-hand],.gem,.weapon-slot,.card-actions')) clearSelection();
  });
}

bind();
// 注册联机回调（net.js 在 game.js 之前加载，已定义全局 MP），再进入大厅
MP.register({ newGame, applyState, applyIntent, snapshot });
MP.boot();