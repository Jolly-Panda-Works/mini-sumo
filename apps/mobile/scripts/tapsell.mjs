import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const files = {
  tapsell_app_key: process.env.TAPSELL_APP_KEY?.trim(),
  tapsell_rewarded_zone: process.env.TAPSELL_REWARDED_ZONE?.trim(),
  tapsell_interstitial_zone: process.env.TAPSELL_INTERSTITIAL_ZONE?.trim(),
};
const values = Object.values(files);
if (values.some(Boolean)) {
  if (!values.every((value) => value && /^[a-z0-9-]{8,128}$/i.test(value))) {
    throw new Error("Tapsell requires an app key and two valid zone IDs.");
  }
  const read = (file) => readFileSync(new URL(file, root), "utf8");
  const write = (file, value) => writeFileSync(new URL(file, root), value);
  const { appId } = JSON.parse(read("capacitor.config.json"));
  const java = `android/app/src/main/java/${appId.replaceAll(".", "/")}`;
  write(`${java}/TapsellAdsPlugin.java`, read("native/TapsellAdsPlugin.java").replace("__PACKAGE__", appId));
  const activity = `${java}/MainActivity.java`;
  write(activity, read(activity).replace("        super.onCreate(savedInstanceState);", "        registerPlugin(TapsellAdsPlugin.class);\n        super.onCreate(savedInstanceState);"));
  const gradle = "android/app/build.gradle";
  write(gradle, read(gradle).replace(/dependencies\s*\{/, '$&\n    implementation "ir.tapsell.sdk:tapsell-sdk-android:4.9.15"'));
  const resources = Object.entries(files).map(([name, value]) => `    <string name="${name}" translatable="false">${value}</string>`);
  write("android/app/src/main/res/values/tapsell.xml", `<resources>\n${resources.join("\n")}\n</resources>\n`);
}
