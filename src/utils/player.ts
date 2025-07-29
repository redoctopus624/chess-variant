export const getPlayerId = (): string => {
  let playerId = localStorage.getItem('gravityChessPlayerId');
  if (!playerId) {
    playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('gravityChessPlayerId', playerId);
  }
  return playerId;
};