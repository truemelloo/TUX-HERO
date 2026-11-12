/* TUX HERO — motor Three.js do Multijogador Local e das músicas importadas.
 *
 * Cada jogador possui SEU PRÓPRIO: chart, julgamento, pontuação, sequência, multiplicador,
 * PowerMusic, teclas, pista 3D e efeitos. Compartilham apenas o áudio e o relógio da partida
 * (audio.currentTime) e o vídeo de fundo.
 *
 * Toda a aparência (pista, botões, notas, notas longas, efeitos) vem de lib/tux-visuals.js, o
 * mesmo módulo usado pelo Jogo Rápido. O Jogo Rápido tem câmera/layout próprios (bundle.js);
 * este arquivo só controla o enquadramento do MULTIJOGADOR (duas pistas) e da música importada
 * (uma pista, com o mesmo enquadramento que sempre teve).
 */
(function () {
  'use strict';
  var THREE = window.THREE, V = window.TuxVisuals.create(THREE), G = V.G;
  var KEYSETS = [['a', 's', 'd', 'f', 'g'], ['j', 'k', 'l', 'ç', 'enter']];
  var TRAVEL = 2.6;              // segundos que uma nota leva do fundo até a linha de acerto
  var HIT_WINDOW = 0.19;         // janela de acerto (s) — inalterada
  var MISS_AFTER = 0.20;         // nota perdida após passar (s) — inalterado
  var NOTE_STEP = 0.2378;        // duração de 1 unidade de "hold" (mesma base de tempo do chart original)
  var DIFFICULTY_LABELS = { EASY: 'FÁCIL', MEDIUM: 'MÉDIO', HARD: 'DIFÍCIL', EXPERT: 'ESPECIALISTA' };
  var SPRITES = ['barra0', 'barra00', 'barra1', 'barra2', 'barra3', 'barra4', 'barra5', 'barra6', 'barra8'];
  var session = null;

  /* ------------------------------------------------------------------ DOM base */
  var root = document.createElement('section'); root.id = 'tux-unified-game'; root.className = 'hidden';
  root.innerHTML = '<div class="unified-hud"><img src="assets/tux-hero-logo.png" alt="TUX HERO"><div id="unified-track"></div><button id="unified-pause">PAUSAR / ESC</button></div>' +
    '<div id="unified-players"></div><div id="unified-render"></div><div id="unified-overlay" class="hidden"></div>';
  document.body.appendChild(root);
  var $ = function (id) { return document.getElementById(id); }, overlay = $('unified-overlay');

  function escapeHTML(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function showOverlay(html) { overlay.innerHTML = html; overlay.classList.remove('hidden'); }
  function hideOverlay() { overlay.classList.add('hidden'); overlay.innerHTML = ''; }

  /* ------------------------------------------------------------------ charts */
  function chart(notes, difficulty) {
    var skip = { EASY: 4, MEDIUM: 2, HARD: 1, EXPERT: 1 }[difficulty] || 2;
    return notes.filter(function (n, i) { return i % skip === 0; })
      .map(function (n) { return { t: Number(n.t), lane: Number(n.lane), dur: Math.max(0, Number(n.dur) || 0), done: false, hit: false }; })
      .filter(function (n) { return isFinite(n.t) && n.lane >= 0 && n.lane < 5; })
      .sort(function (a, b) { return a.t - b.t; });
  }
  function originalChart() {   // mesma conversão de tempo do Jogo Rápido; agora preserva as notas longas (hold)
    return (window.TUX_ORIGINAL_CHART || []).map(function (n) {
      var ms = 237.8 * ((n.m - 1) * 8 + n.t);
      if (n.m > 94) ms += 12.5 * n.m; else if (n.m > 79) ms += 10 * n.m; else if (n.m > 71) ms += 7.5 * n.m; else if (n.m > 48) ms += 5 * n.m;
      return { t: (ms + 260 + 1980) / 1000, lane: n.pos - 1, dur: n.hold ? n.hold * NOTE_STEP : 0 };
    });
  }
  function makePlayer(name, difficulty, notes, index) {
    return { name: name, difficulty: difficulty, notes: chart(notes, difficulty), score: 0, combo: 0, maxCombo: 0, multiplier: 1, rock: 0, hits: 0, misses: 0,
      index: index, keys: new Set(), holds: [], notePool: [[], [], [], [], []], noteUsed: [0, 0, 0, 0, 0], susFree: [[], [], [], [], []], susUsed: [], tick: 0, board: null, panel: null, meter: null, lastSprite: '' };
  }

  /* ------------------------------------------------------------------ HUD */
  function spriteFor(rock) { return SPRITES[Math.min(8, Math.max(0, Math.floor((rock + 20) / 40 * 9)))]; }
  function buildHud() {
    var s = session;
    $('unified-track').textContent = s.title;
    $('unified-players').innerHTML = '';
    s.players.forEach(function (p, i) {
      var panel = document.createElement('div'); panel.className = 'unified-player'; panel.dataset.player = i;
      panel.innerHTML = '<strong class="unified-name">' + escapeHTML(p.name) + '</strong><span class="unified-stats"></span><small class="unified-detail"></small>';
      var meter = document.createElement('div'); meter.className = 'unified-meter'; meter.dataset.player = i;
      meter.innerHTML = '<img alt="PowerMusic — medidor de Rock do ' + escapeHTML(p.name) + '" src="assets/barrinhas/barra0.png">';
      $('unified-players').appendChild(panel); $('unified-players').appendChild(meter);
      p.panel = panel; p.meter = meter; p.statsEl = panel.querySelector('.unified-stats'); p.detailEl = panel.querySelector('.unified-detail'); p.meterImg = meter.querySelector('img');
    });
    hud();
  }
  function hud() {
    if (!session) return;
    session.players.forEach(function (p) {
      p.statsEl.textContent = 'PONTUAÇÃO ' + p.score + ' · SEQUÊNCIA ' + p.combo + ' · X' + p.multiplier;
      p.detailEl.textContent = (DIFFICULTY_LABELS[p.difficulty] || p.difficulty) + ' · ACERTOS ' + p.hits + ' · ERROS ' + p.misses;
      var sp = spriteFor(p.rock);
      if (sp !== p.lastSprite) { p.lastSprite = sp; p.meterImg.src = 'assets/barrinhas/' + sp + '.png'; }   // só troca o src quando o nível muda (sem piscar)
    });
  }
  function toast(p, text) {
    var t = document.createElement('span'); t.className = 'unified-toast'; t.textContent = text; p.panel.appendChild(t);
    setTimeout(function () { t.remove(); }, 1000);
  }
  function screenOf(board, x, z) {
    var v = new THREE.Vector3(x, 0, z); board.group.localToWorld(v); v.project(session.camera);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
  }
  // Posiciona nome/placar acima de cada pista e o PowerMusic ao lado de cada pista (sem cobrir as pistas)
  function layoutHud() {
    var s = session; if (!s) return;
    s.scene.updateMatrixWorld(true);
    var headerH = (document.querySelector('.unified-hud') || { offsetHeight: 64 }).offsetHeight;
    s.players.forEach(function (p, i) {
      var b = p.board, nearC = screenOf(b, 0, 0), farC = screenOf(b, 0, -G.LEN);
      var nl = screenOf(b, -G.HALF - G.RAIL_W, 0), nr = screenOf(b, G.HALF + G.RAIL_W, 0), width = nr.x - nl.x;
      var panel = p.panel, meter = p.meter, mw = Math.max(64, Math.min(96, innerWidth * 0.062));
      panel.style.width = Math.min(Math.max(width * 1.02, 200), 480) + 'px';
      panel.style.left = ((nearC.x + farC.x) / 2) + 'px';
      panel.style.top = Math.max(headerH + 6, farC.y - panel.offsetHeight - 12) + 'px';
      meter.style.width = meter.style.height = mw + 'px';
      if (s.single) { meter.style.left = 'auto'; meter.style.right = Math.max(12, innerWidth * 0.02) + 'px'; meter.style.top = (innerHeight - mw - Math.max(12, innerHeight * 0.02)) + 'px'; }
      else {
        var left = i === 0 ? nl.x - mw - 14 : nr.x + 14;
        meter.style.left = Math.max(6, Math.min(innerWidth - mw - 6, left)) + 'px'; meter.style.right = 'auto';
        meter.style.top = Math.min(innerHeight - mw - 8, nearC.y - mw * 0.55) + 'px';
      }
    });
  }
  function frameCamera() {
    var s = session, aspect = innerWidth / innerHeight;
    if (s.single) {                       // enquadramento legado de uma pista (música importada)
      s.camera.fov = 75; s.camera.aspect = aspect; s.camera.near = 1; s.camera.far = 4000;
      s.camera.position.set(0, 0, 150); s.camera.lookAt(0, -12, -220); s.camera.updateProjectionMatrix();
    } else V.fitCamera(s.camera, aspect, s.offsets);
    s.camera.updateMatrixWorld(true);
  }

  /* ------------------------------------------------------------------ jogo: acertos e erros (lógica preservada) */
  function update(p, hit, lane) {
    var before = p.multiplier;
    if (hit) { p.combo++; p.hits++; p.multiplier = Math.min(4, 1 + Math.floor(p.combo / 10)); p.score += 100 * p.multiplier; p.rock = Math.min(20, p.rock + 1); }
    else { p.combo = 0; p.misses++; p.multiplier = 1; p.rock = Math.max(-20, p.rock - 1); }
    p.maxCombo = Math.max(p.maxCombo, p.combo);
    if (hit) {
      p.board.hit(lane, p.combo >= 10 ? 1.25 : 1);
      var milestone = p.combo > 0 && p.combo % 10 === 0;
      if (milestone) p.board.combo(p.combo);
      if (milestone) toast(p, p.combo + ' SEGUIDAS!' + (p.multiplier > before ? '  X' + p.multiplier : ''));   // um único aviso
      else if (p.multiplier > before) toast(p, 'MULTIPLICADOR X' + p.multiplier);
    }
    else p.board.miss(lane);
    hud();
  }
  function press(p, lane) {
    if (!session || session.state !== 'playing') return;
    var t = session.audio.currentTime, best = null, delta = HIT_WINDOW;
    for (var i = 0; i < p.notes.length; i++) { var n = p.notes[i], d = Math.abs(n.t - t); if (!n.done && n.lane === lane && d < delta) { best = n; delta = d; } }
    if (best) {
      best.done = true; best.hit = true; update(p, true, lane);
      if (best.dur > 0.12) p.holds.push({ note: best, lane: lane, end: best.t + best.dur, state: 'active' });
    } else update(p, false, lane);
  }
  function laneOf(i, e) {
    var k = String(e.key).toLowerCase(), lane = KEYSETS[i].indexOf(k);
    if (lane < 0 && i === 1 && e.code === 'Semicolon') lane = 3;   // tecla Ç em teclados ABNT2 reporta code=Semicolon
    return lane;
  }
  function anyControlKey(e) { return session.players.some(function (p, i) { return laneOf(i, e) >= 0; }); }
  function keyDown(e) {
    var s = session; if (!s) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); if (s.state === 'playing') pause(); else if (s.state === 'paused') resume(); return; }
    if (s.state !== 'playing') return;
    if (anyControlKey(e)) { e.preventDefault(); e.stopImmediatePropagation(); }
    if (e.repeat) return;
    s.players.forEach(function (p, i) { var lane = laneOf(i, e); if (lane < 0) return; p.keys.add(lane); press(p, lane); });
  }
  function keyUp(e) {
    if (!session) return;
    session.players.forEach(function (p, i) { var lane = laneOf(i, e); if (lane >= 0) { e.preventDefault(); e.stopImmediatePropagation(); p.keys.delete(lane); } });
  }

  /* ------------------------------------------------------------------ quadro a quadro */
  function takeNote(p, lane) {
    var pool = p.notePool[lane], idx = p.noteUsed[lane]++;
    if (!pool[idx]) { pool[idx] = V.createNote(lane); p.board.noteLayer.add(pool[idx]); }
    return pool[idx];
  }
  function takeSustain(p, lane) {
    var sus = p.susFree[lane].pop();
    if (!sus) { sus = V.createSustain(lane); sus.lane = lane; p.board.noteLayer.add(sus.group); }
    p.susUsed.push(sus); return sus;
  }
  var lastFrame = 0;
  function frame(now) {
    var s = session; if (!s) return;
    s.raf = requestAnimationFrame(frame);
    var dt = Math.min(0.05, ((now || performance.now()) - (lastFrame || now || performance.now())) / 1000); lastFrame = now || performance.now();
    if (s.state === 'playing') {
      var tt = s.audio.currentTime;
      s.players.forEach(function (p) {
        for (var i = 0; i < p.notes.length; i++) { var n = p.notes[i]; if (!n.done && n.t < tt - MISS_AFTER) { n.done = true; update(p, false, n.lane); } }
      });
      if (s.audio.ended) { finish(); return; }
    }
    var t = s.audio.currentTime;
    s.players.forEach(function (p) {
      var b = p.board, i, n;
      // notas longas em andamento: continuam ativas enquanto a tecla segue pressionada
      for (i = p.holds.length - 1; i >= 0; i--) {
        var h = p.holds[i];
        if (s.state === 'playing') {
          if (t >= h.end) { h.state = 'done'; p.holds.splice(i, 1); }
          else if (!p.keys.has(h.lane)) { h.state = 'dead'; h.note.dead = true; p.holds.splice(i, 1); }
          else if ((p.tick += dt) > 0.07) { p.tick = 0; b.sustainTick(h.lane); }
        }
      }
      for (i = 0; i < 5; i++) b.setPressed(i, p.keys.has(i));
      // reciclar objetos do quadro anterior
      for (i = 0; i < 5; i++) { var pool = p.notePool[i]; for (var k = 0; k < pool.length; k++) pool[k].visible = false; p.noteUsed[i] = 0; }
      p.susUsed.forEach(function (sus) { sus.group.visible = false; p.susFree[sus.lane].push(sus); }); p.susUsed = [];
      var speed = G.LEN / TRAVEL;
      for (i = 0; i < p.notes.length; i++) {
        n = p.notes[i];
        var ahead = n.t - t;
        if (ahead > TRAVEL + 0.05) break;                       // chart ordenado: o resto está além do horizonte
        // nota longa: faixa luminosa ligada à cabeça
        if (n.dur > 0.12 && ahead + n.dur > -MISS_AFTER) {
          var holding = n.hit && !n.dead && t < n.t + n.dur && p.keys.has(n.lane);
          var state = n.hit ? (n.dead ? 'dead' : (holding ? 'active' : (t >= n.t + n.dur ? 'done' : 'dead'))) : (n.done ? 'dead' : 'idle');
          if (state !== 'done') { var sus = takeSustain(p, n.lane); sus.group.position.x = -50 + n.lane * 25; sus.update(-ahead * speed, n.dur * speed, state, dt); }
        }
        // cabeça da nota
        if (!n.done && ahead >= -MISS_AFTER) { var mesh = takeNote(p, n.lane), z = -ahead * speed; mesh.position.set(-50 + n.lane * 25, 0, z); V.fadeNote(mesh, z); mesh.visible = true; }
      }
      b.update(dt);
    });
    s.renderer.render(s.scene, s.camera);
  }

  /* ------------------------------------------------------------------ estados da partida */
  function pause() {
    var s = session; if (!s || s.state !== 'playing') return;
    s.state = 'paused'; s.audio.pause(); s.video.pause(); $('unified-pause').textContent = 'CONTINUAR';
    showPauseDialog();
  }
  /* Pausa e confirmação de saída: MESMO componente visual do jogo original (TuxDialog, em tux-control-deck.js). */
  function showPauseDialog() {
    var D = window.TuxDialog; if (!session || !D) return;
    D.open('JOGO PAUSADO', '<p>A apresentação está pausada. Continue quando estiver pronto.</p>',
      [{ label: 'CONTINUAR', run: resume }, { label: 'REINICIAR', run: function () { restart(); } }, { label: 'VOLTAR AO MENU', run: showExitConfirm }], resume);
  }
  function showExitConfirm() {
    var D = window.TuxDialog; if (!session || !D) return;
    D.open('VOLTAR AO MENU?', '<p>Sua apresentação atual será encerrada. Deseja realmente sair?</p>',
      [{ label: 'CANCELAR', run: showPauseDialog }, { label: 'SAIR DA PARTIDA', run: function () { stop(true); } }], showPauseDialog);
  }
  async function countdown(keepPosition) {
    var s = session; if (!s) return; s.state = 'countdown';
    var token = s.cdToken = (s.cdToken || 0) + 1;   // só a contagem mais recente pode iniciar o áudio
    var words = ['3', '2', '1', 'ROCK!'];
    for (var w = 0; w < words.length; w++) { if (session !== s || s.cdToken !== token) return; showOverlay('<h1>' + words[w] + '</h1>'); await new Promise(function (r) { setTimeout(r, 650); }); }
    if (session !== s || s.cdToken !== token) return; hideOverlay(); $('unified-pause').textContent = 'PAUSAR / ESC';
    if (!keepPosition) s.audio.currentTime = 0;
    try { await s.audio.play(); if (session !== s) { s.audio.pause(); return; } s.video.currentTime = s.audio.currentTime; s.video.play().catch(function () {}); s.state = 'playing'; }
    catch (err) { s.state = 'paused'; showOverlay('<h2>ÁUDIO BLOQUEADO</h2><p>Autorize a reprodução.</p><button id="u-resume">CONTINUAR</button>'); $('u-resume').onclick = resume; }
  }
  function resume() { if (!session) return; if (window.TuxDialog) window.TuxDialog.close(); hideOverlay(); countdown(true); }
  function resetPlayers() {
    session.players.forEach(function (p) {
      p.notes.forEach(function (n) { n.done = false; n.hit = false; n.dead = false; });
      p.score = 0; p.combo = 0; p.multiplier = 1; p.rock = 0; p.hits = 0; p.misses = 0; p.maxCombo = 0; p.keys.clear(); p.holds = [];
    });
  }
  function restart() { if (!session) return; if (window.TuxDialog) window.TuxDialog.close(); session.audio.pause(); session.video.pause(); session.audio.currentTime = 0; session.video.currentTime = 0; resetPlayers(); hud(); countdown(); }
  function finish() {
    var s = session; if (!s) return; s.state = 'results'; s.audio.pause();
    if (typeof s.onFinish === 'function') { try { s.onFinish(s.players); } catch (err) { /* o callback nunca interrompe os resultados */ } }
    var winner = s.players.length === 2 ? (s.players[0].score === s.players[1].score ? 'EMPATE!' : escapeHTML(s.players[0].score > s.players[1].score ? s.players[0].name : s.players[1].name) + ' VENCEU!') : '';
    var rows = s.players.map(function (p) { return '<p><strong>' + escapeHTML(p.name) + '</strong>: ' + p.score + ' pontos · PRECISÃO ' + (p.hits + p.misses ? Math.round(100 * p.hits / (p.hits + p.misses)) : 0) + '% · MAIOR SEQUÊNCIA ' + p.maxCombo + ' · ' + p.hits + ' acertos · ' + p.misses + ' erros</p>'; }).join('');
    showOverlay('<h2>RESULTADOS</h2><h3>' + winner + '</h3>' + rows + '<button id="u-restart">REVANCHE</button><button id="u-exit">VOLTAR AO MENU</button>');
    $('u-restart').onclick = restart; $('u-exit').onclick = function () { stop(true); };
  }
  function stop(back) {
    var s = session; if (!s) return; session = null; cancelAnimationFrame(s.raf);
    if (window.TuxDialog) window.TuxDialog.close();
    s.audio.pause(); s.video.pause(); s.video.classList.remove('unified-background-video'); s.originalVideoParent.insertBefore(s.video, s.originalVideoNext);
    s.audio.removeAttribute('src'); s.audio.load(); if (s.url) URL.revokeObjectURL(s.url);
    s.players.forEach(function (p) { p.board.dispose(); });
    s.renderer.dispose(); s.renderer.domElement.remove(); root.classList.add('hidden'); hideOverlay(); $('unified-players').innerHTML = '';
    document.removeEventListener('keydown', keyDown, true); document.removeEventListener('keyup', keyUp, true); window.removeEventListener('resize', s.resize);
    if (back && s.back) s.back();
  }

  /* ------------------------------------------------------------------ início */
  function start(config) {
    stop(false);
    // Nunca deixar prévia da biblioteca nem o motor original tocando junto com esta partida.
    if (window.TuxPreview) window.TuxPreview.stop();
    if (window.__tuxGame && window.__tuxGame.resetGame) window.__tuxGame.resetGame();
    var isMulti = config.mode === 'multi';
    var defs = config.players || [{ name: 'JOGADOR 1', difficulty: 'MEDIUM' }];
    var players = defs.map(function (p, i) { return makePlayer(p.name || 'JOGADOR ' + (i + 1), p.difficulty || 'MEDIUM', p.notes || config.notes || [], i); });
    var scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 1, 4000);
    var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(innerWidth, innerHeight); renderer.setClearColor(0x000000, 0);
    V.addLights(scene);
    // duas instâncias do MESMO modelo de pista, simétricas em relação ao centro da tela
    var offsets = players.length === 2 ? [-100, 100] : [0];
    players.forEach(function (p, i) {
      p.board = V.createBoard({ anisotropy: renderer.capabilities.getMaxAnisotropy() });
      p.board.group.position.x = offsets[i]; scene.add(p.board.group);
    });
    var video = $('original-show-video');
    if (!video) { renderer.dispose(); throw new Error('Vídeo original não encontrado'); }
    var originalVideoParent = video.parentNode, originalVideoNext = video.nextSibling;
    root.insertBefore(video, $('unified-render')); video.classList.add('unified-background-video'); video.pause(); video.currentTime = 0;
    var audio = document.createElement('audio'); audio.preload = 'auto';
    var url = config.file ? URL.createObjectURL(config.file) : null; audio.src = url || config.src; audio.volume = 0.8;
    root.classList.remove('hidden'); $('unified-render').replaceChildren(renderer.domElement);
    session = { players: players, offsets: offsets, single: players.length === 1, scene: scene, camera: camera, renderer: renderer, audio: audio, url: url, video: video, originalVideoParent: originalVideoParent, originalVideoNext: originalVideoNext,
      title: config.title || 'TUX HERO', back: config.back, onFinish: config.onFinish, state: 'countdown', raf: 0 };
    session.resize = function () { renderer.setSize(innerWidth, innerHeight); frameCamera(); layoutHud(); };
    window.addEventListener('resize', session.resize);
    document.addEventListener('keydown', keyDown, true); document.addEventListener('keyup', keyUp, true);
    $('unified-pause').onclick = function () { if (session) { if (session.state === 'paused') resume(); else pause(); } };
    buildHud(); frameCamera(); layoutHud(); lastFrame = 0; frame(); countdown();
    return true;
  }

  window.TuxUnified3D = {
    start: start, stop: stop, isActive: function () { return !!session; }, originalChart: originalChart,
    debug: function () {
      return session && { state: session.state, time: session.audio.currentTime, boards: session.players.length,
        camera: { fov: session.camera.fov, pos: session.camera.position.toArray() },
        players: session.players.map(function (p) { return { name: p.name, difficulty: p.difficulty, score: p.score, combo: p.combo, multiplier: p.multiplier, rock: p.rock, hits: p.hits, misses: p.misses, notes: p.notes.length, keys: Array.from(p.keys), holds: p.holds.length }; }) };
    },
    testHit: function (player, lane) { if (session && session.players[player]) press(session.players[player], lane); }
  };
})();
