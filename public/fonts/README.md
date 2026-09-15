# Bundled fonts

These unmodified font files are served from this application's own origin. PPTX text and font names are never sent to a font service.

| Family | Source | License |
| --- | --- | --- |
| Nanum Gothic, Nanum Barun Gothic, Nanum Square, Nanum Myeongjo | NAVER Hangul font downloads | `licenses/Naver-OFL.txt` |
| Maru Buri | NAVER Hangul campaign | `licenses/Naver-OFL.txt` |
| Pretendard Variable | orioncactus/pretendard | `licenses/Pretendard-OFL.txt` |
| Noto Sans KR | google/fonts/ofl/notosanskr | `licenses/NotoSansKR-OFL.txt` |
| Noto Serif KR | google/fonts/ofl/notoserifkr | `licenses/NotoSerifKR-OFL.txt` |

Retrieved 2026-09-15. Exact download URLs and SHA-256 hashes are recorded in `sources.json`. NAVER OTF files were extracted unchanged from the official ZIP downloads. License and copyright metadata inside the fonts is retained. The NAVER license notice is reproduced from its official help page, whose URL is included in the notice.

Only requested faces are loaded for PPTX previews; the interface independently uses Pretendard. Files total approximately 64 MiB. The largest individual file is below 25 MiB. No runtime CDN, font API key or font-conversion dependency is required.

When updating a file, preserve its license, record its new source/hash, and run the font asset checks and browser font scenarios.
