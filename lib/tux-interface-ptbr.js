/* Tradução visual somente; não altera o motor musical. */
(function(){'use strict';
const labels={'Score:':'Pontuação:','Max Streak:':'Maior sequência:','Multiplier:':'Multiplicador:','Streak:':'Sequência:','ROCK METER':'MEDIDOR DE ROCK','SCORE ':'PONTUAÇÃO ','PAUSED':'JOGO PAUSADO','SONG SELECT':'SELECIONAR MÚSICA'};
const targets='.score,.max-streak,.multiplier,.streak,.rock-header,#custom-score,#custom-combo';
function localize(){document.querySelectorAll(targets).forEach(el=>{let t=el.textContent;for(const [en,pt] of Object.entries(labels)){if(t.startsWith(en)){const next=pt+t.slice(en.length);if(next!==t)el.textContent=next;break}}});}
let busy=false;const observer=new MutationObserver(()=>{if(busy)return;busy=true;try{localize()}finally{busy=false}});
function init(){localize();observer.observe(document.querySelector('#game-canvas'),{subtree:true,childList:true,characterData:true});const c=document.querySelector('#custom-game');if(c)observer.observe(c,{subtree:true,childList:true,characterData:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
