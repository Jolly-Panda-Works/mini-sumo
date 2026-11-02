from PIL import Image
from pathlib import Path
items=[{"id":"auto-on","source":"C:\\Users\\Ania\\.codex\\generated_images\\01a1785a-c33e-70d2-9291-76226bcc715a\\exec-1708b9e2-a267-4839-ae76-d643546876bb.png"},{"id":"auto-off","source":"C:\\Users\\Ania\\.codex\\generated_images\\01a1785a-c33e-70d2-9291-76226bcc715a\\exec-67dc17c8-8951-44e1-a78c-910419564e9e.png"},{"id":"manual-on","source":"C:\\Users\\Ania\\.codex\\generated_images\\01a1785a-c33e-70d2-9291-76226bcc715a\\exec-947df77d-4e8f-442d-bf9e-edaef16f4b7d.png"},{"id":"manual-off","source":"C:\\Users\\Ania\\.codex\\generated_images\\01a1785a-c33e-70d2-9291-76226bcc715a\\exec-b38c54c8-d635-4e03-861e-5eeda0a4d441.png"}]
for item in items:
 with Image.open(item['source']) as im:
  im=im.convert('RGBA'); box=im.getchannel('A').getbbox()
  if box: im=im.crop(box)
  im.resize((612,220),Image.Resampling.LANCZOS).save(Path('apps/client/public/ui')/('dash-'+item['id']+'.webp'),quality=92,method=6)
  print(item['id'], im.getchannel('A').getextrema())
