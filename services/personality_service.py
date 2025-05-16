from enum import Enum
from typing import Dict, Any
import random
from datetime import datetime, timedelta
import nltk
from nltk.sentiment import SentimentIntensityAnalyzer

class EmotionalState(Enum):
    HAPPY = "happy"
    EXCITED = "excited"
    CALM = "calm"
    THOUGHTFUL = "thoughtful"
    CURIOUS = "curious"
    SYMPATHETIC = "sympathetic"
    NEUTRAL = "neutral"

class PersonalityTrait:
    def __init__(self, name: str, initial_value: float = 0.5):
        self.name = name
        self.value = max(0.0, min(1.0, initial_value))  # Ensure value is between 0 and 1

    def adjust(self, amount: float):
        """Adjust trait value, keeping it between 0 and 1"""
        self.value = max(0.0, min(1.0, self.value + amount))

class PersonalityService:
    def __init__(self):
        self.current_state = EmotionalState.NEUTRAL
        self.last_state_change = datetime.now()
        self.state_duration = timedelta(minutes=random.randint(5, 15))
        
        # Initialize personality traits
        self.traits = {
            "openness": PersonalityTrait("Openness", 0.7),
            "conscientiousness": PersonalityTrait("Conscientiousness", 0.8),
            "extraversion": PersonalityTrait("Extraversion", 0.6),
            "agreeableness": PersonalityTrait("Agreeableness", 0.75),
            "empathy": PersonalityTrait("Empathy", 0.7)
        }
        
        # Response styles for different emotional states
        self.response_styles = {
            EmotionalState.HAPPY: {
                "expressions": ["😊", "🌟", "✨", "😄"],
                "modifiers": ["enthusiastically", "cheerfully", "gladly"]
            },
            EmotionalState.EXCITED: {
                "expressions": ["🎉", "⚡", "🚀", "✨"],
                "modifiers": ["excitedly", "energetically", "passionately"]
            },
            EmotionalState.CALM: {
                "expressions": ["😌", "🌸", "🍃", "💫"],
                "modifiers": ["calmly", "peacefully", "serenely"]
            },
            EmotionalState.THOUGHTFUL: {
                "expressions": ["🤔", "💭", "📚", "🎯"],
                "modifiers": ["thoughtfully", "carefully", "considerately"]
            },
            EmotionalState.CURIOUS: {
                "expressions": ["🧐", "🔍", "💡", "❓"],
                "modifiers": ["curiously", "inquisitively", "with interest"]
            },
            EmotionalState.SYMPATHETIC: {
                "expressions": ["💝", "🤗", "💞", "💫"],
                "modifiers": ["sympathetically", "caringly", "warmly"]
            },
            EmotionalState.NEUTRAL: {
                "expressions": ["👍", "✨", "💫", "📝"],
                "modifiers": ["clearly", "precisely", "effectively"]
            }
        }
        
        try:
            nltk.data.find('vader_lexicon')
        except LookupError:
            nltk.download('vader_lexicon')
        
        self.sentiment_analyzer = SentimentIntensityAnalyzer()

    def get_current_state(self) -> EmotionalState:
        """Get current emotional state, potentially transitioning to a new one."""
        now = datetime.now()
        if now - self.last_state_change > self.state_duration:
            self._transition_state()
        return self.current_state

    def _transition_state(self):
        """Transition to a new emotional state."""
        # Exclude current state from possibilities
        possible_states = [state for state in EmotionalState if state != self.current_state]
        
        # Weight transitions based on personality traits
        weights = []
        for state in possible_states:
            weight = 1.0
            if state == EmotionalState.HAPPY:
                weight *= self.traits["extraversion"].value
            elif state == EmotionalState.THOUGHTFUL:
                weight *= self.traits["conscientiousness"].value
            elif state == EmotionalState.CURIOUS:
                weight *= self.traits["openness"].value
            elif state == EmotionalState.SYMPATHETIC:
                weight *= self.traits["empathy"].value
            weights.append(weight)
        
        # Normalize weights
        total = sum(weights)
        weights = [w/total for w in weights]
        
        # Choose new state
        self.current_state = random.choices(possible_states, weights=weights, k=1)[0]
        self.last_state_change = datetime.now()
        self.state_duration = timedelta(minutes=random.randint(5, 15))

    def adapt_to_user(self, message: str):
        """Adapt personality based on user interaction."""
        # Analyze sentiment
        sentiment = self.sentiment_analyzer.polarity_scores(message)
        
        # Adjust traits based on sentiment and message content
        if sentiment['compound'] > 0.3:
            self.traits["extraversion"].adjust(0.05)
            self.traits["agreeableness"].adjust(0.03)
        elif sentiment['compound'] < -0.3:
            self.traits["empathy"].adjust(0.05)
            
        # Adjust based on message content
        if any(word in message.lower() for word in ["why", "how", "what", "when", "where"]):
            self.traits["openness"].adjust(0.02)
            self.traits["conscientiousness"].adjust(0.02)
            
        # Force state transition if sentiment is strong
        if abs(sentiment['compound']) > 0.5:
            self._transition_state()

    def get_response_style(self) -> Dict[str, Any]:
        """Get current response style based on emotional state."""
        return self.response_styles[self.current_state]

    def modulate_response(self, response: str) -> str:
        """Modulate response based on current emotional state."""
        style = self.get_response_style()
        modifier = random.choice(style["modifiers"])
        expression = random.choice(style["expressions"])
        
        # Add expression to response
        if not any(expr in response for expr in ["😊", "🌟", "✨", "😄", "🎉", "⚡", "🚀"]):
            response = f"{expression} {response}"
        
        return response

    def get_personality_summary(self) -> Dict[str, Any]:
        """Get current personality state summary."""
        return {
            "emotional_state": self.current_state.value,
            "traits": {name: trait.value for name, trait in self.traits.items()}
        }
