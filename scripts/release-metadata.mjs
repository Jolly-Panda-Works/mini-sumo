import { readFileSync, writeFileSync } from 'node:fs';
import { versionCode } from './version.mjs';

const version = process.argv[2];
versionCode(version);
const readmePath = new URL('../README.md', import.meta.url);
const readme = readFileSync(readmePath, 'utf8');
const versionLine = /^\*\*Latest Android release\*\* · v\d+\.\d+\.\d+$/m;
if (!versionLine.test(readme)) throw new Error('Missing Android release version in README');
writeFileSync(readmePath, readme.replace(versionLine, `**Latest Android release** · v${version}`));
