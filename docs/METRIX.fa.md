# تحلیل رفتار در Mini Sumo

در GitHub Actions، شناسهٔ برنامه را در متغیر `METRIX_APP_ID` و کلید SDK اندروید را در Secret با نام `METRIX_API_KEY` قرار دهید. ساخت محلی همین دو متغیر محیطی را می‌خواند. در صورت خالی بودن هر دو، بیلد بدون متریکس ساخته می‌شود. نسخه‌های فعال، ایونت‌ها را با نام در SDK اندروید ثبت می‌کنند. برای تست از برنامهٔ آزمایشی متریکس استفاده کنید.

- نشست سفارشی `session_started` با تغییر شناسهٔ نشست خود SDK ثبت می‌شود. برای D1 و D7، بازیکنانِ اولین نشست یک روز را با بازگشت همان افراد در روز اول و هفتم مقایسه کنید. در گزارش، یک منبع شمارش نشست انتخاب کنید.
- مسیر ورود را از `game_started` تا `onboarding_step_viewed`، `onboarding_step_finished`، `arena_entry_requested` و `match_started` دنبال کنید. نتیجهٔ مسابقه در `match_finished.result` و رد کردن آموزش در `onboarding_step_finished.outcome` است.
- پرداخت پاداش تبلیغ با `reward_claimed` و دستهٔ `ad_reward` مشخص می‌شود. برای مجموع سکه فقط `currency_earned` و `currency_spent` را جمع بزنید.
- `purchase_revenue` مبلغ ریالی محصول را پس از خرید موفق ثبت می‌کند. قیمت برچسب‌دارِ تومان به ریال تبدیل می‌شود. اگر استور واحد قیمت را مشخص نکند، نتیجهٔ خرید ثبت می‌شود و مبلغ حدس زده نمی‌شود.
- `feature_opened`، `cosmetic_equipped`، `invite_sent` و `invite_joined` برای تحلیل تعامل هستند. در مقایسهٔ قابلیت‌ها، ورود از آموزش را با ورود اختیاری جداگانه بسنجید.

[مستندات SDK اندروید متریکس](https://docs.metrix.ir/en/technical/android/tracking-events)
