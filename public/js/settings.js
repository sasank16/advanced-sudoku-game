/**
 * Settings Page Module
 */

document.addEventListener('DOMContentLoaded', () => {
  const themeSelect = document.getElementById('setting-theme');
  const soundToggle = document.getElementById('setting-sound');
  const highlightToggle = document.getElementById('setting-highlight');
  const mistakesToggle = document.getElementById('setting-mistakes');
  const saveBtn = document.getElementById('btn-save-settings');
  const resetBtn = document.getElementById('btn-reset-settings');

  // Load current settings from localStorage
  const currentTheme = localStorage.getItem('sudoku_theme') || 'dark';
  const soundEnabled = localStorage.getItem('sudoku_sound_enabled') !== 'false';
  const highlightEnabled = localStorage.getItem('sudoku_highlight_enabled') !== 'false';
  const maxMistakes = localStorage.getItem('sudoku_max_mistakes') || '3';

  if (themeSelect) themeSelect.value = currentTheme;
  if (soundToggle) soundToggle.checked = soundEnabled;
  if (highlightToggle) highlightToggle.checked = highlightEnabled;
  if (mistakesToggle) mistakesToggle.value = maxMistakes;

  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const selectedTheme = themeSelect.value;
      const soundVal = soundToggle.checked;
      const highlightVal = highlightToggle.checked;
      const mistakesVal = mistakesToggle.value;

      UI.setTheme(selectedTheme);
      UI.setSoundEnabled(soundVal);
      localStorage.setItem('sudoku_highlight_enabled', highlightVal);
      localStorage.setItem('sudoku_max_mistakes', mistakesVal);

      // If user is logged in, sync preferences with backend
      if (API.getToken()) {
        try {
          await API.updatePreferences({
            theme: selectedTheme,
            soundEffects: soundVal,
            highlightDuplicates: highlightVal,
            maxMistakesLimit: parseInt(mistakesVal, 10)
          });
        } catch (e) {
          // Fallback to local
        }
      }

      UI.toast('Preferences saved successfully!', 'success');
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      UI.setTheme('dark');
      UI.setSoundEnabled(true);
      localStorage.setItem('sudoku_highlight_enabled', 'true');
      localStorage.setItem('sudoku_max_mistakes', '3');

      if (themeSelect) themeSelect.value = 'dark';
      if (soundToggle) soundToggle.checked = true;
      if (highlightToggle) highlightToggle.checked = true;
      if (mistakesToggle) mistakesToggle.value = '3';

      UI.toast('Settings reset to default values.', 'info');
    });
  }
});
