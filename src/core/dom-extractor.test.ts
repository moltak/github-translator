// DOM Extractor unit tests

import { detectPageType, getTitleSelectors, getIssueTitles, replaceTitles, restoreTitles, extractAndReplaceTitles } from './dom-extractor';

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
});