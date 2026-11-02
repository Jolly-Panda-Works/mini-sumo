# Mini Sumo: opening comic art

پرامپت ۱۳ قاب کات‌سین شروع بازی (`apps/client/src/ui/StoryCutscene.tsx`). هر قاب تصویر اختصاصی خودش را دارد و دیگر از تصاویر داستان برش زده نمی‌شود، پس هر سوژه کامل و در جای درست می‌نشیند.

**روش استفاده:** برای هر قاب، **Comic style** (بخش ۱) را بدون تغییر بفرستید و بعد پرامپت همان قاب را اضافه کنید. این فایل‌ها را هم به‌عنوان رفرنس ضمیمه کنید تا کاراکترها یکی بمانند:

- پاندا: `apps/client/public/tutorial/panda-welcome.webp`
- کشتی‌گیر کوچک: `apps/client/public/story/chapter-1.webp`
- سبک و رنگ صحنه: `apps/client/public/story/chapter-3.webp`

**وضعیت:** هر ۱۳ قاب تحویل شده‌اند و در `apps/client/public/story/` هستند (`1-1.webp` تا `6-2.webp`).

**اندازه‌ها:** نسبت هر قاب دقیقاً با جایش در گوشی یکی است. اگر مدل اندازه دقیق نمی‌دهد، نزدیک‌ترین نسبت را بگیرید.

| نوع | اندازه | نسبت |
|---|---|---|
| بلند | 1024×1160 | حدود ۷:۸ |
| میانی | 1200×900 | ۴:۳ |
| پهن | 1500×1000 | ۳:۲ |
| باریک | 1600×750 | ۲:۱ |

**قانون کپشن:** متن روی ۲۵٪ پایین قاب می‌نشیند، پس صورت‌ها، دست‌ها، سکه‌ها و هر چیز مهم باید در ۷۵٪ بالای تصویر باشند. پایین قاب فقط زمین، ابر یا فضای خلوت باشد.

---

## 1. Comic style (prefix every request)

```
STYLE: one panel of a cute "Mini Sumo" comic book. Hand-drawn 2D cartoon with bold dark outlines
(#2B2340), soft cel shading, rounded chunky toy-like shapes, warm and cheerful, never realistic
or gritty. Dynamic comic composition with one clear subject and a strong silhouette, readable at
phone size.

CHARACTERS, keep exactly as in the attached references:
- THE HERO: a small, round young sumo wrestler with a black topknot, big eyes, rosy cheeks and a
  red mawashi belt. Always the same child-like proportions.
- THE COACH: a big friendly panda sumo coach with a dark topknot and an orange and gold mawashi
  with a wave pattern.

WORLD: a storybook Japan of sumo festivals, with clay dohyo rings, straw rope circles, red lacquer,
paper lanterns, nobori banners, pine trees and big puffy clouds.

COMPOSITION RULE: the whole subject stays inside the frame, nothing important touches the edges.
Keep every face, hand and key object in the top 75% of the image. The bottom 25% is calm, simple
ground, clouds or empty space, because a caption will be placed there.

NO text, letters, speech bubbles, sound effects, panel borders, frames, logos or watermarks.
```

---

## 2. Panels

### Page 1: the legend

**`story-1-1.png`, 1500×1000** (caption: They say there is a ring above the clouds.)

```
Wide establishing shot of a small floating dohyo with a red shrine roof, seen whole and centered
in the upper part of the frame, high above a sea of pink and gold clouds at sunset. Tiny, distant
and mysterious, with a soft golden glow around it. Calm empty clouds along the bottom.
```

**`story-1-2.png`, 1600×750** (caption: Only the very best ever set foot on it.)

```
Very wide panel. Three tiny dark silhouettes of mighty champions stand side by side on the edge of
the floating ring, arms crossed, seen from far below against a bright golden sky. Awe-inspiring.
The figures sit in the upper part of the frame, soft clouds fill the bottom.
```

**`story-1-3.png`, 1500×1000** (caption: You're still small and round. But the panda coach has seen something in you.)

```
At dusk beside a dirt path, THE HERO tries to lift a heavy straw bale, wobbling and determined,
while THE COACH watches from behind a pine tree with a knowing smile. Paper lanterns glow above.
Both characters are complete and in the upper two thirds. Plain path along the bottom.
```

### Page 2: the scroll

**`story-2-1.png`, 1024×1160** (caption: The panda hands you a scroll.)

```
In a dusty training yard with a wooden fence, THE COACH kneels and holds out a rolled paper scroll
with a red ribbon to THE HERO, who reaches up with both hands. Both figures complete, from head to
feet, facing each other, with the scroll at the center of the panel. Plain sandy ground at the bottom.
```

**`story-2-2.png`, 1200×900** (caption: One rule is written on it: stay in the ring.)

```
Close-up from over THE HERO's shoulder: small hands hold the unrolled paper scroll, which shows only
a single simple drawing of a circle with a small round figure inside it. Warm morning light. The
scroll fills the upper part of the panel. No writing on the scroll. Soft blurred ground below.
```

### Page 3: the first bow

**`story-3-1.png`, 1024×1160** (caption: Your first bow in front of a real crowd.)

```
A village festival ring on green grass under strings of paper lanterns. THE HERO and a friendly
rival in a blue belt bow to each other, seen from the side, with a cheering crowd of happy villagers
behind them. Both wrestlers complete and in the upper two thirds. Plain clay ring along the bottom.
```

**`story-3-2.png`, 1200×900** (caption: Every win brings Sumo Coins, and the next arena closer.)

```
THE HERO jumps for joy with both arms raised while shiny gold coins rain around him. Behind him a
wooden signpost points up a mountain road towards a bigger arena in the distance. The hero and the
coins are in the upper three quarters. Plain grass at the bottom.
```

### Page 4: the drums

**`story-4-1.png`, 1200×900** (caption: The taiko drums shake the ground.)

```
A huge red taiko drum beaten by a powerful drummer seen from behind, under torchlight at night in
a packed arena. Visible shockwave rings spread from the drum and dust jumps off the floor. The drum
is complete and centered in the upper part. Dark wooden floor at the bottom.
```

**`story-4-2.png`, 1024×1160** (caption: Rivals hit harder. Only a well-timed dash will move them.)

```
THE HERO dashes shoulder first into a giant veteran wrestler with a gold rope belt, with speed lines
and flying dust, on a torch-lit ring. The big rival slides back, surprised. Both complete, from head
to feet, in the upper three quarters. Plain clay ring along the bottom.
```

### Page 5: the palace

**`story-5-1.png`, 1200×900** (caption: The palace gates open only for true winners.)

```
Huge red and gold palace gates swing open, with blinding golden light pouring through. THE HERO
stands small and complete in front of them, seen from behind, with his shadow stretching towards
the viewer. The gates and hero fill the upper three quarters. Plain stone floor at the bottom.
```

**`story-5-2.png`, 1024×1160** (caption: Here your name reaches the banners.)

```
THE HERO, seen in three-quarter view from the front, looks up in wonder at a tall red and gold
banner being raised in a grand hall. The banner carries only a simple crest of a round wrestler,
no writing. Silhouettes of a crowd cheer on the balconies. Face and banner in the upper three
quarters. Red carpet along the bottom.
```

### Page 6: above the clouds

**`story-6-1.png`, 1024×1160** (caption: Clouds below. One last rival ahead.)

```
On the floating ring above a sea of clouds at sunset, THE HERO stands small on the left, seen whole,
facing a towering black silhouette of a giant champion on the right, with a thin golden rim light.
Purple lightning in far storm clouds. Both figures complete, from head to feet, in the upper three
quarters. Clouds and ring edge at the bottom.
```

**`story-6-2.png`, 1200×900** (caption: The rule hasn't changed: stay in the ring.)

```
Close-up of THE HERO in a low fighting stance, fists ready, jaw set, full of determination, with
the scroll tucked into his red belt. Wind in the air and sunset light on his face. Head and fists
in the upper three quarters. Simple clay ring at the bottom.
```
