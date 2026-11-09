import sys,json; sys.path.insert(0,'/tmp')
from harness import *
BOT="""()=>{const keys=['a','s','d','f','g'],codes=['KeyA','KeyS','KeyD','KeyF','KeyG'];
const notes=TuxUnified3D.originalChart().filter(n=>n.t<53).sort((a,b)=>a.t-b.t).map(n=>({...n,down:false,up:false}));
window.__bot=setInterval(()=>{const d=TuxUnified3D.debug();if(!d||d.state!=='playing')return;const t=d.time;
 for(const n of notes){ if(!n.down&&n.t-t<0.06&&n.t-t>-0.1){n.down=true;document.dispatchEvent(new KeyboardEvent('keydown',{key:keys[n.lane],code:codes[n.lane],bubbles:true,cancelable:true}));n.releaseAt=n.dur>0.12?n.t+n.dur-0.03:n.t+0.09}
  if(n.down&&!n.up&&t>=n.releaseAt){n.up=true;document.dispatchEvent(new KeyboardEvent('keyup',{key:keys[n.lane],code:codes[n.lane],bubbles:true,cancelable:true}))}}
},4)}"""
async def dbg(pg): return json.loads(await pg.evaluate('JSON.stringify(TuxUnified3D.debug())'))
async def main():
    async with async_playwright() as p:
        b,pg,logs=await setup(p,960,540)
        await pg.click('[data-action=multiplayer]'); await pg.wait_for_timeout(300)
        await pg.fill('#p1name','ANA'); await pg.fill('#p2name','BIA')
        await pg.select_option('#p1diff','HARD'); await pg.select_option('#p2diff','HARD')
        await pg.click('#mp-start'); await pg.wait_for_timeout(2900)
        await pg.evaluate(BOT)
        shot_combo=shot_fx=shot_hold=False; maxhold=0; maxmult=1
        while True:
            d=await dbg(pg); t=d['time']; p1=d['players'][0]
            maxhold=max(maxhold,p1['holds']); maxmult=max(maxmult,p1['multiplier'])
            if not shot_fx and t>5.2: shot_fx=True; await pg.screenshot(path='/home/claude/shots/bot_fx.png')
            if not shot_combo and p1['combo']>=10:
                shot_combo=True; await pg.screenshot(path='/home/claude/shots/bot_combo.png'); print('combo10 em t=%.1f toast:'%t, await pg.evaluate("[...document.querySelectorAll('.unified-toast')].map(x=>x.textContent)"))
            if not shot_hold and p1['holds']>0: shot_hold=True; await pg.screenshot(path='/home/claude/shots/bot_hold.png'); print('nota longa ativa em t=%.1f'%t)
            if t>52: break
            await pg.wait_for_timeout(150)
        d=await dbg(pg); print('P1',d['players'][0]); print('P2',d['players'][1]); print('max holds simultâneos',maxhold,'max multiplicador',maxmult)
        print('logs',[l for l in logs if 'ERR_FAILED' not in l][:4]); await b.close()
asyncio.run(main())
