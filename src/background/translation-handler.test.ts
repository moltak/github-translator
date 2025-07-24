import { TranslationService, TranslationDirection } from '../core/translation';
import { handleTranslationMessage, TranslationRequest, TranslationResponse, resetTranslationService } from './translation-handler';

// Mock TranslationService
jest.mock('../core/translation');
const MockedTranslationService = TranslationService as jest.MockedClass<typeof TranslationService>;

describe('Translation Message Handler', () => {
  let mockTranslationService: jest.Mocked<TranslationService>;
  let mockSender: chrome.runtime.MessageSender;
  let mockSendResponse: jest.MockedFunction<(response: TranslationResponse) => void>;

  beforeEach(() => {
    // Reset translation service to ensure clean state
    resetTranslationService();
    
    // Create mock instance
    mockTranslationService = {
      translateText: jest.fn(),
    } as any;
    
    // Mock the constructor to return our mock instance
    MockedTranslationService.mockImplementation(() => mockTranslationService);

    // Mock chrome.storage.sync.get to return a mock API key
    (global.chrome.storage.sync.get as jest.Mock).mockResolvedValue({
      openaiApiKey: 'sk-mock-api-key-12345'
    });

    mockSender = {
      tab: { id: 123, url: 'https://github.com/test/repo' },
      url: 'https://github.com/test/repo'
    };

    mockSendResponse = jest.fn();

    jest.clearAllMocks();
  });

  describe('handleTranslationMessage', () => {
    test('translates English to Korean successfully', async () => {
      // given
      const request: TranslationRequest = {
        type: 'TRANSLATE',
        text: 'Fix memory leak in transformer',
        direction: TranslationDirection.EN_TO_KO
      };
      const expectedTranslation = '트랜스포머의 메모리 누수 수정';
      
      mockTranslationService.translateText.mockResolvedValueOnce(expectedTranslation);

      // when
      const result = await handleTranslationMessage(request, mockSender, mockSendResponse);

      // then
      expect(result).toBe(true); // Indicates async response
      expect(mockTranslationService.translateText).toHaveBeenCalledWith(
        'Fix memory leak in transformer',
        TranslationDirection.EN_TO_KO
      );
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: true,
        translatedText: expectedTranslation
      });
    });

    test('translates Korean to English successfully', async () => {
      // given
      const request: TranslationRequest = {
        type: 'TRANSLATE',
        text: '새로운 모델 지원 추가',
        direction: TranslationDirection.KO_TO_EN
      };
      const expectedTranslation = 'Add support for new model';
      
      mockTranslationService.translateText.mockResolvedValueOnce(expectedTranslation);

      // when
      const result = await handleTranslationMessage(request, mockSender, mockSendResponse);

      // then
      expect(result).toBe(true);
      expect(mockTranslationService.translateText).toHaveBeenCalledWith(
        '새로운 모델 지원 추가',
        TranslationDirection.KO_TO_EN
      );
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: true,
        translatedText: expectedTranslation
      });
    });

    test('handles translation service error gracefully', async () => {
      // given
      const request: TranslationRequest = {
        type: 'TRANSLATE',
        text: 'Test text',
        direction: TranslationDirection.EN_TO_KO
      };
      const errorMessage = 'OpenAI API Error (401): Invalid API key';
      
      mockTranslationService.translateText.mockRejectedValueOnce(new Error(errorMessage));

      // when
      const result = await handleTranslationMessage(request, mockSender, mockSendResponse);

      // then
      expect(result).toBe(true);
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: false,
        error: errorMessage
      });
    });

    test('handles network timeout error', async () => {
      // given
      const request: TranslationRequest = {
        type: 'TRANSLATE',
        text: 'Test text',
        direction: TranslationDirection.EN_TO_KO
      };
      
      mockTranslationService.translateText.mockRejectedValueOnce(
        new Error('Network error: Timeout')
      );

      // when
      const result = await handleTranslationMessage(request, mockSender, mockSendResponse);

      // then
      expect(result).toBe(true);
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Network error: Timeout'
      });
    });

    test('ignores non-translation messages', async () => {
      // given
      const request = {
        type: 'OTHER_MESSAGE',
        data: 'some data'
      };

      // when
      const result = await handleTranslationMessage(request as any, mockSender, mockSendResponse);

      // then
      expect(result).toBe(false); // Does not handle this message type
      expect(mockTranslationService.translateText).not.toHaveBeenCalled();
      expect(mockSendResponse).not.toHaveBeenCalled();
    });

    test('validates required fields in translation request', async () => {
      // given
      const incompleteRequest = {
        type: 'TRANSLATE',
        text: 'Test text'
        // Missing direction field
      };

      // when
      const result = await handleTranslationMessage(incompleteRequest as any, mockSender, mockSendResponse);

      // then
      expect(result).toBe(true);
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid translation request: missing required fields'
      });
    });

    test('validates text is not empty', async () => {
      // given
      const request: TranslationRequest = {
        type: 'TRANSLATE',
        text: '',
        direction: TranslationDirection.EN_TO_KO
      };

      // when
      const result = await handleTranslationMessage(request, mockSender, mockSendResponse);

      // then
      expect(result).toBe(true);
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid translation request: text cannot be empty'
      });
    });

    test('validates translation direction is valid', async () => {
      // given
      const request = {
        type: 'TRANSLATE',
        text: 'Test text',
        direction: 'INVALID_DIRECTION'
      };

      // when
      const result = await handleTranslationMessage(request as any, mockSender, mockSendResponse);

      // then
      expect(result).toBe(true);
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid translation request: invalid direction'
      });
    });

    test('logs translation request for debugging', async () => {
      // given
      const request: TranslationRequest = {
        type: 'TRANSLATE',
        text: 'Debug test',
        direction: TranslationDirection.EN_TO_KO
      };
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      mockTranslationService.translateText.mockResolvedValueOnce('디버그 테스트');

      // when
      await handleTranslationMessage(request, mockSender, mockSendResponse);

      // then
      expect(consoleSpy).toHaveBeenCalledWith(
        '🌐 Translation request:',
        expect.objectContaining({
          text: 'Debug test',
          direction: TranslationDirection.EN_TO_KO,
          from: 'https://github.com/test/repo'
        })
      );

      consoleSpy.mockRestore();
    });

    test('handles undefined sender gracefully', async () => {
      // given
      const request: TranslationRequest = {
        type: 'TRANSLATE',
        text: 'Test text',
        direction: TranslationDirection.EN_TO_KO
      };
      
      mockTranslationService.translateText.mockResolvedValueOnce('테스트 텍스트');

      // when
      const result = await handleTranslationMessage(request, undefined as any, mockSendResponse);

      // then
      expect(result).toBe(true);
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: true,
        translatedText: '테스트 텍스트'
      });
    });

    test('handles missing API key error', async () => {
      // given
      const request: TranslationRequest = {
        type: 'TRANSLATE',
        text: 'Test text',
        direction: TranslationDirection.EN_TO_KO
      };

      // Mock storage to return no API key
      (global.chrome.storage.sync.get as jest.Mock).mockResolvedValueOnce({});

      // when
      const result = await handleTranslationMessage(request, mockSender, mockSendResponse);

      // then
      expect(result).toBe(true);
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'OpenAI API key not found. Please set your API key in the extension settings.'
      });
    });
  });
});