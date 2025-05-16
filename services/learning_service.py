from typing import Dict, List, Any
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from collections import Counter, defaultdict
import json
import re

class LearningService:
    def __init__(self):
        # Initialize NLTK resources
        try:
            nltk.data.find('tokenizers/punkt')
            nltk.data.find('corpora/stopwords')
        except LookupError:
            nltk.download('punkt')
            nltk.download('stopwords')
        
        self.stop_words = set(stopwords.words('english'))
        
        # User-specific data storage
        self.user_data: Dict[int, Dict[str, Any]] = {}
        
        # Initialize default user data structure
        self.default_user_data = {
            "topics": [],           # List of topics the user frequently discusses
            "patterns": Counter(),  # Common word patterns in user messages
            "preferences": {        # User preferences learned from interactions
                "formality": 0.5,   # 0 = casual, 1 = formal
                "verbosity": 0.5,   # 0 = concise, 1 = detailed
                "technicality": 0.5 # 0 = simple, 1 = technical
            },
            "message_count": 0
        }

    def _initialize_user(self, user_id: int):
        """Initialize data structure for a new user."""
        if user_id not in self.user_data:
            self.user_data[user_id] = json.loads(json.dumps(self.default_user_data))

    def _extract_topics(self, text: str) -> List[str]:
        """Extract potential topics from text."""
        # Tokenize and remove stopwords
        tokens = word_tokenize(text.lower())
        tokens = [token for token in tokens if token not in self.stop_words 
                 and token.isalnum() and len(token) > 2]
        
        # Count word frequencies
        word_freq = Counter(tokens)
        
        # Return most common words as topics
        return [word for word, count in word_freq.most_common(3) if count > 1]

    def _analyze_patterns(self, text: str) -> Counter:
        """Analyze text for common patterns."""
        # Extract word pairs (bigrams)
        tokens = word_tokenize(text.lower())
        pairs = [f"{tokens[i]} {tokens[i+1]}" for i in range(len(tokens)-1)]
        
        return Counter(pairs)

    def _update_preferences(self, text: str, user_data: Dict[str, Any]):
        """Update user preferences based on message content."""
        # Update formality preference
        formal_indicators = len(re.findall(r'\b(please|kindly|would|could|may|regarding)\b', text.lower()))
        casual_indicators = len(re.findall(r'\b(hey|hi|yeah|cool|awesome|gonna|wanna)\b', text.lower()))
        
        if formal_indicators > casual_indicators:
            user_data["preferences"]["formality"] = min(1.0, user_data["preferences"]["formality"] + 0.05)
        elif casual_indicators > formal_indicators:
            user_data["preferences"]["formality"] = max(0.0, user_data["preferences"]["formality"] - 0.05)
        
        # Update verbosity preference
        words_per_sentence = len(text.split()) / max(1, len(text.split('.')))
        if words_per_sentence > 15:
            user_data["preferences"]["verbosity"] = min(1.0, user_data["preferences"]["verbosity"] + 0.05)
        elif words_per_sentence < 8:
            user_data["preferences"]["verbosity"] = max(0.0, user_data["preferences"]["verbosity"] - 0.05)
        
        # Update technicality preference
        technical_words = len(re.findall(r'\b(api|function|code|data|system|process|technical)\b', text.lower()))
        if technical_words > 0:
            user_data["preferences"]["technicality"] = min(1.0, user_data["preferences"]["technicality"] + 0.05)

    def process_message(self, user_id: int, message: str) -> Dict[str, Any]:
        """Process a user message and update learning data."""
        self._initialize_user(user_id)
        user_data = self.user_data[user_id]
        
        # Extract and update topics
        new_topics = self._extract_topics(message)
        user_data["topics"].extend(new_topics)
        user_data["topics"] = list(set(user_data["topics"]))[-10:]  # Keep last 10 unique topics
        
        # Update pattern frequencies
        user_data["patterns"].update(self._analyze_patterns(message))
        
        # Update preferences
        self._update_preferences(message, user_data)
        
        # Increment message count
        user_data["message_count"] += 1
        
        return self.get_response_context(user_id)

    def get_response_context(self, user_id: int) -> Dict[str, Any]:
        """Get the learning context for generating a response."""
        self._initialize_user(user_id)
        user_data = self.user_data[user_id]
        
        return {
            "topics": user_data["topics"],
            "patterns": dict(user_data["patterns"].most_common(5)),
            "preferences": user_data["preferences"],
            "message_count": user_data["message_count"]
        }

    def adapt_response(self, user_id: int, response: str) -> str:
        """Adapt a response based on learned user preferences."""
        self._initialize_user(user_id)
        prefs = self.user_data[user_id]["preferences"]
        
        # Adjust response based on formality preference
        if prefs["formality"] > 0.7:
            response = response.replace("yeah", "yes")
            response = response.replace("nope", "no")
            response = response.replace("gonna", "going to")
            response = response.replace("wanna", "want to")
        elif prefs["formality"] < 0.3:
            response = response.replace("certainly", "sure")
            response = response.replace("additionally", "also")
            response = response.replace("however", "but")
        
        # Adjust response based on verbosity preference
        if prefs["verbosity"] < 0.3 and len(response) > 100:
            # Attempt to make response more concise
            sentences = response.split('. ')
            if len(sentences) > 1:
                response = '. '.join(sentences[::2]) + '.'
        
        # Adjust response based on technicality preference
        if prefs["technicality"] > 0.7:
            # Add more technical details or terminology
            response = response.replace("use", "utilize")
            response = response.replace("make", "implement")
            response = response.replace("fix", "resolve")
        elif prefs["technicality"] < 0.3:
            # Simplify technical terms
            response = response.replace("utilize", "use")
            response = response.replace("implement", "make")
            response = response.replace("resolve", "fix")
        
        return response

    def clear_user_data(self, user_id: int):
        """Clear all learned data for a user."""
        if user_id in self.user_data:
            self.user_data[user_id] = json.loads(json.dumps(self.default_user_data))
