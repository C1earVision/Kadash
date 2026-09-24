<div align="center">

# Kadash

**An intelligent multi-agent assistant & management platform for PC hardware business owners, powered by LangGraph & RAG**

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![LangChain](https://img.shields.io/badge/LangChain-🦜-1C3C3C)](https://langchain.com)
[![LangGraph](https://img.shields.io/badge/LangGraph-Agent_Framework-purple)](https://langchain-ai.github.io/langgraph/)

</div>

# Live Demo

https://kadash-chi.vercel.app/

Login Credentials for Live Demo:
Email: akali@gmaill.com || Password: akali


## Overview

Kadash is a full-stack **Agentic RAG** (Retrieval-Augmented Generation) assistant and management platform designed specifically for PC hardware business owners and store administrators. It uses a **multi-agent architecture** where a General Router Agent analyzes queries and delegates them to the most appropriate specialized agent — whether that's searching the web for real-time hardware benchmarks, querying catalog & inventory data via SQL, performing product CRUD operations, or generating visual sales and performance analytics.

### Key Features

- 🤖 **Multi-Agent Routing** — Intelligent query classification routes each message to the best-fit specialized agent
- 🔍 **Web Search** — Real-time internet search via Tavily for up-to-date hardware info and market benchmarks
- 🗃️ **RAG over SQL** — Natural language queries translated to SQL against the store's PostgreSQL product database
- ✏️ **Catalog CRUD Operations** — Dedicated agent tools for adding and updating products in the database
- 📊 **Data Analysis & Visualization** — Generates sales charts and business analytics via sandboxed Python execution in Docker
- 🔐 **Secure Business Authentication** — JWT-based authentication restricted to business owners / administrators
- 🌐 **Modern Business Dashboard** — React SPA integrating conversational agent intelligence with product and order management

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                  │
│          :9001  —  Agent Chat │ Dashboard │ Login Page      │
└────────────────────────┬────────────────────────────────────┘
                         │  HTTP
          ┌──────────────┴──────────────┐
          │                             │
          ▼                             ▼
┌───────────────────┐        ┌────────────────────────────────┐
│   BackEnd (Node)  │        │      AI BackEnd (FastAPI)      │
│       :3000       │        │           :9000                │
│                   │        │                                │
│  • Admin Auth     │        │  ┌─────────────────────────┐   │
│  • PostgreSQL     │        │  │   General Router Agent  │   │
│  • Products/Orders│        │  │   (LangGraph + Groq)    │   │
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
| **Database** | PostgreSQL (products, admin accounts, orders) |
| **Security** | JWT · Helmet · XSS-Clean · Rate Limiting · bcrypt |

---

## Specialized Agents

The system uses a **LangGraph** state-machine workflow. Every incoming query first passes through the **General Router Agent**, which classifies intent and delegates to one of four specialized agents:

| Agent | Trigger | Capabilities | Access |
|---|---|---|---|
| **🔍 Search Agent** | Real-time / market intelligence queries | Web search via Tavily API | Business Owners / Admins |
| **🗃️ RAG Agent** | Product info, pricing, availability | SQL toolkit + web search fallback | Business Owners / Admins |
| **✏️ CRUD Agent** | "Add a product…", catalog updates | Database write operations via backend API | Business Owners / Admins |
| **📊 Analysis Agent** | "Show me sales trends…", data viz requests | SQL queries + Python code execution (matplotlib, pandas) in Docker | Business Owners / Admins |

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
│   ├── controllers/            # Auth, product catalog, and admin order handlers
│   ├── routes/                 # Route definitions (auth, no-auth, req-auth)
│   ├── middleware/             # JWT auth middleware, error handler
│   └── db/                     # PostgreSQL connection & schema init (pg)
│
├── 📁 FrontEnd/chatbot/        # React — Vite SPA
│   ├── src/
│   │   ├── pages/              # Agent chat, Management dashboard, Login
│   │   ├── App.jsx             # React Router setup
│   │   └── context.jsx         # Global context
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
- **PostgreSQL 14+** (products, admin accounts, orders)
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
| `DATABASE_SERVER` | PostgreSQL host (Supabase: **Session pooler** host, e.g. `aws-0-xx.pooler.supabase.com`) |
| `DATABASE_PORT` | PostgreSQL port (`5432` for Supabase Session pooler) |
| `DATABASE_NAME` | PostgreSQL database name (`postgres` on Supabase) |
| `DATABASE_USER_NAME` | PostgreSQL username (`postgres.your-project-ref` on Supabase pooler) |
| `DATABASE_PASS` | PostgreSQL password |
| `DATABASE_SSL` | Set to `true` for Supabase (auto-detected if host contains `supabase`) |

**Common Vercel mistake:** putting `postgres.xxxx` in `DATABASE_SERVER`. That value belongs in `DATABASE_USER_NAME`; the pooler hostname goes in `DATABASE_SERVER`.

### Backend (`BackEnd/.env`)

| Variable | Description |
|---|---|
| `JWT_SECRET` | Secret key for JWT token signing |
| `JWT_LIFETIME` | Token expiry (default: `30d`) |
| `PORT` | Server port (default: `3000`) |
| `DATABASE_SERVER` | PostgreSQL host (Supabase: **Session pooler** host) |
| `DATABASE_PORT` | PostgreSQL port (default: `5432`) |
| `DATABASE_NAME` | PostgreSQL database name |
| `DATABASE_USER_NAME` | PostgreSQL username (`postgres.your-project-ref` with Supabase pooler) |
| `DATABASE_PASS` | PostgreSQL password |
| `DATABASE_SSL` | Set to `true` for Supabase (auto-detected if host contains `supabase`) |

---

## Usage

### Pages

| Route | Description | Access |
|---|---|---|
| `/agent` | Business owner agent chat interface & management dashboard | Authenticated Business Owners |
| `/` | Business owner login | Public |

### Example Queries

| Query | Agent Used |
|---|---|
| *"What's the latest RTX 5090 benchmark?"* | 🔍 Search Agent |
| *"Show me all GPUs under $500"* | 🗃️ RAG Agent |
| *"Add a new product: RTX 4060 Ti at $399"* | ✏️ CRUD Agent |
| *"Show me a chart of monthly sales trends"* | 📊 Analysis Agent |

---

## API Reference

### AI Backend

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/query` | Send a query; returns the answer and which agent was used |

**Request body:**
```json
{
  "question": "Show monthly sales for GPUs",
  "admin": true
}
```

**Response:**
```json
{
  "answer": "Here is the sales analysis...",
  "agent": "use_data_analysis_and_visualization_agent",
  "image": "http://127.0.0.1:9000/visualizations/xxx"
}
```

### Backend (Node.js)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | — | Login for business owners and receive JWT |
| `GET` | `/api/v1/products` | — | Public product catalog query |
| `*` | `/api/v1/user/*` | JWT | Protected business owner routes (product CRUD, orders) |

---

### Local development

Copy the `.env.example` files to `.env` in each service folder. The frontend falls back to `localhost:3000` and `127.0.0.1:9000` when `VITE_*` vars are not set.

---
