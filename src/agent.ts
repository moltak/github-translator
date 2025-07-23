export function translate(text: string): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "translate", text: text }, (response) => {
      if (chrome.runtime.lastError) {
        // Handle errors from the messaging system itself
        return reject(new Error(chrome.runtime.lastError.message));
      }
      if (response.error) {
        // Handle errors from the background script (e.g., API key not found, fetch failed)
        console.error("Translation error:", response.error);
        // Return the original text with an error message for user feedback
        return resolve(`${text}\n\n[Translation Error: ${response.error}]`);
      }
      resolve(response.translation);
    });
  });
}
