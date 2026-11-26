import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (file) => readFileSync(new URL(file, root), "utf8");
const write = (file, value) => writeFileSync(new URL(file, root), value);
const id = process.env.METRIX_APP_ID?.trim();
const key = process.env.METRIX_API_KEY?.trim();
if (!id && !key) {
  console.warn("Metrix disabled: METRIX_APP_ID and METRIX_API_KEY are unset.");
  process.exit(0);
}
if (![id, key].every(value => value && /^[a-zA-Z0-9._+=/-]+$/.test(value))) throw Error("Invalid Metrix Android configuration");

const dir = "android/app/src/main";
const pkg = JSON.parse(read("capacitor.config.json")).appId;
const java = dir + "/java/" + pkg.replaceAll(".", "/");
write(java + "/GameAnalyticsPlugin.java", read("native/GameAnalyticsPlugin.java").replace("__PACKAGE__", pkg));
function insert(file, anchor, addition) {
  const source = read(file);
  if (source.includes(addition)) return;
  if (!source.includes(anchor)) throw Error("Missing Metrix integration point in " + file);
  write(file, source.replace(anchor, addition + "\n" + anchor));
}
insert(java + "/MainActivity.java", "        super.onCreate(savedInstanceState);", "        registerPlugin(GameAnalyticsPlugin.class);");
insert(dir + "/AndroidManifest.xml", "</application>", `<meta-data android:name="ir.metrix.APPLICATION_ID" android:value="@string/metrix_id"/><meta-data android:name="ir.metrix.API_KEY" android:value="@string/metrix_key"/>`);
write(dir + "/res/values/metrix.xml", `<resources><string name="metrix_id" translatable="false">${id}</string><string name="metrix_key" translatable="false">${key}</string></resources>`);
const gradle = "android/app/build.gradle";
const dependency = 'implementation "ir.metrix.analytics:metrix:2.10.0"';
if (!read(gradle).includes(dependency)) write(gradle, read(gradle) + "\ndependencies { " + dependency + " }\n");
