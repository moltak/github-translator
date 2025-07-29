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
  const selectors = {
    issue: [
      '.js-issue-title', // 개별 이슈 페이지 제목
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
      // 🔗 실제 확인된 링크 클래스 우선 사용
      'a.IssuePullRequestTitle-module__ListItemTitle_1--_xOfg',
      'a[class*="IssuePullRequestTitle-module__ListItemTitle_1"]',
      // 🔗 링크 요소 우선 선택 (A 태그만)
      'a[class*="IssuePullRequestTitle-module__ListItemTitle"]',
      'a[class*="ListItemTitle"]',
      'a[class*="Link--primary"][class*="v-align-middle"]',
      // 기존 링크 선택자들
      '.js-navigation-item [data-hovercard-type="issue"] .Link--primary',
      '.js-navigation-item .h4 a',
      '[data-testid="issue-title-link"]',
      '.js-navigation-item .Link--primary[data-hovercard-type="issue"]',
      // 추가 일반적인 링크 패턴
      '.js-navigation-item a[href*="/issues/"]',
      '.js-issue-row a[href*="/issues/"]',
    ],
    pulls_list: [
      // 🔗 실제 확인된 링크 클래스 우선 사용  
      'a.IssuePullRequestTitle-module__ListItemTitle_1--_xOfg',
      'a[class*="IssuePullRequestTitle-module__ListItemTitle_1"]',
      // 🔗 링크 요소 우선 선택 (A 태그만)
      'a[class*="IssuePullRequestTitle-module__ListItemTitle"]',
      'a[class*="ListItemTitle"]',
      'a[class*="Link--primary"][class*="v-align-middle"]',
      // 기존 링크 선택자들
      '.js-navigation-item [data-hovercard-type="pull_request"] .Link--primary',
      '.js-navigation-item .h4 a',
      '[data-testid="pr-title-link"]',
      '.js-navigation-item .Link--primary[data-hovercard-type="pull_request"]',
      // 추가 일반적인 링크 패턴
      '.js-navigation-item a[href*="/pull/"]',
      '.js-issue-row a[href*="/pull/"]',
    ],
    other: [
      // 🔗 링크 우선 일반 패턴
      'a[class*="IssuePullRequestTitle-module"]',
      'a[class*="ListItemTitle"]',
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
 * 요소의 텍스트만 안전하게 교체합니다 (HTML 구조 완전 보존)
 * 복잡한 마크다운 렌더링 구조도 안전하게 처리합니다.
 */
function safeReplaceText(element: HTMLElement, newText: string): void {
  // 간단한 요소 (제목 등): 직접 텍스트 교체
  if (isSimpleTextElement(element)) {
    if (element.tagName === 'A') {
      // <a> 태그인 경우 href 속성 보존
      const originalHref = (element as HTMLAnchorElement).href;
      element.textContent = newText;
      if (originalHref && (element as HTMLAnchorElement).href !== originalHref) {
        (element as HTMLAnchorElement).href = originalHref;
      }
    } else {
      element.textContent = newText;
    }
    return;
  }

  // 복잡한 구조 (PR 설명 등): 텍스트 노드만 안전하게 교체
  replaceTextNodesOnly(element, newText);
}

/**
 * 요소가 간단한 텍스트 요소인지 확인합니다.
 */
function isSimpleTextElement(element: HTMLElement): boolean {
  // 자식 요소가 없거나, 텍스트만 있는 간단한 구조
  const hasComplexChildren = element.querySelectorAll('p, div, ul, ol, li, h1, h2, h3, h4, h5, h6, code, pre, img, table').length > 0;
  return !hasComplexChildren;
}

/**
 * HTML 구조를 보존하면서 텍스트 노드만 번역합니다.
 * TreeWalker를 사용하여 안전하게 처리합니다.
 */
function replaceTextNodesOnly(element: HTMLElement, newText: string): void {
  // 원본 텍스트 수집
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node: Node): number => {
        const text = node.textContent?.trim() || '';
        // 의미있는 텍스트만 수집 (공백, 줄바꿈 제외)
        if (text.length > 2 && !isWhitespaceOnly(text)) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_REJECT;
      }
    },
    false
  );

  let textNode;
  while (textNode = walker.nextNode()) {
    textNodes.push(textNode as Text);
  }

  if (textNodes.length === 0) {
    console.warn('⚠️ No meaningful text nodes found in complex element');
    return;
  }

  // 번역된 텍스트를 문장 단위로 분할
  const sentences = splitIntoSentences(newText);
  
  // 원본 텍스트 노드와 번역 문장을 매핑
  distributeTranslatedText(textNodes, sentences);
}

/**
 * 텍스트가 공백만 있는지 확인합니다.
 */
function isWhitespaceOnly(text: string): boolean {
  return /^\s*$/.test(text);
}

/**
 * 번역된 텍스트를 문장 단위로 분할합니다.
 */
function splitIntoSentences(text: string): string[] {
  // 문장 구분자로 분할 (한글, 영어 지원)
  const sentences = text.split(/[.!?。！？]\s+/).filter(s => s.trim().length > 0);
  
  // 마지막 문장에 구분자가 없는 경우 처리
  if (sentences.length === 0) {
    return [text.trim()];
  }
  
  return sentences.map(s => s.trim());
}

/**
 * 번역된 문장들을 텍스트 노드에 적절히 분배합니다.
 */
function distributeTranslatedText(textNodes: Text[], sentences: string[]): void {
  if (textNodes.length === 0 || sentences.length === 0) return;

  // 첫 번째 텍스트 노드에 전체 번역 결과 할당
  if (textNodes.length === 1) {
    textNodes[0].textContent = sentences.join('. ');
    return;
  }

  // 여러 텍스트 노드가 있는 경우, 문장을 분배
  let sentenceIndex = 0;
  
  textNodes.forEach((textNode, nodeIndex) => {
    if (sentenceIndex < sentences.length) {
      textNode.textContent = sentences[sentenceIndex];
      sentenceIndex++;
    } else {
      // 번역 문장이 부족한 경우, 빈 텍스트로 설정
      textNode.textContent = '';
    }
  });

  // 남은 문장이 있는 경우, 마지막 노드에 추가
  if (sentenceIndex < sentences.length) {
    const remainingSentences = sentences.slice(sentenceIndex);
    const lastNode = textNodes[textNodes.length - 1];
    lastNode.textContent += ' ' + remainingSentences.join('. ');
  }
}

/**
 * 제목을 지정된 텍스트로 교체합니다.
 * Sprint 2.3: Replace Titles
 */
export function replaceTitles(titles: ExtractedTitle[], replacementText = 'HELLO GITHUB TRANSLATOR'): number {
  let replacedCount = 0;
  
    titles.forEach((title, index) => {
    try {
      const { element } = title;
      
      // 이미 교체된 요소는 건너뛰기
      if (replacedElements.has(element)) {
        return;
      }
      
      // 원본 텍스트 백업
      const originalText = element.textContent?.trim() || '';
      
      // 빈 텍스트나 의미없는 텍스트는 건너뛰기
      if (!originalText || originalText.length < 3) {
        return;
      }
      
      replacedElements.set(element, originalText);
      
      // 텍스트 교체 (HTML 구조 유지)
      safeReplaceText(element, replacementText);
      
      // 데이터 속성으로 원본 텍스트 저장
      element.setAttribute('data-original-title', originalText);
      element.setAttribute('data-github-translator', 'replaced');
      
      replacedCount++;
    } catch (error) {
      console.error(`❌ Failed to replace title ${index + 1}:`, error);
    }
  });
  
  console.log(`🎯 Replaced ${replacedCount}/${titles.length} titles with "${replacementText}"`);
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
      
      // 원본 텍스트 백업 및 로딩 표시
      element.setAttribute('data-original-title', originalText);
      element.setAttribute('data-github-translator', 'translating');
      safeReplaceText(element, `🔄 Translating...`);
      
      // Background Script에 번역 요청
      console.log(`📡 Sending translation request for: "${originalText.substring(0, 30)}..."`);
      
      let response;
      try {
        response = await chrome.runtime.sendMessage({
          type: 'TRANSLATE',
          text: originalText,
          direction: 'EN_TO_KO'
        });
        console.log(`📨 Received response:`, response);
      } catch (messageError) {
        console.error(`❌ Message sending failed:`, messageError);
        throw new Error(`Message sending failed: ${messageError.message}`);
      }
      
      if (response && response.success) {
        // 번역 성공 (HTML 구조 유지)
        safeReplaceText(element, response.translatedText);
        element.setAttribute('data-github-translator', 'translated');
        replacedElements.set(element, originalText);
        
        successCount++;
      } else {
        // 번역 실패 - 원본 복원
        const errorMsg = response?.error || 'Translation failed';
        console.error(`❌ Translation failed: ${errorMsg}`);
        
        safeReplaceText(element, originalText);
        element.setAttribute('data-github-translator', 'error');
        element.setAttribute('data-translation-error', errorMsg);
      }
      
    } catch (error) {
      console.error(`❌ Translation error:`, error);
      
      // 에러 시 원본 복원
      const originalText = title.element.getAttribute('data-original-title') || title.element.textContent || '';
      safeReplaceText(title.element, originalText);
      title.element.setAttribute('data-github-translator', 'error');
      title.element.setAttribute('data-translation-error', error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  console.log(`🎉 Real translation completed: ${successCount}/${titles.length} titles translated`);
  return successCount;
}

/**
 * 교체된 제목들을 원본으로 복원합니다.
 */
export function restoreTitles(): number {
  let restoredCount = 0;
  
  replacedElements.forEach((originalText, element) => {
    try {
      if (element.textContent && element.hasAttribute('data-github-translator')) {
        safeReplaceText(element, originalText);
        element.removeAttribute('data-original-title');
        element.removeAttribute('data-github-translator');
        
        restoredCount++;
      }
    } catch (error) {
      console.error(`❌ Failed to restore title:`, error);
    }
  });
  
  replacedElements.clear();
  console.log(`🎯 Restored ${restoredCount} titles to original text`);
  return restoredCount;
}

/**
 * PR 설명 영역을 추출합니다.
 * Sprint 3.6: PR Description Translation
 */
export function getPRDescription(): ExtractedTitle[] {
  const pageInfo = detectPageType();
  
  // PR 페이지가 아니면 빈 배열 반환
  if (pageInfo.type !== 'pull_request' && pageInfo.type !== 'issue') {
    return [];
  }
  
  console.log(`📝 Extracting markdown content from ${pageInfo.type} page...`);
  
  const prDescriptionSelectors = [
    // 🆕 GitHub 최신 마크다운 컨테이너 클래스들
    '[class*="Box-sc-"][class*="markdown-body"]',
    '[class*="NewMarkdownViewer-module__safe-html-box"]', 
    '[class*="markdown-body"][class*="Box-sc-"]',
    
    // 🆕 GitHub CSS Modules 패턴
    '[class*="MarkdownViewer-module"]',
    '[class*="IssueDescription-module"]',
    '[class*="CommentBody-module"]',
    
    // 기존 선택자들
    '.js-comment-body',                    // 메인 설명 영역
    '.comment-body',                       // 대체 선택자
    '.markdown-body',                      // 마크다운 렌더링 영역
    '.js-task-list-container',             // 체크리스트 포함 영역
    '[data-testid="issue-body"]',          // 최신 GitHub 테스트 ID
    '.timeline-comment-wrapper:first-child .comment-body',  // 첫 번째 댓글 (PR 설명)
    
    // 🆕 포괄적 마크다운 선택자들
    '[class*="markdown-body"]',
    '[class*="comment-body"]',
    '[class*="issue-body"]',
    'div[data-testid*="markdown"]',
    'div[data-testid*="issue"]',
    'div[data-testid*="comment"]',
  ];
  
  const extractedDescriptions: ExtractedTitle[] = [];
  
  for (const [index, selector] of prDescriptionSelectors.entries()) {
    try {
      const elements = document.querySelectorAll<HTMLElement>(selector);
      console.log(`🎯 Selector ${index + 1}: "${selector}" found ${elements.length} elements`);
      
      elements.forEach((element, elemIndex) => {
        const text = element.textContent?.trim() || '';
        const classList = element.className || 'no-class';
        const tagName = element.tagName;
        
        console.log(`  📋 Element ${elemIndex + 1}:`, {
          tagName,
          text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          classes: classList,
          textLength: text.length,
          element: element
        });
        
        // 의미있는 텍스트가 있고, 이미 추출되지 않은 요소만 처리
        if (text && text.length > 20 && !extractedDescriptions.some(desc => desc.element === element)) {
          extractedDescriptions.push({
            element,
            text,
            selector,
            index: extractedDescriptions.length,
            originalText: text,
            isReplaced: false,
          });
          
          console.log(`    ✅ Added markdown content: "${text.substring(0, 50)}..." (${selector})`);
        } else if (text.length <= 20) {
          console.log(`    ⏭️ Skipped (text too short: ${text.length} chars)`);
        } else if (extractedDescriptions.some(desc => desc.element === element)) {
          console.log(`    ⏭️ Skipped (already extracted)`);
        }
      });
      
      // 첫 번째로 요소를 찾은 선택자 사용 후 종료
      if (elements.length > 0) {
        console.log(`🎯 Using selector: "${selector}" (found ${elements.length} elements)`);
        break;
      }
    } catch (error) {
      console.warn(`⚠️ Invalid PR description selector: ${selector}`, error);
    }
  }
  
  console.log(`📋 Found ${extractedDescriptions.length} markdown content(s) for translation`);
  
  if (extractedDescriptions.length > 0) {
    console.log('📝 Markdown contents found:');
    extractedDescriptions.forEach((desc, index) => {
      console.log(`  ${index + 1}. "${desc.text.substring(0, 80)}..." (${desc.selector})`);
    });
  }
  
  return extractedDescriptions;
}

/**
 * GitHub 이슈/PR 제목들을 추출합니다.
 * Sprint 2.1: Issue title scraper implementation
 */
export function getIssueTitles(): ExtractedTitle[] {
  const pageInfo = detectPageType();
  const selectors = getTitleSelectors(pageInfo.type);
  
  console.log(`🔍 Searching for titles on ${pageInfo.type} page using ${selectors.length} selectors...`);
  
  const extractedTitles: ExtractedTitle[] = [];
  const seenLinks = new Set<string>(); // 🔗 중복 링크 방지
  
  for (const [index, selector] of selectors.entries()) {
    const elements = document.querySelectorAll(selector);
    console.log(`🎯 Selector ${index + 1}: "${selector}" found ${elements.length} elements`);
    
    if (elements.length > 0) {
      elements.forEach((element, elemIndex) => {
        const htmlElement = element as HTMLElement;
        const text = htmlElement.textContent?.trim() || '';
        
        // 🔍 링크 디버깅 정보 추가
        const isLink = htmlElement.tagName === 'A';
        const href = isLink ? (htmlElement as HTMLAnchorElement).href : 'N/A';
        const classList = htmlElement.className || 'no-class';
        
        console.log(`  📋 Element ${elemIndex + 1}:`, {
          tagName: htmlElement.tagName,
          isLink,
          href: isLink ? href : 'Not a link',
          text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
          classes: classList,
          element: htmlElement
        });
        
        // 🔗 중복 링크 체크 (링크인 경우에만)
        if (isLink && href !== 'N/A') {
          if (seenLinks.has(href)) {
            console.log(`    ⏭️ Skipped duplicate link: ${href}`);
            return;
          }
          seenLinks.add(href);
        }
        
        if (text.length > 3) {
          extractedTitles.push({
            element: htmlElement,
            text,
            selector,
            index: extractedTitles.length,
            originalText: text,
            isReplaced: false
          });
          console.log(`    ✅ Added to extraction list (isLink: ${isLink}, href: ${href})`);
        } else {
          console.log(`    ⏭️ Skipped (text too short: "${text}")`);
        }
      });
      
      // 첫 번째로 요소를 찾은 선택자 사용 후 종료
      break;
    }
  }
  
  if (extractedTitles.length === 0) {
    console.log('🔍 Running comprehensive search for titles...');
    
    // 포괄적 검색 수행
    const allPossibleTitles = findAllPossibleTitles();
    
    // 🔗 포괄적 검색에서도 중복 제거 적용
    allPossibleTitles.forEach(title => {
      const isLink = title.element.tagName === 'A';
      const href = isLink ? (title.element as HTMLAnchorElement).href : 'N/A';
      
      // 중복 링크 체크
      if (isLink && href !== 'N/A' && seenLinks.has(href)) {
        console.log(`    🔗 Skipped duplicate comprehensive result: ${href}`);
        return;
      }
      
      if (isLink && href !== 'N/A') {
        seenLinks.add(href);
      }
      
      extractedTitles.push(title);
    });
    
    // 🔍 포괄적 검색 결과도 링크 정보 로깅
    extractedTitles.forEach((title, index) => {
      const isLink = title.element.tagName === 'A';
      const href = isLink ? (title.element as HTMLAnchorElement).href : 'N/A';
      console.log(`  🔍 Comprehensive search result ${index + 1}:`, {
        tagName: title.element.tagName,
        isLink,
        href: isLink ? href : 'Not a link',
        text: title.text.substring(0, 30) + '...',
        selector: title.selector
      });
    });
  }
  
  if (extractedTitles.length > 0) {
    console.log(`📄 Found ${extractedTitles.length} titles on ${pageInfo.type} page`);
    
    // 🔍 링크 통계 정보
    const linkCount = extractedTitles.filter(title => title.element.tagName === 'A').length;
    const nonLinkCount = extractedTitles.length - linkCount;
    console.log(`🔗 Link analysis: ${linkCount} links, ${nonLinkCount} non-links`);
    console.log(`🔗 Unique links found: ${seenLinks.size}`);
    
    if (linkCount > 0) {
      console.log('🔗 Links found:');
      extractedTitles
        .filter(title => title.element.tagName === 'A')
        .forEach((title, index) => {
          const href = (title.element as HTMLAnchorElement).href;
          console.log(`  ${index + 1}. "${title.text.substring(0, 40)}..." → ${href}`);
        });
    }
    
  } else {
    console.warn('⚠️ No titles found on this page');
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
 * Sprint 3.6: PR 설명을 추출하고 번역합니다.
 */
export async function extractAndTranslatePRDescription(): Promise<number> {
  console.log('🚀 Sprint 3.6 - PR Description Translation Starting...');
  
  const descriptions = getPRDescription();
  if (descriptions.length === 0) {
    console.log('📭 No PR descriptions found to translate');
    return 0;
  }
  
  const successCount = await replaceTitlesWithTranslation(descriptions);
  console.log(`🎉 Sprint 3.6 Complete: Translated ${successCount}/${descriptions.length} PR description(s)!`);
  
  return successCount;
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