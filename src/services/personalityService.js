import { PERSONALITY_SETTINGS } from '../config/config';

const EmotionalStates = {
  HAPPY: "happy",
  EXCITED: "excited",
  CALM: "calm",
  THOUGHTFUL: "thoughtful",
  CURIOUS: "curious",
  SYMPATHETIC: "sympathetic",
  NEUTRAL: "neutral"
};

class PersonalityTrait {
  constructor(name, initialValue = 0.5) {
    this.name = name;
    this.value = Math.max(0.0, Math.min(1.0, initialValue));
  }

  adjust(amount) {
    this.value = Math.max(0.0, Math.min(1.0, this.value + amount));
  }
}

export class PersonalityService {
  constructor() {
    this.currentState = EmotionalStates.NEUTRAL;
    this.lastStateChange = Date.now();
    this.stateDuration = this.getRandomDuration();

    // Initialize personality traits
    this.traits = {
      openness: new PersonalityTrait("Openness", 0.7),
      conscientiousness: new PersonalityTrait("Conscientiousness", 0.8),
      extraversion: new PersonalityTrait("Extraversion", 0.6),
      agreeableness: new PersonalityTrait("Agreeableness", 0.75),
      empathy: new PersonalityTrait("Empathy", 0.7)
    };

    // Response styles for different emotional states
    this.responseStyles = {
      [EmotionalStates.HAPPY]: {
        expressions: ["😊", "🌟", "✨", "😄"],
        modifiers: ["enthusiastically", "cheerfully", "gladly"]
      },
      [EmotionalStates.EXCITED]: {
        expressions: ["🎉", "⚡", "🚀", "✨"],
        modifiers: ["excitedly", "energetically", "passionately"]
      },
      [EmotionalStates.CALM]: {
        expressions: ["😌", "🌸", "🍃", "💫"],
        modifiers: ["calmly", "peacefully", "serenely"]
      },
      [EmotionalStates.THOUGHTFUL]: {
        expressions: ["🤔", "💭", "📚", "🎯"],
        modifiers: ["thoughtfully", "carefully", "considerately"]
      },
      [EmotionalStates.CURIOUS]: {
        expressions: ["🧐", "🔍", "💡", "❓"],
        modifiers: ["curiously", "inquisitively", "with interest"]
      },
      [EmotionalStates.SYMPATHETIC]: {
        expressions: ["💝", "🤗", "💞", "💫"],
        modifiers: ["sympathetically", "caringly", "warmly"]
      },
      [EmotionalStates.NEUTRAL]: {
        expressions: ["👍", "✨", "💫", "📝"],
        modifiers: ["clearly", "precisely", "effectively"]
      }
    };
  }

  getRandomDuration() {
    const { minMinutes, maxMinutes } = PERSONALITY_SETTINGS.emotionalStateDuration;
    return Math.floor(Math.random() * (maxMinutes - minMinutes + 1) + minMinutes) * 60 * 1000;
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
      state => state !== this.currentState
    );

    const weights = possibleStates.map(state => {
      let weight = 1.0;
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

    // Normalize weights
    const total = weights.reduce((a, b) => a + b, 0);
    const normalizedWeights = weights.map(w => w / total);

    // Choose new state
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
    // Simple sentiment analysis
    const positiveWords = ['happy', 'great', 'awesome', 'excellent', 'good', 'love', 'wonderful', 'fantastic'];
    const negativeWords = ['sad', 'bad', 'terrible', 'awful', 'horrible', 'hate', 'disappointed', 'angry'];
    
    const words = message.toLowerCase().split(/\W+/);
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;
    
    const score = (positiveCount - negativeCount) / words.length;

    if (score > 0.1) {
      this.traits.extraversion.adjust(0.05);
      this.traits.agreeableness.adjust(0.03);
    } else if (score < -0.1) {
      this.traits.empathy.adjust(0.05);
    }

    // Adjust based on message content
    if (/\b(why|how|what|when|where)\b/i.test(message)) {
      this.traits.openness.adjust(0.02);
      this.traits.conscientiousness.adjust(0.02);
    }

    // Force state transition if sentiment is strong
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

    // Add expression to response if none present
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
}
