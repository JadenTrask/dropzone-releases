"""Create viewport tiles from the publicly shared game-map image; no generated terrain.
Source: https://github.com/ZedimAits/GZW_map/blob/main/GZW_Map.jpg
Game imagery belongs to MADFINGER Games. This does not copy that project's code.
"""
from pathlib import Path
from PIL import Image
import json,sys,hashlib,io,os
def save_tile(image,path):
 buffer=io.BytesIO();image.save(buffer,format='WEBP',quality=85);data=buffer.getvalue()
 temporary=path.with_suffix('.tmp')
 with temporary.open('wb') as stream:
  stream.write(data);stream.flush();os.fsync(stream.fileno())
 with Image.open(temporary) as check:
  check.load();assert check.size==image.size
 temporary.replace(path)
root=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1]);im=Image.open(source).convert('RGB');out=root/'app/assets/gzw';out.mkdir(exist_ok=True)
preview=im.copy();preview.thumbnail((2048,2048));save_tile(preview,out/'lamang-overview.webp')
size=1024;tiles=[]
for y in range(0,im.height,size):
 for x in range(0,im.width,size):
  tile=im.crop((x,y,min(x+size,im.width),min(y+size,im.height)));name=f'lamang-{x//size}-{y//size}.webp';save_tile(tile,out/name)
  tiles.append({'x':x,'y':y,'width':tile.width,'height':tile.height,'asset':'assets/gzw/'+name})
# Reference grid sampled from the in-game wiki screenshot; feature alignment
# gives a 0.87-reference-pixel median residual, with ten matched features.
# This is an estimated grid alignment, not an in-game survey.
scale=.918086855;offsetX=31.3336057;offsetY=-17.9197818
referenceX=69;referenceY=110;gridPixels=127.3
unitPerPreviewPixel=scale/12.73
minX=100+(offsetX-referenceX)/12.73;maxY=170-(offsetY-referenceY)/12.73
bounds={'minX':minX,'maxX':minX+2048*unitPerPreviewPixel,'maxY':maxY,'minY':maxY-(im.height*2048/im.width)*unitPerPreviewPixel}
config={'id':'lamang','name':'Lamang Island','width':im.width,'height':im.height,'tileSize':size,'overview':'assets/gzw/lamang-overview.webp','tiles':tiles,'bounds':bounds,'coordinateMetersPerUnit':100,'sourceUrl':'https://github.com/ZedimAits/GZW_map','sourceAsset':'https://raw.githubusercontent.com/ZedimAits/GZW_map/main/GZW_Map.jpg','sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'imageryDate':None,'calibration':'Estimated against an in-game grid screenshot. Map imagery is an undated community snapshot and may omit changes in later patches.','referenceUrl':'https://gray-zone-warfare.fandom.com/wiki/Locations','reviewedAt':'2026-09-06'}
(root/'app/data/gzw/map.json').write_text(json.dumps(config,indent=2)+'\n')
print(f'{len(tiles)} map tiles; {im.width} × {im.height}',bounds)
