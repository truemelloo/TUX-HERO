class Audio {
  constructor(musicDelay) {
    this.musicDelay = musicDelay;

    this.songDivEl = document.getElementById('song');
    this.muteButton = document.getElementsByClassName('mute')[0];
    this.playPauseButton = document.getElementsByClassName('play-pause')[0];
    this.src = 'https://s3-us-west-1.amazonaws.com/js-hero-guitar-hero-clone/sweet_child_o_mine.mp3';
    this.startTimer = null;
    this.fadeInterval = null;
    this.songDivEl.innerHTML =
      `<audio id="audio-player" step="1" controls="controls" src=${this.src} type="audio/mpeg">`;
    this.audioPlayerEl = document.getElementById('audio-player');

    this.playing = false;
    this.audioPlayerEl.volume = 1;

    // (PAUSAR/SILENCIAR são controlados por tux-control-deck.js; não sobrescrever onclick aqui.)
  }

  startMusic() {
    clearTimeout(this.startTimer);
    this.startTimer = setTimeout(() => {
      this.startTimer = null;
      const p = this.audioPlayerEl.play();
      if (p && p.catch) p.catch(() => {});
    }, this.musicDelay);
    this.playing = true;
  }

  destroy() {
    // Cancela início atrasado/fade pendentes e silencia de verdade o elemento.
    clearTimeout(this.startTimer); this.startTimer = null;
    clearInterval(this.fadeInterval); this.fadeInterval = null;
    this.playing = false;
    this.audioPlayerEl.pause();
    this.audioPlayerEl.removeAttribute('src');
    try { this.audioPlayerEl.load(); } catch (e) {}
    this.audioPlayerEl.remove();
  }

  muteMusic() {
    this.audioPlayerEl.volume = 0;
    this.muteButton.innerHTML = "Unmute";
  }

  unmuteMusic() {
    this.audioPlayerEl.volume = 1;
    this.muteButton.innerHTML = "Mute";
  }

  mute() {
    const vol = this.audioPlayerEl.volume;
    return vol > 0 ? this.muteMusic() : this.unmuteMusic();
  }

  pauseMusic() {
    this.audioPlayerEl.pause();
    this.playing = false;
    this.playPauseButton.innerHTML = "Play";
  }

  playMusic() {
    this.audioPlayerEl.play();
    this.playing = true;
    this.playPauseButton.innerHTML = "Pause";
  }

  playPause() {
    return this.playing ? this.pauseMusic() : this.playMusic();
  }

  fadeOut() {
    // 5 second fade out
    const decInterval = this.audioPlayerEl.volume / 20;
    clearInterval(this.fadeInterval);
    const fadeAudio = this.fadeInterval = setInterval(() => {
      if (this.audioPlayerEl.volume >= 0.1) {
        this.audioPlayerEl.volume -= decInterval;
      } else {
        clearInterval(fadeAudio);
        this.audioPlayerEl.pause();
      }
    }, 250);
  }

}

export default Audio;
