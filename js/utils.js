function getSurvivalSeconds() { 
  if (!survivalStartTime) return 0;
  return Math.floor((Date.now() - survivalStartTime) / 1000); 
}

function getSurvivalDisplay() {
  if (!survivalStartTime) return '⏱ --:--';
  const s = getSurvivalSeconds();
  const m = Math.floor(s / 60), sec = s % 60;
  return `⏱ ${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function getDifficultyMultiplier() {
  const minutes = getSurvivalSeconds() / 60;
  return 1 + minutes * 0.08;
}

function drawShadow(x, y, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; 
  ctx.beginPath(); 
  ctx.ellipse(x + w / 2, y + h - 2, w / 1.5, h / 4, 0, 0, Math.PI * 2); 
  ctx.fill();
}

function spawnText(x, y, txt, col) { 
  floatingTexts.push(new FloatingText(x, y, txt, col)); 
}

function spawnParticles(x, y, col, n = 6, isBlood = false) {
  for (let i = 0; i < n; i++) particles.push(new Particle(x, y, col, isBlood));
}

// --- Hiệu ứng chữ và hạt ---
class FloatingText {
  constructor(x, y, text, color) { this.x = x + (Math.random() - 0.5) * 15; this.y = y; this.text = text; this.color = color; this.life = 45; this.maxLife = 45; this.vy = -1.5 - Math.random(); }
  update() { this.y += this.vy; this.life--; }
  draw() { ctx.save(); ctx.globalAlpha = Math.max(0, this.life / this.maxLife); ctx.font = "bold 14px 'Courier New', monospace"; ctx.textAlign = "center"; ctx.fillStyle = "#000"; ctx.fillText(this.text, this.x + 1, this.y + 1); ctx.fillText(this.text, this.x - 1, this.y - 1); ctx.fillStyle = this.color; ctx.fillText(this.text, this.x, this.y); ctx.restore(); }
}

class Particle {
  constructor(x, y, col, isBlood = false) { this.x = x; this.y = y; this.color = col; this.life = 20 + Math.random() * 15; this.maxLife = this.life; this.vx = (Math.random() - .5) * 8; this.vy = (Math.random() - .5) * 8 - 2; this.groundY = y + 10 + Math.random() * 10; this.size = isBlood ? 3 + Math.random() * 2 : 4; }
  update() { this.x += this.vx; this.y += this.vy; this.vy += 0.6; if (this.y >= this.groundY) { this.y = this.groundY; this.vy *= -0.4; this.vx *= 0.5; } this.life--; }
  draw() { ctx.globalAlpha = this.life / this.maxLife; ctx.fillStyle = this.color; ctx.fillRect(this.x, this.y, this.size, this.size); ctx.globalAlpha = 1; }
}