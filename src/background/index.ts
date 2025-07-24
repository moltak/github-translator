// Background Service Worker for GitHub Translator Extension

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

// Content Script로부터 메시지 수신
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  console.log('Background received message:', request);
  
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