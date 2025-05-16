// src/config/config.js
var PERSONALITY_SETTINGS = {
  initialTraits: {
    openness: 0.7,
    conscientiousness: 0.8,
    extraversion: 0.6,
    agreeableness: 0.75,
    empathy: 0.7
  },
  emotionalStateDuration: {
    minMinutes: 5,
    maxMinutes: 15
  },
  traitAdjustmentRates: {
    small: 0.02,
    medium: 0.05,
    large: 0.1
  }
};
var LEARNING_SETTINGS = {
  maxTopics: 10,
  maxPatterns: 5,
  preferenceAdjustmentRate: 0.05,
  technicalKeywords: [
    "api",
    "function",
    "code",
    "data",
    "system",
    "process",
    "technical",
    "algorithm",
    "database",
    "interface",
    "module",
    "parameter",
    "protocol",
    "query",
    "server",
    "variable",
    "framework"
  ],
  formalIndicators: [
    "please",
    "kindly",
    "would",
    "could",
    "may",
    "regarding",
    "concerning",
    "therefore",
    "hence",
    "thus",
    "furthermore",
    "moreover"
  ],
  casualIndicators: [
    "hey",
    "hi",
    "yeah",
    "cool",
    "awesome",
    "gonna",
    "wanna",
    "gotta",
    "dunno",
    "sup",
    "btw",
    "lol",
    "omg"
  ]
};
var API_CONFIG = {
  googleAi: {
    url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
    headers: {
      "Content-Type": "application/json"
    }
  },
  openRouter: {
    url: "https://openrouter.ai/api/v1/chat/completions",
    headers: {
      "Content-Type": "application/json"
    }
  }
};

// src/services/googleAiService.js
var GoogleAiService = class {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = API_CONFIG.googleAi.url;
    this.headers = {
      ...API_CONFIG.googleAi.headers,
      "x-goog-api-key": apiKey
    };
  }
  async generateContent(prompt, safetySettings = []) {
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
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
            maxOutputTokens: 1024
          }
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Google AI API error: ${error.error?.message || "Unknown error"}`);
      }
      const data = await response.json();
      return this.extractResponse(data);
    } catch (error) {
      console.error("Error calling Google AI API:", error);
      throw error;
    }
  }
  extractResponse(data) {
    try {
      const candidates = data.candidates || [];
      if (candidates.length === 0) {
        throw new Error("No response generated");
      }
      const content = candidates[0].content;
      if (!content || !content.parts || content.parts.length === 0) {
        throw new Error("Invalid response format");
      }
      return content.parts[0].text;
    } catch (error) {
      console.error("Error extracting response:", error);
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
    let enhancedPrompt = "";
    if (context && context.length > 0) {
      enhancedPrompt += "Context:\n" + context.join("\n") + "\n\n";
    }
    if (personalityState) {
      enhancedPrompt += `Current Emotional State: ${personalityState.emotionalState}
`;
      enhancedPrompt += "Personality Traits:\n";
      Object.entries(personalityState.traits).forEach(([trait, value]) => {
        enhancedPrompt += `- ${trait}: ${value}
`;
      });
      enhancedPrompt += "\n";
    }
    enhancedPrompt += "User Input: " + prompt;
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
    return response.split(",").map((topic) => topic.trim());
  }
};

// src/services/openRouterService.js
var OpenRouterService = class {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = API_CONFIG.openRouter.url;
    this.headers = {
      ...API_CONFIG.openRouter.headers,
      "Authorization": `Bearer ${apiKey}`
    };
  }
  async generateResponse(messages, model = "mistralai/mistral-7b-instruct") {
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          model,
          messages: messages.map((msg) => ({
            role: msg.role || "user",
            content: msg.content
          })),
          temperature: 0.7,
          max_tokens: 1e3,
          top_p: 0.95,
          frequency_penalty: 0,
          presence_penalty: 0,
          stream: false
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenRouter API error: ${error.error?.message || "Unknown error"}`);
      }
      const data = await response.json();
      return this.extractResponse(data);
    } catch (error) {
      console.error("Error calling OpenRouter API:", error);
      throw error;
    }
  }
  extractResponse(data) {
    try {
      if (!data.choices || data.choices.length === 0) {
        throw new Error("No response generated");
      }
      const message = data.choices[0].message;
      if (!message || !message.content) {
        throw new Error("Invalid response format");
      }
      return message.content.trim();
    } catch (error) {
      console.error("Error extracting response:", error);
      throw error;
    }
  }
  async generateWithHistory(prompt, conversationHistory = [], systemPrompt = null) {
    const messages = [];
    if (systemPrompt) {
      messages.push({
        role: "system",
        content: systemPrompt
      });
    }
    conversationHistory.forEach((exchange) => {
      messages.push({
        role: "user",
        content: exchange.userMessage
      });
      if (exchange.botResponse) {
        messages.push({
          role: "assistant",
          content: exchange.botResponse
        });
      }
    });
    messages.push({
      role: "user",
      content: prompt
    });
    return this.generateResponse(messages);
  }
  async generateWithPersonality(prompt, personalityState, context = []) {
    const systemPrompt = `You are an AI assistant with the following personality traits:
${Object.entries(personalityState.traits).map(([trait, value]) => `- ${trait}: ${value}`).join("\n")}

Current emotional state: ${personalityState.emotionalState}

Please respond in a way that reflects these traits and emotional state while remaining helpful and accurate.`;
    const messages = [
      { role: "system", content: systemPrompt }
    ];
    if (context.length > 0) {
      messages.push({
        role: "system",
        content: `Context:
${context.join("\n")}`
      });
    }
    messages.push({ role: "user", content: prompt });
    return this.generateResponse(messages);
  }
  async generateStructuredResponse(prompt, instructions, format) {
    const systemPrompt = `Please provide a response following these instructions:
${instructions}

The response should be in this format:
${format}`;
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ];
    return this.generateResponse(messages);
  }
  async analyzeSentiment(text) {
    const messages = [
      {
        role: "system",
        content: "Analyze the sentiment of the following text and return only a number between -1 (very negative) and 1 (very positive)."
      },
      {
        role: "user",
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
        role: "system",
        content: "Extract the main topics from the text and return them as a comma-separated list."
      },
      {
        role: "user",
        content: text
      }
    ];
    const response = await this.generateResponse(messages);
    return response.split(",").map((topic) => topic.trim());
  }
};

// src/services/memoryService.js
var MemoryService = class {
  constructor(db) {
    this.db = db;
    this.initialized = false;
  }
  async initialize() {
    if (this.initialized)
      return;
    const stmt = this.db.prepare(`
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        type TEXT NOT NULL,
        importance REAL DEFAULT 1.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await stmt.run();
    const interactionsStmt = this.db.prepare(`
      CREATE TABLE IF NOT EXISTS interaction_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        response TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await interactionsStmt.run();
    const preferencesStmt = this.db.prepare(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id INTEGER PRIMARY KEY,
        preferences TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await preferencesStmt.run();
    this.initialized = true;
  }
  async storeMemory(userId, content, memoryType, importance = 1) {
    await this.initialize();
    const stmt = this.db.prepare(
      "INSERT INTO memories (user_id, content, type, importance) VALUES (?, ?, ?, ?)"
    );
    await stmt.bind([userId, content, memoryType, importance]).run();
    return true;
  }
  async getMemories(userId, memoryType = null, limit = 10) {
    await this.initialize();
    let query = "SELECT * FROM memories WHERE user_id = ?";
    let params = [userId];
    if (memoryType) {
      query += " AND type = ?";
      params.push(memoryType);
    }
    query += " ORDER BY importance DESC, created_at DESC LIMIT ?";
    params.push(limit);
    const stmt = this.db.prepare(query);
    const results = await stmt.bind(params).all();
    return results.map((row) => ({ ...row }));
  }
  async deleteMemory(userId, memoryId) {
    await this.initialize();
    const stmt = this.db.prepare(
      "DELETE FROM memories WHERE id = ? AND user_id = ?"
    );
    const result = await stmt.bind([memoryId, userId]).run();
    return result.changes > 0;
  }
  async storeInteraction(userId, message, response) {
    await this.initialize();
    const stmt = this.db.prepare(
      "INSERT INTO interaction_history (user_id, message, response) VALUES (?, ?, ?)"
    );
    await stmt.bind([userId, message, response]).run();
    return true;
  }
  async getRecentInteractions(userId, limit = 10) {
    await this.initialize();
    const stmt = this.db.prepare(
      "SELECT * FROM interaction_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?"
    );
    const results = await stmt.bind([userId, limit]).all();
    return results.map((row) => ({ ...row }));
  }
  async storeUserPreferences(userId, preferences) {
    await this.initialize();
    const stmt = this.db.prepare(`
      INSERT INTO user_preferences (user_id, preferences)
      VALUES (?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
      preferences = excluded.preferences,
      updated_at = CURRENT_TIMESTAMP
    `);
    await stmt.bind([userId, JSON.stringify(preferences)]).run();
    return true;
  }
  async getUserPreferences(userId) {
    await this.initialize();
    const stmt = this.db.prepare(
      "SELECT preferences FROM user_preferences WHERE user_id = ?"
    );
    const result = await stmt.bind([userId]).get();
    return result ? JSON.parse(result.preferences) : null;
  }
  async clearUserData(userId) {
    await this.initialize();
    const stmts = [
      this.db.prepare("DELETE FROM memories WHERE user_id = ?"),
      this.db.prepare("DELETE FROM interaction_history WHERE user_id = ?"),
      this.db.prepare("DELETE FROM user_preferences WHERE user_id = ?")
    ];
    for (const stmt of stmts) {
      await stmt.bind([userId]).run();
    }
    return true;
  }
};

// src/services/personalityService.js
var EmotionalStates = {
  HAPPY: "happy",
  EXCITED: "excited",
  CALM: "calm",
  THOUGHTFUL: "thoughtful",
  CURIOUS: "curious",
  SYMPATHETIC: "sympathetic",
  NEUTRAL: "neutral"
};
var PersonalityTrait = class {
  constructor(name, initialValue = 0.5) {
    this.name = name;
    this.value = Math.max(0, Math.min(1, initialValue));
  }
  adjust(amount) {
    this.value = Math.max(0, Math.min(1, this.value + amount));
  }
};
var PersonalityService = class {
  constructor() {
    this.currentState = EmotionalStates.NEUTRAL;
    this.lastStateChange = Date.now();
    this.stateDuration = this.getRandomDuration();
    this.traits = {
      openness: new PersonalityTrait("Openness", 0.7),
      conscientiousness: new PersonalityTrait("Conscientiousness", 0.8),
      extraversion: new PersonalityTrait("Extraversion", 0.6),
      agreeableness: new PersonalityTrait("Agreeableness", 0.75),
      empathy: new PersonalityTrait("Empathy", 0.7)
    };
    this.responseStyles = {
      [EmotionalStates.HAPPY]: {
        expressions: ["\u{1F60A}", "\u{1F31F}", "\u2728", "\u{1F604}"],
        modifiers: ["enthusiastically", "cheerfully", "gladly"]
      },
      [EmotionalStates.EXCITED]: {
        expressions: ["\u{1F389}", "\u26A1", "\u{1F680}", "\u2728"],
        modifiers: ["excitedly", "energetically", "passionately"]
      },
      [EmotionalStates.CALM]: {
        expressions: ["\u{1F60C}", "\u{1F338}", "\u{1F343}", "\u{1F4AB}"],
        modifiers: ["calmly", "peacefully", "serenely"]
      },
      [EmotionalStates.THOUGHTFUL]: {
        expressions: ["\u{1F914}", "\u{1F4AD}", "\u{1F4DA}", "\u{1F3AF}"],
        modifiers: ["thoughtfully", "carefully", "considerately"]
      },
      [EmotionalStates.CURIOUS]: {
        expressions: ["\u{1F9D0}", "\u{1F50D}", "\u{1F4A1}", "\u2753"],
        modifiers: ["curiously", "inquisitively", "with interest"]
      },
      [EmotionalStates.SYMPATHETIC]: {
        expressions: ["\u{1F49D}", "\u{1F917}", "\u{1F49E}", "\u{1F4AB}"],
        modifiers: ["sympathetically", "caringly", "warmly"]
      },
      [EmotionalStates.NEUTRAL]: {
        expressions: ["\u{1F44D}", "\u2728", "\u{1F4AB}", "\u{1F4DD}"],
        modifiers: ["clearly", "precisely", "effectively"]
      }
    };
  }
  getRandomDuration() {
    const { minMinutes, maxMinutes } = PERSONALITY_SETTINGS.emotionalStateDuration;
    return Math.floor(Math.random() * (maxMinutes - minMinutes + 1) + minMinutes) * 60 * 1e3;
  }
  getCurrentState() {
    const now = Date.now();
    if (now - this.lastStateChange > this.stateDuration) {
      this.transitionState();
    }
    return this.currentState;
  }
  transitionState() {
    const possibleStates = Object.values(EmotionalStates).filter(
      (state) => state !== this.currentState
    );
    const weights = possibleStates.map((state) => {
      let weight = 1;
      if (state === EmotionalStates.HAPPY) {
        weight *= this.traits.extraversion.value;
      } else if (state === EmotionalStates.THOUGHTFUL) {
        weight *= this.traits.conscientiousness.value;
      } else if (state === EmotionalStates.CURIOUS) {
        weight *= this.traits.openness.value;
      } else if (state === EmotionalStates.SYMPATHETIC) {
        weight *= this.traits.empathy.value;
      }
      return weight;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    const normalizedWeights = weights.map((w) => w / total);
    let random = Math.random();
    let cumulativeWeight = 0;
    let selectedIndex = weights.length - 1;
    for (let i = 0; i < normalizedWeights.length; i++) {
      cumulativeWeight += normalizedWeights[i];
      if (random <= cumulativeWeight) {
        selectedIndex = i;
        break;
      }
    }
    this.currentState = possibleStates[selectedIndex];
    this.lastStateChange = Date.now();
    this.stateDuration = this.getRandomDuration();
  }
  adaptToUser(message) {
    const positiveWords = ["happy", "great", "awesome", "excellent", "good", "love", "wonderful", "fantastic"];
    const negativeWords = ["sad", "bad", "terrible", "awful", "horrible", "hate", "disappointed", "angry"];
    const words = message.toLowerCase().split(/\W+/);
    const positiveCount = words.filter((word) => positiveWords.includes(word)).length;
    const negativeCount = words.filter((word) => negativeWords.includes(word)).length;
    const score = (positiveCount - negativeCount) / words.length;
    if (score > 0.1) {
      this.traits.extraversion.adjust(0.05);
      this.traits.agreeableness.adjust(0.03);
    } else if (score < -0.1) {
      this.traits.empathy.adjust(0.05);
    }
    if (/\b(why|how|what|when|where)\b/i.test(message)) {
      this.traits.openness.adjust(0.02);
      this.traits.conscientiousness.adjust(0.02);
    }
    if (Math.abs(score) > 0.2) {
      this.transitionState();
    }
  }
  getResponseStyle() {
    return this.responseStyles[this.currentState];
  }
  modulateResponse(response) {
    const style = this.getResponseStyle();
    const modifier = style.modifiers[Math.floor(Math.random() * style.modifiers.length)];
    const expression = style.expressions[Math.floor(Math.random() * style.expressions.length)];
    if (!response.match(/[😊🌟✨😄🎉⚡🚀]/)) {
      response = `${expression} ${response}`;
    }
    return response;
  }
  getPersonalitySummary() {
    return {
      emotionalState: this.currentState,
      traits: Object.fromEntries(
        Object.entries(this.traits).map(([name, trait]) => [name, trait.value])
      )
    };
  }
};

// src/services/learningService.js
var STOP_WORDS = /* @__PURE__ */ new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "he",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "that",
  "the",
  "to",
  "was",
  "were",
  "will",
  "with",
  "the",
  "this",
  "but",
  "they",
  "have",
  "had",
  "what",
  "when",
  "where",
  "who",
  "which",
  "why",
  "how"
]);
var LearningService = class {
  constructor() {
    this.userData = /* @__PURE__ */ new Map();
    this.defaultUserData = {
      topics: [],
      patterns: /* @__PURE__ */ new Map(),
      preferences: {
        formality: 0.5,
        verbosity: 0.5,
        technicality: 0.5
      },
      messageCount: 0
    };
  }
  initializeUser(userId) {
    if (!this.userData.has(userId)) {
      this.userData.set(userId, JSON.parse(JSON.stringify({
        ...this.defaultUserData,
        patterns: {}
      })));
    }
  }
  tokenize(text) {
    return text.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter((word) => word.length > 0);
  }
  extractTopics(text) {
    const tokens = this.tokenize(text).filter((token) => !STOP_WORDS.has(token) && token.length > 2 && /^[a-z]+$/.test(token));
    const wordFreq = /* @__PURE__ */ new Map();
    tokens.forEach((token) => {
      wordFreq.set(token, (wordFreq.get(token) || 0) + 1);
    });
    return Array.from(wordFreq.entries()).filter(([_, count]) => count > 1).sort(([_, a], [__, b]) => b - a).slice(0, 3).map(([word]) => word);
  }
  analyzePatterns(text) {
    const tokens = this.tokenize(text);
    const patterns = /* @__PURE__ */ new Map();
    for (let i = 0; i < tokens.length - 1; i++) {
      const pair = `${tokens[i]} ${tokens[i + 1]}`;
      patterns.set(pair, (patterns.get(pair) || 0) + 1);
    }
    return patterns;
  }
  updatePreferences(text, userData) {
    const formalCount = LEARNING_SETTINGS.formalIndicators.filter((word) => text.toLowerCase().includes(word)).length;
    const casualCount = LEARNING_SETTINGS.casualIndicators.filter((word) => text.toLowerCase().includes(word)).length;
    if (formalCount > casualCount) {
      userData.preferences.formality = Math.min(
        1,
        userData.preferences.formality + LEARNING_SETTINGS.preferenceAdjustmentRate
      );
    } else if (casualCount > formalCount) {
      userData.preferences.formality = Math.max(
        0,
        userData.preferences.formality - LEARNING_SETTINGS.preferenceAdjustmentRate
      );
    }
    const wordsPerSentence = text.split(/[.!?]+/).map(
      (s) => s.trim().split(/\s+/).length
    ).reduce((a, b) => a + b, 0) / Math.max(1, text.split(/[.!?]+/).length);
    if (wordsPerSentence > 15) {
      userData.preferences.verbosity = Math.min(
        1,
        userData.preferences.verbosity + LEARNING_SETTINGS.preferenceAdjustmentRate
      );
    } else if (wordsPerSentence < 8) {
      userData.preferences.verbosity = Math.max(
        0,
        userData.preferences.verbosity - LEARNING_SETTINGS.preferenceAdjustmentRate
      );
    }
    const technicalWords = LEARNING_SETTINGS.technicalKeywords.filter((word) => text.toLowerCase().includes(word)).length;
    if (technicalWords > 0) {
      userData.preferences.technicality = Math.min(
        1,
        userData.preferences.technicality + LEARNING_SETTINGS.preferenceAdjustmentRate
      );
    }
  }
  processMessage(userId, message) {
    this.initializeUser(userId);
    const userData = this.userData.get(userId);
    const newTopics = this.extractTopics(message);
    userData.topics = [.../* @__PURE__ */ new Set([...userData.topics, ...newTopics])].slice(-LEARNING_SETTINGS.maxTopics);
    const newPatterns = this.analyzePatterns(message);
    newPatterns.forEach((count, pattern) => {
      userData.patterns[pattern] = (userData.patterns[pattern] || 0) + count;
    });
    this.updatePreferences(message, userData);
    userData.messageCount++;
    return this.getResponseContext(userId);
  }
  getResponseContext(userId) {
    this.initializeUser(userId);
    const userData = this.userData.get(userId);
    const sortedPatterns = Object.entries(userData.patterns).sort(([_, a], [__, b]) => b - a).slice(0, LEARNING_SETTINGS.maxPatterns);
    return {
      topics: userData.topics,
      patterns: Object.fromEntries(sortedPatterns),
      preferences: userData.preferences,
      messageCount: userData.messageCount
    };
  }
  adaptResponse(userId, response) {
    this.initializeUser(userId);
    const prefs = this.userData.get(userId).preferences;
    if (prefs.formality > 0.7) {
      response = response.replace(/yeah/g, "yes").replace(/nope/g, "no").replace(/gonna/g, "going to").replace(/wanna/g, "want to");
    } else if (prefs.formality < 0.3) {
      response = response.replace(/certainly/g, "sure").replace(/additionally/g, "also").replace(/however/g, "but");
    }
    if (prefs.verbosity < 0.3 && response.length > 100) {
      const sentences = response.split(". ");
      if (sentences.length > 1) {
        response = sentences.filter((_, i) => i % 2 === 0).join(". ") + ".";
      }
    }
    if (prefs.technicality > 0.7) {
      response = response.replace(/use/g, "utilize").replace(/make/g, "implement").replace(/fix/g, "resolve");
    } else if (prefs.technicality < 0.3) {
      response = response.replace(/utilize/g, "use").replace(/implement/g, "make").replace(/resolve/g, "fix");
    }
    return response;
  }
  clearUserData(userId) {
    this.userData.set(userId, JSON.parse(JSON.stringify({
      ...this.defaultUserData,
      patterns: {}
    })));
  }
};

// src/index.js
var TelegramBot = class {
  constructor(env) {
    this.db = env.DB;
    this.sessionStore = env.SESSION_STORE;
    this.memoryService = new MemoryService(this.db);
    this.personalityService = new PersonalityService();
    this.learningService = new LearningService();
    this.googleAiService = new GoogleAiService(env.GOOGLE_API_KEY);
    this.openRouterService = new OpenRouterService(env.OPENROUTER_API_KEY);
    this.botToken = env.TELEGRAM_BOT_TOKEN;
    this.webhookPath = "/webhook";
  }
  async handleUpdate(request) {
    try {
      const update = await request.json();
      if (!update.message)
        return new Response("OK");
      const { message } = update;
      const userId = message.from.id;
      const text = message.text;
      const learningContext = await this.learningService.processMessage(userId, text);
      const memories = await this.memoryService.getMemories(userId);
      const personalityState = this.personalityService.getCurrentState();
      let response;
      try {
        response = await this.googleAiService.generateWithContext(
          text,
          memories.map((m) => m.content),
          personalityState
        );
      } catch (error) {
        console.error("Google AI error, falling back to OpenRouter:", error);
        response = await this.openRouterService.generateWithPersonality(
          text,
          personalityState,
          memories.map((m) => m.content)
        );
      }
      response = this.learningService.adaptResponse(userId, response);
      response = this.personalityService.modulateResponse(response);
      await this.memoryService.storeInteraction(userId, text, response);
      await this.sendTelegramMessage(message.chat.id, response);
      return new Response("OK");
    } catch (error) {
      console.error("Error handling update:", error);
      return new Response("Error", { status: 500 });
    }
  }
  async sendTelegramMessage(chatId, text) {
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML"
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
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url: url + this.webhookPath,
          allowed_updates: ["message"]
        })
      }
    );
    return response.json();
  }
};
var src_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const bot = new TelegramBot(env);
    if (url.pathname === bot.webhookPath) {
      return bot.handleUpdate(request);
    }
    return new Response("Not found", { status: 404 });
  }
};
export {
  src_default as default
};
