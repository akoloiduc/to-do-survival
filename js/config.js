// === SETUP & INITIALIZATION ===
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) { 
  document.body.classList.add('is-mobile'); 
}
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800; 
canvas.height = 520; 
const GRID = 40;

// === GAME STATE & VARIABLES ===
let meatItems = [], cookedFoods = [], zombies = [], animals = [], resourceNodes = [], structures = [], particles = [], floatingTexts = [], mapDecor = [];
let playerResources = { wood: 0, stone: 0, metal: 0, meat: 0 };

// Cân bằng tài nguyên: Giảm chi phí kim loại xuống 50%
const METAL_COST_FACTOR = 0.5; 
function adjustCost(raw) {
  if (!raw) return { wood: 0, stone: 0, metal: 0 };
  return {
    wood: raw.wood || 0,
    stone: raw.stone || 0,
    metal: Math.max(0, Math.floor((raw.metal || 0) * METAL_COST_FACTOR))
  };
}

let wave = 1, score = 0, gameActive = true, keys = {};
let lastIsNight = false, spawnTimer = 0, frameCount = 0;
let selectedCraft = null, selectedStructure = null;
let currentTool = 'sword';
let mouseX = 0, mouseY = 0;
let survivalStartTime = null;

let nightSpawnInterval30s = 0;
let nightBossInterval60s = 0;
let bossAlertTimer = 0;
let nightsPassed = 0; 
let lastUpdateTime = Date.now();

// Tạo vật trang trí nền bản đồ
for (let i = 0; i < 80; i++) {
  mapDecor.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, type: Math.random() < 0.8 ? 'grass' : 'flower' });
}

// === DAY/NIGHT CYCLE MANAGEMENT ===
let DAY_MS = 5 * 60 * 1000, NIGHT_MS = 5 * 60 * 1000 + 15 * 1000;
let CYCLE_MS = DAY_MS + NIGHT_MS;
let cycleCount = 0;

const dayNight = {
  startTime: Date.now(), isNight: false, progress: 0, lastPhase: false,
  update() {
    const e = Date.now() - this.startTime, c = e % CYCLE_MS;
    this.isNight = c >= DAY_MS; 
    this.progress = this.isNight ? (c - DAY_MS) / NIGHT_MS : c / DAY_MS;
    
    if (!this.isNight && this.lastPhase) {
      nightsPassed++; 
      if (DAY_MS > 0) {
        DAY_MS = Math.max(0, DAY_MS - 30 * 1000);
        NIGHT_MS = Math.max(0, NIGHT_MS - 30 * 1000);
        CYCLE_MS = DAY_MS + NIGHT_MS;
        cycleCount++;
        spawnText(canvas.width / 2, 120, `⏰ CHI PHÍ THỜI GIAN: Ngày/Đêm -30s (Cycle ${cycleCount})`, "#ffaa00");
      }
    }
    this.lastPhase = this.isNight;
  },
  getPhaseText() { return this.isNight ? '🌙 ĐÊM' : '☀️ NGÀY'; },
  getTimeLeft() {
    const e = Date.now() - this.startTime, c = e % CYCLE_MS; 
    const r = this.isNight ? Math.ceil((NIGHT_MS - (c - DAY_MS)) / 1000) : Math.ceil((DAY_MS - c) / 1000);
    return Math.floor(r / 60) + ':' + (r % 60).toString().padStart(2, '0');
  },
  drawOverlay() {
    if (this.isNight) { 
      const a = 0.5 + 0.2 * Math.sin(this.progress * Math.PI); 
      ctx.fillStyle = `rgba(15, 20, 45, ${a})`; 
      ctx.fillRect(0, 0, canvas.width, canvas.height); 
    }
  }
};