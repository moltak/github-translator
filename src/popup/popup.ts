const toggleSwitch = document.getElementById('toggleSwitch') as HTMLInputElement;

// Load the saved state
chrome.storage.sync.get('translatorEnabled', (data) => {
  // Default to true if no value is stored
  toggleSwitch.checked = data.translatorEnabled !== false;
});

// Save the state when the switch is toggled
toggleSwitch.addEventListener('change', () => {
  chrome.storage.sync.set({ translatorEnabled: toggleSwitch.checked });
});
