import json
import aiohttp
from typing import List, Dict, Any
from config.config import (
    GOOGLE_API_URL, GOOGLE_HEADERS, API_KEY_PARAM, SAFETY_SETTINGS,
    PERSONALITY_SETTINGS
)
from services.memory_service import MemoryService
from services.personality_service import PersonalityService
from services.learning_service import LearningService

# Initialize global service instances
memory_service = None
personality_service = None
learning_service = None

def init_services(mem_service: MemoryService, pers_service: PersonalityService, learn_service: LearningService):
    """Initialize the services for context-aware responses."""
    global memory_service, personality_service, learning_service
    memory_service = mem_service
    personality_service = pers_service
    learning_service = learn_service

async def generate_response(messages: List[Dict[str, str]], user_context: Dict[str, Any] = None) -> str:
    """
    Generate a response using the Google AI API with context enhancement.
    """
    # Get the last message from conversation history
    last_message = messages[-1]["content"]

    # Build context-enhanced prompt
    system_context = "You are an AI assistant with personality and learning capabilities. "
    
    if user_context and personality_service:
        emotional_state = personality_service.get_current_state()
        system_context += f"Your current emotional state is {emotional_state.value}. "
    
    if user_context and memory_service:
        # Get relevant memories
        memories = await memory_service.get_memories(user_context.get('user_id', 0), limit=3)
        if memories:
            system_context += "\nRelevant context from past interactions:\n"
            for memory in memories:
                system_context += f"- {memory['content']}\n"
    
    if user_context and learning_service:
        # Get learned preferences
        learning_context = learning_service.get_response_context(user_context.get('user_id', 0))
        if learning_context.get('topics'):
            system_context += "\nUser's topics of interest: " + ", ".join(learning_context['topics'])
    
    # Combine system context with user message
    enhanced_message = f"{system_context}\n\nUser message: {last_message}"

    payload = {
        "contents": [{
            "parts": [{
                "text": enhanced_message
            }]
        }],
        "safetySettings": SAFETY_SETTINGS,
        "generationConfig": {
            "temperature": 0.7,
            "topP": 0.8,
            "topK": 40,
            "maxOutputTokens": 2048,
            "stopSequences": [],
        }
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{GOOGLE_API_URL}{API_KEY_PARAM}",
                headers=GOOGLE_HEADERS,
                json=payload
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    if (
                        "candidates" in result 
                        and len(result["candidates"]) > 0 
                        and "content" in result["candidates"][0]
                        and "parts" in result["candidates"][0]["content"]
                        and len(result["candidates"][0]["content"]["parts"]) > 0
                    ):
                        return result["candidates"][0]["content"]["parts"][0]["text"]
                    else:
                        return "I couldn't generate a response. Please try again."
                else:
                    error_text = await response.text()
                    print(f"Error from Google AI API: {error_text}")
                    return "There was an error processing your request. Please try again."
                    
    except Exception as e:
        print(f"Error generating response: {str(e)}")
        return "Sorry, there was an error processing your request. Please try again later."

async def process_message(user_message: str, conversation_history: List[Dict[str, str]], user_id: int = None) -> str:
    """
    Process a message with enhanced context and maintain conversation history.
    """
    # Add user message to conversation history
    conversation_history.append({
        "role": "user",
        "content": user_message
    })
    
    # Create user context
    user_context = {"user_id": user_id} if user_id is not None else None
    
    # Generate response with context
    response = await generate_response(conversation_history, user_context)
    
    # Add assistant response to conversation history
    conversation_history.append({
        "role": "assistant",
        "content": response
    })
    
    return response
