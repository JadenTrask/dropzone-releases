from pathlib import Path
import json,re
root=Path(__file__).resolve().parents[1]
p=root/'core/games.json';games=json.loads(p.read_text(encoding='utf-8'));p.write_text(json.dumps([g for g in games if g['id'] not in ['valorant','rivals']],indent=2)+'\n',encoding='utf-8')
def modify(file,fn):
 p=root/file;p.write_text(fn(p.read_text(encoding='utf-8')),encoding='utf-8')
def no_lines(s,prefixes):return '\n'.join(l for l in s.splitlines() if not any(l.startswith(x) for x in prefixes))+'\n'
modify('app/command-model.js',lambda s:s.replace("'wardogs','valorant','rivals'","'wardogs'").replace("!GAMES.includes(value.game)","![...GAMES,'valorant','rivals'].includes(value.game)"))
modify('app/hub.js',lambda s:s.replace('state.games=await api.games();',"state.games=(await api.games()).filter(g=>!['valorant','rivals'].includes(g.id));").replace(",'valorant','rivals'",'').replace("else if(g.kind==='arena'){mountCommandCenter(g.id,'roster');}",''))
def command(s):
 s=no_lines(s,["import valorant ","import rivals ","function roster(){"," if(name==='hero-plan')"])
 s=s.replace(",roster:'Roster'",'').replace("tab==='roster'?roster():",'').replace("filter==='all'?'valorant':filter","filter==='all'?'wardogs':filter")
 s=s.replace("const items=Object.entries(labels).filter(([k])=>k!=='roster'||['valorant','rivals'].includes(filter));","const items=Object.entries(labels);")
 s=s.replace("tab=['valorant','rivals'].includes(filter)?'roster':'build'","tab='build'")
 s=s.replace("getState().records.map(r=>({id:'command'","getState().records.filter(r=>GAMES.includes(r.game)).map(r=>({id:'command'")
 s=s.replace("if(game&&GAMES.includes(game))filter=game;", "if(game&&GAMES.includes(game))filter=game;")
 return s
modify('app/command-center.js',command)
def planning(s):
 s=no_lines(s,["import valorant ","import rivals "," else if(['valorant','rivals'].includes(game))"])
 s=s.replace("(record.game==='valorant'?valorant:rivals).heroes","[]")
 s=s.replace("['valorant','rivals'].includes(record.game)?'Role reference: official roster, checked '+e((record.game==='valorant'?valorant:rivals).checkedAt)+'. Multiple-role picks only cover the role you plan to play.':",'')
 return s
modify('app/game-planning.js',planning)
def tools(s):
 s=no_lines(s,["import valorant "," if(action==='valorant-weapon')"])
 s=s.replace("filter==='all'?'valorant':filter","filter==='all'?'wardogs':filter")
 s=s.replace('VALORANT: official roster + dated community weapon data.<br>Marvel Rivals: official roster and role catalog.<br>','')
 s=re.sub(r'<section class="cc-panel">\$\{heading\(\'VALORANT weapon reference\'.*?</section>', '', s)
 return s
modify('app/command-tools.js',tools)
modify('app/workspace-extras.js',lambda s:s.replace(",['val','VALORANT weapon reference']",'').replace("pin.dataset.game:'valorant'","pin.dataset.game:'wardogs'"))
modify('app/session-workflow.js',lambda s:s.replace("filter==='all'?'valorant':filter","filter==='all'?'wardogs':filter"))
modify('app/workspace-tools.js',lambda s:s.replace(",'VALORANT weapon stats'",''))
modify('app/personal-intel.js',lambda s:s.replace(",'valorant','rivals'",'').replace(",['valorant','VALORANT'],['rivals','Marvel Rivals']",''))
modify('desktop/command-service.cjs',lambda s:s.replace(",'valorant','rivals'",'').replace("valorant:['valorant-win64-shipping.exe'],rivals:['marvel-win64-shipping.exe','marvelrivals.exe'],",''))
modify('core/patch-provider.cjs',lambda s:no_lines(s,['  valorant:', '  rivals:']))
p=root.parent/'dropzone-site/public/index.html';s=p.read_text(encoding='utf-8');s=s.replace('<span>VALORANT</span><span>MARVEL RIVALS</span>','');s=re.sub(r'<article class="game-card arena-card.*?</article>','',s);s=s.replace('Version 2.2.0 adds the session center, VALORANT and Marvel Rivals.','Game tools keep your saved builds and plans together.');p.write_text(s,encoding='utf-8')
