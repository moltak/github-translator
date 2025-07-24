// Popup script for GitHub Translator Extension

console.log('GitHub Translator Popup loaded');

// DOM 요소들
const enableToggle = document.getElementById('enableToggle') as HTMLInputElement;
const autoToggle = document.getElementById('autoToggle') as HTMLInputElement;
const statusDiv = document.getElementById('status') as HTMLDivElement;

// 설정 로드
const loadSettings = async () => {
  try {
    const settings = await chrome.storage.sync.get(['translatorEnabled', 'autoTranslate']);
    
    enableToggle.checked = settings.translatorEnabled !== false; // 기본값 true
    autoToggle.checked = settings.autoTranslate === true; // 기본값 false
    
    updateStatus();
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
};

// 상태 업데이트
const updateStatus = () => {
  if (enableToggle.checked) {
    statusDiv.textContent = '✅ Ready to translate on GitHub';
    statusDiv.className = 'status active';
  } else {
    statusDiv.textContent = '⏸️ Translation disabled';
    statusDiv.className = 'status inactive';
  }
};

// 설정 저장
const saveSettings = async () => {
  try {
    await chrome.storage.sync.set({
      translatorEnabled: enableToggle.checked,
      autoTranslate: autoToggle.checked,
    });
    
    console.log('Settings saved:', {
      translatorEnabled: enableToggle.checked,
      autoTranslate: autoToggle.checked,
    });
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
};

// 이벤트 리스너
enableToggle.addEventListener('change', () => {
  updateStatus();
  saveSettings();
});

autoToggle.addEventListener('change', () => {
  saveSettings();
});

// 초기화
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
});