# Essai temporaire (branche houle) : houle mesurée Candhis dans l'appli, avec les vraies réponses du jour.
# 1) houle.json fabriqué par notif/houle.js à partir des vraies réponses (Candhis + Open-Meteo), 2) l'appli dans Chrome sans écran,
# l'adresse de houle.json étant servie avec ce fichier ; 3) sans réseau, retour du réseau ; 4) houle.json absent (404).
import threading, http.server, functools, asyncio, os, json
from playwright.async_api import async_playwright
OUT = "diag/out"; os.makedirs(OUT, exist_ok=True)
HOULE = open("/tmp/houle.json").read()
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=".")
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8765), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
res = {}
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        async def ouvrir(mode):
            ctx = await b.new_context(viewport={"width": 412, "height": 915}, device_scale_factor=2, service_workers="allow")
            await ctx.add_init_script("if(!sessionStorage.getItem('x')){sessionStorage.setItem('x','1');localStorage.setItem('cp_theme', JSON.stringify('jour'));}")
            async def route(r):
                if mode == "404": await r.fulfill(status=404, body="404: Not Found")
                else: await r.fulfill(status=200, body=HOULE, headers={"Content-Type": "text/plain; charset=utf-8", "Access-Control-Allow-Origin": "*"})
            await ctx.route("https://raw.githubusercontent.com/**", route)
            pg = await ctx.new_page(); errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.on("console", lambda m: m.type == "error" and errs.append("console: " + m.text))
            await pg.goto("http://127.0.0.1:8765/index.html"); await pg.wait_for_timeout(12000)
            return ctx, pg, errs
        ctx, pg, errs = await ouvrir("ok")
        await pg.locator("#cond").scroll_into_view_if_needed(); await pg.wait_for_timeout(800)
        await pg.locator("#cond").screenshot(path=f"{OUT}/1_conditions.png")
        res["1_texte"] = await pg.inner_text("#cond")
        res["1_cache"] = await pg.evaluate("!!localStorage.getItem('cp_houle')")
        # Sans réseau : rechargement, l'appli doit montrer la dernière houle gardée
        await ctx.set_offline(True); await pg.reload(); await pg.wait_for_timeout(6000)
        await pg.locator("#cond").scroll_into_view_if_needed(); await pg.locator("#cond").screenshot(path=f"{OUT}/2_sans_reseau.png")
        res["2_texte"] = await pg.inner_text("#cond"); res["2_bandeau"] = await pg.inner_text("#banner")
        # Retour du réseau : nouvel essai automatique (événement online + 3 s)
        await ctx.set_offline(False); await pg.evaluate("window.dispatchEvent(new Event('online'))"); await pg.wait_for_timeout(15000)
        res["3_bandeau"] = await pg.inner_text("#banner"); res["3_toast"] = await pg.inner_text("#toast")
        res["3_houle_presente"] = "Houle mesurée" in await pg.inner_text("#cond")
        res["erreurs_ok"] = errs[:]
        await ctx.close()
        ctx, pg, errs = await ouvrir("404")
        await pg.locator("#cond").scroll_into_view_if_needed(); await pg.locator("#cond").screenshot(path=f"{OUT}/4_sans_fichier.png")
        res["4_texte"] = (await pg.inner_text("#cond"))[-300:]; res["erreurs_404"] = errs[:]
        await ctx.close(); await b.close()
asyncio.run(main())
d = json.loads(HOULE)
res["houle_json"] = {"genere": d["genere"], "notes": d["notes"], "bouees": [{k: (v if k not in ("mesures", "prevu") else (len(v), v[-1:] )) for k, v in x.items()} for x in d["bouees"]]}
open(f"{OUT}/resultats.json", "w").write(json.dumps(res, ensure_ascii=False, indent=1))
print(json.dumps(res, ensure_ascii=False, indent=1)[:6000])
