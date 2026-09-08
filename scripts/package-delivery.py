"""Create and verify friend-shareable ZIPs after npm run package:win."""
from pathlib import Path
import hashlib
import json
import struct
import zipfile

ROOT = Path(__file__).resolve().parents[1]
RELEASE = ROOT / "release" / "Dropzone-win32-x64"
OUT = ROOT.parent / "deliverables"
OUT.mkdir(exist_ok=True)
VERSION = json.loads((ROOT / 'package.json').read_text())['version']
setup_name = f'Dropzone-Setup-{VERSION}-x64.exe'
setup_source = ROOT / 'release' / 'installer' / setup_name
assert setup_source.is_file() and setup_source.stat().st_size > 10_000_000, 'Installer build is missing'
setup = OUT / setup_name
setup.write_bytes(setup_source.read_bytes())
assert setup.read_bytes()[:2] == b'MZ', 'Installer is not a Windows executable'
exe = RELEASE / "Dropzone.exe"
with exe.open('rb') as stream:
    assert stream.read(2) == b'MZ', 'Missing Windows executable'
    stream.seek(0x3c)
    pe = struct.unpack('<I', stream.read(4))[0]
    stream.seek(pe)
    assert stream.read(4) == b'PE\0\0'
    assert struct.unpack('<H', stream.read(2))[0] == 0x8664, 'Wrong architecture'
assert (RELEASE / 'resources/app.asar').stat().st_size > 1_000_000
for name in ['README.md', 'START-HERE.txt']:
    (RELEASE / name).write_bytes((ROOT / name).read_bytes())
(RELEASE / 'DROPZONE-LICENSE.txt').write_bytes((ROOT / 'LICENSE').read_bytes())
(RELEASE / 'VALIDATION.md').write_bytes((ROOT / 'docs/VALIDATION.md').read_bytes())

def archive(target, entries):
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for source, name in entries:
            z.write(source, name)
    with zipfile.ZipFile(target) as z:
        bad = z.testzip()
        assert bad is None, f'ZIP integrity error: {bad}'
        assert len(z.namelist()) > 10
    assert target.stat().st_size > 1_000_000

windows = OUT / 'Dropzone-Windows-x64.zip'
archive(windows, ((p, 'Dropzone/' + p.relative_to(RELEASE).as_posix())
                  for p in sorted(RELEASE.rglob('*')) if p.is_file()
                  and not any(part.startswith('.') for part in p.relative_to(RELEASE).parts)))
print('Windows archive:', windows.stat().st_size, 'bytes; CRC verified', flush=True)
source = OUT / 'Dropzone-Source.zip'
excluded = {'node_modules', 'release', 'screenshots', '__pycache__'}
files = (p for p in sorted(ROOT.rglob('*')) if p.is_file()
         and not any(part in excluded or part.startswith('.') for part in p.relative_to(ROOT).parts))
archive(source, ((p, 'Dropzone-Source/' + p.relative_to(ROOT).as_posix()) for p in files))
print('Source archive:', source.stat().st_size, 'bytes; CRC verified', flush=True)

def digest(p):
    h = hashlib.sha256()
    with p.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()

hashes = OUT / 'Dropzone-SHA256.txt'
hashes.write_text(''.join(f'{digest(p)}  {p.name}\n' for p in [setup, windows, source]), encoding='utf-8')
print(hashes.read_text(), flush=True)
