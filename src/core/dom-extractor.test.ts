// DOM Extractor unit tests

import { detectPageType, getTitleSelectors, getIssueTitles, replaceTitles, restoreTitles, extractAndReplaceTitles, getPRDescription, findAllPossibleTitles } from './dom-extractor';

// Mock window.location
const mockLocation = (pathname: string, href?: string) => {
  Object.defineProperty(window, 'location', {
    value: {
      pathname,
      href: href || `https://github.com${pathname}`,
    },
    writable: true,
  });
};

describe('DOM Extractor', () => {
  beforeEach(() => {
    // Clear document body
    document.body.innerHTML = '';
    // Clear any replaced titles state
    restoreTitles();
  });

  describe('detectPageType', () => {
    test('should detect issue page', () => {
      // given
      mockLocation('/owner/repo/issues/123');
      
      // when
      const result = detectPageType();
      
      // then
      expect(result.type).toBe('issue');
      expect(result.pathname).toBe('/owner/repo/issues/123');
    });

    test('should detect pull request page', () => {
      // given
      mockLocation('/owner/repo/pull/456');
      
      // when
      const result = detectPageType();
      
      // then
      expect(result.type).toBe('pull_request');
    });

    test('should detect issues list page', () => {
      // given
      mockLocation('/owner/repo/issues');
      
      // when
      const result = detectPageType();
      
      // then
      expect(result.type).toBe('issues_list');
    });

    test('should detect pulls list page', () => {
      // given
      mockLocation('/owner/repo/pulls');
      
      // when
      const result = detectPageType();
      
      // then
      expect(result.type).toBe('pulls_list');
    });
  });

  describe('getTitleSelectors', () => {
    test('should return correct selectors for issues list', () => {
      // given
      const pageType: GitHubPageInfo['type'] = 'issues_list';
      
      // when
      const selectors = getTitleSelectors(pageType);
      
      // then
      expect(selectors).toContain('a[class*="IssuePullRequestTitle-module__ListItemTitle"]');
      expect(selectors.length).toBeGreaterThan(0);
    });
  });

  describe('getIssueTitles', () => {
    test('should extract titles from issues list page', () => {
      // given
      mockLocation('/owner/repo/issues');
      document.body.innerHTML = `
        <div class="js-navigation-item">
          <a data-hovercard-type="issue" class="Link--primary" href="/owner/repo/issues/1">
            First Issue Title
          </a>
        </div>
        <div class="js-navigation-item">
          <a data-hovercard-type="issue" class="Link--primary" href="/owner/repo/issues/2">
            Second Issue Title
          </a>
        </div>
      `;
      
      // when
      const titles = getIssueTitles();
      
      // then
      expect(titles).toHaveLength(2);
      expect(titles[0].text).toBe('First Issue Title');
      expect(titles[1].text).toBe('Second Issue Title');
      expect(titles[0].originalText).toBe('First Issue Title');
      expect(titles[0].isReplaced).toBe(false);
    });

    test('should extract title from issue detail page', () => {
      // given
      mockLocation('/owner/repo/issues/123');
      document.body.innerHTML = `
        <h1 class="gh-header-title">
          <bdi class="js-issue-title">Detailed Issue Title</bdi>
        </h1>
      `;
      
      // when
      const titles = getIssueTitles();
      
      // then
      expect(titles).toHaveLength(1);
      expect(titles[0].text).toBe('Detailed Issue Title');
      expect(titles[0].originalText).toBe('Detailed Issue Title');
    });

    test('should return empty array when no titles found', () => {
      // given
      mockLocation('/owner/repo/issues');
      document.body.innerHTML = '<div>No issues here</div>';
      
      // when
      const titles = getIssueTitles();
      
      // then
      expect(titles).toHaveLength(0);
    });
  });

  describe('replaceTitles', () => {
    test('should replace title text with specified replacement', () => {
      // given
      mockLocation('/owner/repo/issues');
      document.body.innerHTML = `
        <div class="js-navigation-item">
          <a data-hovercard-type="issue" class="Link--primary" href="/owner/repo/issues/1">
            Original Title
          </a>
        </div>
      `;
      
      const titles = getIssueTitles();
      expect(titles).toHaveLength(1);
      
      // when
      const replacedCount = replaceTitles(titles, 'HELLO GITHUB TRANSLATOR');
      
      // then
      expect(replacedCount).toBe(1);
      expect(titles[0].element.textContent).toBe('HELLO GITHUB TRANSLATOR');
      expect(titles[0].element.getAttribute('data-original-title')).toBe('Original Title');
      expect(titles[0].element.getAttribute('data-github-translator')).toBe('replaced');
    });

    test('should not replace already replaced elements', () => {
      // given
      mockLocation('/owner/repo/issues');
      document.body.innerHTML = `
        <div class="js-navigation-item">
          <a data-hovercard-type="issue" class="Link--primary" href="/owner/repo/issues/1">
            Original Title
          </a>
        </div>
      `;
      
      const titles = getIssueTitles();
      replaceTitles(titles, 'FIRST REPLACEMENT');
      
      // when
      const secondReplacedCount = replaceTitles(titles, 'SECOND REPLACEMENT');
      
      // then
      expect(secondReplacedCount).toBe(0);
      expect(titles[0].element.textContent).toBe('FIRST REPLACEMENT');
    });
  });

  describe('restoreTitles', () => {
    test('should restore original title text', () => {
      // given
      mockLocation('/owner/repo/issues');
      document.body.innerHTML = `
        <div class="js-navigation-item">
          <a data-hovercard-type="issue" class="Link--primary" href="/owner/repo/issues/1">
            Original Title
          </a>
        </div>
      `;
      
      const titles = getIssueTitles();
      replaceTitles(titles, 'HELLO GITHUB TRANSLATOR');
      
      // when
      const restoredCount = restoreTitles();
      
      // then
      expect(restoredCount).toBe(1);
      expect(titles[0].element.textContent).toBe('Original Title');
      expect(titles[0].element.hasAttribute('data-original-title')).toBe(false);
      expect(titles[0].element.hasAttribute('data-github-translator')).toBe(false);
    });
  });

  describe('extractAndReplaceTitles', () => {
    test('should extract and replace titles in one operation', () => {
      // given
      mockLocation('/owner/repo/issues');
      document.body.innerHTML = `
        <div class="js-navigation-item">
          <a data-hovercard-type="issue" class="Link--primary" href="/owner/repo/issues/1">
            First Issue
          </a>
        </div>
        <div class="js-navigation-item">
          <a data-hovercard-type="issue" class="Link--primary" href="/owner/repo/issues/2">
            Second Issue
          </a>
        </div>
      `;
      
      // when
      const titles = extractAndReplaceTitles('TEST REPLACEMENT');
      
      // then
      expect(titles).toHaveLength(2);
      expect(titles[0].element.textContent).toBe('TEST REPLACEMENT');
      expect(titles[1].element.textContent).toBe('TEST REPLACEMENT');
      expect(titles[0].originalText).toBe('First Issue');
      expect(titles[1].originalText).toBe('Second Issue');
    });
  });
});

describe('safeReplaceText - Complex HTML Structure Preservation', () => {
  beforeEach(() => {
    // DOM 초기화
    document.body.innerHTML = '';
  });

  test('should preserve simple text elements (titles)', () => {
    // 간단한 제목 요소 테스트
    const titleElement = document.createElement('a');
    titleElement.href = 'https://github.com/test/repo/issues/123';
    titleElement.textContent = 'Fix bug in authentication';
    document.body.appendChild(titleElement);

    const titles: ExtractedTitle[] = [{
      element: titleElement,
      text: 'Fix bug in authentication',
      selector: 'a',
      index: 0,
      originalText: 'Fix bug in authentication',
      isReplaced: false
    }];

    const replaced = replaceTitles(titles, '인증 버그 수정');

    expect(replaced).toBe(1);
    expect(titleElement.textContent).toBe('인증 버그 수정');
    expect(titleElement.href).toBe('https://github.com/test/repo/issues/123'); // href 보존 확인
  });

  test('should preserve complex HTML structure in PR descriptions', () => {
    // 복잡한 마크다운 구조 테스트
    const complexElement = document.createElement('div');
    complexElement.className = 'markdown-body';
    complexElement.innerHTML = `
      <h2>Overview</h2>
      <p>This PR fixes the authentication bug by:</p>
      <ul>
        <li>Adding proper validation</li>
        <li>Implementing <code>retry logic</code></li>
      </ul>
      <p>See the <a href="/docs">documentation</a> for details.</p>
    `;
    document.body.appendChild(complexElement);

    const descriptions: ExtractedTitle[] = [{
      element: complexElement,
      text: 'Overview This PR fixes...',
      selector: '.markdown-body',
      index: 0,
      originalText: 'Overview This PR fixes...',
      isReplaced: false
    }];

    const replaced = replaceTitles(descriptions, '개요. 이 PR은 다음과 같이 인증 버그를 수정합니다. 적절한 검증 추가. 재시도 로직 구현. 자세한 내용은 문서를 참조하세요.');

    expect(replaced).toBe(1);
    
    // HTML 구조가 보존되었는지 확인
    expect(complexElement.querySelector('h2')).toBeTruthy();
    expect(complexElement.querySelector('ul')).toBeTruthy();
    expect(complexElement.querySelector('li')).toBeTruthy();
    expect(complexElement.querySelector('code')).toBeTruthy();
    expect(complexElement.querySelector('a')).toBeTruthy();
    
    // 링크 href가 보존되었는지 확인
    const link = complexElement.querySelector('a') as HTMLAnchorElement;
    expect(link.href).toContain('/docs');
    
    // 텍스트가 번역되었는지 확인 (정확한 매칭은 어려우므로 일부 키워드만)
    const textContent = complexElement.textContent || '';
    expect(textContent).toContain('개요');
    expect(textContent).toContain('인증');
  });

  test('should handle nested HTML elements safely', () => {
    // 중첩된 구조 테스트
    const nestedElement = document.createElement('div');
    nestedElement.innerHTML = `
      <div>
        <p>Outer paragraph with <strong>bold text</strong> and <em>italic text</em>.</p>
        <div>
          <span>Nested span content</span>
        </div>
      </div>
    `;
    document.body.appendChild(nestedElement);

    const items: ExtractedTitle[] = [{
      element: nestedElement,
      text: 'Outer paragraph...',
      selector: 'div',
      index: 0,
      originalText: 'Outer paragraph...',
      isReplaced: false
    }];

    const replaced = replaceTitles(items, '외부 단락의 굵은 텍스트와 기울임 텍스트. 중첩된 스팬 내용.');

    expect(replaced).toBe(1);
    
    // 중첩 구조 보존 확인
    expect(nestedElement.querySelector('p')).toBeTruthy();
    expect(nestedElement.querySelector('strong')).toBeTruthy();
    expect(nestedElement.querySelector('em')).toBeTruthy();
    expect(nestedElement.querySelector('span')).toBeTruthy();
    
    // 텍스트 번역 확인
    const textContent = nestedElement.textContent || '';
    expect(textContent).toContain('외부');
    expect(textContent).toContain('중첩된');
  });

  test('should detect simple vs complex elements correctly', () => {
    // 간단한 요소
    const simpleDiv = document.createElement('div');
    simpleDiv.textContent = 'Simple text only';
    
    // 복잡한 요소
    const complexDiv = document.createElement('div');
    complexDiv.innerHTML = '<p>Has paragraph</p>';
    
    // 여기서는 내부 함수를 테스트할 수 없으므로, 
    // 실제 replaceTitles 동작으로 간접 테스트
    document.body.appendChild(simpleDiv);
    document.body.appendChild(complexDiv);

    const simpleItems: ExtractedTitle[] = [{
      element: simpleDiv,
      text: 'Simple text only',
      selector: 'div',
      index: 0,
      originalText: 'Simple text only',
      isReplaced: false
    }];

    const complexItems: ExtractedTitle[] = [{
      element: complexDiv,
      text: 'Has paragraph',
      selector: 'div',
      index: 0,
      originalText: 'Has paragraph',
      isReplaced: false
    }];

    // 둘 다 번역되어야 함 (다른 방식으로)
    expect(replaceTitles(simpleItems, '간단한 텍스트만')).toBe(1);
    expect(replaceTitles(complexItems, '단락이 있음')).toBe(1);
    
    expect(simpleDiv.textContent).toBe('간단한 텍스트만');
    expect(complexDiv.querySelector('p')).toBeTruthy(); // 구조 보존 확인
  });

  test('should handle empty or whitespace-only elements', () => {
    const emptyElement = document.createElement('div');
    emptyElement.innerHTML = '<p>   </p><div>\n\t</div>';
    document.body.appendChild(emptyElement);

    const items: ExtractedTitle[] = [{
      element: emptyElement,
      text: '',
      selector: 'div',
      index: 0,
      originalText: '',
      isReplaced: false
    }];

    // 빈 요소는 번역하지 않아야 함
    const replaced = replaceTitles(items, '번역된 텍스트');
    expect(replaced).toBe(0); // 텍스트가 없으므로 교체되지 않음
  });

  test('should preserve href when replacing text in link elements', () => {
    // given
    const linkElement = document.createElement('a');
    linkElement.href = 'https://github.com/owner/repo/issues/123';
    linkElement.textContent = 'Original issue title';
    linkElement.className = 'Link--primary';
    document.body.appendChild(linkElement);

    const items: ExtractedTitle[] = [{
      element: linkElement,
      text: 'Original issue title',
      selector: 'a.Link--primary',
      index: 0,
      originalText: 'Original issue title',
      isReplaced: false
    }];

    // when
    const replaced = replaceTitles(items, '번역된 이슈 제목');

    // then
    expect(replaced).toBe(1);
    expect(linkElement.textContent).toBe('번역된 이슈 제목');
    expect(linkElement.href).toBe('https://github.com/owner/repo/issues/123'); // href가 보존되어야 함
    expect(linkElement.getAttribute('data-original-title')).toBe('Original issue title');
    expect(linkElement.getAttribute('data-github-translator')).toBe('replaced');
  });

  test('should preserve href when replacing text in complex link structures', () => {
    // given
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="js-navigation-item">
        <a href="https://github.com/owner/repo/issues/456" class="Link--primary v-align-middle">
          <span class="markdown-title">
            Complex issue title with <strong>bold</strong> text
          </span>
        </a>
      </div>
    `;
    document.body.appendChild(container);

    const linkElement = container.querySelector('a') as HTMLAnchorElement;
    const items: ExtractedTitle[] = [{
      element: linkElement,
      text: 'Complex issue title with bold text',
      selector: 'a.Link--primary',
      index: 0,
      originalText: 'Complex issue title with bold text',
      isReplaced: false
    }];

    // when
    const replaced = replaceTitles(items, '굵은 텍스트가 있는 복잡한 이슈 제목');

    // then
    expect(replaced).toBe(1);
    expect(linkElement.textContent?.trim()).toBe('굵은 텍스트가 있는 복잡한 이슈 제목');
    expect(linkElement.href).toBe('https://github.com/owner/repo/issues/456'); // href가 보존되어야 함
    expect(linkElement.getAttribute('data-original-title')).toBe('Complex issue title with bold text');
  });

  test('should remove duplicate links when extracting titles', () => {
    // given - GitHub의 실제 구조 시뮬레이션 (H3 + A 태그)
    mockLocation('/owner/repo/issues');
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="js-navigation-item">
        <h3 class="Title-module__heading--upUxW IssuePullRequestTitle-module__ListItemTitle_0--UQ3gh">
          Duplicate issue title
        </h3>
        <a href="https://github.com/owner/repo/issues/123" 
           class="IssuePullRequestTitle-module__ListItemTitle_1--_xOfg">
          Duplicate issue title
        </a>
      </div>
      <div class="js-navigation-item">
        <h3 class="Title-module__heading--upUxW IssuePullRequestTitle-module__ListItemTitle_0--UQ3gh">
          Another issue title
        </h3>
        <a href="https://github.com/owner/repo/issues/124" 
           class="IssuePullRequestTitle-module__ListItemTitle_1--_xOfg">
          Another issue title
        </a>
      </div>
    `;
    document.body.appendChild(container);

    // when
    const titles = getIssueTitles();

    // then
    expect(titles.length).toBe(2); // H3 태그는 제외되고 A 태그만 2개
    expect(titles.every(title => title.element.tagName === 'A')).toBe(true); // 모두 링크여야 함
    
    const hrefs = titles.map(title => (title.element as HTMLAnchorElement).href);
    expect(hrefs).toEqual([
      'https://github.com/owner/repo/issues/123',
      'https://github.com/owner/repo/issues/124'
    ]);
    
    // 중복 링크가 없어야 함
    const uniqueHrefs = new Set(hrefs);
    expect(uniqueHrefs.size).toBe(hrefs.length);
  });

  test('should extract GitHub markdown content with new CSS selectors', () => {
    // given - GitHub Issues 페이지 시뮬레이션
    mockLocation('/owner/repo/issues/123');
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="Box-sc-g0xbh4-0 markdown-body NewMarkdownViewer-module__safe-html-box--cRsz0">
        <h3>Problem Description</h3>
        <p>I got a super long Error trace in the error: RuntimeError: batch size must be positive. 
        I guess it's because the input_ids are zeros.</p>
        
        <h3>Environment</h3>
        <ul>
          <li>4*80G A100</li>
          <li>pytorch version: 2.4</li>
          <li>Flash-Attention version: 2.8.1</li>
        </ul>
        
        <h3>What I Tried</h3>
        <p>I patched _forward_micro_batch to short-circuit when the de-duplicated batch is empty:</p>
        <pre><code>if input_ids_rmpad.size(1) == 0:
    full_entropy = torch.zeros((batch_size, seqlen), device=input_ids.device)
    return entropy, log_probs</code></pre>
      </div>
    `;
    document.body.appendChild(container);

    // when
    const descriptions = getPRDescription();

    // then
    expect(descriptions.length).toBe(1);
    expect(descriptions[0].element.tagName).toBe('DIV');
    expect(descriptions[0].text).toContain('Problem Description');
    expect(descriptions[0].text).toContain('RuntimeError: batch size must be positive');
    expect(descriptions[0].text).toContain('Environment');
    expect(descriptions[0].text).toContain('What I Tried');
    expect(descriptions[0].selector).toBe('[class*="Box-sc-"][class*="markdown-body"]');
  });

  test('should extract multiple markdown sections from GitHub issue', () => {
    // given - 복잡한 GitHub Issues 구조
    mockLocation('/owner/repo/issues/456');
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="MarkdownViewer-module__content--abc123">
        <h2>Bug Report</h2>
        <p>This is a detailed bug report with multiple sections.</p>
      </div>
      <div class="CommentBody-module__wrapper--def456">
        <h3>Steps to Reproduce</h3>
        <ol>
          <li>Run the script</li>
          <li>Check the output</li>
          <li>Notice the error</li>
        </ol>
      </div>
    `;
    document.body.appendChild(container);

    // when
    const descriptions = getPRDescription();

    // then
    expect(descriptions.length).toBe(1); // 첫 번째 매치만 사용
    expect(descriptions[0].text).toContain('Bug Report');
    expect(descriptions[0].text).toContain('detailed bug report');
    expect(descriptions[0].selector).toBe('[class*="MarkdownViewer-module"]');
  });

  test('should exclude date links and metadata from translation', () => {
    // given - GitHub Issues 페이지에 날짜 링크와 메타데이터 포함
    mockLocation('/owner/repo/issues');
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="js-navigation-item">
        <!-- 번역해야 할 이슈 제목 -->
        <a href="/owner/repo/issues/123" class="IssuePullRequestTitle-module__ListItemTitle_1--_xOfg">
          Important bug fix needed
        </a>
        
        <!-- 번역하지 않아야 할 날짜 링크 -->
        <a href="/owner/repo/issues/123" class="IssueBodyHeader-module__dateLink--0HRj6 prc-Link-Link-85e08">
          opened 2 days ago
        </a>
        
        <!-- 번역하지 않아야 할 기타 메타데이터 -->
        <span class="Label--primary">bug</span>
        <span class="State--open">Open</span>
        <span class="Counter--light">5 comments</span>
        <a href="/user/author" class="author-link">@author</a>
      </div>
      
      <div class="js-navigation-item">
        <!-- 또 다른 이슈 제목 -->
        <a href="/owner/repo/issues/124" class="IssuePullRequestTitle-module__ListItemTitle_1--_xOfg">
          Another issue title
        </a>
        
        <!-- 또 다른 날짜 링크 -->
        <span class="timestamp">3 hours ago</span>
      </div>
    `;
    document.body.appendChild(container);

    // when
    const titles = getIssueTitles();

    // then
    expect(titles.length).toBe(2); // 이슈 제목 2개만 추출
    
    // 이슈 제목들만 포함되어야 함
    expect(titles[0].text).toBe('Important bug fix needed');
    expect(titles[1].text).toBe('Another issue title');
    
    // 날짜 링크나 메타데이터는 포함되지 않아야 함
    const allTexts = titles.map(t => t.text);
    expect(allTexts).not.toContain('opened 2 days ago');
    expect(allTexts).not.toContain('bug');
    expect(allTexts).not.toContain('Open');
    expect(allTexts).not.toContain('5 comments');
    expect(allTexts).not.toContain('@author');
    expect(allTexts).not.toContain('3 hours ago');
  });

  test('should specifically filter out dateLink pattern', () => {
    // given - 모든 A 태그를 선택하는 상황에서 날짜 링크 필터링 테스트
    mockLocation('/owner/repo/issues');
    
    // 임시로 더 포괄적인 선택자를 사용하도록 DOM 구조 설정
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="js-navigation-item">
        <a href="/issues/123" class="Link--primary" data-hovercard-type="issue">
          Valid issue title
        </a>
        <a href="/issues/123" class="IssueBodyHeader-module__dateLink--0HRj6">
          opened 2 days ago  
        </a>
        <a href="/user/author" class="author-link-test">
          @username
        </a>
      </div>
    `;
    document.body.appendChild(container);

    // when
    const titles = getIssueTitles();

    // then - 날짜 링크와 작성자 링크는 필터링되어야 함
    expect(titles.length).toBe(1); // 유효한 이슈 제목 1개만
    expect(titles[0].text).toBe('Valid issue title');
    
    // 날짜 링크는 포함되지 않아야 함
    const allTexts = titles.map(t => t.text);
    expect(allTexts).not.toContain('opened 2 days ago');
    expect(allTexts).not.toContain('@username');
  });

  describe('URL-based filtering', () => {
    beforeEach(() => {
      // 각 테스트 전에 DOM 초기화
      document.body.innerHTML = '';
    });

    test('should detect translatable URLs correctly', () => {
      // given - content script의 isTranslatableURL 함수 시뮬레이션
      const isTranslatableURL = (url: string): boolean => {
        const pathname = new URL(url).pathname.toLowerCase();
        return pathname.includes('/issues') || pathname.includes('/pull');
      };

      // when & then - Issues URLs
      expect(isTranslatableURL('https://github.com/owner/repo/issues')).toBe(true);
      expect(isTranslatableURL('https://github.com/owner/repo/issues/123')).toBe(true);
      expect(isTranslatableURL('https://github.com/owner/repo/issues?q=bug')).toBe(true);
      
      // when & then - Pull Request URLs  
      expect(isTranslatableURL('https://github.com/owner/repo/pull/456')).toBe(true);
      expect(isTranslatableURL('https://github.com/owner/repo/pulls')).toBe(true);
      expect(isTranslatableURL('https://github.com/owner/repo/pulls?q=feature')).toBe(true);
      
      // when & then - Non-translatable URLs
      expect(isTranslatableURL('https://github.com/owner/repo')).toBe(false);
      expect(isTranslatableURL('https://github.com/owner/repo/commits')).toBe(false);
      expect(isTranslatableURL('https://github.com/owner/repo/wiki')).toBe(false);
      expect(isTranslatableURL('https://github.com/owner/repo/settings')).toBe(false);
      expect(isTranslatableURL('https://github.com/owner/repo/actions')).toBe(false);
      expect(isTranslatableURL('https://github.com/owner/repo/releases')).toBe(false);
      expect(isTranslatableURL('https://github.com/explore')).toBe(false);
      expect(isTranslatableURL('https://github.com/notifications')).toBe(false);
    });

    test('should only extract titles on translatable pages', () => {
      // given - Issues 페이지 시뮬레이션
      mockLocation('/owner/repo/issues/123');
      const container = document.createElement('div');
      container.innerHTML = `
        <a href="/issues/123" class="IssuePullRequestTitle-module__ListItemTitle_1--_xOfg">
          Bug fix needed
        </a>
      `;
      document.body.appendChild(container);

      // when - Issues 페이지에서 제목 추출
      const issuesTitles = getIssueTitles();

      // then - 제목이 추출되어야 함
      expect(issuesTitles.length).toBe(1);
      expect(issuesTitles[0].text).toBe('Bug fix needed');
    });

    test('should handle edge cases in URL patterns', () => {
      // given - 엣지 케이스 URL 테스트
      const isTranslatableURL = (url: string): boolean => {
        const pathname = new URL(url).pathname.toLowerCase();
        return pathname.includes('/issues') || pathname.includes('/pull');
      };

      // when & then - 대소문자 구분 없이 동작해야 함
      expect(isTranslatableURL('https://github.com/Owner/Repo/Issues/123')).toBe(true);
      expect(isTranslatableURL('https://github.com/Owner/Repo/Pull/456')).toBe(true);
      
      // when & then - 부분 매칭 테스트
      expect(isTranslatableURL('https://github.com/owner/repo-issues/commits')).toBe(false); // '/issues'가 없음 (issues만 있음)
      expect(isTranslatableURL('https://github.com/pull-request/repo/commits')).toBe(true); // '/pull'이 포함됨
      
      // when & then - 완전히 다른 경로는 false
      expect(isTranslatableURL('https://github.com/owner/repo/commits')).toBe(false);
      expect(isTranslatableURL('https://github.com/owner/repo/settings')).toBe(false);
      
      // when & then - 쿼리 파라미터나 프래그먼트가 있는 경우
      expect(isTranslatableURL('https://github.com/owner/repo/issues/123#comment-456')).toBe(true);
      expect(isTranslatableURL('https://github.com/owner/repo/issues/123?tab=commits')).toBe(true);
    });

    test('should filter out date links and date text in comprehensive search', () => {
      // given - comprehensive search가 실행되는 상황 (일반 선택자로 찾지 못할 때)
      mockLocation('/owner/repo/issues/123');
      
      // findAllPossibleTitles 함수 시뮬레이션을 위한 DOM 구조
      const container = document.createElement('div');
      container.innerHTML = `
        <!-- 번역해야 할 실제 이슈 제목 -->
        <div class="IssuePullRequestTitle-module__something">
          Real issue title
        </div>
        
        <!-- 번역하지 않아야 할 날짜 링크들 -->
        <a href="#issue-123" class="IssueBodyHeader-module__dateLink--0HRj6">
          on Jun 24, 2025
        </a>
        
        <a href="#comment-456" class="some-timestamp-class">
          on Jun 30, 2025
        </a>
        
        <span class="timestamp">
          3 hours ago
        </span>
        
        <!-- 번역하지 않아야 할 상태 텍스트 -->
        <span>opened this issue</span>
        <span>closed 2 days ago</span>
      `;
      document.body.appendChild(container);

      // when - findAllPossibleTitles 실행
      const foundTitles = findAllPossibleTitles();

      // then - 날짜 관련 요소들은 필터링되어야 함
      const allTexts = foundTitles.map(t => t.text);
      
      // 실제 이슈 제목은 포함되어야 함
      expect(allTexts).toContain('Real issue title');
      
      // 날짜 관련 텍스트들은 포함되지 않아야 함
      expect(allTexts).not.toContain('on Jun 24, 2025');
      expect(allTexts).not.toContain('on Jun 30, 2025');
      expect(allTexts).not.toContain('3 hours ago');
      expect(allTexts).not.toContain('opened this issue');
      expect(allTexts).not.toContain('closed 2 days ago');
      
      // 날짜 링크가 제대로 필터링되었는지 확인
      expect(foundTitles.every(title => {
        const classList = title.element.className || '';
        return !classList.includes('dateLink') && !classList.includes('timestamp');
      })).toBe(true);
    });
  });
});