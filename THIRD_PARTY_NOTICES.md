# Third-party data notices

## Make Me a Hanzi

`public/hanzi/*.json` contains stroke outline paths, median points, radicals and IDS decomposition selected from the local Make Me a Hanzi `graphics.txt` and `dictionary.txt` snapshots. Upstream project: https://github.com/skishore/makemeahanzi . Attribution: Make Me a Hanzi project and its contributors; graphics derive from Arphic fonts. These data are not original application artwork and are not relicensed under an application license.

**Public-release license verification is pending.** The supplied local resource directory does not contain the complete upstream Make Me a Hanzi license text or the applicable Arphic font license text. The resource summary's generic “LGPL/Arphic” description is not sufficient to establish exact rights, versions or redistribution conditions. No network lookup was performed. Before any public release, obtain and verify the exact upstream snapshot's dictionary and graphics licenses, preserve all required attribution and full license texts, and satisfy any font-derived-data distribution obligations. This notice is not a replacement for those licenses and does not assert commercial-use clearance.

## Unicode-derived radical metadata

The local merged reference `data/字库-融合拼音笔画部首.json` supplies a radical only if the Make Me a Hanzi dictionary lacks one. Its radical and stroke-count fields are also used for a discrepancy audit. The reference documentation attributes these fields to Unicode Unihan 15.1.0 (`kRSUnicode`, `kTotalStrokes`). Unicode attribution and full applicable license text must also be verified against the supplied snapshot before public redistribution. Upstream: https://www.unicode.org/ucd/ .

The importer does **not** copy CC-CEDICT pronunciations/glosses, frequency lists, reference words/sentences, generated SVGs or source scripts. Local resource scripts are never executed. Application `src/data/source.json`, `practice.ts`, and `catalog.ts` are read-only during import; SHA-256 evidence appears in `reports/hanzi-import.json`.
