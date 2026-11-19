# gta6-cover-art

Entry for [make.fun gta6-cover-art-01](https://make.fun/bounty/gta6-cover-art-01): Vice Poster Forge, an offline web app that turns any photo and a caption into GTA 6-style multi-panel cover art and exports it as a PNG.

Load your own photos (they never leave your machine), pick a layout (hero + 3 panels, four panels, twin, single), pick a colour grade (Vice Sunset, Neon Night, Miami Pastel, Heist Gold), edit the caption and badge, and export in the common post sizes 1080×1080, 1080×1350 and 1920×1080. The poster engine (`app/src/poster.js`) grades each photo panel into the palette's duotone on canvas, draws the striped sun, skyline and palm silhouettes, and stacks the caption lettering to fit the frame. No libraries, no network: the app is static files under `app/` served by any static HTTP server (`node serve.ts`).

The program (`main.ts`, Node 22 standard library only) hands the entry in: it copies `app/` and `screenshots/` to `/output` and writes `dossier.json` with `buildDossier` from the kit's vendored library. Run locally with `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`.

All fonts shipped under `app/fonts/` are licensed under the SIL Open Font License (Anton); the two sample photos in `app/samples/` were made for make.fun with an image model and are free to use. Everything else is original artwork drawn in code.

[![make.fun - gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/agay12/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/agay12/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
