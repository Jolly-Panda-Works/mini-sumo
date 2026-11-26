import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { versionCode } from './version.mjs';
const root=process.cwd();
const c=JSON.parse(fs.readFileSync('game.config.json','utf8'));
const store=process.env.STORE||'debug';
if (!['debug', 'release', ...c.stores].includes(store)) throw Error('Android edition is not configured');
if(process.env.PUBLISH_STORES==='true') throw Error('Android package builds must not call store APIs');
const debug=store==='debug';
const version=process.env.VERSION||JSON.parse(fs.readFileSync('package.json')).version;
const code=versionCode(version);
const local=p=>{
  const target=path.resolve(root,p);
  if((target!==root && !target.startsWith(root+path.sep)) || p.includes('.git')) throw Error('Invalid project path');
  return target;
};
const mobile=local(c.android.mobileDir);
const android=local(c.android.projectDir);
const win=process.platform==='win32';
const env={...process.env,VITE_STORE:store,VITE_APP_VERSION:version,VITE_BASE:'./',ANDROID_VERSION_CODE:String(code),ANDROID_VERSION_NAME:version};
if(c.android.profile==='mini') {
  env.VITE_SERVER_URL ||= 'wss://sumo.ryujin.fans';
  env.VITE_PUBLIC_URL ||= 'https://sumo.ryujin.fans/';
  if (store === 'bazaar') {
    const bazaarConfig = JSON.parse(fs.readFileSync(path.join(mobile, 'bazaar.config.json'), 'utf8'));
    env.VITE_BAZAAR_DEVELOPER_ID ||= env.BAZAAR_DEVELOPER_ID || bazaarConfig.developerId || '';
  }
}
const run=(exe,args,opts={})=>execFileSync(exe,args,{stdio:'inherit',env,...opts});
const npm=(args,opts={})=>run(win?'npm.cmd':'npm',args,{shell:win,...opts});
const npx=(args,opts={})=>run(win?'npx.cmd':'npx',args,{shell:win,...opts});
npm(['run',c.android.webScript]);
if(c.android.installMobile) npm([fs.existsSync(path.join(mobile,'package-lock.json'))?'ci':'install','--prefix',mobile]);
if(c.android.generated) {
  if(android===root) throw Error('Generated Android project cannot be the repository root');
  // Only disposable generated projects, never the committed native projects.
  fs.rmSync(android,{recursive:true,force:true});
  npx(['cap','add','android'],{cwd:mobile});
}
if(c.android.profile==='mini') {
  try { npx(['capacitor-assets','generate','--android','--iconBackgroundColor','#11276F','--splashBackgroundColor','#2F5C8A'],{cwd:mobile}); }
  catch { console.log('::warning::Optional icon generation failed; continuing with Android defaults.'); }
}
npx(['cap','sync','android'],{cwd:mobile});
if(c.android.profile==='mini') {
  for(const name of ['orientation','fullscreen','deep-link']) run(process.execPath,[`scripts/${name}.mjs`],{cwd:mobile});
  if (store === 'release') run(process.execPath, ['scripts/play-games.mjs'], {cwd: mobile});
  if (c.stores.includes(store)) {
    run(process.execPath, [`scripts/${store}.mjs`], {cwd: mobile});
    run(process.execPath, ['scripts/tapsell.mjs'], {cwd: mobile});
  }
}
if (c.android.profile === 'mini' && !debug) run(process.execPath, ['scripts/metrix.mjs'], {cwd: mobile});
if (env.ANDROID_TARGET_SDK) {
  const sdk = env.ANDROID_TARGET_SDK;
  if (!/^\d+$/.test(sdk)) throw Error('ANDROID_TARGET_SDK must be an integer');
  const variablesGradle = path.join(android, 'variables.gradle');
  const variables = fs.readFileSync(variablesGradle, 'utf8');
  fs.writeFileSync(variablesGradle, variables.replace(/((?:compile|target)SdkVersion\s*=\s*)\d+/g, (_, setting) => setting + sdk));
}
const appGradle=path.join(android,'app/build.gradle');
let gradle=fs.readFileSync(appGradle,'utf8');
gradle=gradle.replace(/versionCode\s+\d+/,`versionCode ${code}`).replace(/versionName\s+"[^"]*"/,`versionName "${version}"`);
if(!gradle.includes('// Standalone debug')) gradle+='\n// Standalone debug\nandroid { buildTypes { debug { applicationIdSuffix ".debug"; versionNameSuffix "-debug" } } }\n';
fs.writeFileSync(appGradle,gradle);
const manifestPath=path.join(android,'app/src/main/AndroidManifest.xml');
let manifest=fs.readFileSync(manifestPath,'utf8');
manifest=manifest.replace(/\s+android:screenOrientation="[^"]*"/g,'').replace(/<activity\s+/,`<activity android:screenOrientation="${c.orientation}" `);
fs.writeFileSync(manifestPath,manifest);
// Keep the original native files tracked in git; the QA build needs no Google Play client.
if(debug && c.android.profile==='grid') {
  const activity=path.join(android,'app/src/main/java',c.appId.replaceAll('.','/'),'MainActivity.java');
  let java=fs.readFileSync(activity,'utf8').replace(/\s*registerPlugin\(PlayGamesAuthPlugin\.class\);/,'').replace(/\s*if \(playGamesConfigured\(this\)\) PlayGamesSdk\.initialize\(this\);/,'');
  fs.writeFileSync(activity,java);
}
let signing=[];
if(!debug) {
  for(const key of ['KEYSTORE_BASE64','KEYSTORE_PASSWORD','KEY_ALIAS','KEY_PASSWORD']) if(!env[key]) throw Error(`Missing existing signing secret: ${key}`);
  const keystore=path.join(env.RUNNER_TEMP||root,'release.keystore');
  fs.writeFileSync(keystore,Buffer.from(env.KEYSTORE_BASE64,'base64'),{mode:0o600});
  signing=[`-Pandroid.injected.signing.store.file=${keystore}`,`-Pandroid.injected.signing.store.password=${env.KEYSTORE_PASSWORD}`,`-Pandroid.injected.signing.key.alias=${env.KEY_ALIAS}`,`-Pandroid.injected.signing.key.password=${env.KEY_PASSWORD}`];
}
if(!win) fs.chmodSync(path.join(android,'gradlew'),0o755);
run(win?'gradlew.bat':'./gradlew',[debug?'assembleDebug':'assembleRelease',...(debug?[]:['bundleRelease']),'--no-daemon',...signing],{cwd:android,shell:win});
fs.mkdirSync('out',{recursive:true});
const prefix=`${c.slug}-v${version}-${debug?'standalone-debug':store}`;
fs.copyFileSync(path.join(android,`app/build/outputs/apk/${debug?'debug/app-debug':'release/app-release'}.apk`),`out/${prefix}.apk`);
if(!debug) fs.copyFileSync(path.join(android,'app/build/outputs/bundle/release/app-release.aab'),`out/${prefix}.aab`);
if(c.web) run('zip',['-qr',path.join(root,`out/${c.slug}-v${version}-web.zip`),'.'],{cwd:local(c.android.distDir)});
fs.writeFileSync('out/SHA256SUMS.txt',fs.readdirSync('out').filter(n=>n!=='SHA256SUMS.txt').sort().map(n=>`${createHash('sha256').update(fs.readFileSync(`out/${n}`)).digest('hex')}  ${n}`).join('\n')+'\n');
