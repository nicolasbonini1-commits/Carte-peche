import threading, http.server, functools, asyncio, os
from playwright.async_api import async_playwright
os.makedirs("diag/out", exist_ok=True)
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=".")
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8765), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for th in ("jour", "nuit"):
            ctx = await b.new_context(viewport={"width": 412, "height": 915}, device_scale_factor=2)
            await ctx.add_init_script(f"localStorage.setItem('cp_theme', JSON.stringify('{th}')); localStorage.setItem('cp_bathy', 'false');")
            pg = await ctx.new_page()
            log = []
            pg.on("response", lambda r: ("tile" in r.url or "cartocdn" in r.url) and log.append(f"{r.status} {r.url}"))
            await pg.goto("http://127.0.0.1:8765/index.html"); await pg.wait_for_timeout(9000)
            await pg.locator("#map").scroll_into_view_if_needed(); await pg.wait_for_timeout(3000)
            await pg.locator("#map").screenshot(path=f"diag/out/carte_{th}.png")
            await pg.evaluate("window.scrollTo(0,0)"); await pg.wait_for_timeout(500)
            info = await pg.evaluate("[document.documentElement.dataset.theme, [...document.querySelectorAll('.leaflet-layer')].map(l=>l.className+' | '+getComputedStyle(l).filter)]")
            open(f"diag/out/{th}.txt", "w").write(repr(info) + "\n" + "\n".join(log[:15]))
            await ctx.close()
        await b.close()
asyncio.run(main())
