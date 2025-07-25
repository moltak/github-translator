// Background Service Worker for GitHub Translator Extension
import { handleTranslationMessage } from './translation-handler';

console.log('GitHub Translator Background Worker started');

// Extension 설치 시 실행
chrome.runtime.onInstalled.addListener((details) => {
  console.log('GitHub Translator Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    // 첫 설치시 기본 설정
    chrome.storage.sync.set({
      translatorEnabled: true,
      autoTranslate: false,
    });
  }
});

// Content Script로부터 메시지 수신 (번역 기능 통합)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('🎧 Background received message:', request);
  
  // Handle translation requests
  if (request.type === 'TRANSLATE') {
    console.log('🔄 Processing TRANSLATE message...');
    
    // Handle async translation
    handleTranslationMessage(request, sender, sendResponse)
      .then((handled) => {
        console.log('✅ Translation message handled:', handled);
      })
      .catch((error) => {
        console.error('❌ Error handling translation message:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Indicates async response
  }
  
  // Handle legacy demo messages
  if (request.action === 'demo') {
    console.log('Demo message received from content script');
    sendResponse({ success: true, message: 'Hello from background!' });
    return true;
  }
  
  // 비동기 응답을 위해 true 반환
  return true;
});

// Extension icon 클릭 시 (향후 사용)
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked on tab:', tab.url);
});