// === ĐẠN NỎ ===
class Bullet {
  constructor(x, y, target, dmg) { this.x = x; this.y = y; this.target = target; this.dmg = dmg; this.speed = 10; this.life = 100; this.maxLife = 100; this.dead = false; }
  update() {
    if (this.dead) { this.life = 0; return; }
    if (!this.target || this.target.health <= 0) { this.dead = true; this.life = 0; return; }
    const dx = this.target.x + this.target.width / 2 - this.x;
    const dy = this.target.y + this.target.height / 2 - this.y;
    const d = Math.hypot(dx, dy) || 1;
    this.x += (dx / d) * this.speed; this.y += (dy / d) * this.speed; this.life--;
    if (d < 15) { if (this.target.takeDamage(this.dmg)) zombieDeath(this.target); this.dead = true; this.life = 0; }
    if (this.life <= 0) { this.dead = true; this.life = 0; }
  }
  draw() { if (this.dead) return; ctx.fillStyle = '#ffcc00'; ctx.fillRect(this.x - 3, this.y - 3, 6, 6); ctx.fillStyle = '#fff'; ctx.fillRect(this.x - 1, this.y - 1, 2, 2); }
}

// === THỨC ĂN RƠI ===
class MeatItem {
  constructor(x, y) { this.x = x; this.y = y; this.w = 16; this.h = 14; this.oy = y; this.life = 1200; }
  update() { this.life--; }
  draw() {
    const bob = Math.sin(frameCount * 0.15) * 3; drawShadow(this.x, this.oy + 10, this.w, this.h / 2);
    ctx.fillStyle = '#cc3333'; ctx.fillRect(this.x, this.oy + bob, this.w, this.h);
    ctx.fillStyle = '#ff6666'; ctx.fillRect(this.x + 2, this.oy + bob + 2, 8, 4);
    ctx.fillStyle = '#ffaaaa'; ctx.fillRect(this.x + 4, this.oy + bob + 3, 4, 2);
    ctx.strokeStyle = '#880000'; ctx.lineWidth = 2; ctx.strokeRect(this.x, this.oy + bob, this.w, this.h);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 9px Courier New'; ctx.textAlign = 'center'; ctx.fillText('🥩', this.x + this.w / 2, this.oy + bob - 2);
  }
  col(r) { return this.x < r.x + (r.width || r.w || 0) && this.x + this.w > r.x && this.y < r.y + (r.height || r.h || 0) && this.y + this.h > r.y; }
}

class CookedFood {
  constructor(x, y) { this.x = x; this.y = y; this.w = 14; this.h = 14; this.oy = y; this.hungerRestore = 30; }
  draw() {
    const bob = Math.sin(frameCount * 0.2) * 3; drawShadow(this.x, this.oy + 8, this.w, this.h / 2);
    ctx.fillStyle = '#ff8800'; ctx.fillRect(this.x, this.oy + bob, this.w, this.h);
    ctx.fillStyle = '#ffcc44'; ctx.fillRect(this.x + 3, this.oy + bob + 2, 8, 5);
    ctx.fillStyle = '#fff8'; ctx.fillRect(this.x + 3, this.oy + bob + 2, 4, 2);
    ctx.strokeStyle = '#cc5500'; ctx.lineWidth = 2; ctx.strokeRect(this.x, this.oy + bob, this.w, this.h);
  }
  col(r) { return this.x < r.x + (r.width || r.w || 0) && this.x + this.w > r.x && this.y < r.y + (r.height || r.h || 0) && this.y + this.h > r.y; }
}

// === KHAI THÁC TÀI NGUYÊN ===
class ResourceNode {
  constructor(x, y, type) { this.x = x; this.y = y; this.type = type; this.w = 32; this.h = 32; this.hp = type === 'tree' ? 30 : type === 'rock' ? 40 : 50; this.maxHp = this.hp; this.hitTimer = 0; }
  get width() { return this.w; } get height() { return this.h; }
  draw() {
    if (this.hitTimer > 0) this.hitTimer--; drawShadow(this.x, this.y, this.w, this.h);
    if (this.hitTimer > 0) { ctx.fillStyle = '#fff'; ctx.fillRect(this.x, this.y, this.w, this.h); }
    else {
      if (this.type === 'tree') { ctx.fillStyle = '#5c4033'; ctx.fillRect(this.x + 12, this.y + 10, 8, 22); ctx.fillStyle = '#1e5e2f'; ctx.beginPath(); ctx.arc(this.x + 16, this.y + 10, 16, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#277c3d'; ctx.beginPath(); ctx.arc(this.x + 10, this.y + 4, 12, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#32cd32'; ctx.beginPath(); ctx.arc(this.x + 22, this.y + 6, 10, 0, Math.PI * 2); ctx.fill(); }
      else if (this.type === 'rock') { ctx.fillStyle = '#555'; ctx.beginPath(); ctx.moveTo(this.x + 4, this.y + 28); ctx.lineTo(this.x + 10, this.y + 4); ctx.lineTo(this.x + 28, this.y+10); ctx.lineTo(this.x + 28, this.y + 28); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#888'; ctx.beginPath(); ctx.moveTo(this.x + 10, this.y + 4); ctx.lineTo(this.x + 18, this.y + 12); ctx.lineTo(this.x + 8, this.y + 20); ctx.fill(); }
      else if (this.type === 'ore') { ctx.fillStyle = '#333'; ctx.beginPath(); ctx.moveTo(this.x + 4, this.y + 28); ctx.lineTo(this.x + 10, this.y + 4); ctx.lineTo(this.x + 28, this.y + 10); ctx.lineTo(this.x + 28, this.y + 28); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#00ffff'; ctx.fillRect(this.x + 8, this.y + 8, 6, 6); ctx.fillRect(this.x + 20, this.y + 20, 6, 6); }
    }
    if (this.hp < this.maxHp) { ctx.fillStyle = '#000'; ctx.fillRect(this.x, this.y - 8, this.w, 6); ctx.fillStyle = '#ffcc00'; ctx.fillRect(this.x + 1, this.y - 7, (this.w - 2) * (this.hp / this.maxHp), 4); }
  }
  takeDamage(amt) {
    this.hp -= amt; this.hitTimer = 5; const col = this.type === 'tree' ? '#8B4513' : this.type === 'rock' ? '#888' : '#00ffff';
    spawnParticles(this.x + 16, this.y + 16, col, 6); spawnText(this.x + 16, this.y, `-${Math.ceil(amt)}`, "#fff");
    if (this.hp <= 0) {
      if (this.type === 'tree') { const amount = Math.ceil(8 * coreModifiers.resourceDropRate); playerResources.wood += amount; spawnParticles(this.x + 16, this.y + 16, '#8B4513', 20); spawnText(this.x + 16, this.y - 10, `+${amount} Gỗ`, "#e6994c"); }
      if (this.type === 'rock') { const amount = Math.ceil(6 * coreModifiers.resourceDropRate); playerResources.stone += amount; spawnParticles(this.x + 16, this.y + 16, '#888', 20); spawnText(this.x + 16, this.y - 10, `+${amount} Đá`, "#b3b3b3"); }
      if (this.type === 'ore') { const amount = Math.ceil(5 * coreModifiers.resourceDropRate); playerResources.metal += amount; spawnParticles(this.x + 16, this.y + 16, '#00ffff', 20); spawnText(this.x + 16, this.y - 10, `+${amount} Kim`, "#00ffff"); }
      score += 5; return true;
    } return false;
  }
}

// === ĐỘNG VẬT KHÔNG CHỦ ĐỘNG ===
class Animal {
  constructor(x, y) { this.x = x; this.y = y; this.w = 24; this.h = 24; this.hp = 30; this.maxHp = 30; this.vx = 0; this.vy = 0; this.timer = 0; this.hitTimer = 0; }
  get width() { return this.w; } get height() { return this.h; }
  update() {
    if (this.hitTimer > 0) this.hitTimer--; this.timer--;
    if (this.timer <= 0) { this.vx = (Math.random() - .5) * 2.5; this.vy = (Math.random() - .5) * 2.5; this.timer = 40 + Math.random() * 60; }
    this.x = Math.max(0, Math.min(canvas.width - this.w, this.x + this.vx)); this.y = Math.max(0, Math.min(canvas.height - this.h, this.y + this.vy));
  }
  draw() {
    drawShadow(this.x, this.y, this.w, this.h); const bob = (this.vx !== 0 || this.vy !== 0) ? Math.sin(frameCount * 0.6) * 2 : 0;
    if (this.hitTimer > 0) { ctx.fillStyle = '#fff'; ctx.fillRect(this.x, this.y + bob, this.w, this.h); }
    else {
      ctx.fillStyle = '#ffb6c1'; ctx.fillRect(this.x, this.y + bob, this.w, this.h); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeRect(this.x, this.y + bob, this.w, this.h);
      ctx.fillStyle = '#ff69b4'; ctx.fillRect(this.x + (this.vx >= 0 ? 16 : 4), this.y + bob + 8, 6, 8); ctx.fillStyle = '#000'; ctx.fillRect(this.x + (this.vx >= 0 ? 14 : 8), this.y + bob + 4, 2, 2);
      ctx.fillStyle = '#000'; ctx.fillRect(this.x + 4, this.y + this.h + bob, 4, 4); ctx.fillRect(this.x + 16, this.y + this.h - bob, 4, 4);
    }
    if (this.hp < this.maxHp) { ctx.fillStyle = '#000'; ctx.fillRect(this.x, this.y - 8, this.w, 6); ctx.fillStyle = '#0f0'; ctx.fillRect(this.x + 1, this.y - 7, (this.w - 2) * (this.hp / this.maxHp), 4); }
  }
  takeDamage(amt) {
    this.hp -= amt; spawnParticles(this.x + 12, this.y + 12, '#ff0000', 8, true); spawnText(this.x + 12, this.y, `-${Math.ceil(amt)}`, "#fff"); this.hitTimer = 5;
    if (this.hp <= 0) {
      const drops = 1 + (Math.random() < 0.5 ? 1 : 0);
      for (let d = 0; d < drops; d++) { meatItems.push(new MeatItem(this.x + (Math.random() - 0.5) * 20, this.y + (Math.random() - 0.5) * 10)); }
      spawnText(this.x + 12, this.y - 15, `🥩 x${drops}`, "#ff7777"); return true;
    } return false;
  }
}

// === KẺ ĐỊCH (ZOMBIE & BOSS) ===
class Zombie {
  constructor(x, y, diff = 1, isBoss = false) {
    this.x = x; this.y = y; this.isBoss = isBoss;
    const timeMult = getDifficultyMultiplier();
    const bossBonus = isBoss ? 4 : 1;
    this.width = isBoss ? 40 : 24; this.height = isBoss ? 40 : 24;
    this.speed = (0.45 + diff * 0.07) * (isBoss ? 0.75 : 1) * Math.sqrt(timeMult);
    this.health = (30 + diff * 7) * bossBonus * timeMult;
    this.maxHealth = this.health;
    this.damage = (2 + diff * 0.5) * bossBonus * timeMult;
    this.attackCooldown = 0; this.hitTimer = 0; this.glowAngle = 0;
    this.bossAttackTimer = 0; this.explosionVisualTimer = 0; this.explosionRadius = 120;
  }
  update() {
    if (this.hitTimer > 0) this.hitTimer--; this.glowAngle += 0.05;
    const dx = player.x - this.x, dy = player.y - this.y, d = Math.hypot(dx, dy) || 1;
    this.x += dx / d * this.speed; this.y += dy / d * this.speed;
    for (const s of structures) if (s.type === 'wall_s' && s.col(this)) s.pushOut(this);
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.isBoss) { this.bossAttackTimer++; if (this.bossAttackTimer >= 180) { this.bossAttackTimer = 0; this.createExplosion(); } }
  }
  createExplosion() {
    this.explosionVisualTimer = 30;
    spawnParticles(this.x + this.width / 2, this.y + this.height / 2, '#ff4400', 20, false);
    spawnParticles(this.x + this.width / 2, this.y + this.height / 2, '#ffaa00', 15, false);
    spawnText(this.x + this.width / 2, this.y - 20, '💥 BOOM!', '#ff6600');
    const dx = player.x + player.width / 2 - (this.x + this.width / 2);
    const dy = player.y + player.height / 2 - (this.y + this.height / 2);
    const distance = Math.hypot(dx, dy);
    if (distance < this.explosionRadius) {
      const explosionDamage = 15 * (1 - distance / this.explosionRadius);
      player.takeDamage(explosionDamage);
      spawnText(player.x + player.width / 2, player.y - 10, `-${Math.ceil(explosionDamage)} 💥`, '#ff0000');
    }
  }
  draw() {
    drawShadow(this.x, this.y, this.width, this.height); const bob = Math.sin(frameCount * 0.3 + this.x) * 2; const w = this.width, h = this.height;
    if (this.isBoss && this.explosionVisualTimer > 0) {
      const alpha = this.explosionVisualTimer / 30; ctx.globalAlpha = 0.3 * alpha; ctx.fillStyle = '#ff4400'; ctx.beginPath(); ctx.arc(this.x + w / 2, this.y + h / 2, this.explosionRadius, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.6 * alpha; ctx.strokeStyle = '#ff6600'; ctx.lineWidth = 3; ctx.stroke(); ctx.globalAlpha = 1; this.explosionVisualTimer--;
    }
    if (this.isBoss) {
      const glowR = 28 + Math.sin(this.glowAngle) * 6; const grad = ctx.createRadialGradient(this.x + w / 2, this.y + h / 2, 5, this.x + w / 2, this.y + h / 2, glowR + 10); grad.addColorStop(0, 'rgba(255,0,0,0.5)'); grad.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(this.x + w / 2, this.y + h / 2 + bob, glowR + 10, 0, Math.PI * 2); ctx.fill();
    }
    if (this.hitTimer > 0) { ctx.fillStyle = '#fff'; ctx.fillRect(this.x, this.y + bob, w, h); }
    else {
      ctx.fillStyle = this.isBoss ? '#8B0000' : '#3b5e2b'; ctx.fillRect(this.x, this.y + bob, w, h);
      ctx.strokeStyle = this.isBoss ? '#ff0000' : '#000'; ctx.lineWidth = this.isBoss ? 3 : 2; ctx.strokeRect(this.x, this.y + bob, w, h);
      if (this.isBoss) {
        ctx.fillStyle = '#ff4400'; ctx.fillRect(this.x - 4, this.y + bob + 4, w / 2 + 4, h / 2); ctx.fillRect(this.x + w / 2, this.y + bob + 4, w / 2 + 4, h / 2);
        ctx.fillStyle = '#ffcc00'; ctx.fillRect(this.x + 4, this.y + bob - 8, 6, 10); ctx.fillRect(this.x + w / 2 - 3, this.y + bob - 12, 8, 14); ctx.fillRect(this.x + w - 10, this.y + bob - 8, 6, 10);
        ctx.fillStyle = '#ff0000'; ctx.fillRect(this.x + 6, this.y + bob - 2, 4, 4); ctx.fillRect(this.x + w - 10, this.y + bob - 2, 4, 4);
        ctx.font = 'bold 18px Courier New'; ctx.textAlign = 'center'; ctx.fillStyle = '#ff0000'; ctx.fillText('💀', this.x + w / 2, this.y + bob + h / 2 + 6);
      } else {
        ctx.fillStyle = '#2c4720'; ctx.fillRect(this.x - 4, this.y + bob + 4, 6, 6); ctx.fillRect(this.x + w - 2, this.y + bob + 4, 6, 6);
        ctx.fillStyle = '#2c4720'; ctx.fillRect(this.x + 4, this.y + bob - 6, w - 8, h - 8); ctx.strokeRect(this.x + 4, this.y + bob - 6, w - 8, h - 8);
        ctx.fillStyle = '#ff0000'; ctx.fillRect(this.x + 6, this.y + bob - 4, 3, 3); ctx.fillRect(this.x + 15, this.y + bob - 4, 3, 3);
      }
    }
    const hpW = this.isBoss ? 60 : this.width; const hpX = this.x + (this.isBoss ? (this.width - hpW) / 2 : 0);
    ctx.fillStyle = '#000'; ctx.fillRect(hpX, this.y - 12, hpW, this.isBoss ? 8 : 6); ctx.fillStyle = this.isBoss ? '#ff6600' : '#f00'; ctx.fillRect(hpX + 1, this.y - 11, (hpW - 2) * (this.health / this.maxHealth), this.isBoss ? 6 : 4);
    if (this.isBoss) { ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Courier New'; ctx.textAlign = 'center'; ctx.fillText('BOSS', this.x + this.width / 2, this.y - 14); }
  }
  col(r) { return this.x < r.x + (r.width || r.w || 0) && this.x + this.width > r.x && this.y < r.y + (r.height || r.h || 0) && this.y + this.height > r.y; }
  takeDamage(a) { this.health -= a; spawnParticles(this.x + this.width / 2, this.y + this.height / 2, this.isBoss ? '#ff0000' : '#880000', this.isBoss ? 12 : 8, true); spawnText(this.x + this.width / 2, this.y, `-${Math.ceil(a)}`, this.isBoss ? "#ff6600" : "#ff8800"); this.hitTimer = 5; return this.health <= 0; }
}

// === NGƯỜI CHƠI CHÍNH ===
const player = {
  x: 420, y: 260, width: 24, height: 24, speed: 3.2, sprintSpeed: 5.2,
  health: 100, maxHealth: 100, hunger: 100, maxHunger: 100, energy: 100, maxEnergy: 100,
  vx: 0, vy: 0, inShelter: false, tools: { axe: 0, pickaxe: 0 }, hitTimer: 0,
  sword: { swinging: false, angle: 0, totalSwing: 0, speed: 0.35, radius: 55, damage: 25, cooldown: 0, hitSet: new Set() },
  handleInput() {
    this.vx = 0; this.vy = 0;
    if (joyActive) { this.vx = joyDX; this.vy = joyDY; }
    else {
      if (keys['w'] || keys['W']) this.vy = -1; if (keys['s'] || keys['S']) this.vy = 1;
      if (keys['a'] || keys['A']) this.vx = -1; if (keys['d'] || keys['D']) this.vx = 1;
    }
    const sp = ((keys[' '] || mobileSprint) && this.energy > 0) ? this.sprintSpeed : this.speed;
    this.x = Math.max(0, Math.min(canvas.width - this.width, this.x + this.vx * sp));
    this.y = Math.max(0, Math.min(canvas.height - this.height, this.y + this.vy * sp));
    if ((keys[' '] || mobileSprint) && (this.vx || this.vy)) this.energy = Math.max(0, this.energy - 0.5);
  },
  update() {
    if (this.hitTimer > 0) this.hitTimer--;
    this.hunger = Math.max(0, this.hunger - 0.035 * coreModifiers.hungerModifier); this.inShelter = shelter.col(this);
    this.energy = Math.min(this.maxEnergy, this.energy + (this.inShelter ? 0.4 : 0.1));
    if (this.hunger <= 0) {
      this.health = Math.max(0, this.health - 0.15);
      if (Math.random() < 0.1) { spawnParticles(this.x + 12, this.y + 12, '#ff0000', 3, true); this.hitTimer = 5; }
      document.getElementById('healthBarWrap').classList.add('starvation-flash');
    } else document.getElementById('healthBarWrap').classList.remove('starvation-flash');
    const sw = this.sword;
    if (sw.swinging) { sw.angle += sw.speed; sw.totalSwing += sw.speed; this._hitCheckAoE(); if (sw.totalSwing >= Math.PI * 2) { sw.swinging = false; sw.cooldown = 10; sw.hitSet.clear(); } }
    if (sw.cooldown > 0) sw.cooldown--;
  },
  startSwing(mx, my) {
    const sw = this.sword; if (sw.swinging || sw.cooldown > 0) return;
    const cx = this.x + this.width / 2, cy = this.y + this.height / 2;
    sw.angle = Math.atan2(my - cy, mx - cx) - Math.PI * 0.5; sw.totalSwing = 0; sw.swinging = true; sw.hitSet.clear();
  },
  _hitCheckAoE() {
    const sw = this.sword; const cx = this.x + this.width / 2, cy = this.y + this.height / 2;
    const hitLogic = (obj, idPrefix) => {
      if (sw.hitSet.has(idPrefix)) return;
      const ocx = obj.x + (obj.width || obj.w || 0) / 2, ocy = obj.y + (obj.height || obj.h || 0) / 2;
      if (Math.hypot(ocx - cx, ocy - cy) <= sw.radius + (obj.width || obj.w || 0) / 2) {
        sw.hitSet.add(idPrefix);
        let dmg = 2;
        if (obj instanceof Zombie || obj instanceof Animal) dmg = currentTool === 'sword' ? sw.damage * coreModifiers.playerDamageMultiplier : 5;
        else if (obj instanceof ResourceNode) {
          if (obj.type === 'tree') dmg = currentTool === 'axe' ? 15 + player.tools.axe * 15 : 2;
          else if (obj.type === 'rock' || obj.type === 'ore') dmg = currentTool === 'pickaxe' ? 15 + player.tools.pickaxe * 15 : 2;
        }
        if (obj.takeDamage(dmg)) {
          if (obj instanceof Zombie) { zombieDeath(obj); }
          else if (obj instanceof Animal) { score += 5; const idx = animals.indexOf(obj); if (idx > -1) animals.splice(idx, 1); }
          else if (obj instanceof ResourceNode) { const idx = resourceNodes.indexOf(obj); if (idx > -1) resourceNodes.splice(idx, 1); }
        }
      }
    };
    zombies.forEach((z, i) => hitLogic(z, 'z' + i));
    animals.forEach((a, i) => hitLogic(a, 'a' + i));
    resourceNodes.forEach((n, i) => hitLogic(n, 'n' + i));
  },
  draw() {
    drawShadow(this.x, this.y, this.width, this.height);
    const bob = (this.vx !== 0 || this.vy !== 0) ? Math.sin(frameCount * 0.4) * 2 : 0;
    if (this.hitTimer > 0) { ctx.fillStyle = '#fff'; ctx.fillRect(this.x, this.y + bob, this.width, this.height); } else {
      ctx.fillStyle = this.inShelter ? '#1E90FF' : '#2E8B57'; ctx.fillRect(this.x, this.y + bob, this.width, this.height); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeRect(this.x, this.y + bob, this.width, this.height);
      ctx.fillStyle = '#FFE4C4'; ctx.fillRect(this.x + 4, this.y + bob - 6, this.width - 8, this.height - 8); ctx.strokeRect(this.x + 4, this.y + bob - 6, this.width - 8, this.height - 8);
      ctx.fillStyle = '#000'; ctx.fillRect(this.x + 6, this.y + bob - 2, 3, 3); ctx.fillRect(this.x + 15, this.y + bob - 2, 3, 3);
      ctx.fillStyle = '#333'; ctx.fillRect(this.x + 4, this.y + this.height + bob, 6, 4); ctx.fillRect(this.x + 14, this.y + this.height - bob, 6, 4);
    }
    this._drawWeapon(bob);
  },
  _drawWeapon(bob) {
    const sw = this.sword, cx = this.x + this.width / 2, cy = this.y + this.height / 2 + bob;
    const swordLevel = playerUpgs.sword.level; const axeLevel = playerUpgs.axe.level; const pickaxeLevel = playerUpgs.pickaxe.level;
    const getGlowColor = (tool) => {
      if (tool === 'sword') { return swordLevel >= 3 ? ['#00ffff', '#0088ff'] : swordLevel >= 2 ? ['#00ddff', '#0066ff'] : ['#00aaff', '#0044ff']; }
      else if (tool === 'axe') { return axeLevel >= 3 ? ['#ffaa00', '#ff6600'] : axeLevel >= 2 ? ['#ff9900', '#ff5500'] : ['#ff8800', '#ff4400']; }
      else { return pickaxeLevel >= 3 ? ['#aaaaff', '#6666ff'] : pickaxeLevel >= 2 ? ['#9999ff', '#5555ff'] : ['#aaaaaa', '#777777']; }
    };
    if (sw.swinging) {
      ctx.beginPath(); ctx.arc(cx, cy, sw.radius * 0.8, sw.angle - 0.5, sw.angle + 0.5);
      const [glowColor] = getGlowColor(currentTool); ctx.lineWidth = 14; ctx.strokeStyle = glowColor; ctx.lineCap = 'round'; ctx.stroke();
      const tipX = cx + Math.cos(sw.angle) * sw.radius, tipY = cy + Math.sin(sw.angle) * sw.radius;
      if (currentTool === 'sword') { ctx.strokeStyle = glowColor; ctx.lineWidth = 6 + (swordLevel - 1) * 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tipX, tipY); ctx.stroke(); if (swordLevel >= 2) { ctx.strokeStyle = 'rgba(0,200,255,0.4)'; ctx.lineWidth = 10 + (swordLevel - 1) * 2; ctx.stroke(); } }
      else if (currentTool === 'axe') { ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tipX, tipY); ctx.stroke(); ctx.fillStyle = glowColor; const axeSize = 10 + (axeLevel - 1) * 2; ctx.fillRect(tipX - axeSize / 2, tipY - axeSize / 2, axeSize, axeSize); if (axeLevel >= 3) { ctx.strokeStyle = 'rgba(255,150,0,0.5)'; ctx.lineWidth = 3; ctx.strokeRect(tipX - axeSize / 2 - 2, tipY - axeSize / 2 - 2, axeSize + 4, axeSize + 4); } }
      else if (currentTool === 'pickaxe') { ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tipX, tipY); ctx.stroke(); ctx.strokeStyle = glowColor; ctx.lineWidth = 8 + (pickaxeLevel - 1) * 1; ctx.beginPath(); ctx.arc(tipX, tipY, 12 + (pickaxeLevel - 1) * 2, sw.angle - 0.8, sw.angle + 0.8); ctx.stroke(); }
    } else if (sw.cooldown === 0) {
      const ia = Math.PI * 0.25; const tipX = cx + Math.cos(ia) * 18, tipY = cy + Math.sin(ia) * 18;
      const [glowColor] = getGlowColor(currentTool); ctx.strokeStyle = glowColor; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tipX, tipY); ctx.stroke();
      if (currentTool === 'axe') { ctx.fillStyle = glowColor; const axeSize = 8 + (axeLevel - 1) * 1; ctx.fillRect(tipX - axeSize / 2, tipY - axeSize / 2, axeSize, axeSize); }
      if (currentTool === 'pickaxe') { ctx.strokeStyle = glowColor; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(tipX, tipY, 8 + (pickaxeLevel - 1) * 1, ia - 0.8, ia + 0.8); ctx.stroke(); }
    }
  },
  takeDamage(a) { this.health = Math.max(0, this.health - a * coreModifiers.damageReduction); spawnParticles(this.x + 12, this.y + 12, '#ff0000', 10, true); spawnText(this.x + 12, this.y, `-${Math.ceil(a * coreModifiers.damageReduction)}`, "#ff4444"); this.hitTimer = 5; },
  eatCooked(cf) { if (this.hunger >= this.maxHunger - 5) { const hpGain = 20; this.health = Math.min(this.maxHealth, this.health + hpGain); spawnParticles(cf.x, cf.y, '#ff4444', 8); spawnText(this.x + 12, this.y, `+${hpGain} HP`, "#ff6666"); } else { this.hunger = Math.min(this.maxHunger, this.hunger + cf.hungerRestore); spawnParticles(cf.x, cf.y, '#ff9900', 8); spawnText(this.x + 12, this.y, `+${cf.hungerRestore} ĐÓI`, "#ff9900"); } },
  pickupMeat(m) { playerResources.meat++; spawnParticles(m.x, m.y, '#cc3333', 8); spawnText(m.x + 8, m.y - 5, "+1 Thịt", "#ff7777"); }
};

// --- Hệ thống xử lý Logic chết ---
function zombieDeath(z) {
  score += z.isBoss ? 50 : 10; const dropChance = z.isBoss ? 1.0 : 0.35;
  if (Math.random() < dropChance) {
    if (z.isBoss) {
      const loots = [{ type: 'wood', min: 5, max: 10, icon: '🪵', color: '#e6994c' }, { type: 'stone', min: 5, max: 10, icon: '🪨', color: '#b3b3b3' }, { type: 'metal', min: 3, max: 7, icon: '⚙️', color: '#66e0ff' }];
      const selected = loots.sort(() => 0.5 - Math.random()).slice(0, 2);
      selected.forEach(loot => { const amount = Math.floor(Math.random() * (loot.max - loot.min + 1)) + loot.min; playerResources[loot.type] += amount; spawnText(z.x + z.width / 2, z.y - 5, `+${amount} ${loot.icon}`, loot.color); });
      const meatCount = 2 + Math.floor(Math.random() * 2); for (let i = 0; i < meatCount; i++) { meatItems.push(new MeatItem(z.x + Math.random() * z.width, z.y + Math.random() * z.height)); }
      spawnText(z.x + z.width / 2, z.y + z.height / 2, `+${meatCount} 🥩`, '#ff7777');
    } else {
      const lootType = Math.random();
      if (lootType < 0.25) { const amount = 1 + Math.floor(Math.random() * 3); playerResources.wood += amount; spawnText(z.x + z.width / 2, z.y - 5, `+${amount} 🪵`, '#e6994c'); }
      else if (lootType < 0.5) { const amount = 1 + Math.floor(Math.random() * 3); playerResources.stone += amount; spawnText(z.x + z.width / 2, z.y - 5, `+${amount} 🪨`, '#b3b3b3'); }
      else if (lootType < 0.75) { const amount = 1 + Math.floor(Math.random() * 2); playerResources.metal += amount; spawnText(z.x + z.width / 2, z.y - 5, `+${amount} ⚙️`, '#66e0ff'); }
      else { meatItems.push(new MeatItem(z.x + z.width / 2, z.y + z.height / 2)); spawnText(z.x + z.width / 2, z.y - 5, `+1 🥩`, '#ff7777'); }
    }
  }
  spawnParticles(z.x + z.width / 2, z.y + z.height / 2, z.isBoss ? '#ff0000' : '#880000', z.isBoss ? 20 : 10, true);
  const idx = zombies.indexOf(z); if (idx >= 0) zombies.splice(idx, 1);
}