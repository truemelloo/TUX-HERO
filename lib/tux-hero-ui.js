(function () {
  'use strict';
  var intro = document.getElementById('intro-screen');
  var video = document.getElementById('intro-video');
  var menu = document.getElementById('menu-screen');
  var sub = document.getElementById('sub-screen');
  var content = document.getElementById('sub-content');
  var options = Array.prototype.slice.call(document.querySelectorAll('.menu-option'));
  var selected = 0, inGame = false, mode = 'single', previousPanel='songs', currentPanel='menu', activeTab='ALL SONGS', searchText='';
  var settings = JSON.parse(localStorage.getItem('tuxHeroSettings') || '{"music":80,"effects":80,"skipIntro":false,"difficulty":"MEDIUM","visuals":"HIGH"}');
  var progress = JSON.parse(localStorage.getItem('tuxHeroProgress') || '{"bestScore":0,"songs":[]}');
  var songInfo = {name:'Sweet Child O’ Mine',artist:'Guns N’ Roses',duration:'~3:30',source:'Faixa e chart já existentes no projeto'};

  /* ===== Gerenciador único de PRÉVIA: no máximo uma prévia ativa; nada fica tocando em segundo plano ===== */
  var previewEl=null,previewBtn=null,previewUrl=null,previewToken=0;
  function stopPreview(){
    previewToken++;
    if(previewEl){try{previewEl.pause();}catch(e){}previewEl.removeAttribute('src');try{previewEl.load();}catch(e){}previewEl.style.display='none';previewEl=null;}
    if(previewUrl){try{URL.revokeObjectURL(previewUrl);}catch(e){}previewUrl=null;}
    if(previewBtn){previewBtn.textContent='PRÉVIA';previewBtn.setAttribute('aria-pressed','false');previewBtn=null;}
  }
  function togglePreview(audioEl,btn,src,blob){
    if(previewEl===audioEl){stopPreview();return;}
    stopPreview();
    previewEl=audioEl;previewBtn=btn;
    if(blob){previewUrl=URL.createObjectURL(blob);audioEl.src=previewUrl;}else{audioEl.src=src;}
    audioEl.style.display='block';btn.textContent='PARAR PRÉVIA';btn.setAttribute('aria-pressed','true');
    var p=audioEl.play();if(p&&p.catch)p.catch(function(){});
  }
  window.TuxPreview={stop:stopPreview};
  function showMenu(){ stopPreview();document.dispatchEvent(new Event('tux-show-original-stop'));inGame=false;currentPanel='menu'; intro.classList.add('hidden'); sub.classList.add('hidden'); menu.classList.remove('hidden'); document.getElementById('game-canvas').style.display='block'; }
  function finishIntro(){ if(intro.classList.contains('hidden')) return; video.pause(); intro.classList.add('fade-out'); setTimeout(showMenu,450); }
  if(settings.skipIntro){finishIntro();} else { video.addEventListener('ended',finishIntro); video.addEventListener('error',function(){setTimeout(finishIntro,1200);}); video.play().catch(function(){}); }
  document.addEventListener('keydown',function(e){
    if(!intro.classList.contains('hidden')){if(e.key==='Enter'||e.key==='Escape'){e.preventDefault();finishIntro();}return;}
    if(!menu.classList.contains('hidden')){
      if(e.key==='ArrowDown'){e.preventDefault();selectMenu((selected+1)%options.length);} else if(e.key==='ArrowUp'){e.preventDefault();selectMenu((selected+options.length-1)%options.length);} else if(e.key==='Enter'){e.preventDefault();activate(options[selected].dataset.action);} return;
    }
    if(!sub.classList.contains('hidden')&&e.key==='Escape'){goBack();}
    // ESC handled centrally by tux-control-deck.js
  });
  function selectMenu(n){selected=n;options.forEach(function(o,i){o.classList.toggle('selected',i===selected);o.querySelector('span')?.remove();});}
  options.forEach(function(o,i){o.addEventListener('mouseenter',function(){selectMenu(i);});o.addEventListener('click',function(){selectMenu(i);activate(o.dataset.action);});});
  function openPanel(html){stopPreview();currentPanel='panel';menu.classList.add('hidden');sub.classList.remove('hidden');content.innerHTML=html;}
  function activate(action){
    if(action==='quick'||action==='songs'){openSongs(action==='quick');return;}
    if(action==='career'){openCareer();return;}
    if(action==='multiplayer'){openPanel('<h1>MULTIJOGADOR LOCAL</h1><p>Dois jogadores, duas guitarras 3D e uma música compartilhada.</p><div class="song-card"><label>Música <select id="mp-song">'+mpSongOptions()+'</select></label><p class="muted-note">Os dois jogadores disputam a mesma música, com uma única reprodução compartilhada. O áudio só começa ao iniciar a partida.</p></div><div class="song-card"><label>Nome do jogador 1 <input id="p1name" maxlength="16" value="JOGADOR 1"></label><p>A · S · D · F · G</p><label>Dificuldade <select id="p1diff"><option value="EASY">FÁCIL</option><option value="MEDIUM" selected>MÉDIO</option><option value="HARD">DIFÍCIL</option><option value="EXPERT">ESPECIALISTA</option></select></label></div><div class="song-card"><label>Nome do jogador 2 <input id="p2name" maxlength="16" value="JOGADOR 2"></label><p>J · K · L · Ç · ENTER</p><label>Dificuldade <select id="p2diff"><option value="EASY">FÁCIL</option><option value="MEDIUM" selected>MÉDIO</option><option value="HARD">DIFÍCIL</option><option value="EXPERT">ESPECIALISTA</option></select></label></div><button id="mp-start">INICIAR MULTIJOGADOR</button>');document.getElementById('mp-start').onclick=startMultiplayer;return;}
    if(action==='options'){openOptions();return;}
    if(action==='credits'){openPanel('<h1>CRÉDITOS</h1><p><strong>© 2026 Desenvolvido por Ana Clara Mello.</strong></p><p><a class="social-link" href="https://github.com/truemelloo" target="_blank" rel="noopener noreferrer"><img src="photos/github_icon.png" alt="">GitHub</a><a class="social-link" href="https://www.linkedin.com/in/anaclarasouzamello" target="_blank" rel="noopener noreferrer"><img src="photos/linkedin_icon.png" alt="">LinkedIn</a></p><p></p>');return;}
  }
  function goBack(){if(TuxCustom.isActive())return;showMenu();}
  function openSongs(quick){
    currentPanel='songs';openPanel('<h1>SELECIONAR MÚSICA</h1><div class="song-tabs" id="song-tabs"></div><div class="song-toolbar"><input id="song-search" placeholder="Buscar música ou artista" aria-label="Buscar música"><button id="import-song">+ IMPORTAR MÚSICA</button><input type="file" id="song-file" accept=".mp3,.wav,.ogg,audio/mpeg,audio/wav,audio/ogg" hidden></div><p id="song-message" class="muted-note">Importações são processadas localmente. Charts automáticos são estimativas baseadas em ataques de áudio, não transcrições perfeitas.</p><div id="song-list"></div>');
    document.getElementById('song-search').value=searchText;document.getElementById('song-search').oninput=function(){searchText=this.value;renderSongs();};
    document.getElementById('import-song').onclick=function(){document.getElementById('song-file').click();};
    document.getElementById('song-file').onchange=importFile;renderSongs();
  }
  async function importFile(e){var file=e.target.files[0];if(!file)return;var msg=document.getElementById('song-message');if(!/\.(mp3|wav|ogg)$/i.test(file.name)){msg.textContent='Selecione MP3, WAV ou OGG.';return;}msg.textContent='Analisando áudio... Aguarde. Arquivos longos podem levar algum tempo.';
    try{var result=await TuxCustom.analyze(file);var name=file.name.replace(/\.[^.]+$/,'');var newName=prompt('Nome da música:',name);if(newName===null)return;var artist=prompt('Artista:', 'Artista desconhecido');if(artist===null)return;var track={id:'local-'+Date.now()+'-'+Math.random().toString(36).slice(2),name:newName.trim()||name,artist:artist.trim()||'Desconhecido',duration:result.duration,bpm:result.bpm,offset:result.offset,notes:result.notes,blob:file,favorite:false,records:{}};await TuxCustom.put(track);activeTab='MY SONGS';msg.textContent='Importação concluída. BPM estimado: '+track.bpm+'. Notas: '+track.notes.length+'. Ajuste o offset no editor se necessário.';renderSongs();}catch(err){msg.textContent='Não foi possível importar ou salvar: '+err.message+'. Verifique suporte do formato e espaço disponível.';}}

  /* ===== BIBLIOTECA OFICIAL (músicas adicionadas) — usa o mesmo motor Three.js (TuxUnified3D) ===== */
  var LIB = window.TUX_LIBRARY || [];
  var DIFF_PT = {EASY:'FÁCIL',MEDIUM:'MÉDIO',HARD:'DIFÍCIL',EXPERT:'ESPECIALISTA'};
  var STARS = {EASY:'★',MEDIUM:'★★',HARD:'★★★',EXPERT:'★★★★'};
  function lsGet(k){try{return JSON.parse(localStorage.getItem(k)||'{}')||{};}catch(e){return {};}}
  function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
  function libRecord(id){var r=lsGet('tuxHeroLibRecords')[id]||{};return Math.max(0,...Object.values(r));}
  function libFav(id){return !!lsGet('tuxHeroLibFavorites')[id];}
  function fmtTime(sec){return Math.floor(sec/60)+':'+String(Math.floor(sec%60)).padStart(2,'0');}
  function artistLabel(song){return song.artist||'Artista não informado';}
  function loadLibChart(song){return new Promise(function(resolve,reject){
    window.TUX_LIBRARY_CHARTS=window.TUX_LIBRARY_CHARTS||{};
    function done(){var raw=window.TUX_LIBRARY_CHARTS[song.id];if(!raw||!raw.length)return reject(Error('chart vazio'));resolve(raw.map(function(n){return {t:n[0],lane:n[1],dur:n[2]};}));}
    if(window.TUX_LIBRARY_CHARTS[song.id])return done();
    var sc=document.createElement('script');sc.src=song.chart;sc.onload=done;sc.onerror=function(){reject(Error('não foi possível carregar o chart de '+song.name));};document.head.appendChild(sc);});}
  function libSync(id){var v=lsGet('tuxHeroLibSync')[id];return v||null;}
  function libCard(song){var rec=libRecord(song.id),sync=libSync(song.id);
    return '<div class="song-card" data-lib="'+song.id+'"><strong>'+TuxCustom.escapeHTML(song.name)+'</strong><p>'+TuxCustom.escapeHTML(artistLabel(song))+' · '+fmtTime(song.duration)+' · BPM estimado '+(sync?sync.bpm:song.bpm)+'</p>'+
      '<p>Dificuldade: '+STARS[song.level]+' '+DIFF_PT[song.level]+' · Recorde: '+(rec>0?rec:'—')+'</p>'+
      '<p class="muted-note">Chart gerado a partir do áudio (aproximação rítmica). Se as notas parecerem adiantadas ou atrasadas, use AJUSTAR SINCRONIA.'+(sync?' Ajuste ativo: deslocamento '+sync.offset+' s.':'')+'</p>'+
      '<div class="song-actions"><select class="lib-difficulty"><option value="EASY">FÁCIL</option><option value="MEDIUM">MÉDIO</option><option value="HARD">DIFÍCIL</option><option value="EXPERT">ESPECIALISTA</option></select><button data-lib-op="play">JOGAR</button><button data-lib-op="preview">PRÉVIA</button><button data-lib-op="sync">AJUSTAR SINCRONIA</button><button data-lib-op="favorite">'+(libFav(song.id)?'★':'☆')+' FAVORITO</button></div>'+
      '<audio class="track-preview" controls preload="none" style="display:none;max-width:100%"></audio></div>';}
  async function playLibSong(song,difficulty,opts){opts=opts||{};
    stopPreview();
    var notes;try{notes=await libNotes(song);}catch(err){alert(err.message);return;}
    stopPreview();sub.classList.add('hidden');
    window.TuxUnified3D.start({mode:'import',title:song.name+' · '+artistLabel(song),src:song.src,notes:notes,players:[{name:'JOGADOR 1',difficulty:difficulty}],
      back:opts.back||function(){openSongs(false);},
      onFinish:function(players){var recs=lsGet('tuxHeroLibRecords');recs[song.id]=recs[song.id]||{};recs[song.id][difficulty]=Math.max(recs[song.id][difficulty]||0,players[0].score);lsSet('tuxHeroLibRecords',recs);if(opts.onFinish)opts.onFinish(players);}});
  }

  /* ===== BIBLIOTECA COMPARTILHADA: uma única fonte (window.TUX_LIBRARY + faixa original) para Biblioteca, Carreira e Multijogador ===== */
  var ORIGINAL_ID='original',ORIGINAL_SRC='https://s3-us-west-1.amazonaws.com/js-hero-guitar-hero-clone/sweet_child_o_mine.mp3',mpBusy=false;
  function libById(id){return LIB.filter(function(x){return x.id===id;})[0]||null;}
  async function libNotes(song){
    var notes=await loadLibChart(song);
    var sync=libSync(song.id);if(sync){var scale=song.bpm/sync.bpm;notes=notes.map(function(n){return {t:Math.max(0,+(n.t*scale+sync.offset).toFixed(3)),lane:n.lane,dur:n.dur*scale};});}
    return notes;}
  window.TuxSongs={original:function(){return songInfo;},library:function(){return LIB;},count:function(){return LIB.length+1;}};
  function mpSongOptions(){
    var h='<option value="'+ORIGINAL_ID+'">'+TuxCustom.escapeHTML(songInfo.name+' — '+songInfo.artist)+'</option>';
    LIB.slice().sort(function(a,b){return (a.name+'').localeCompare(b.name+'','pt-BR');}).forEach(function(song){h+='<option value="'+song.id+'">'+TuxCustom.escapeHTML(song.name+' — '+artistLabel(song))+'</option>';});
    return h;}
  async function startMultiplayer(){
    var btn=this;if(mpBusy)return;mpBusy=true;
    try{
      var sid=document.getElementById('mp-song').value,song=sid===ORIGINAL_ID?null:libById(sid);
      var players=[{name:document.getElementById('p1name').value,difficulty:document.getElementById('p1diff').value},{name:document.getElementById('p2name').value,difficulty:document.getElementById('p2diff').value}];
      var notes,title,src;
      if(song){notes=await libNotes(song);title=song.name+' · '+artistLabel(song);src=song.src;}
      else{notes=window.TuxUnified3D.originalChart();title=songInfo.name;src=ORIGINAL_SRC;}
      if(!btn.isConnected)return;   // o jogador saiu da tela enquanto o chart carregava
      sub.classList.add('hidden');
      window.TuxUnified3D.start({mode:'multi',title:title,src:src,notes:notes,players:players,back:function(){showMenu()}});
    }catch(err){alert(err.message);}finally{mpBusy=false;}
  }

  /* ===== CARREIRA: fases montadas a partir da biblioteca compartilhada ===== */
  var LEVEL_RANK={EASY:0,MEDIUM:1,HARD:2,EXPERT:3},PHASE_SIZE=6;
  function careerPhases(){
    var lib=LIB.slice().sort(function(a,b){return (LEVEL_RANK[a.level]-LEVEL_RANK[b.level])||((a.nps||0)-(b.nps||0))||(a.notes-b.notes);});
    var phases=[],cur=null;
    lib.forEach(function(song){if(!cur||cur.level!==song.level||cur.ids.length>=PHASE_SIZE){cur={level:song.level,ids:[]};phases.push(cur);}cur.ids.push(song.id);});
    if(!phases.length)phases.push({level:'MEDIUM',ids:[]});
    phases[0].ids.unshift(ORIGINAL_ID);   // a faixa que já existia continua sendo a primeira da carreira
    return phases;}
  function saveProgress(){try{localStorage.setItem('tuxHeroProgress',JSON.stringify(progress));}catch(e){}}
  function careerDone(id){
    if(id===ORIGINAL_ID)return progress.songs.indexOf(ORIGINAL_ID)>=0||progress.bestScore>0;   // progresso antigo é respeitado
    return progress.songs.indexOf(id)>=0;}
  function careerMarkDone(id){if(progress.songs.indexOf(id)<0){progress.songs.push(id);saveProgress();}}
  function phaseNeeded(phase){return Math.ceil(phase.ids.length/2);}
  function phaseUnlocked(phases,n){if(n===0)return true;var prev=phases[n-1];return prev.ids.filter(careerDone).length>=phaseNeeded(prev)&&phaseUnlocked(phases,n-1);}
  function openCareer(){
    var phases=careerPhases(),total=phases.reduce(function(a,p){return a+p.ids.length;},0),done=0;
    phases.forEach(function(p){done+=p.ids.filter(careerDone).length;});
    var h='<h1>MODO CARREIRA</h1><p>Melhor pontuação salva: '+progress.bestScore+' · Apresentações concluídas: '+done+' de '+total+' · Dificuldade: '+DIFF_PT[settings.difficulty]+'</p>';
    phases.forEach(function(p,n){
      var open=phaseUnlocked(phases,n),got=p.ids.filter(careerDone).length;
      h+='<h2>FASE '+(n+1)+' · '+DIFF_PT[p.level]+(open?'':' 🔒')+'</h2>';
      if(!open){var prev=phases[n-1];h+='<p class="muted-note">Bloqueada: conclua '+phaseNeeded(prev)+' músicas da fase '+n+' ('+prev.ids.filter(careerDone).length+'/'+phaseNeeded(prev)+').</p>';}
      p.ids.forEach(function(id){
        var isOrig=id===ORIGINAL_ID,song=isOrig?null:libById(id);if(!isOrig&&!song)return;
        var name=isOrig?songInfo.name:song.name,artist=isOrig?songInfo.artist:artistLabel(song),dur=isOrig?songInfo.duration:fmtTime(song.duration);
        var rec=isOrig?progress.bestScore:libRecord(id);
        h+='<div class="song-card" data-career="'+id+'"><strong>'+TuxCustom.escapeHTML(name)+'</strong><p>'+TuxCustom.escapeHTML(artist)+' · '+dur+(careerDone(id)?' · ✔ CONCLUÍDA':'')+'</p><p>Recorde: '+(rec>0?rec:'—')+'</p>'+
          '<button data-career-play="'+id+'"'+(isOrig?' id="career-play"':'')+(open?'':' disabled')+'>'+(isOrig?'JOGAR APRESENTAÇÃO':'JOGAR')+'</button></div>';});
    });
    h+='<p class="muted-note">A carreira usa somente as músicas e charts já presentes no projeto (as mesmas de MÚSICAS DO TUX HERO). Uma fase é liberada ao concluir metade das músicas da fase anterior.</p>';
    openPanel(h);
    content.querySelectorAll('[data-career-play]').forEach(function(b){b.onclick=function(){
      var id=b.dataset.careerPlay;if(b.disabled)return;
      if(id===ORIGINAL_ID){startGame('career');return;}
      var song=libById(id);playLibSong(song,settings.difficulty,{back:openCareer,onFinish:function(){careerMarkDone(id);}});};});
  }
  function editLibSync(song){var cur=libSync(song.id)||{bpm:song.bpm,offset:0};
    var bpm=prompt('BPM estimado (ajustável):',cur.bpm);if(bpm===null)return;
    var offset=prompt('Deslocamento em segundos (positivo atrasa as notas, negativo adianta):',cur.offset);if(offset===null)return;
    var nb=Number(bpm),no=Number(offset);if(!Number.isFinite(nb)||nb<30||nb>300||!Number.isFinite(no)||Math.abs(no)>5){alert('Valores inválidos');return;}
    var all=lsGet('tuxHeroLibSync');if(nb===song.bpm&&no===0)delete all[song.id];else all[song.id]={bpm:nb,offset:no};lsSet('tuxHeroLibSync',all);renderSongs();}
  async function renderSongs(){stopPreview();var tabs=['ALL SONGS','TUX HERO SONGS','MY SONGS','FAVORITES'];var tabNode=document.getElementById('song-tabs');if(!tabNode)return;tabNode.innerHTML=tabs.map(function(t){return '<button data-tab="'+t+'" class="'+(t===activeTab?'active':'')+'">'+({'ALL SONGS':'TODAS AS MÚSICAS','TUX HERO SONGS':'MÚSICAS DO TUX HERO','MY SONGS':'MINHAS MÚSICAS','FAVORITES':'FAVORITAS'}[t]||t)+'</button>';}).join('');tabNode.querySelectorAll('button').forEach(function(b){b.onclick=function(){activeTab=b.dataset.tab;renderSongs();};});var list=document.getElementById('song-list');list.innerHTML='<p>Carregando biblioteca...</p>';var tracks=[];try{tracks=await TuxCustom.all();}catch(err){list.innerHTML='<p>IndexedDB indisponível: músicas personalizadas não podem ser salvas neste navegador.</p>';}
    if(!document.getElementById('song-list'))return;var q=searchText.toLowerCase();var html='';if((activeTab==='ALL SONGS'||activeTab==='TUX HERO SONGS')&&(songInfo.name+' '+songInfo.artist).toLowerCase().includes(q))html+='<div class="song-card"><strong>'+songInfo.name+'</strong><p>'+songInfo.artist+' · '+songInfo.duration+'</p><p class="muted-note">Chart original, áudio remoto. Dificuldades não alteram este chart.</p><label>Dificuldade <select id="difficulty"><option value="EASY">FÁCIL</option><option value="MEDIUM">MÉDIO</option><option value="HARD">DIFÍCIL</option><option value="EXPERT">ESPECIALISTA</option></select></label><button id="song-play">JOGAR ORIGINAL</button></div>';
    LIB.filter(function(song){return (activeTab==='ALL SONGS'||activeTab==='TUX HERO SONGS'||(activeTab==='FAVORITES'&&libFav(song.id)))&&(song.name+' '+artistLabel(song)).toLowerCase().includes(q);}).forEach(function(song){html+=libCard(song);});
    tracks.filter(function(t){return (activeTab==='ALL SONGS'||activeTab==='MY SONGS'||(activeTab==='FAVORITES'&&t.favorite))&&(t.name+' '+t.artist).toLowerCase().includes(q)}).forEach(function(t){html+='<div class="song-card" data-track="'+t.id+'"><strong>'+TuxCustom.escapeHTML(t.name)+'</strong><p>'+TuxCustom.escapeHTML(t.artist)+' · '+Math.floor(t.duration/60)+':'+String(Math.floor(t.duration%60)).padStart(2,'0')+' · BPM estimado '+t.bpm+'</p><p>Recorde: '+Math.max(0,...Object.values(t.records||{}))+'</p><div class="song-actions"><select class="custom-difficulty"><option value="EASY">FÁCIL</option><option value="MEDIUM" selected>MÉDIO</option><option value="HARD">DIFÍCIL</option><option value="EXPERT">ESPECIALISTA</option></select><button data-op="play">JOGAR</button><button data-op="preview">PRÉVIA</button><button data-op="edit">EDITAR NOTAS</button><button data-op="favorite">'+(t.favorite?'★':'☆')+' FAVORITO</button><button data-op="delete">REMOVER</button></div><audio class="track-preview" controls preload="none" style="display:none;max-width:100%"></audio></div>'});list.innerHTML=html||'<p>Nenhuma música encontrada nesta categoria.</p>';var dif=document.getElementById('difficulty');if(dif){dif.value=settings.difficulty;dif.onchange=function(){settings.difficulty=this.value;saveSettings();};document.getElementById('song-play').onclick=function(){startGame('single');};}
    list.querySelectorAll('[data-lib]').forEach(function(card){var song=LIB.filter(function(x){return x.id===card.dataset.lib;})[0];var sel=card.querySelector('.lib-difficulty');sel.value=settings.difficulty;
      card.querySelectorAll('[data-lib-op]').forEach(function(btn){btn.onclick=function(){var op=btn.dataset.libOp;
        if(op==='play'){playLibSong(song,sel.value);}
        else if(op==='preview'){togglePreview(card.querySelector('audio'),btn,song.src,null);}
        else if(op==='sync'){editLibSync(song);}
        else if(op==='favorite'){var f=lsGet('tuxHeroLibFavorites');if(f[song.id])delete f[song.id];else f[song.id]=true;lsSet('tuxHeroLibFavorites',f);renderSongs();}};});});
    list.querySelectorAll('[data-track]').forEach(function(card){var id=card.dataset.track;card.querySelectorAll('[data-op]').forEach(function(btn){btn.onclick=async function(){var op=btn.dataset.op;if(op==='play')stopPreview();var tk=previewToken;var t=await TuxCustom.get(id);if(op==='play'){var difficulty=card.querySelector('.custom-difficulty').value;stopPreview();sub.classList.add('hidden');await TuxCustom.start(t,difficulty,function(){openSongs(false)});}else if(op==='preview'){if(tk!==previewToken&&previewEl!==card.querySelector('audio'))return;togglePreview(card.querySelector('audio'),btn,null,t.blob);}else if(op==='delete'){if(confirm('Remover '+t.name+' da biblioteca?')){await TuxCustom.del(id);renderSongs();}}else if(op==='favorite'){t.favorite=!t.favorite;await TuxCustom.put(t);renderSongs();}else if(op==='edit'){editChart(t);}};});});
  }
  function editChart(t){var bpm=prompt('BPM estimado (ajustável):',t.bpm);if(bpm===null)return;var offset=prompt('Deslocamento em segundos (positivo atrasa as notas):',t.offset||0);if(offset===null)return;var newBpm=Number(bpm),newOffset=Number(offset);if(!Number.isFinite(newBpm)||newBpm<30||newBpm>300||!Number.isFinite(newOffset)){alert('Valores inválidos');return;}var scale=t.bpm/newBpm;t.notes=t.notes.map(function(n){return {...n,t:Math.max(0,+(n.t*scale+newOffset-(t.offset||0)).toFixed(3))};});t.bpm=newBpm;t.offset=newOffset;TuxCustom.put(t).then(renderSongs).catch(function(e){alert(e.message)});}
  function openOptions(){openPanel('<h1>CONFIGURAÇÕES</h1><div class="setting-row"><label for="music-volume">Volume da música</label><input id="music-volume" type="range" min="0" max="100" value="'+settings.music+'"></div><div class="setting-row"><label for="fx-volume">Volume dos efeitos</label><input id="fx-volume" type="range" min="0" max="100" value="'+settings.effects+'"></div><div class="setting-row"><label for="skip-intro">Pular introdução</label><input id="skip-intro" type="checkbox" '+(settings.skipIntro?'checked':'')+'></div><div class="setting-row"><label for="default-difficulty">Dificuldade padrão</label><select id="default-difficulty"><option value="EASY">FÁCIL</option><option value="MEDIUM">MÉDIO</option><option value="HARD">DIFÍCIL</option><option value="EXPERT">ESPECIALISTA</option></select></div><div class="setting-row"><label for="visual-quality">Qualidade dos efeitos</label><select id="visual-quality"><option value="LOW">BAIXA</option><option value="MEDIUM">MÉDIO</option><option value="HIGH">ALTA</option></select></div><button id="save-options">SALVAR CONFIGURAÇÕES</button><p class="muted-note">As opções de volume e dificuldade são salvas localmente. O mapeamento de teclas ainda é fixo no motor atual.</p>');document.getElementById('default-difficulty').value=settings.difficulty;document.getElementById('visual-quality').value=settings.visuals;document.getElementById('save-options').onclick=function(){settings.music=+document.getElementById('music-volume').value;settings.effects=+document.getElementById('fx-volume').value;settings.skipIntro=document.getElementById('skip-intro').checked;settings.difficulty=document.getElementById('default-difficulty').value;settings.visuals=document.getElementById('visual-quality').value;saveSettings();var audio=document.getElementById('audio-player');if(audio)audio.volume=settings.music/100;showMenu();};}
  function saveSettings(){localStorage.setItem('tuxHeroSettings',JSON.stringify(settings));}
  function startGame(which){stopPreview();window.__tuxAllowOriginalStart=true;document.dispatchEvent(new Event('tux-show-original-start'));mode=which;sub.classList.add('hidden');menu.classList.add('hidden');inGame=true;var pauseButton=document.querySelector('.play-pause');if(pauseButton)pauseButton.classList.remove('hidden');var start=document.querySelector('.start');if(start)start.textContent='PRESSIONE A PARA TOCAR!';document.dispatchEvent(new KeyboardEvent('keypress',{key:'a',code:'KeyA',keyCode:65,which:65,bubbles:true}));if(which==='career'){var ap=document.getElementById('audio-player');if(ap)ap.addEventListener('ended',function(){careerMarkDone(ORIGINAL_ID);},{once:true});}setTimeout(function(){var audio=document.getElementById('audio-player');if(audio)audio.volume=settings.music/100;},1000);}
  document.getElementById('back-button').addEventListener('click',goBack);
  // Impactos visuais leves nas teclas, sem interferir no motor de notas.
  var laneNames={'a':'green','s':'red','d':'yellow','f':'blue','g':'orange'};
  document.addEventListener('keydown',function(e){if(!inGame)return;var lane=laneNames[String(e.key).toLowerCase()];if(!lane)return;var flash=document.createElement('div');flash.className='lane-hit '+lane;document.body.appendChild(flash);setTimeout(function(){flash.remove();},260);});
  // Record best score when the original game updates its score display.
  var scoreNode=document.querySelector('.score');if(scoreNode&&window.MutationObserver){new MutationObserver(function(){var value=parseInt((scoreNode.textContent.match(/\d+/)||['0'])[0],10);if(value>progress.bestScore){progress.bestScore=value;localStorage.setItem('tuxHeroProgress',JSON.stringify(progress));}}).observe(scoreNode,{childList:true,characterData:true,subtree:true});}
  window.addEventListener('beforeunload',saveSettings);
})();
