from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
frames=[Image.open(p).convert('RGBA') for p in sorted((root/'.validation-cache/splash-frames').glob('frame-*.png'))]
assert len(frames)==54, 'Render all 54 frames first'
out=root/'app/assets/intro';out.mkdir(exist_ok=True)
frames[0].save(out/'dropzone-intro.webp',save_all=True,append_images=frames[1:],duration=[33]*53+[251],loop=1,quality=88,method=6)
frames[-1].save(out/'dropzone-still.webp',quality=92,method=6)
print('Encoded 2-second Blender ident:',(out/'dropzone-intro.webp').stat().st_size,'bytes')
