/* TUX HERO: silent show footage. Independent of gameplay audio and timing. */
(function(){'use strict';
  const original=document.getElementById('original-show-video');
  const custom=document.getElementById('custom-show-video');
  let originalPlaying=false,customPlaying=false,customPaused=false;
  function play(v){if(!v)return;v.muted=true;v.defaultMuted=true;const p=v.play();if(p&&p.catch)p.catch(()=>{});}
  function stop(v){if(!v)return;v.pause();try{v.currentTime=0}catch(e){}}
  function update(){
    const customVisible=customPlaying&&!document.getElementById('custom-game').classList.contains('hidden');
    const originalVisible=originalPlaying&&!customVisible;
    const pauseButton=document.querySelector('.play-pause');
    // The existing engine toggles button text when paused; don't change its implementation.
    const originalPaused=pauseButton&&!pauseButton.classList.contains('hidden')&&/^(play|resume|continuar|retomar)/i.test(pauseButton.textContent.trim());
    if(customVisible){original.pause();if(customPaused)custom.pause();else if(custom.paused)play(custom);}
    else if(originalVisible){custom.pause();if(originalPaused)original.pause();else if(original.paused)play(original);}
    else {original.pause();custom.pause();}
  }
  document.addEventListener('tux-show-original-start',()=>{originalPlaying=true;original.currentTime=0;update()});
  document.addEventListener('tux-show-original-stop',()=>{originalPlaying=false;stop(original);update()});
  document.addEventListener('tux-show-custom-start',()=>{customPlaying=true;customPaused=false;custom.currentTime=0;update()});
  document.addEventListener('tux-show-custom-stop',()=>{customPlaying=false;customPaused=false;stop(custom);update()});
  document.addEventListener('tux-show-custom-pause',e=>{customPaused=!!e.detail.paused;update()});
  const pauseButton=document.querySelector('.play-pause');
  if(pauseButton){new MutationObserver(update).observe(pauseButton,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['class']});pauseButton.addEventListener('click',()=>setTimeout(update,0));}
  document.addEventListener('visibilitychange',()=>{if(document.hidden){original.pause();custom.pause()}else update()});
  window.addEventListener('pagehide',()=>{original.pause();custom.pause()});
})();
