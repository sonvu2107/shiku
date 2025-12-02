import mongoose from 'mongoose';
const Schema = mongoose.Schema;

/**
 * Schema cho log mỗi lượt đánh trong trận đấu
 */
const BattleLogSchema = new Schema({
  turn: { type: Number, required: true },
  attacker: { type: String, enum: ['challenger', 'opponent'], required: true },
  damage: { type: Number, default: 0 },
  isCritical: { type: Boolean, default: false },
  isDodged: { type: Boolean, default: false },
  lifestealHealed: { type: Number, default: 0 },
  regenerationHealed: { type: Number, default: 0 },
  challengerHp: { type: Number, required: true },
  opponentHp: { type: Number, required: true },
  description: { type: String, default: '' }
}, { _id: false });

/**
 * Schema cho thông số chiến đấu snapshot
 */
const CombatStatsSnapshotSchema = new Schema({
  attack: { type: Number, default: 0 },
  defense: { type: Number, default: 0 },
  qiBlood: { type: Number, default: 0 },
  zhenYuan: { type: Number, default: 0 },
  speed: { type: Number, default: 0 },
  criticalRate: { type: Number, default: 0 },
  criticalDamage: { type: Number, default: 0 },
  accuracy: { type: Number, default: 0 },
  dodge: { type: Number, default: 0 },
  penetration: { type: Number, default: 0 },
  resistance: { type: Number, default: 0 },
  lifesteal: { type: Number, default: 0 },
  regeneration: { type: Number, default: 0 },
  luck: { type: Number, default: 0 },
  realmLevel: { type: Number, default: 1 },
  realmName: { type: String, default: '' }
}, { _id: false });

/**
 * Schema chính cho trận đấu PK
 */
const BattleSchema = new Schema({
  // Người thách đấu
  challenger: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  challengerUsername: { type: String, required: true },
  challengerStats: { type: CombatStatsSnapshotSchema, required: true },

  // Đối thủ
  opponent: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  opponentUsername: { type: String, required: true },
  opponentStats: { type: CombatStatsSnapshotSchema, required: true },

  // Kết quả
  winner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isDraw: { type: Boolean, default: false },

  // Phần thưởng
  rewards: {
    winnerExp: { type: Number, default: 0 },
    winnerSpiritStones: { type: Number, default: 0 },
    loserExp: { type: Number, default: 0 },
    loserSpiritStones: { type: Number, default: 0 }
  },

  // Chi tiết trận đấu
  battleLogs: [BattleLogSchema],
  totalTurns: { type: Number, default: 0 },
  totalDamageByChallenger: { type: Number, default: 0 },
  totalDamageByOpponent: { type: Number, default: 0 },

  // Trạng thái
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'completed'
  },

  // Timestamps
  createdAt: { type: Date, default: Date.now, index: true },
  completedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes
BattleSchema.index({ challenger: 1, createdAt: -1 });
BattleSchema.index({ opponent: 1, createdAt: -1 });
BattleSchema.index({ winner: 1, createdAt: -1 });
BattleSchema.index({ createdAt: -1 });

// Virtual for checking if user is participant
BattleSchema.methods.isParticipant = function(userId) {
  return this.challenger.toString() === userId.toString() || 
         this.opponent.toString() === userId.toString();
};

// Get opponent for a user
BattleSchema.methods.getOpponentFor = function(userId) {
  if (this.challenger.toString() === userId.toString()) {
    return this.opponent;
  }
  return this.challenger;
};

// Check if user won
BattleSchema.methods.didUserWin = function(userId) {
  if (this.isDraw) return false;
  return this.winner && this.winner.toString() === userId.toString();
};

const Battle = mongoose.model('Battle', BattleSchema);
export default Battle;
