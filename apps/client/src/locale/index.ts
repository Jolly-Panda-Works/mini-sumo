import { translate } from './fa';

export const persian = import.meta.env.VITE_STORE === 'bazaar' || import.meta.env.VITE_STORE === 'myket';
export const locale = persian ? 'fa-IR' : 'en-US';

const patterns: [RegExp, (...values: string[]) => string][] = [
  [/^Watch an ad \((\d+) left today\)$/, n => `تماشای تبلیغ (${n} بار باقی‌مانده برای امروز)`],
  [/^PANDA COACH · (\d+) \/ (\d+)$/, (n, count) => `مربی پاندا · ${n} / ${count}`],
  [/^x(\d+) COMBO$/, n => `${n} ضربهٔ پیاپی`],
  [/^You pushed (.+) out!$/, name => `${name} را بیرون انداختی!`],
  [/^Mini Sumo (.+) is out, with new things to try\. Update in (.+)\?$/, (version, store) => `نسخهٔ ${version} مینی سومو با امکانات تازه آماده است. از ${translate(store)} به‌روز می‌کنی؟`],
  [/^This version of Mini Sumo is too old to play online\. Update to version (.+) in (.+) to keep playing\.$/, (version, store) => `برای ادامهٔ بازی آنلاین، از ${translate(store)} به نسخهٔ ${version} به‌روزرسانی کن.`],
  [/^Can't reach the game server at (.+)\. Make sure it is running\.$/, url => `سرور بازی در دسترس نیست: ${url}. اتصال را بررسی کن.`],
  [/^Buy (.+), (\d+) Sumo Coins, in (.+?)(?: for (.+))?$/, (name, n, store, price) => `خرید ${translate(name)}، ${n} سکهٔ سومو از ${translate(store)}${price ? ` با قیمت ${price}` : ''}`],
  [/^(.+) wins!$/, name => `${name} برنده شد!`],
  [/^(Home|Lobby) in (\d+)s$/, (place, n) => `بازگشت به ${place === 'Home' ? 'خانه' : 'اتاق'} در ${n} ثانیه`],
  [/^Start match in (\d+)…$/, n => `شروع مسابقه در ${n}…`],
  [/^A new picture for ([\d,]+) Sumo Coins\. You have ([\d,]+)\.$/, (price, balance) => `تصویر تازه با ${price} سکهٔ سومو. موجودی تو: ${balance}.`],
  [/^(.+) for ([\d,]+) Sumo Coins\. You have ([\d,]+)\.$/, (name, price, balance) => `${translate(name)} با ${price} سکهٔ سومو. موجودی تو: ${balance}.`],
  [/^Rank (\d+)$/, n => `رتبهٔ ${n}`],
  [/^(.+)'s profile, rank (\d+)$/, (name, n) => `پروفایل ${name}، رتبهٔ ${n}`],
  [/^(\d+) XP$/, n => `${n} تجربه`],
  [/^You won (\d+) Sumo Coins$/, n => `${n} سکهٔ سومو بردی`],
  [/^Your coins: (\d+)$/, n => `سکه‌های تو: ${n}`],
  [/^Power-up: (.+)$/, name => `قدرت ویژه: ${translate(name)}`],
  [/^Remove (.+)$/, name => `حذف ${name}`],
  [/^Play again for (\d+) Sumo Coins$/, n => `بازی دوباره با ${n} سکهٔ سومو`],
  [/^Unlocks at level (\d+)$/, n => `در سطح ${n} باز می‌شود`],
  [/^Need (\d+) more coins$/, n => `${n} سکهٔ دیگر لازم داری`],
  [/^Lvl (\d+)$/, n => `سطح ${n}`],
  [/^Level (\d+)$/, n => `سطح ${n}`],
  [/^Version (.+)$/, n => `نسخهٔ ${n}`],
  [/^([+\d,.-]+) Sumo Coins$/, n => `${n} سکهٔ سومو`],
  [/^(.+) invites you to play\. Join the game\?$/, name => `${name} تو را به بازی دعوت کرده. وارد می‌شوی؟`],
  [/^(.+) \(level (\d+)\) wants to be your friend\.$/, (name, n) => `${name} (سطح ${n}) درخواست دوستی داده است.`],
  [/^(.+) is now your friend$/, name => `${name} حالا دوست توست`],
  [/^(.+) is offline$/, name => `${name} آفلاین است`],
  [/^(.+) is out of the ring$/, name => `${name} از میدان بیرون افتاد`],
  [/^(.+) left the bout$/, name => `${name} از مسابقه خارج شد`],
  [/^(.+) left, so the room was closed\.$/, name => `${name} خارج شد و اتاق بسته شد.`],
  [/^(.+) will be removed from your friends\.$/, name => `${name} از دوستانت حذف می‌شود.`],
  [/^Friend request sent to (.+)$/, name => `درخواست دوستی برای ${name} ارسال شد`],
  [/^Invite sent to (.+)$/, name => `دعوت برای ${name} ارسال شد`],
  [/^Play with (.+)$/, name => `بازی با ${name}`],
  [/^Add (.+) as a friend$/, name => `افزودن ${name} به دوستان`],
  [/^Accept (.+)$/, name => `پذیرش ${name}`],
  [/^Decline (.+)$/, name => `رد درخواست ${name}`],
  [/^Enter (.+) for (\d+) Sumo Coins$/, (arena, n) => `ورود به ${translate(arena)} با ${n} سکهٔ سومو`],
  [/^Play (.+) for free$/, arena => `بازی رایگان در ${translate(arena)}`],
  [/^Enter (.+)$/, arena => `ورود به ${translate(arena)}`],
  [/^(.+): coming soon$/, name => `${translate(name)}: به‌زودی`],
  [/^Coin shop\. Balance: (\d+) Sumo Coins$/, n => `فروشگاه سکه. موجودی: ${n} سکهٔ سومو`],
  [/^Profile: (.+), level (\d+)$/, (name, n) => `پروفایل ${name}، سطح ${n}`],
  [/^(.+), level (\d+)(, online)?$/, (name, n, online) => `${name}، سطح ${n}${online ? '، آنلاین' : ''}`],
  [/^Player (\d+), (.+)$/, (n, color) => `بازیکن ${n}، ${translate(color)}`],
  [/^(.+) difficulty$/, label => `سختی ${translate(label)}`],
  [/^(AUTO|DASH) ([\d.]+)s$/, (mode, n) => `${translate(mode)}: ${n} ثانیه`],
  [/^Enter the 6-digit code we sent to (.+)\. It works for 15 minutes\.$/, email => `کد ۶ رقمی ارسال‌شده به ${email} را وارد کن. این کد ۱۵ دقیقه اعتبار دارد.`],
  [/^(.+) already has a wrestler\. Enter the code we sent to play as them here\.$/, email => `ایمیل ${email} قبلاً کشتی‌گیر دارد. برای بازیابی، کد ارسالی را وارد کن.`],
  [/^You're signed in with (.+)\. Log out on this device\? Your progress stays saved with your email: sign in again any time to get it back\.$/, email => `با ${email} وارد شده‌ای. از این دستگاه خارج می‌شوی؟ پیشرفتت با ایمیل ذخیره می‌ماند و با ورود دوباره برمی‌گردد.`],
  [/^Signed in with (.+): log out$/, email => `وارد شده با ${email}: خروج از حساب`],
];

export function text(value: string): string {
  if (!persian) return value;
  const exact = translate(value);
  if (exact !== value) return exact;
  const key = value.trim();
  for (const [pattern, render] of patterns) {
    const match = pattern.exec(key);
    if (match) return value.replace(key, render(...match.slice(1)));
  }
  return value;
}
