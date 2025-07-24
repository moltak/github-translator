// Content Script for GitHub Translator Extension

console.log('🚀 Hello GitHub Translator - Content Script Loaded!');

// GitHub 페이지에서 실행되는지 확인
if (window.location.hostname === 'github.com') {
  console.log('✅ Running on GitHub.com');
  console.log('📍 Current URL:', window.location.href);
  
  // 페이지 타입 감지
  const detectPageType = (): string => {
    const { pathname } = window.location;
    
    if (pathname.includes('/issues/')) {
      return 'issue';
    }
    if (pathname.includes('/pull/')) {
      return 'pull_request';
    }
    if (pathname.includes('/issues')) {
      return 'issues_list';
    }
    if (pathname.includes('/pulls')) {
      return 'pulls_list';
    }
    
    return 'other';
  };
  
  const pageType = detectPageType();
  console.log(`📄 Page type detected: ${pageType}`);
  
  // Demo: Background Script와 통신 테스트
  const testBackgroundCommunication = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'demo', pageType });
      console.log('✅ Background communication successful:', response);
    } catch (error) {
      console.error('❌ Background communication failed:', error);
    }
  };
  
  // 페이지 로드 후 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testBackgroundCommunication);
  } else {
    testBackgroundCommunication();
  }
  
  // GitHub SPA 네비게이션 감지 (pjax)
  let currentUrl = window.location.href;
  const observer = new MutationObserver(() => {
    if (currentUrl !== window.location.href) {
      currentUrl = window.location.href;
      console.log('🔄 Page navigation detected:', currentUrl);
      
      // 새 페이지에서 다시 실행
      setTimeout(() => {
        const newPageType = detectPageType();
        console.log(`📄 New page type: ${newPageType}`);
        testBackgroundCommunication();
      }, 500);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
  
  // 정리 함수
  window.addEventListener('beforeunload', () => {
    observer.disconnect();
  });
} else {
  console.log('❌ Not running on GitHub.com');
}