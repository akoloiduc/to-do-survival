// === NHÀ CHÍNH SỐNG CÒN ===
const shelter = {
  x: 80, y: 80, width: 80, height: 80, level: 1, health: 200, maxHealth: 200, damageReduction: 1.0, hasTrap: false, trapDamage: 0, hitTimer: 0,
  getTier() {
    if (this.level < 5) return { name: 'Gỗ', bg: '#5c4033', border: '#ffaa00', roof: '#A0522D' };
    if (this.level < 10) return { name: 'Đá', bg: '#666666', border: '#aaaaaa', roof: '#444444' };
    if (this.level < 15) return { name: 'Đồng', bg: '#b87333', border: '#ffcc00', roof: '#8c5222' };
    if (this.level < 20) return { name: 'Sắt', bg: '#aaaaaa', border: '#ffffff', roof: '#777777' };
    if (this.level < 25) return { name: 'Thép', bg: '#434b4d', border: '#00ccff', roof: '#222222' };
    return { name: 'Công Nghệ', bg: '#111111', border: '#00ffff', roof: '#003333' };
  },
  update() {
    if (this.hitTimer > 0) this.hitTimer--;
    for (let i = zombies.length - 1; i >= 0; i--) {
      const z = zombies[i]; if (!this.col(z)) continue; this.pushOut(z); this.health = Math.max(0, this.health - z.damage * 0.01 * this.damageReduction); this.hitTimer = 5;
      if (this.hasTrap && z.takeDamage(this.trapDamage)) zombieDeath(z);
    }
  },
  pushOut(z) { const dx = z.x + z.width / 2 - (this.x + this.width / 2), dy = z.y + z.height / 2 - (this.y + this.height / 2), d = Math.hypot(dx, dy) || 1; z.x += (dx / d) * 3; z.y += (dy / d) * 3; },
  draw() {
    drawShadow(this.x, this.y, this.width, this.height); const hp = this.health / this.maxHealth; const tier = this.getTier();
    if (this.hitTimer > 0) { ctx.fillStyle = '#fff'; ctx.fillRect(this.x, this.y, this.width, this.height); }
    else {
      ctx.fillStyle = tier.bg; ctx.fillRect(this.x, this.y, this.width, this.height); ctx.fillStyle = 'rgba(0,0,0,0.3)'; for (let i = 10; i < this.width; i += 20) { ctx.fillRect(this.x + i, this.y, 2, this.height); }
      ctx.fillStyle = tier.roof; ctx.beginPath(); ctx.moveTo(this.x, this.y + 20); ctx.lineTo(this.x + this.width / 2, this.y - 15); ctx.lineTo(this.x + this.width, this.y + 20); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = tier.border; ctx.lineWidth = 3; ctx.strokeRect(this.x, this.y, this.width, this.height); ctx.fillStyle = '#111'; ctx.fillRect(this.x + this.width / 2 - 15, this.y + this.height - 25, 30, 25); ctx.fillStyle = '#000'; ctx.fillRect(this.x + this.width / 2 - 10, this.y + this.height - 20, 8, 15); ctx.fillRect(this.x + this.width / 2 + 2, this.y + this.height - 20, 8, 15);
    }
    if (this.hasTrap) { ctx.fillStyle = '#00ffff'; for (let i = 0; i < this.width; i += 20) { ctx.beginPath(); ctx.moveTo(this.x + i, this.y + this.height); ctx.lineTo(this.x + i + 10, this.y + this.height + 10); ctx.lineTo(this.x + i + 20, this.y + this.height); ctx.fill(); } }
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Courier New'; ctx.textAlign = 'center'; ctx.fillText(`NHÀ ${tier.name.toUpperCase()}`, this.x + this.width / 2, this.y + 15);
    ctx.fillStyle = '#000'; ctx.fillRect(this.x, this.y - 8, this.width, 6); ctx.fillStyle = hp > 0.5 ? '#00ff66' : hp > 0.25 ? '#ffaa00' : '#ff3333'; ctx.fillRect(this.x + 1, this.y - 7, (this.width - 2) * hp, 4);
  },
  col(r) { return this.x < r.x + (r.width || r.w || 0) && this.x + this.width > r.x && this.y < r.y + (r.height || r.h || 0) && this.y + this.height > r.y; },
  isDestroyed() { return this.health <= 0; }
};

const shelterUpgs = {
  house:     { level: 1, cost: lv => ({ wood: lv * 20, stone: lv * 15, metal: lv * 10 }), label: '🏰 Cấp Nhà' },
  wall:      { level: 1, cost: lv => ({ wood: lv * 10 + 10, stone: lv * 10 + 10, metal: 0 }), label: '🧱 Tường' },
  foundation:{ level: 1, cost: lv => ({ wood: lv * 5 + 5, stone: lv * 15 + 15, metal: lv * 5 + 5 }), label: '🛡️ Móng' },
  trap:      { level: 1, cost: lv => ({ wood: 0, stone: lv * 10 + 10, metal: lv * 10 + 10 }), label: '⚡ Bẫy' },
};

function shelterUpgrade(type) {
  const u = shelterUpgs[type]; if (type !== 'house' && u.level >= shelter.level) { spawnText(shelter.x + shelter.width / 2, shelter.y, `Cần Nhà Lv${u.level + 1}`, "#ff3333"); return; }
  const raw = u.cost(u.level); const c = adjustCost(raw);
  if (playerResources.wood < c.wood || playerResources.stone < c.stone || playerResources.metal < c.metal) { spawnText(shelter.x + shelter.width / 2, shelter.y, "Thiếu Khoáng!", "#ff3333"); return; }
  playerResources.wood -= c.wood; playerResources.stone -= c.stone; playerResources.metal -= c.metal; u.level++;
  switch (type) {
    case 'house': shelter.level++; shelter.maxHealth += 200; shelter.health = shelter.maxHealth; player.maxHealth += 25; player.health = Math.min(player.health + 25, player.maxHealth); spawnText(player.x + 12, player.y - 30, "+25 MAX HP!", "#ff6666"); break;
    case 'wall': shelter.maxHealth += 150; shelter.health = shelter.maxHealth; break;
    case 'foundation': shelter.damageReduction = Math.max(0.1, shelter.damageReduction - 0.1); break;
    case 'trap': shelter.hasTrap = true; shelter.trapDamage += 0.2; break;
  }
  score += 20; spawnParticles(shelter.x + shelter.width / 2, shelter.y + shelter.height / 2, '#00ff88', 20); spawnText(shelter.x + shelter.width / 2, shelter.y - 15, `ĐÃ NÂNG CẤP!`, "#ffcc00"); updateUI();
}

// === CÔNG TRÌNH XÂY DỰNG PHÒNG THỦ ===
const SDEFS = {
  crossbow: { name: 'Máy Nỏ', icon: '🏹', w: 40, h: 40, cost: lv => ({ wood: lv * 10 + 5, stone: 0, metal: lv * 8 + 2 }), color: '#4a2e15', border: '#cc6600', maxLv: 3 },
  wall_s:   { name: 'Tường', icon: '🧱', w: 40, h: 40, cost: lv => ({ wood: lv * 8 + 2, stone: lv * 8 + 2, metal: 0 }), color: '#555', border: '#000', maxLv: 3 },
  foodproc: { name: 'Bếp Lò', icon: '🍳', w: 40, h: 40, cost: lv => ({ wood: lv * 6 + 4, stone: 0, metal: lv * 5 + 3 }), color: '#222', border: '#00ff66', maxLv: 3 },
};

class Structure {
  constructor(type, x, y) {
    const d = SDEFS[type]; this.type = type; this.x = x; this.y = y; this.width = d.w; this.height = d.h; this.level = 1; this.maxLevel = d.maxLv; this.selected = false; this.hitTimer = 0;
    if (type === 'crossbow') { this.shootInterval = 160; this.bulletDamage = 25; this.range = 180; this.timer = 0; }
    if (type === 'wall_s') { this.health = 300; this.maxHealth = 300; }
    if (type === 'foodproc') { this.foodInterval = 400; this.timer = 0; this.noMeatFlash = 0; }
  }
  update() {
    if (this.hitTimer > 0) this.hitTimer--;
    if (this.type === 'crossbow') { this.timer++; if (this.timer >= this.shootInterval) { this.timer = 0; this._shoot(); } }
    if (this.type === 'foodproc') {
      if (this.noMeatFlash > 0) this.noMeatFlash--; this.timer++;
      if (this.timer >= this.foodInterval) {
        this.timer = 0;
        if (playerResources.meat > 0) { playerResources.meat--; cookedFoods.push(new CookedFood(this.x + this.width / 2 - 7, this.y + this.height + 5)); spawnParticles(this.x + this.width / 2, this.y, '#ff9900', 10); spawnText(this.x + 20, this.y - 5, "🍖 Nấu Xong!", "#ff9900"); }
        else { this.noMeatFlash = 40; spawnText(this.x + 20, this.y - 5, "Hết Thịt!", "#ff4444"); }
      }
    }
    if (this.type === 'wall_s') { for (const z of zombies) if (this.col(z)) { this.health = Math.max(0, this.health - z.damage * 0.005); this.hitTimer = 3; } }
  }
  _shoot() { const cx = this.x + this.width / 2, cy = this.y + this.height / 2; let best = null, bestD = this.range; for (const z of zombies) { const d = Math.hypot(z.x + z.width / 2 - cx, z.y + z.height / 2 - cy); if (d < bestD) { bestD = d; best = z; } } if (best) particles.push(new Bullet(cx, cy, best, this.bulletDamage)); }
  draw() {
    drawShadow(this.x, this.y, this.width, this.height); const d = SDEFS[this.type]; const cx = this.x + this.width / 2, cy = this.y + this.height / 2;
    const noMeat = this.type === 'foodproc' && this.noMeatFlash > 0 && Math.floor(this.noMeatFlash / 5) % 2 === 0;
    if (this.hitTimer > 0 || noMeat) { ctx.fillStyle = noMeat ? '#440000' : '#fff'; ctx.fillRect(this.x, this.y, this.width, this.height); }
    else {
      ctx.fillStyle = d.color; ctx.fillRect(this.x, this.y, this.width, this.height);
      if (this.type === 'wall_s') { ctx.fillStyle = '#333'; for (let i = 5; i < 40; i += 10) { ctx.fillRect(this.x, this.y + i, 40, 2); } for (let i = 10; i < 40; i += 20) { ctx.fillRect(this.x + i, this.y, 2, 40); ctx.fillRect(this.x + i + 10, this.y + 10, 2, 20); } }
      else if (this.type === 'crossbow') { ctx.fillStyle = '#111'; ctx.fillRect(cx - 10, cy - 10, 20, 20); ctx.strokeStyle = '#ccc'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI); ctx.stroke(); }
      else if (this.type === 'foodproc') { const p = this.timer / this.foodInterval; ctx.fillStyle = '#111'; ctx.fillRect(cx - 12, cy - 12, 24, 24); ctx.fillStyle = playerResources.meat > 0 ? '#ff6600' : '#440000'; ctx.fillRect(cx - 8, cy - 8, 16 * p, 16 * p); ctx.fillStyle = playerResources.meat > 0 ? '#ff7777' : '#444'; ctx.font = 'bold 10px Courier New'; ctx.textAlign = 'center'; ctx.fillText('🥩' + playerResources.meat, cx, cy+18); }
      ctx.strokeStyle = this.selected ? '#fff' : d.border; ctx.lineWidth = this.selected ? 4 : 2; ctx.strokeRect(this.x, this.y, this.width, this.height);
      if (this.type !== 'wall_s' && this.type !== 'crossbow') { ctx.fillStyle = '#fff'; ctx.font = `16px Courier New`; ctx.textAlign = 'center'; ctx.fillText(d.icon, cx, cy + 5); }
    }
    ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 11px Courier New'; ctx.textAlign = 'right'; ctx.fillText('Lv' + this.level, this.x + this.width - 4, this.y + this.height - 4);
    if (this.type === 'wall_s') { const hp = this.health / this.maxHealth; ctx.fillStyle = '#000'; ctx.fillRect(this.x, this.y - 8, this.width, 6); ctx.fillStyle = hp > 0.5 ? '#00ff66' : hp > 0.25 ? '#ffaa00' : '#ff3333'; ctx.fillRect(this.x + 1, this.y - 7, (this.width - 2) * hp, 4); }
    else if (this.type === 'foodproc') { const p = this.timer / this.foodInterval; ctx.fillStyle = '#000'; ctx.fillRect(this.x, this.y + this.height + 2, this.width, 6); ctx.fillStyle = playerResources.meat > 0 ? '#ff9900' : '#444'; ctx.fillRect(this.x + 1, this.y + this.height + 3, (this.width - 2) * p, 4); }
    if (this.type === 'crossbow' && this.selected) { ctx.strokeStyle = 'rgba(200,140,0,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, this.range, 0, Math.PI * 2); ctx.stroke(); }
  }
  pushOut(z) { const dx = z.x + z.width / 2 - (this.x + this.width / 2), dy = z.y + z.height / 2 - (this.y + this.height / 2), d = Math.hypot(dx, dy) || 1; z.x += (dx / d) * 3; z.y += (dy / d) * 3; }
  isDestroyed() { return this.type === 'wall_s' && this.health <= 0; }
  upgrade() {
    if (this.level >= shelter.level) { spawnText(this.x + 20, this.y, `Cần Nhà Lv${this.level + 1}`, "#ff3333"); return false; }
    const raw = SDEFS[this.type].cost(this.level); const cost = adjustCost(raw);
    if (playerResources.wood < (cost.wood || 0) || playerResources.stone < (cost.stone || 0) || playerResources.metal < (cost.metal || 0)) { spawnText(this.x + 20, this.y, "Thiếu Khoáng!", "#ff3333"); return false; }
    if (cost.wood) playerResources.wood -= cost.wood; if (cost.stone) playerResources.stone -= cost.stone; if (cost.metal) playerResources.metal -= cost.metal; this.level++;
    if (this.type === 'crossbow') { this.shootInterval = Math.max(55, this.shootInterval - 30); this.bulletDamage += 15; this.range += 30; }
    if (this.type === 'wall_s') { this.maxHealth += 200; this.health = this.maxHealth; }
    if (this.type === 'foodproc') { this.foodInterval = Math.max(100, this.foodInterval - 100); }
    score += 15; spawnParticles(this.x + this.width / 2, this.y + this.height / 2, '#00ff88', 25); spawnText(this.x + 20, this.y - 10, "Lên Cấp!", "#00ff88"); return true;
  }
}