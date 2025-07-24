// Popup script for GitHub Translator Extension

console.log('GitHub Translator Popup loaded');

// DOM 요소들
const enableToggle = document.getElementById('enableToggle') as HTMLInputElement;
const autoToggle = document.getElementById('autoToggle') as HTMLInputElement;
const statusDiv = document.getElementById('status') as HTMLDivElement;
const apiKeyInput = document.getElementById('apiKeyInput') as HTMLInputElement;
const saveApiKeyBtn = document.getElementById('saveApiKey') as HTMLButtonElement;
const apiKeyStatus = document.getElementById('apiKeyStatus') as HTMLDivElement;

// 설정 로드
const loadSettings = async () => {
  try {
    const settings = await chrome.storage.sync.get(['translatorEnabled', 'autoTranslate', 'openaiApiKey']);
    
    enableToggle.checked = settings.translatorEnabled !== false; // 기본값 true
    autoToggle.checked = settings.autoTranslate === true; // 기본값 false
    
    // API 키 상태 표시
    if (settings.openaiApiKey) {
      apiKeyInput.value = '••••••••••••••••••••••••••••••••••••••••••••••••••••';
      apiKeyStatus.textContent = '✅ API key configured';
      apiKeyStatus.className = 'api-key-status success';
    } else {
      apiKeyStatus.textContent = '⚠️ Please set your OpenAI API key';
      apiKeyStatus.className = 'api-key-status error';
    }
    
    updateStatus();
  } catch (error) {
    console.error('Failed to load settings:', error);
    statusDiv.textContent = '❌ Failed to load settings';
    statusDiv.className = 'status inactive';
  }
};

// 상태 업데이트
const updateStatus = async () => {
  try {
    const result = await chrome.storage.sync.get(['openaiApiKey']);
    const hasApiKey = !!result.openaiApiKey;

    if (!hasApiKey) {
      statusDiv.textContent = '🔑 API key required';
      statusDiv.className = 'status inactive';
      return;
    }

    if (enableToggle.checked) {
      statusDiv.textContent = autoToggle.checked 
        ? '🚀 Auto translation enabled'
        : '✅ Ready to translate on GitHub';
      statusDiv.className = 'status active';
    } else {
      statusDiv.textContent = '⏸️ Translation disabled';
      statusDiv.className = 'status inactive';
    }
  } catch (error) {
    console.error('Failed to check API key:', error);
    statusDiv.textContent = '❌ Error checking settings';
    statusDiv.className = 'status inactive';
  }
};

// API 키 저장
const saveApiKey = async () => {
  const apiKey = apiKeyInput.value.trim();
  
  if (!apiKey || apiKey.includes('•')) {
    apiKeyStatus.textContent = '❌ Please enter a valid API key';
    apiKeyStatus.className = 'api-key-status error';
    return;
  }

  if (!apiKey.startsWith('sk-')) {
    apiKeyStatus.textContent = '❌ API key must start with "sk-"';
    apiKeyStatus.className = 'api-key-status error';
    return;
  }

  try {
    saveApiKeyBtn.disabled = true;
    saveApiKeyBtn.textContent = 'Saving...';
    apiKeyStatus.textContent = '💾 Saving API key...';
    apiKeyStatus.className = 'api-key-status info';

    await chrome.storage.sync.set({ openaiApiKey: apiKey });
    
    // 마스킹 처리
    apiKeyInput.value = '••••••••••••••••••••••••••••••••••••••••••••••••••••';
    apiKeyStatus.textContent = '✅ API key saved successfully';
    apiKeyStatus.className = 'api-key-status success';
    
    updateStatus();
    
    console.log('API key saved successfully');
  } catch (error) {
    console.error('Failed to save API key:', error);
    apiKeyStatus.textContent = '❌ Failed to save API key';
    apiKeyStatus.className = 'api-key-status error';
  } finally {
    saveApiKeyBtn.disabled = false;
    saveApiKeyBtn.textContent = 'Save';
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
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
});

// API 키 관련 이벤트
saveApiKeyBtn.addEventListener('click', saveApiKey);

apiKeyInput.addEventListener('input', () => {
  const value = apiKeyInput.value;
  if (!value.includes('•')) {
    apiKeyStatus.textContent = '';
    apiKeyStatus.className = 'api-key-status';
  }
});

// Enter 키로 API 키 저장
apiKeyInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    saveApiKey();
  }
});

// 설정 토글 이벤트
enableToggle.addEventListener('change', () => {
  updateStatus();
  saveSettings();
});

autoToggle.addEventListener('change', () => {
  saveSettings();
});