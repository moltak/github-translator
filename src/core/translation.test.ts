import { TranslationService, TranslationDirection } from './translation';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('TranslationService', () => {
  let translationService: TranslationService;
  const mockApiKey = 'sk-test-1234567890abcdef';

  beforeEach(() => {
    translationService = new TranslationService(mockApiKey);
    mockFetch.mockClear();
  });

  describe('translateText', () => {
    test('translates English to Korean via OpenAI Responses API', async () => {
      // given
      const inputText = 'Fix memory leak in transformer';
      const expectedTranslation = '트랜스포머의 메모리 누수 수정';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          output_text: expectedTranslation
        })
      });

      // when
      const result = await translationService.translateText(inputText, TranslationDirection.EN_TO_KO);

      // then
      expect(result).toBe(expectedTranslation);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/responses',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mockApiKey}`,
            'Content-Type': 'application/json'
          }
        })
      );
    });

    test('translates Korean to English via OpenAI Responses API', async () => {
      // given
      const inputText = '새로운 모델 지원 추가';
      const expectedTranslation = 'Add support for new model';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          output_text: expectedTranslation
        })
      });

      // when
      const result = await translationService.translateText(inputText, TranslationDirection.KO_TO_EN);

      // then
      expect(result).toBe(expectedTranslation);
    });

    test('sends correct request payload for EN to KO translation', async () => {
      // given
      const inputText = 'Hello world';
      let capturedRequestBody: any;

      mockFetch.mockImplementationOnce(async (_url, options) => {
        capturedRequestBody = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => ({ output_text: '안녕 세상' })
        };
      });

      // when
      await translationService.translateText(inputText, TranslationDirection.EN_TO_KO);

      // then
      expect(capturedRequestBody).toEqual({
        model: 'gpt-4.1-mini-2025-04-14',
        input: 'Translate the following GitHub discussion from English to Korean, preserving markdown.\n\nText to translate: Hello world',
        temperature: 0.0,
        max_output_tokens: 1024
      });
    });

    test('sends correct request payload for KO to EN translation', async () => {
      // given
      const inputText = '안녕 세상';
      let capturedRequestBody: any;

      mockFetch.mockImplementationOnce(async (_url, options) => {
        capturedRequestBody = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => ({ output_text: 'Hello world' })
        };
      });

      // when
      await translationService.translateText(inputText, TranslationDirection.KO_TO_EN);

      // then
      expect(capturedRequestBody).toEqual({
        model: 'gpt-4.1-mini-2025-04-14',
        input: 'Translate the following GitHub discussion from Korean to English, preserving markdown.\n\nText to translate: 안녕 세상',
        temperature: 0.0,
        max_output_tokens: 1024
      });
    });

    test('sends correct Authorization header', async () => {
      // given
      const inputText = 'Test text';
      let capturedHeaders: any;

      mockFetch.mockImplementationOnce(async (_url, options) => {
        capturedHeaders = options.headers;
        return {
          ok: true,
          json: async () => ({ output_text: 'Translated text' })
        };
      });

      // when
      await translationService.translateText(inputText, TranslationDirection.EN_TO_KO);

      // then
      expect(capturedHeaders).toEqual({
        'Authorization': `Bearer ${mockApiKey}`,
        'Content-Type': 'application/json'
      });
    });

    test('throws error when API returns error status', async () => {
      // given
      const inputText = 'Test text';
      const errorMessage = 'Invalid API key';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            message: errorMessage,
            type: 'invalid_request_error'
          }
        })
      });

      // when & then
      await expect(
        translationService.translateText(inputText, TranslationDirection.EN_TO_KO)
      ).rejects.toThrow('OpenAI API Error (401): Invalid API key');
    });

    test('throws error when response format is invalid', async () => {
      // given
      const inputText = 'Test text';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          // Missing output_text and output array
          invalid: 'response'
        })
      });

      // when & then
      await expect(
        translationService.translateText(inputText, TranslationDirection.EN_TO_KO)
      ).rejects.toThrow('Invalid response format from OpenAI Responses API');
    });

    test('throws error when output array is empty', async () => {
      // given
      const inputText = 'Test text';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          output: []
        })
      });

      // when & then
      await expect(
        translationService.translateText(inputText, TranslationDirection.EN_TO_KO)
      ).rejects.toThrow('No output returned from OpenAI Responses API');
    });

    test('handles network timeout error', async () => {
      // given
      const inputText = 'Test text';

      mockFetch.mockRejectedValueOnce(new Error('Timeout'));

      // when & then
      await expect(
        translationService.translateText(inputText, TranslationDirection.EN_TO_KO)
      ).rejects.toThrow('Network error: Timeout');
    });

    test('preserves markdown formatting in translation request', async () => {
      // given
      const inputText = '**Bold text** and `code snippet` with [link](url)';
      let capturedRequestBody: any;

      mockFetch.mockImplementationOnce(async (_url, options) => {
        capturedRequestBody = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => ({ output_text: '**굵은 텍스트**와 `코드 스니펫` 그리고 [링크](url)' })
        };
      });

      // when
      await translationService.translateText(inputText, TranslationDirection.EN_TO_KO);

      // then
      expect(capturedRequestBody.input).toContain(inputText);
      expect(capturedRequestBody.input).toContain('preserving markdown');
    });

    test('throws error when API returns 500 status', async () => {
      // given
      const inputText = 'Test text';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => { throw new Error('Parse error'); }
      });

      // when & then
      await expect(
        translationService.translateText(inputText, TranslationDirection.EN_TO_KO)
      ).rejects.toThrow('OpenAI API Error (500): Internal Server Error');
    });

    test('handles fetch rejection', async () => {
      // given
      const inputText = 'Test text';

      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      // when & then
      await expect(
        translationService.translateText(inputText, TranslationDirection.EN_TO_KO)
      ).rejects.toThrow('Network error: Failed to fetch');
    });
  });

  describe('constructor', () => {
    test('throws error when API key is empty', () => {
      // given & when & then
      expect(() => new TranslationService('')).toThrow('API key is required');
    });

    test('throws error when API key is null', () => {
      // given & when & then
      expect(() => new TranslationService(null as any)).toThrow('API key is required');
    });
  });
});