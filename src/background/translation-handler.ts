import { TranslationService, TranslationDirection } from '../core/translation';

export interface TranslationRequest {
  type: 'TRANSLATE';
  text: string;
  direction: TranslationDirection;
}

export interface TranslationResponse {
  success: boolean;
  translatedText?: string;
  error?: string;
}

// Singleton translation service instance
let translationService: TranslationService | null = null;

// Initialize translation service with API key from storage
async function initializeTranslationService(): Promise<TranslationService> {
  if (translationService) {
    return translationService;
  }

  try {
    const result = await chrome.storage.sync.get(['openaiApiKey']);
    const apiKey = result.openaiApiKey;

    if (!apiKey) {
      throw new Error('OpenAI API key not found. Please set your API key in the extension settings.');
    }

    translationService = new TranslationService(apiKey);
    console.log('🔑 Translation service initialized successfully');
    return translationService;
  } catch (error) {
    console.error('❌ Failed to initialize translation service:', error);
    throw error;
  }
}

// Validate translation request
function validateTranslationRequest(request: any): request is TranslationRequest {
  if (request.type !== 'TRANSLATE') {
    return false;
  }

  if (!request.hasOwnProperty('text') || !request.hasOwnProperty('direction')) {
    return false;
  }

  if (typeof request.text !== 'string') {
    return false;
  }

  // Accept both enum values and string values for compatibility
  const validDirections = ['EN_TO_KO', 'KO_TO_EN', TranslationDirection.EN_TO_KO, TranslationDirection.KO_TO_EN];
  if (!validDirections.includes(request.direction)) {
    return false;
  }

  return true;
}

// Check if text is empty after validation
function isTextEmpty(text: string): boolean {
  return text.trim() === '';
}

// Handle translation message from content script
export async function handleTranslationMessage(
  request: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: TranslationResponse) => void
): Promise<boolean> {
  // Only handle TRANSLATE messages
  if (request.type !== 'TRANSLATE') {
    return false;
  }

  console.log('🌐 Translation request:', {
    text: request.text,
    direction: request.direction,
    from: sender?.url || sender?.tab?.url || 'unknown'
  });

  try {
    // Validate request format
    if (!validateTranslationRequest(request)) {
      let errorMessage = 'Invalid translation request: ';
      
      if (!request.hasOwnProperty('text') || !request.hasOwnProperty('direction')) {
        errorMessage += 'missing required fields';
      } else if (typeof request.text !== 'string') {
        errorMessage += 'text must be a string';
      } else if (!Object.values(TranslationDirection).includes(request.direction)) {
        errorMessage += 'invalid direction';
      } else {
        errorMessage += 'unknown validation error';
      }

      sendResponse({
        success: false,
        error: errorMessage
      });
      return true;
    }

    // Check if text is empty (after validation)
    if (isTextEmpty(request.text)) {
      sendResponse({
        success: false,
        error: 'Invalid translation request: text cannot be empty'
      });
      return true;
    }

    // Initialize translation service if needed
    const service = await initializeTranslationService();

    // Perform translation
    const translatedText = await service.translateText(request.text, request.direction);

    console.log('✅ Translation completed:', {
      original: request.text.substring(0, 50) + (request.text.length > 50 ? '...' : ''),
      translated: translatedText.substring(0, 50) + (translatedText.length > 50 ? '...' : ''),
      direction: request.direction
    });

    const response = {
      success: true,
      translatedText
    };
    
    console.log('📤 Sending response:', response);
    sendResponse(response);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown translation error';
    
    console.error('❌ Translation failed:', {
      error: errorMessage,
      text: request.text ? request.text.substring(0, 50) + (request.text.length > 50 ? '...' : '') : 'undefined',
      direction: request.direction
    });

    const errorResponse = {
      success: false,
      error: errorMessage
    };
    
    console.log('📤 Sending error response:', errorResponse);
    sendResponse(errorResponse);
  }

  return true; // Indicates we will send response asynchronously
}

// Reset translation service (useful for testing or when API key changes)
export function resetTranslationService(): void {
  translationService = null;
  console.log('🔄 Translation service reset');
}