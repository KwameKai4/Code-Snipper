import { LEARNING_SETTINGS } from '../config/config';

// Common English stop words
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
  'will', 'with', 'the', 'this', 'but', 'they', 'have', 'had', 'what', 'when',
  'where', 'who', 'which', 'why', 'how'
]);

export class LearningService {
  constructor() {
    this.userData = new Map();
    
    this.defaultUserData = {
      topics: [],
      patterns: new Map(),
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
    // Simple word tokenization
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/)            // Split on whitespace
      .filter(word => word.length > 0);
  }

  extractTopics(text) {
    const tokens = this.tokenize(text)
      .filter(token => !STOP_WORDS.has(token) && 
              token.length > 2 && 
              /^[a-z]+$/.test(token));
    
    const wordFreq = new Map();
    tokens.forEach(token => {
      wordFreq.set(token, (wordFreq.get(token) || 0) + 1);
    });

    return Array.from(wordFreq.entries())
      .filter(([_, count]) => count > 1)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 3)
      .map(([word]) => word);
  }

  analyzePatterns(text) {
    const tokens = this.tokenize(text);
    const patterns = new Map();

    for (let i = 0; i < tokens.length - 1; i++) {
      const pair = `${tokens[i]} ${tokens[i + 1]}`;
      patterns.set(pair, (patterns.get(pair) || 0) + 1);
    }

    return patterns;
  }

  updatePreferences(text, userData) {
    // Update formality preference
    const formalCount = LEARNING_SETTINGS.formalIndicators
      .filter(word => text.toLowerCase().includes(word)).length;
    const casualCount = LEARNING_SETTINGS.casualIndicators
      .filter(word => text.toLowerCase().includes(word)).length;

    if (formalCount > casualCount) {
      userData.preferences.formality = Math.min(
        1.0, 
        userData.preferences.formality + LEARNING_SETTINGS.preferenceAdjustmentRate
      );
    } else if (casualCount > formalCount) {
      userData.preferences.formality = Math.max(
        0.0, 
        userData.preferences.formality - LEARNING_SETTINGS.preferenceAdjustmentRate
      );
    }

    // Update verbosity preference
    const wordsPerSentence = text.split(/[.!?]+/).map(s => 
      s.trim().split(/\s+/).length
    ).reduce((a, b) => a + b, 0) / Math.max(1, text.split(/[.!?]+/).length);

    if (wordsPerSentence > 15) {
      userData.preferences.verbosity = Math.min(
        1.0, 
        userData.preferences.verbosity + LEARNING_SETTINGS.preferenceAdjustmentRate
      );
    } else if (wordsPerSentence < 8) {
      userData.preferences.verbosity = Math.max(
        0.0, 
        userData.preferences.verbosity - LEARNING_SETTINGS.preferenceAdjustmentRate
      );
    }

    // Update technicality preference
    const technicalWords = LEARNING_SETTINGS.technicalKeywords
      .filter(word => text.toLowerCase().includes(word)).length;

    if (technicalWords > 0) {
      userData.preferences.technicality = Math.min(
        1.0, 
        userData.preferences.technicality + LEARNING_SETTINGS.preferenceAdjustmentRate
      );
    }
  }

  processMessage(userId, message) {
    this.initializeUser(userId);
    const userData = this.userData.get(userId);

    // Extract and update topics
    const newTopics = this.extractTopics(message);
    userData.topics = [...new Set([...userData.topics, ...newTopics])]
      .slice(-LEARNING_SETTINGS.maxTopics);

    // Update pattern frequencies
    const newPatterns = this.analyzePatterns(message);
    newPatterns.forEach((count, pattern) => {
      userData.patterns[pattern] = (userData.patterns[pattern] || 0) + count;
    });

    // Update preferences
    this.updatePreferences(message, userData);

    // Increment message count
    userData.messageCount++;

    return this.getResponseContext(userId);
  }

  getResponseContext(userId) {
    this.initializeUser(userId);
    const userData = this.userData.get(userId);

    // Get top patterns
    const sortedPatterns = Object.entries(userData.patterns)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, LEARNING_SETTINGS.maxPatterns);

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

    // Adjust based on formality preference
    if (prefs.formality > 0.7) {
      response = response
        .replace(/yeah/g, "yes")
        .replace(/nope/g, "no")
        .replace(/gonna/g, "going to")
        .replace(/wanna/g, "want to");
    } else if (prefs.formality < 0.3) {
      response = response
        .replace(/certainly/g, "sure")
        .replace(/additionally/g, "also")
        .replace(/however/g, "but");
    }

    // Adjust based on verbosity preference
    if (prefs.verbosity < 0.3 && response.length > 100) {
      const sentences = response.split(". ");
      if (sentences.length > 1) {
        response = sentences.filter((_, i) => i % 2 === 0).join(". ") + ".";
      }
    }

    // Adjust based on technicality preference
    if (prefs.technicality > 0.7) {
      response = response
        .replace(/use/g, "utilize")
        .replace(/make/g, "implement")
        .replace(/fix/g, "resolve");
    } else if (prefs.technicality < 0.3) {
      response = response
        .replace(/utilize/g, "use")
        .replace(/implement/g, "make")
        .replace(/resolve/g, "fix");
    }

    return response;
  }

  clearUserData(userId) {
    this.userData.set(userId, JSON.parse(JSON.stringify({
      ...this.defaultUserData,
      patterns: {}
    })));
  }
}
