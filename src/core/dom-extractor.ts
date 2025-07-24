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
 * GitHub의 CSS Modules로 인한 동적 클래스명에 대응합니다.
 */
export function getTitleSelectors(pageType: GitHubPageInfo['type']): string[] {
  const selectors: Record<GitHubPageInfo['type'], string[]> = {
    issue: [
      '.js-issue-title', // 기존 선택자
      'h1.gh-header-title .js-issue-title',
      'bdi.js-issue-title',
      '.gh-header-title .js-issue-title',
      // CSS Modules 패턴
      '[class*="IssuePullRequestTitle-module"]',
      '[class*="IssueTitle"]',
      'h1[class*="gh-header-title"] span',
    ],
    pull_request: [
      '.js-issue-title', // PR도 동일한 구조 사용
      'h1.gh-header-title .js-issue-title',
      'bdi.js-issue-title',
      '.gh-header-title .js-issue-title',
      // CSS Modules 패턴
      '[class*="IssuePullRequestTitle-module"]',
      '[class*="PullRequestTitle"]',
      'h1[class*="gh-header-title"] span',
    ],
    issues_list: [
      // CSS Modules 패턴이 먼저 오도록 수정
      '[class*="IssuePullRequestTitle-module__ListItemTitle"]',
      '[class*="ListItemTitle"]',
      'a[class*="Link--primary"][class*="v-align-middle"]',
      // 기존 선택자들
      '.js-navigation-item [data-hovercard-type="issue"] .Link--primary',
      '.js-navigation-item .h4 a',
      '[data-testid="issue-title-link"]',
      '.js-navigation-item .Link--primary[data-hovercard-type="issue"]',
      // 추가 일반적인 패턴
      '.js-navigation-item a[href*="/issues/"]',
      '.js-issue-row a[href*="/issues/"]',
    ],
    pulls_list: [
      // CSS Modules 패턴
      '[class*="IssuePullRequestTitle-module__ListItemTitle"]',
      '[class*="ListItemTitle"]',
      'a[class*="Link--primary"][class*="v-align-middle"]',
      // 기존 선택자들
      '.js-navigation-item [data-hovercard-type="pull_request"] .Link--primary',
      '.js-navigation-item .h4 a',
      '[data-testid="pr-title-link"]',
      '.js-navigation-item .Link--primary[data-hovercard-type="pull_request"]',
      // 추가 일반적인 패턴
      '.js-navigation-item a[href*="/pull/"]',
      '.js-issue-row a[href*="/pull/"]',
    ],
    other: [
      // CSS Modules 일반 패턴
      '[class*="IssuePullRequestTitle-module"]',
      '[class*="ListItemTitle"]',
      // 기존 일반적인 선택자들
      '.js-issue-title',
      '.js-navigation-item .Link--primary',
      'h1.gh-header-title',
      'a[href*="/issues/"]',
      'a[href*="/pull/"]',
    ],
  };
  
  return selectors[pageType] || selectors.other;
}

/**
 * 모든 가능한 제목 요소를 찾는 포괄적 검색
 */
export function findAllPossibleTitles(): ExtractedTitle[] {
  const allSelectors = [
    // CSS Modules 패턴
    '[class*="IssuePullRequestTitle-module"]',
    '[class*="ListItemTitle"]',
    '[class*="IssueTitle"]',
    '[class*="PullRequestTitle"]',
    // GitHub 링크 패턴
    'a[href*="/issues/"]',
    'a[href*="/pull/"]',
    // 기존 클래스들
    '.js-issue-title',
    '.Link--primary',
    '.js-navigation-item a',
  ];
  
  const foundTitles: ExtractedTitle[] = [];
  
  allSelectors.forEach((selector) => {
    try {
      const elements = document.querySelectorAll<HTMLElement>(selector);
      elements.forEach((element, index) => {
        const text = element.textContent?.trim() || '';
        if (text && text.length > 3) { // 의미있는 텍스트만
          foundTitles.push({
            element,
            text,
            selector,
            index,
          });
        }
      });
    } catch (error) {
      console.warn(`⚠️ Invalid selector: ${selector}`, error);
    }
  });
  
  return foundTitles;
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
    try {
      const elements = document.querySelectorAll<HTMLElement>(selector);
      
      if (elements.length > 0) {
        console.log(`✅ Found ${elements.length} elements with selector: "${selector}"`);
        
        elements.forEach((element, index) => {
          const text = element.textContent?.trim() || '';
          if (text && text.length > 3) { // 의미있는 텍스트만 추출
            extractedTitles.push({
              element,
              text,
              selector,
              index,
            });
          }
        });
        
        // 첫 번째로 매치되는 선택자 사용 (중복 방지)
        if (extractedTitles.length > 0) {
          break;
        }
      } else {
        console.log(`❌ No elements found with selector: "${selector}"`);
      }
    } catch (error) {
      console.warn(`⚠️ Invalid selector: "${selector}"`, error);
    }
  }
  
  // 선택자로 찾지 못한 경우, 포괄적 검색 실행
  if (extractedTitles.length === 0) {
    console.log('🔍 Running comprehensive search for titles...');
    const allTitles = findAllPossibleTitles();
    
    if (allTitles.length > 0) {
      console.log(`🎯 Found ${allTitles.length} potential titles via comprehensive search`);
      allTitles.forEach((title, index) => {
        if (index < 10) { // 처음 10개만 표시
          console.log(`  🔎 ${index + 1}. "${title.text}" (${title.selector})`);
        }
      });
      
      // Issues/PRs 패턴 필터링
      const filteredTitles = allTitles.filter(title => 
        title.text.length > 10 && // 충분히 긴 텍스트
        (title.element.href?.includes('/issues/') || 
         title.element.href?.includes('/pull/') ||
         title.selector.includes('Issue') ||
         title.selector.includes('Pull'))
      );
      
      extractedTitles.push(...filteredTitles.slice(0, 20)); // 최대 20개
    }
  }
  
  // 결과 로깅
  if (extractedTitles.length > 0) {
    console.log(`📄 Extracted ${extractedTitles.length} titles:`);
    extractedTitles.forEach((title, index) => {
      console.log(`  📌 ${index + 1}. "${title.text}" (${title.selector})`);
    });
  } else {
    console.warn('⚠️ No titles found on this page');
    
    // 디버깅을 위한 추가 정보
    console.log('🔍 Debug: Available elements on page:');
    const debugElements = document.querySelectorAll('a, h1, h2, h3, [class*="title"], [class*="Title"]');
    console.log(`Found ${debugElements.length} potential elements to analyze`);
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