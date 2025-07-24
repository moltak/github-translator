// Content Script for GitHub Translator Extension

import { getIssueTitles, detectPageType, waitForDOM, extractAndReplaceTitles, extractAndTranslateTitles, restoreTitles } from '../core/dom-extractor';

console.log('🚀 Hello GitHub Translator - Content Script Loaded!');

// Extension 상태 추적
let isTranslatorEnabled = true;
let currentTitles: any[] = [];

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
      
      // Extension 설정 확인
      const settings = await chrome.storage.sync.get(['translatorEnabled']);
      isTranslatorEnabled = settings.translatorEnabled !== false;
      
      if (!isTranslatorEnabled) {
        console.log('⏸️ Translator disabled - only extracting titles');
        // 비활성화 상태에서는 제목만 추출
        currentTitles = getIssueTitles();
        return;
      }
      
      // Check if API key is available for real translation
      const storage = await chrome.storage.sync.get(['openaiApiKey']);
      const hasApiKey = !!storage.openaiApiKey;
      
      console.log('🔍 API Key Debug:', { 
        storage, 
        hasApiKey, 
        apiKeyExists: !!storage.openaiApiKey,
        apiKeyLength: storage.openaiApiKey ? storage.openaiApiKey.length : 0,
        apiKeyPrefix: storage.openaiApiKey ? storage.openaiApiKey.substring(0, 8) + '...' : 'none'
      });
      
      if (hasApiKey) {
        console.log('🎯 Sprint 3.5 - Real Translation Starting...');
        try {
          currentTitles = await extractAndTranslateTitles();
        } catch (error) {
          console.error('❌ Real translation failed, falling back to demo mode:', error);
          currentTitles = extractAndReplaceTitles('HELLO GITHUB TRANSLATOR');
        }
      } else {
        console.log('🎯 Sprint 2.3 - Demo Mode (No API Key) - Using Placeholder...');
        currentTitles = extractAndReplaceTitles('HELLO GITHUB TRANSLATOR');
      }
      
      if (currentTitles.length > 0) {
        console.log('🎉 Title Processing Successful!');
        console.log(`📋 Found and processed ${currentTitles.length} GitHub issue/PR titles`);
        
        // 원본 제목들을 콘솔에 출력 (Sprint 2.4)
        console.log('📜 Original titles before replacement:');
        currentTitles.forEach((title, index) => {
          console.log(`📌 ${index + 1}. ${title.originalText || title.text}`);
        });
      } else {
        console.log('📭 No titles found on this page');
      }
      
    } catch (error) {
      console.error('❌ Error extracting/replacing titles:', error);
    }
  };
  
  // 제목 복원 함수
  const restoreOriginalTitles = () => {
    if (currentTitles.length > 0) {
      console.log('🔄 Restoring original titles...');
      const restoredCount = restoreTitles();
      console.log(`✅ Restored ${restoredCount} titles to original text`);
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
    
    // Sprint 2.1, 2.3: 제목 추출 및 교체 실행
    setTimeout(async () => {
      await extractAndLogTitles();
    }, 2000); // GitHub의 동적 로딩을 위해 2초 대기 (CSS Modules 로딩 시간 고려)
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExtension);
  } else {
    initializeExtension();
  }
  
  // Sprint 2.2: 향상된 MutationObserver for Live Detection
  let currentUrl = window.location.href;
  let observerTimeout: NodeJS.Timeout | null = null;
  
  const observer = new MutationObserver((mutations) => {
    // URL 변경 감지 (GitHub SPA 네비게이션)
    if (currentUrl !== window.location.href) {
      currentUrl = window.location.href;
      console.log('🔄 Page navigation detected:', currentUrl);
      
      // 이전 제목들 복원
      restoreOriginalTitles();
      
      // 디바운스된 재실행
      if (observerTimeout) {
        clearTimeout(observerTimeout);
      }
      
      observerTimeout = setTimeout(async () => {
        console.log('🔄 Re-running extraction after navigation...');
        await extractAndLogTitles();
        testBackgroundCommunication();
      }, 2000); // 네비게이션 후 2초 대기
      
      return;
    }
    
    // DOM 변화 감지 (새로운 이슈/PR 로딩)
    let hasRelevantChanges = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        // 새로운 이슈/PR 제목 요소가 추가되었는지 확인
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            
            // GitHub 이슈/PR 관련 요소 감지
            if (
              element.querySelector?.('[class*="IssuePullRequestTitle"]') ||
              element.querySelector?.('[class*="ListItemTitle"]') ||
              element.querySelector?.('.js-issue-title') ||
              element.querySelector?.('a[href*="/issues/"]') ||
              element.querySelector?.('a[href*="/pull/"]') ||
              element.classList?.contains('js-navigation-item') ||
              element.matches?.('[class*="IssuePullRequestTitle"]') ||
              element.matches?.('[class*="ListItemTitle"]')
            ) {
              hasRelevantChanges = true;
              console.log('🔍 New GitHub issue/PR elements detected');
            }
          }
        });
      }
    });
    
    // 관련 변화가 있을 때만 재실행
    if (hasRelevantChanges && isTranslatorEnabled) {
      // 디바운스된 재실행
      if (observerTimeout) {
        clearTimeout(observerTimeout);
      }
      
      observerTimeout = setTimeout(async () => {
        console.log('🔄 Re-running extraction due to DOM changes...');
        await extractAndLogTitles();
      }, 1000); // DOM 변화 후 1초 대기
    }
  });
  
  // 향상된 관찰 설정
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false, // 속성 변화는 관찰하지 않음 (성능 최적화)
    characterData: false, // 텍스트 변화는 관찰하지 않음
  });
  
  // 설정 변경 감지
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.translatorEnabled) {
      const newValue = changes.translatorEnabled.newValue !== false;
      
      if (newValue !== isTranslatorEnabled) {
        isTranslatorEnabled = newValue;
        console.log(`🔧 Translator ${isTranslatorEnabled ? 'enabled' : 'disabled'}`);
        
        if (isTranslatorEnabled) {
          // 활성화 시 제목 교체 실행
          setTimeout(async () => {
            await extractAndLogTitles();
          }, 500);
        } else {
          // 비활성화 시 원본 제목 복원
          restoreOriginalTitles();
        }
      }
    }
  });
  
  // 정리 함수
  window.addEventListener('beforeunload', () => {
    if (observerTimeout) {
      clearTimeout(observerTimeout);
    }
    observer.disconnect();
    restoreOriginalTitles(); // 페이지 종료 시 원본 복원
  });
  
  // 키보드 단축키로 토글 (개발용)
  document.addEventListener('keydown', (event) => {
    // Ctrl + Shift + T로 제목 토글
    if (event.ctrlKey && event.shiftKey && event.key === 'T') {
      event.preventDefault();
      
      if (currentTitles.length > 0) {
        const hasReplacedTitles = document.querySelector('[data-github-translator="replaced"]');
        
        if (hasReplacedTitles) {
          restoreOriginalTitles();
          console.log('🔄 Restored titles via keyboard shortcut');
        } else {
          // Check if API key is available for real translation
          chrome.storage.sync.get(['openaiApiKey']).then(async (storage) => {
            const hasApiKey = !!storage.openaiApiKey;
            
            if (hasApiKey) {
              try {
                await extractAndTranslateTitles();
                console.log('🔄 Translated titles via keyboard shortcut');
              } catch (error) {
                console.error('❌ Translation failed via shortcut, using demo mode:', error);
                extractAndReplaceTitles('HELLO GITHUB TRANSLATOR');
              }
            } else {
              extractAndReplaceTitles('HELLO GITHUB TRANSLATOR');
              console.log('🔄 Replaced titles via keyboard shortcut (Demo Mode)');
            }
          });
        }
      }
    }
  });
  
} else {
  console.log('❌ Not running on GitHub.com');
}