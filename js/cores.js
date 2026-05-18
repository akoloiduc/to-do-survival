// ════════════════════════════════════════════════════════════════════════════
// 🎯 SURVIVAL GAME - CORES SYSTEM (Lõi - Tương tự TFT)
// ════════════════════════════════════════════════════════════════════════════

// Tất cả 8 Cores có sẵn
const ALL_CORES = [
  {
    id: 'resource_boost',
    name: '💎 Thu Hoạch Phong Phú',
    description: 'Tăng 50% tỷ lệ xuất hiện của các tài nguyên',
    icon: '💎',
    apply: () => {
      if (coreModifiers) coreModifiers.resourceDropRate = 1.5;
    }
  },
  {
    id: 'hunger_reduction',
    name: '🍖 Ăn Ít Hơn',
    description: 'Giảm độ hao đói xuống một nửa',
    icon: '🍖',
    apply: () => {
      if (coreModifiers) coreModifiers.hungerModifier = 0.5;
    }
  },
  {
    id: 'damage_boost',
    name: '⚔️ Chiến Binh Hung Ác',
    description: 'Tăng sát thương lên quái +50%, giảm sát thương nhận vào -30%',
    icon: '⚔️',
    apply: () => {
      if (coreModifiers) {
        coreModifiers.playerDamageMultiplier = 1.5;
        coreModifiers.damageReduction = 0.7;
      }
    }
  },
  {
    id: 'crafting_discount',
    name: '🔧 Kỹ Thuật Viên',
    description: 'Giảm 50% yêu cầu nguyên liệu cho công trình, vũ khí và công cụ',
    icon: '🔧',
    apply: () => {
      if (coreModifiers) coreModifiers.craftingCostMultiplier = 0.5;
    }
  },
  {
    id: 'house_level_3',
    name: '🏰 Nhà Cao Vút',
    description: 'Khởi đầu với nhà cấp 3',
    icon: '🏰',
    apply: () => {
      if (coreModifiers) coreModifiers.startHouseLevel = 3;
    }
  },
  {
    id: 'loot_increase',
    name: '🎁 Nhặt Được Nhiều',
    description: 'Quái và Boss tỷ lệ rơi đồ tăng 100%',
    icon: '🎁',
    apply: () => {
      if (coreModifiers) coreModifiers.lootDropRate = 2.0;
    }
  },
  {
    id: 'starter_resources',
    name: '📦 Nhập Khẩu Ban Đầu',
    description: 'Khởi đầu với 100 gỗ, 50 đá, 50 kim loại',
    icon: '📦',
    apply: () => {
      if (coreModifiers) coreModifiers.startResources = { wood: 100, stone: 50, metal: 50 };
    }
  },
  {
    id: 'tier2_start',
    name: '🎖️ Kế Thừa Di Sản',
    description: 'Khởi đầu với nhà và vũ khí và công cụ cấp 2',
    icon: '🎖️',
    apply: () => {
      if (coreModifiers) {
        coreModifiers.startHouseLevel = 2;
        coreModifiers.startToolsLevel = 2;
      }
    }
  }
];

// Lớp quản lý Core Selection
class CoreSelector {
  constructor() {
    this.availableCores = [];
    this.selectedCore = null;
    this.rerollCount = 0;
  }

  // Lấy 3 cores random lần đầu (reset rerollCount)
  generateOptions() {
    this.selectedCore = null;
    this.rerollCount = 0;
    this._shuffle();
    return this.availableCores;
  }

  // Shuffle nội bộ không reset count
  _shuffle() {
    const shuffled = [...ALL_CORES].sort(() => Math.random() - 0.5);
    this.availableCores = shuffled.slice(0, 3);
  }

  // Reroll - lấy 3 cores khác (tối đa 6 lần)
  canReroll() {
    return this.rerollCount < 6;
  }

  getRollsLeft() {
    return 6 - this.rerollCount;
  }

  reroll() {
    if (!this.canReroll()) return false;
    this.rerollCount++;
    this.selectedCore = null;
    this._shuffle();
    return true;
  }

  // Chọn một core
  select(coreId) {
    this.selectedCore = ALL_CORES.find(c => c.id === coreId);
    return this.selectedCore;
  }

  // Lấy core được chọn
  getSelected() {
    return this.selectedCore;
  }
}

// Tạo global core selector
let coreSelector = new CoreSelector();