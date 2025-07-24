# Implementation Plan – GitHub Translator Chrome Extension

> **Test target:** [https://github.com/huggingface/transformers/issues](https://github.com/huggingface/transformers/issues)

This plan breaks development into **4 sprints (≈1 week each)** with continuous integration & test coverage milestones.

---

## Sprint 1 – Project & Build Setup

| Task                                | Output                                                                  | Owner | Notes                                                     |
| ----------------------------------- | ----------------------------------------------------------------------- | ----- | --------------------------------------------------------- |
| 1.1 Initialise repo                 | `git init`, `.editorconfig`, `.nvmrc`                                   | Dev   | Node ≥ 18.                                                |
| 1.2 Scaffold Chrome Extension (MV3) | `/manifest.json`, `/src/background/`, `/src/content/`                   | Dev   | Minimal permissions: `storage`, `scripting`, `activeTab`. |
| 1.3 Add **TypeScript**              | `tsconfig.json`, types for chrome (`@types/chrome`)                     | Dev   | Target ES2022.                                            |
| 1.4 Configure bundler               | **Vite** + `vite.config.ts` (multi‑page build for background & content) | Dev   | Fast HMR for content script.                              |
| 1.5 Lint/Format                     | ESLint (airbnb‑ts) + Prettier                                           | Dev   | Husky pre‑commit.                                         |
| 1.6 Demo message                    | Content script logs **"hello github translator"** on any GitHub page    | QA    | Acceptance test.                                          |
| 1.7 CI pipeline                     | GitHub Actions: `npm test && npm run build`                             | Dev   | Matrix: Node 18/20.                                       |

### Deliverables

* Extension loads in Chrome (Developer mode) and prints demo message.
* Passing CI.

---

## Sprint 2 – DOM Extraction & Mutation

| Task                              | Output                                                                     | Test                                                   |
| --------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------ |
| 2.1 **Issue title scraper**       | Function `getIssueTitles()` returns NodeList                               | Jest unit (DOM testing‑library) //given //when //then. |
| 2.2 Live MutationObserver         | Auto-detect title nodes on PJAX navigation                                 | Unit test with fake mutations.                         |
| 2.3 Replace titles                | `replaceTitles(text: string)` mutates DOM to **"HELLO GITHUB TRANSLATOR"** | Jest test ensures innerText changed.                   |
| 2.4 Console print original titles | Demonstrate correct capture on test URL                                    | Manual & automated headless Chrome (puppeteer).        |

### Acceptance Criteria

* Visiting test page shows original titles in console, DOM replaced with placeholder text.

---

## Sprint 3 – OpenAI Integration & Translation Service

| Task                                    | Output                                                             | Test                                                               |
| --------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| 3.1 Create `TranslationService`         | `src/core/translation.ts`                                          | Jest unit mocking `fetch` + //given //when //then.                 |
| 3.2 Background proxy                    | `chrome.runtime.onMessage` handler delegates to TranslationService | Unit w/ `sinon-chrome`.                                            |
| 3.3 Rate‑limit / retry policy           | Exponential backoff, max 3 retries                                 | Unit.                                                              |
| 3.4 Secure API key storage              | Options page to save key in `chrome.storage.sync`                  | Cypress component test.                                            |
| 3.5 Replace placeholder with LLM output | Hook after translation resolves                                    | End‑to‑end puppeteer on test URL (uses FAKE key & mocked network). |

### Acceptance Criteria

* Titles display translated Korean text on target page when key present.

---

## Sprint 4 – Comment Interception & Polishing

| Task                   | Output                                        | Test                       |
| ---------------------- | --------------------------------------------- | -------------------------- |
| 4.1 CommentInterceptor | Captures form submit, translates ko→en, posts | Jest DOM.                  |
| 4.2 UI Indicator       | Small badge showing "Translated" status       | Manual QA.                 |
| 4.3 LRU cache          | `src/core/cache.ts` (size 500, TTL 24h)       | Unit.                      |
| 4.4 Error overlay      | User‑friendly toast on API failure            | Storybook screenshot test. |
| 4.5 README & docs      | Usage, screenshots, dev guide                 | Review.                    |

### Acceptance Criteria

* User can write Korean comment, extension posts English to GitHub.
* No console errors, >90% Jest coverage.

---

## Additional Enhancements (Backlog)

1. **Batch translation** of multiple comment bodies per request.
2. **Streaming** partial responses for long texts.
3. **Edge (Manifest 3) build** using `cross-browser`.
4. **i18n** menu for additional languages.
5. **Analytics opt‑in** for usage metrics.

---

## Testing Matrix Summary

| Layer              | Framework        | Key Scenario                                     |
| ------------------ | ---------------- | ------------------------------------------------ |
| **Unit**           | Jest + ts‑jest   | Transl. prompt building, DOM utils.              |
| **Integration**    | Puppeteer        | Real GitHub page fixture run in headless Chrome. |
| **E2E (optional)** | Playwright Cloud | Cross‑browser smoke tests.                       |

> **Note:** All Jest test files follow **// given // when // then** pattern mandated in requirements.

---

## Risks & Mitigations

| Risk                | Mitigation                                                                        |
| ------------------- | --------------------------------------------------------------------------------- |
| GitHub DOM changes  | Use robust selectors & fallback attribute detection, watch on CI.                 |
| OpenAI quota / cost | Add cache & bunyan logs to monitor usage; expose "disable auto‑translate" toggle. |
| API Key leakage     | Never log key, use `chrome.storage.sync`, restrict host permissions.              |

---

## Definition of Done

* All core user stories (1‑8) implemented & passing CI.
* README documents setup, build, tests.
* Manual test on test URL shows seamless translation both directions.

---

### Next Document

After approval, we’ll draft **testing.md** detailing specific Jest & Puppeteer test cases and // given // when // then templates.
