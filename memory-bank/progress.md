# GitHub Translator Extension - 프로젝트 진행 상황

## 📋 프로젝트 개요

**목표**: GitHub Issues/PRs에서 한국어 ↔ 영어 실시간 번역을 제공하는 Chrome Extension 개발

**테스트 타겟**: https://github.com/huggingface/transformers/issues

**개발 방식**: 4개 스프린트 (각 약 1주), 지속적 통합 & 테스트 커버리지

## 🎯 아키텍처 핵심

- **Chrome Extension Manifest V3** 기반
- **OpenAI GPT-4.1-mini** 번역 엔진
- **TypeScript + Vite** 빌드 시스템
- **Jest** 단위 테스트 (// given // when // then 패턴)
- **Content Script + Background Worker** 구조

## 📊 현재 상태 (2024-12-19)

### ✅ 완료된 작업
- [x] 기본 Git 저장소 설정
- [x] 기본 manifest.json (Hello World 수준)
- [x] 기본 src/ 디렉토리 구조
- [x] **Sprint 1.1**: Repository 초기화 완료
  - [x] .nvmrc (Node 18)
  - [x] .editorconfig (코드 스타일)
  - [x] package.json 재구성 (TypeScript + Vite + Jest)
  - [x] 의존성 설치 완료

### ⚠️ 현재 상태 분석
- 프로젝트가 **기본 Hello World** 수준에서 **완전 재구성** 필요
- 기존 TypeScript/Webpack 설정이 제거됨
- 새로운 아키텍처 요구사항에 맞춰 처음부터 재구축 필요

## 🚀 Sprint 1 - Project & Build Setup (현재 진행중)

### 📋 Sprint 1 태스크 목록

| 태스크 | 상태 | 설명 |
|--------|------|------|
| 1.1 Initialize repo | ✅ 완료 | Node ≥18, .editorconfig, .nvmrc, package.json 재구성 |
| 1.2 Chrome Extension MV3 | ✅ 완료 | manifest.json, /src/background/, /src/content/ |
| 1.3 TypeScript 설정 | ✅ 완료 | tsconfig.json, @types/chrome |
| 1.4 Vite 번들러 설정 | ✅ 완료 | vite.config.ts (멀티페이지 빌드) |
| 1.5 Lint/Format | ✅ 완료 | ESLint (airbnb-ts) + Prettier + Husky |
| 1.6 Demo message | ✅ 완료 | Content script가 GitHub에서 "hello github translator" 로그 |
| 1.7 CI pipeline | ✅ 완료 | GitHub Actions: npm test && npm run build |

### 🎯 Sprint 1 완료 기준
- [x] Extension이 Chrome에서 로드되고 데모 메시지 출력
- [x] CI 파이프라인 통과

## ✅ Sprint 1 완료! (2024-12-19)

**모든 Sprint 1 태스크가 성공적으로 완료되었습니다.**

### 📦 완성된 결과물:
- **dist/**: Chrome Extension 빌드 결과물
- **manifest.json**: Manifest V3 스펙 준수
- **background.js**: Service Worker 구현
- **content.js**: GitHub 페이지 감지 및 데모 메시지
- **popup.html + popup.js**: 설정 UI
- **아이콘 세트**: 16px, 48px, 128px

### 🔧 다음 단계 (Sprint 1.1 완료 후)
1. **Node.js 환경 설정** (.nvmrc, .editorconfig)
2. **Package.json 재구성** (TypeScript, Vite, Jest 의존성)
3. **Manifest V3 스펙에 맞는 manifest.json 작성**
4. **기본 디렉토리 구조 생성** (src/background/, src/content/, src/core/)

## 📝 참고 문서
- [Implementation Plan](./implementation-plan.md) - 상세 구현 계획
- [Architecture](./architecture.md) - 시스템 아키텍처 설계

## 🚀 Sprint 2 - DOM Extraction & Mutation (진행중)

### 📋 Sprint 2 태스크 목록

| 태스크 | 상태 | 설명 |
|--------|------|------|
| 2.1 Issue title scraper | ✅ 완료 | GitHub 이슈/PR 제목 추출 함수 구현 |
| 2.2 Live MutationObserver | ✅ 완료 | 향상된 실시간 DOM 변화 감지 및 페이지 네비게이션 추적 |
| 2.3 Replace titles | ✅ 완료 | 제목을 "HELLO GITHUB TRANSLATOR"로 교체 및 원본 복원 |
| 2.4 Console print | ✅ 완료 | 원본 제목들을 콘솔에 출력 |

### ✅ Sprint 2.1 완료 (2024-12-19)

**DOM Extractor 모듈 구현 완료:**
- **src/core/dom-extractor.ts**: 페이지 타입별 제목 추출 로직
- **다중 선택자 지원**: GitHub UI 변경에 대응하는 Fallback 선택자
- **테스트 커버리지**: Jest 단위 테스트 10개 통과
- **실시간 콘솔 출력**: 추출된 제목들을 구조화된 로그로 출력

### 🎯 테스트 준비 완료

**Extension 빌드 완료** - 이제 다음 URL에서 테스트 가능:
- https://github.com/huggingface/transformers/issues (이슈 목록)
- https://github.com/huggingface/transformers/issues/1 (개별 이슈)

## ✅ Sprint 2.2 & 2.3 완료! (2024-12-19)

**모든 Sprint 2 태스크가 성공적으로 완료되었습니다.**

### 🎯 **Sprint 2.2 - Live MutationObserver 강화**
- **향상된 DOM 감지**: GitHub의 SPA 네비게이션과 동적 콘텐츠 로딩 감지
- **성능 최적화**: 디바운스된 재실행으로 불필요한 호출 방지
- **스마트 필터링**: Issues/PRs 관련 요소만 선별적으로 감지
- **설정 연동**: Extension 활성화/비활성화 상태에 따른 동적 동작

### 🎯 **Sprint 2.3 - Title Replacement**
- **즉시 교체**: 제목 추출과 동시에 "HELLO GITHUB TRANSLATOR"로 교체
- **원본 백업**: 데이터 속성으로 원본 텍스트 안전 보관
- **복원 기능**: 언제든지 원본 제목으로 되돌리기 가능
- **중복 방지**: 이미 교체된 요소는 재교체하지 않음
- **키보드 단축키**: `Ctrl + Shift + T`로 토글 가능

### 🔧 **새로운 기능들**
1. **설정 연동**: Popup에서 Extension 비활성화 시 자동으로 원본 복원
2. **페이지 정리**: 페이지 종료 시 자동으로 원본 제목 복원
3. **상태 추적**: 교체된 요소들을 Map으로 효율적 관리
4. **테스트 커버리지**: 14개 단위 테스트 모두 통과

### 🎮 **실제 사용법**
```
🔍 Extracting titles for page type: issues_list
📋 Found and replaced X GitHub issue/PR titles
📜 Original titles before replacement:
📌 1. [원본 이슈 제목 1]
📌 2. [원본 이슈 제목 2]
...

🎉 Sprint 2.3 Complete: Extracted and replaced X titles!
```

**GitHub 페이지에서 모든 이슈/PR 제목이 "HELLO GITHUB TRANSLATOR"로 표시됩니다!**

---
**마지막 업데이트**: 2024-12-19  
**다음 스프린트**: Sprint 3 - OpenAI Integration & Translation Service

## 🚀 Sprint 3 - OpenAI Integration & Translation Service (시작 준비)

### 🎯 **Sprint 3 목표**
현재 "HELLO GITHUB TRANSLATOR" 더미 텍스트를 **실제 한영/영한 번역**으로 교체하여 완전한 번역 기능 구현

### 📋 **Sprint 3 태스크 목록**

#### **Phase 1: Core Translation Engine (Tasks 3.1-3.2)**
| 태스크 | 상태 | 설명 | 우선순위 |
|--------|------|------|----------|
| 3.1 TranslationService 구현 | 🔄 진행예정 | OpenAI Responses API 클라이언트 구현 | 🔥 High |
| 3.2 Background Message Hub | 🔄 진행예정 | Content ↔ Background ↔ OpenAI 메시지 플로우 | 🔥 High |

#### **Phase 2: Production Readiness (Tasks 3.3-3.4)**
| 태스크 | 상태 | 설명 | 우선순위 |
|--------|------|------|----------|
| 3.3 Rate Limiting & Retry | ⏳ 대기 | Exponential backoff, 3회 재시도, 60 RPM 제한 | 🟡 Medium |
| 3.4 API Key Management | ⏳ 대기 | 보안 저장, Options 페이지, 사용자 설정 UI | 🟡 Medium |

#### **Phase 3: Integration (Task 3.5)**
| 태스크 | 상태 | 설명 | 우선순위 |
|--------|------|------|----------|
| 3.5 Real Translation Integration | ⏳ 대기 | DOM Extractor와 연결, 실제 번역 결과 표시 | 🟢 Low |

### 🔧 **Sprint 3 세부 구현 스펙**

#### **3.1 TranslationService 클래스**
```typescript
// src/core/translation.ts
class TranslationService {
  private apiKey: string;
  private endpoint = 'https://api.openai.com/v1/responses'; // ❗ Responses API
  private model = 'gpt-4.1-mini-2025-04-14'; // ❗ 정확한 모델 버전
  
  async translateText(
    text: string, 
    direction: 'EN_TO_KO' | 'KO_TO_EN'
  ): Promise<string>
}
```

**핵심 기능**:
- OpenAI Responses API 호출 (NOT Chat Completions)
- 방향별 프롬프트 템플릿 (EN→KO, KO→EN)
- Temperature: 0.0, Max tokens: 1024
- 에러 핸들링 및 응답 파싱

#### **3.2 Background Message Handler 확장**
```typescript
// src/background/index.ts enhancement
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'TRANSLATE') {
    translationService.translateText(request.text, request.direction)
      .then(result => sendResponse({ success: true, translatedText: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 비동기 응답 필수
  }
});
```

**핵심 기능**:
- Content Script로부터 번역 요청 수신
- TranslationService 호출 및 결과 반환
- 에러 상태 적절히 처리

#### **3.3 Rate Limiting & Retry Policy**
- **Exponential Backoff**: 100ms → 200ms → 400ms → 실패
- **Max Retries**: 3회 (429/5xx 에러 시)
- **Rate Limit**: OpenAI Tier 1 기준 60 RPM 고려
- **Circuit Breaker**: 연속 실패 시 일시 중단

#### **3.4 API Key 보안 저장**
- **Storage**: `chrome.storage.sync` 사용
- **UI**: Popup에 API 키 입력 필드 추가
- **보안**: 로그에 절대 노출 금지
- **Validation**: API 키 형식 검증

#### **3.5 DOM Integration**
```typescript
// src/core/dom-extractor.ts 수정
// "HELLO GITHUB TRANSLATOR" → 실제 번역 결과
const translatedText = await chrome.runtime.sendMessage({
  type: 'TRANSLATE',
  text: originalTitle,
  direction: 'EN_TO_KO'
});
```

### 🎯 **번역 방향 및 프롬프트**

#### **Read Path: English → Korean**
```json
{
  "messages": [
    {
      "role": "system",
      "content": "Translate the following GitHub discussion from English to Korean, preserving markdown."
    },
    {
      "role": "user", 
      "content": "${TEXT}"
    }
  ]
}
```

#### **Write Path: Korean → English** (Sprint 4에서 구현)
```json
{
  "messages": [
    {
      "role": "system",
      "content": "Translate the following GitHub discussion from Korean to English, preserving markdown."
    },
    {
      "role": "user",
      "content": "${TEXT}"
    }
  ]
}
```

### 🧪 **Sprint 3 테스트 전략**

#### **Unit Tests (Jest + Nock)**
```typescript
describe('TranslationService', () => {
  test('translates EN to KO via OpenAI Responses API', async () => {
    // given
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

#### **Integration Tests**
- Background ↔ Content 메시지 통신
- API 키 저장/로드 플로우
- 네트워크 오류 시나리오

#### **E2E Tests (개발 중 OpenAI API 비용 절약)**
- Mock API 서버로 전체 플로우 검증
- 실제 GitHub 페이지에서 번역 동작 확인

### ✅ **Sprint 3 완료 기준**

**🎯 성공 조건**:
- [ ] GitHub 이슈 제목이 **실제 한국어**로 번역되어 표시
- [ ] API 키 설정 UI가 Popup에 완성
- [ ] 네트워크 오류 시 적절한 에러 처리
- [ ] 모든 단위 테스트 통과 (기존 14개 + 새로운 번역 테스트)
- [ ] 빌드 및 타입 체크 성공

**🚀 실제 동작 결과**:
```
🔍 Extracting titles for page type: issues_list
🌐 Translating 5 titles from English to Korean...
📋 Translation Results:
📌 1. "Fix memory leak in transformer" → "트랜스포머의 메모리 누수 수정"
📌 2. "Add support for new model" → "새로운 모델 지원 추가"
...
🎉 Sprint 3 Complete: Real translation working!
```

### 🎮 **작업 진행 순서**

#### **Week 1 (Phase 1)**
1. **Day 1-2**: TranslationService 구현 (3.1)
2. **Day 3-4**: Background Message Handler (3.2)
3. **Day 5**: Phase 1 통합 테스트

#### **Week 2 (Phase 2-3)**
4. **Day 1-2**: Rate Limiting & Retry (3.3)
5. **Day 3-4**: API Key Management UI (3.4)
6. **Day 5**: DOM Integration (3.5) + 최종 테스트

---
**마지막 업데이트**: 2024-12-19  
**현재 스프린트**: Sprint 3 - OpenAI Integration & Translation Service (Task 3.1 시작 준비)