import { translate } from './agent';

let isEnabled = true;

function addTranslateButton(textarea: HTMLTextAreaElement) {
  // Avoid adding duplicate buttons
  if (textarea.parentElement?.querySelector('.translator-button')) {
    return;
  }

  const button = document.createElement('button');
  button.innerText = 'Translate';
  button.className = 'translator-button';
  button.style.marginLeft = '8px';
  button.style.padding = '5px 10px';
  button.style.border = '1px solid #ccc';
  button.style.borderRadius = '6px';
  button.style.backgroundColor = '#f6f8fa';
  button.style.cursor = 'pointer';

  button.onclick = async () => {
    const originalText = textarea.value;
    const translatedText = await translate(originalText);
    textarea.value = translatedText;
  };

  const container = textarea.parentElement;
  if (container) {
    container.appendChild(button);
    button.style.display = isEnabled ? 'inline-block' : 'none';
  }
}

function findTextareasAndAddButtons() {
  const textareas = document.querySelectorAll<HTMLTextAreaElement>('textarea.js-comment-field');
  textareas.forEach(textarea => {
    const button = textarea.parentElement?.querySelector<HTMLButtonElement>('.translator-button');
    if (button) {
      button.style.display = isEnabled ? 'inline-block' : 'none';
    } else if (isEnabled) {
      addTranslateButton(textarea);
    }
  });
}

// Initial check
chrome.storage.sync.get('translatorEnabled', (data) => {
  isEnabled = data.translatorEnabled !== false; // default to true
  findTextareasAndAddButtons();
});

// Listen for changes in storage
chrome.storage.onChanged.addListener((changes) => {
  if (changes.translatorEnabled) {
    isEnabled = changes.translatorEnabled.newValue !== false;
    findTextareasAndAddButtons();
  }
});

// Use MutationObserver to detect when textareas are added to the page
const observer = new MutationObserver(findTextareasAndAddButtons);
observer.observe(document.body, {
  childList: true,
  subtree: true,
});

findTextareasAndAddButtons();
