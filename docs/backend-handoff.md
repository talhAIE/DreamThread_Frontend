# Backend integration boundary

The UI is complete as a local demo. Swap the provider exported from `frontend/js/data/repository.js` to integrate a future backend. Screen modules consume view data; they do not import storage or make network calls.

## Asynchronous provider methods

- `listDreams({query, emotion, days, ids, includeSources})` returns independent dream objects. Combine filters by intersection. `ids: []` returns no records. `includeSources` includes citation-only reference entries. Default Journal excludes those entries.
- `getDream(id)` returns a record or null.
- `saveDream({title, original, emotions, type, interview})` validates text, creates a stable ID, preserves `original` exactly, derives a separate demo reading, clears the draft, and returns the saved record. Live integration must save the original before deriving analysis and report errors without discarding user text.
- `analyzeDream(original, emotions)` returns `{demo, motif, themes, emotions, linkIds, reading, question}`. Current results are deterministic word-based groupings. A live service must distinguish observed evidence from tentative interpretation.
- `getConstellation()` returns motif metadata and stable source IDs, available/local counts, emotion evidence IDs, and explicitly separated design-reference totals. Replace reference counts with real backend counts once complete records are available.
- `getStoryline('house')` returns `{id, title, chapters}`; unknown IDs return null.
- `askDetective(question)` returns `{demo, text, sources, followup}`. Every source ID must resolve to a real record. Unsupported questions must not fabricate citations.
- `getDraft()`, `saveDraft(draft)`, and `clearDraft()` handle the original text, title, feelings, capture mode, timer, and interview choice. Draft data is separate from saved entries.
- `resetDemo()` clears the provider's demo data or rejects with a user-visible storage error. Original fixtures are retained.
- `storageMode` is `device` or `session` for the local adapter. Adapt UI persistence wording when server storage is available.

## Dream shape

Core fields: `id`, `title`, `date` (YYYY-MM-DD), `type` (Text or Voice), `original`, `excerpt`, `art`, `tags`, `emotions`.

Derived/local fields: `motif`, `reading`, `linkIds`, `interview`, `local`, `analysisDemo`, `recordingSimulated`. A Voice label in this demo indicates a simulated capture mode; there is no audio blob or transcription. Do not treat it as proof of an uploaded recording.

The UI escapes stored/input text before inserting markup. Keep source IDs stable across Journal, Detail, graph evidence, and Detective citations. Preserve the separation between original words and derived readings. Draft keys and record keys use a v1 suffix for future migration.

## Deferred services

Account authentication and session management, Google OAuth, actual microphone recording/upload, transcription, analysis/inference, account-scoped authorization, server storage, and synchronization require a real service contract. No REST paths, tokens, or server schema are assumed by this frontend.

Native browser audio recording would be a separate feature decision. The current simulated voice UI requests no microphone permission and sends no audio or text off-device.
