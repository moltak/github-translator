// DOM Extractor unit tests

import { detectPageType, getTitleSelectors, getIssueTitles } from './dom-extractor';

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
      expect(selectors).toContain('.js-navigation-item [data-hovercard-type="issue"] .Link--primary');
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
});