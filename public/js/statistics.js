/**
 * Statistics Page Module
 */

document.addEventListener('DOMContentLoaded', async () => {
  const token = API.getToken();
  const guestNotice = document.getElementById('guest-stats-notice');
  const statsContent = document.getElementById('stats-content');

  if (!token) {
    if (guestNotice) guestNotice.style.display = 'block';
    return;
  }

  try {
    const res = await API.getStatistics();
    if (res.success && res.stats) {
      if (statsContent) statsContent.style.display = 'block';
      if (guestNotice) guestNotice.style.display = 'none';

      const s = res.stats;
      
      document.getElementById('stat-games-played').textContent = s.gamesPlayed || 0;
      document.getElementById('stat-games-won').textContent = s.gamesWon || 0;
      document.getElementById('stat-win-rate').textContent = `${s.winRate || 0}%`;
      document.getElementById('stat-total-score').textContent = (s.totalScore || 0).toLocaleString();
      document.getElementById('stat-best-score').textContent = (s.bestScore || 0).toLocaleString();
      document.getElementById('stat-total-time').textContent = GameTimer.formatSeconds(s.totalPlayTime || 0);
      document.getElementById('stat-mistakes').textContent = s.totalMistakes || 0;
      document.getElementById('stat-hints').textContent = s.totalHintsUsed || 0;

      // Best times per difficulty
      const bt = s.bestTime || {};
      document.getElementById('bt-easy').textContent = bt.easy ? GameTimer.formatSeconds(bt.easy) : '--:--';
      document.getElementById('bt-medium').textContent = bt.medium ? GameTimer.formatSeconds(bt.medium) : '--:--';
      document.getElementById('bt-hard').textContent = bt.hard ? GameTimer.formatSeconds(bt.hard) : '--:--';
      document.getElementById('bt-expert').textContent = bt.expert ? GameTimer.formatSeconds(bt.expert) : '--:--';
    }
  } catch (err) {
    UI.toast('Could not load statistics.', 'error');
  }
});
