import os
from typing import Dict, Any, List

# API Configuration
GOOGLE_API_URL = os.getenv("GOOGLE_API_URL", "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "your-api-key-here")
API_KEY_PARAM = f"?key={GOOGLE_API_KEY}"

GOOGLE_HEADERS = {
    "Content-Type": "application/json"
}

# Safety Settings for the AI model
SAFETY_SETTINGS = [
    {
        "category": "HARM_CATEGORY_HARASSMENT",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    },
    {
        "category": "HARM_CATEGORY_HATE_SPEECH",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    },
    {
        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    },
    {
        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    }
]

# Memory Service Configuration
DATABASE_PATH = "bot_memory.db"
MAX_CONVERSATION_LENGTH = 10

# Personality Service Configuration
PERSONALITY_SETTINGS: Dict[str, Any] = {
    "initial_traits": {
        "openness": 0.7,
        "conscientiousness": 0.8,
        "extraversion": 0.6,
        "agreeableness": 0.75,
        "empathy": 0.7
    },
    "emotional_state_duration": {
        "min_minutes": 5,
        "max_minutes": 15
    },
    "trait_adjustment_rates": {
        "small": 0.02,
        "medium": 0.05,
        "large": 0.1
    }
}

# Learning Service Configuration
LEARNING_SETTINGS: Dict[str, Any] = {
    "max_topics": 10,
    "max_patterns": 5,
    "preference_adjustment_rate": 0.05,
    "technical_keywords": [
        "api", "function", "code", "data", "system",
        "process", "technical", "algorithm", "database",
        "interface", "module", "parameter", "protocol",
        "query", "server", "variable", "framework"
    ],
    "formal_indicators": [
        "please", "kindly", "would", "could", "may",
        "regarding", "concerning", "therefore", "hence",
        "thus", "furthermore", "moreover"
    ],
    "casual_indicators": [
        "hey", "hi", "yeah", "cool", "awesome",
        "gonna", "wanna", "gotta", "dunno", "sup",
        "btw", "lol", "omg"
    ]
}

# Memory Settings
MEMORY_SETTINGS: Dict[str, Any] = {
    "max_memories": 100,
    "max_recent_interactions": 50,
    "importance_threshold": 0.5,
    "memory_types": [
        "user_note",
        "conversation",
        "preference",
        "fact",
        "opinion"
    ],
    "retention_days": 30  # How long to keep memories before cleanup
}
