import * as THREE from '../vendor/three';
import PointerLockControls from '../vendor/PointerLockControls.js';
import OrbitControls from '../vendor/OrbitControls.js';

import Key from './key';
import Audio from './audio';
import GameNotes from './game_notes';
import GameView from './game_view';
import Instructions from './instructions';

window.__tuxTimers=[];
window.__tuxSchedule=function(fn,delay){const clock=window.__tuxClock;const timer=setInterval(function(){if(!clock||clock.paused)return;if(performance.now()-clock.start-clock.pausedTotal>=delay){clearInterval(timer);fn();}},20);window.__tuxTimers.push(timer);return timer;};
class Game {
  constructor() {
    this.noteInterval = 237.8;
    this.musicDelay = 1980;
    this.key = new Key();
    this.instructions = new Instructions();
    this.started = false;

    this.gameStartEl = document.getElementsByClassName('start')[0];
    window.__tuxGame = this;
    this.gameStartListener =
      window.addEventListener("keypress", this.hitAToStart.bind(this));

    this.createGameView();
  }

  startGame() {
    this.addMusic();
    window.__tuxClock = {paused:false, start:performance.now(), pausedAt:0, pausedTotal:0};
    this.gameView.addMovingNotes(this.noteInterval);
    this.gameStartEl.className = "start hidden";
    this.started = true;
  }

  resetGame(){
    window.__tuxTimers.forEach(clearInterval);window.__tuxTimers=[];
    if(this.music){this.music.audioPlayerEl.pause();this.music.audioPlayerEl.remove();this.music=null;}
    if(this.gameView){let v=this.gameView;if(v.clearNotes)v.clearNotes();window.__tuxFx=null;}
    this.started=false;window.__tuxClock=null;
    this.gameStartEl.className='start';
  }

  hitAToStart(e) {
    if (!this.started) {
      if (e.keyCode === 97 || e.keyCode === 65) {
        this.startGame();
      }
    }
  }

  createGameView() {
    // SCENE SIZE
    let width = window.innerWidth,
      height = window.innerHeight;

    // CAMERA ATTRIBUTE
    let viewAngle = 75,
      aspect = width / height,
      near = 0.1,
      far = 10000;

    let scene = new THREE.Scene();
    let camera = new THREE.PerspectiveCamera(
      viewAngle,
      aspect,
      near,
      far);

    camera.position.z = 150;

    let renderer = new THREE.WebGLRenderer({alpha: true});
    renderer.setClearColor(0x000000, 0);
    renderer.setSize( width, height );
    document.getElementById('game-canvas').appendChild( renderer.domElement );

    this.gameView = new GameView(
      renderer, camera, scene, this.key, this.musicDelay
    );
    this.gameView.setup();
  }

  addMusic() {
    this.music = new Audio(this.musicDelay);
    this.music.startMusic();
    setTimeout(this.music.fadeOut.bind(this.music), 213000);
  }

}

export default Game;
