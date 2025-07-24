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
  originalText?: string; // 원본 텍스트 백업
  isReplaced?: boolean; // 교체 여부
}

// 교체된 요소들을 추적하기 위한 전역 Map
const replacedElements = new Map<HTMLElement, string>();

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
            originalText: text,
            isReplaced: false,
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
 * 제목을 지정된 텍스트로 교체합니다.
 * Sprint 2.3: Replace Titles
 */
export function replaceTitles(titles: ExtractedTitle[], replacementText = 'HELLO GITHUB TRANSLATOR'): number {
  let replacedCount = 0;
  
  console.log(`🔄 Replacing ${titles.length} titles with "${replacementText}"`);
  
  titles.forEach((title, index) => {
    try {
      const { element } = title;
      
      // 이미 교체된 요소는 건너뛰기
      if (replacedElements.has(element)) {
        return;
      }
      
      // 원본 텍스트 백업
      const originalText = element.textContent?.trim() || '';
      replacedElements.set(element, originalText);
      
      // 텍스트 교체
      if (element.textContent) {
        element.textContent = replacementText;
        
        // 데이터 속성으로 원본 텍스트 저장
        element.setAttribute('data-original-title', originalText);
        element.setAttribute('data-github-translator', 'replaced');
        
        console.log(`✅ ${index + 1}. Replaced: "${originalText}" → "${replacementText}"`);
        replacedCount++;
      }
    } catch (error) {
      console.error(`❌ Failed to replace title ${index + 1}:`, error);
    }
  });
  
  console.log(`🎯 Successfully replaced ${replacedCount} titles`);
  return replacedCount;
}

/**
 * 제목을 실제 번역으로 교체합니다.
 * Sprint 3.5: Real Translation Integration
 */
export async function replaceTitlesWithTranslation(titles: ExtractedTitle[]): Promise<number> {
  console.log(`🌐 Starting real translation for ${titles.length} titles...`);
  
  let successCount = 0;
  
  for (const [index, title] of titles.entries()) {
    try {
      const { element } = title;
      
      // 이미 교체된 요소는 건너뛰기
      if (replacedElements.has(element)) {
        continue;
      }
      
      const originalText = element.textContent?.trim() || '';
      if (!originalText) {
        continue;
      }
      
      console.log(`🔄 Translating (${index + 1}/${titles.length}): "${originalText.substring(0, 50)}..."`);
      
      // 원본 텍스트 백업 및 로딩 표시
      element.setAttribute('data-original-title', originalText);
      element.setAttribute('data-github-translator', 'translating');
      element.textContent = `🔄 Translating...`;
      
      // Background Script에 번역 요청
      const response = await chrome.runtime.sendMessage({
        type: 'TRANSLATE',
        text: originalText,
        direction: 'EN_TO_KO'
      });
      
      if (response && response.success) {
        // 번역 성공
        element.textContent = response.translatedText;
        element.setAttribute('data-github-translator', 'translated');
        replacedElements.set(element, originalText);
        
        console.log(`✅ (${index + 1}/${titles.length}) Translated: "${originalText.substring(0, 30)}..." → "${response.translatedText.substring(0, 30)}..."`);
        successCount++;
      } else {
        // 번역 실패 - 원본 복원
        const errorMsg = response?.error || 'Translation failed';
        console.error(`❌ (${index + 1}/${titles.length}) Translation failed: ${errorMsg}`);
        
        element.textContent = originalText;
        element.setAttribute('data-github-translator', 'error');
        element.setAttribute('data-translation-error', errorMsg);
      }
      
    } catch (error) {
      console.error(`❌ (${index + 1}/${titles.length}) Translation error:`, error);
      
      // 에러 시 원본 복원
      const originalText = title.element.getAttribute('data-original-title') || title.element.textContent || '';
      title.element.textContent = originalText;
      title.element.setAttribute('data-github-translator', 'error');
      title.element.setAttribute('data-translation-error', error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  console.log(`🎉 Real translation completed: ${successCount}/${titles.length} titles translated successfully`);
  return successCount;
}

/**
 * 교체된 제목들을 원본으로 복원합니다.
 */
export function restoreTitles(): number {
  let restoredCount = 0;
  
  console.log(`🔄 Restoring ${replacedElements.size} replaced titles`);
  
  replacedElements.forEach((originalText, element) => {
    try {
      if (element.textContent && element.hasAttribute('data-github-translator')) {
        element.textContent = originalText;
        element.removeAttribute('data-original-title');
        element.removeAttribute('data-github-translator');
        
        console.log(`✅ Restored: "${originalText}"`);
        restoredCount++;
      }
    } catch (error) {
      console.error(`❌ Failed to restore title:`, error);
    }
  });
  
  replacedElements.clear();
  console.log(`🎯 Successfully restored ${restoredCount} titles`);
  return restoredCount;
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
              originalText: text,
              isReplaced: replacedElements.has(element),
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
        ((title.element as HTMLAnchorElement).href?.includes('/issues/') || 
         (title.element as HTMLAnchorElement).href?.includes('/pull/') ||
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
      const status = title.isReplaced ? '🔄 (replaced)' : '📌';
      console.log(`  ${status} ${index + 1}. "${title.text}" (${title.selector})`);
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
 * 제목을 추출하고 즉시 교체합니다.
 * Sprint 2.3: 통합 함수
 */
export function extractAndReplaceTitles(replacementText = 'HELLO GITHUB TRANSLATOR'): ExtractedTitle[] {
  const titles = getIssueTitles();
  
  if (titles.length > 0) {
    const replacedCount = replaceTitles(titles, replacementText);
    console.log(`🎉 Sprint 2.3 Complete: Extracted and replaced ${replacedCount} titles!`);
  } else {
    console.log('📭 No titles to replace');
  }
  
  return titles;
}

/**
 * 제목을 추출하고 실제 번역으로 교체합니다.
 * Sprint 3.5: Real Translation Integration
 */
export async function extractAndTranslateTitles(): Promise<ExtractedTitle[]> {
  console.log('🎯 Sprint 3.5 - Real Translation Starting...');
  
  const titles = getIssueTitles();
  
  if (titles.length === 0) {
    console.log('📭 No titles found to translate');
    return titles;
  }
  
  const translatedCount = await replaceTitlesWithTranslation(titles);
  
  console.log(`🎉 Sprint 3.5 Complete: Extracted and translated ${translatedCount}/${titles.length} titles!`);
  return titles;
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