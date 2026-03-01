/**
 * Background Music Service
 * Manages looping background music playback at low volume behind narration.
 */

let bgAudio = null;
let _volume = 0.15;
let _playing = false;

/**
 * Start playing a background music track (looped, low volume).
 * Stops any previously playing track first.
 * @param {string} filename - e.g. "kids-happy-music.mp3"
 * @param {number} [volume=0.15] - initial volume (0–1)
 * @returns {boolean} whether playback started
 */
export function startBgMusic(filename, volume = _volume) {
  stopBgMusic();
  if (!filename) return false;

  bgAudio = new Audio(`./bg_sounds/${filename}`);
  bgAudio.loop = true;
  bgAudio.volume = volume;
  _volume = volume;
  _playing = true;

  bgAudio.play().catch(err => {
    console.warn("BG music autoplay blocked:", err);
    _playing = false;
  });

  return true;
}

/**
 * Stop and destroy the current background music.
 */
export function stopBgMusic() {
  if (bgAudio) {
    bgAudio.pause();
    bgAudio.currentTime = 0;
    bgAudio = null;
  }
  _playing = false;
}

/**
 * Pause background music (keeps position).
 */
export function pauseBgMusic() {
  if (bgAudio) {
    bgAudio.pause();
    _playing = false;
  }
}

/**
 * Resume background music from where it was paused.
 */
export function resumeBgMusic() {
  if (bgAudio) {
    bgAudio.play().catch(console.warn);
    _playing = true;
  }
}

/**
 * Toggle play/pause for background music.
 * @returns {boolean} new playing state
 */
export function toggleBgMusic() {
  if (!bgAudio) return false;
  if (_playing) {
    pauseBgMusic();
  } else {
    resumeBgMusic();
  }
  return _playing;
}

/**
 * Set the background music volume.
 * @param {number} vol - volume between 0 and 1
 */
export function setBgMusicVolume(vol) {
  _volume = Math.max(0, Math.min(1, vol));
  if (bgAudio) {
    bgAudio.volume = _volume;
  }
}

/**
 * @returns {boolean} whether background music is currently playing
 */
export function isBgMusicPlaying() {
  return _playing;
}

/**
 * @returns {number} current volume
 */
export function getBgMusicVolume() {
  return _volume;
}
