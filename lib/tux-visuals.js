/* TUX HERO — módulo visual 3D compartilhado (Jogo Rápido + Multijogador).
 *
 * Contém SOMENTE aparência: pista (guitarra), botões, notas, notas longas, efeitos de acerto,
 * luzes e um solver de enquadramento. Não contém lógica de pontuação, julgamento ou áudio.
 *
 * Uso:  const V = window.TuxVisuals.create(THREE);   // THREE = a mesma cópia usada pelo renderer
 *
 * Sistema de coordenadas da pista ("frame local"):
 *   x  = através da pista (as 5 faixas ficam em x = -50, -25, 0, 25, 50)
 *   y  = normal da superfície (para cima, em direção à câmera)
 *   z  = ao longo da pista: z = 0 é a linha de acerto; z = -LEN é o fundo.
 * O frame inteiro é inclinado por TILT e posicionado em (0,-75,0), o que reproduz exatamente a
 * geometria original do Jogo Rápido (fundo em y=50,z=-500; linha de acerto em y=-75,z=0).
 */
(function (root) {
  'use strict';

  var LANE_COLORS = [0x00e83b, 0xff1744, 0xffeb00, 0x168cff, 0xff8a00];
  var LANE_X = [-50, -25, 0, 25, 50];
  var HALF = 62.5;                                  // meia-largura jogável
  var LEN = Math.sqrt(125 * 125 + 500 * 500);       // comprimento da pista (≈515.4)
  var TILT = Math.atan(125 / 500);                  // inclinação do frame
  var RAIL_W = 6.4;
  var NOTE_R = 8.4;

  function readQuality() {
    try {
      var s = JSON.parse(localStorage.getItem('tuxHeroSettings') || '{}');
      return (s.visuals === 'LOW' || s.visuals === 'MEDIUM') ? s.visuals : 'HIGH';
    } catch (e) { return 'HIGH'; }
  }

  function create(THREE) {
    var quality = readQuality();
    var Q = { LOW: { sparks: 10, flames: false, aniso: 2 }, MEDIUM: { sparks: 22, flames: true, aniso: 4 }, HIGH: { sparks: 40, flames: true, aniso: 8 } }[quality];
    var textures = {};          // cache de texturas (por instância de THREE)
    var geo = {};               // cache de geometrias compartilhadas

    function hex(c) { return '#' + ('000000' + c.toString(16)).slice(-6); }
    function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
    function tex(c) { var t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t; }
    function rand(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

    /* ---------------------------------------------------------------- texturas */
    function boardTexture() {
      if (textures.board) return textures.board;
      var W = 512, H = 2048, c = canvas(W, H), x = c.getContext('2d'), r = rand(42);
      // grafite base: mais claro perto do jogador, mais escuro ao fundo
      var g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0b0a10'); g.addColorStop(0.55, '#121019'); g.addColorStop(1, '#1d1828');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      // trama discreta de fibra de carbono
      x.globalAlpha = 0.05; x.fillStyle = '#ffffff';
      for (var yy = 0; yy < H; yy += 12) for (var xx = ((yy / 12) % 2) * 6; xx < W; xx += 12) x.fillRect(xx, yy, 6, 6);
      x.globalAlpha = 1;
      // faixas alternadas levemente mais claras + brilho de cor por faixa
      for (var i = 0; i < 5; i++) {
        var lx = i * W / 5;
        if (i % 2 === 0) { x.fillStyle = 'rgba(255,255,255,0.025)'; x.fillRect(lx, 0, W / 5, H); }
        var lg = x.createLinearGradient(lx, 0, lx + W / 5, 0);
        var col = hex(LANE_COLORS[i]);
        lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(0.5, col); lg.addColorStop(1, 'rgba(0,0,0,0)');
        x.globalAlpha = 0.055; x.fillStyle = lg; x.fillRect(lx, 0, W / 5, H); x.globalAlpha = 1;
      }
      // ornamento: chevrons roxos apontando para o jogador + estrelas tribais
      x.lineJoin = 'miter';
      for (var k = 0; k < 17; k++) {
        var cy = 90 + k * 118, depth = 34;
        x.lineWidth = 7; x.strokeStyle = 'rgba(150,80,235,' + (0.10 + 0.05 * (k % 2)) + ')';
        x.beginPath(); x.moveTo(26, cy); x.lineTo(W / 2, cy + depth); x.lineTo(W - 26, cy); x.stroke();
        x.lineWidth = 2.5; x.strokeStyle = 'rgba(210,170,255,0.09)';
        x.beginPath(); x.moveTo(26, cy + 16); x.lineTo(W / 2, cy + 16 + depth); x.lineTo(W - 26, cy + 16); x.stroke();
      }
      function star(cx, cy, R, rr, n, rot) {
        x.beginPath();
        for (var s = 0; s < n * 2; s++) { var a = rot + s * Math.PI / n, rad = s % 2 ? rr : R; x.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); }
        x.closePath();
      }
      for (var s2 = 0; s2 < 10; s2++) {
        var sx = (s2 % 2 ? 0.3 : 0.7) * W, sy = 150 + s2 * 190;
        x.fillStyle = 'rgba(120,60,200,0.10)'; star(sx, sy, 34, 13, 4, Math.PI / 4); x.fill();
        x.strokeStyle = 'rgba(190,140,255,0.10)'; x.lineWidth = 2; star(sx, sy, 34, 13, 4, Math.PI / 4); x.stroke();
      }
      // riscos finos (acabamento escovado)
      x.strokeStyle = 'rgba(255,255,255,0.035)'; x.lineWidth = 1;
      for (var n = 0; n < 150; n++) { var px = r() * W, py = r() * H; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - .5) * 30, py + r() * 90); x.stroke(); }
      // faixa de luz perto da linha de acerto
      var hg = x.createLinearGradient(0, H - 330, 0, H);
      hg.addColorStop(0, 'rgba(160,110,255,0)'); hg.addColorStop(1, 'rgba(160,110,255,0.13)');
      x.fillStyle = hg; x.fillRect(0, H - 330, W, 330);
      // opacidade: o fundo se funde com o vídeo, a parte jogável fica bem legível
      x.globalCompositeOperation = 'destination-in';
      var ag = x.createLinearGradient(0, 0, 0, H);
      ag.addColorStop(0, 'rgba(0,0,0,0)'); ag.addColorStop(0.16, 'rgba(0,0,0,0.5)'); ag.addColorStop(0.45, 'rgba(0,0,0,0.86)'); ag.addColorStop(1, 'rgba(0,0,0,0.95)');
      x.fillStyle = ag; x.fillRect(0, 0, W, H);
      var t = tex(c); t.anisotropy = Q.aniso; return (textures.board = t);
    }

    function sheenTexture() {      // reflexo suave diagonal sobre a pista
      if (textures.sheen) return textures.sheen;
      var c = canvas(256, 512), x = c.getContext('2d');
      var g = x.createLinearGradient(0, 0, 256, 120);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.42, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.55)'); g.addColorStop(0.58, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 256, 512);
      x.globalCompositeOperation = 'destination-in';
      var v = x.createLinearGradient(0, 0, 0, 512); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.7, 'rgba(0,0,0,0.6)'); v.addColorStop(1, 'rgba(0,0,0,1)');
      x.fillStyle = v; x.fillRect(0, 0, 256, 512);
      return (textures.sheen = tex(c));
    }

    function fadeTexture() {       // alphaMap: opaco perto da linha de acerto, some no fundo
      if (textures.fade) return textures.fade;
      var c = canvas(4, 256), x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, '#000'); g.addColorStop(0.14, '#222'); g.addColorStop(0.5, '#bbb'); g.addColorStop(1, '#fff');
      x.fillStyle = g; x.fillRect(0, 0, 4, 256); return (textures.fade = tex(c));
    }
    function glowTexture() {
      if (textures.glow) return textures.glow;
      var c = canvas(128, 128), x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.65)'); g.addColorStop(0.6, 'rgba(255,255,255,0.15)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 128, 128); return (textures.glow = tex(c));
    }
    function ringTexture() {
      if (textures.ring) return textures.ring;
      var c = canvas(128, 128), x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 34, 64, 64, 62);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.55, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 128, 128); return (textures.ring = tex(c));
    }
    function sparkTexture() {
      if (textures.spark) return textures.spark;
      var c = canvas(32, 32), x = c.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 32, 32); return (textures.spark = tex(c));
    }
    function flameTexture() {       // chama estilizada (gota), branca no núcleo
      if (textures.flame) return textures.flame;
      var c = canvas(64, 128), x = c.getContext('2d');
      var g = x.createRadialGradient(32, 92, 2, 32, 84, 54);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.75)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g;
      x.beginPath(); x.moveTo(32, 4); x.bezierCurveTo(50, 40, 62, 70, 54, 98); x.bezierCurveTo(48, 122, 16, 122, 10, 98); x.bezierCurveTo(2, 70, 16, 44, 32, 4); x.fill();
      return (textures.flame = tex(c));
    }

    /* ---------------------------------------------------------------- materiais */
    function chromeMat(color, shin) {
      return new THREE.MeshPhongMaterial({ color: color || 0xbfc4d6, specular: 0xffffff, shininess: shin || 140, emissive: 0x191a26 });
    }
    var sharedMats = null;
    function mats() {
      if (sharedMats) return sharedMats;
      sharedMats = {
        chrome: chromeMat(0xc9cddd, 160),
        rail: chromeMat(0x8d93ab, 120),
        white: new THREE.MeshPhongMaterial({ color: 0xffffff, specular: 0xffffff, shininess: 160, emissive: 0x30303a }),
        shadow: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false }),
        body: LANE_COLORS.map(function (c) { return new THREE.MeshPhongMaterial({ color: c, specular: 0xffffff, shininess: 120, emissive: c, emissiveIntensity: 0.32 }); })
      };
      return sharedMats;
    }

    /* ---------------------------------------------------------------- geometrias */
    function lathe(points, seg) {
      return new THREE.LatheGeometry(points.slice().reverse().map(function (p) { return new THREE.Vector2(p[0], p[1]); }), seg || 36);
    }
    function mergeInto(target, g, matIndex, m4) {
      var mm = m4 || new THREE.Matrix4();
      target.merge(g, mm, matIndex);
    }
    function noteGeometry() {
      if (geo.note) return geo.note;
      var G = new THREE.Geometry();
      // corpo colorido (com borda arredondada)
      mergeInto(G, lathe([[0, 2.7], [5.2, 2.75], [7.3, 2.45], [8.2, 1.7], [8.45, 0.8], [8.3, 0.1], [0, 0.1]], 40), 0);
      // aro cromado externo
      var tor = new THREE.TorusGeometry(8.25, 0.6, 10, 40); tor.rotateX(-Math.PI / 2); tor.translate(0, 1.15, 0);
      mergeInto(G, tor, 1);
      // cúpula branca brilhante ("tampa") com anel escuro interno
      mergeInto(G, lathe([[0, 3.6], [1.8, 3.5], [3.1, 3.1], [3.6, 2.6], [3.6, 2.6], [0, 2.6]], 32), 2);
      // sombra projetada
      var sh = new THREE.CircleGeometry(10.2, 28); sh.rotateX(-Math.PI / 2); sh.translate(0.8, -0.2, -1.6);
      mergeInto(G, sh, 3);
      geo.note = new THREE.BufferGeometry().fromGeometry(G);
      return geo.note;
    }
    function noteMaterials(lane) {
      var m = mats(); return [m.body[lane], m.chrome, m.white, m.shadow];
    }

    /* ---------------------------------------------------------------- notas, batidas */
    function createNote(lane) {
      var mesh = new THREE.Mesh(noteGeometry(), noteMaterials(lane));
      mesh.userData.lane = lane; mesh.scale.setScalar(1.08);
      return mesh;
    }
    // reduz a nota quando ela surge no fundo da pista (entrada suave, sem "pop")
    function fadeNote(mesh, z) {
      var k = Math.max(0, Math.min(1, (z + LEN) / (LEN * 0.14)));
      mesh.scale.setScalar(1.08 * (0.3 + 0.7 * k));
    }
    function createBeatLine(strong) {
      if (!geo.beat) { geo.beat = new THREE.BoxGeometry(2 * HALF, 0.35, strong ? 1.1 : 0.7); geo.beatS = new THREE.BoxGeometry(2 * HALF, 0.35, 1.1); geo.beatW = new THREE.BoxGeometry(2 * HALF, 0.35, 0.6); }
      if (!mats().beatStrong) {
        sharedMats.beatStrong = new THREE.MeshBasicMaterial({ color: 0x9a7cff, transparent: true, opacity: 0.55, depthWrite: false });
        sharedMats.beatWeak = new THREE.MeshBasicMaterial({ color: 0x4a3f8a, transparent: true, opacity: 0.4, depthWrite: false });
      }
      var m = new THREE.Mesh(strong ? geo.beatS : geo.beatW, strong ? sharedMats.beatStrong : sharedMats.beatWeak);
      m.position.y = 0.45; m.renderOrder = 2; return m;
    }

    /* ---------------------------------------------------------------- notas longas */
    function createSustain(lane) {
      var color = LANE_COLORS[lane];
      if (!geo.sustBox) {
        geo.sustBox = new THREE.BoxGeometry(2.6, 1.3, 1); geo.sustBox.translate(0, 0.65, -0.5);
        geo.sustPlane = new THREE.PlaneGeometry(1, 1); geo.sustPlane.rotateX(-Math.PI / 2); geo.sustPlane.translate(0, 0.1, -0.5);
      }
      var group = new THREE.Group();
      var core = new THREE.Mesh(geo.sustBox, new THREE.MeshPhongMaterial({ color: color, emissive: color, emissiveIntensity: 0.65, specular: 0xffffff, shininess: 90 }));
      var inner = new THREE.Mesh(geo.sustBox, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
      inner.scale.x = 0.34; inner.position.y = 0.18;
      var glow = new THREE.Mesh(geo.sustPlane, new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.scale.x = 11; glow.renderOrder = 4;
      group.add(glow); group.add(core); group.add(inner);
      var api = {
        group: group, length: 0, state: 'idle', pulse: Math.random() * 6,
        // headZ = posição z da cabeça da nota (z<0 antes da linha); len = comprimento da nota longa
        update: function (headZ, len, state, dt) {
          this.state = state; this.pulse += dt * 14;
          var tail = headZ - len, near, far = Math.max(tail, -LEN);
          if (state === 'active') near = Math.min(headZ, 0);      // consumida na linha de acerto
          else near = Math.min(headZ, 7);                          // errada/solta: segue até sair
          var vis = near - far;
          group.visible = vis > 0.3;
          if (!group.visible) return;
          group.position.z = near;
          core.scale.z = inner.scale.z = glow.scale.z = vis;
          var act = state === 'active', dead = state === 'dead';
          core.material.emissiveIntensity = act ? 0.78 + Math.sin(this.pulse) * 0.18 : (dead ? 0.0 : 0.45);
          core.material.color.setHex(dead ? 0x555560 : color);
          core.material.emissive.setHex(dead ? 0x14141a : color);
          inner.material.opacity = act ? 0.85 : (dead ? 0.1 : 0.45);
          glow.material.opacity = act ? 0.5 + Math.sin(this.pulse) * 0.1 : (dead ? 0.02 : 0.16);
          glow.scale.x = act ? 15 : 11;
        },
        dispose: function () { core.material.dispose(); inner.material.dispose(); glow.material.dispose(); }
      };
      return api;
    }

    /* ---------------------------------------------------------------- botões */
    function createButton(lane) {
      var color = LANE_COLORS[lane];
      var group = new THREE.Group(), inner = new THREE.Group(); group.add(inner); group.scale.setScalar(0.85);
      if (!geo.btn) {
        geo.btnSocket = lathe([[0, 0.2], [12.4, 0.2], [12.6, 0.9], [12.2, 1.2], [0, 1.2]], 40);
        geo.btnChrome = new THREE.TorusGeometry(11.2, 1.25, 12, 48); geo.btnChrome.rotateX(-Math.PI / 2);
        // anel colorido grosso com borda arredondada
        geo.btnRing = lathe([[6.6, 0.8], [7.4, 2.5], [9.3, 2.9], [10.4, 2.3], [10.7, 1.4], [10.4, 0.8]], 44);
        // miolo (cúpula escura brilhante) e aro interno
        geo.btnCap = lathe([[0, 2.55], [2.6, 2.5], [4.8, 2.1], [6.3, 1.5], [6.6, 0.8], [0, 0.8]], 36);
        geo.btn = true;
      }
      var matSocket = new THREE.MeshPhongMaterial({ color: 0x07070b, specular: 0x222233, shininess: 40 });
      var matChrome = chromeMat(0xd2d6e6, 170);
      var matRing = new THREE.MeshPhongMaterial({ color: color, specular: 0xffffff, shininess: 130, emissive: color, emissiveIntensity: 0.28 });
      var matCap = new THREE.MeshPhongMaterial({ color: 0x2b2d3d, specular: 0xd8dcf5, shininess: 170, emissive: color, emissiveIntensity: 0.05 });
      var socket = new THREE.Mesh(geo.btnSocket, matSocket); socket.position.y = -0.2; group.add(socket);
      var chrome = new THREE.Mesh(geo.btnChrome, matChrome); chrome.position.y = 1.4; inner.add(chrome);
      var ring = new THREE.Mesh(geo.btnRing, matRing); inner.add(ring);
      var cap = new THREE.Mesh(geo.btnCap, matCap); inner.add(cap);
      // halo de luz colorido sob o botão (aparece ao pressionar/acertar)
      var halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, opacity: 0 }));
      halo.scale.set(40, 40, 1); halo.position.y = 3; halo.renderOrder = 19; group.add(halo);

      var state = { pressed: false, press: 0, hit: 0, miss: 0 };
      return {
        group: group, lane: lane,
        setPressed: function (p) { state.pressed = !!p; },
        hit: function () { state.hit = 1; },
        miss: function () { state.miss = 1; },
        update: function (dt) {
          var target = state.pressed ? 1 : 0;
          state.press += (target - state.press) * Math.min(1, dt * 28);
          state.hit = Math.max(0, state.hit - dt * 3.4); state.miss = Math.max(0, state.miss - dt * 3.2);
          inner.position.y = -1.5 * state.press + state.hit * 0.6;                    // afunda ao pressionar
          var sc = 1 - 0.035 * state.press + state.hit * 0.09; inner.scale.set(sc, 1, sc);
          var e = 0.28 + state.press * 0.55 + state.hit * 0.8;
          matRing.emissiveIntensity = e;
          if (state.miss > 0) { matRing.emissive.setRGB(1, 0.05, 0.05); matRing.emissiveIntensity = 0.28 + state.miss * 1.1; }
          else matRing.emissive.setHex(color);
          matCap.emissiveIntensity = 0.05 + state.press * 0.55 + state.hit * 1.0;
          matCap.emissive.setHex(state.miss > 0 ? 0xff1010 : color);
          halo.material.opacity = Math.min(1, state.press * 0.45 + state.hit * 0.8 + state.miss * 0.5);
          halo.material.color.setHex(state.miss > 0.05 && state.hit < 0.05 ? 0xff2020 : color);
        },
        dispose: function () { matSocket.dispose(); matChrome.dispose(); matRing.dispose(); matCap.dispose(); halo.material.dispose(); }
      };
    }

    /* ---------------------------------------------------------------- efeitos de acerto */
    function createEffects(parent) {
      var group = new THREE.Group(); group.position.z = 3; parent.add(group);
      function sprite(map, color, depthTest) {
        var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: map, color: color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: !!depthTest, opacity: 0 }));
        s.visible = false; s.renderOrder = 20; group.add(s); return s;
      }
      var flares = [], rings = [], flames = [], sparks = [], i;
      for (i = 0; i < 5; i++) {
        flares.push({ s: sprite(glowTexture(), LANE_COLORS[i]), t: 1 });
        rings.push({ s: sprite(ringTexture(), LANE_COLORS[i]), t: 1 });
        if (Q.flames) flames.push({ s: sprite(flameTexture(), LANE_COLORS[i]), t: 1 });
      }
      var core = [];   // núcleo branco do clarão
      for (i = 0; i < 5; i++) core.push({ s: sprite(glowTexture(), 0xffffff), t: 1 });
      for (i = 0; i < Q.sparks; i++) sparks.push({ s: sprite(sparkTexture(), 0xffffff), life: 0, max: 1, vx: 0, vy: 0, vz: 0, lane: 0 });
      var next = 0;

      function emitSpark(lane, speed) {
        var p = sparks[next++ % sparks.length], a = Math.random() * Math.PI * 2;
        p.life = p.max = 0.28 + Math.random() * 0.3; p.lane = lane;
        p.vx = Math.cos(a) * (18 + Math.random() * 38) * speed; p.vy = (45 + Math.random() * 80) * speed; p.vz = -Math.abs(Math.sin(a)) * (10 + Math.random() * 40) * speed;
        p.s.position.set(LANE_X[lane] + (Math.random() - .5) * 8, 4, -1); p.s.visible = true;
        p.s.material.color.setHex(Math.random() < 0.45 ? 0xffffff : LANE_COLORS[lane]);
      }
      function place(o, lane, y) { o.s.position.set(LANE_X[lane], y, 0); o.s.visible = true; o.t = 0; }

      return {
        hit: function (lane, power) {
          power = power || 1;
          place(flares[lane], lane, 4); place(core[lane], lane, 4); place(rings[lane], lane, 2.5);
          if (flames[lane]) place(flames[lane], lane, 8);
          var n = Math.round((Q.sparks > 20 ? 7 : 4) * power);
          for (var k = 0; k < n; k++) emitSpark(lane, 1);
        },
        sustain: function (lane) { emitSpark(lane, 0.55); if (flames[lane] && flames[lane].t > 0.7) { place(flames[lane], lane, 8); flames[lane].t = 0.35; } },
        combo: function (level) { for (var l = 0; l < 5; l++) { place(rings[l], l, 2.5); rings[l].t = 0; for (var k = 0; k < 3; k++) emitSpark(l, 1.15); } },
        update: function (dt) {
          var o, k, t;
          for (k = 0; k < 5; k++) {
            o = flares[k]; if (o.t < 1) { o.t += dt / 0.3; t = Math.min(1, o.t); o.s.material.opacity = (1 - t) * 0.95; var s1 = 16 + 28 * Math.sqrt(t); o.s.scale.set(s1, s1, 1); if (t >= 1) o.s.visible = false; }
            o = core[k]; if (o.t < 1) { o.t += dt / 0.2; t = Math.min(1, o.t); o.s.material.opacity = (1 - t); var s2 = 10 + 14 * t; o.s.scale.set(s2, s2, 1); if (t >= 1) o.s.visible = false; }
            o = rings[k]; if (o.t < 1) { o.t += dt / 0.38; t = Math.min(1, o.t); o.s.material.opacity = (1 - t) * 0.9; var s3 = 20 + 44 * t; o.s.scale.set(s3, s3, 1); if (t >= 1) o.s.visible = false; }
            o = flames[k]; if (o) { if (o.t < 1) { o.t += dt / 0.5; t = Math.min(1, o.t); o.s.material.opacity = (1 - t) * 0.8; o.s.scale.set(17 - 7 * t, 22 + 18 * Math.sqrt(t), 1); o.s.position.y = 8 + 9 * t; if (t >= 1) o.s.visible = false; } }
          }
          for (k = 0; k < sparks.length; k++) {
            o = sparks[k]; if (o.life <= 0) continue;
            o.life -= dt; if (o.life <= 0) { o.s.visible = false; continue; }
            o.vy -= 210 * dt; var p = o.s.position; p.x += o.vx * dt; p.y += o.vy * dt; p.z += o.vz * dt;
            if (p.y < 1) { p.y = 1; o.vy *= -0.3; }
            var f = o.life / o.max; o.s.material.opacity = f; var sz = 1.8 + 2.6 * f; o.s.scale.set(sz, sz, 1);
          }
        }
      };
    }

    /* ---------------------------------------------------------------- pista completa */
    function createBoard(opts) {
      opts = opts || {};
      var frame = new THREE.Group(); frame.rotation.x = TILT; frame.position.y = -75;
      var m = mats();

      // superfície com textura grafite/roxa
      var sg = new THREE.Geometry();
      sg.vertices.push(new THREE.Vector3(-HALF, 0, -LEN), new THREE.Vector3(HALF, 0, -LEN), new THREE.Vector3(HALF, 0, 6), new THREE.Vector3(-HALF, 0, 6));
      sg.faces.push(new THREE.Face3(0, 3, 2), new THREE.Face3(0, 2, 1));
      sg.faceVertexUvs[0].push([new THREE.Vector2(0, 1), new THREE.Vector2(0, 0), new THREE.Vector2(1, 0)], [new THREE.Vector2(0, 1), new THREE.Vector2(1, 0), new THREE.Vector2(1, 1)]);
      sg.computeFaceNormals(); sg.uvsNeedUpdate = true;
      var surfTex = boardTexture(); if (opts.anisotropy) surfTex.anisotropy = Math.min(Q.aniso, opts.anisotropy);
      var surface = new THREE.Mesh(sg, new THREE.MeshPhongMaterial({ map: surfTex, transparent: true, specular: 0x171226, shininess: 40, side: THREE.DoubleSide, depthWrite: false }));
      surface.renderOrder = 0; frame.add(surface);

      // reflexo suave
      var sheenG = new THREE.PlaneGeometry(2 * HALF, LEN * 0.8); sheenG.rotateX(-Math.PI / 2); sheenG.translate(0, 0.25, -LEN * 0.4);
      var sheen = new THREE.Mesh(sheenG, new THREE.MeshBasicMaterial({ map: sheenTexture(), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
      sheen.renderOrder = 1; frame.add(sheen);

      // brilho de cada faixa (linhas das cordas)
      var fade = fadeTexture();
      LANE_X.forEach(function (lx, i) {
        var g = new THREE.PlaneGeometry(0.8, LEN); g.rotateX(-Math.PI / 2); g.translate(lx, 0.3, -LEN / 2);
        var s = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: LANE_COLORS[i], alphaMap: fade, transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false }));
        s.renderOrder = 1; frame.add(s);
      });

      // divisórias metálicas (4 internas) com dissolução no fundo
      var divG = new THREE.PlaneGeometry(1.1, LEN); divG.rotateX(-Math.PI / 2); divG.translate(0, 0.4, -LEN / 2);
      var divMat = new THREE.MeshBasicMaterial({ color: 0xcfd3e6, alphaMap: fade, transparent: true, opacity: 0.8, depthWrite: false });
      for (var d = 1; d <= 4; d++) { var dv = new THREE.Mesh(divG, divMat); dv.position.x = -HALF + d * 25; dv.renderOrder = 2; frame.add(dv); }

      // trilhos laterais metálicos 3D, em segmentos que dissolvem no fundo, com filete neon roxo
      var SEG = 10, segLen = (LEN + 4) / SEG, rails = [], neonMats = [];
      var railG = new THREE.BoxGeometry(RAIL_W, 3.6, segLen); railG.translate(0, 1.8, 0);
      var topG = new THREE.BoxGeometry(1.2, 0.5, segLen); topG.translate(0, 3.85, 0);
      for (var sg2 = 0; sg2 < SEG; sg2++) {
        var fz = sg2 / (SEG - 1), op = fz < 0.45 ? 1 : Math.max(0, 1 - (fz - 0.45) / 0.55);
        var rm = new THREE.MeshPhongMaterial({ color: 0x575c78, specular: 0xffffff, shininess: 110, emissive: 0x10111f, transparent: op < 1, opacity: Math.max(0.04, op), depthWrite: op >= 1 });
        var nm = new THREE.MeshBasicMaterial({ color: 0x9a5bff, transparent: op < 1, opacity: Math.max(0.04, op), depthWrite: op >= 1 });
        neonMats.push(nm); rails.push(rm);
        [-1, 1].forEach(function (sd) {
          var rail = new THREE.Mesh(railG, rm), top = new THREE.Mesh(topG, nm), zc = 2 - segLen * (sg2 + 0.5);
          rail.position.set(sd * (HALF + RAIL_W / 2 - 0.4), 0, zc); top.position.set(sd * (HALF + RAIL_W / 2 - 1.6 * 1), 0, zc);
          if (op < 1) { rail.renderOrder = top.renderOrder = 3; }
          frame.add(rail); frame.add(top);
        });
      }
      // barra da linha de acerto
      var hitG = new THREE.BoxGeometry(2 * HALF + 2 * RAIL_W - 1, 0.8, 1.2); hitG.translate(0, 0.4, 0);
      var hitBar = new THREE.Mesh(hitG, new THREE.MeshPhongMaterial({ color: 0xe8e8f4, emissive: 0x6a5aa0, specular: 0xffffff, shininess: 120 }));
      hitBar.position.z = -10.8; frame.add(hitBar);

      // botões
      var buttons = [];
      for (var i = 0; i < 5; i++) {
        var b = createButton(i); b.group.position.set(LANE_X[i], 0, 3); frame.add(b.group); buttons.push(b);
      }
      var noteLayer = new THREE.Group(); frame.add(noteLayer);
      var fx = createEffects(frame);

      var neonMat = { dummy: 1 }, railGlow = 0, board = {
        group: frame, noteLayer: noteLayer, buttons: buttons, fx: fx,
        setPressed: function (lane, p) { buttons[lane].setPressed(p); },
        hit: function (lane, power) { buttons[lane].hit(); fx.hit(lane, power); },
        miss: function (lane) { buttons[lane].miss(); },
        sustainTick: function (lane) { fx.sustain(lane); buttons[lane].hit(); },
        combo: function (level) { railGlow = 1; fx.combo(level); },
        update: function (dt) {
          for (var k = 0; k < 5; k++) buttons[k].update(dt);
          fx.update(dt);
          if (railGlow > 0) { railGlow = Math.max(0, railGlow - dt * 1.6); neonMats.forEach(function (n) { n.color.setRGB(0.6 + 0.4 * railGlow, 0.36 + 0.55 * railGlow, 1); }); rails.forEach(function (r) { r.emissive.setRGB(0.08 + 0.5 * railGlow, 0.08 + 0.25 * railGlow, 0.16 + 0.7 * railGlow); }); }
        },
        dispose: function () { buttons.forEach(function (b) { b.dispose(); }); neonMats.forEach(function (n) { n.dispose(); }); rails.forEach(function (r) { r.dispose(); }); divMat.dispose(); sg.dispose(); surface.material.dispose(); }
      };
      return board;
    }

    /* ---------------------------------------------------------------- luzes */
    function addLights(scene) {
      var amb = new THREE.AmbientLight(0xa99cd0, 0.42); scene.add(amb);
      var key = new THREE.DirectionalLight(0xffffff, 0.8); key.position.set(-80, 220, 260); scene.add(key);
      var rim = new THREE.DirectionalLight(0xa070ff, 0.45); rim.position.set(160, 120, -120); scene.add(rim);
      var fill = new THREE.PointLight(0xff8fd8, 0.4, 900); fill.position.set(0, 90, 120); scene.add(fill);
      return [amb, key, rim, fill];
    }

    /* ---------------------------------------------------------------- enquadramento (multijogador) */
    var fitCache = {};
    function fitCamera(camera, aspect, offsets, opt) {
      opt = opt || {};
      var tx = opt.outerX || 0.80, tNear = opt.nearY != null ? opt.nearY : -0.62, tFar = opt.farY != null ? opt.farY : 0.20, tRatio = opt.farRatio || 0.52;
      var outer = Math.max.apply(null, offsets.map(Math.abs)) + HALF + RAIL_W;
      var key = [aspect.toFixed(3), outer, tx, tNear, tFar, tRatio].join('|');
      if (!fitCache[key]) {
        var v = new THREE.Vector3(), best = { e: 1e12 };
        var cam = new THREE.PerspectiveCamera(50, aspect, 1, 4000);
        var ca = Math.cos(TILT), sa = Math.sin(TILT);
        function aimY(z) { return -75 + (-z / ca) * sa; }   // altura da superfície da pista em z
        function pt(x, s) { return v.set(x, -75 + s * sa, -s * ca); }   // s = distância ao longo da pista
        function err(fov, cy, cz, tz) {
          cam.fov = fov; cam.updateProjectionMatrix(); cam.position.set(0, cy, cz); cam.lookAt(0, aimY(tz), tz); cam.updateMatrixWorld(true);
          var a = pt(outer, 0).clone().project(cam), b = pt(0, 0).clone().project(cam), c = pt(0, LEN).clone().project(cam), d = pt(outer, LEN).clone().project(cam);
          var ratio = d.x / a.x;
          return Math.pow(a.x - tx, 2) * 3 + Math.pow(b.y - tNear, 2) * 3 + Math.pow(c.y - tFar, 2) * 3 + Math.pow(ratio - tRatio, 2) * 1.2;
        }
        var fov, cy, cz, tz, e;
        for (fov = 30; fov <= 60; fov += 5) for (cz = 120; cz <= 760; cz += 20) for (cy = 30; cy <= 340; cy += 15) for (tz = -460; tz <= -40; tz += 30) {
          e = err(fov, cy, cz, tz); if (e < best.e) best = { e: e, fov: fov, cy: cy, cz: cz, tz: tz };
        }
        var steps = [[2.5, 8, 5, 8], [1, 3, 2, 3]];
        steps.forEach(function (st) {
          var c0 = { fov: best.fov, cy: best.cy, cz: best.cz, tz: best.tz };
          for (var a = -2; a <= 2; a++) for (var b = -2; b <= 2; b++) for (var c = -2; c <= 2; c++) for (var dd = -2; dd <= 2; dd++) {
            var f = c0.fov + a * st[0], y = c0.cy + b * st[1], z = c0.cz + c * st[2], t = c0.tz + dd * st[3];
            e = err(f, y, z, t); if (e < best.e) best = { e: e, fov: f, cy: y, cz: z, tz: t };
          }
        });
        fitCache[key] = best;
      }
      var f = fitCache[key];
      camera.aspect = aspect; camera.fov = f.fov; camera.near = 1; camera.far = 4000;
      camera.position.set(0, f.cy, f.cz); camera.lookAt(0, -75 + (-f.tz / Math.cos(TILT)) * Math.sin(TILT), f.tz); camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
      return f;
    }

    return {
      THREE: THREE, G: { LANE_X: LANE_X, HALF: HALF, LEN: LEN, TILT: TILT, RAIL_W: RAIL_W, NOTE_R: NOTE_R }, LANE_COLORS: LANE_COLORS, quality: quality,
      createBoard: createBoard, createNote: createNote, fadeNote: fadeNote, createBeatLine: createBeatLine, createSustain: createSustain,
      createButton: createButton, addLights: addLights, fitCamera: fitCamera
    };
  }

  root.TuxVisuals = { create: create, LANE_COLORS: LANE_COLORS };
})(window);
