"""Stage reviewed source for GitHub's Git Data API without installing credentials.
Large community assets are deterministically hydrated on the preparation branch
by prepare-2.0.2.yml and verified before that branch is eligible for release.
"""
import subprocess,json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
changed=subprocess.check_output(['git','diff','--name-only'],cwd=root,text=True).splitlines()
new=subprocess.check_output(['git','ls-files','--others','--exclude-standard'],cwd=root,text=True).splitlines()
def include(p):
    return not (p=='.validation-cache-tests.txt' or p.startswith('app/assets/sotf/') or p.startswith('app/assets/wardogs/zestafona/') or ('/terrain/' in p and p.endswith('.bin')) or p.endswith('.blend1'))
paths=sorted(p for p in set(changed+new) if include(p))
text=[];binary=[]
for name in paths:
    p=root/name
    try: content=p.read_bytes().decode('utf-8')
    except UnicodeDecodeError: binary.append(name);continue
    text.append({'path':name,'mode':'100644','type':'blob','content':content})
(root/'.validation-cache/github-text.json').write_text(json.dumps(text),encoding='utf-8')
(root/'.validation-cache/github-binary.json').write_text(json.dumps(binary),encoding='utf-8')
print(len(text),'text files;',len(binary),'binary files:',binary)
