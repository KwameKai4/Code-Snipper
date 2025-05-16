export const SAFETY_SETTINGS = [
  {
    category: "HARM_CATEGORY_HARASSMENT",
    threshold: "BLOCK_MEDIUM_AND_ABOVE"
  },
  {
    category: "HARM_CATEGORY_HATE_SPEECH",
    threshold: "BLOCK_MEDIUM_AND_ABOVE"
  },
  {
    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
    threshold: "BLOCK_MEDIUM_AND_ABOVE"
  },
  {
    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
    threshold: "BLOCK_MEDIUM_AND_ABOVE"
  }
];

export const PERSONALITY_SETTINGS = {
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

export const LEARNING_SETTINGS = {
  maxTopics: 10,
  maxPatterns: 5,
  preferenceAdjustmentRate: 0.05,
  technicalKeywords: [
    "api", "function", "code", "data", "system",
    "process", "technical", "algorithm", "database",
    "interface", "module", "parameter", "protocol",
    "query", "server", "variable", "framework"
  ],
  formalIndicators: [
    "please", "kindly", "would", "could", "may",
    "regarding", "concerning", "therefore", "hence",
    "thus", "furthermore", "moreover"
  ],
  casualIndicators: [
    "hey", "hi", "yeah", "cool", "awesome",
    "gonna", "wanna", "gotta", "dunno", "sup",
    "btw", "lol", "omg"
  ]
};

export const MEMORY_SETTINGS = {
  maxMemories: 100,
  maxRecentInteractions: 50,
  importanceThreshold: 0.5,
  memoryTypes: [
    "user_note",
    "conversation",
    "preference",
    "fact",
    "opinion"
  ],
  retentionDays: 30
};

export const MAX_CONVERSATION_LENGTH = 10;

export const API_CONFIG = {
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
