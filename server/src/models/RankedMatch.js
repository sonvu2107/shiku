import mongoose from 'mongoose';
const Schema = mongoose.Schema;

/**
 * RankedMatch Schema - Lưu trận đấu ranked
 */
const RankedMatchSchema = new Schema({
    season: { type: Number, required: true, index: true },

    // Player 1
    player1: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    player1Username: { type: String, required: true },
    player1Mmr: { type: Number, required: true },
    player1MmrChange: { type: Number, default: 0 },
    player1Tier: { type: Number },

    // Player 2 (có thể là bot)
    player2: {
        type: Schema.Types.ObjectId,
        ref: 'User'
        // Not required - can be null for bot matches
    },
    player2Username: { type: String, required: true },
    player2Mmr: { type: Number, required: true },
    player2MmrChange: { type: Number, default: 0 },
    player2Tier: { type: Number },
    player2IsBot: { type: Boolean, default: false },
    player2BotId: { type: String }, // Bot ID if bot match

    // Result
    winner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    winnerSide: { type: String, enum: ['player1', 'player2', 'draw'], default: 'draw' },
    isDraw: { type: Boolean, default: false },

    // Battle reference (link to detailed battle data)
    battleId: {
        type: Schema.Types.ObjectId,
        ref: 'Battle'
    },

    // Match stats
    totalTurns: { type: Number, default: 0 },
    duration: { type: Number, default: 0 }, // in seconds

    // Timestamps
    createdAt: { type: Date, default: Date.now, index: true },
    completedAt: { type: Date }
}, {
    timestamps: true
});

// Compound indexes for queries
RankedMatchSchema.index({ season: 1, createdAt: -1 });
RankedMatchSchema.index({ player1: 1, season: 1, createdAt: -1 });
RankedMatchSchema.index({ player2: 1, season: 1, createdAt: -1 });

/**
 * Get match history for a user
 */
RankedMatchSchema.statics.getHistoryForUser = async function (userId, season, limit = 20, skip = 0) {
    return this.find({
        season,
        $or: [
            { player1: userId },
            { player2: userId }
        ]
    })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('player1', 'name avatarUrl')
        .populate('player2', 'name avatarUrl')
        .lean();
};

/**
 * Get stats for a user in a season
 */
RankedMatchSchema.statics.getSeasonStats = async function (userId, season) {
    const matches = await this.find({
        season,
        $or: [
            { player1: userId },
            { player2: userId }
        ]
    }).lean();

    let wins = 0, losses = 0, draws = 0;
    let totalMmrGained = 0, totalMmrLost = 0;

    matches.forEach(match => {
        const isPlayer1 = match.player1?.toString() === userId.toString();

        if (match.isDraw) {
            draws++;
        } else if (
            (isPlayer1 && match.winnerSide === 'player1') ||
            (!isPlayer1 && match.winnerSide === 'player2')
        ) {
            wins++;
            totalMmrGained += Math.abs(isPlayer1 ? match.player1MmrChange : match.player2MmrChange);
        } else {
            losses++;
            totalMmrLost += Math.abs(isPlayer1 ? match.player1MmrChange : match.player2MmrChange);
        }
    });

    return {
        totalMatches: matches.length,
        wins,
        losses,
        draws,
        winRate: matches.length > 0 ? ((wins / matches.length) * 100).toFixed(1) : 0,
        totalMmrGained,
        totalMmrLost,
        netMmr: totalMmrGained - totalMmrLost
    };
};

const RankedMatch = mongoose.model('RankedMatch', RankedMatchSchema);
export default RankedMatch;
