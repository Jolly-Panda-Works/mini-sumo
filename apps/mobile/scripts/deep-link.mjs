// Lets invite links open the Android app (minisumo://join?room=…). Run after `cap add/sync android`.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const SCHEME = "minisumo";
const file = new URL("../android/app/src/main/AndroidManifest.xml", import.meta.url);
if (!existsSync(file)) {
  console.error("android/ not found. Run `npx cap add android` first.");
  process.exit(1);
}
let xml = readFileSync(file, "utf8");
if (!xml.includes(`android:scheme="${SCHEME}"`)) {
  const filter = `    <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="${SCHEME}" />
            </intent-filter>
        `;
  xml = xml.replace("</activity>", `${filter}</activity>`);
  writeFileSync(file, xml);
}
console.log(`Android deep links on (${SCHEME}://)`);
