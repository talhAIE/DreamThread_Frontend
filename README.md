# DreamThread UI

All eight screens and all eight implementation phases are complete as a local frontend demo. The app uses FireWatch AI's buildless HTML, CSS, vanilla JavaScript ES modules, and Python serving foundation. No npm installation, build, backend, API keys, or internet connection is needed to run it.

## Run

Double-click `start-dreamthread.cmd` on Windows, or open a terminal in this folder and run:

```powershell
python scripts/serve_frontend.py
```

Open http://127.0.0.1:5173. Stop with Ctrl+C. For another port: `python scripts/serve_frontend.py --port 5174`.

Use HTTP rather than opening index.html directly, because the app uses JavaScript modules. The server exposes only `frontend/` and binds to loopback.

## Explore

- Welcome: use any valid email and a password with at least four characters. Credentials are not transmitted or saved; a dialog identifies the local demo.
- Home: enter Capture, select a motif, view its sources, or open recent dreams.
- Journal: search titles/text/tags, choose date/emotion filters, open Storylines, and save cards into Personal memory using their ··· menu.
- Capture: the initial voice demo reproduces Figma's Listening · 01:12 reference state. It is a static simulated starting state; Stop/Start controls activate the timer and waveform. No microphone permission is requested and no audio is captured. Write instead opens the text mode. Add/remove feelings, answer the Interviewer, Analyze dream, choose a title, and Save dream.
- Drafts: changes save on this device and restore after refresh. New draft starts empty; Use sample restores the reference transcript. Editing text invalidates the previous reading until you analyze it again.
- Dream Detail: saved original words remain unchanged. Read the clearly marked demo interpretation and open linked source entries or the selected motif in Constellation.
- Constellation: select nodes, choose All/Places/People/Emotions, drag to pan, or use +/− and Reset view. When the graph has keyboard focus, arrow keys pan, +/− zoom, and 0 resets. The evidence panel links to entries, filtered Journal, and Detective. Saved entries update the relevant motif and emotion evidence.
- Dream Detective: the initial question/answer matches Figma. Ask about the house, ocean, forest, stranger, doors, or feelings. Responses are deterministic demo text with resolvable citations. Unsupported questions receive an honest fallback with no citations. Clicking a citation opens its dream; returning highlights the cited source. Conversation history lasts for the current session.
- Settings: explains demo storage and offers a confirmed Reset local demo action. It removes locally authored entries, drafts, and saved memory while retaining all supplied reference entries.

## Routes

`#/welcome`, `#/home`, `#/journal`, `#/capture`, `#/capture?mode=text`, `#/dream/01`, `#/constellation`, `#/detective`, `#/storyline/house`.

Journal accepts `q`, `motif`, `emotion`, and `tab=memory` query parameters. Constellation and Detective accept `motif` context. Hash routes support refresh and browser Back/Forward without server rewrite rules.

## Local data and backend boundary

`frontend/js/data/repository.js` is the provider boundary. The current implementation is `local-repository.js`, exposing asynchronous listDreams, getDream, saveDream, analyzeDream, getConstellation, getStoryline, askDetective, getDraft/saveDraft/clearDraft, and resetDemo methods. See `docs/backend-handoff.md` for the full contract.

LocalStorage keys are versioned: `dreamthread.demo.entries.v1`, `dreamthread.demo.draft.v1`, and `dreamthread.demo.memory.v1`. Data stays in this browser. Storage failures fall back to session mode and the UI reports that persistence is session-only.

Authentication, OAuth, real audio recording/transcription, AI inference, and server synchronization remain future backend work. Local Voice entries explicitly identify simulated recording in their data. No endpoint contract has been invented.

## Design fidelity

Source: https://www.figma.com/design/lYAOmyExaONHYen7pw5EZW/DreamThreadUI?node-id=23-2503

The native references are eight 1440 × 900 desktop screens. Original imagery, SVGs, gradients, colors, layout measurements, and typography are bundled locally. There are 26 Figma assets and seven font faces, including Inter Bold used by Detective, with the two font-family OFL licenses.

All eight original screenshots, source-layer asset bindings, and known discrepancies are in `docs/references/`, `docs/asset-inventory.json`, and `docs/design-inventory.md`. Responsive layouts, post-analysis states, draft controls, menus, fallback states, and Settings were inferred where no reference frame existed.

The original Journal shows six August–October entries while its chip says Last 30 days. The initial view preserves that reference; choosing a date activates real filtering against the fixed demo date, 30 October 2026. The 30-day range includes four reference entries, plus applicable locally saved entries.

The Constellation overview's 18 dreams / 7 motifs / 4 storylines values reproduce Figma, rather than claiming there are 18 authored records. A visible note gives the actual available count: seven supplied records, plus your local entries. Non-House motif reference counts can exceed their available source records. Missing records and storylines are not manufactured.

Reference imagery is preserved even where it is small or surprising, including the ocean image on A bright, quiet house and different thumbnail/title associations between screens. Stable IDs preserve source navigation. Only supplied excerpts are shown where a full original transcript was not provided.

## Verification

```powershell
python scripts/check_frontend.py
node --test tests/*.test.mjs
```

The Python check validates local imports and asset paths without dependencies. Optional Node tests use its built-in runner; Node is not needed to run the app. Tests cover filtering, source resolution, original text preservation, draft/persistence behavior, graph updates, reset, storage failures, and Detective citations/fallbacks.

Browser QA covers all eight native-size screens, all eight at 1280 px, 768 px, and 390 px viewports, capture-to-save-to-detail with refresh, graph selection/filtering/zoom/keyboard pan, citations with Back navigation, draft restoration, empty capture, and unsupported questions. Screenshots and verification records are provided with the deliverable. No automated pixel-diff equivalence is claimed.
