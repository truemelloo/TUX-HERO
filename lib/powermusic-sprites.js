/* PowerMusic: displays the supplied original sprites without altering the Three.js score engine. */
(function(){'use strict';
const meter=document.querySelector('.rock-input'),sprite=document.getElementById('powermusic-sprite');
if(!meter||!sprite)return;
const frames=['barra0','barra00','barra1','barra2','barra3','barra4','barra5','barra6','barra8'];
let last=-1;
function update(){const v=Math.max(-20,Math.min(20,Number(meter.value)||0));const i=Math.min(8,Math.max(0,Math.floor((v+20)/40*9)));if(i!==last){last=i;sprite.src='assets/barrinhas/'+frames[i]+'.png';sprite.alt='PowerMusic — nível '+(i+1)+' de 9';}}
setInterval(update,100);update();
})();
