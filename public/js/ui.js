/**
 * UI Utilities, Sound Synthesizer, Theme, and Modals
 */

const UI = (() => {
  // --- Web Audio Synthesizer ---
  let audioCtx = null;
  let soundEnabled = true;

  function getAudioContext() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playTone(freq, type = 'sine', duration = 0.1, gainValue = 0.15) {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(gainValue, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Ignore audio autoplay restrictions gracefully
    }
  }

  const Sound = {
    click() { playTone(600, 'triangle', 0.05, 0.08); },
    correct() {
      playTone(523.25, 'sine', 0.1, 0.12); // C5
      setTimeout(() => playTone(659.25, 'sine', 0.15, 0.12), 80); // E5
    },
    error() {
      playTone(180, 'sawtooth', 0.25, 0.2);
    },
    hint() {
      playTone(440, 'sine', 0.1, 0.1);
      setTimeout(() => playTone(880, 'sine', 0.2, 0.1), 90);
    },
    erase() { playTone(300, 'triangle', 0.08, 0.08); },
    victory() {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        setTimeout(() => playTone(freq, 'sine', 0.35, 0.2), idx * 120);
      });
    }
  };

  // --- Theme Management ---
  function initTheme() {
    const savedTheme = localStorage.getItem('sudoku_theme') || 'dark';
    setTheme(savedTheme);

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
      });
    }
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sudoku_theme', theme);
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
      themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  }

  // --- Toast Notifications ---
  function toast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toastEl = document.createElement('div');
    toastEl.className = `toast ${type}`;
    toastEl.innerHTML = `<span>${message}</span>`;

    container.appendChild(toastEl);

    setTimeout(() => {
      toastEl.style.opacity = '0';
      toastEl.style.transform = 'translateX(100%)';
      toastEl.style.transition = 'all 0.3s ease';
      setTimeout(() => toastEl.remove(), 300);
    }, duration);
  }

  // --- Modal Management ---
  function showModal({ title, body, confirmText = 'OK', cancelText = null, onConfirm = null, onCancel = null }) {
    let overlay = document.getElementById('app-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'app-modal-overlay';
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title" id="modal-title"></h3>
            <button class="btn-icon" id="modal-close">&times;</button>
          </div>
          <div class="modal-body" id="modal-body"></div>
          <div class="modal-actions" id="modal-actions"></div>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    const titleEl = overlay.querySelector('#modal-title');
    const bodyEl = overlay.querySelector('#modal-body');
    const actionsEl = overlay.querySelector('#modal-actions');
    const closeBtn = overlay.querySelector('#modal-close');

    titleEl.textContent = title;
    if (typeof body === 'string') {
      bodyEl.innerHTML = body;
    } else {
      bodyEl.innerHTML = '';
      bodyEl.appendChild(body);
    }

    actionsEl.innerHTML = '';

    if (cancelText) {
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-secondary';
      cancelBtn.textContent = cancelText;
      cancelBtn.onclick = () => {
        closeModal();
        if (onCancel) onCancel();
      };
      actionsEl.appendChild(cancelBtn);
    }

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn btn-primary';
    confirmBtn.textContent = confirmText;
    confirmBtn.onclick = () => {
      closeModal();
      if (onConfirm) onConfirm();
    };
    actionsEl.appendChild(confirmBtn);

    closeBtn.onclick = () => closeModal();

    overlay.classList.add('active');
  }

  function closeModal() {
    const overlay = document.getElementById('app-modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
  }

  // Mobile menu toggle
  function initMobileNav() {
    const toggle = document.querySelector('.mobile-nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (toggle && navLinks) {
      toggle.addEventListener('click', () => {
        navLinks.classList.toggle('open');
      });
    }
  }

  return {
    init: () => {
      initTheme();
      initMobileNav();
      const storedSound = localStorage.getItem('sudoku_sound_enabled');
      if (storedSound !== null) soundEnabled = storedSound === 'true';
    },
    Sound,
    setSoundEnabled: (val) => {
      soundEnabled = !!val;
      localStorage.setItem('sudoku_sound_enabled', soundEnabled);
    },
    getSoundEnabled: () => soundEnabled,
    toast,
    showModal,
    closeModal,
    setTheme
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  UI.init();
});
