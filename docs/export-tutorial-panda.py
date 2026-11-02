from PIL import Image
from pathlib import Path
src=Path('C:/Users/Ania/.codex/generated_images/01a1785a-c33e-70d2-9291-76226bcc715a')
dst=Path('apps/client/public/tutorial')
for pose,source in [["welcome","exec-2d5814dd-0127-4655-a134-18920c56066d.png"],["aim","exec-2430d1b0-54b1-4d22-a3f0-18ca2fc46b90.png"],["cheer","exec-60c514f6-77b5-44be-9f7f-ef4ee0a06b8c.png"]]:
 with Image.open(src/source) as im:
  im=im.convert('RGBA'); box=im.getchannel('A').getbbox()
  if box: im=im.crop(box)
  im.thumbnail((512,512)); im.save(dst/('panda-'+pose+'.webp'),quality=92,method=6)
  print(pose,im.size,im.getchannel('A').getextrema())
