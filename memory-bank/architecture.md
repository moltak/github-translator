# Architecture for GitHub Translation Chrome Extension

## 1. Goal & Scope

Translate GitHub Issue and Pull Request conversations **from English ➜ Korean** for reading, and user‑written comments **from Korean ➜ English** before posting. The extension must:

* Operate entirely client‑side as a Chrome (Manifest V3) extension.
* Rely on **OpenAI `gpt-4.1-mini-2025-04-14` via the *Responses* API** for translation quality.
* Offer minimal, friction‑free UX—no extra buttons; translations appear in‑place.
* Provide a testable, maintainable codebase with **Jest** unit tests (// given // when // then) and CI readiness.

## 2. High‑Level Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                           Chrome Browser                              │
│                                                                        │
│  ┌────────────┐   message      ┌────────────────────┐                 │
│  │Content     │───────────────▶│Background Service  │                 │
│  │Script(s)   │                │Worker (controller) │                 │
│  ├────────────┤◀───────────────│                    │                 │
│  │DOM Adapter │   response     └────────┬───────────┘                 │
│  ├────────────┤                           │                            │
│  │Comment     │◀──────────── translate ───┤                            │
│  │Interceptor │                           ▼                            │
│  └────────────┘                ┌────────────────────┐                 │
│                                │TranslationService  │                 │
│                                │ (OpenAI wrapper)   │                 │
│                                └────────────────────┘                 │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component                     | Type                      | Key Duties                                                                                                                                              |
| ----------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Content Scripts**           | `src/content/`            | Injected into GitHub pages; detects Issue/PR comment blocks, rewrites text with translations, observes DOM mutations for live updates.                  |
| **CommentInterceptor**        | part of Content Scripts   | Hooks the comment textarea & submit action; sends Korean input to TranslationService; substitutes translated English before form submission.            |
| **Background Service Worker** | `src/background/`         | Centralised coordinator; receives translation requests via `chrome.runtime.sendMessage`, invokes TranslationService, caches results, returns response.  |
| **TranslationService**        | `src/core/translation.ts` | Thin wrapper around `openai.responses.chat` using model `gpt‑4.1‑mini‑2025‑04‑14`; handles prompts, retries, rate‑limit back‑off, streaming (optional). |
| **Cache (LRU)**               | `src/core/cache.ts`       | Memoises recent translations (keyed by source text + direction) to minimise API calls & costs.                                                          |
| **Options UI / Popup**        | `src/ui/`                 | Allows users to paste API key, toggle auto‑translate, view usage stats.                                                                                 |
| **ErrorLogger**               | `src/core/logger.ts`      | Lightweight wrapper around `console` + `chrome.runtime.lastError`; future Sentry hook.                                                                  |

## 3. Data Flow Sequences

### 3.1 Read Path – Conversation Translation

1. **Page Load**: Content Script scans DOM; extracts English comment nodes.
2. **Request**: Sends `{text, direction:"EN→KO"}` to Background.
3. **Translate**: Background → TranslationService → OpenAI.
4. **Response**: Korean text returned; Content Script replaces original via DOM Adapter, preserving styling.
5. **Cache Write**: Background caches pair.

### 3.2 Write Path – Comment Submission Translation

1. User writes Korean comment in GitHub textarea.
2. Interceptor captures `submit` event, sends `{text, direction:"KO→EN"}`.
3. TranslationService returns English.
4. Interceptor swaps textarea content, triggers submit, then restores Korean draft (optional history).

## 4. OpenAI Integration Details

* **Endpoint**: `POST https://api.openai.com/v1/responses`.
* **Model**: `gpt-4.1-mini-2025-04-14`.
* **Prompt Template** (direction sensitive):

  ```jsonc
  // EN→KO
  {
    "messages": [
      {"role":"system","content":"Translate the following GitHub discussion from English to Korean, preserving markdown."},
      {"role":"user","content":"${TEXT}"}
    ]
  }
  ```
* **Parameters**: `{ "temperature": 0.0, "max_tokens": 1024 }`.
* **Error Handling**: Exponential backoff (2^n) up to 3 retries on 429/5xx.
* **Token Security**: Stored in `chrome.storage.sync` (scoped to extension), retrieved via `chrome.runtime.getURL` on load; never hard‑coded.

## 5. Manifest (v3) Highlights

```jsonc
{
  "manifest_version": 3,
  "name": "GitHub Translator",
  "permissions": [
    "storage", "scripting", "activeTab"
  ],
  "host_permissions": [
    "https://api.openai.com/*", "https://github.com/*"
  ],
  "background": {"service_worker": "background/index.js"},
  "content_scripts": [
    {"matches": ["https://github.com/*"], "js": ["content/index.js"], "run_at": "document_idle"}
  ],
  "action": {"default_popup": "ui/popup.html"}
}
```

## 6. Testing Strategy

| Layer           | Tool                                 | Focus                                                                                                      |
| --------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| **Unit (core)** | **Jest**                             | `TranslationService` logic including prompt generation, retry policy. Uses `nock` to stub OpenAI endpoint. |
| **Unit (DOM)**  | Jest + `@testing-library/dom`        | DOM Adapter text replacement, MutationObserver reactions.                                                  |
| **Integration** | Jest + `puppeteer` (headless Chrome) | End‑to‑end flow on a fixture GitHub HTML page. Optional in CI matrix.                                      |

### Jest Conventions

* File suffix `*.spec.ts`.
* **// given // when // then** comments inside each `test()`.
* Common mocks under `test/__mocks__/`.

### Sample TranslationService Test Skeleton

```ts
// given
describe('TranslationService', () => {
  test('translates EN to KO via OpenAI', async () => {
    // given
    const service = new TranslationService('FAKE_TOKEN');
    nock('https://api.openai.com')
      .post('/v1/responses')
      .reply(200, { choices: [{ message: { content: '안녕하세요' } }] });

    // when
    const result = await service.translate('Hello', 'EN_TO_KO');

    // then
    expect(result).toBe('안녕하세요');
  });
});
```

## 7. Performance & Caching

* **LRU cache** (size 500, 24 h TTL) to avoid duplicate API calls.
* Batch contiguous comment nodes when possible to reduce request count.

## 8. Security & Privacy Considerations

* Minimal data: Only plaintext of comments sent; no usernames or metadata.
* HTTPS enforced; certificate pinning optional.
* Opt‑in telemetry (error counts only, no content).

## 9. Future Extensions / Non‑Goals

* 🔜 Support additional languages.
* 🔜 Edge browser support.
* ❌ Server‑side proxy (maintain client‑only model for now).

---

**Next steps**: proceed to `implementation-plan.md` after stakeholder review of this architecture.
