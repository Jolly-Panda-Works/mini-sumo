import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const root=path.resolve('apps/client/public');
const source=fs.readFileSync('apps/client/src/locale/art.ts','utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {artLabels}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
function size(b){const kind=b.toString('ascii',12,16);if(kind==='VP8X')return [1+b.readUIntLE(24,3),1+b.readUIntLE(27,3)];if(kind==='VP8 ')return [b.readUInt16LE(26)&16383,b.readUInt16LE(28)&16383];if(kind==='VP8L'){const v=b.readUInt32LE(21);return [(v&16383)+1,((v>>>14)&16383)+1]}throw Error('Unsupported WebP');}
const font=fs.readFileSync(path.join(root,'fonts/vazirmatn-700.woff2')).toString('base64');
const blank=fs.readFileSync(path.join(root,'ui/btn-start-blank.webp')).toString('base64');
for(const [asset,label] of Object.entries(artLabels)){
 const [w,h]=size(fs.readFileSync(path.join(root,asset+'.webp')));
 const labelOnly=asset.includes('label-') || asset.startsWith('hud/');
 const buy=asset==='ui/btn-buy';
 const arena=asset.startsWith('arenas/') || asset==='ui/private-room-button';
 const fontSize=arena?64:Math.min(h*.4,w/(Math.max(2,label.length)*.56));
 const x=buy?w*.3:asset==='ui/label-level'?w*.28:asset==='ui/label-version'?w*.16:w*.5;
 const original=arena?fs.readFileSync(path.join(root,asset+'.webp')).toString('base64'):blank;
 const bg=labelOnly?`<rect x="3" y="3" width="${w-6}" height="${h-6}" rx="${h*.2}" fill="#56351e" stroke="#dca65c" stroke-width="5"/>`:`<image href="data:image/webp;base64,${original}" width="${w}" height="${h}" preserveAspectRatio="none"/>`;
 const ribbon=arena?'<path d="M230 55 Q480 -8 730 55 L700 148 Q480 90 260 148 Z" fill="#264b57" stroke="#efbb52" stroke-width="9"/>':'';
 const field=buy?`<rect x="${w*.53}" y="${h*.3}" width="${w*.38}" height="${h*.4}" rx="10" fill="#302322"/>`:'';
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><style>@font-face{font-family:Vazirmatn;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:700}</style>${bg}${field}${ribbon}<text x="${x}" y="${arena?80:h*.52}" dominant-baseline="middle" text-anchor="middle" direction="rtl" font-family="Vazirmatn,Tahoma,sans-serif" font-weight="700" font-size="${fontSize}" fill="#ffe795" stroke="#53270e" stroke-width="${Math.max(1,h*.014)}" paint-order="stroke fill">${label}</text></svg>`;
 const out=path.join(root,'locale/fa',asset+'.svg');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,svg);
}
console.log(`Generated ${Object.keys(artLabels).length} Persian graphics.`);
