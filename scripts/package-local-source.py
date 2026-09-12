"""Archive the actual local work, including untracked source, without publishing."""
from pathlib import Path
import hashlib
import json
import os
import zipfile

root = Path(__file__).resolve().parents[1]
version = json.loads((root / 'package.json').read_text())['version']
out = root.parent / 'deliverables' / ('Dropzone-' + version + '-local')
out.mkdir(parents=True, exist_ok=True)
excluded = {'node_modules', 'release', 'dist', 'screenshots', 'coverage', '__pycache__', 'test-results', 'playwright-report'}

for source, label in [(root, 'Dropzone-Source'), (root.parent / 'dropzone-site', 'Dropzone-Website-Source')]:
    target = out / f'{label}-{version}.zip'
    if target.exists():
        raise RuntimeError(f'Refusing to overwrite {target}')
    manifest = {}
    with zipfile.ZipFile(target, 'x', zipfile.ZIP_DEFLATED, compresslevel=1) as archive:
        for directory, dirs, files in os.walk(source):
            dirs[:] = sorted(d for d in dirs if d not in excluded and (not d.startswith('.') or d in {'.github', '.openai'}))
            for name in sorted(files):
                p = Path(directory) / name
                rel = p.relative_to(source).as_posix()
                if p.is_symlink() or (name.startswith('.') and name != '.gitignore') or '.env' in name or name.endswith(('.blend1', '.log')):
                    continue
                if rel.startswith('.openai/') and rel != '.openai/hosting.json':
                    continue
                data = p.read_bytes()
                archive.writestr(label + '/' + rel, data)
                manifest[rel] = hashlib.sha256(data).hexdigest()
        archive.writestr(label + '/LOCAL-SNAPSHOT-SHA256.json', json.dumps(manifest, indent=2))
    with zipfile.ZipFile(target) as archive:
        assert archive.testzip() is None
    print(target, target.stat().st_size, 'bytes; CRC verified', flush=True)
