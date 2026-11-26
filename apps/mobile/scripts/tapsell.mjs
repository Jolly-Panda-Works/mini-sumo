import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const files = {
  tapsell_app_key: process.env.TAPSELL_APP_KEY?.trim(),
  tapsell_rewarded_zone: process.env.TAPSELL_REWARDED_ZONE?.trim(),
  tapsell_interstitial_zone: process.env.TAPSELL_INTERSTITIAL_ZONE?.trim(),
};
if (!Object.values(files).every((value) => value && /^[a-z0-9-]{8,128}$/i.test(value))) {
  throw new Error("Tapsell requires TAPSELL_APP_KEY, TAPSELL_REWARDED_ZONE and TAPSELL_INTERSTITIAL_ZONE for store builds.");
}

const read = (file) => readFileSync(new URL(file, root), "utf8");
const write = (file, value) => writeFileSync(new URL(file, root), value);
const { appId } = JSON.parse(read("capacitor.config.json"));
const java = `android/app/src/main/java/${appId.replaceAll(".", "/")}`;
write(`${java}/TapsellAdsPlugin.java`, read("native/TapsellAdsPlugin.java").replace("__PACKAGE__", appId));

const gradle = "android/app/build.gradle";
const source = read(gradle);
const dependency = 'implementation "ir.tapsell.sdk:tapsell-sdk-android:4.9.15"';
if (!source.includes(dependency)) {
  if (!/dependencies\s*\{/.test(source)) throw new Error("Missing Android app dependencies block.");
  write(gradle, source.replace(/dependencies\s*\{/, `$&\n    ${dependency}`));
}

const resources = Object.entries(files).map(([name, value]) => `    <string name="${name}" translatable="false">${value}</string>`);
write("android/app/src/main/res/values/tapsell.xml", `<resources>\n${resources.join("\n")}\n</resources>\n`);
