# Vendored pdf.js Type1 font parser

`type1_parser.js`, `stream.js`, `base_stream.js`, `encodings.js`, `glyphlist.js` are vendored
verbatim from [mozilla/pdf.js](https://github.com/mozilla/pdf.js) v5.7.284 (`src/core/`,
`src/shared/`), Apache-2.0 (headers retained). Only the import specifiers were rewritten to
point at `deps.js` (local shims for the handful of util functions they use).

They power `t1font.ts`: the live-preview renderer parses classic Type1 (.pfb) TeX fonts with
them and draws real glyph outlines, instead of substituting OpenType lookalikes.

To update: copy these files from the matching `pdfjs-dist` tag's `src/core/` + `src/shared/`,
then re-apply the two edits (imports `../shared/util.js` and `./core_utils.js` -> `./deps.js`,
and a `ts-nocheck` header). `deps.js` and `t1font.ts` are ours and stay untouched.
