"""Bundle the playable parts of the reference maps at a pinned revision.

Source code and original calibration data: Apollyon, MIT (see third-party notices).
WARDOGS map artwork remains property of its game rights holders.
"""
from pathlib import Path
import concurrent.futures
import hashlib
import json
import math
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
REVISION = 'c3252c9d24a22d1aad5d3fa4408807aef591bb56'
BASE = 'https://raw.githubusercontent.com/apollyon-sys/wardogs-calculator/' + REVISION + '/'
OUT = ROOT / 'app/assets/wardogs'
DATA = ROOT / 'app/data/wardogs'

def fetch(path, destination):
    if destination.exists():
        return destination.read_bytes()
    with urllib.request.urlopen(BASE + path, timeout=40) as response:
        content = response.read()
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(content)
    return content

def main():
    DATA.mkdir(parents=True, exist_ok=True)
    maps = []
    jobs = []
    for name in ['bakurani', 'ozeti']:
        m = json.loads(fetch('maps/' + name + '.json', DATA / (name + '-reference.json')))
        b, t = m['bounds'], m['tileBounds']
        limits = {}
        for z in range(6):
            n = 2 ** z
            dx, dy = (t['maxX'] - t['minX']) / n, (t['maxY'] - t['minY']) / n
            left = max(0, math.floor((b['minX'] - t['minX']) / dx))
            right = min(n-1, math.floor((b['maxX'] - t['minX']) / dx))
            top = max(0, math.floor((t['maxY'] - b['maxY']) / dy))
            bottom = min(n-1, math.floor((t['maxY'] - b['minY']) / dy))
            limits[str(z)] = [left, right, top, bottom]
            for y in range(top, bottom+1):
                for x in range(left, right+1):
                    rel = f'{name}/zoom_{z}/{x}_{y}.webp'
                    jobs.append(('maps/tiles/' + rel, OUT / rel))
        maps.append({
            'id': name, 'name': m['name'], 'bounds': b, 'tileBounds': t,
            'coordinateMetersPerUnit': m['coordinateMetersPerUnit'],
            'tiles': {'path': 'assets/wardogs/' + name, 'tileSize': 256, 'minZoom': 0, 'maxZoom': 5, 'limits': limits},
            'markers': [{'x': p['x']/100, 'y': p['y']/100, 'name': p['label']} for p in m['markers'] if p['icon'] == 'tower'],
            'sourceUrl': 'https://wardogs-artillery.com/',
            'referenceUrl': 'https://metaforge.app/wardogs/map/' + name,
        })
    (DATA/'maps.json').write_text(json.dumps({'revision': REVISION, 'reviewedAt': '2026-09-06', 'maps': maps}, indent=2))
    fetch('data/weapons.json', DATA/'weapons-reference.json')
    notice = ROOT/'third-party/WARDOGS-calculator-MIT.txt'
    fetch('LICENSE', notice)
    total = 0
    def download(job):
        src, dst = job
        content = fetch(src, dst)
        if content[:4] != b'RIFF' or content[8:12] != b'WEBP':
            raise ValueError('Invalid map tile: ' + src)
        return {'path': dst.relative_to(ROOT/'app').as_posix(), 'bytes': len(content), 'sha256': hashlib.sha256(content).hexdigest()}
    manifest = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        for i, result in enumerate(pool.map(download, jobs), 1):
            manifest.append(result)
            total += result['bytes']
            if i % 100 == 0:
                print(f'Map tiles: {i}/{len(jobs)}', flush=True)
    (DATA/'assets.json').write_text(json.dumps({'revision': REVISION, 'source': BASE, 'files': manifest}))
    print(f'Complete: {len(manifest)} map tiles, {total:,} bytes', flush=True)

if __name__ == '__main__':
    main()
