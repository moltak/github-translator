export enum TranslationDirection {
  EN_TO_KO = 'EN_TO_KO',
  KO_TO_EN = 'KO_TO_EN'
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature: number;
  max_tokens: number;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface OpenAIErrorResponse {
  error: {
    message: string;
    type: string;
  };
}

export class TranslationService {
  private readonly apiKey: string;
  private readonly endpoint = 'https://api.openai.com/v1/responses';
  private readonly model = 'gpt-4.1-mini-2025-04-14';

  constructor(apiKey: string) {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API key is required');
    }
    this.apiKey = apiKey;
  }

  async translateText(text: string, direction: TranslationDirection): Promise<string> {
    const requestPayload = this.buildRequestPayload(text, direction);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        await this.handleApiError(response);
      }

      const data: OpenAIResponse = await response.json();
      return this.extractTranslationFromResponse(data);

    } catch (error) {
      this.handleNetworkError(error);
      throw error; // Re-throw after handling
    }
  }

  private buildRequestPayload(text: string, direction: TranslationDirection): OpenAIRequest {
    const systemPrompt = this.getSystemPrompt(direction);
    
    return {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.0,
      max_tokens: 1024
    };
  }

  private getSystemPrompt(direction: TranslationDirection): string {
    switch (direction) {
      case TranslationDirection.EN_TO_KO:
        return 'Translate the following GitHub discussion from English to Korean, preserving markdown.';
      case TranslationDirection.KO_TO_EN:
        return 'Translate the following GitHub discussion from Korean to English, preserving markdown.';
      default:
        throw new Error(`Unsupported translation direction: ${direction}`);
    }
  }

  private async handleApiError(response: Response): Promise<never> {
    let errorMessage = `OpenAI API Error (${response.status})`;
    
    try {
      const errorData: OpenAIErrorResponse = await response.json();
      if (errorData.error?.message) {
        errorMessage += `: ${errorData.error.message}`;
      }
    } catch {
      // If we can't parse the error response, use the default message
      errorMessage += `: ${response.statusText}`;
    }

    throw new Error(errorMessage);
  }

  private handleNetworkError(error: any): void {
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      throw new Error(`Network error: ${error.message}`);
    }
    
    if (error.name === 'TypeError' && error.message?.includes('fetch')) {
      throw new Error(`Network error: ${error.message}`);
    }

    // For other network errors, preserve the original error
    if (error.message?.includes('Network error')) {
      return; // Already handled
    }
    
    if (!error.message?.includes('OpenAI API Error')) {
      throw new Error(`Network error: ${error.message}`);
    }
  }

  private extractTranslationFromResponse(data: OpenAIResponse): string {
    if (!data.choices || !Array.isArray(data.choices)) {
      throw new Error('Invalid response format from OpenAI API');
    }

    if (data.choices.length === 0) {
      throw new Error('No translation choices returned from OpenAI API');
    }

    const choice = data.choices[0];
    if (!choice.message || typeof choice.message.content !== 'string') {
      throw new Error('Invalid response format from OpenAI API');
    }

    return choice.message.content.trim();
  }
}