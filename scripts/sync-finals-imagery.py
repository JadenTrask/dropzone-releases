"""Bundle original THE FINALS item renders from their wiki item pages.

Run manually with Python 3. Assets are served locally; the app never fetches them.
Each manifest entry retains the exact page, image URL and digest for review.
"""
import hashlib
import json
import re
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HOST = 'https://www.thefinals.wiki'
CATALOG = {
    'weapon': ['93R', 'ARN-220', 'Dagger', 'LH1', 'M11', 'M26 Matter', 'Recurve Bow', 'SH1900', 'SR-84', 'Sword', 'Throwing Knives', 'V9S', 'XP-54', 'AKM', 'CB-01 Repeater', 'Cerberus 12GA', 'Chimera-XB', 'CL-40', 'Dual Blades', 'FAMAS', 'FCAR', 'Model 1887', 'P90', 'Pike-556', 'R .357', 'Riot Shield', '.50 Akimbo', 'BFR Titan', 'Flamethrower', 'KS-23', 'Lewis Gun', 'M134 Minigun', 'M60', 'MGL32', 'SA1216', 'ShAK-50', 'Sledgehammer', 'Spear'],
    'gadget': ['Breach Charge', 'Gateway', 'Glitch Grenade', 'Gravity Vortex', 'H+ Infuser', 'Sonar Grenade', 'Nullifier', 'Thermal Bore', 'Thermal Vision', 'Tracking Dart', 'Vanishing Bomb', 'APS Turret', 'Breach Drill', 'Data Reshaper', 'Defibrillator', 'Gas Mine', 'Glitch Trap', 'Hover Pad', 'Jump Pad', 'Zipline', 'Anti-Gravity Cube', 'Barricade', 'C4', 'Dome Shield', 'Healing Emitter', 'Lockbolt', 'Pyro Mine', 'RPG-7', 'Flashbang', 'Frag Grenade', 'Gas Grenade', 'Goo Grenade', 'Pyro Grenade', 'Smoke Grenade', 'Proximity Sensor', 'Explosive Mine'],
    'specialization': ['Cloaking Device', 'Evasive Dash', 'Grappling Hook', 'Dematerializer', 'Guardian Turret', 'Healing Beam', 'Shockwave', "Charge 'N' Slam", 'Goo Gun', 'Mesh Shield', 'Winch Claw'],
}
ALIASES = {'Chimera XB': 'Chimera-XB', 'Charge N Slam': "Charge 'N' Slam", 'Infuser': 'H+ Infuser'}

class ItemImages(HTMLParser):
    def __init__(self):
        super().__init__()
        self.images = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'img' and 'mw-file-element' in attrs.get('class', ''):
            self.images.append(attrs)

def fetch(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'DropzoneAssetSync/1.0 (item imagery attribution)'} )
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read(), response.headers.get_content_type()

def main():
    directory = ROOT / 'app/assets/finals/items'
    directory.mkdir(parents=True, exist_ok=True)
    manifest = {'schema': 1, 'source': 'THE FINALS Wiki', 'sourceUrl': HOST, 'retrievedAt': datetime.now(timezone.utc).isoformat(), 'owners': 'THE FINALS game artwork belongs to Embark Studios. Wiki content is CC BY-SA unless otherwise noted; game imagery retains its original ownership.', 'aliases': ALIASES, 'items': {}}
    for kind, names in CATALOG.items():
        for name in names:
            page = HOST + '/wiki/' + urllib.parse.quote(name.replace(' ', '_'))
            entry = {'kind': kind, 'pageUrl': page}
            try:
                html, _ = fetch(page)
                parser = ItemImages()
                parser.feed(html.decode('utf-8'))
                # The first article image is the item's infobox render, before icons/cosmetics.
                image = parser.images[0]
                source = urllib.parse.urljoin(HOST, image['src'])
                if '/thumb/' in source:
                    source = re.sub(r'/\d+px-', '/512px-', source)
                data, mime = fetch(source)
                if mime not in ('image/png', 'image/webp', 'image/jpeg'):
                    raise ValueError('Source is not a static item image: ' + mime)
                extension = {'image/png': '.png', 'image/webp': '.webp', 'image/jpeg': '.jpg'}[mime]
                filename = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-') + extension
                (directory / filename).write_bytes(data)
                entry.update(path='assets/finals/items/' + filename, imageUrl=source, sha256=hashlib.sha256(data).hexdigest(), sizeBytes=len(data))
                print('OK', name, len(data), flush=True)
            except Exception as error:
                entry['unavailable'] = str(error)
                print('UNAVAILABLE', name, error, flush=True)
            manifest['items'][name] = entry
    (ROOT / 'app/data/finals/item-images.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')

if __name__ == '__main__':
    main()
