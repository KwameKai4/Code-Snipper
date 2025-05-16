import { GoogleAiService } from './services/googleAiService';
import { OpenRouterService } from './services/openRouterService';
import { MemoryService } from './services/memoryService';
import { PersonalityService } from './services/personalityService';
import { LearningService } from './services/learningService';

class TelegramBot {
  constructor(env) {
    this.db = env.DB;
    this.sessionStore = env.SESSION_STORE;
    
    this.memoryService = new MemoryService(this.db);
    this.personalityService = new PersonalityService();
    this.learningService = new LearningService();
    this.googleAiService = new GoogleAiService(env.GOOGLE_API_KEY);
    this.openRouterService = new OpenRouterService(env.OPENROUTER_API_KEY);
    
    this.botToken = env.TELEGRAM_BOT_TOKEN;
    this.webhookPath = '/webhook';
  }

  async handleUpdate(request) {
    try {
      const update = await request.json();
      if (!update.message) return new Response('OK');

      const { message } = update;
      const userId = message.from.id;
      const text = message.text;

      // Process user message
      const learningContext = await this.learningService.processMessage(userId, text);
      const memories = await this.memoryService.getMemories(userId);
      const personalityState = this.personalityService.getCurrentState();

      // Generate AI response
      let response;
      try {
        response = await this.googleAiService.generateWithContext(
          text,
          memories.map(m => m.content),
          personalityState
        );
      } catch (error) {
        console.error('Google AI error, falling back to OpenRouter:', error);
        response = await this.openRouterService.generateWithPersonality(
          text,
          personalityState,
          memories.map(m => m.content)
        );
      }

      // Adapt response based on learning context
      response = this.learningService.adaptResponse(userId, response);
      response = this.personalityService.modulateResponse(response);

      // Store interaction
      await this.memoryService.storeInteraction(userId, text, response);

      // Send response back to Telegram
      await this.sendTelegramMessage(message.chat.id, response);

      return new Response('OK');
    } catch (error) {
      console.error('Error handling update:', error);
      return new Response('Error', { status: 500 });
    }
  }

  async sendTelegramMessage(chatId, text) {
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Telegram API error: ${error.description}`);
    }

    return response.json();
  }

  async setWebhook(url) {
    const response = await fetch(
      `https://api.telegram.org/bot${this.botToken}/setWebhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url + this.webhookPath,
          allowed_updates: ['message']
        })
      }
    );

    return response.json();
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const bot = new TelegramBot(env);

    if (url.pathname === bot.webhookPath) {
      return bot.handleUpdate(request);
    }

    return new Response('Not found', { status: 404 });
  }
};
