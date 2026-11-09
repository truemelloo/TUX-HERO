import asyncio,sys,json
from playwright.async_api import async_playwright
BASE='http://localhost:8123/index.html'
async def setup(p,w,h):
    b=await p.chromium.launch(args=["--use-gl=swiftshader","--enable-webgl","--ignore-gpu-blocklist","--autoplay-policy=no-user-gesture-required"])
    ctx=await b.new_context(viewport={'width':w,'height':h})
    await ctx.add_init_script("localStorage.setItem('tuxHeroSettings',JSON.stringify({music:80,effects:80,skipIntro:true,difficulty:'MEDIUM',visuals:'HIGH'}))")
    pg=await ctx.new_page()
    logs=[]
    pg.on('console',lambda m:logs.append(m.type+': '+m.text) if m.type in('error','warning') and 'GL Driver' not in m.text else None)
    pg.on('pageerror',lambda e:logs.append('PAGEERROR '+str(e)))
    async def mp3(route): await route.fulfill(path='/tmp/test.wav',content_type='audio/wav',headers={'Access-Control-Allow-Origin':'*'})
    await pg.route('**/sweet_child_o_mine.mp3',mp3)
    await pg.route('**/fonts.googleapis.com/**',lambda r:r.abort())
    await pg.goto(BASE); await pg.wait_for_timeout(1200)
    return b,pg,logs
async def start_quick(pg):
    await pg.click('[data-action=quick]'); await pg.wait_for_timeout(300)
    await pg.click('#song-play'); await pg.wait_for_timeout(300)
async def start_multi(pg,n1='ANA',n2='BIA'):
    await pg.click('[data-action=multiplayer]'); await pg.wait_for_timeout(300)
    await pg.fill('#p1name',n1); await pg.fill('#p2name',n2)
    await pg.click('#mp-start'); await pg.wait_for_timeout(300)
