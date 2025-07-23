chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translate") {
    chrome.storage.local.get("openai_api_key", async (data) => {
      const apiKey = data.openai_api_key;
      if (!apiKey) {
        sendResponse({ error: "API key not found. Please set it in the extension options." });
        return;
      }

      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4.1-mini",
            messages: [
              {
                role: "system",
                content: "You are a helpful assistant that translates text. Translate the user's text to English. Only provide the translated text, without any additional explanations or introductory phrases."
              },
              {
                role: "user",
                content: request.text
              }
            ],
            max_tokens: 1024,
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.choices && result.choices.length > 0) {
          sendResponse({ translation: result.choices[0].message.content.trim() });
        } else {
          sendResponse({ error: "No translation found in the API response." });
        }
      } catch (error) {
        console.error("Translation API error:", error);
        sendResponse({ error: "Failed to fetch translation." });
      }
    });

    // Indicates that the response is sent asynchronously
    return true;
  }
});
