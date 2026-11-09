import sys; sys.path.insert(0,'/tmp')
from harness import *
async def main():
    async with async_playwright() as p:
        b,pg,logs=await setup(p,640,360)
        await start_quick(pg); await pg.wait_for_timeout(3500)
        await pg.click('.play-pause'); await pg.wait_for_timeout(500)
        print('pausado:',await pg.evaluate("window.__tuxClock.paused"),'| modal:',await pg.evaluate("document.getElementById('tux-modal-title').textContent"))
        await pg.click('#tux-modal-actions button'); 
        for i in range(30):
            await pg.wait_for_timeout(500)
            if not await pg.evaluate("window.__tuxClock.paused"): break
        z=await pg.evaluate("window.__tuxGame.gameView.liveNotes[0]?.position.z"); await pg.wait_for_timeout(800); z2=await pg.evaluate("window.__tuxGame.gameView.liveNotes[0]?.position.z")
        print('retomado após %.1fs | relógio pausado=%s | vídeo tocando=%s | notas se movem=%s'%((i+1)*.5,await pg.evaluate("window.__tuxClock.paused"),not await pg.evaluate("document.getElementById('original-show-video').paused"),z!=z2))
        # ESC também pausa
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(500)
        print('ESC pausa:',await pg.evaluate("window.__tuxClock.paused"))
        # voltar ao menu
        await pg.click('#tux-modal-actions button:nth-child(2)'); await pg.wait_for_timeout(500)
        await pg.click('#tux-modal-actions button:nth-child(2)'); await pg.wait_for_timeout(800)
        print('menu visível:',await pg.evaluate("!document.getElementById('menu-screen').classList.contains('hidden')"),'| notas 3D limpas:',await pg.evaluate("window.__tuxGame.gameView.liveNotes.length===0"))
        print('logs',[l for l in logs if 'ERR_FAILED' not in l][:3]); await b.close()
asyncio.run(main())
