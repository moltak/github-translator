// DOM Extractor for GitHub Issues/PRs

export interface GitHubPageInfo {
  type: 'issue' | 'pull_request' | 'issues_list' | 'pulls_list' | 'other';
  url: string;
  pathname: string;
}

export interface ExtractedTitle {
  element: HTMLElement;
  text: string;
  selector: string;
  index: number;
}

/**
 * GitHub 페이지 타입을 감지합니다.
 */
export function detectPageType(): GitHubPageInfo {
  const { pathname, href } = window.location;
  
  let type: GitHubPageInfo['type'] = 'other';
  
  if (pathname.includes('/issues/') && /\/issues\/\d+/.test(pathname)) {
    type = 'issue';
  } else if (pathname.includes('/pull/') && /\/pull\/\d+/.test(pathname)) {
    type = 'pull_request';
  } else if (pathname.includes('/issues') && !pathname.includes('/issues/')) {
    type = 'issues_list';
  } else if (pathname.includes('/pulls') && !pathname.includes('/pull/')) {
    type = 'pulls_list';
  }
  
  return {
    type,
    url: href,
    pathname,
  };
}

/**
 * 페이지 타입별 제목 선택자를 반환합니다.
 */
export function getTitleSelectors(pageType: GitHubPageInfo['type']): string[] {
  const selectors: Record<GitHubPageInfo['type'], string[]> = {
    issue: [
      '.js-issue-title', // 이슈 상세 페이지 제목
      'h1.gh-header-title .js-issue-title', // 새로운 GitHub UI
      'bdi.js-issue-title', // 이슈 제목 요소
      '.gh-header-title .js-issue-title',
    ],
    pull_request: [
      '.js-issue-title', // PR 상세 페이지 제목 (이슈와 동일 구조)
      'h1.gh-header-title .js-issue-title',
      'bdi.js-issue-title',
      '.gh-header-title .js-issue-title',
    ],
    issues_list: [
      '.js-navigation-item [data-hovercard-type="issue"] .Link--primary', // 이슈 목록
      '.js-navigation-item .h4 a', // 대체 선택자
      '[data-testid="issue-title-link"]', // 새로운 테스트 ID
      '.js-navigation-item .Link--primary[data-hovercard-type="issue"]',
    ],
    pulls_list: [
      '.js-navigation-item [data-hovercard-type="pull_request"] .Link--primary', // PR 목록
      '.js-navigation-item .h4 a', // 대체 선택자
      '[data-testid="pr-title-link"]', // 새로운 테스트 ID
      '.js-navigation-item .Link--primary[data-hovercard-type="pull_request"]',
    ],
    other: [
      // 일반적인 GitHub 제목 선택자들
      '.js-issue-title',
      '.js-navigation-item .Link--primary',
      'h1.gh-header-title',
    ],
  };
  
  return selectors[pageType] || selectors.other;
}

/**
 * GitHub 이슈/PR 제목들을 추출합니다.
 */
export function getIssueTitles(): ExtractedTitle[] {
  const pageInfo = detectPageType();
  const selectors = getTitleSelectors(pageInfo.type);
  const extractedTitles: ExtractedTitle[] = [];
  
  console.log(`🔍 Extracting titles for page type: ${pageInfo.type}`);
  console.log(`🎯 Using selectors:`, selectors);
  
  // 각 선택자로 요소들을 찾아보기
  for (const selector of selectors) {
    const elements = document.querySelectorAll<HTMLElement>(selector);
    
    if (elements.length > 0) {
      console.log(`✅ Found ${elements.length} elements with selector: "${selector}"`);
      
      elements.forEach((element, index) => {
        const text = element.textContent?.trim() || '';
        if (text) {
          extractedTitles.push({
            element,
            text,
            selector,
            index,
          });
        }
      });
      
      // 첫 번째로 매치되는 선택자 사용 (중복 방지)
      break;
    } else {
      console.log(`❌ No elements found with selector: "${selector}"`);
    }
  }
  
  // 결과 로깅
  if (extractedTitles.length > 0) {
    console.log(`📄 Extracted ${extractedTitles.length} titles:`);
    extractedTitles.forEach((title, index) => {
      console.log(`  ${index + 1}. "${title.text}" (${title.selector})`);
    });
  } else {
    console.warn('⚠️ No titles found on this page');
  }
  
  return extractedTitles;
}

/**
 * DOM이 변경될 때까지 대기하는 유틸리티 함수
 */
export function waitForDOM(timeout = 3000): Promise<void> {
  return new Promise((resolve) => {
    if (document.readyState === 'complete') {
      resolve();
      return;
    }
    
    const timer = setTimeout(() => {
      resolve();
    }, timeout);
    
    document.addEventListener('DOMContentLoaded', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}