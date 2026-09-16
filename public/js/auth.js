/**
 * Auth Module
 * Manages user state, login/register forms, and navigation bar updates.
 */

const Auth = (() => {
  let currentUser = null;

  async function checkAuth() {
    const token = API.getToken();
    if (!token) {
      updateNavbar(null);
      return null;
    }

    try {
      const res = await API.getProfile();
      if (res.success && res.user) {
        currentUser = res.user;
        updateNavbar(currentUser);
        return currentUser;
      }
    } catch (err) {
      API.setToken(null);
      updateNavbar(null);
    }
    return null;
  }

  function updateNavbar(user) {
    const authContainer = document.getElementById('nav-auth-container');
    if (!authContainer) return;

    if (user) {
      authContainer.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span style="font-size: 0.9rem; font-weight: 600; color: var(--accent-secondary);">
            👤 ${user.username}
          </span>
          <button id="logout-btn" class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">
            Logout
          </button>
        </div>
      `;

      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
      }
    } else {
      authContainer.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <a href="login.html" class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">Login</a>
          <a href="register.html" class="btn btn-primary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">Register</a>
        </div>
      `;
    }
  }

  async function login(emailOrUsername, password) {
    try {
      const res = await API.login({ emailOrUsername, password });
      if (res.success && res.token) {
        API.setToken(res.token);
        currentUser = res.user;
        UI.toast('Logged in successfully!', 'success');
        setTimeout(() => {
          window.location.href = 'game.html';
        }, 800);
      }
    } catch (err) {
      showError(err.message || 'Login failed.');
    }
  }

  async function register(username, email, password) {
    try {
      const res = await API.register({ username, email, password });
      if (res.success && res.token) {
        API.setToken(res.token);
        currentUser = res.user;
        UI.toast('Account created successfully!', 'success');
        setTimeout(() => {
          window.location.href = 'game.html';
        }, 800);
      }
    } catch (err) {
      showError(err.message || 'Registration failed.');
    }
  }

  function logout() {
    API.setToken(null);
    currentUser = null;
    UI.toast('Logged out.', 'info');
    updateNavbar(null);
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 500);
  }

  function showError(msg) {
    const errorEl = document.getElementById('auth-error');
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
    } else {
      UI.toast(msg, 'error');
    }
  }

  function getCurrentUser() {
    return currentUser;
  }

  return {
    init: () => {
      checkAuth();
    },
    login,
    register,
    logout,
    getCurrentUser,
    checkAuth
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
});
