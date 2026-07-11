<div align="center">

# Agentic RAG Chatbot

**An intelligent multi-agent chatbot for PC hardware companies, powered by LangGraph & RAG**

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![LangChain](https://img.shields.io/badge/LangChain-🦜-1C3C3C)](https://langchain.com)
[![LangGraph](https://img.shields.io/badge/LangGraph-Agent_Framework-purple)](https://langchain-ai.github.io/langgraph/)

</div>

## Overview

Kadash is a full-stack **Agentic RAG** (Retrieval-Augmented Generation) chatbot designed for PC hardware companies. It uses a **multi-agent architecture** where a General Router Agent analyzes user queries and delegates them to the most appropriate specialized agent — whether that's searching the web, querying a product database, performing CRUD operations, or generating data visualizations.

### Key Features

- 🤖 **Multi-Agent Routing** — Intelligent query classification routes each message to the best-fit agent
- 🔍 **Web Search** — Real-time internet search via Tavily for up-to-date hardware info
- 🗃️ **RAG over SQL** — Natural language queries translated to SQL against the company's PostgreSQL product database
- ✏️ **CRUD Operations** — Admin-only agent for adding/modifying products in the database
- 📊 **Data Analysis & Visualization** — Generates charts and analytics via sandboxed Python execution in Docker
- 🔐 **Authentication** — JWT-based auth with role-based access control (Admin / User)
- 🌐 **Modern Frontend** — React SPA with chat UI, admin dashboard, and map integration

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                  │
│          :9001  —  Agent Chat │ Dashboard │ Auth Pages       │
└────────────────────────┬────────────────────────────────────┘
                         │  HTTP
          ┌──────────────┴──────────────┐
          │                             │
          ▼                             ▼
┌───────────────────┐        ┌────────────────────────────────┐
│   BackEnd (Node)  │        │      AI BackEnd (FastAPI)      │
│       :3000       │        │           :9000                │
│                   │        │                                │
│  • JWT Auth       │        │  ┌─────────────────────────┐   │
│  • PostgreSQL     │        │  │   General Router Agent  │   │
│  • Users & Data   │        │  │   (LangGraph + Groq)    │   │
│  • Security       │        │  └────┬──┬──┬──┬──────────┘   │
│    (Helmet, XSS,  │        │       │  │  │  │              │
│     Rate Limit)   │        │  ┌────▼──▼──▼──▼──────────┐   │
└───────────────────┘        │  │ Search │ RAG  │  CRUD  │   │
                             │  │ Agent  │Agent │ Agent  │   │
                             │  │        │      │        │   │
                             │  │  ┌─────┴──────┴────┐   │   │
                             │  │  │ Analysis Agent  │   │   │
                             │  │  │ (Docker sandbox)│   │   │
                             │  │  └─────────────────┘   │   │
                             │  └────────────────────────┘   │
                             └──────┬──────────┬─────────────┘
                                    │          │
                               ┌──────────┐  ┌───▼──────┐
                               │PostgreSQL│  │  Tavily  │
                               │ Database │  │ Web API  │
                               └──────────┘  └──────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **AI / Agents** | LangChain · LangGraph · OpenAI · Groq · Tavily |
| **AI Backend** | Python 3.11+ · FastAPI · Uvicorn · Pydantic · psycopg2 |
| **Backend** | Node.js · Express · pg (node-postgres) |
| **Frontend** | React 18 · Vite · Tailwind CSS · shadcn/ui · MUI |
| **Database** | PostgreSQL (products, users, orders) |
| **Security** | JWT · Helmet · XSS-Clean · Rate Limiting · bcrypt |
| **DevOps** | Docker (sandboxed Python execution · Render deployment) |

---

## Specialized Agents

The system uses a **LangGraph** state-machine workflow. Every incoming query first passes through the **General Router Agent**, which classifies intent and delegates to one of four specialized agents:

| Agent | Trigger | Capabilities | Access |
|---|---|---|---|
| **🔍 Search Agent** | Real-time / general knowledge queries | Web search via Tavily API | All users |
| **🗃️ RAG Agent** | Product info, pricing, availability | SQL toolkit + web search fallback | All users |
| **✏️ CRUD Agent** | "Add a product…", insert operations | Database write operations via backend API | Admin only |
| **📊 Analysis Agent** | "Show me sales trends…", data viz requests | SQL queries + Python code execution (matplotlib, pandas) in Docker | Admin only |

---

## Project Structure

```
📁 Project/
├── 📁 AI_BackEnd/              # Python — FastAPI + LangGraph agents
│   ├── main.py                 # FastAPI server & /query endpoint
│   ├── Agent/
│   │   └── AgenticWorkFlow.py  # Agent class hierarchy (General → Search/RAG/CRUD/Analysis)
│   ├── Prompt/                 # System prompts for each agent
│   ├── Tools/                  # Tool implementations (web search, CRUD, Python runner)
│   ├── DB/                     # PostgreSQL connection via psycopg2
│   ├── Utils/                  # Model loader, Tavily search wrapper
│   ├── Docker/                 # Dockerfile for sandboxed Python execution
│   └── req.txt                 # Python dependencies
│
├── 📁 BackEnd/                 # Node.js — Express REST API
│   ├── app.js                  # Express server setup
│   ├── controllers/            # Auth, public, and protected route handlers
│   ├── routes/                 # Route definitions (auth, no-auth, req-auth)
│   ├── middleware/             # JWT auth middleware, error handler
│   └── db/                     # PostgreSQL connection & schema init (pg)
│
├── 📁 FrontEnd/chatbot/        # React — Vite SPA
│   ├── src/
│   │   ├── pages/              # Agent chat, Dashboard, Login, Register
│   │   ├── App.jsx             # React Router setup
│   │   └── context.jsx         # Global auth context
│   └── index.html
│
└── README.md
```

---

## Getting Started

### Prerequisites

- **Python** 3.11+
- **Node.js** 16+
- **Docker** (for the Analysis Agent's sandboxed execution)
- **PostgreSQL 14+** (all data — products, users, orders)
- API keys for **OpenAI** / **Groq** and **Tavily**

### 1. Clone the Repository

```bash
git clone https://github.com/C1earVision/Agentic-RAG-project.git
cd Agentic-RAG-project
```

### 2. AI Backend (FastAPI)

```bash
cd AI_BackEnd

# Create a virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r req.txt

# Configure environment variables (see section below)
# Then start the server:
uvicorn main:app --reload --port 9000
```

### 3. Backend (Node.js)

```bash
cd BackEnd

npm install

# Configure .env (see section below)
npm start
```

> The backend runs on **port 3000** by default.

### 4. Frontend (React)

```bash
cd FrontEnd/chatbot

npm install
npm run dev -- --port 9001
```

> Open [http://localhost:9001](http://localhost:9001) in your browser.

### 5. Docker (Analysis Agent Sandbox)

Build the sandbox image used by the Analysis Agent to execute Python visualization code safely:

```bash
cd AI_BackEnd/Docker
docker build -t python-sandbox .
```

---

## Environment Variables

### AI Backend (`AI_BackEnd/.env`)

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key for LLM calls |
| `GROQ_API_KEY` | Groq API key (used for the router agent) |
| `TAVILY_API_KEY` | Tavily API key for web search |
| `API_URL` | Node.js backend base URL (e.g. `http://localhost:3000/api/v1`) |
| `DATABASE_SERVER` | PostgreSQL host |
| `DATABASE_PORT` | PostgreSQL port (default: `5432`) |
| `DATABASE_NAME` | PostgreSQL database name |
| `DATABASE_USER_NAME` | PostgreSQL username |
| `DATABASE_PASS` | PostgreSQL password |

### Backend (`BackEnd/.env`)

| Variable | Description |
|---|---|
| `JWT_SECRET` | Secret key for JWT token signing |
| `JWT_LIFETIME` | Token expiry (default: `30d`) |
| `PORT` | Server port (default: `3000`) |
| `DATABASE_SERVER` | PostgreSQL host |
| `DATABASE_PORT` | PostgreSQL port (default: `5432`) |
| `DATABASE_NAME` | PostgreSQL database name |
| `DATABASE_USER_NAME` | PostgreSQL username |
| `DATABASE_PASS` | PostgreSQL password |

---

## Usage

### Pages

| Route | Description | Access |
|---|---|---|
| `/agent` | Main chat interface — ask hardware questions | All authenticated users |
| `/dashboard` | Admin dashboard with analytics and management | Admin only |
| `/login` | User login | Public |
| `/register` | User registration | Public |

### Example Queries

| Query | Agent Used |
|---|---|
| *"What's the latest RTX 5090 benchmark?"* | 🔍 Search Agent |
| *"Show me all GPUs under $500"* | 🗃️ RAG Agent |
| *"Add a new product: RTX 4060 Ti at $399"* | ✏️ CRUD Agent (Admin) |
| *"Show me a chart of monthly sales trends"* | 📊 Analysis Agent (Admin) |

---

## API Reference

### AI Backend

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/query` | Send a user question; returns the answer and which agent was used |

**Request body:**
```json
{
  "question": "What GPUs do you have in stock?",
  "admin": false
}
```

**Response:**
```json
{
  "answer": "We currently have the following GPUs...",
  "agent": "use_rag_agent"
}
```

### Backend (Node.js)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | — | Register a new user |
| `POST` | `/api/v1/auth/login` | — | Login and receive JWT |
| `GET` | `/api/v1/*` | — | Public routes |
| `*` | `/api/v1/user/*` | JWT | Protected routes (CRUD, dashboard data) |

---
