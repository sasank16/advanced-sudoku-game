/**
 * Leaderboard Page Module
 */

document.addEventListener('DOMContentLoaded', () => {
  let currentDifficulty = '';

  const tableBody = document.getElementById('leaderboard-tbody');
  const emptyState = document.getElementById('leaderboard-empty');

  async function loadLeaderboard(diff = '') {
    currentDifficulty = diff;
    if (tableBody) {
      tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">Loading leaderboard...</td></tr>';
    }

    try {
      const res = await API.getLeaderboard(diff);
      const data = res.leaderboard || [];

      if (!tableBody) return;

      if (data.length === 0) {
        tableBody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
      }

      if (emptyState) emptyState.style.display = 'none';

      tableBody.innerHTML = data.map((entry, index) => {
        const rank = index + 1;
        let rankBadge = `<span class="rank-badge">${rank}</span>`;
        if (rank === 1) rankBadge = `<span class="rank-badge rank-1">🥇</span>`;
        else if (rank === 2) rankBadge = `<span class="rank-badge rank-2">🥈</span>`;
        else if (rank === 3) rankBadge = `<span class="rank-badge rank-3">🥉</span>`;

        return `
          <tr>
            <td>${rankBadge}</td>
            <td style="font-weight: 600;">${entry.playerName}</td>
            <td><span class="badge-difficulty badge-${entry.difficulty}">${entry.difficulty}</span></td>
            <td style="font-weight: 700; color: var(--accent-primary);">${entry.score.toLocaleString()}</td>
            <td>${GameTimer.formatSeconds(entry.elapsedTime)}</td>
            <td>${entry.mistakes}</td>
            <td>${entry.hintsUsed}</td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Leaderboard error:', err);
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--danger); padding: 2rem;">Failed to load leaderboard.</td></tr>';
      }
    }
  }

  // Filter tabs event listeners
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const diff = tab.dataset.difficulty || '';
      loadLeaderboard(diff);
    });
  });

  loadLeaderboard('');
});
