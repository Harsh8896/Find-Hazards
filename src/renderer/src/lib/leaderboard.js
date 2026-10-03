// Top-five milestone used in player feedback.
export const LEADERBOARD_SIZE = 5

// Ranking (best game per player, higher score first, then faster time) is done in SQL,
// see getRankedPlayers in src/main/db.js.
export const getLeaderboard = () => window.api.db.getLeaderboard()

// 1-based rank of a player, or null if they haven't played yet.
export const getPlayerRank = (phone) => window.api.db.getPlayerRank(phone)

// Admin-controlled: whether the public leaderboard is shown, and whether it ranks
// today's games or every game ever played. { visible: boolean, mode: 'all_time' | 'daily' }
export const getLeaderboardSettings = () => window.api.db.getLeaderboardSettings()
