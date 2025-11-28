# 🤖 Voice Agentic RAG

An intelligent voice-powered transaction query system with **Nexa** - your AI assistant powered by advanced agentic AI, RAG (Retrieval-Augmented Generation), and multi-tool orchestration. Speak naturally to query data, generate charts, send reports, and get real-time information.

## 🌟 Features

- **🎙️ Voice-First Interface**: Natural voice conversations with Nexa powered by OpenAI's Realtime API
- **🤖 Agentic AI System**: Intelligent agent orchestration for complex queries
- **📊 Multi-Modal Responses**: Tables, charts, and structured data visualization
- **🔍 RAG Integration**: Retrieval-Augmented Generation for accurate, context-aware responses
- **🌐 Web Search**: Real-time information from the web
- **📧 Email Integration**: Send transaction reports via email
- **📈 Chart Generation**: Visual data representation (bar, line, pie charts)
- **⚡ Real-time Processing**: Fast and responsive AI-powered queries

## 🏗️ Architecture

### Frontend (React + TypeScript + Vite)
- Modern React 18 with TypeScript
- Vite for fast development and optimized builds
- TailwindCSS for styling
- Lucide React for icons
- Supabase integration

### Backend (Python + FastAPI)
- FastAPI for high-performance API
- OpenAI integration for AI capabilities
- Supabase for database operations
- Email service with Resend
- CORS enabled for cross-origin requests

## 📁 Project Structure

```
agentic-rag-app/
├── backend/                 # Python FastAPI backend
│   ├── main.py             # Main FastAPI application
│   ├── requirements.txt    # Python dependencies
│   └── Procfile           # Deployment configuration
├── src/                    # React frontend source
│   ├── components/        # React components
│   ├── services/          # API services
│   ├── config/            # Configuration files
│   └── App.tsx            # Main application
├── .agent/                # AI agent workflows
│   └── workflows/         # Deployment workflows
├── package.json           # Node.js dependencies
└── vite.config.ts         # Vite configuration
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- OpenAI API key
- Supabase account
- Resend API key (optional, for email features)

### Local Development

#### 1. Clone the repository

```bash
git clone https://github.com/sivakumarai2828/agentic-rag-app.git
cd agentic-rag-app
```

#### 2. Set up environment variables

Create a `.env` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Backend API URL (for production)
VITE_API_URL=http://localhost:8000

# OpenAI API Key (for backend)
OPENAI_API_KEY=sk-your-openai-key

# Email Service (optional)
RESEND_API_KEY=re-your-resend-key
```

#### 3. Run the Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python3 main.py
```

Backend runs on `http://localhost:8000`

#### 4. Run the Frontend

In a new terminal:

```bash
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

## 🌐 Deployment

This project is designed for separate frontend and backend deployments.

### Backend Deployment (Render)

1. Push code to GitHub
2. Create a new Web Service on [Render](https://render.com)
3. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables (see `.env` example above)
5. Deploy and copy your backend URL

📖 **Detailed Guide**: See `.agent/workflows/deploy-backend.md`

### Frontend Deployment (Vercel)

1. Import project to [Vercel](https://vercel.com)
2. Configure:
   - **Framework**: Vite (auto-detected)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add environment variables:
   - `VITE_API_URL`: Your deployed backend URL
   - `VITE_SUPABASE_URL`: Your Supabase URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase key
4. Deploy

📖 **Detailed Guide**: See `.agent/workflows/deploy-frontend.md`

## 🔧 Available Scripts

### Frontend

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Run ESLint
npm run typecheck  # Run TypeScript type checking
```

### Backend

```bash
python3 main.py    # Start FastAPI server
```

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Supabase** - Backend services
- **Lucide React** - Icons

### Backend
- **FastAPI** - Web framework
- **Python 3.9+** - Programming language
- **OpenAI** - AI capabilities
- **Supabase** - Database
- **Uvicorn** - ASGI server
- **Resend** - Email service

## 📚 API Endpoints

- `GET /` - Health check
- `POST /transaction-query` - Query transactions
- `POST /transaction-chart` - Generate transaction charts
- `POST /transaction-email` - Send transaction emails
- `POST /agent-orchestrator` - Orchestrate AI agents
- `POST /rag-retrieval` - RAG-based retrieval
- `POST /web-search-tool` - Web search functionality
- `POST /openai-chat` - OpenAI chat completion

## 🔐 Environment Variables

### Required
- `OPENAI_API_KEY` - OpenAI API key
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

### Optional
- `VITE_API_URL` - Backend API URL (for production)
- `RESEND_API_KEY` - Resend API key (for email features)

## 📖 Documentation

- [Deployment Guide](./DEPLOYMENT.md)
- [Backend Documentation](./BACKEND_DOCS.md)
- [Agent Flow Guide](./AGENT_FLOW_GUIDE.md)
- [No Hardcoded URLs](./NO_HARDCODED_URLS.md)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is private and proprietary.

## 👤 Author

**Sivakumar Kondapalle**
- GitHub: [@sivakumarai2828](https://github.com/sivakumarai2828)

## 🙏 Acknowledgments

- OpenAI for GPT models
- Supabase for backend infrastructure
- Vercel for frontend hosting
- Render for backend hosting

---

**Built with ❤️ using AI-powered development**
