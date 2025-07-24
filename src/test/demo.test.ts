// Demo test for Sprint 1

describe('Sprint 1 Demo', () => {
  test('should demonstrate Jest setup', () => {
    // given
    const message = 'Hello GitHub Translator';
    
    // when
    const result = message.toUpperCase();
    
    // then
    expect(result).toBe('HELLO GITHUB TRANSLATOR');
  });
  
  test('should verify Chrome API mocks', () => {
    // given
    const mockMessage = { action: 'test' };
    
    // when
    chrome.runtime.sendMessage(mockMessage);
    
    // then
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(mockMessage);
  });
});