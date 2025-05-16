import json
import aiohttp
from typing import List, Dict, Any
from config.config import OPENROUTER_API_URL, OPENROUTER_HEADERS, MODEL_NAME

async def generate_response(messages: List[Dict[str, str]]) -> str:
    """
    Generate a response using the OpenRouter API.
    """
    payload = {
        "model": MODEL_NAME,
        "messages": messages
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                OPENROUTER_API_URL,
                headers=OPENROUTER_HEADERS,
                json=payload
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    if "choices" in result and len(result["choices"]) > 0:
                        return result["choices"][0]["message"]["content"]
                    else:
                        return "I couldn't generate a response. Please try again."
                else:
                    error_text = await response.text()
                    print(f"Error from OpenRouter API: {error_text}")
                    return "There was an error processing your request. Please try again."
                    
    except Exception as e:
        print(f"Error generating response: {str(e)}")
        return "Sorry, there was an error processing your request. Please try again later."

async def process_message(user_message: str, conversation_history: List[Dict[str, str]]) -> str:
    """
    Process a message and maintain conversation history.
    """
    # Add user message to conversation history
    conversation_history.append({
        "role": "user",
        "content": user_message
    })
    
    # Generate response
    response = await generate_response(conversation_history)
    
    # Add assistant response to conversation history
    conversation_history.append({
        "role": "assistant",
        "content": response
    })
    
    return response
