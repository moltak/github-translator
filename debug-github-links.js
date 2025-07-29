// GitHub Issues 페이지 링크 구조 및 마크다운 콘텐츠 디버깅 스크립트
// 브라우저 콘솔에서 실행하세요: https://github.com/pat-jj/s3/issues/20

console.log('🔍 GitHub Issues 페이지 분석 시작...');
console.log('📍 Current URL:', window.location.href);
console.log('📍 Current pathname:', window.location.pathname);

// 1. 이슈 제목 링크 찾기
console.log('\n🎯 이슈 제목 링크 분석:');
const titleSelectors = [
  'a.IssuePullRequestTitle-module__ListItemTitle_1--_xOfg',
  'a[class*="IssuePullRequestTitle-module__ListItemTitle_1"]',
  'a[class*="IssuePullRequestTitle-module__ListItemTitle"]',
  'a[class*="ListItemTitle"]',
  '.js-navigation-item a[href*="/issues/"]',
];

titleSelectors.forEach((selector, index) => {
  const elements = document.querySelectorAll(selector);
  console.log(`${index + 1}. "${selector}": ${elements.length}개 요소`);
  
  if (elements.length > 0) {
    elements.forEach((el, i) => {
      console.log(`  ${i + 1}. "${el.textContent?.trim().substring(0, 50)}..." → ${el.href}`);
    });
  }
});

// 2. 🆕 마크다운 본문 콘텐츠 찾기  
console.log('\n📝 마크다운 본문 콘텐츠 분석:');
const markdownSelectors = [
  '[class*="Box-sc-"][class*="markdown-body"]',
  '[class*="NewMarkdownViewer-module__safe-html-box"]', 
  '[class*="markdown-body"][class*="Box-sc-"]',
  '[class*="MarkdownViewer-module"]',
  '[class*="IssueDescription-module"]',
  '[class*="CommentBody-module"]',
  '.js-comment-body',
  '.comment-body',
  '.markdown-body',
  '.js-task-list-container',
  '[data-testid="issue-body"]',
  '.timeline-comment-wrapper:first-child .comment-body',
];

markdownSelectors.forEach((selector, index) => {
  try {
    const elements = document.querySelectorAll(selector);
    console.log(`${index + 1}. "${selector}": ${elements.length}개 요소`);
    
    if (elements.length > 0) {
      elements.forEach((el, i) => {
        const text = el.textContent?.trim() || '';
        const classList = el.className || 'no-class';
        console.log(`  ${i + 1}. ${el.tagName} (${text.length} chars):`, {
          text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          classes: classList,
          element: el
        });
      });
    }
  } catch (error) {
    console.warn(`⚠️ Invalid selector: ${selector}`, error);
  }
});

// 3. 🔍 페이지 유형 감지
console.log('\n🏷️ 페이지 유형 분석:');
const pathname = window.location.pathname;
let pageType = 'unknown';

if (pathname.includes('/issues/') && !pathname.endsWith('/issues')) {
  pageType = 'issue';
} else if (pathname.includes('/issues')) {
  pageType = 'issues_list';
} else if (pathname.includes('/pull/') && !pathname.endsWith('/pulls')) {
  pageType = 'pull_request';
} else if (pathname.includes('/pulls')) {
  pageType = 'pulls_list';
}

console.log(`📋 감지된 페이지 유형: ${pageType}`);

// 4. 실제 확장프로그램 시뮬레이션
console.log('\n🚀 확장프로그램 시뮬레이션:');
if (pageType === 'issue' || pageType === 'pull_request') {
  console.log('✅ 이슈/PR 페이지: 제목 + 마크다운 본문 번역 가능');
  
  // 마크다운 콘텐츠 우선 순위로 찾기
  let foundMarkdown = null;
  for (const selector of markdownSelectors) {
    try {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        foundMarkdown = { selector, elements: elements.length };
        break;
      }
    } catch (e) {
      // continue
    }
  }
  
  if (foundMarkdown) {
    console.log(`🎯 마크다운 콘텐츠 발견: "${foundMarkdown.selector}" (${foundMarkdown.elements}개)`);
  } else {
    console.log('❌ 마크다운 콘텐츠를 찾을 수 없음');
  }
  
} else if (pageType === 'issues_list' || pageType === 'pulls_list') {
  console.log('✅ 목록 페이지: 제목 링크 번역 가능');
  
  // 링크 제목 우선 순위로 찾기
  let foundTitles = null;
  for (const selector of titleSelectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      foundTitles = { selector, elements: elements.length };
      break;
    }
  }
  
  if (foundTitles) {
    console.log(`🎯 제목 링크 발견: "${foundTitles.selector}" (${foundTitles.elements}개)`);
  } else {
    console.log('❌ 제목 링크를 찾을 수 없음');
  }
} else {
  console.log('⚠️ 지원되지 않는 페이지 유형');
}

console.log('\n🎉 분석 완료! 확장프로그램을 로드하고 실제 테스트해보세요.');
console.log('💡 팁: 개발자 도구 Console에서 확장프로그램의 로그를 확인하세요.');