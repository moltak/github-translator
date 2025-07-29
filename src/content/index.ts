// Content Script for GitHub Translator Extension

import { getIssueTitles, getPRDescription, safeReplaceText, restoreOriginalText, detectPageType } from '../core/dom-extractor';
import { CommentInterceptor } from '../core/comment-interceptor';

console.log('🚀 Hello GitHub Translator - Content Script Loaded!');

// Extension 상태 추적
let isTranslatorEnabled = true;
let currentTitles: any[] = [];

// 🆕 CommentInterceptor 인스턴스
let commentInterceptor: CommentInterceptor | null = null;

/**
 * URL이 번역 대상인지 확인하는 함수
 */
const isTranslatableURL = (url: string): boolean => {
  const pathname = new URL(url).pathname.toLowerCase();
  
  // issues나 pull이 포함된 URL만 번역 대상
  const isIssuesOrPulls = pathname.includes('/issues') || pathname.includes('/pull');
  
  console.log('🔍 URL Check:', {
    url,
    pathname,
    isIssuesOrPulls,
    includes_issues: pathname.includes('/issues'),
    includes_pull: pathname.includes('/pull')
  });
  
  return isIssuesOrPulls;
};

// GitHub 페이지에서 실행되는지 확인
if (window.location.hostname === 'github.com') {
  console.log('✅ Running on GitHub.com');
  console.log('📍 Current URL:', window.location.href);
  
  // Sprint 2.1: 제목 추출 및 출력 함수
  const extractAndLogTitles = async () => {
    try {
      // 🎯 URL 기반 필터링 - issues나 pull 페이지가 아니면 번역 건너뛰기
      if (!isTranslatableURL(window.location.href)) {
        console.log('⏭️ Skipping translation - URL does not contain issues or pull');
        console.log('📋 Translation is only available on:');
        console.log('   - /issues (issues list)');
        console.log('   - /issues/123 (specific issue)'); 
        console.log('   - /pull/123 (specific pull request)');
        console.log('   - /pulls (pull requests list)');
        
        // CommentInterceptor도 비활성화
        if (commentInterceptor) {
          commentInterceptor.stop();
        }
        return;
      }
      
      console.log('✅ URL contains issues or pull - proceeding with translation');
      
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
        
        // CommentInterceptor도 비활성화
        if (commentInterceptor) {
          commentInterceptor.setEnabled(false);
        }
        return;
      }
      
      // Check if API key is available for real translation
      const storage = await chrome.storage.sync.get(['openaiApiKey']);
      const hasApiKey = !!storage.openaiApiKey;

      if (!hasApiKey) {
        console.log('🔑 No API key found - extracting titles without translation');
        console.log('💡 Set your OpenAI API key in the extension popup to enable real translation');
        currentTitles = getIssueTitles();
        
        // CommentInterceptor도 비활성화 (API 키 없음)
        if (commentInterceptor) {
          commentInterceptor.setEnabled(false);
        }
        return;
      }

      console.log('🎯 Sprint 3.5 & 3.6 - Real Translation Starting...');
      console.log('🎯 Sprint 3.5 - Real Translation Starting...');
      
      // 제목 추출
      currentTitles = getIssueTitles();
      
      console.log(`📄 Found ${currentTitles.length} titles on ${pageInfo.type} page`);
      
      const linkCount = currentTitles.filter(title => title.isLink).length;
      const nonLinkCount = currentTitles.length - linkCount;
      console.log(`🔗 Link analysis: ${linkCount} links, ${nonLinkCount} non-links`);
      
      if (linkCount > 0) {
        console.log('🔗 Unique links found:', linkCount);
        console.log('🔗 Links found:');
        currentTitles
          .filter(title => title.isLink)
          .forEach((title, index) => {
            const displayText = title.text.length > 30 ? title.text.substring(0, 30) + '...' : title.text;
            console.log(`${index + 1}. "${displayText}" → ${title.element.href}`);
          });
      }
      
      if (currentTitles.length === 0) {
        console.log('📭 No titles found to translate');
        return;
      }

      // 실제 번역 요청
      console.log('🌐 Starting real translation for', currentTitles.length, 'titles...');
      
      const translationPromises = currentTitles.map(async (title) => {
        try {
          console.log('📡 Sending translation request for:', `"${title.text.substring(0, 30)}${title.text.length > 30 ? ' ...' : ''}"`);
          
          const response = await chrome.runtime.sendMessage({
            type: 'TRANSLATE',
            text: title.text,
            direction: 'EN_TO_KO'
          });
          
          console.log('📨 Received response:', response);
          
          if (response.success) {
            // 번역된 텍스트로 DOM 교체 (HTML 구조 보존)
            safeReplaceText(title.element, response.translatedText);
            return { success: true, original: title.text, translated: response.translatedText };
          } else {
            console.error('❌ Translation failed for:', title.text, response.error);
            return { success: false, original: title.text, error: response.error };
          }
        } catch (error) {
          console.error('❌ Translation request failed for:', title.text, error);
          return { success: false, original: title.text, error: error instanceof Error ? error.message : String(error) };
        }
      });

      const results = await Promise.all(translationPromises);
      const successCount = results.filter(r => r.success).length;
      
      console.log(`🎉 Real translation completed: ${successCount}/${currentTitles.length} titles translated`);
      console.log('🎉 Sprint 3.5 Complete: Extracted and translated', `${successCount}/${currentTitles.length}`, 'titles!');

      // Sprint 3.6: PR Description Translation
      console.log('📝 Also translating PR/Issue description...');
      const descriptions = getPRDescription();
      
      if (descriptions.length > 0) {
        console.log(`📋 Found ${descriptions.length} description(s) to translate`);
        
        const descriptionPromises = descriptions.map(async (desc) => {
          try {
            const response = await chrome.runtime.sendMessage({
              type: 'TRANSLATE',
              text: desc.text,
              direction: 'EN_TO_KO'
            });
            
            if (response.success) {
              safeReplaceText(desc.element, response.translatedText);
              return true;
            }
            return false;
          } catch (error) {
            console.error('❌ Description translation failed:', error);
            return false;
          }
        });
        
        const descResults = await Promise.all(descriptionPromises);
        const descSuccessCount = descResults.filter(r => r).length;
        
        console.log(`📋 Translated ${descSuccessCount} description(s)`);
        console.log('🎉 Sprint 3.6 Complete: Translated', `${descSuccessCount}/${descriptions.length}`, 'PR description(s)!');
      } else {
        console.log('📋 No descriptions found to translate');
      }

      // 🆕 CommentInterceptor 시작 (API 키가 있을 때만)
      if (!commentInterceptor) {
        commentInterceptor = new CommentInterceptor({
          enabled: true,
          debug: true
        });
      }
      
      // CommentInterceptor 활성화
      commentInterceptor.setEnabled(true);
      commentInterceptor.start();
      
      console.log('📝 CommentInterceptor status:', commentInterceptor.getStatus());

    } catch (error) {
      console.error('❌ Error in extractAndLogTitles:', error);
    }
  };
  
  // DOM 로딩 대기 함수
  const waitForDOM = (): Promise<void> => {
    return new Promise((resolve) => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => resolve());
      } else {
        resolve();
      }
    });
  };

  // 원본 제목 복원 함수
  const restoreOriginalTitles = () => {
    if (currentTitles.length > 0) {
      console.log('🔄 Restoring original titles...');
      currentTitles.forEach(title => {
        restoreOriginalText(title.element);
      });
      currentTitles = [];
    }
  };

  // 초기 실행
  extractAndLogTitles();

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
      
      // CommentInterceptor 중지 후 재시작
      if (commentInterceptor) {
        commentInterceptor.stop();
      }
      
      // 디바운스된 재실행
      if (observerTimeout) {
        clearTimeout(observerTimeout);
      }
      
      observerTimeout = setTimeout(async () => {
        console.log('🔄 Re-running extraction after navigation...');
        await extractAndLogTitles();
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
    
    // 관련 변화가 있으면 디바운스된 재실행
    if (hasRelevantChanges) {
      if (observerTimeout) {
        clearTimeout(observerTimeout);
      }
      
      observerTimeout = setTimeout(async () => {
        console.log('🔄 Re-running extraction due to DOM changes...');
        await extractAndLogTitles();
      }, 1000); // DOM 변화 후 1초 대기
    }
  });
  
  // 관찰 시작
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false
  });

  // 페이지 종료 시 정리
  window.addEventListener('beforeunload', () => {
    restoreOriginalTitles();
    if (commentInterceptor) {
      commentInterceptor.stop();
    }
  });

  // Extension 상태 변경 감지
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.translatorEnabled) {
      const newEnabled = changes.translatorEnabled.newValue;
      console.log('🔧 Extension enabled state changed:', newEnabled);
      
      if (!newEnabled) {
        // 비활성화되면 원본 복원
        restoreOriginalTitles();
        if (commentInterceptor) {
          commentInterceptor.setEnabled(false);
        }
      } else {
        // 활성화되면 다시 번역 (URL 체크 포함)
        if (isTranslatableURL(window.location.href)) {
          extractAndLogTitles();
        }
      }
      
      isTranslatorEnabled = newEnabled;
    }
  });

  // 키보드 단축키 처리
  document.addEventListener('keydown', (event) => {
    // Ctrl+Shift+P: 번역 테스트
    if (event.ctrlKey && event.shiftKey && event.key === 'P') {
      event.preventDefault();
      
      // URL 필터링 체크
      if (!isTranslatableURL(window.location.href)) {
        console.log('⏭️ Keyboard shortcut: Skipping - URL not translatable');
        return;
      }
      
      console.log('🔥 Manual translation triggered via Ctrl+Shift+P');
      extractAndLogTitles();
    }
    
    // Ctrl+Shift+T: 토글 (원본 복원 ↔ 번역)
    if (event.ctrlKey && event.shiftKey && event.key === 'T') {
      event.preventDefault();
      
      // URL 필터링 체크
      if (!isTranslatableURL(window.location.href)) {
        console.log('⏭️ Keyboard shortcut: Skipping - URL not translatable');
        return;
      }
      
      if (currentTitles.length > 0) {
        console.log('🔄 Manual restore triggered via Ctrl+Shift+T');
        restoreOriginalTitles();
      } else {
        console.log('🔥 Manual translation triggered via Ctrl+Shift+T');
        extractAndLogTitles();
      }
    }
    
    // 🆕 Ctrl+Shift+C: CommentInterceptor 토글
    if (event.ctrlKey && event.shiftKey && event.key === 'C') {
      event.preventDefault();
      
      // URL 필터링 체크
      if (!isTranslatableURL(window.location.href)) {
        console.log('⏭️ Keyboard shortcut: Skipping - URL not translatable');
        return;
      }
      
      if (commentInterceptor) {
        if (commentInterceptor.isEnabled()) {
          commentInterceptor.setEnabled(false);
          console.log('📝 CommentInterceptor disabled via Ctrl+Shift+C');
        } else {
          commentInterceptor.setEnabled(true);
          console.log('📝 CommentInterceptor enabled via Ctrl+Shift+C');
        }
        console.log('📝 CommentInterceptor status:', commentInterceptor.getStatus());
      } else {
        console.log('❌ CommentInterceptor not initialized');
      }
    }
  });

  console.log('📚 GitHub Translator loaded! Available shortcuts:');
  console.log('   🔥 Ctrl+Shift+P: Force translate titles');
  console.log('   🔄 Ctrl+Shift+T: Toggle translation (restore ↔ translate)');
  console.log('   📝 Ctrl+Shift+C: Toggle CommentInterceptor (한국어 댓글 → 영어 번역)');
} else {
  console.log('❌ Not running on GitHub.com');
}