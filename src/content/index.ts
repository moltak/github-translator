// Content Script for GitHub Translator Extension

import { getIssueTitles, detectPageType, waitForDOM } from '../core/dom-extractor';

console.log('🚀 Hello GitHub Translator - Content Script Loaded!');

// GitHub 페이지에서 실행되는지 확인
if (window.location.hostname === 'github.com') {
  console.log('✅ Running on GitHub.com');
  console.log('📍 Current URL:', window.location.href);
  
  // Sprint 2.1: 제목 추출 및 출력 함수
  const extractAndLogTitles = async () => {
    try {
      // DOM이 완전히 로드될 때까지 대기
      await waitForDOM();
      
      // 페이지 타입 감지
      const pageInfo = detectPageType();
      console.log(`📄 Page type detected: ${pageInfo.type}`);
      
      // 제목들 추출
      const titles = getIssueTitles();
      
      if (titles.length > 0) {
        console.log('🎯 Sprint 2.1 - Title Extraction Successful!');
        console.log(`📋 Found ${titles.length} GitHub issue/PR titles:`);
        
        // 제목들을 콘솔에 깔끔하게 출력
        titles.forEach((title, index) => {
          console.log(`📌 ${index + 1}. ${title.text}`);
        });
        
        // 상세 정보도 출력
        console.log('🔍 Detailed extraction info:', titles);
      } else {
        console.log('📭 No titles found on this page');
      }
      
    } catch (error) {
      console.error('❌ Error extracting titles:', error);
    }
  };
  
  // Demo: Background Script와 통신 테스트
  const testBackgroundCommunication = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ 
        action: 'demo', 
        pageType: detectPageType().type 
      });
      console.log('✅ Background communication successful:', response);
    } catch (error) {
      console.error('❌ Background communication failed:', error);
    }
  };
  
  // 페이지 로드 후 실행
  const initializeExtension = async () => {
    await testBackgroundCommunication();
    
    // Sprint 2.1: 제목 추출 실행
    setTimeout(async () => {
      await extractAndLogTitles();
    }, 1000); // GitHub의 동적 로딩을 위해 1초 대기
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExtension);
  } else {
    initializeExtension();
  }
  
  // GitHub SPA 네비게이션 감지 (pjax)
  let currentUrl = window.location.href;
  const observer = new MutationObserver(() => {
    if (currentUrl !== window.location.href) {
      currentUrl = window.location.href;
      console.log('🔄 Page navigation detected:', currentUrl);
      
      // 새 페이지에서 다시 실행
      setTimeout(async () => {
        console.log('🔄 Re-running extraction after navigation...');
        await extractAndLogTitles();
        testBackgroundCommunication();
      }, 1500); // 네비게이션 후 좀 더 긴 대기
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