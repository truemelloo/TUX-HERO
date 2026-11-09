import json
from playwright.sync_api import sync_playwright
INIT="""localStorage.setItem('tuxHeroSettings',JSON.stringify({music:80,effects:80,skipIntro:true,difficulty:'MEDIUM',visuals:'HIGH'}));"""
with sync_playwright() as p:
    b=p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
    def newpage():
        pg=b.new_page(viewport={'width':1366,'height':768}); pg.errs=[]
        pg.on('pageerror',lambda e:pg.errs.append(str(e))); pg.on('dialog',lambda d:d.accept(d.default_value if d.type=='prompt' else None))
        pg.add_init_script(INIT); pg.goto('http://127.0.0.1:8765/index.html'); pg.wait_for_timeout(1200); return pg
    # 1) Jogo Rápido original (bundle.js) continua iniciando
    pg=newpage(); pg.click('[data-action=quick]'); pg.wait_for_timeout(400)
    print('Sweet Child na lista:',pg.locator('.song-card',has_text='Sweet Child').count()==1, '| botão original:',pg.locator('#song-play').count()==1)
    pg.click('#song-play'); pg.wait_for_timeout(3500)
    print('Jogo Rápido: canvas Three.js do bundle presente:',pg.evaluate("!!document.querySelector('#game-canvas canvas')"),'| menu oculto:',pg.evaluate("document.getElementById('menu-screen').classList.contains('hidden')"),'| erros:',pg.errs)
    pg.screenshot(path='/tmp/quick.png'); pg.close()
    # 2) Multijogador local
    pg=newpage(); pg.click('[data-action=multiplayer]'); pg.click('#mp-start'); pg.wait_for_timeout(1500)
    d=pg.evaluate("TuxUnified3D.debug()"); print('Multijogador: boards',d['boards'],'jogadores',len(d['players']),'| erros:',pg.errs); pg.close()
    # 3) Importar música (mp3 real do pacote) -> MINHAS MÚSICAS -> jogar
    pg=newpage(); pg.click('[data-action=songs]'); pg.wait_for_timeout(300)
    pg.set_input_files('#song-file','/home/claude/w/tuxhero_work/assets/musicas/lonely-day-system-of-a-down.mp3'); pg.wait_for_timeout(9000)
    print('Importar:',pg.inner_text('#song-message')[:90])
    pg.click('[data-tab="MY SONGS"]'); pg.wait_for_timeout(500); print('Minhas músicas cartões:',pg.locator('[data-track]').count())
    pg.click('[data-op=favorite]'); pg.wait_for_timeout(400); pg.click('[data-tab="FAVORITES"]'); pg.wait_for_timeout(400); print('Favoritas (import):',pg.locator('[data-track]').count())
    pg.click('[data-tab="MY SONGS"]'); pg.wait_for_timeout(300); pg.click('[data-op=play]'); pg.wait_for_timeout(5000)
    d=pg.evaluate("TuxUnified3D.debug()"); print('Import jogando:',d and d['state'],'| erros:',pg.errs); pg.close()
    # 4) Favoritar música nova + ajuste de sincronia + TODAS AS MÚSICAS
    pg=newpage(); pg.click('[data-action=songs]'); pg.wait_for_timeout(300)
    print('TODAS:',pg.locator('.song-card').count(),'cartões')
    pg.click('[data-tab="TUX HERO SONGS"]'); pg.wait_for_timeout(300); pg.fill('#song-search','pitty'); pg.wait_for_timeout(300); print('busca "pitty":',pg.locator('[data-lib]').count())
    pg.locator('[data-lib] [data-lib-op=favorite]').first.click(); pg.wait_for_timeout(300); pg.click('[data-tab="FAVORITES"]'); pg.wait_for_timeout(300); print('Favoritas (nova):',pg.locator('[data-lib]').count())
    pg.fill('#song-search',''); pg.click('[data-tab="TUX HERO SONGS"]'); pg.wait_for_timeout(300)
    prompts=iter(['150','0.08'])
    pg.remove_listener('dialog',pg.listeners('dialog')[0]) if hasattr(pg,'listeners') else None
    b.close()
