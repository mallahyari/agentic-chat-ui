# Agentic Chat UI

A modern, production-ready chat application built with the AG-UI protocol, featuring real-time streaming responses and a beautiful, responsive interface.

![Chat UI Preview](https://img.shields.io/badge/React-18+-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green)

## ✨ Features

- 🚀 **Real-time Streaming** - Instant response streaming using AG-UI protocol
- 🎨 **Modern UI** - Beautiful gradient design with smooth animations
- 🤖 **AI Integration** - OpenAI GPT-4 powered conversations
- 📱 **Responsive** - Works seamlessly on desktop and mobile
- ⚡ **Fast** - Optimized performance with Vite and FastAPI
- 🎯 **Type-Safe** - Full TypeScript support
- 🔄 **Auto-scroll** - Smart scrolling to latest messages
- ⌨️ **Keyboard Shortcuts** - Enter to send, Shift+Enter for new line
- 🎭 **Step Visualization** - See agent thinking process in real-time

## 🏗️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful, accessible components
- **AG-UI Client SDK** - Protocol client implementation

### Backend
- **FastAPI** - High-performance Python API framework
- **AG-UI Python SDK** - Agent protocol server
- **OpenAI API** - GPT-4 integration
- **Python 3.11+** - Modern Python features

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- **uv** (Python package manager) - Install with: `curl -LsSf https://astral.sh/uv/install.sh | sh`
- **OpenAI API Key** - Get one from [OpenAI Platform](https://platform.openai.com/)

### 1. Clone the Repository

```bash
git clone https://github.com/mallahyari/agentic-chat-ui.git
cd agentic-chat-ui
```

### 2. Setup Backend

```bash
# Install Python dependencies
uv sync

# Create environment file
cd backend
cat > .env << EOF
OPENAI_API_KEY=your_openai_api_key_here
PORT=8000
EOF

# Start the backend server
cd ..
uv run python -m backend.app.main
```

The backend will start on **http://localhost:8000**

### 3. Setup Frontend

Open a new terminal:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will start on **http://localhost:5173**

### 4. Open Your Browser

Visit **http://localhost:5173** and start chatting!

## 📁 Project Structure

```
agentic-chat-ui/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   └── main.py           # FastAPI server & AG-UI integration
│   └── .env                   # Environment variables (create this)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatInput.tsx  # Chat input component
│   │   │   ├── ChatMessage.tsx # Message display component
│   │   │   └── ui/            # shadcn/ui components
│   │   ├── hooks/
│   │   │   └── useAgent.ts    # AG-UI client hook
│   │   ├── App.tsx            # Main app component
│   │   └── main.tsx           # Entry point
│   ├── package.json
│   └── vite.config.ts
├── pyproject.toml             # Python dependencies
├── uv.lock                    # Python lock file
└── README.md
```

## 🔧 Configuration

### Backend Environment Variables

Create `backend/.env`:

```env
# Required
OPENAI_API_KEY=sk-...          # Your OpenAI API key

# Optional
PORT=8000                       # Server port (default: 8000)
OPENAI_MODEL=gpt-4             # Model to use (default: gpt-4)
```

### Frontend Configuration

The frontend is pre-configured to connect to `http://localhost:8000`. To change this, update the `baseURL` in `frontend/src/hooks/useAgent.ts`.

## 🎯 Usage

1. **Send Messages** - Type your message and press Enter or click the send button
2. **Multi-line Input** - Press Shift+Enter to add a new line
3. **View Steps** - Click "Hide/Show steps" to see the agent's thinking process
4. **Streaming Responses** - Watch responses appear in real-time

## 🛠️ Development

### Backend Development

```bash
# Run with auto-reload
uv run uvicorn backend.app.main:app --reload --port 8000

# Run tests (if you add them)
uv run pytest
```

### Frontend Development

```bash
cd frontend

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 📦 Production Build

### Build Frontend

```bash
cd frontend
npm run build
# Output will be in frontend/dist/
```

### Deploy Backend

```bash
# Install production dependencies
uv sync --no-dev

# Run with production server
uv run uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

## 🎨 UI Components

The application uses modern UI patterns:

- **Gradient Backgrounds** - Smooth color transitions
- **Shadow Effects** - Depth and elevation
- **Hover Animations** - Interactive feedback
- **Scale Transitions** - Smooth size changes
- **Smart Scrolling** - Auto-scroll to new messages
- **Loading States** - Visual feedback during streaming

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [AG-UI Protocol](https://github.com/anthropics/agent-sdk) - Agent communication protocol
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful component library
- [OpenAI](https://openai.com/) - AI model provider
- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework

## 📧 Contact

Mehdi Allahyari - [@mallahyari](https://github.com/mallahyari)

Project Link: [https://github.com/mallahyari/agentic-chat-ui](https://github.com/mallahyari/agentic-chat-ui)

---

Built with ❤️ using React, TypeScript, FastAPI, and the AG-UI Protocol
