// Emit the newest CHANGELOG.md entry as plain lines (one note per line, no bullets) for
// electron-builder's releaseInfo.releaseNotesFile. The text rides inside latest*.yml and the
// in-app update modal renders one bullet per line. Empty output when the newest entry doesn't
// match package.json's version (tag cut without a changelog entry).
//   node apps/texpile-editor/scripts/release-notes.mjs > release-notes.md
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { latestReleased } from './changelog.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const entry = latestReleased();

if (entry?.version === version && entry.notes.length) console.log(entry.notes.join('\n'));
