# Telegram Bot on Cloudflare Workers

A serverless Telegram bot running on Cloudflare Workers, featuring personality traits, memory, and learning capabilities.

## Features

- 🤖 Adaptive personality system with emotional states
- 🧠 Long-term memory using Cloudflare D1
- 📚 Learning system that adapts to user preferences
- 🔄 Dual AI provider support (Google AI and OpenRouter)
- 🚀 Serverless deployment on Cloudflare Workers
- 🔒 Secure environment variable handling

## Setup

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Configure Cloudflare:
```bash
npx wrangler login
```

4. Create D1 database:
```bash
npx wrangler d1 create bot-memory
```

5. Update `wrangler.toml` with your database ID

6. Create KV namespace:
```bash
npx wrangler kv:namespace create "SESSION_STORE"
```

7. Set your environment variables:
```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put GOOGLE_API_KEY
npx wrangler secret put OPENROUTER_API_KEY
```

## Development

Run locally:
```bash
npm run dev
```

## Deployment

The project uses GitHub Actions for automated deployment. Push to main to trigger deployment:

```bash
git push origin main
```

Or deploy manually:
```bash
npm run deploy
```

## Project Structure

```
.
├── .github/
│   └── workflows/
│       └── deploy.yml
├── src/
│   ├── services/
│   │   ├── memoryService.js      # Handles persistent storage
│   │   ├── personalityService.js # Manages bot personality
│   │   ├── learningService.js    # Adapts to user interactions
│   │   ├── googleAiService.js    # Google AI integration
│   │   └── openRouterService.js  # OpenRouter integration
│   ├── config/
│   │   └── config.js            # Configuration settings
│   ├── migrations/
│   │   └── 0001_initial.sql     # Database schema
│   └── index.js                 # Main worker entry point
├── wrangler.toml                # Cloudflare configuration
└── package.json
```

## Database Schema

### Memories
- Stores bot's memory entries
- Includes importance ranking and types
- Automatic timestamp tracking

### Interaction History
- Records user-bot conversations
- Helps in context maintenance
- Enables learning from past interactions

### User Preferences
- Stores user-specific settings
- Adapts bot behavior per user
- JSON-based preference storage

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - feel free to use and modify for your own projects
