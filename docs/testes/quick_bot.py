import sys,json; sys.path.insert(0,'/tmp')
from harness import *
BOT="""()=>{const keys=['a','s','d','f','g'],codes=['KeyA','KeyS','KeyD','KeyF','KeyG'];
const lagOf=m=>m>94?12.5*m:m>79?10*m:m>71?7.5*m:m>48?5*m:0;
const notes=TUX_ORIGINAL_CHART.map(n=>{const time=237.8*((n.m-1)*8+n.t)+lagOf(n.m);return {lane:n.pos-1,check:2240+time,dur:(n.hold||0)*237.8,down:false,up:false}}).filter(n=>n.check<52000).sort((a,b)=>a.check-b.check);
window.__qbot=setInterval(()=>{const c=window.__tuxClock;if(!c||c.paused)return;const t=performance.now()-c.start-c.pausedTotal;
 for(const n of notes){ if(!n.down&&n.check-t<70&&n.check-t>-120){n.down=true;document.dispatchEvent(new KeyboardEvent('keydown',{key:keys[n.lane],code:codes[n.lane],keyCode:65+['a','s','d','f','g'].indexOf(keys[n.lane])*0,bubbles:true}));
   n.rel=n.dur>400?n.check+n.dur-60:n.check+90}
  if(n.down&&!n.up&&t>=n.rel){n.up=true;document.dispatchEvent(new KeyboardEvent('keyup',{key:keys[n.lane],code:codes[n.lane],bubbles:true}))}}
},4)}"""
KEYCODE={'a':65,'s':83,'d':68,'f':70,'g':71}
async def txt(pg,sel): return await pg.inner_text(sel)
async def main():
    async with async_playwright() as p:
        b,pg,logs=await setup(p,800,450)
        # o Key do jogo usa e.keyCode: sobrescreve o dispatch do bot via page.keyboard seria lento; injeta keyCode correto
        await pg.add_init_script("""const _KE=window.KeyboardEvent;window.KeyboardEvent=class extends _KE{constructor(t,i){super(t,i);const m={a:65,s:83,d:68,f:70,g:71};if(i&&i.key&&m[i.key]){Object.defineProperty(this,'keyCode',{get:()=>m[i.key]});}}}""")
        await pg.goto('http://localhost:8123/index.html'); await pg.wait_for_timeout(1200)
        await start_quick(pg); await pg.wait_for_timeout(300)
        # 4) bot toca o restante até 52 s
        await pg.evaluate(BOT)
        shot_t=shot_h=False; seen_toast=False
        while True:
            c=await pg.evaluate("window.__tuxClock?performance.now()-window.__tuxClock.start-window.__tuxClock.pausedTotal:0")
            nl=await pg.evaluate("window.__tuxGame.gameView.liveSustains.map(s=>s.state)")
            if not shot_h and 'active' in nl: shot_h=True; await pg.screenshot(path='/home/claude/shots/quick_hold.png'); print('   nota longa ATIVA em',round(c/1000,1),'s estados:',nl)
            if await pg.evaluate("!!document.querySelector('.tux-quick-toast')"):
                seen_toast=True
                if not shot_t: shot_t=True; await pg.screenshot(path='/home/claude/shots/quick_combo.png')
            if c>52500: break
            await pg.wait_for_timeout(200)
        print('4) após bot: ',await txt(pg,'.score'),'|',await txt(pg,'.max-streak'),'|',await txt(pg,'.multiplier'),'| aviso de combo visto:',seen_toast)
        print('logs',[l for l in logs if 'ERR_FAILED' not in l][:4]); await b.close()
asyncio.run(main())
