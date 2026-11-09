import sys,json; sys.path.insert(0,'/tmp')
from harness import *
FIND="""([lane,after])=>{const n=TuxUnified3D.originalChart().filter(x=>x.lane===lane&&x.t>after).sort((a,b)=>a.t-b.t)[0];return n.t}"""
PRESS="""([target, keys])=>new Promise(res=>{const iv=setInterval(()=>{const d=TuxUnified3D.debug(); if(d&&d.time>=target){clearInterval(iv);
 keys.forEach(k=>document.dispatchEvent(new KeyboardEvent('keydown',{key:k.key,code:k.code,bubbles:true,cancelable:true})));res(d.time)}},3)})"""
UP="""(keys)=>keys.forEach(k=>document.dispatchEvent(new KeyboardEvent('keyup',{key:k.key,code:k.code,bubbles:true,cancelable:true})))"""
K=lambda k,c:{'key':k,'code':c}
async def dbg(pg): return json.loads(await pg.evaluate('JSON.stringify(TuxUnified3D.debug())'))
def hs(d): return [p['hits'] for p in d['players']]
def sc(d): return [p['score'] for p in d['players']]
async def step(pg,lane,keys,label):
    d0=await dbg(pg); tnote=await pg.evaluate(FIND,[lane,d0['time']+0.9])
    t=await pg.evaluate(PRESS,[tnote-0.07,keys]); await pg.wait_for_timeout(120); await pg.evaluate(UP,keys)
    d=await dbg(pg); print(f'{label}: nota t={tnote:.2f} apertou @ {t:.2f}  hits {hs(d0)} -> {hs(d)}  score {sc(d)}'); return d0,d
async def main():
    async with async_playwright() as p:
        b,pg,logs=await setup(p,640,360)
        await pg.click('[data-action=multiplayer]'); await pg.wait_for_timeout(300)
        await pg.fill('#p1name','ANA'); await pg.fill('#p2name','BIA')
        await pg.select_option('#p1diff','HARD'); await pg.select_option('#p2diff','HARD')
        await pg.click('#mp-start'); await pg.wait_for_timeout(300)
        d0,d=await step(pg,0,[K('a','KeyA'),K('j','KeyJ')],'1) A + J simultâneos (faixa 1)')
        assert hs(d)[0]==hs(d0)[0]+1 and hs(d)[1]==hs(d0)[1]+1
        d0,d=await step(pg,3,[K('f','KeyF'),K(';','Semicolon')],'2) F (P1) + tecla Ç/Semicolon (P2) (faixa 4)')
        assert hs(d)[0]==hs(d0)[0]+1 and hs(d)[1]==hs(d0)[1]+1
        d0,d=await step(pg,4,[K('Enter','Enter'),K('g','KeyG')],'3) G (P1) + ENTER (P2) (faixa 5)')
        assert hs(d)[0]==hs(d0)[0]+1 and hs(d)[1]==hs(d0)[1]+1
        d0,d=await step(pg,1,[K('s','KeyS')],'4) só P1 aperta S (faixa 2)')
        assert hs(d)[0]==hs(d0)[0]+1 and hs(d)[1]==hs(d0)[1], 'P2 não deve pontuar'
        assert sc(d)[0]>sc(d)[1]
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300); d=await dbg(pg); print('5) ESC ->',d['state']); assert d['state']=='paused'
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(3600); d=await dbg(pg); print('   ESC de novo ->',d['state']); assert d['state']=='playing'
        print('logs',[l for l in logs if 'ERR_FAILED' not in l][:4]); print('TODOS OS TESTES DO MULTIJOGADOR PASSARAM')
        await b.close()
asyncio.run(main())
