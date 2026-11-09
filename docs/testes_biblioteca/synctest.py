from playwright.sync_api import sync_playwright
INIT="""localStorage.setItem('tuxHeroSettings',JSON.stringify({music:80,effects:80,skipIntro:true,difficulty:'MEDIUM',visuals:'HIGH'}));"""
with sync_playwright() as p:
    b=p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
    pg=b.new_page(viewport={'width':1366,'height':768}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    vals=iter(['150','0.08']); pg.on('dialog',lambda d:d.accept(next(vals)) if d.type=='prompt' else d.accept())
    pg.add_init_script(INIT); pg.goto('http://127.0.0.1:8765/index.html'); pg.wait_for_timeout(1200)
    pg.click('[data-action=songs]'); pg.click('[data-tab="TUX HERO SONGS"]'); pg.wait_for_timeout(300)
    card=pg.locator('[data-lib="creep-radiohead"]'); card.locator('[data-lib-op=sync]').click(); pg.wait_for_timeout(500)
    print('sync salvo:',pg.evaluate("localStorage.getItem('tuxHeroLibSync')"))
    print(pg.locator('[data-lib="creep-radiohead"]').inner_text().split('\n')[2:5])
    # primeira nota no jogo (com ajuste): original 1ª nota vs ajustada
    raw=pg.evaluate("(async()=>{await new Promise(r=>{const s=document.createElement('script');s.src='lib/tux-library/charts/creep-radiohead.js';s.onload=r;document.head.appendChild(s)});return window.TUX_LIBRARY_CHARTS['creep-radiohead'].slice(0,2)})()")
    print('1ª notas do chart original:',raw)
    pg.locator('[data-lib="creep-radiohead"] [data-lib-op=play]').click(); pg.wait_for_timeout(4000)
    print('estado:',pg.evaluate("TuxUnified3D.debug().state"),'| erros:',errs)
    b.close()
