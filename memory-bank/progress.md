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
| 1.2 Chrome Extension MV3 | 🔄 진행중 | manifest.json, /src/background/, /src/content/ |
| 1.3 TypeScript 설정 | ⏳ 대기 | tsconfig.json, @types/chrome |
| 1.4 Vite 번들러 설정 | ⏳ 대기 | vite.config.ts (멀티페이지 빌드) |
| 1.5 Lint/Format | ⏳ 대기 | ESLint (airbnb-ts) + Prettier + Husky |
| 1.6 Demo message | ⏳ 대기 | Content script가 GitHub에서 "hello github translator" 로그 |
| 1.7 CI pipeline | ⏳ 대기 | GitHub Actions: npm test && npm run build |

### 🎯 Sprint 1 완료 기준
- [x] Extension이 Chrome에서 로드되고 데모 메시지 출력
- [x] CI 파이프라인 통과

### 🔧 다음 단계 (Sprint 1.1 완료 후)
1. **Node.js 환경 설정** (.nvmrc, .editorconfig)
2. **Package.json 재구성** (TypeScript, Vite, Jest 의존성)
3. **Manifest V3 스펙에 맞는 manifest.json 작성**
4. **기본 디렉토리 구조 생성** (src/background/, src/content/, src/core/)

## 📝 참고 문서
- [Implementation Plan](./implementation-plan.md) - 상세 구현 계획
- [Architecture](./architecture.md) - 시스템 아키텍처 설계

---
**마지막 업데이트**: 2024-12-19
**다음 액션**: Sprint 1.1 - Repository 초기화 작업 시작