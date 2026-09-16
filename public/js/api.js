/**
 * API Client Module
 * Centralizes REST communication with backend.
 */

const API = (() => {
  const BASE_URL = window.location.origin;

  function getToken() {
    return localStorage.getItem('sudoku_jwt_token');
  }

  function setToken(token) {
    if (token) {
      localStorage.setItem('sudoku_jwt_token', token);
    } else {
      localStorage.removeItem('sudoku_jwt_token');
    }
  }

  function getGuestId() {
    let guestId = localStorage.getItem('sudoku_guest_id');
    if (!guestId) {
      guestId = 'guest_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('sudoku_guest_id', guestId);
    }
    return guestId;
  }

  async function request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const token = getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({
        success: false,
        message: 'Invalid response from server.'
      }));

      if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  return {
    getToken,
    setToken,
    getGuestId,
    // Auth
    register: (userData) => request('/api/users/register', { method: 'POST', body: JSON.stringify(userData) }),
    login: (credentials) => request('/api/users/login', { method: 'POST', body: JSON.stringify(credentials) }),
    getProfile: () => request('/api/auth/profile'),
    // Games
    createGame: (difficulty) => request('/api/games', { method: 'POST', body: JSON.stringify({ difficulty, guestId: getGuestId() }) }),
    getGame: (id) => request(`/api/games/${id}`),
    makeMove: (id, moveData) => request(`/api/games/${id}/move`, { method: 'POST', body: JSON.stringify(moveData) }),
    requestHint: (id) => request(`/api/games/${id}/hint`, { method: 'POST' }),
    saveGame: (id, gameData) => request(`/api/games/${id}`, { method: 'PUT', body: JSON.stringify(gameData) }),
    completeGame: (id, data) => request(`/api/games/${id}/complete`, { method: 'POST', body: JSON.stringify(data) }),
    abandonGame: (id) => request(`/api/games/${id}`, { method: 'DELETE' }),
    // User & Leaderboard
    getStatistics: () => request('/api/user/statistics'),
    updatePreferences: (prefs) => request('/api/user/preferences', { method: 'PUT', body: JSON.stringify(prefs) }),
    getLeaderboard: (difficulty = '') => request(`/api/leaderboard?difficulty=${difficulty}`)
  };
})();
