import urllib.request,concurrent.futures,json,os
from pathlib import Path
root=Path(__file__).resolve().parents[1]
c=json.loads((root/'app/data/catalog.json').read_text());version=c['version'];tasks=[]
for champ in c['champions']:tasks.append((f'https://ddragon.leagueoflegends.com/cdn/{version}/img/champion/{champ["id"]}.png',root/f'app/assets/champions/{champ["id"]}.png'))
for champ in ['Ahri','Jinx','Yasuo','Lux','Zed','Viego','Aatrox','Kaisa','LeeSin','MissFortune']:
 tasks.append((f'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/{champ}_0.jpg',root/f'app/assets/splashes/{champ}.jpg'))
ids=set()
for p in (root/'app/data/builds').glob('*.json'):
 b=json.loads(p.read_text())
 for s in b.get('summaries',{}).values():
  for k,v in s.get('items',{}).items():
   if isinstance(v,dict):ids.update(v.get('set',[]))
   else:ids.update(x['id'] for x in v)
 for i in b.get('prismatics',[]):ids.add(i['id'])
 for r in b.get('items',{}).get('popularItem',[])[:15]:ids.add(r[0])
for id in ids:
 if str(id) in c['items']:tasks.append((f'https://ddragon.leagueoflegends.com/cdn/{version}/img/item/{id}.png',root/f'app/assets/items/{id}.png'))
for r in c['runes'].values():
 if r.get('icon'):tasks.append((f'https://ddragon.leagueoflegends.com/cdn/img/{r["icon"]}',root/f'app/assets/runes/{r["id"]}.png'))
for s in c['spells'].values():tasks.append((f'https://ddragon.leagueoflegends.com/cdn/{version}/img/spell/{s["image"]}',root/f'app/assets/spells/{s["key"]}.png'))
def get(t):
 u,p=t
 if p.exists():return True
 try:
  b=urllib.request.urlopen(u,timeout=15).read();p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b);return True
 except Exception as e:return str(p.name)+': '+str(e)
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 results=list(pool.map(get,tasks))
print('Downloaded',sum(r is True for r in results),'of',len(tasks))
print([r for r in results if r is not True][:15])
