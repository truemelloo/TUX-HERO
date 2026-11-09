import * as THREE from '../vendor/three';
import { songNotes, beatsPerMeasure } from './song';
import ViewControls from './view_controls';
import GameNotes from './game_notes';

/* JOGO RÁPIDO — uma guitarra 3D centralizada.
 * Geometria, câmera, velocidade e temporização são as mesmas de sempre (a pista vive num "frame"
 * inclinado que reproduz exatamente fundo y=50/z=-500 → linha de acerto y=-75/z=0).
 * A aparência (pista, botões, notas, notas longas, efeitos) vem de lib/tux-visuals.js,
 * compartilhado com o multijogador. Este arquivo NÃO altera pontuação nem julgamento. */
class GameView {
  constructor(renderer, camera, scene, key, musicDelay) {
    this.renderer = renderer;
    this.camera = camera;
    this.scene = scene;
    this.key = key;
    this.musicDelay = musicDelay;

    this.note = {};

    this.zStartPoint = -500;
    this.zEndPoint = 0;
    this.yStartPoint = 50;
    this.yEndPoint = -75;
    this.xPos = [-50, -25, 0, 25, 50];

    this.xRotation = -Math.atan(
      (this.zEndPoint - this.zStartPoint) / (this.yStartPoint - this.yEndPoint)
    );

    this.V = window.TuxVisuals.create(THREE);
    this.spheres = [];
    this.cylinders = [];
    this.beatLines = [];
    this.liveNotes = [];
    this.liveSustains = [];
    this.liveBeats = [];

    this.t = 0;
    this.measures = [0];
    this.lastTime = performance.now();
  }

  setup() {
    this.setWindowResizer();
    // Só profundidade (near/far); o enquadramento (posição, fov, direção) permanece o original.
    this.camera.near = 1;
    this.camera.far = 4000;
    this.camera.updateProjectionMatrix();
    this.backgroundSetup();
    this.addFretBoard();
    this.setNoteAttributes();
    this.controls = new ViewControls(this.camera, this.renderer);
    this.gameLoop();
  }

  setWindowResizer() {
    let width,
      height;

    window.addEventListener( 'resize', () => {
      width = window.innerWidth;
      height = window.innerHeight;
      this.renderer.setSize( width, height);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    });
  }

  backgroundSetup() {
    // Sem fundo opaco: o renderer é transparente e o vídeo do Tux com a banda aparece atrás da pista.
    this.V.addLights(this.scene);
  }

  addFretBoard() {
    this.board = this.V.createBoard({
      anisotropy: this.renderer.capabilities.getMaxAnisotropy()
    });
    this.scene.add(this.board.group);
  }

  setNoteAttributes() {
    this.note.vel = .75;

    this.note.yVel = this.note.vel * (this.yEndPoint - this.yStartPoint) / 100;
    this.note.zVel = this.note.vel * (this.zEndPoint - this.zStartPoint) / 100;
    // deslocamento por quadro ao longo da pista (mesmo movimento de antes, em coordenadas do frame)
    this.note.speed = Math.sqrt(this.note.yVel * this.note.yVel + this.note.zVel * this.note.zVel);
  }

  clearNotes() {
    const layer = this.board && this.board.noteLayer;
    if (layer) {
      this.liveNotes.concat(this.liveBeats).forEach(m => layer.remove(m));
      this.liveSustains.forEach(s => { layer.remove(s.group); s.dispose(); });
    }
    this.liveNotes = [];
    this.liveSustains = [];
    this.liveBeats = [];
    this.spheres = [];
    this.cylinders = [];
    this.beatLines = [];
    this.measures = [0];
  }

  // chamado por GameNotes depois de julgar cada nota (apenas efeitos visuais)
  noteResult(songNote, hit) {
    const lane = songNote.pos - 1;
    songNote._hit = hit;
    if (hit) {
      const streak = this.gameNotes ? this.gameNotes.streak : 0;
      this.board.hit(lane, streak >= 10 ? 1.25 : 1);
      const mesh = this.spheres[songNote._idx];
      if (mesh) mesh.visible = false;
      if (streak > 0 && streak % 10 === 0) {
        this.board.combo(streak);
        this.showToast(streak + ' SEGUIDAS!');
      }
    } else {
      this.board.miss(lane);
    }
  }

  showToast(text) {
    const host = document.getElementById('game-canvas');
    if (!host) return;
    const el = document.createElement('span');
    el.className = 'tux-quick-toast';
    el.textContent = text;
    host.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  addMovingNotes(noteInterval) {
    this.clearNotes();
    this.gameNotes = new GameNotes(
      noteInterval, this.musicDelay, this.key
    );
    window.__tuxFx = (songNote, hit) => this.noteResult(songNote, hit);

    const LEN = this.V.G.LEN;
    const framesPerUnit = noteInterval / (1000 / 60);   // 1 unidade de "hold" = 1 passo de tempo do chart

    songNotes.forEach((songNote, idx) => {
      const lane = songNote.pos - 1;
      songNote._hit = undefined;
      songNote._idx = idx;

      this.spheres[idx] = this.V.createNote(lane);

      let time = noteInterval * (
        ((songNote.m - 1) * beatsPerMeasure) + songNote.t
      );
      let lag = 0;

      if (songNote.m > 94) {
        lag = 12.5 * songNote.m;
        time += lag;
      } else if (songNote.m > 79) {
        lag = 10 * songNote.m;
        time += lag;
      } else if (songNote.m > 71) {
        lag = 7.5 * songNote.m;
        time += lag;
      }
      else if (songNote.m > 48) {
        lag = 5 * songNote.m;
        time += lag;
      }

      this.addMovingBeatLine(songNote.m, noteInterval, lag);

      // POSITION & ADD TO SCENE NOTES & HOLDS
      window.__tuxSchedule( () => {
        if (songNote.hold) {
          const sus = this.V.createSustain(lane);
          sus.group.position.x = this.xPos[lane];
          sus.len = songNote.hold * framesPerUnit * this.note.speed;
          sus.headZ = -LEN;
          sus.state = 'idle';
          sus.tick = 0;
          sus.songNote = songNote;
          this.board.noteLayer.add(sus.group);
          this.liveSustains.push(sus);
          this.cylinders[idx] = sus;
        }
        const mesh = this.spheres[idx];
        mesh.position.set(this.xPos[lane], 0, -LEN);
        this.board.noteLayer.add(mesh);
        this.liveNotes.push(mesh);
        }, time
      );
      this.gameNotes.setNoteCheck(songNote, time);
    });
  }

  addMovingBeatLine(measure, noteInterval, lag) {
    if (this.measures[this.measures.length - 1] < measure) {
      this.measures.push(measure);
      for (let t = 1; t < 9; t++ ) {
        let time = lag + noteInterval * (
          ((measure - 1) * beatsPerMeasure) + t
        );
        let idx = measure * beatsPerMeasure + t;
        this.beatLines[idx] = this.V.createBeatLine(t % 2 !== 0);

        window.__tuxSchedule( () => {
          const line = this.beatLines[idx];
          if (!line) return;
          line.position.z = -this.V.G.LEN;
          this.board.noteLayer.add(line);
          this.liveBeats.push(line);
        }, time);
      }
    }
  }

  sceneUpdate(dt, frames) {
    // `frames` = quadros de 60 Hz decorridos (1 a 60 Hz): o movimento fica independente da taxa de quadros,
    // mantendo as notas sincronizadas com o áudio/julgamento (relógio real) em qualquer monitor.
    const speed = this.note.speed * frames;
    const layer = this.board.noteLayer;

    for (let i = this.liveNotes.length - 1; i >= 0; i--) {
      const m = this.liveNotes[i];
      m.position.z += speed;
      this.V.fadeNote(m, m.position.z);
      if (m.position.z > 14) {
        layer.remove(m);
        this.liveNotes.splice(i, 1);
      }
    }

    for (let i = this.liveSustains.length - 1; i >= 0; i--) {
      const s = this.liveSustains[i];
      const lane = s.songNote.pos - 1;
      const held = !!this.key.isDownVisually(this.key.pos[lane + 1]);
      s.headZ += speed;
      if (s.state === 'idle') {
        if (s.songNote._hit === false) s.state = 'dead';
        else if (s.songNote._hit === true) s.state = held ? 'active' : 'dead';
      } else if (s.state === 'active' && !held) {
        s.state = 'dead';                 // soltou a tecla antes do fim
      }
      if (s.state === 'active' && s.headZ >= 0 && (s.tick += dt) > 0.07) {
        s.tick = 0;
        this.board.sustainTick(lane);
      }
      s.update(s.headZ, s.len, s.state, dt);
      if (s.headZ - s.len > 12) {         // terminou
        layer.remove(s.group);
        s.dispose();
        this.liveSustains.splice(i, 1);
      }
    }

    for (let i = this.liveBeats.length - 1; i >= 0; i--) {
      const b = this.liveBeats[i];
      b.position.z += speed;
      if (b.position.z > 0) {
        layer.remove(b);
        this.liveBeats.splice(i, 1);
      }
    }
  }

  sceneRender() {
    this.renderer.render(this.scene, this.camera);
  }

  gameLoop() {
    requestAnimationFrame(this.gameLoop.bind(this));

    const now = performance.now();
    const raw = (now - this.lastTime) / 1000;
    const dt = Math.min(0.05, raw);
    this.lastTime = now;

    if (!window.__tuxClock || !window.__tuxClock.paused) this.sceneUpdate(dt, Math.min(raw, 0.25) * 60);
    for (let lane = 0; lane < 5; lane++) {
      this.board.setPressed(lane, !!this.key.isDownVisually(this.key.pos[lane + 1]));
    }
    this.board.update(dt);
    this.sceneRender();
  }

}

export default GameView;
