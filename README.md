# AG-UI Chat Application

A modern chat application built with the AG-UI protocol, featuring real-time streaming responses from OpenAI.

## Tech Stack

- **Backend**: FastAPI + AG-UI Python SDK + OpenAI
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui + AG-UI Client SDK

## Quick Start

### Backend

```bash
# Install dependencies
uv sync

# Configure environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Start server (runs on http://localhost:8000)
uv run python -m backend.main
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (runs on http://localhost:5173)
npm run dev
```

## Features

- ✅ Real-time message streaming using AG-UI protocol
- ✅ OpenAI GPT-4 integration
- ✅ Premium dark theme UI with gradients and animations
- ✅ Tool call visualization
- ✅ Error handling and loading states
- ✅ Auto-scroll to latest messages
- ✅ Keyboard shortcuts (Enter to send)

## Architecture

The application uses the AG-UI protocol to standardize communication between the frontend and backend:

- **Backend** emits AG-UI events (`RUN_STARTED`, `TEXT_MESSAGE_CHUNK`, `RUN_FINISHED`)
- **Frontend** subscribes to these events via `HttpAgent` and updates the UI in real-time

## Documentation

See [walkthrough.md](../.gemini/antigravity/brain/7f3af993-d4f3-4658-86f7-68c640ef176e/walkthrough.md) for detailed documentation.

## Environment Variables

Create a `.env` file in the root directory:

```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=8000
```

## License

MIT
