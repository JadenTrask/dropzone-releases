"""Download pinned community terrain, verify it, and retain every second vertex (4 m).
No height inference from map imagery. Original per-chunk encoding is retained.
Run explicitly when updating the reviewed dataset, never during app startup.
"""
from pathlib import Path
import array, concurrent.futures, hashlib, json, math, sys, urllib.request

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT/'app/data/wardogs'
BASE = 'https://assets.wardogs-artillery.com/releases/assets-v1/'
REV = 'b1463dab45fb7871a893f14d17f0064ef48e3724'

def download(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0'}), timeout=40) as response:
        return response.read()

def terrain(map_id):
    directory = DATA/'terrain'/map_id
    source = json.loads((directory/'manifest.json').read_text())
    output = {**source, 'format':'dropzone-terrain-u16-v1', 'verticesPerSide':256,
              'upstreamEvidenceLabel':source.get('evidence'), 'evidence':'COMMUNITY_ESTIMATE_NOT_GAME_VALIDATED',
              'sampleStrideQuads':2, 'vertexSpacingMeters':4, 'sourceRevision':REV,
              'gameBuild':'Not recorded by source; current game validation pending',
              'accuracy':'Community collision terrain; absolute datum unverified', 'chunks':{}}
    def chunk(item):
        key, entry = item
        dst = directory/entry['file']
        raw = download(BASE+'data/terrain/'+map_id+'/'+entry['file'])
        assert len(raw)==entry['bytes'] and hashlib.sha256(raw).hexdigest()==entry['sha256'], key
        samples=array.array('H'); samples.frombytes(raw)
        if sys.byteorder!='little': samples.byteswap()
        compact=array.array('H')
        for y in range(0,511,2): compact.extend(samples[y*511:y*511+511:2])
        if sys.byteorder!='little': compact.byteswap()
        payload=compact.tobytes(); dst.parent.mkdir(parents=True,exist_ok=True);dst.write_bytes(payload)
        return key,{**entry,'bytes':len(payload),'sha256':hashlib.sha256(payload).hexdigest(),'sourceSha256':entry['sha256']}
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        for index,(key,entry) in enumerate(pool.map(chunk,source['chunks'].items()),1):
            output['chunks'][key]=entry
            if index%64==0: print(map_id,index,'/ 256 verified',flush=True)
    (directory/'dataset.json').write_text(json.dumps(output,indent=2))

def zestafona():
    reference=json.loads((DATA/'zestafona-reference.json').read_text())
    expected={f['path']:f['sha256'] for f in json.loads((DATA/'zestafona-assets.json').read_text())['files']}
    b,t=reference['bounds'],reference['tileBounds']; limits={};jobs=[]
    for z in range(6):
        n=2**z; dx=(t['maxX']-t['minX'])/n;dy=(t['maxY']-t['minY'])/n
        left=max(0,math.floor((b['minX']-t['minX'])/dx));right=min(n-1,math.floor((b['maxX']-t['minX'])/dx))
        top=max(0,math.floor((t['maxY']-b['maxY'])/dy));bottom=min(n-1,math.floor((t['maxY']-b['minY'])/dy))
        limits[str(z)]=[left,right,top,bottom]
        jobs.extend(f'zoom_{z}/{x}_{y}.webp' for y in range(top,bottom+1) for x in range(left,right+1))
    def tile(rel):
        url=reference['tiles']['path']+'/'+rel; raw=download(url)
        assert raw[:4]==b'RIFF' and raw[8:12]==b'WEBP',rel
        assert hashlib.sha256(raw).hexdigest()==expected['assets/wardogs/zestafona/'+rel], 'Map imagery changed: '+rel
        path=ROOT/'app/assets/wardogs/zestafona'/rel;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(raw)
        return {'path':path.relative_to(ROOT/'app').as_posix(),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'source':url}
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool: assets=list(pool.map(tile,jobs))
    (DATA/'zestafona-assets.json').write_text(json.dumps({'revision':REV,'files':assets},indent=2))
    maps=json.loads((DATA/'maps.json').read_text())
    entry={k:reference[k] for k in ['id','name','bounds','tileBounds','coordinateMetersPerUnit']}
    entry.update(tiles={'path':'assets/wardogs/zestafona','tileSize':256,'minZoom':0,'maxZoom':5,'limits':limits,'remotePath':reference['tiles']['path']},
                 markers=[{'x':p['x']/100,'y':p['y']/100,'name':p['label']} for p in reference['markers'] if p['icon']=='tower'],
                 sourceRevision=REV,sourceUrl='https://wardogs-artillery.com/',referenceUrl='https://wardogs-artillery.com/maps/zestafona/')
    maps['maps']=[m for m in maps['maps'] if m['id']!='zestafona']+[entry]
    (DATA/'maps.json').write_text(json.dumps(maps,indent=2))
    print('Zestafona:',len(assets),'map tiles verified',flush=True)

if __name__=='__main__':
    zestafona()
    for map_id in ['bakurani','ozeti','zestafona']: terrain(map_id)
