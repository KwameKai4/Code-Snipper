import logging
import sys
import random
from typing import Dict
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, ContextTypes, filters
from config.secrets import TELEGRAM_BOT_TOKEN
from config.config import (
    MAX_CONVERSATION_LENGTH, DATABASE_PATH,
    PERSONALITY_SETTINGS, LEARNING_SETTINGS, MEMORY_SETTINGS
)
from services.google_ai_service import process_message, init_services
from services.memory_service import MemoryService
from services.personality_service import PersonalityService, PersonalityTrait, EmotionalState
from services.learning_service import LearningService

# Enable logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Initialize services
memory_service = MemoryService(DATABASE_PATH)
personality_service = PersonalityService()
learning_service = LearningService()

# Store conversation histories for each user
conversation_histories: Dict[int, list] = {}

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Send a message when the command /start is issued."""
    user = update.effective_user
    await memory_service.initialize()  # Initialize database tables
    
    welcome_message = (
        f"Hello {user.first_name}! 😊 I'm your AI assistant with personality and learning capabilities.\n\n"
        f"I can learn from our conversations and adapt to your preferences. "
        f"Currently feeling {personality_service.get_current_state().value}!"
    )
    
    await update.message.reply_text(welcome_message)
    conversation_histories[user.id] = []

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Send a message when the command /help is issued."""
    help_text = """
Available commands:

Basic Commands:
/start - Start the conversation
/help - Show this help message
/clear - Clear conversation history

Personality & Learning:
/personality - View my personality traits
/mood - Check my current emotional state
/remember <topic> - Store important information
/forget <topic> - Remove stored information
/stats - View interaction statistics
/sync - Update my learning preferences

You can:
- Have natural conversations
- Share your views and opinions
- Ask questions
- Get assistance with tasks
- Watch me learn and adapt to your style!

I'll remember our interactions and adapt my personality to better match our conversations.
Just start chatting! 😊
    """
    await update.message.reply_text(help_text)

async def clear_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Clear the conversation history and learned data for the user."""
    user = update.effective_user
    conversation_histories[user.id] = []
    await memory_service.clear_user_data(user.id)
    learning_service.clear_user_data(user.id)
    
    await update.message.reply_text("Memory cleared! Let's start fresh. 🌟")

async def personality_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """View or adjust personality traits."""
    summary = personality_service.get_personality_summary()
    
    response = (
        f"Current Personality State:\n\n"
        f"Emotional State: {summary['emotional_state']}\n\n"
        f"Traits:\n"
    )
    
    for trait, value in summary['traits'].items():
        response += f"- {trait}: {'█' * int(value * 10)}{' ' * (10 - int(value * 10))} ({value:.1f})\n"
    
    await update.message.reply_text(response)

async def mood_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Check the current emotional state."""
    current_state = personality_service.get_current_state()
    style = personality_service.get_response_style()
    
    response = (
        f"Current Mood: {current_state.value}\n"
        f"{random.choice(style['expressions'])}\n\n"
        f"I'm feeling quite {current_state.value} right now!"
    )
    
    await update.message.reply_text(response)

async def remember_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Store important information."""
    user = update.effective_user
    args = context.args
    
    if not args:
        await update.message.reply_text("Please specify what to remember: /remember <your text>")
        return
    
    content = " ".join(args)
    await memory_service.store_memory(user.id, content, "user_note", importance=1.0)
    learning_service.process_message(user.id, content)
    
    await update.message.reply_text(f"I'll remember that! 📝\n\nStored: {content}")

async def forget_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Remove specific stored information."""
    user = update.effective_user
    args = context.args
    
    if not args:
        memories = await memory_service.get_memories(user.id, limit=5)
        if not memories:
            await update.message.reply_text("No memories stored yet!")
            return
            
        response = "Recent memories:\n\n"
        for memory in memories:
            response += f"{memory['id']}: {memory['content']}\n"
        response += "\nTo forget a specific memory, use: /forget <memory_id>"
        await update.message.reply_text(response)
        return
    
    try:
        memory_id = int(args[0])
        success = await memory_service.delete_memory(user.id, memory_id)
        if success:
            await update.message.reply_text("Memory forgotten! 🗑️")
        else:
            await update.message.reply_text("Memory not found or already forgotten.")
    except ValueError:
        await update.message.reply_text("Please provide a valid memory ID.")

async def stats_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """View interaction statistics and learned information."""
    user = update.effective_user
    
    # Get learned information
    learning_context = learning_service.get_response_context(user.id)
    recent_interactions = await memory_service.get_recent_interactions(user.id)
    
    stats = (
        f"Interaction Statistics:\n\n"
        f"Top Topics of Interest:\n"
    )
    
    for topic in learning_context['topics']:
        stats += f"- {topic}\n"
    
    stats += f"\nCommon Interaction Patterns:\n"
    for word, count in learning_context['patterns'].items():
        stats += f"- {word}: {count} times\n"
    
    stats += f"\nRecent Interactions: {len(recent_interactions)}"
    
    await update.message.reply_text(stats)

async def sync_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Update learning preferences and synchronize personality."""
    user = update.effective_user
    
    # Analyze recent interactions
    recent_interactions = await memory_service.get_recent_interactions(user.id)
    for interaction in recent_interactions:
        learning_service.process_message(user.id, interaction['message'])
        personality_service.adapt_to_user(interaction['message'])
    
    response = (
        f"Synchronized! 🔄\n\n"
        f"I've updated my understanding based on our recent interactions.\n"
        f"Current mood: {personality_service.get_current_state().value}"
    )
    
    await update.message.reply_text(response)

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle incoming messages with personality and learning."""
    user = update.effective_user
    message = update.message

    # Initialize conversation history for new users
    if user.id not in conversation_histories:
        conversation_histories[user.id] = []

    # Get user's message
    if message.text:
        user_message = message.text
    else:
        await message.reply_text("Sorry, I can only process text messages at the moment.")
        return

    try:
        # Process message through learning service
        learning_context = learning_service.process_message(user.id, user_message)
        
        # Update personality based on message
        personality_service.adapt_to_user(user_message)
        
        # Store interaction
        await memory_service.store_interaction(user.id, user_message, "")
        
        # Maintain conversation history size
        if len(conversation_histories[user.id]) >= MAX_CONVERSATION_LENGTH * 2:
            conversation_histories[user.id] = conversation_histories[user.id][-MAX_CONVERSATION_LENGTH * 2:]

        # Let user know we're processing their message
        await message.chat.send_action(action="typing")
        
        # Process message and get response
        response = await process_message(user_message, conversation_histories[user.id], user.id)
        
        # Modulate response based on personality
        response = personality_service.modulate_response(response)
        
        # Adapt response based on learned preferences
        response = learning_service.adapt_response(user.id, response)
        
        # Store the bot's response in interaction history
        await memory_service.store_interaction(user.id, user_message, response)
        
        # Send response back to user
        await message.reply_text(response)
        
    except Exception as e:
        logger.error(f"Error processing message: {str(e)}")
        await message.reply_text(
            "Sorry, I encountered an error. Please try again later. "
            f"I was feeling {personality_service.get_current_state().value} too! 😅"
        )

def main() -> None:
    """Start the bot."""
    # Create the Application
    application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()

    # Add handlers for basic commands
    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("clear", clear_command))
    
    # Add handlers for personality and learning commands
    application.add_handler(CommandHandler("personality", personality_command))
    application.add_handler(CommandHandler("mood", mood_command))
    application.add_handler(CommandHandler("remember", remember_command))
    application.add_handler(CommandHandler("forget", forget_command))
    application.add_handler(CommandHandler("stats", stats_command))
    application.add_handler(CommandHandler("sync", sync_command))
    
    # Message handler
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    # Initialize AI service with our custom services
    init_services(memory_service, personality_service, learning_service)

    # Run the bot
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()
