# AI Program Guessing Game

A real-time competitive game where two players analyze code snippets and try to describe what the program does.

## Features

- Real-time multiplayer game using Supabase Realtime
- AI-powered evaluation of player answers using OpenAI's GPT-4o
- Code snippets from popular GitHub repositories
- Dynamic time limits based on code complexity
- Score tracking and round-based gameplay

## How to Play

1. **Create a Game**: Select the number of rounds and create a new game
2. **Invite a Friend**: Share the 5-digit game code with another player
3. **Start the Game**: Once both players join, the host can start the game
4. **Each Round**:
   - Both players are shown the same code snippet
   - Write what you think the program does within the time limit
   - AI evaluates both answers and determines which is closer to the actual functionality
   - The player with the more accurate description wins the round
5. **Win the Game**: The player who wins the most rounds wins the game

## Setup

### 1. Configure Supabase

1. Create a new Supabase project
2. Get your project URL and anon key
3. Create the required tables by running the SQL migrations

### 2. Configure OpenAI

1. Get an OpenAI API key
2. Add it to your environment variables

### 3. Environment Variables

Create a `.env.local` file with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
OPENAI_API_KEY=your-openai-api-key
```

### 4. Run the Application

```bash
npm install
npm run dev
```

## Technologies Used

- Next.js 13 (App Router)
- TypeScript
- Supabase (Database, Realtime)
- OpenAI API (GPT-4o)
- Tailwind CSS
- shadcn/ui components