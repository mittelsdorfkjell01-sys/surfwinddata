import os
from playwright.sync_api import sync_playwright

OUT = r"c:\Projects\Web\Surfwinddate\screens"
os.makedirs(OUT, exist_ok=True)

BASE = "http://localhost:4173"
SCREENS = [
    ("/", "01-landing"),
    ("/map", "02-map"),
    ("/spot/laboe", "03-spot-laboe"),
    ("/region/schleswig-holstein", "04-region-schleswig-holstein"),
    ("/admin/spot-image", "05-admin-spot-image"),
]

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True)
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=2)
    page = ctx.new_page()
    for path, name in SCREENS:
        page.goto(BASE + path, wait_until="networkidle", timeout=60000)
        page.wait_for_timeout(2500)  # let Leaflet tiles / images settle
        dest = os.path.join(OUT, name + "@2x.png")
        page.screenshot(path=dest, full_page=True)
        print("saved", dest)
    browser.close()
print("DONE")
