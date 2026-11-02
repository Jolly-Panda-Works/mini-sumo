# Mini Sumo: landing page art

فهرست تصاویر تازه‌ی لندینگ (`apps/landing`) با پرامپت آماده. صفحه همین حالا بدون این‌ها کار می‌کند؛ هر فایل یک جای موقت را با تصویر بهتر عوض می‌کند.
پرامپت‌ها انگلیسی‌اند چون مدل‌های تصویرساز با انگلیسی دقیق‌ترند.

**روش استفاده:** برای هر تصویر، **Scene style** (بخش ۱) را بدون تغییر بفرستید و بعد پرامپت همان تصویر را اضافه کنید. برای یکدست ماندن، `apps/client/public/tutorial/panda-welcome.webp` و یکی از تصاویر `apps/client/public/arenas/` را هم به‌عنوان رفرنس ضمیمه کنید.

**وضعیت:** دره‌ی مهتابی، پاندای شب، رینگ، پنج فصل داستان، تپه‌ی پایانی، شاخ‌وبرگ، پاندای جارو به‌دست و گروه کشتی‌گیرها تحویل شده‌اند و در `apps/landing/assets/` هستند. فقط `panda-cliff` اختیاری مانده است.

**تحویل:** فایل‌ها را با همین نام‌ها و با فرمت PNG در `docs/landing-art/` بگذارید. تبدیل به WebP، بهینه‌سازی حجم و اتصال به صفحه با من است.

**قانون‌ها:**

- هیچ متن، حرف، لوگو یا واترمارکی داخل تصویر نباشد؛ متن‌ها فارسی و انگلیسی‌اند و در HTML می‌آیند.
- کاراکترها همان پاندا و کشتی‌گیرهای بازی باشند و کاراکتر تازه ساخته نشود.
- تصاویر «پس‌زمینه شفاف» باید آلفای واقعی داشته باشند. اگر مدل شفافیت نمی‌دهد، روی رنگ یکدست سبز `#00FF00` بسازید تا من جدا کنم.

---

## 1. Scene style (prefix every request)

```
STYLE: "Mini Sumo" key art for a game website. Hand-painted 2D cartoon illustration in the look
of a polished casual mobile game: bold dark outlines (#2B2340), soft cel shading, rounded, chunky,
toy-like shapes, warm and cheerful, never realistic or gritty. Light comes from a low sun behind
the scene, with a glowing rim on the shapes.

WORLD: a storybook Japan of sumo festivals. Dohyo rings of pale clay with a straw rope circle,
red-lacquer torii gates and curved shrine roofs, nobori banners, paper lanterns, shimenawa rope,
pine trees, bamboo, snow-capped mountains and big puffy clouds.

PALETTE: dusk sky from indigo #2A2A7C through violet #6C3F9E to coral #FF7A6B and sun #FFC23C;
night ink #17122B for the deepest shadows; clay #E7C996; red lacquer #C0392F; pine green #2B7A4B.

NO text, letters, logos, signatures, UI or watermarks anywhere in the image.
```

---

## 2. اولویت ۱: تأثیر بیشتر روی صفحه

### 2.1 لایه‌های قهرمان

این پنج لایه روی هم قرار می‌گیرند و با موس و اسکرول حرکت می‌کنند، پس باید جداگانه و با یک قاب مشترک ساخته شوند. **اندازه همه: 2400×1500.** چیزهای مهم باید در ستون وسط باشند، چون در موبایل دو طرف تصویر بریده می‌شود. ۴۵٪ بالای قاب هم برای لوگو و دکمه‌ها خالی بماند.

| فایل | پس‌زمینه | پرامپت |
|---|---|---|
| `hero-1-sky.png` | پر | `Wide dusk sky only: indigo at the top melting into violet, coral and a golden glow at the horizon in the center, a few early stars and thin painted cloud streaks. No land.` |
| `hero-2-mountains.png` | شفاف | `A wide range of distant snow-capped mountains along the lower half, soft violet tones with pale peaks and a golden rim light. Transparent sky above. A small shrine roof sits on one far ridge.` |
| `hero-3-ring.png` | شفاف | `The legendary ring above the clouds: a floating sumo dohyo of pale clay on a rocky underside, a golden straw rope circle, a red-lacquer torii roof above it held by four posts, small paper lanterns and nobori banners. It rests on a bank of puffy pink-white clouds, centered in the lower-middle of the frame, seen slightly from above. Transparent everywhere else.` |
| `hero-4-hills.png` | شفاف | `Rolling hills in deep indigo along the bottom third, dotted with rounded pine trees and a few glowing paper lanterns on strings. Transparent above.` |
| `hero-5-foreground.png` | شفاف | `Nearly black foreground silhouette (#17122B): a low hill across the bottom, rising into a grassy cliff on the right side, with bamboo leaves and pine branches framing both top corners. Transparent center.` |

### 2.2 پاندای مربی

| فایل | اندازه | پس‌زمینه | پرامپت |
|---|---|---|---|
| `panda-cliff.png` | 1024×1024 | شفاف | `The panda sumo coach from the reference, seen from behind and slightly to the side, standing on one spot, one arm pointing far into the distance at something high up. Orange and gold mawashi, topknot. Full body.` |
| `panda-broom.png` | 1024×1024 | شفاف | `The panda sumo coach from the reference happily sweeping the ground with a traditional bamboo broom, a little dust around the broom. Full body. Simple, clear silhouette.` |

`panda-broom` برای لودر است و در صفحه به‌صورت سایه تیره نمایش داده می‌شود، پس طرح کلی‌اش باید خوانا باشد.

### 2.3 تصاویر فصل‌های داستان

الان از تصاویر آرنا با نوشته‌ی انگلیسی استفاده می‌شود. این پنج تصویر جای آن‌ها را می‌گیرند. **اندازه همه: 1280×800، پس‌زمینه پر.** کاراکتر اصلی در هر پنج تصویر همان کشتی‌گیر کوچک با کمربند قرمز است.

| فایل | پرامپت |
|---|---|
| `chapter-1-scroll.png` | `A dusty training yard at morning with straw dummies and a wooden fence. The panda coach kneels and hands a rolled paper scroll to a small round young sumo wrestler in a red belt, who looks up with big hopeful eyes.` |
| `chapter-2-bow.png` | `A small village festival ring on green grass under paper lanterns. The small wrestler in the red belt bows to a rival while a friendly crowd cheers from wooden benches. A few gold coins sparkle at the edge of the ring.` |
| `chapter-3-drums.png` | `A torch-lit arena at night. Huge taiko drums are beaten behind the ring and shockwave lines shake the air. The small wrestler in the red belt braces against a big veteran wrestler, dust flying from their feet.` |
| `chapter-4-palace.png` | `A grand red and gold palace hall with tall banners and a raised ring. Great gates swing open with light pouring through, and the small wrestler in the red belt, now confident, walks in alone on a long red carpet.` |
| `chapter-5-clouds.png` | `The floating ring above the clouds at golden hour, sea of clouds below and purple-gold lightning far away. The wrestler in the red belt faces one last giant silhouetted rival across the ring. Epic but cute.` |

---

## 3. اولویت ۲: پرداخت نهایی

| فایل | اندازه | پس‌زمینه | پرامپت |
|---|---|---|---|
| `finale-bg.png` | 2400×1350 | پر | `Dusk landscape seen from a grassy hilltop: mountains, a sea of clouds and, tiny and far away, the floating ring glowing in the golden sky. The top half is open sky for a heading. Peaceful, calm ending scene.` |
| `crew.png` | 2048×1024 | شفاف | `A row of five cute round sumo wrestlers from the reference, each in a different costume and hairstyle (samurai helmet, oni mask, flower kimono, headband, thunder god), standing shoulder to shoulder and flexing proudly. Full bodies.` |
| `leaves-left.png` | 1024×1024 | شفاف | `Near-black (#17122B) bamboo and pine foliage silhouette growing from the top-left corner, with a few leaves caught by a faint violet rim light. The rest of the image is transparent.` |

برای `leaves-right` همین تصویر را آینه می‌کنم و نیازی به فایل جدا نیست.

---

## 4. لازم نیست

این‌ها از قبل کافی هستند و تصویر تازه نمی‌خواهند: لوگوی Mini Sumo، پرچم‌های قدرت، اسکرین‌شات‌های بازی، کروسل آرناها و چهره‌ی کشتی‌گیرها.
