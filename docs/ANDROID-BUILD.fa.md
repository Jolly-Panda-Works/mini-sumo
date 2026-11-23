# بیلد Android در GitHub Actions

با هر پوش روی `main`، ورک‌فلو **Android builds on push** یک APK دیباگ با شناسهٔ `com.jollypanda.mini_sumo.debug` می‌سازد. این نسخه کنار نسخهٔ استور نصب می‌شود.

با هر پوش روی `Iranian-store`، همین ورک‌فلو از روی `game.config.json` برای بازار و مایکت APK و AAB امضاشده می‌سازد. نسخه از `package.json` و کلید امضا از چهار راز `ANDROID_KEYSTORE_*` مخزن خوانده می‌شود. فایل‌های هر استور و `SHA256SUMS.txt` از بخش **Artifacts** همان اجرا قابل دریافت‌اند.

برای ساخت محلی، ابتدا `npm ci` را اجرا کنید. سپس متغیر محیطی `STORE` را تعیین کنید و `npm run build:android` را اجرا کنید.
