# DreamThread design inventory

Source: Figma file lYAOmyExaONHYen7pw5EZW, Page 2 (23:2503). All eight frames were extracted with full design context and screenshots before implementation. Reference dimensions: 1440 × 900.

## Screen inventory

- **Welcome / Sign in** — `23:2508`. Implemented in phases 1–4. [Captured reference](references/welcome.png).
- **Home** — `23:2562`. Implemented in phases 1–4. [Captured reference](references/home.png).
- **Journal** — `23:2737`. Implemented in phases 1–4. [Captured reference](references/journal.png).
- **Capture a dream** — `23:2889`. Implemented in phases 5–7; verified in phase 8. [Captured reference](references/capture.png).
- **Dream detail** — `23:3019`. Implemented in phases 1–4. [Captured reference](references/detail.png).
- **Dream Constellation** — `23:3106`. Implemented in phases 5–7; verified in phase 8. [Captured reference](references/constellation.png).
- **Dream Detective** — `23:3316`. Implemented in phases 5–7; verified in phase 8. [Captured reference](references/detective.png).
- **Storyline** — `23:3422`. Implemented in phases 1–4. [Captured reference](references/storyline.png).

## Assets and typography

- 26 unique original Figma assets, 89 screen-to-asset bindings, 101 layer placements. Full geometry and root SVG dimensions are recorded in asset-inventory.json.
- Original downloaded raster payloads are JPEG even though Figma supplied filenames ending in .png; the original paths and payloads are retained. Browsers decode the image format correctly.
- Inter regular, medium, semibold, bold; Newsreader regular, medium, italic. Seven local font files with their two OFL licenses.
- Brand: 26 px. Navigation icons: 20 px. Search: 16 px. Home microphone: 34 px. Mini welcome connectors: 520 × 340. Home connectors: 620 × 320. Emotional arc: natural 1090.05 × 70.067 SVG.
- Background: radial navy illumination. Sidebar #0B1024, cards #141B3A, inset #10162D, borders #2A3360, accent #AE95F6, text #F6F7FC, muted #9AA3CF.
- Shared layout: 230 px sidebar; 36 px main horizontal padding; 28 px vertical padding; 22 px primary vertical gaps; 20 px card gaps.

## Interaction inventory

- Welcome: native form validation → clearly identified local demo. Google and Create account explain unavailable backend integration.
- Home: record/write → complete local Capture flow; motif selection updates evidence; sources → filtered Journal; cards → Detail; View all → Journal.
- Journal: live/submit search; date/emotion filters; clear filters; card actions; saved Personal memory; Storylines → supplied Storyline.
- Detail: connected entry links; Open in constellation → selected motif and live local evidence.
- Storyline: chapter image/title links → stable dream IDs.
- Shared: hash deep links, Back/Forward, active navigation, profile/settings information, keyboard-focus styles and narrow-screen navigation.

## Design gaps and source inconsistencies

- Settings, account creation, Google OAuth, Personal memory layout, card-action menus, filter menus, empty states, and mobile layouts are inferred because separate frames were not supplied.
- Journal says Last 30 days while displaying August–October entries. The starting view preserves the reference; selecting a date activates filtering against 30 October 2026.
- The same House sources use different thumbnails across Home/Detail/Constellation/Storyline. Preserve each supplied visual slot, link by stable IDs. The Storyline chapter descriptions and quoted source snippets are reference summaries, not newly authored full transcripts.
- A bright, quiet house intentionally uses the ocean image. Door and Forest source images are low resolution and show circular framing when enlarged.
- Motif counts and the later Constellation total exceed the authored fixture records. Do not manufacture missing dream content.
- Home Forest/Doors labels extend beneath their card in the source. The initial desktop composition preserves that placement.

## Phase 1 exit checklist

- [x] Full design contexts and visual references captured for all eight frames.
- [x] Every returned asset downloaded locally and mapped to source layers.
- [x] Seven font faces bundled with licenses.
- [x] Design tokens and shared layout measurements recorded.
- [x] Visible interaction entry points catalogued.
- [x] Inferred states and source inconsistencies documented.

## Completed phases 5–8

- Capture: simulated timer/waveform, stop/start, text mode, editable original, feelings, interviewer responses, deterministic analysis, local save, and restored drafts. Invalidated readings must be regenerated after editing. Explicit labels distinguish demo operations.
- Constellation: original 788 × 704 connector asset; selected nodes; category filters; pan, zoom, keyboard controls, and reset; source links and local motif/emotion evidence. Scaled mobile labels remain readable.
- Detective: original reference conversation; supported topic-based demo answers; source cards, citation navigation and returning-source highlights; unsupported-question fallback; loading/error handling.
- Data: asynchronous provider adapter; stable local IDs; unchanged original words; separate derived readings; device/session persistence; confirmed reset with failure reporting. No real backend endpoints are assumed.
- Verification: all eight default frames checked at 1440 × 900, then all eight at 1280, 768, and 390 px widths. No horizontal document overflow or broken images observed. Browser console errors: none. See verification/ for screenshots and metrics.
