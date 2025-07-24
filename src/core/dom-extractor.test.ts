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
      const pageType = 'issues_list';
      
      // when
      const selectors = getTitleSelectors(pageType);
      
      // then
      expect(selectors).toContain('[class*="IssuePullRequestTitle-module__ListItemTitle"]');
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