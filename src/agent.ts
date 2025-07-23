export function translate(text: string): Promise<string> {
  return new Promise((resolve) => {
    // In a real scenario, this would call a translation API
    resolve(`Translated: ${text}`);
  });
}
