import json,time,sys
from playwright.sync_api import sync_playwright
INIT="""
window.__audios=[];const _p=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){if(this.tagName==='AUDIO'&&!window.__audios.includes(this))window.__audios.push(this);return _p.apply(this,arguments)};
localStorage.setItem('tuxHeroSettings',JSON.stringify({music:80,effects:80,skipIntro:true,difficulty:'MEDIUM',visuals:'HIGH'}));
"""
cat=json.loads(open('/home/claude/w/tuxhero_work/lib/tux-library/catalog.js').read().split('window.TUX_LIBRARY=',1)[1].rstrip().rstrip(';'))
only=sys.argv[1:] 
res=[]
with sync_playwright() as p:
    b=p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
    for s in cat:
        if only and s['id'] not in only: continue
        r=dict(id=s['id'],name=s['name'],ok=False)
        pg=b.new_page(viewport={'width':1366,'height':768}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.add_init_script(INIT)
        try:
            pg.goto('http://127.0.0.1:8765/index.html'); pg.wait_for_timeout(1200)
            pg.click('[data-action=songs]'); pg.click('[data-tab="TUX HERO SONGS"]'); pg.wait_for_timeout(300)
            card=pg.locator('[data-lib="%s"]'%s['id']); r['listed']=card.count()==1
            card.locator('.lib-difficulty').select_option('HARD')
            card.locator('[data-lib-op=play]').click()
            pg.wait_for_function("window.TuxUnified3D&&TuxUnified3D.isActive()&&TuxUnified3D.debug().state==='playing'",timeout=20000)
            d=pg.evaluate("TuxUnified3D.debug()"); r['notas_hard']=d['players'][0]['notes']; r['boards']=d['boards']
            r['audio']=pg.evaluate("(()=>{const a=window.__audios[window.__audios.length-1];return {dur:a.duration,err:a.error&&a.error.code,rs:a.readyState,t:a.currentTime}})()")
            # bot: acerta as notas do chart por ~15 s de música (usa testHit nos instantes do chart)
            chart=pg.evaluate("TuxUnified3D.debug().players[0].notes")
            pg.evaluate("""(()=>{const a=window.__audios[window.__audios.length-1];window.__bot={hit:0};const chart=window.__chart;})()""")
            pg.evaluate("""(notes)=>{const a=window.__audios[window.__audios.length-1];let i=0;window.__botTimer=setInterval(()=>{const t=a.currentTime;while(i<notes.length&&notes[i][0]<=t+0.01){TuxUnified3D.testHit(0,notes[i][1]);i++;}},5)}""",
                       [[n['t'],n['lane']] for n in json.loads(open('/dev/null').read() or '[]')] or [])
            b_notes=None
            pg.wait_for_timeout(200)
            r['t0']=pg.evaluate("window.__audios[window.__audios.length-1].currentTime")
            b.contexts  # noqa
            # chart HARD real (a partir do arquivo) para o bot
            raw=pg.evaluate("window.TUX_LIBRARY_CHARTS['%s']"%s['id']); 
            pg.evaluate("clearInterval(window.__botTimer)")
            pg.evaluate("""(notes)=>{const a=window.__audios[window.__audios.length-1];let i=0;while(i<notes.length&&notes[i][0]<a.currentTime-0.1)i++;window.__botTimer=setInterval(()=>{const t=a.currentTime;while(i<notes.length&&notes[i][0]<=t+0.005){TuxUnified3D.testHit(0,notes[i][1]);i++;}},4)}""",raw)
            pg.wait_for_timeout(14000)
            d=pg.evaluate("TuxUnified3D.debug()"); P=d['players'][0]
            r['hits_14s']=P['hits']; r['misses_14s']=P['misses']; r['score_14s']=P['score']; r['t_play']=round(d['time'],1)
            if s['id']==cat[0]['id'] or s['id']==cat[len(cat)//2]['id']: pg.screenshot(path='/tmp/play_%s.png'%s['id'])
            # pula para perto do fim para testar o término + recorde
            pg.evaluate("clearInterval(window.__botTimer)")
            pg.evaluate("(()=>{const a=window.__audios[window.__audios.length-1];a.currentTime=Math.max(0,a.duration-2.5)})()")
            pg.wait_for_function("document.querySelector('#unified-overlay h2')&&document.querySelector('#unified-overlay h2').textContent==='RESULTADOS'",timeout=15000)
            r['fim']=True
            pg.evaluate("document.getElementById('u-exit').click()"); pg.wait_for_timeout(500)
            r['voltou_lista']=pg.locator('[data-lib="%s"]'%s['id']).count()==1 if False else pg.locator('#song-list').count()==1
            r['recorde_salvo']=pg.evaluate("(JSON.parse(localStorage.getItem('tuxHeroLibRecords')||'{}')['%s']||{}).HARD||0"%s['id'])
            r['ok']=bool(r['listed'] and r['audio']['err'] in (None,0) and r['audio']['dur']>10 and r['notas_hard']>0 and r['hits_14s']>0 and r['fim'] and r['voltou_lista'])
        except Exception as e:
            r['erro']=str(e)[:200]
        r['js_errors']=[e for e in errs][:3]
        print(json.dumps(r,ensure_ascii=False),flush=True); res.append(r); pg.close()
    b.close()
json.dump(res,open('/home/claude/w/test/resultado.json','w'),ensure_ascii=False,indent=1)
print('OK:',sum(1 for r in res if r['ok']),'/',len(res))
