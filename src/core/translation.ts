export enum TranslationDirection {
  EN_TO_KO = 'EN_TO_KO',
  KO_TO_EN = 'KO_TO_EN'
}



interface OpenAIRequest {
  model: string;
  input: string;
  temperature: number;
  max_output_tokens: number;
}

interface OpenAIResponse {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type: string;
    }>;
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
    const userPrompt = `${systemPrompt}\n\nText to translate: ${text}`;
    
    return {
      model: this.model,
      input: userPrompt,
      temperature: 0.0,
      max_output_tokens: 1024
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
    // First try to get output_text directly
    if (data.output_text && typeof data.output_text === 'string') {
      return data.output_text.trim();
    }

    // Fallback to parsing output array
    if (!data.output || !Array.isArray(data.output)) {
      throw new Error('Invalid response format from OpenAI Responses API');
    }

    if (data.output.length === 0) {
      throw new Error('No output returned from OpenAI Responses API');
    }

    const output = data.output[0];
    if (!output.content || !Array.isArray(output.content)) {
      throw new Error('Invalid output format from OpenAI Responses API');
    }

    const textContent = output.content.find(item => item.type === 'output_text');
    if (!textContent || typeof textContent.text !== 'string') {
      throw new Error('No text content found in OpenAI Responses API output');
    }

    return textContent.text.trim();
  }
}