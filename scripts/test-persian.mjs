import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = name => fs.readFileSync(`apps/client/src/locale/${name}.ts`, 'utf8');
const moduleUrl = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText).toString('base64');
const faUrl = moduleUrl(source('fa'));
const artUrl = moduleUrl(source('art'));
for (const store of ['bazaar', 'myket', 'play']) {
  const indexUrl = moduleUrl(source('index').replace("'./fa'", JSON.stringify(faUrl))
    .replaceAll('import.meta.env.VITE_STORE', JSON.stringify(store)));
  const { text, persian } = await import(indexUrl);
  assert.equal(persian, store !== 'play');
  if (!persian) {
    assert.equal(text('Settings'), 'Settings');
    assert.equal(text('PANDA COACH · 1 / 3'), 'PANDA COACH · 1 / 3');
    continue;
  }
  assert.equal(text('Settings'), 'تنظیمات');
  assert.equal(text('PANDA COACH · 1 / 3'), 'مربی پاندا · 1 / 3');
  assert.equal(text('Blue wins!'), 'Blue برنده شد!');
  assert.equal(text('Unlocks at level 3'), 'در سطح 3 باز می‌شود');
  assert.equal(text('A new picture for 500 Sumo Coins. You have 200.'), 'تصویر تازه با 500 سکهٔ سومو. موجودی تو: 200.');
  assert.equal(text('Sakura for 1,500 Sumo Coins. You have 2,000.'), 'ساکورا با 1,500 سکهٔ سومو. موجودی تو: 2,000.');
  const runtimeUrl = moduleUrl(source('jsx-runtime')
    .replace("'react/jsx-runtime'", JSON.stringify(pathToFileURL(require.resolve('react/jsx-runtime')).href))
    .replace("'./index'", JSON.stringify(indexUrl)).replace("'./art'", JSON.stringify(artUrl))
    .replaceAll('import.meta.env.BASE_URL', "'./'"));
  const { jsx, Fragment } = await import(runtimeUrl);
  assert.equal(jsx('span', { children: 'Settings' }).props.children, 'تنظیمات');
  assert.equal(jsx('span', { translate: 'no', children: 'Blue' }).props.children, 'Blue');
  assert.equal(jsx('input', { value: 'Blue', placeholder: 'Your name' }).props.value, 'Blue');
  assert.equal(jsx('input', { placeholder: 'Your name' }).props.placeholder, 'نام تو');
  assert.equal(jsx('span', { className: 'friend-code', children: 'Shop' }).props.children, 'Shop');
  assert.equal(jsx('span', { className: 'pu-frame__name', children: 'Iron Body' }).props.children, 'بدن آهنین');
  assert.equal(jsx(Fragment, { children: 'Settings' }).props.children, 'تنظیمات');
  const image = jsx('img', { src: './ui/btn-play.webp', width: 287, height: 91 });
  assert.equal(image.props.src, './locale/fa/ui/btn-play.svg');
  assert.equal(image.props.width, 287);
  assert.equal(image.props.height, 91);
}
const { artLabels } = await import(artUrl);
for (const asset of Object.keys(artLabels)) {
  const svg = fs.readFileSync(`apps/client/public/locale/fa/${asset}.svg`, 'utf8');
  assert.ok(svg.includes(artLabels[asset]), asset);
  assert.ok(svg.includes('data:font/woff2;base64,'), `${asset}: offline font`);
}
console.log(`Persian display, dynamic messages, raw names/codes, both stores, English fallback and ${Object.keys(artLabels).length} offline graphics passed.`);
