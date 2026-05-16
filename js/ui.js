function selectCraft(type) { selectedCraft = type; document.querySelectorAll('.craft-btn').forEach(b => b.style.outline = 'none'); const btn = document.getElementById('craft-' + type); if (btn) btn.style.outline = '2px solid #00ff88'; }

function tryPlaceStructure(gx, gy) {
  if (!selectedCraft) return false; const def = SDEFS[selectedCraft];
  if (gx < 0 || gx + def.w > canvas.width || gy < 0 || gy + def.h > canvas.height) return false;
  if (gx < shelter.x + shelter.width && gx + def.w > shelter.x && gy < shelter.y + shelter.height && gy + def.h > shelter.y) return false;
  for (let s of structures) if (gx < s.x + s.width && gx + def.w > s.x && gy < s.y + s.height && gy + def.h > s.y) return false;
  if (gx < player.x + player.width && gx + def.w > player.x && gy < player.y + player.height && gy + def.h > player.y) return false;
  const raw = def.cost(1); const c = adjustCost(raw);
  if (playerResources.wood < (c.wood || 0) || playerResources.stone < (c.stone || 0) || playerResources.metal < (c.metal || 0)) { spawnText(gx + 20, gy, "Thiếu Khoáng!", "#ff3333"); return false; }
  if (c.wood) playerResources.wood -= c.wood; if (c.stone) playerResources.stone -= c.stone; if (c.metal) playerResources.metal -= c.metal;
  structures.push(new Structure(selectedCraft, gx, gy)); score += 10; spawnParticles(gx + def.w / 2, gy + def.h / 2, '#00ffaa', 25);
  selectedCraft = null; document.querySelectorAll('.craft-btn').forEach(b => b.style.outline = 'none'); refreshStructPanel(); updateUI(); return true;
}

function setTool(tool) { currentTool = tool; document.querySelectorAll('.tslot').forEach(el => el.classList.remove('active')); document.getElementById('slot-' + tool).classList.add('active'); spawnText(player.x + 10, player.y - 10, `${tool === 'sword' ? 'KIẾM' : tool === 'axe' ? 'RÌU' : 'CÚP'}`, "#fff"); }

function refreshStructPanel() {
  const div = document.getElementById('structureUpgradeButtons'); div.innerHTML = '';
  if (!selectedStructure) { div.innerHTML = '<span style="color:#777;font-size:12px;display:block;text-align:center;">Chạm CT trên map để Nâng Cấp</span>'; return; }
  const s = selectedStructure, def = SDEFS[s.type];
  const h = document.createElement('div'); h.style.cssText = 'font-size:13px;color:#ffcc44;margin-bottom:6px;text-align:center;width:100%;font-weight:bold;'; h.textContent = def.icon + ' ' + def.name + ' Lv' + s.level; div.appendChild(h);
  if (s.level >= shelter.level) { const m = document.createElement('span'); m.className = 'craft-btn no'; m.innerHTML = `🔒 Lv${s.level}<br><span style="color:#ff4444;font-weight:normal;">Cần Nhà Lv${s.level + 1}</span>`; div.appendChild(m); return; }
  const raw = def.cost(s.level); const cost = adjustCost(raw); const cs = [cost.wood ? '🪵' + cost.wood : '', cost.stone ? '🪨' + cost.stone : '', cost.metal ? '⚙️' + cost.metal : ''].filter(Boolean).join(' ');
  const can = playerResources.wood >= (cost.wood || 0) && playerResources.stone >= (cost.stone || 0) && playerResources.metal >= (cost.metal || 0);
  const btn = document.createElement('button'); btn.className = 'craft-btn ' + (can ? 'ok' : 'no'); btn.innerHTML = '⬆ Nâng Cấp Lv' + (s.level + 1) + '<br><span style="color:#aaa;font-weight:normal;">' + cs + '</span>';
  btn.onclick = () => { if (s.upgrade()) refreshStructPanel(); updateUI(); }; div.appendChild(btn);
}

function refreshCraftBtns() {
  refreshShelterBtns();
  for (const type of ['crossbow', 'wall_s', 'foodproc']) {
    const def = SDEFS[type], btn = document.getElementById('craft-' + type); if (!btn) continue;
    const raw = def.cost(1); const c = adjustCost(raw);
    const can = playerResources.wood >= (c.wood || 0) && playerResources.stone >= (c.stone || 0) && playerResources.metal >= (c.metal || 0);
    const hasOutline = btn.style.outline; btn.className = 'craft-btn ' + (can ? 'ok' : 'no'); if (hasOutline) btn.style.outline = hasOutline;
  }
  for (const type of ['sword', 'axe', 'pickaxe']) {
    const upg = playerUpgs[type]; const btn = document.getElementById('craft-' + type); if (!btn) continue;
    if (upg.level >= shelter.level) { btn.className = 'craft-btn no'; btn.innerHTML = `🔒 ${upg.label} Lv${upg.level}<br><span style="color:#ff4444;font-weight:normal;">Cần Nhà Lv${upg.level + 1}</span>`; }
    else {
      const raw = upg.cost(upg.level); const c = adjustCost(raw); const can = playerResources.wood >= (c.wood || 0) && playerResources.stone >= (c.stone || 0) && playerResources.metal >= (c.metal || 0);
      btn.className = 'craft-btn ' + (can ? 'ok' : 'no'); const cs = [c.wood ? 'Gỗ:' + c.wood : '', c.stone ? 'Đá:' + c.stone : '', c.metal ? 'Kim:' + c.metal : ''].filter(Boolean).join(' ');
      btn.innerHTML = `${type === 'sword' ? '🗡' : type === 'axe' ? '🪓' : '⛏'} Nâng ${upg.label} Lv${upg.level + 1}<br><span style="color:${can ? '#00ff88' : '#888'};font-weight:normal;">${cs}</span>`;
    }
  }
}

function updateUI() {
  const pct = v => Math.max(0, Math.min(100, v * 100)) + '%';
  document.getElementById('healthFill').style.width = pct(player.health / player.maxHealth); document.getElementById('hungerFill').style.width = pct(player.hunger / player.maxHunger); document.getElementById('energyFill').style.width = pct(player.energy / player.maxEnergy);
  document.getElementById('healthValue').textContent = Math.ceil(player.health); document.getElementById('hungerValue').textContent = Math.ceil(player.hunger); document.getElementById('energyValue').textContent = Math.ceil(player.energy);
  document.getElementById('waveInfo').textContent = 'SÓNG: ' + wave; document.getElementById('zombieCount').textContent = 'ZOMBIE: ' + zombies.length;
  document.getElementById('woodCount').textContent = playerResources.wood; document.getElementById('stoneCount').textContent = playerResources.stone; document.getElementById('metalCount').textContent = playerResources.metal;
  document.getElementById('meatCount').textContent = playerResources.meat; document.getElementById('shelterHealth').textContent = 'NHÀ Lv' + shelter.level + ': ' + Math.ceil(shelter.health) + '/' + shelter.maxHealth;
  const timerEl = document.getElementById('survivalTimer'); timerEl.textContent = getSurvivalDisplay();
  const diffMult = getDifficultyMultiplier(); if (diffMult >= 2.0) timerEl.classList.add('danger'); else timerEl.classList.remove('danger');
  refreshCraftBtns(); if (selectedStructure) refreshStructPanel();
}

function showGameOver(msg) {
  document.getElementById('gameOverMsg').textContent = msg;
  document.getElementById('finalScore').textContent = 'Sinh Tồn Tới Sóng: ' + wave + ' | Điểm: ' + score;
  document.getElementById('finalTime').textContent = 'Thời Gian Sinh Tồn: ' + getSurvivalDisplay().replace('⏱ ', '');
  document.getElementById('gameOver').classList.remove('hidden');
}