# 🌐 GitHub Translator Extension

**Chrome 확장 프로그램으로 GitHub의 모든 텍스트를 실시간 번역**

<div align="center">

![GitHub Translator](https://img.shields.io/badge/GitHub-Translator-blue?style=for-the-badge&logo=github)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green?style=for-the-badge&logo=googlechrome)
![AI Powered](https://img.shields.io/badge/AI-Powered-orange?style=for-the-badge&logo=openai)

</div>

---

## 🎯 프로그램 목적

**GitHub에서 영어로 된 프로젝트에 더 많은 기여를 하기 위해 개발되었습니다.**

- 🌍 **언어 장벽 제거**: 영어 이슈/PR을 한국어로 실시간 번역
- 🚀 **참여도 향상**: 이해하기 쉬운 한국어로 더 적극적인 기여 가능
- 💡 **효율성 향상**: 번역 도구 없이 바로 GitHub에서 소통

---

## ⚡ 주요 기능

### 🔄 **완전 자동 번역**
- ✅ **이슈/PR 제목** 자동 번역
- ✅ **이슈/PR 본문** 자동 번역  
- ✅ **기존 댓글들** 자동 번역
- ✅ **새 댓글 작성** 번역 버튼

### 🎨 **사용자 친화적 UI**
- 🌐 **번역 후 댓글** 버튼으로 간편한 댓글 작성
- 🔄 **토글 기능** (원문 ↔ 번역문)
- ⌨️ **키보드 단축키** 지원
- 📱 **GitHub 2025 UI** 완벽 지원

---

## 🛠 구현 과정

### 💻 **개발 환경**
- **에디터**: Cursor IDE 단독 사용
- **AI 어시스턴트**: Claude 4 Sonnet (최신 버전)
- **개발 기간**: 64 커밋만에 완성
- **총 비용**: $14 (Claude API 사용료)

### 🏗 **기술 스택**
```
Frontend: TypeScript + Chrome Extension Manifest V3
Translation: OpenAI GPT-4.1-mini API
Build Tool: Vite
Testing: Jest
Package Manager: npm
```

---

## 📋 메모리 뱅크 패턴

**AI 어시스턴트와의 협업을 위한 체계적인 문서화 패턴**

### 🧠 **핵심 개념**
- **지속적 컨텍스트 유지**: 프로젝트 전체 상황을 AI가 지속적으로 기억
- **단계별 진행 추적**: 각 스프린트별 세부 진행사항 기록
- **오류 해결 이력**: 발생한 문제와 해결 과정 상세 기록
- **학습 내용 축적**: 개발 과정에서 얻은 인사이트 누적

### 📁 **문서 구조**
```
memory-bank/
├── architecture.md     # 전체 구조 설계
├── implementation-plan.md  # 구현 계획
└── progress.md         # 실시간 진행 상황
```

### 🔄 **워크플로우**
1. **계획 → 실행 → 기록 → 검토** 사이클 반복
2. **실시간 업데이트**: 매 작업 완료 시 progress.md 갱신
3. **오류 추적**: 버그 발생 시 원인과 해결책 상세 기록

---

## 📈 작업 순서

### 1️⃣ **설계 단계** (ChatGPT 활용)
```bash
📝 architecture.md 작성
└── 전체 시스템 구조 설계
└── 기술 스택 선정
└── 확장 프로그램 아키텍처 정의
```

### 2️⃣ **개발 단계** (Cursor + Claude 4 Sonnet)
```bash
📋 implementation-plan.md 작성
└── 세부 구현 계획 수립
└── 스프린트별 태스크 분해
└── 우선순위 설정
```

### 3️⃣ **실행 & 기록 단계**
```bash
🔄 반복 사이클:
└── 기능 구현 → progress.md 업데이트
└── 테스트 → 오류 수정 → 기록 갱신
└── 다음 스프린트 진행
```

### 📊 **진행 결과**
- **총 64 커밋** 으로 완성
- **4개 스프린트** 로 체계적 개발
- **실시간 문서화** 로 전체 과정 추적

---

## 💡 프로젝트를 통해 배운 것들

### ✅ **성공 요인들**

#### 📝 **체계적 기록의 중요성**
- **progress.md 활용**: 매 단계마다 상세한 진행 상황 기록
- **AI 컨텍스트 유지**: 지속적인 문서 업데이트로 AI가 프로젝트 전체 상황 파악

#### 🧪 **TDD (Test-Driven Development) 효과**
- **안정성 확보**: 각 기능별 테스트 케이스로 회귀 오류 방지
- **리팩토링 자신감**: 테스트 코드 덕분에 대규모 수정 시 안전성 보장
- **품질 향상**: 테스트 우선 개발로 더 견고한 코드 작성

### ⚠️ **개선이 필요한 부분들**

#### 📋 **문서화 개선점**
- **progress.md 기록 방식**: 더 짧고 핵심적인 내용으로 정리 필요
- **검색 가능성**: 나중에 쉽게 찾을 수 있는 키워드 중심 기록
- **시각적 구조화**: 마크다운 포맷을 활용한 더 읽기 쉬운 문서

#### 🔄 **회귀 오류 문제**
- **GitHub UI 변경**: 지속적인 웹사이트 UI 변화로 인한 선택자 오류
- **동적 클래스명**: CSS-in-JS 패턴으로 인한 예측 불가능한 클래스명
- **대응 방안**: 더 견고한 선택자 패턴과 fallback 로직 필요

#### 👨‍💻 **개발자 오너십**
- **AI 의존도**: Claude에 의존하다 보니 전체 코드 파악도 저하
- **학습 기회**: 직접 구현하지 않아 깊은 이해 부족
- **균형점**: AI 도움과 직접 개발 사이의 적절한 균형 필요

---

## 🚀 설치 및 사용법

### 📦 **설치**
1. 이 저장소를 클론합니다
```bash
git clone https://github.com/moltak/github-translator.git
cd github-translator
```

2. 의존성을 설치합니다
```bash
npm install
```

3. 확장 프로그램을 빌드합니다
```bash
npm run build
```

4. Chrome에서 확장 프로그램을 로드합니다
   - `chrome://extensions/` 접속
   - "개발자 모드" 활성화
   - "압축해제된 확장 프로그램을 로드합니다" 클릭
   - `dist` 폴더 선택

### ⚙️ **설정**
1. 팝업에서 OpenAI API 키를 입력합니다
2. GitHub 페이지를 새로고침합니다
3. 자동으로 번역이 시작됩니다!

### ⌨️ **키보드 단축키**
- `Ctrl+Shift+P`: 제목 강제 번역
- `Ctrl+Shift+T`: 번역 토글 (원문 ↔ 번역문)
- `Ctrl+Shift+C`: 댓글 번역 버튼 표시/숨김

---

## 📊 프로젝트 통계

- **총 작업 시간**: 대략 10시간
- **총 커밋**: 64개
- **코드 라인**: ~2,500 lines
- **지원 언어**: Korean ↔ English
- **AI 비용**: $14
- **Chrome Store**: 준비 중

---