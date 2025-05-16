import { API_CONFIG } from '../config/config';

export class GoogleAiService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = API_CONFIG.googleAi.url;
    this.headers = {
      ...API_CONFIG.googleAi.headers,
      'x-goog-api-key': apiKey
    };
  }

  async generateContent(prompt, safetySettings = []) {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          safetySettings,
          generationConfig: {
            temperature: 0.9,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Google AI API error: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return this.extractResponse(data);

    } catch (error) {
      console.error('Error calling Google AI API:', error);
      throw error;
    }
  }

  extractResponse(data) {
    try {
      const candidates = data.candidates || [];
      if (candidates.length === 0) {
        throw new Error('No response generated');
      }

      const content = candidates[0].content;
      if (!content || !content.parts || content.parts.length === 0) {
        throw new Error('Invalid response format');
      }

      return content.parts[0].text;
    } catch (error) {
      console.error('Error extracting response:', error);
      throw error;
    }
  }

  async generateStructuredResponse(prompt, instructions, format) {
    const formattedPrompt = `
      Instructions: ${instructions}
      Format: ${format}
      
      Input: ${prompt}
    `;

    return this.generateContent(formattedPrompt);
  }

  async generateWithContext(prompt, context, personalityState = null) {
    let enhancedPrompt = '';

    if (context && context.length > 0) {
      enhancedPrompt += 'Context:\n' + context.join('\n') + '\n\n';
    }

    if (personalityState) {
      enhancedPrompt += `Current Emotional State: ${personalityState.emotionalState}\n`;
      enhancedPrompt += 'Personality Traits:\n';
      Object.entries(personalityState.traits).forEach(([trait, value]) => {
        enhancedPrompt += `- ${trait}: ${value}\n`;
      });
      enhancedPrompt += '\n';
    }

    enhancedPrompt += 'User Input: ' + prompt;

    return this.generateContent(enhancedPrompt);
  }

  async analyzeSentiment(text) {
    const prompt = `
      Please analyze the sentiment of the following text and provide a score between -1 (very negative) and 1 (very positive):
      
      Text: "${text}"
      
      Return only the numerical score.
    `;

    const response = await this.generateContent(prompt);
    const score = parseFloat(response);
    return isNaN(score) ? 0 : Math.max(-1, Math.min(1, score));
  }

  async extractTopics(text) {
    const prompt = `
      Please extract the main topics from the following text. 
      Return only the topics as a comma-separated list:
      
      Text: "${text}"
    `;

    const response = await this.generateContent(prompt);
    return response.split(',').map(topic => topic.trim());
  }
}
