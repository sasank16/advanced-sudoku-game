/**
 * Timer Module
 * Handles game timing, pause/resume, and formatting.
 */

class GameTimer {
  constructor(onTickCallback = null) {
    this.elapsedSeconds = 0;
    this.intervalId = null;
    this.isRunning = false;
    this.onTick = onTickCallback;
  }

  start(initialSeconds = 0) {
    this.stop();
    this.elapsedSeconds = initialSeconds;
    this.isRunning = true;
    if (this.onTick) this.onTick(this.elapsedSeconds, this.getFormattedTime());

    this.intervalId = setInterval(() => {
      if (this.isRunning) {
        this.elapsedSeconds++;
        if (this.onTick) this.onTick(this.elapsedSeconds, this.getFormattedTime());
      }
    }, 1000);
  }

  pause() {
    this.isRunning = false;
  }

  resume() {
    if (!this.intervalId) {
      this.start(this.elapsedSeconds);
    } else {
      this.isRunning = true;
    }
  }

  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  reset() {
    this.stop();
    this.elapsedSeconds = 0;
    if (this.onTick) this.onTick(0, '00:00');
  }

  getSeconds() {
    return this.elapsedSeconds;
  }

  getFormattedTime() {
    return GameTimer.formatSeconds(this.elapsedSeconds);
  }

  static formatSeconds(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num) => String(num).padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  }
}
