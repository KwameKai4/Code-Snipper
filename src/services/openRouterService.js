import { API_CONFIG } from '../config/config';

export class OpenRouterService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = API_CONFIG.openRouter.url;
    this.headers = {
      ...API_CONFIG.openRouter.headers,
      'Authorization': `Bearer ${apiKey}`
    };
  }

  async generateResponse(messages, model = 'mistralai/mistral-7b-instruct') {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          model,
          messages: messages.map(msg => ({
            role: msg.role || 'user',
            content: msg.content
          })),
          temperature: 0.7,
          max_tokens: 1000,
          top_p: 0.95,
          frequency_penalty: 0.0,
          presence_penalty: 0.0,
          stream: false
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenRouter API error: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return this.extractResponse(data);

    } catch (error) {
      console.error('Error calling OpenRouter API:', error);
      throw error;
    }
  }

  extractResponse(data) {
    try {
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response generated');
      }

      const message = data.choices[0].message;
      if (!message || !message.content) {
        throw new Error('Invalid response format');
      }

      return message.content.trim();
    } catch (error) {
      console.error('Error extracting response:', error);
      throw error;
    }
  }

  async generateWithHistory(prompt, conversationHistory = [], systemPrompt = null) {
    const messages = [];

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }

    // Add conversation history
    conversationHistory.forEach(exchange => {
      messages.push({
        role: 'user',
        content: exchange.userMessage
      });
      if (exchange.botResponse) {
        messages.push({
          role: 'assistant',
          content: exchange.botResponse
        });
      }
    });

    // Add current prompt
    messages.push({
      role: 'user',
      content: prompt
    });

    return this.generateResponse(messages);
  }

  async generateWithPersonality(prompt, personalityState, context = []) {
    const systemPrompt = `You are an AI assistant with the following personality traits:
${Object.entries(personalityState.traits)
  .map(([trait, value]) => `- ${trait}: ${value}`)
  .join('\n')}

Current emotional state: ${personalityState.emotionalState}

Please respond in a way that reflects these traits and emotional state while remaining helpful and accurate.`;

    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    if (context.length > 0) {
      messages.push({
        role: 'system',
        content: `Context:\n${context.join('\n')}`
      });
    }

    messages.push({ role: 'user', content: prompt });

    return this.generateResponse(messages);
  }

  async generateStructuredResponse(prompt, instructions, format) {
    const systemPrompt = `Please provide a response following these instructions:
${instructions}

The response should be in this format:
${format}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ];

    return this.generateResponse(messages);
  }

  async analyzeSentiment(text) {
    const messages = [
      {
        role: 'system',
        content: 'Analyze the sentiment of the following text and return only a number between -1 (very negative) and 1 (very positive).'
      },
      {
        role: 'user',
        content: text
      }
    ];

    const response = await this.generateResponse(messages);
    const score = parseFloat(response);
    return isNaN(score) ? 0 : Math.max(-1, Math.min(1, score));
  }

  async extractTopics(text) {
    const messages = [
      {
        role: 'system',
        content: 'Extract the main topics from the text and return them as a comma-separated list.'
      },
      {
        role: 'user',
        content: text
      }
    ];

    const response = await this.generateResponse(messages);
    return response.split(',').map(topic => topic.trim());
  }
}
