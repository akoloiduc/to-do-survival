// ════════════════════════════════════════════════════════════════════════════
// 🎮 SURVIVAL GAME - Main Game Script (Cập Nhật Độ Khó & Cân Bằng Tài Nguyên)
// ════════════════════════════════════════════════════════════════════════════

// ═══ SECTION 1: SETUP & INITIALIZATION ═══════════════════════════════════
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) { document.body.classList.add('is-mobile'); }
const canvas=document.getElementById('gameCanvas');
const ctx=canvas.getContext('2d');
canvas.width=800; canvas.height=520; 
const GRID = 40;

// ═══ SECTION 2: GAME STATE & VARIABLES ═══════════════════════════════════
// Game objects
let meatItems=[], cookedFoods=[], zombies=[], animals=[], resourceNodes=[], structures=[], particles=[], floatingTexts=[], mapDecor=[];
// Player resources & state
let playerResources={wood:0,stone:0,metal:0,meat:0};

// Global crafting modifiers - GIẢM CHI PHÍ KIM LOẠI XUỐNG 50%
const METAL_COST_FACTOR = 0.5; 
function adjustCost(raw) {
  if(!raw) return {wood:0,stone:0,metal:0};
  return {
    wood: raw.wood || 0,
    stone: raw.stone || 0,
    metal: Math.max(0, Math.floor((raw.metal || 0) * METAL_COST_FACTOR))
  };
}
let wave=1,score=0,gameActive=true,keys={};
let lastIsNight=false,spawnTimer=0, frameCount=0;
let selectedCraft=null, selectedStructure=null;
let currentTool = 'sword';
// Input
let mouseX = 0, mouseY = 0;
// Survival timer
let survivalStartTime = null;

// ═══ SECTION 3: UTILITY FUNCTIONS ═════════════════════════════════════

function getSurvivalSeconds() { 
  if(!survivalStartTime) return 0;
  return Math.floor((Date.now() - survivalStartTime) / 1000); 
}

function getSurvivalDisplay() {
  if(!survivalStartTime) return '⏱ --:--';
  const s = getSurvivalSeconds();
  const m = Math.floor(s / 60), sec = s % 60;
  return `⏱ ${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

function getDifficultyMultiplier() {
  const minutes = getSurvivalSeconds() / 60;
  return 1 + minutes * 0.08;
}

function drawShadow(x, y, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x + w/2, y + h - 2, w/1.5, h/4, 0, 0, Math.PI*2); ctx.fill();
}

function spawnText(x, y, txt, col) { floatingTexts.push(new FloatingText(x, y, txt, col)); }

function spawnParticles(x,y,col,n=6, isBlood=false){for(let i=0;i<n;i++)particles.push(new Particle(x,y,col, isBlood));}

// ═══ SECTION 4: TIMING & ENVIRONMENTAL STATE ════════════════════════
let nightSpawnInterval30s = 0;
let nightBossInterval60s = 0;
let bossAlertTimer = 0;
let nightsPassed = 0; // Theo dõi số đêm đã trôi qua để tăng số lượng Boss
let lastUpdateTime = Date.now();

// Initialize map decorations
for(let i=0; i<80; i++){
  mapDecor.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, type: Math.random() < 0.8 ? 'grass' : 'flower' });
}

// ═══ SECTION 5: DAY/NIGHT CYCLE MANAGEMENT ═════════════════════════
let DAY_MS=5*60*1000, NIGHT_MS=5*60*1000 + 15*1000;
let CYCLE_MS=DAY_MS+NIGHT_MS;
let cycleCount = 0;
const dayNight={
  startTime:Date.now(), isNight:false, progress:0, lastPhase:false,
  update(){
    const e=Date.now()-this.startTime,c=e%CYCLE_MS;
    this.isNight=c>=DAY_MS; this.progress=this.isNight?(c-DAY_MS)/NIGHT_MS:c/DAY_MS;
    
    // Khi chuyển từ Đêm sang Ngày (Kết thúc 1 chu kỳ)
    if(!this.isNight && this.lastPhase) {
      nightsPassed++; // Tăng số lượng đêm đã sống sót thành công
      if(DAY_MS > 0) {
        DAY_MS = Math.max(0, DAY_MS - 30*1000);
        NIGHT_MS = Math.max(0, NIGHT_MS - 30*1000);
        CYCLE_MS = DAY_MS + NIGHT_MS;
        cycleCount++;
        spawnText(canvas.width/2, 120, `⏰ CHI PHÍ THỜI GIAN: Ngày/Đêm -30s (Cycle ${cycleCount})`, "#ffaa00");
      }
    }
    this.lastPhase = this.isNight;
  },
  getPhaseText(){return this.isNight?'🌙 ĐÊM':'☀️ NGÀY';},
  getTimeLeft(){
    const e=Date.now()-this.startTime,c=e%CYCLE_MS; const r=this.isNight?Math.ceil((NIGHT_MS-(c-DAY_MS))/1000):Math.ceil((DAY_MS-c)/1000);
    return Math.floor(r/60)+':'+(r%60).toString().padStart(2,'0');
  },
  drawOverlay(){
    if(this.isNight){ const a = 0.5 + 0.2*Math.sin(this.progress*Math.PI); ctx.fillStyle=`rgba(15, 20, 45, ${a})`; ctx.fillRect(0,0,canvas.width,canvas.height); }
  }
};

// ═══ SECTION 6: VISUAL EFFECT CLASSES ══════════════════════════════
class FloatingText {
  constructor(x, y, text, color) { this.x = x + (Math.random()-0.5)*15; this.y = y; this.text = text; this.color = color; this.life = 45; this.maxLife = 45; this.vy = -1.5 - Math.random(); }
  update() { this.y += this.vy; this.life--; }
  draw() { ctx.save(); ctx.globalAlpha = Math.max(0, this.life / this.maxLife); ctx.font = "bold 14px 'Courier New', monospace"; ctx.textAlign = "center"; ctx.fillStyle = "#000"; ctx.fillText(this.text, this.x+1, this.y+1); ctx.fillText(this.text, this.x-1, this.y-1); ctx.fillStyle = this.color; ctx.fillText(this.text, this.x, this.y); ctx.restore(); }
}

class Particle{
  constructor(x,y,col,isBlood=false){ this.x=x;this.y=y;this.color=col;this.life=20+Math.random()*15;this.maxLife=this.life; this.vx=(Math.random()-.5)*8;this.vy=(Math.random()-.5)*8 - 2; this.groundY = y + 10 + Math.random()*10; this.size = isBlood ? 3+Math.random()*2 : 4; }
  update(){ this.x+=this.vx; this.y+=this.vy; this.vy += 0.6; if(this.y >= this.groundY) { this.y = this.groundY; this.vy *= -0.4; this.vx *= 0.5; } this.life--; }
  draw(){ctx.globalAlpha=this.life/this.maxLife;ctx.fillStyle=this.color;ctx.fillRect(this.x,this.y,this.size,this.size);ctx.globalAlpha=1;}
}

class Bullet {
  constructor(x, y, target, dmg) {
    this.x = x; this.y = y; this.target = target; this.dmg = dmg; this.speed = 10; this.life = 100; this.maxLife = 100; this.dead = false;
  }
  update() {
    if (this.dead) { this.life = 0; return; }
    if (!this.target || this.target.health <= 0) { this.dead = true; this.life = 0; return; }
    const dx = this.target.x + this.target.width / 2 - this.x;
    const dy = this.target.y + this.target.height / 2 - this.y;
    const d = Math.hypot(dx, dy) || 1;
    this.x += (dx / d) * this.speed;
    this.y += (dy / d) * this.speed;
    this.life--;
    if (d < 15) {
      if (this.target.takeDamage(this.dmg)) zombieDeath(this.target);
      this.dead = true; this.life = 0;
    }
    if (this.life <= 0) { this.dead = true; this.life = 0; }
  }
  draw() {
    if (this.dead) return;
    ctx.fillStyle = '#ffcc00'; ctx.fillRect(this.x - 3, this.y - 3, 6, 6);
    ctx.fillStyle = '#fff'; ctx.fillRect(this.x - 1, this.y - 1, 2, 2);
  }
}

// ═══ SECTION 7: FOOD SYSTEM ════════════════════════════════════════
class MeatItem {
  constructor(x, y) { this.x=x; this.y=y; this.w=16; this.h=14; this.oy=y; this.life=1200; }
  update() { this.life--; }
  draw() {
    const bob = Math.sin(frameCount*0.15)*3; drawShadow(this.x, this.oy+10, this.w, this.h/2);
    ctx.fillStyle='#cc3333'; ctx.fillRect(this.x, this.oy+bob, this.w, this.h);
    ctx.fillStyle='#ff6666'; ctx.fillRect(this.x+2, this.oy+bob+2, 8, 4);
    ctx.fillStyle='#ffaaaa'; ctx.fillRect(this.x+4, this.oy+bob+3, 4, 2);
    ctx.strokeStyle='#880000'; ctx.lineWidth=2; ctx.strokeRect(this.x, this.oy+bob, this.w, this.h);
    ctx.fillStyle='#fff'; ctx.font='bold 9px Courier New'; ctx.textAlign='center'; ctx.fillText('🥩', this.x+this.w/2, this.oy+bob-2);
  }
  col(r){return this.x<r.x+(r.width||r.w||0)&&this.x+this.w>r.x&&this.y<r.y+(r.height||r.h||0)&&this.y+this.h>r.y;}
}

class CookedFood {
  constructor(x, y) { this.x=x; this.y=y; this.w=14; this.h=14; this.oy=y; this.hungerRestore=30; }
  draw() {
    const bob = Math.sin(frameCount*0.2)*3; drawShadow(this.x, this.oy+8, this.w, this.h/2);
    ctx.fillStyle='#ff8800'; ctx.fillRect(this.x, this.oy+bob, this.w, this.h);
    ctx.fillStyle='#ffcc44'; ctx.fillRect(this.x+3, this.oy+bob+2, 8, 5);
    ctx.fillStyle='#fff8'; ctx.fillRect(this.x+3, this.oy+bob+2, 4, 2);
    ctx.strokeStyle='#cc5500'; ctx.lineWidth=2; ctx.strokeRect(this.x, this.oy+bob, this.w, this.h);
  }
  col(r){return this.x<r.x+(r.width||r.w||0)&&this.x+this.w>r.x&&this.y<r.y+(r.height||r.h||0)&&this.y+this.h>r.y;}
}

// ═══ SECTION 8: SHELTER SYSTEM ═════════════════════════════════════
const shelter={
  x:80, y:80, width:80, height:80, level:1, health:200, maxHealth:200, damageReduction:1.0, hasTrap:false, trapDamage:0, hitTimer: 0,
  getTier() {
    if(this.level < 5) return {name: 'Gỗ', bg: '#5c4033', border: '#ffaa00', roof: '#A0522D'};
    if(this.level < 10) return {name: 'Đá', bg: '#666666', border: '#aaaaaa', roof: '#444444'};
    if(this.level < 15) return {name: 'Đồng', bg: '#b87333', border: '#ffcc00', roof: '#8c5222'};
    if(this.level < 20) return {name: 'Sắt', bg: '#aaaaaa', border: '#ffffff', roof: '#777777'};
    if(this.level < 25) return {name: 'Thép', bg: '#434b4d', border: '#00ccff', roof: '#222222'};
    return {name: 'Công Nghệ', bg: '#111111', border: '#00ffff', roof: '#003333'};
  },
  update(){
    if(this.hitTimer>0) this.hitTimer--;
    for(let i=zombies.length-1;i>=0;i--){
      const z=zombies[i]; if(!this.col(z))continue; this.pushOut(z); this.health=Math.max(0,this.health-z.damage*0.01*this.damageReduction); this.hitTimer = 5;
      if(this.hasTrap&&z.takeDamage(this.trapDamage)) zombieDeath(z);
    }
  },
  pushOut(z){const dx=z.x+z.width/2-(this.x+this.width/2),dy=z.y+z.height/2-(this.y+this.height/2),d=Math.hypot(dx,dy)||1;z.x+=(dx/d)*3;z.y+=(dy/d)*3;},
  draw(){
    drawShadow(this.x, this.y, this.width, this.height); const hp=this.health/this.maxHealth;
    const tier = this.getTier();
    if(this.hitTimer > 0) { ctx.fillStyle = '#fff'; ctx.fillRect(this.x,this.y,this.width,this.height); } 
    else {
      ctx.fillStyle = tier.bg; ctx.fillRect(this.x,this.y,this.width,this.height);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; for(let i=10; i<this.width; i+=20) { ctx.fillRect(this.x+i, this.y, 2, this.height); } 
      ctx.fillStyle = tier.roof; ctx.beginPath(); ctx.moveTo(this.x, this.y+20); ctx.lineTo(this.x+this.width/2, this.y-15); ctx.lineTo(this.x+this.width, this.y+20); ctx.fill(); ctx.strokeStyle='#000'; ctx.lineWidth=2; ctx.stroke();
      ctx.strokeStyle = tier.border; ctx.lineWidth=3; ctx.strokeRect(this.x,this.y,this.width,this.height);
      ctx.fillStyle='#111'; ctx.fillRect(this.x+this.width/2-15, this.y+this.height-25, 30, 25);
      ctx.fillStyle='#000'; ctx.fillRect(this.x+this.width/2-10, this.y+this.height-20, 8, 15); ctx.fillRect(this.x+this.width/2+2, this.y+this.height-20, 8, 15);
    }
    if(this.hasTrap){ ctx.fillStyle='#00ffff'; for(let i=0; i<this.width; i+=20) { ctx.beginPath(); ctx.moveTo(this.x+i, this.y+this.height); ctx.lineTo(this.x+i+10, this.y+this.height+10); ctx.lineTo(this.x+i+20, this.y+this.height); ctx.fill(); } }
    ctx.fillStyle='#fff';ctx.font='bold 14px Courier New';ctx.textAlign='center'; 
    ctx.fillText(`NHÀ ${tier.name.toUpperCase()}`, this.x+this.width/2, this.y+15);
    ctx.fillStyle='#000';ctx.fillRect(this.x,this.y-8,this.width,6); ctx.fillStyle=hp>0.5?'#00ff66':hp>0.25?'#ffaa00':'#ff3333';ctx.fillRect(this.x+1,this.y-7,(this.width-2)*hp,4);
  },
  col(r){return this.x<r.x+(r.width||r.w||0)&&this.x+this.width>r.x&&this.y<r.y+(r.height||r.h||0)&&this.y+this.height>r.y;},
  isDestroyed(){return this.health<=0;}
};

const shelterUpgs={
  house:     {level:1, cost: lv=>({wood:lv*20, stone:lv*15, metal:lv*10}), label:'🏰 Cấp Nhà'},
  wall:      {level:1, cost: lv=>({wood:lv*10+10, stone:lv*10+10, metal:0}), label:'🧱 Tường'},
  foundation:{level:1, cost: lv=>({wood:lv*5+5, stone:lv*15+15, metal:lv*5+5}), label:'🛡️ Móng'},
  trap:      {level:1, cost: lv=>({wood:0, stone:lv*10+10, metal:lv*10+10}), label:'⚡ Bẫy'},
};

function shelterUpgrade(type){
  const u = shelterUpgs[type]; 
  if (type !== 'house' && u.level >= shelter.level) { spawnText(shelter.x + shelter.width/2, shelter.y, `Cần Nhà Lv${u.level+1}`, "#ff3333"); return; }
  const raw = u.cost(u.level);
  const c = adjustCost(raw); // Đã áp dụng giảm giá nguyên liệu kim loại
  if(playerResources.wood < c.wood || playerResources.stone < c.stone || playerResources.metal < c.metal) { spawnText(shelter.x + shelter.width/2, shelter.y, "Thiếu Khoáng!", "#ff3333"); return; }
  playerResources.wood -= c.wood; playerResources.stone -= c.stone; playerResources.metal -= c.metal; u.level++;
  switch(type){ 
    case 'house': shelter.level++; shelter.maxHealth+=200; shelter.health=shelter.maxHealth; player.maxHealth+=25; player.health=Math.min(player.health+25, player.maxHealth); spawnText(player.x+12, player.y-30, "+25 MAX HP!", "#ff6666"); break;
    case 'wall': shelter.maxHealth+=150; shelter.health=shelter.maxHealth; break; 
    case 'foundation': shelter.damageReduction=Math.max(0.1, shelter.damageReduction-0.1); break; 
    case 'trap': shelter.hasTrap=true; shelter.trapDamage+=0.2; break; 
  }
  score += 20; spawnParticles(shelter.x + shelter.width/2, shelter.y + shelter.height/2, '#00ff88', 20); 
  spawnText(shelter.x + shelter.width/2, shelter.y - 15, `ĐÃ NÂNG CẤP!`, "#ffcc00"); updateUI();
}

function refreshShelterBtns(){
  for(const type of ['house', 'wall','foundation','trap']){
    const u = shelterUpgs[type], btn = document.getElementById('btn-'+type), raw = u.cost(u.level), c = adjustCost(raw), cs = [c.wood?'Gỗ:'+c.wood:'', c.stone?'Đá:'+c.stone:'', c.metal?'Kim:'+c.metal:''].filter(Boolean).join(' ');
    if (type !== 'house' && u.level >= shelter.level) {
      btn.className = 'craft-btn no'; btn.innerHTML = `🔒 ${u.label} Lv${u.level}<br><span style="color:#ff4444;font-weight:normal;">Cần Nhà Lv${u.level+1}</span>`;
    } else {
      const can = playerResources.wood>=c.wood && playerResources.stone>=c.stone && playerResources.metal>=c.metal; 
      btn.className = 'craft-btn ' + (can ? 'ok' : 'no'); 
      btn.innerHTML = `⬆ ${u.label} Lv${u.level+1}<br><span style="color:${can?'#00ff88':'#888'};font-weight:normal;">${cs}</span>`;
    }
  }
}

const playerUpgs = {
  sword:   { level: 1, cost: lv=>({stone:15+lv*10, metal:10+lv*10}), label: "Kiếm" },
  axe:     { level: 1, cost: lv=>({wood:10+lv*10, stone:5+lv*10}), label: "Rìu" },
  pickaxe: { level: 1, cost: lv=>({wood:15+lv*10, metal:5+lv*10}), label: "Cúp" }
};

function craftPlayerUpgrade(type) {
  const upg = playerUpgs[type]; 
  if (upg.level >= shelter.level) { spawnText(player.x, player.y, `Cần Nhà Lv${upg.level+1}`, "#ff3333"); return; }
  const raw = upg.cost(upg.level);
  const c = adjustCost(raw); // Đã áp dụng giảm giá nguyên liệu kim loại
  if(playerResources.wood >= (c.wood||0) && playerResources.stone >= (c.stone||0) && playerResources.metal >= (c.metal||0)) {
    if(c.wood) playerResources.wood -= c.wood; if(c.stone) playerResources.stone -= c.stone; if(c.metal) playerResources.metal -= c.metal; upg.level++;
    if(type === 'sword') { player.sword.damage += 15; player.sword.radius += 5; } else if(type === 'axe') { player.tools.axe++; } else if(type === 'pickaxe') { player.tools.pickaxe++; }
    score += 30; spawnParticles(player.x+player.width/2, player.y, '#00ff88', 20); spawnText(player.x+10, player.y-20, "VŨ KHÍ LÊN CẤP!", "#00ff88"); updateUI();
  } else { spawnText(player.x, player.y, "Thiếu Khoáng!", "#ff3333"); }
}

// ═══ SECTION 10: MOBILE CONTROLS (JOYSTICK) ════════════════════════
let joyActive = false, joyDX = 0, joyDY = 0, mobileSprint = false;
const jZone = document.getElementById('joystick-zone');
const jKnob = document.getElementById('joystick-knob');
const btnSprint = document.getElementById('sprint-btn');
jZone.addEventListener('touchstart', handleJoy, {passive: false});
jZone.addEventListener('touchmove', handleJoy, {passive: false});
jZone.addEventListener('touchend', e => { joyActive = false; joyDX = 0; joyDY = 0; jKnob.style.transform = `translate(-50%, -50%)`; e.preventDefault();});
function handleJoy(e) {
  joyActive = true;
  const rect = jZone.getBoundingClientRect(), cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
  let dx = e.touches[0].clientX - cx, dy = e.touches[0].clientY - cy;
  const maxR = rect.width/2 - 25, dist = Math.hypot(dx, dy);
  if (dist > maxR) { dx = (dx/dist)*maxR; dy = (dy/dist)*maxR; }
  jKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  joyDX = dx / maxR; joyDY = dy / maxR; e.preventDefault();
}
btnSprint.addEventListener('touchstart', e=>{ mobileSprint = true; btnSprint.style.background='rgba(0,255,255,0.6)'; e.preventDefault();});
btnSprint.addEventListener('touchend', e=>{ mobileSprint = false; btnSprint.style.background='rgba(0,200,255,0.4)'; e.preventDefault();});

// ═══ SECTION 9: PLAYER & UPGRADES ═════════════════════════════════
const player={
  x:420,y:260, width:24,height:24, speed:3.2,sprintSpeed:5.2,
  health:100,maxHealth:100, hunger:100,maxHunger:100, energy:100,maxEnergy:100,
  vx:0,vy:0, inShelter:false, tools: { axe: 0, pickaxe: 0 }, hitTimer: 0,
  sword:{ swinging:false, angle:0, totalSwing:0, speed:0.35, radius:55, damage:25, cooldown:0, hitSet:new Set() },
  handleInput(){
    this.vx=0;this.vy=0;
    if(joyActive) { this.vx = joyDX; this.vy = joyDY; } 
    else {
      if(keys['w']||keys['W'])this.vy=-1; if(keys['s']||keys['S'])this.vy=1;
      if(keys['a']||keys['A'])this.vx=-1; if(keys['d']||keys['D'])this.vx=1;
    }
    const sp=( (keys[' '] || mobileSprint) && this.energy>0) ? this.sprintSpeed : this.speed;
    this.x=Math.max(0,Math.min(canvas.width-this.width, this.x+this.vx*sp));
    this.y=Math.max(0,Math.min(canvas.height-this.height,this.y+this.vy*sp));
    if((keys[' '] || mobileSprint) && (this.vx||this.vy)) this.energy=Math.max(0,this.energy-0.5);
  },
  update(){
    if(this.hitTimer>0) this.hitTimer--;
    this.hunger=Math.max(0,this.hunger-0.035); this.inShelter=shelter.col(this);
    this.energy=Math.min(this.maxEnergy,this.energy+(this.inShelter?0.4:0.1));
    if(this.hunger <= 0) {
      this.health = Math.max(0, this.health - 0.15);
      if(Math.random() < 0.1) { spawnParticles(this.x+12, this.y+12, '#ff0000', 3, true); this.hitTimer=5;}
      document.getElementById('healthBarWrap').classList.add('starvation-flash');
    } else document.getElementById('healthBarWrap').classList.remove('starvation-flash');
    const sw=this.sword;
    if(sw.swinging){ sw.angle+=sw.speed; sw.totalSwing+=sw.speed; this._hitCheckAoE(); if(sw.totalSwing>=Math.PI*2){ sw.swinging=false; sw.cooldown=10; sw.hitSet.clear(); } }
    if(sw.cooldown>0)sw.cooldown--;
  },
  startSwing(mx,my){
    const sw=this.sword; if(sw.swinging||sw.cooldown>0)return;
    const cx=this.x+this.width/2,cy=this.y+this.height/2;
    sw.angle=Math.atan2(my-cy,mx-cx)-Math.PI*0.5; sw.totalSwing=0; sw.swinging=true; sw.hitSet.clear();
  },
  _hitCheckAoE(){
    const sw = this.sword; const cx = this.x + this.width/2, cy = this.y + this.height/2;
    const hitLogic = (obj, idPrefix) => {
      if(sw.hitSet.has(idPrefix)) return;
      const ocx = obj.x + (obj.width||obj.w||0)/2, ocy = obj.y + (obj.height||obj.h||0)/2;
      if (Math.hypot(ocx - cx, ocy - cy) <= sw.radius + (obj.width||obj.w||0)/2) {
        sw.hitSet.add(idPrefix);
        let dmg = 2; 
        if(obj instanceof Zombie || obj instanceof Animal) dmg = currentTool === 'sword' ? sw.damage : 5;
        else if (obj instanceof ResourceNode) {
          if(obj.type === 'tree') dmg = currentTool === 'axe' ? 15 + player.tools.axe * 15 : 2;
          else if(obj.type === 'rock' || obj.type === 'ore') dmg = currentTool === 'pickaxe' ? 15 + player.tools.pickaxe * 15 : 2;
        }
        if(obj.takeDamage(dmg)){
          if(obj instanceof Zombie) { zombieDeath(obj); }
          else if(obj instanceof Animal) { score+=5; const idx=animals.indexOf(obj); if(idx>-1) animals.splice(idx,1); }
          else if(obj instanceof ResourceNode) { const idx=resourceNodes.indexOf(obj); if(idx>-1) resourceNodes.splice(idx,1); }
        }
      }
    };
    zombies.forEach((z,i) => hitLogic(z, 'z'+i)); 
    animals.forEach((a,i) => hitLogic(a, 'a'+i)); 
    resourceNodes.forEach((n,i) => hitLogic(n, 'n'+i));
  },
  draw(){
    drawShadow(this.x, this.y, this.width, this.height);
    const bob = (this.vx!==0 || this.vy!==0) ? Math.sin(frameCount*0.4)*2 : 0; 
    if(this.hitTimer > 0) { ctx.fillStyle = '#fff'; ctx.fillRect(this.x, this.y+bob, this.width, this.height); } else {
      ctx.fillStyle=this.inShelter?'#1E90FF':'#2E8B57'; ctx.fillRect(this.x, this.y+bob, this.width, this.height); ctx.strokeStyle='#000'; ctx.lineWidth=2; ctx.strokeRect(this.x, this.y+bob, this.width, this.height);
      ctx.fillStyle='#FFE4C4'; ctx.fillRect(this.x+4, this.y+bob-6, this.width-8, this.height-8); ctx.strokeRect(this.x+4, this.y+bob-6, this.width-8, this.height-8);
      ctx.fillStyle='#000'; ctx.fillRect(this.x+6, this.y+bob-2, 3, 3); ctx.fillRect(this.x+15, this.y+bob-2, 3, 3);
      ctx.fillStyle='#333'; ctx.fillRect(this.x+4, this.y+this.height+bob, 6, 4); ctx.fillRect(this.x+14, this.y+this.height-bob, 6, 4);
    }
    this._drawWeapon(bob);
  },
  _drawWeapon(bob){
    const sw=this.sword, cx=this.x+this.width/2, cy=this.y+this.height/2 + bob;
    const swordLevel = playerUpgs.sword.level;
    const axeLevel = playerUpgs.axe.level;
    const pickaxeLevel = playerUpgs.pickaxe.level;
    
    const getGlowColor = (tool) => {
      if(tool === 'sword') {
        if(swordLevel >= 3) return ['#00ffff', '#0088ff'];
        if(swordLevel >= 2) return ['#00ddff', '#0066ff'];
        return ['#00aaff', '#0044ff'];
      } else if(tool === 'axe') {
        if(axeLevel >= 3) return ['#ffaa00', '#ff6600'];
        if(axeLevel >= 2) return ['#ff9900', '#ff5500'];
        return ['#ff8800', '#ff4400'];
      } else {
        if(pickaxeLevel >= 3) return ['#aaaaff', '#6666ff'];
        if(pickaxeLevel >= 2) return ['#9999ff', '#5555ff'];
        return ['#aaaaaa', '#777777'];
      }
    };
    
    if(sw.swinging){
      ctx.beginPath(); ctx.arc(cx, cy, sw.radius*0.8, sw.angle-0.5, sw.angle+0.5);
      const [glowColor, darkColor] = getGlowColor(currentTool);
      ctx.lineWidth=14; ctx.strokeStyle = glowColor; ctx.lineCap='round'; ctx.stroke();
      const tipX = cx + Math.cos(sw.angle)*sw.radius, tipY = cy + Math.sin(sw.angle)*sw.radius;
      
      if(currentTool === 'sword') { 
        const level = swordLevel;
        ctx.strokeStyle=glowColor; ctx.lineWidth=6 + (level-1)*2; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(tipX,tipY); ctx.stroke(); 
        if(level >= 2) { ctx.strokeStyle='rgba(0,200,255,0.4)'; ctx.lineWidth=10 + (level-1)*2; ctx.stroke(); }
      }
      else if (currentTool === 'axe') { 
        const level = axeLevel;
        ctx.strokeStyle='#8B4513'; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(tipX,tipY); ctx.stroke(); 
        ctx.fillStyle=glowColor; const axeSize = 10 + (level-1)*2; ctx.fillRect(tipX-axeSize/2, tipY-axeSize/2, axeSize, axeSize); 
        if(level >= 3) { ctx.strokeStyle='rgba(255,150,0,0.5)'; ctx.lineWidth=3; ctx.strokeRect(tipX-axeSize/2-2, tipY-axeSize/2-2, axeSize+4, axeSize+4); }
      }
      else if (currentTool === 'pickaxe') { 
        const level = pickaxeLevel;
        ctx.strokeStyle='#8B4513'; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(tipX,tipY); ctx.stroke(); 
        ctx.strokeStyle=glowColor; ctx.lineWidth=8 + (level-1)*1; ctx.beginPath(); ctx.arc(tipX,tipY, 12 + (level-1)*2, sw.angle-0.8, sw.angle+0.8); ctx.stroke(); 
      }
    } else if(sw.cooldown===0){
      const ia=Math.PI*0.25; const tipX = cx+Math.cos(ia)*18, tipY = cy+Math.sin(ia)*18;
      const [glowColor, darkColor] = getGlowColor(currentTool);
      ctx.strokeStyle=glowColor; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(tipX,tipY); ctx.stroke();
      if(currentTool==='axe') { const level = axeLevel; ctx.fillStyle=glowColor; const axeSize = 8 + (level-1)*1; ctx.fillRect(tipX-axeSize/2,tipY-axeSize/2, axeSize, axeSize); }
      if(currentTool==='pickaxe') { const level = pickaxeLevel; ctx.strokeStyle=glowColor; ctx.lineWidth=6; ctx.beginPath(); ctx.arc(tipX,tipY, 8 + (level-1)*1, ia-0.8, ia+0.8); ctx.stroke(); }
    }
  },
  takeDamage(a){this.health=Math.max(0,this.health-a);spawnParticles(this.x+12,this.y+12,'#ff0000',10, true); spawnText(this.x+12, this.y, `-${Math.ceil(a)}`, "#ff4444"); this.hitTimer=5;},
  eatCooked(cf){
    if(this.hunger >= this.maxHunger - 5) {
      const hpGain = 20; this.health = Math.min(this.maxHealth, this.health + hpGain);
      spawnParticles(cf.x,cf.y,'#ff4444',8); spawnText(this.x+12, this.y, `+${hpGain} HP`, "#ff6666");
    } else {
      this.hunger=Math.min(this.maxHunger,this.hunger+cf.hungerRestore);
      spawnParticles(cf.x,cf.y,'#ff9900',8); spawnText(this.x+12, this.y, `+${cf.hungerRestore} ĐÓI`, "#ff9900");
    }
  },
  pickupMeat(m){ playerResources.meat++; spawnParticles(m.x,m.y,'#cc3333',8); spawnText(m.x+8, m.y-5, "+1 Thịt", "#ff7777"); }
};

// ═══ SECTION 11: ENVIRONMENT (ANIMALS & RESOURCES) ════════════════
class Animal {
  constructor(x,y) { this.x=x; this.y=y; this.w=24; this.h=24; this.hp=30; this.maxHp=30; this.vx=0; this.vy=0; this.timer=0; this.hitTimer=0;}
  get width(){ return this.w; } get height(){ return this.h; }
  update() {
    if(this.hitTimer>0) this.hitTimer--; this.timer--;
    if(this.timer<=0) { this.vx=(Math.random()-.5)*2.5; this.vy=(Math.random()-.5)*2.5; this.timer=40+Math.random()*60; }
    this.x = Math.max(0, Math.min(canvas.width-this.w, this.x+this.vx)); this.y = Math.max(0, Math.min(canvas.height-this.h, this.y+this.vy));
  }
  draw() {
    drawShadow(this.x, this.y, this.w, this.h); const bob = (this.vx!==0 || this.vy!==0) ? Math.sin(frameCount*0.6)*2 : 0;
    if(this.hitTimer>0) { ctx.fillStyle='#fff'; ctx.fillRect(this.x, this.y+bob, this.w, this.h); }
    else {
      ctx.fillStyle='#ffb6c1'; ctx.fillRect(this.x, this.y+bob, this.w, this.h); ctx.strokeStyle='#000'; ctx.lineWidth=2; ctx.strokeRect(this.x, this.y+bob, this.w, this.h);
      ctx.fillStyle='#ff69b4'; ctx.fillRect(this.x+(this.vx>=0?16:4), this.y+bob+8, 6, 8); ctx.fillStyle='#000'; ctx.fillRect(this.x+(this.vx>=0?14:8), this.y+bob+4, 2, 2); 
      ctx.fillStyle='#000'; ctx.fillRect(this.x+4, this.y+this.h+bob, 4, 4); ctx.fillRect(this.x+16, this.y+this.h-bob, 4, 4);
    }
    if(this.hp < this.maxHp) { ctx.fillStyle='#000'; ctx.fillRect(this.x, this.y-8, this.w, 6); ctx.fillStyle='#0f0'; ctx.fillRect(this.x+1, this.y-7, (this.w-2)*(this.hp/this.maxHp), 4); }
  }
  takeDamage(amt) {
    this.hp -= amt; spawnParticles(this.x+12, this.y+12, '#ff0000', 8, true); spawnText(this.x+12, this.y, `-${Math.ceil(amt)}`, "#fff"); this.hitTimer=5;
    if(this.hp<=0) {
      const drops = 1 + (Math.random() < 0.5 ? 1 : 0);
      for(let d=0; d<drops; d++) { meatItems.push(new MeatItem(this.x + (Math.random()-0.5)*20, this.y + (Math.random()-0.5)*10)); }
      spawnText(this.x+12, this.y-15, `🥩 x${drops}`, "#ff7777"); return true;
    }
    return false;
  }
}

class ResourceNode {
  constructor(x,y,type) { this.x=x; this.y=y; this.type=type; this.w=32; this.h=32; this.hp=type==='tree'?30:type==='rock'?40:50; this.maxHp=this.hp; this.hitTimer=0;}
  get width(){ return this.w; } get height(){ return this.h; }
  draw() {
    if(this.hitTimer>0) this.hitTimer--; drawShadow(this.x, this.y, this.w, this.h);
    if(this.hitTimer>0) { ctx.fillStyle='#fff'; ctx.fillRect(this.x, this.y, this.w, this.h); }
    else {
      if(this.type==='tree') {
        ctx.fillStyle='#5c4033'; ctx.fillRect(this.x+12, this.y+10, 8, 22); ctx.fillStyle='#1e5e2f'; ctx.beginPath(); ctx.arc(this.x+16, this.y+10, 16, 0, Math.PI*2); ctx.fill(); ctx.fillStyle='#277c3d'; ctx.beginPath(); ctx.arc(this.x+10, this.y+4, 12, 0, Math.PI*2); ctx.fill(); ctx.fillStyle='#32cd32'; ctx.beginPath(); ctx.arc(this.x+22, this.y+6, 10, 0, Math.PI*2); ctx.fill();
      } else if(this.type==='rock') {
        ctx.fillStyle='#555'; ctx.beginPath(); ctx.moveTo(this.x+4, this.y+28); ctx.lineTo(this.x+10, this.y+4); ctx.lineTo(this.x+28, this.y+10); ctx.lineTo(this.x+28, this.y+28); ctx.fill(); ctx.stroke(); ctx.fillStyle='#888'; ctx.beginPath(); ctx.moveTo(this.x+10, this.y+4); ctx.lineTo(this.x+18, this.y+12); ctx.lineTo(this.x+8, this.y+20); ctx.fill();
      } else if(this.type==='ore') {
        ctx.fillStyle='#333'; ctx.beginPath(); ctx.moveTo(this.x+4, this.y+28); ctx.lineTo(this.x+10, this.y+4); ctx.lineTo(this.x+28, this.y+10); ctx.lineTo(this.x+28, this.y+28); ctx.fill(); ctx.stroke(); ctx.fillStyle='#00ffff'; ctx.fillRect(this.x+8, this.y+8, 6, 6); ctx.fillRect(this.x+20, this.y+20, 6, 6); 
      }
    }
    if(this.hp < this.maxHp) { ctx.fillStyle='#000'; ctx.fillRect(this.x, this.y-8, this.w, 6); ctx.fillStyle='#ffcc00'; ctx.fillRect(this.x+1, this.y-7, (this.w-2)*(this.hp/this.maxHp), 4); }
  }
  takeDamage(amt) {
    this.hp -= amt; this.hitTimer=5; const col = this.type==='tree'?'#8B4513':this.type==='rock'?'#888':'#00ffff';
    spawnParticles(this.x+16, this.y+16, col, 6); spawnText(this.x+16, this.y, `-${Math.ceil(amt)}`, "#fff");
    if(this.hp<=0) {
      if(this.type==='tree') { playerResources.wood += 8; spawnParticles(this.x+16,this.y+16,'#8B4513',20); spawnText(this.x+16, this.y-10, "+8 Gỗ", "#e6994c"); }
      if(this.type==='rock') { playerResources.stone += 6; spawnParticles(this.x+16,this.y+16,'#888',20); spawnText(this.x+16, this.y-10, "+6 Đá", "#b3b3b3"); }
      if(this.type==='ore') { playerResources.metal += 5; spawnParticles(this.x+16,this.y+16,'#00ffff',20); spawnText(this.x+16, this.y-10, "+5 Kim", "#00ffff"); }
      score+=5; return true;
    } return false;
  }
}

// ═══ SECTION 14: SPAWN & MANAGEMENT FUNCTIONS ══════════════════════
function spawnAnimals(n=1){ for(let i=0;i<n;i++){ let x,y; do{x=30+Math.random()*(canvas.width-60);y=30+Math.random()*(canvas.height-60);}while(x>shelter.x&&x<shelter.x+shelter.width&&y>shelter.y&&y<shelter.y+shelter.height); animals.push(new Animal(x,y)); } }
function spawnResourceNodes(type, n=1){ for(let i=0;i<n;i++){ let x,y; do{x=30+Math.random()*(canvas.width-60);y=30+Math.random()*(canvas.height-60);}while(x>shelter.x-20&&x<shelter.x+shelter.width+20&&y>shelter.y-20&&y<shelter.y+shelter.height+20); resourceNodes.push(new ResourceNode(x,y,type)); } }

// ═══ SECTION 12: COMBAT (ZOMBIES & BOSS) ══════════════════════════
class Zombie{
  constructor(x,y,diff=1,isBoss=false){
    this.x=x;this.y=y;this.isBoss=isBoss;
    const timeMult = getDifficultyMultiplier();
    const bossBonus = isBoss ? 4 : 1;
    this.width = isBoss ? 40 : 24; this.height = isBoss ? 40 : 24;
    this.speed = (0.45 + diff*0.07) * (isBoss ? 0.75 : 1) * Math.sqrt(timeMult);
    this.health = (30 + diff*7) * bossBonus * timeMult;
    this.maxHealth = this.health;
    this.damage = (2 + diff*0.5) * bossBonus * timeMult;
    this.attackCooldown=0; this.hitTimer=0;
    this.glowAngle = 0;
    this.bossAttackTimer = 0;
    this.explosionVisualTimer = 0;
    this.explosionRadius = 120;
  }
  update(){
    if(this.hitTimer>0) this.hitTimer--; 
    this.glowAngle += 0.05;
    const dx=player.x-this.x,dy=player.y-this.y,d=Math.hypot(dx,dy)||1; 
    this.x+=dx/d*this.speed;this.y+=dy/d*this.speed;
    for(const s of structures)if(s.type==='wall_s'&&s.col(this))s.pushOut(this); 
    if(this.attackCooldown>0)this.attackCooldown--;
    
    if(this.isBoss) {
      this.bossAttackTimer++;
      if(this.bossAttackTimer >= 180) { this.bossAttackTimer = 0; this.createExplosion(); }
    }
  }
  createExplosion() {
    this.explosionVisualTimer = 30;
    spawnParticles(this.x + this.width/2, this.y + this.height/2, '#ff4400', 20, false);
    spawnParticles(this.x + this.width/2, this.y + this.height/2, '#ffaa00', 15, false);
    spawnText(this.x + this.width/2, this.y - 20, '💥 BOOM!', '#ff6600');
    const dx = player.x + player.width/2 - (this.x + this.width/2);
    const dy = player.y + player.height/2 - (this.y + this.height/2);
    const distance = Math.hypot(dx, dy);
    if(distance < this.explosionRadius) {
      const explosionDamage = 15 * (1 - distance / this.explosionRadius);
      player.takeDamage(explosionDamage);
      spawnText(player.x + player.width/2, player.y - 10, `-${Math.ceil(explosionDamage)} 💥`, '#ff0000');
    }
  }
  draw(){
    drawShadow(this.x, this.y, this.width, this.height); 
    const bob = Math.sin(frameCount*0.3 + this.x)*2;
    const w = this.width, h = this.height;
    if(this.isBoss && this.explosionVisualTimer > 0) {
      const alpha = this.explosionVisualTimer / 30; ctx.globalAlpha = 0.3 * alpha; ctx.fillStyle = '#ff4400'; ctx.beginPath(); ctx.arc(this.x + w/2, this.y + h/2, this.explosionRadius, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 0.6 * alpha; ctx.strokeStyle = '#ff6600'; ctx.lineWidth = 3; ctx.stroke(); ctx.globalAlpha = 1; this.explosionVisualTimer--;
    }
    if(this.isBoss) {
      const glowR = 28 + Math.sin(this.glowAngle)*6; const grad = ctx.createRadialGradient(this.x+w/2, this.y+h/2, 5, this.x+w/2, this.y+h/2, glowR+10); grad.addColorStop(0, 'rgba(255,0,0,0.5)'); grad.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(this.x+w/2, this.y+h/2+bob, glowR+10, 0, Math.PI*2); ctx.fill();
    }
    if(this.hitTimer>0) { ctx.fillStyle='#fff'; ctx.fillRect(this.x, this.y+bob, w, h); }
    else {
      ctx.fillStyle = this.isBoss ? '#8B0000' : '#3b5e2b'; ctx.fillRect(this.x, this.y+bob, w, h); 
      ctx.strokeStyle = this.isBoss ? '#ff0000' : '#000'; ctx.lineWidth=this.isBoss?3:2; ctx.strokeRect(this.x, this.y+bob, w, h);
      if(this.isBoss) {
        ctx.fillStyle='#ff4400'; ctx.fillRect(this.x-4, this.y+bob+4, w/2+4, h/2); ctx.fillRect(this.x+w/2, this.y+bob+4, w/2+4, h/2);
        ctx.fillStyle='#ffcc00'; ctx.fillRect(this.x+4, this.y+bob-8, 6, 10); ctx.fillRect(this.x+w/2-3, this.y+bob-12, 8, 14); ctx.fillRect(this.x+w-10, this.y+bob-8, 6, 10);
        ctx.fillStyle='#ff0000'; ctx.fillRect(this.x+6, this.y+bob-2, 4, 4); ctx.fillRect(this.x+w-10, this.y+bob-2, 4, 4);
        ctx.font='bold 18px Courier New'; ctx.textAlign='center'; ctx.fillStyle='#ff0000'; ctx.fillText('💀', this.x+w/2, this.y+bob+h/2+6);
      } else {
        ctx.fillStyle='#2c4720'; ctx.fillRect(this.x-4, this.y+bob+4, 6, 6); ctx.fillRect(this.x+w-2, this.y+bob+4, 6, 6);
        ctx.fillStyle='#2c4720'; ctx.fillRect(this.x+4, this.y+bob-6, w-8, h-8); ctx.strokeRect(this.x+4, this.y+bob-6, w-8, h-8);
        ctx.fillStyle='#ff0000'; ctx.fillRect(this.x+6, this.y+bob-4, 3, 3); ctx.fillRect(this.x+15, this.y+bob-4, 3, 3); 
      }
    }
    const hpW = this.isBoss ? 60 : this.width; const hpX = this.x + (this.isBoss ? (this.width-hpW)/2 : 0);
    ctx.fillStyle='#000';ctx.fillRect(hpX, this.y-12, hpW, this.isBoss?8:6); ctx.fillStyle=this.isBoss?'#ff6600':'#f00'; ctx.fillRect(hpX+1, this.y-11, (hpW-2)*(this.health/this.maxHealth), this.isBoss?6:4);
    if(this.isBoss) { ctx.fillStyle='#fff'; ctx.font='bold 10px Courier New'; ctx.textAlign='center'; ctx.fillText('BOSS', this.x+this.width/2, this.y-14); }
  }
  col(r){return this.x<r.x+(r.width||r.w||0)&&this.x+this.width>r.x&&this.y<r.y+(r.height||r.h||0)&&this.y+this.height>r.y;}
  takeDamage(a){
    this.health-=a; spawnParticles(this.x+this.width/2,this.y+this.height/2,this.isBoss?'#ff0000':'#880000',this.isBoss?12:8, true); 
    spawnText(this.x+this.width/2, this.y, `-${Math.ceil(a)}`, this.isBoss?"#ff6600":"#ff8800"); this.hitTimer=5; return this.health<=0;
  }
}

function getSpawnEdge() {
  let x,y; const side=Math.floor(Math.random()*4); 
  if(side===0){x=Math.random()*canvas.width;y=-30;} 
  else if(side===1){x=canvas.width+30;y=Math.random()*canvas.height;} 
  else if(side===2){x=Math.random()*canvas.width;y=canvas.height+30;} 
  else{x=-30;y=Math.random()*canvas.height;} 
  return {x,y};
}

function spawnZombies(){
  if(!dayNight.isNight)return; 
  // QUÁI THƯỜNG CƠ BẢN TĂNG THEO THỜI GIAN: Mỗi 30 giây sinh tồn thêm 1 con quái cơ bản ban đêm
  const survivalBonus = Math.floor(getSurvivalSeconds() / 30);
  const count=Math.floor(wave*1.5)+3 + survivalBonus;
  for(let i=0;i<count;i++){ const {x,y} = getSpawnEdge(); zombies.push(new Zombie(x,y,wave)); }
}

function spawnNightWaveExtra() {
  // QUÁI THƯỜNG CƠ BẢN TĂNG THEO THỜI GIAN: Cộng thêm lượng quái tăng tiến theo mốc 30s vào đợt quái phụ
  const survivalBonus = Math.floor(getSurvivalSeconds() / 30);
  const count = Math.max(2, Math.floor(wave * 0.8) + 1 + survivalBonus);
  for(let i=0;i<count;i++){ const {x,y} = getSpawnEdge(); zombies.push(new Zombie(x,y,wave)); }
  spawnText(canvas.width/2, 60, `+${count} ZOMBIE ĐÊM!`, "#ff6600");
}

function spawnBoss() {
  // SỐ LƯỢNG BOSS TĂNG THEO MỖI ĐÊM ĐÃ QUA: Đêm 1 sinh 1 Boss, Đêm 2 sinh 2 Boss, v.v.
  const bossCount = 1 + nightsPassed;
  for(let i=0; i<bossCount; i++) {
    const {x,y} = getSpawnEdge();
    zombies.push(new Zombie(x, y, wave, true));
  }
  const alert = document.getElementById('bossAlert');
  alert.style.display = 'block';
  bossAlertTimer = 180;
  spawnText(canvas.width/2, 80, `💀 ${bossCount} BOSS XUẤT HIỆN! 💀`, "#ff0000");
  spawnParticles(canvas.width/2, canvas.height/2, '#ff0000', 30);
}

function zombieDeath(z) {
  score += z.isBoss ? 50 : 10;
  const dropChance = z.isBoss ? 1.0 : 0.35;
  if (Math.random() < dropChance) {
    if (z.isBoss) {
      const loots = [
        { type: 'wood', min: 5, max: 10, icon: '🪵', color: '#e6994c' },
        { type: 'stone', min: 5, max: 10, icon: '🪨', color: '#b3b3b3' },
        { type: 'metal', min: 3, max: 7, icon: '⚙️', color: '#66e0ff' }
      ];
      const selected = loots.sort(() => 0.5 - Math.random()).slice(0, 2);
      selected.forEach(loot => {
        const amount = Math.floor(Math.random() * (loot.max - loot.min + 1)) + loot.min;
        playerResources[loot.type] += amount;
        spawnText(z.x + z.width/2, z.y - 5, `+${amount} ${loot.icon}`, loot.color);
      });
      const meatCount = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < meatCount; i++) { meatItems.push(new MeatItem(z.x + Math.random()*z.width, z.y + Math.random()*z.height)); }
      spawnText(z.x + z.width/2, z.y + z.height/2, `+${meatCount} 🥩`, '#ff7777');
    } else {
      const lootType = Math.random();
      if (lootType < 0.25) {
        const amount = 1 + Math.floor(Math.random() * 3); playerResources.wood += amount; spawnText(z.x + z.width/2, z.y - 5, `+${amount} 🪵`, '#e6994c');
      } else if (lootType < 0.5) {
        const amount = 1 + Math.floor(Math.random() * 3); playerResources.stone += amount; spawnText(z.x + z.width/2, z.y - 5, `+${amount} 🪨`, '#b3b3b3');
      } else if (lootType < 0.75) {
        const amount = 1 + Math.floor(Math.random() * 2); playerResources.metal += amount; spawnText(z.x + z.width/2, z.y - 5, `+${amount} ⚙️`, '#66e0ff');
      } else {
        meatItems.push(new MeatItem(z.x + z.width/2, z.y + z.height/2)); spawnText(z.x + z.width/2, z.y - 5, `+1 🥩`, '#ff7777');
      }
    }
  }
  spawnParticles(z.x + z.width/2, z.y + z.height/2, z.isBoss ? '#ff0000' : '#880000', z.isBoss ? 20 : 10, true);
  const idx = zombies.indexOf(z); if (idx >= 0) zombies.splice(idx, 1);
}

// ═══ SECTION 13: STRUCTURES & BUILDINGS ════════════════════════════
const SDEFS={
  crossbow:{name:'Máy Nỏ',icon:'🏹',w:40,h:40,cost:lv=>({wood:lv*10+5,stone:0,metal:lv*8+2}),color:'#4a2e15',border:'#cc6600',maxLv:3},
  wall_s:  {name:'Tường', icon:'🧱',w:40,h:40,cost:lv=>({wood:lv*8+2,stone:lv*8+2,metal:0}),color:'#555',border:'#000',maxLv:3},
  foodproc:{name:'Bếp Lò',icon:'🍳',w:40,h:40,cost:lv=>({wood:lv*6+4,stone:0,metal:lv*5+3}),color:'#222',border:'#00ff66',maxLv:3},
};

class Structure{
  constructor(type,x,y){
    const d=SDEFS[type]; this.type=type; this.x=x; this.y=y; this.width=d.w; this.height=d.h; this.level=1; this.maxLevel=d.maxLv; this.selected=false; this.hitTimer=0;
    if(type==='crossbow'){this.shootInterval=160;this.bulletDamage=25;this.range=180;this.timer=0;}
    if(type==='wall_s'){this.health=300;this.maxHealth=300;}
    if(type==='foodproc'){this.foodInterval=400;this.timer=0; this.noMeatFlash=0;} 
  }
  update(){
    if(this.hitTimer>0) this.hitTimer--;
    if(this.type==='crossbow'){ this.timer++; if(this.timer>=this.shootInterval){this.timer=0;this._shoot();} }
    if(this.type==='foodproc'){
      if(this.noMeatFlash > 0) this.noMeatFlash--; this.timer++; 
      if(this.timer>=this.foodInterval){
        this.timer=0;
        if(playerResources.meat > 0) {
          playerResources.meat--; cookedFoods.push(new CookedFood(this.x+this.width/2-7, this.y+this.height+5));
          spawnParticles(this.x+this.width/2,this.y,'#ff9900',10); spawnText(this.x+20, this.y-5, "🍖 Nấu Xong!", "#ff9900");
        } else { this.noMeatFlash = 40; spawnText(this.x+20, this.y-5, "Hết Thịt!", "#ff4444"); }
      }
    }
    if(this.type==='wall_s'){ for(const z of zombies)if(this.col(z)){this.health=Math.max(0,this.health-z.damage*0.005); this.hitTimer=3;} }
  }
  _shoot(){ const cx=this.x+this.width/2,cy=this.y+this.height/2; let best=null,bestD=this.range; for(const z of zombies){const d=Math.hypot(z.x+z.width/2-cx,z.y+z.height/2-cy);if(d<bestD){bestD=d;best=z;}} if(best)particles.push(new Bullet(cx,cy,best,this.bulletDamage)); }
  draw(){
    drawShadow(this.x, this.y, this.width, this.height); const d=SDEFS[this.type]; const cx=this.x+this.width/2, cy=this.y+this.height/2;
    const noMeat = this.type==='foodproc' && this.noMeatFlash > 0 && Math.floor(this.noMeatFlash/5)%2===0;
    if(this.hitTimer > 0 || noMeat) { ctx.fillStyle= noMeat ? '#440000' : '#fff'; ctx.fillRect(this.x,this.y,this.width,this.height); }
    else {
      ctx.fillStyle=d.color;ctx.fillRect(this.x,this.y,this.width,this.height);
      if (this.type==='wall_s') { ctx.fillStyle='#333'; for(let i=5; i<40; i+=10) { ctx.fillRect(this.x, this.y+i, 40, 2); } for(let i=10; i<40; i+=20) { ctx.fillRect(this.x+i, this.y, 2, 40); ctx.fillRect(this.x+i+10, this.y+10, 2, 20); } }
      else if (this.type==='crossbow') { ctx.fillStyle='#111'; ctx.fillRect(cx-10,cy-10, 20, 20); ctx.strokeStyle='#ccc'; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(cx,cy, 14, 0, Math.PI); ctx.stroke(); }
      else if (this.type==='foodproc') {
        const p=this.timer/this.foodInterval; ctx.fillStyle='#111'; ctx.fillRect(cx-12, cy-12, 24, 24);
        ctx.fillStyle = playerResources.meat > 0 ? '#ff6600' : '#440000'; ctx.fillRect(cx-8, cy-8, 16*p, 16*p);
        ctx.fillStyle = playerResources.meat > 0 ? '#ff7777' : '#444'; ctx.font='bold 10px Courier New'; ctx.textAlign='center'; ctx.fillText('🥩'+playerResources.meat, cx, cy+18);
      }
      ctx.strokeStyle=this.selected?'#fff':d.border;ctx.lineWidth=this.selected?4:2; ctx.strokeRect(this.x,this.y,this.width,this.height);
      if(this.type !== 'wall_s' && this.type !== 'crossbow') { ctx.fillStyle='#fff'; ctx.font=`16px Courier New`;ctx.textAlign='center'; ctx.fillText(d.icon, cx, cy+5); }
    }
    ctx.fillStyle='#ffcc00';ctx.font='bold 11px Courier New';ctx.textAlign='right'; ctx.fillText('Lv'+this.level,this.x+this.width-4,this.y+this.height-4);
    if(this.type==='wall_s'){ const hp=this.health/this.maxHealth; ctx.fillStyle='#000';ctx.fillRect(this.x,this.y-8,this.width,6); ctx.fillStyle=hp>0.5?'#00ff66':hp>0.25?'#ffaa00':'#ff3333';ctx.fillRect(this.x+1,this.y-7, (this.width-2)*hp,4); }
    else if(this.type==='foodproc'){ const p=this.timer/this.foodInterval; ctx.fillStyle='#000';ctx.fillRect(this.x,this.y+this.height+2,this.width,6); ctx.fillStyle= playerResources.meat>0 ? '#ff9900':'#444';ctx.fillRect(this.x+1,this.y+this.height+3,(this.width-2)*p,4); }
    if(this.type==='crossbow'&&this.selected){ ctx.strokeStyle='rgba(200,140,0,0.5)';ctx.lineWidth=2; ctx.beginPath();ctx.arc(cx,cy,this.range,0,Math.PI*2);ctx.stroke(); }
  }
  col(r){return this.x<r.x+(r.width||r.w||0)&&this.x+this.width>r.x&&this.y<r.y+(r.height||r.h||0)&&this.y+this.height>r.y;}
  pushOut(z){const dx=z.x+z.width/2-(this.x+this.width/2),dy=z.y+z.height/2-(this.y+this.height/2),d=Math.hypot(dx,dy)||1;z.x+=(dx/d)*3;z.y+=(dy/d)*3;}
  isDestroyed(){return this.type==='wall_s'&&this.health<=0;}
  upgrade(){
    if(this.level>=shelter.level) { spawnText(this.x+20, this.y, `Cần Nhà Lv${this.level+1}`, "#ff3333"); return false; }
    const raw=SDEFS[this.type].cost(this.level);
    const cost = adjustCost(raw); // Đã áp dụng giảm giá nguyên liệu kim loại
    if(playerResources.wood<(cost.wood||0)||playerResources.stone<(cost.stone||0)||playerResources.metal<(cost.metal||0)) { spawnText(this.x+20, this.y, "Thiếu Khoáng!", "#ff3333"); return false; }
    if(cost.wood) playerResources.wood-=cost.wood; if(cost.stone) playerResources.stone-=cost.stone; if(cost.metal) playerResources.metal-=cost.metal; this.level++;
    if(this.type==='crossbow'){this.shootInterval=Math.max(55,this.shootInterval-30);this.bulletDamage+=15;this.range+=30;}
    if(this.type==='wall_s'){this.maxHealth+=200;this.health=this.maxHealth;}
    if(this.type==='foodproc'){this.foodInterval=Math.max(100,this.foodInterval-100);}
    score+=15;spawnParticles(this.x+this.width/2,this.y+this.height/2,'#00ff88',25); spawnText(this.x+20, this.y-10, "Lên Cấp!", "#00ff88"); return true;
  }
}

// ═══ SECTION 15: CRAFTING & BUILDING INTERFACE ═════════════════════
function selectCraft(type){ selectedCraft=type; document.querySelectorAll('.craft-btn').forEach(b=>b.style.outline='none'); const btn=document.getElementById('craft-'+type); if(btn)btn.style.outline='2px solid #00ff88'; }

function tryPlaceStructure(gx, gy) {
  if(!selectedCraft)return false; const def=SDEFS[selectedCraft];
  if (gx < 0 || gx + def.w > canvas.width || gy < 0 || gy + def.h > canvas.height) return false;
  if (gx < shelter.x + shelter.width && gx + def.w > shelter.x && gy < shelter.y + shelter.height && gy + def.h > shelter.y) return false;
  for(let s of structures) if (gx < s.x + s.width && gx + def.w > s.x && gy < s.y + s.height && gy + def.h > s.y) return false;
  if (gx < player.x + player.width && gx + def.w > player.x && gy < player.y + player.height && gy + def.h > player.y) return false;
  const raw = def.cost(1);
  const c = adjustCost(raw); // Đã áp dụng giảm giá nguyên liệu kim loại
  if(playerResources.wood<(c.wood||0)||playerResources.stone<(c.stone||0)||playerResources.metal<(c.metal||0)) { spawnText(gx+20, gy, "Thiếu Khoáng!", "#ff3333"); return false; }
  if(c.wood) playerResources.wood-=c.wood; if(c.stone) playerResources.stone-=c.stone; if(c.metal) playerResources.metal-=c.metal;
  structures.push(new Structure(selectedCraft, gx, gy)); score+=10; spawnParticles(gx+def.w/2, gy+def.h/2, '#00ffaa', 25);
  selectedCraft=null; document.querySelectorAll('.craft-btn').forEach(b=>b.style.outline='none'); refreshStructPanel(); updateUI(); return true;
}

function setTool(tool) { currentTool = tool; document.querySelectorAll('.tslot').forEach(el => el.classList.remove('active')); document.getElementById('slot-'+tool).classList.add('active'); spawnText(player.x+10, player.y-10, `${tool==='sword'?'KIẾM':tool==='axe'?'RÌU':'CÚP'}`, "#fff");}

function refreshStructPanel(){
  const div=document.getElementById('structureUpgradeButtons'); div.innerHTML='';
  if(!selectedStructure){div.innerHTML='<span style="color:#777;font-size:12px;display:block;text-align:center;">Chạm CT trên map để Nâng Cấp</span>';return;}
  const s=selectedStructure,def=SDEFS[s.type];
  const h=document.createElement('div');h.style.cssText='font-size:13px;color:#ffcc44;margin-bottom:6px;text-align:center;width:100%;font-weight:bold;'; h.textContent=def.icon+' '+def.name+' Lv'+s.level;div.appendChild(h);
  if(s.level >= shelter.level){
    const m=document.createElement('span');m.className='craft-btn no';m.innerHTML=`🔒 Lv${s.level}<br><span style="color:#ff4444;font-weight:normal;">Cần Nhà Lv${s.level+1}</span>`;div.appendChild(m);return;
  }
  const raw=def.cost(s.level); const cost = adjustCost(raw); const cs=[cost.wood?'🪵'+cost.wood:'',cost.stone?'🪨'+cost.stone:'',cost.metal?'⚙️'+cost.metal:''].filter(Boolean).join(' ');
  const can=playerResources.wood>=(cost.wood||0)&&playerResources.stone>=(cost.stone||0)&&playerResources.metal>=(cost.metal||0);
  const btn=document.createElement('button');btn.className='craft-btn '+(can?'ok':'no'); btn.innerHTML='⬆ Nâng Cấp Lv'+(s.level+1)+'<br><span style="color:#aaa;font-weight:normal;">'+cs+'</span>';
  btn.onclick=()=>{if(s.upgrade())refreshStructPanel(); updateUI();};div.appendChild(btn);
}

function refreshCraftBtns(){
  refreshShelterBtns();
  for(const type of['crossbow','wall_s','foodproc']){
    const def=SDEFS[type],btn=document.getElementById('craft-'+type);if(!btn)continue;
    const raw = def.cost(1); const c = adjustCost(raw);
    const can=playerResources.wood>=(c.wood||0)&&playerResources.stone>=(c.stone||0)&&playerResources.metal>=(c.metal||0);
    const hasOutline=btn.style.outline;btn.className='craft-btn '+(can?'ok':'no'); if(hasOutline)btn.style.outline=hasOutline;
  }
  for(const type of ['sword', 'axe', 'pickaxe']) {
    const upg = playerUpgs[type]; const btn = document.getElementById('craft-'+type); if(!btn) continue;
    if(upg.level >= shelter.level) { 
      btn.className = 'craft-btn no'; btn.innerHTML = `🔒 ${upg.label} Lv${upg.level}<br><span style="color:#ff4444;font-weight:normal;">Cần Nhà Lv${upg.level+1}</span>`; 
    } else {
      const raw = upg.cost(upg.level); const c = adjustCost(raw); const can = playerResources.wood>=(c.wood||0) && playerResources.stone>=(c.stone||0) && playerResources.metal>=(c.metal||0);
      btn.className = 'craft-btn ' + (can ? 'ok' : 'no'); const cs = [c.wood?'Gỗ:'+c.wood:'', c.stone?'Đá:'+c.stone:'', c.metal?'Kim:'+c.metal:''].filter(Boolean).join(' ');
      btn.innerHTML = `${type==='sword'?'🗡':type==='axe'?'🪓':'⛏'} Nâng ${upg.label} Lv${upg.level+1}<br><span style="color:${can?'#00ff88':'#888'};font-weight:normal;">${cs}</span>`;
    }
  }
}

// ═══ SECTION 16: UI & DISPLAY UPDATES ══════════════════════════════
function updateUI(){
  const pct=v=>Math.max(0,Math.min(100,v*100))+'%';
  document.getElementById('healthFill').style.width=pct(player.health/player.maxHealth); document.getElementById('hungerFill').style.width=pct(player.hunger/player.maxHunger); document.getElementById('energyFill').style.width=pct(player.energy/player.maxEnergy);
  document.getElementById('healthValue').textContent=Math.ceil(player.health); document.getElementById('hungerValue').textContent=Math.ceil(player.hunger); document.getElementById('energyValue').textContent=Math.ceil(player.energy);
  document.getElementById('waveInfo').textContent='SÓNG: '+wave; document.getElementById('zombieCount').textContent='ZOMBIE: '+zombies.length;
  document.getElementById('woodCount').textContent=playerResources.wood; document.getElementById('stoneCount').textContent=playerResources.stone; document.getElementById('metalCount').textContent=playerResources.metal;
  document.getElementById('meatCount').textContent=playerResources.meat;
  document.getElementById('shelterHealth').textContent='NHÀ Lv'+shelter.level+': '+Math.ceil(shelter.health)+'/'+shelter.maxHealth;
  const timerEl = document.getElementById('survivalTimer'); timerEl.textContent = getSurvivalDisplay();
  const diffMult = getDifficultyMultiplier(); if(diffMult >= 2.0) timerEl.classList.add('danger'); else timerEl.classList.remove('danger');
  refreshCraftBtns(); if(selectedStructure)refreshStructPanel();
}

function showGameOver(msg){
  document.getElementById('gameOverMsg').textContent=msg;
  document.getElementById('finalScore').textContent='Sinh Tồn Tới Sóng: '+wave+' | Điểm: '+score;
  document.getElementById('finalTime').textContent='Thời Gian Sinh Tồn: ' + getSurvivalDisplay().replace('⏱ ','');
  document.getElementById('gameOver').classList.remove('hidden');
}

function manageSpawns(){
  spawnTimer++; const n = dayNight.isNight;
  if(!n && spawnTimer % 180 === 0 && animals.length < 5 + wave) spawnAnimals(1);
  if(n && spawnTimer % 600 === 0 && animals.length < 2) spawnAnimals(1);
  if(spawnTimer % (n ? 600 : 250) === 0 && resourceNodes.length < 16) { const r = Math.random(); spawnResourceNodes(r < 0.55 ? 'tree' : (r < 0.85 ? 'rock' : 'ore'), 1); }
}

function updateNightSpawns(deltaMs) {
  if(!dayNight.isNight) return;
  nightSpawnInterval30s += deltaMs; nightBossInterval60s += deltaMs;
  if(nightSpawnInterval30s >= 30000) { nightSpawnInterval30s -= 30000; nightSpawnWaveExtra(); }
  if(nightBossInterval60s >= 60000) { nightBossInterval60s -= 60000; spawnBoss(); }
}

// ═══ SECTION 17: GAME LOOP & UPDATES ═══════════════════════════════
function update(){
  if(!gameActive)return; 
  frameCount++; const now = Date.now(); const deltaMs = now - lastUpdateTime; lastUpdateTime = now;
  dayNight.update();
  if(dayNight.isNight&&!lastIsNight){
    wave++; spawnZombies(); if(!survivalStartTime) survivalStartTime = Date.now();
    nightSpawnInterval30s = 0; nightBossInterval60s = 0;
    spawnText(canvas.width/2, 80, "ZOMBIE XUẤT HIỆN!", "#ff3333");
  } 
  if(!dayNight.isNight&&lastIsNight){
    zombies=[]; nightSpawnInterval30s = 0; nightBossInterval60s = 0;
    spawnText(canvas.width/2, 80, "TRỜI ĐÃ SÁNG!", "#ffcc00");
  } 
  lastIsNight=dayNight.isNight; updateNightSpawns(deltaMs);
  if(bossAlertTimer > 0) { bossAlertTimer--; if(bossAlertTimer <= 0) document.getElementById('bossAlert').style.display = 'none'; }

  player.handleInput();player.update();shelter.update();
  for(let i=structures.length-1;i>=0;i--){ structures[i].update();if(structures[i].isDestroyed()){structures.splice(i,1);} }
  for(let i=zombies.length-1;i>=0;i--){ const z=zombies[i];z.update(); if(z.col(player)&&z.attackCooldown===0){player.takeDamage(z.damage);z.attackCooldown=60;} if(z.health<=0) zombieDeath(z);}
  for(let i=animals.length-1;i>=0;i--){ animals[i].update(); }

  for(let i=meatItems.length-1;i>=0;i--){
    meatItems[i].update(); if(meatItems[i].life<=0){ meatItems.splice(i,1); continue; }
    if(meatItems[i].col(player)){ player.pickupMeat(meatItems[i]); meatItems.splice(i,1); }
  }
  for(let i=cookedFoods.length-1;i>=0;i--){ if(cookedFoods[i].col(player)){ player.eatCooked(cookedFoods[i]); cookedFoods.splice(i,1); score+=5; } }
  for(let i=particles.length-1;i>=0;i--){particles[i].update();if(particles[i].life<=0)particles.splice(i,1);}
  for(let i=floatingTexts.length-1;i>=0;i--){floatingTexts[i].update();if(floatingTexts[i].life<=0)floatingTexts.splice(i,1);}
  manageSpawns();
  if(player.health<=0){gameActive=false;showGameOver('MẤT MÁU CẠN KIỆT SINH LỰC!');} 
  if(shelter.isDestroyed()){gameActive=false;showGameOver('NHÀ CHÍNH ĐÃ BỊ SAN PHẲNG!');}
  if(frameCount % 10 === 0) updateUI();
}

// ═══ SECTION 18: RENDERING & DRAW ═════════════════════════════════
function draw(){
  ctx.fillStyle='#446b33'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#4c753a'; for(let x=0;x<canvas.width;x+=GRID*2){ for(let y=0;y<canvas.height;y+=GRID*2){ ctx.fillRect(x,y,GRID,GRID); ctx.fillRect(x+GRID,y+GRID,GRID,GRID); } }
  ctx.fillStyle='#5a8a44'; mapDecor.forEach(d => { if(d.type === 'grass') { ctx.fillRect(d.x, d.y, 4, 12); ctx.fillRect(d.x-4, d.y+4, 4, 8); ctx.fillRect(d.x+4, d.y+4, 4, 8); } else { ctx.fillStyle='#ffaa00'; ctx.fillRect(d.x, d.y, 6, 6); ctx.fillStyle='#5a8a44'; } });
  ctx.strokeStyle='rgba(0,0,0,0.15)'; ctx.lineWidth=1;
  for(let x=0;x<canvas.width;x+=GRID){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke();}
  for(let y=0;y<canvas.height;y+=GRID){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke();}
  shelter.draw(); resourceNodes.forEach(n=>n.draw()); structures.forEach(s=>s.draw()); animals.forEach(a=>a.draw()); meatItems.forEach(m => m.draw()); cookedFoods.forEach(f => f.draw()); zombies.forEach(z=>z.draw()); player.draw(); particles.forEach(p=>p.draw());
  dayNight.drawOverlay(); floatingTexts.forEach(t=>t.draw()); 
  if(selectedCraft){
    const def=SDEFS[selectedCraft]; const gx = Math.floor(mouseX / GRID) * GRID, gy = Math.floor(mouseY / GRID) * GRID;
    ctx.globalAlpha=0.6; ctx.fillStyle=def.color; ctx.fillRect(gx,gy,def.w,def.h); ctx.strokeStyle='#00ffaa'; ctx.lineWidth=4; ctx.strokeRect(gx,gy,def.w,def.h); ctx.globalAlpha=1;
    ctx.fillStyle='#000'; ctx.font='bold 14px Courier New'; ctx.textAlign='center'; ctx.fillText('Click Đặt', gx+def.w/2+1, gy-7); ctx.fillStyle='#00ffaa'; ctx.fillText('Click Đặt', gx+def.w/2, gy-8);
  }
  ctx.fillStyle=dayNight.isNight?'#7799ff':'#ffcc44';ctx.font='bold 16px Courier New';ctx.textAlign='left'; ctx.fillText(dayNight.getPhaseText()+'  '+dayNight.getTimeLeft(),12,24);
  if(dayNight.isNight) {
    const next30 = Math.max(0, Math.ceil((30000 - nightSpawnInterval30s)/1000));
    const next60 = Math.max(0, Math.ceil((60000 - nightBossInterval60s)/1000));
    ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(canvas.width-175, 5, 170, 50);
    ctx.fillStyle='#ff8800'; ctx.font='bold 12px Courier New'; ctx.textAlign='left'; ctx.fillText(`🧟 +Zombie: ${next30}s`, canvas.width-170, 22);
    ctx.fillStyle='#ff0000'; ctx.fillText(`💀 Boss: ${next60}s`, canvas.width-170, 42);
    const mult = getDifficultyMultiplier(); ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(canvas.width-175, 60, 170, 22); ctx.fillStyle= mult >= 2 ? '#ff4444' : mult >= 1.5 ? '#ff8800' : '#ffcc00'; ctx.fillText(`⚠ Mức Nguy: x${mult.toFixed(1)}`, canvas.width-170, 75);
  }
}

function gameLoop(){update();draw();requestAnimationFrame(gameLoop);}

// ═══ SECTION 19: EVENT LISTENERS & INPUT HANDLING ════════════════
canvas.addEventListener('contextmenu', e => { e.preventDefault(); if (selectedCraft) { selectedCraft = null; document.querySelectorAll('.craft-btn').forEach(b => b.style.outline = 'none'); } });

function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  mouseX = (clientX - rect.left) * (canvas.width / rect.width);
  mouseY = (clientY - rect.top) * (canvas.height / rect.height);
}
canvas.addEventListener('mousemove', getMousePos);
canvas.addEventListener('touchmove', getMousePos, {passive: false});

function handleInteraction(e) {
  if (e.type === 'mousedown' && e.button !== 0) return;
  if(e.cancelable && e.type === 'touchstart') e.preventDefault();
  getMousePos(e);
  if (selectedCraft) { const gx = Math.floor(mouseX / GRID) * GRID, gy = Math.floor(mouseY / GRID) * GRID; tryPlaceStructure(gx, gy); return; }
  for(const s of structures){ if(mouseX>s.x&&mouseX<s.x+s.width&&mouseY>s.y&&mouseY<s.y+s.height){ structures.forEach(st=>st.selected=false); s.selected=true; selectedStructure=s; refreshStructPanel(); return; } }
  if(mouseX>shelter.x&&mouseX<shelter.x+shelter.width&&mouseY>shelter.y&&mouseY<shelter.y+shelter.height){ return; }
  structures.forEach(st=>st.selected=false); selectedStructure=null; refreshStructPanel(); player.startSwing(mouseX, mouseY); 
}
canvas.addEventListener('mousedown', handleInteraction);
canvas.addEventListener('touchstart', handleInteraction, {passive: false});
window.addEventListener('keydown',e=>{
  keys[e.key]=true; if(e.key===' ')e.preventDefault();
  if(e.key==='1') setTool('sword'); if(e.key==='2') setTool('axe'); if(e.key==='3') setTool('pickaxe');
  if(e.key==='Escape'){selectedCraft=null;document.querySelectorAll('.craft-btn').forEach(b=>b.style.outline='none');}
});
window.addEventListener('keyup',e=>{keys[e.key]=false;});

// ═══ SECTION 20: INITIALIZATION & START GAME ══════════════════════
function startGame(){
  const menu = document.getElementById('mainMenu'); if(menu) menu.classList.add('hidden');
  if(!survivalStartTime) survivalStartTime = Date.now();
  gameActive = true; refreshCraftBtns(); updateUI();
}

spawnAnimals(4); spawnResourceNodes('tree', 7); spawnResourceNodes('rock', 4); spawnResourceNodes('ore', 2);
refreshCraftBtns(); updateUI(); gameLoop();