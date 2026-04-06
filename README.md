<p align="center">
  <h1 align="center">📈 Sentiment Analysis Server</h1>
  <p align="center">
    An AI-powered multi-agent stock sentiment analysis engine built with Express, Prisma, BullMQ, and Google Gemini.
  </p>
</p>

---

## 🧠 Overview

**Sentiment Server** is a backend system that orchestrates multiple AI agents to perform collaborative stock/asset sentiment analysis. When a user submits a ticker symbol, the system:

1. **Collects market data** — news headlines, price action, and social sentiment
2. **Deploys specialized AI agents** — each with a distinct investment philosophy (value investing, momentum trading, contrarian strategy)
3. **Generates AI-backed reasoning** — using Google Gemini (1.5 Flash) for each agent's perspective
4. **Produces a consensus decision** — a weighted BUY / SELL / HOLD recommendation with confidence scores, risk levels, stop-loss, and take-profit levels

All analysis runs are processed asynchronously via a BullMQ job queue backed by Redis, and results are persisted in PostgreSQL via Prisma ORM.

---

## 🏗️ Architecture

```
┌──────────────┐     POST /api/analysis      ┌──────────────────┐
│   Client     │ ──────────────────────────►  │  Express API     │
└──────────────┘                              │  (app.ts)        │
       │                                      └────────┬─────────┘
       │  GET /api/runs/:id (poll)                     │
       │◄──────────────────────────────────────────────┤
       │                                               │ enqueue job
       │                                      ┌────────▼─────────┐
       │                                      │  Redis + BullMQ  │
       │                                      │  Job Queue       │
       │                                      └────────┬─────────┘
       │                                               │
       │                                      ┌────────▼─────────┐
       │                                      │  Analysis Worker │
       │                                      │  (separate proc) │
       │                                      └────────┬─────────┘
       │                                               │
       │                              ┌────────────────┼────────────────┐
       │                              │                │                │
       │                     ┌────────▼──┐    ┌───────▼───┐   ┌───────▼────┐
       │                     │  News     │    │  Price    │   │  Social   │
       │                     │  Service  │    │  Service  │   │  Service  │
       │                     └────────┬──┘    └───────┬───┘   └───────┬────┘
       │                              │               │               │
       │                              └───────────────┼───────────────┘
       │                                              │ dataset
       │                                     ┌────────▼─────────┐
       │                                     │  Orchestrator    │
       │                                     │  (AI Agents)     │
       │                                     │  ┌─────────────┐ │
       │                                     │  │ Gemini 1.5  │ │
       │                                     │  │ Flash LLM   │ │
       │                                     │  └─────────────┘ │
       │                                     └────────┬─────────┘
       │                                              │ results
       │                                     ┌────────▼─────────┐
       │                                     │  PostgreSQL      │
       │                                     │  (Prisma ORM)    │
       │                                     └──────────────────┘
```

---

## 🤖 AI Agents

The orchestrator deploys **three specialized AI agents**, each powered by Google Gemini, with distinct investment philosophies:

| Agent | Role | Focus |
|-------|------|-------|
| **Long-Term Value Investor** | `value_investor` | Fundamental analysis, intrinsic value, margin of safety |
| **Momentum Swing Trader** | `momentum_trader` | Short-term price momentum, RSI, MACD signals |
| **Contrarian Risk Strategist** | `contrarian` | Fading the crowd, identifying over-extended moves |

Additionally, the system includes prompt templates for future agent expansion:

| Prompt Template | Description |
|-----------------|-------------|
| `chief-risk-manager` | Risk assessment, position sizing, stop-loss strategy |
| `debate-moderator` | Synthesizes bull vs. bear arguments objectively |
| `web-surfer` | Web research for news, price action, and social context |

### Consensus Engine

Each agent produces a **sentiment score** (−1 to +1) and a **confidence level** (0–100%). The orchestrator then:

- Averages agent scores with configurable weights
- Determines the final action: `BUY` (score > 0.2), `SELL` (score < −0.2), or `HOLD`
- Calculates portfolio allocation (5–30%), stop-loss (−6%), and take-profit (+10%) levels
- Assigns a risk level (`LOW` / `MODERATE` / `HIGH`)

---

## 📂 Project Structure

```
server/
├── prisma/
│   ├── schema.prisma              # Database schema (AnalysisRun, AnalysisArchive)
│   └── migrations/                # Prisma migration files
├── src/
│   ├── app.ts                     # Express app factory
│   ├── server.ts                  # HTTP server bootstrap & graceful shutdown
│   ├── config/
│   │   ├── db.ts                  # PostgreSQL + Prisma client setup
│   │   ├── env.ts                 # Zod-validated environment variables
│   │   ├── logger.ts              # Pino logger (pretty-print in dev)
│   │   └── redis.ts               # IORedis connection
│   ├── controllers/
│   │   ├── analysis.controller.ts # POST /api/analysis — trigger a run
│   │   ├── chatbot.controller.ts  # POST /api/chat — Gemini chatbot
│   │   ├── health.controller.ts   # GET /api/health
│   │   └── runs.controller.ts     # GET/DELETE /api/runs
│   ├── middleware/
│   │   ├── error.middleware.ts     # Global error handler (Zod + AppError)
│   │   ├── not-found.middleware.ts # 404 fallback
│   │   ├── rate-limit.middleware.ts# Rate limiter (10 req/min on analysis)
│   │   ├── request-id.middleware.ts# UUID request tracing
│   │   └── validate.middleware.ts  # Zod body validation
│   ├── routes/
│   │   ├── index.ts               # Route aggregator
│   │   ├── analysis.routes.ts     # Analysis endpoints
│   │   ├── chatbot.routes.ts      # Chat endpoints
│   │   ├── health.routes.ts       # Health check
│   │   └── runs.routes.ts         # Run management endpoints
│   ├── schemas/
│   │   └── analysis.schema.ts     # Zod request schemas
│   ├── repositories/
│   │   ├── analysis-run.repository.ts    # CRUD for AnalysisRun
│   │   └── analysis-archive.repository.ts# CRUD for AnalysisArchive
│   ├── services/
│   │   ├── agents/
│   │   │   ├── orchestrator.service.ts   # Multi-agent orchestration + Gemini
│   │   │   ├── parsers/
│   │   │   │   ├── agent-output.parser.ts # Zod validation for agent output
│   │   │   │   └── consensus.parser.ts    # Zod validation for consensus
│   │   │   └── prompts/
│   │   │       ├── value-investor.prompt.ts
│   │   │       ├── momentum-trader.prompt.ts
│   │   │       ├── contrarian.prompt.ts
│   │   │       ├── chief-risk-manager.prompt.ts
│   │   │       ├── debate-moderator.prompt.ts
│   │   │       └── web-surfer.prompt.ts
│   │   ├── analysis/
│   │   │   ├── analysis.service.ts       # Trigger, get, list, cancel, stats
│   │   │   ├── run-analysis.service.ts   # Core analysis execution pipeline
│   │   │   ├── dataset.service.ts        # Aggregates market data sources
│   │   │   ├── queue.service.ts          # BullMQ job enqueue
│   │   │   └── polling.service.ts        # Poll URL builder
│   │   └── market/
│   │       ├── news.service.ts           # News headline provider (mock)
│   │       ├── price.service.ts          # Price/RSI/MACD data (mock)
│   │       └── social.service.ts         # Social sentiment data (mock)
│   ├── jobs/
│   │   ├── processors/
│   │   │   └── run-analysis.processor.ts # Job processor logic
│   │   └── workers/
│   │       └── analysis.worker.ts        # BullMQ worker process
│   ├── lib/
│   │   ├── errors/
│   │   │   └── app-error.ts              # Custom AppError class
│   │   └── utils/
│   │       └── time.ts                   # Time utilities
│   ├── types/
│   │   ├── analysis.types.ts             # Core domain types
│   │   └── api.types.ts                  # API response types
│   └── tests/
│       ├── integration/
│       │   └── health.test.ts
│       └── unit/
│           └── consensus-parser.test.ts
├── docker-compose.yml                    # PostgreSQL 16 + Redis 7
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── prisma.config.ts
├── .env.example
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Docker** & **Docker Compose** (for PostgreSQL and Redis)
- **Google API Key** (for Gemini LLM)

### 1. Clone the Repository

```bash
git clone https://github.com/Ravi8043/orchestration_agents.git
cd orchestration_agents
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example file and fill in your keys:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `5000` |
| `LOG_LEVEL` | Pino log level | `info` |
| `DATABASE_URL` | PostgreSQL connection string | *(required)* |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `ANALYSIS_QUEUE_NAME` | BullMQ queue name | `analysis-runs` |
| `ANALYSIS_RETRY_ATTEMPTS` | Job retry count | `2` |
| `ANALYSIS_BACKOFF_MS` | Retry backoff in ms | `30000` |
| `LLM_PROVIDER` | LLM provider name | `openai` |
| `LLM_MODEL` | LLM model identifier | `gpt-5-mini` |
| `OPENAI_API_KEY` | OpenAI API key | *(optional)* |
| `GOOGLE_API_KEY` | Google Gemini API key | *(optional — required for AI agents)* |
| `TAVILY_API_KEY` | Tavily search API key | *(optional)* |

### 4. Start Infrastructure (PostgreSQL + Redis)

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL 16** on port `5432`
- **Redis 7** on port `6379`

### 5. Set Up the Database

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 6. Start the Server

```bash
# Start the API server (with hot-reload)
npm run dev

# In a separate terminal, start the background worker
npm run dev:worker
```

The API server starts on `http://localhost:5000` (or the port configured in `.env`).

---

## 📡 API Endpoints

### Health Check

```http
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "service": "sentiment-server",
  "version": "1.0.0",
  "timestamp": "2026-04-06T18:00:00.000Z"
}
```

### Trigger Analysis

```http
POST /api/analysis
Content-Type: application/json

{
  "ticker": "AAPL",
  "timeframe": "30d",
  "includeSocial": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ticker` | `string` | ✅ | Stock ticker (1–10 chars, alphanumeric) |
| `timeframe` | `enum` | ❌ | `1d`, `5d`, `7d`, `30d`, `90d`, `1y`, `2y`, `5y` (default: `30d`) |
| `includeSocial` | `boolean` | ❌ | Include social sentiment data (default: `true`) |

**Response (202 Accepted):**
```json
{
  "runId": "uuid",
  "status": "RUNNING",
  "estimatedTime": 45,
  "pollUrl": "/api/runs/uuid"
}
```

### Poll Run Status

```http
GET /api/runs/:id
```

**Response (when completed):**
```json
{
  "runId": "uuid",
  "ticker": "AAPL",
  "timeframe": "30d",
  "includeSocial": true,
  "status": "COMPLETED",
  "agents": [
    {
      "name": "Long-Term Value Investor",
      "role": "value_investor",
      "score": 0.24,
      "confidence": 68,
      "reasoning": "AI-generated reasoning...",
      "bullCase": "...",
      "bearCase": "..."
    }
  ],
  "consensus": {
    "score": 0.18,
    "action": "HOLD",
    "confidence": 72,
    "allocation": 0,
    "riskLevel": "MODERATE",
    "stopLoss": null,
    "takeProfit": null,
    "timeHorizon": "wait-and-watch",
    "keyRisks": ["Market-wide volatility", "..."]
  }
}
```

### List Runs

```http
GET /api/runs?limit=20&ticker=AAPL&status=COMPLETED
```

### Cancel a Run

```http
DELETE /api/runs/:id
```

### Get Statistics

```http
GET /api/stats
```

**Response:**
```json
{
  "totalRuns": 42,
  "completedRuns": 35,
  "failedRuns": 3,
  "pendingRuns": 4,
  "topTickers": [{ "ticker": "AAPL", "count": 12 }],
  "runsLast24h": 8
}
```

### Chatbot

```http
POST /api/chat
Content-Type: application/json

{
  "message": "What do you think about NVDA's growth prospects?"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reply": "AI-generated response..."
  }
}
```

---

## ⚙️ Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| **Dev Server** | `npm run dev` | Start API server with hot-reload (tsx watch) |
| **Dev Worker** | `npm run dev:worker` | Start BullMQ worker with hot-reload |
| **Build** | `npm run build` | Compile TypeScript to `dist/` |
| **Start** | `npm start` | Run production API server |
| **Start Worker** | `npm run start:worker` | Run production worker |
| **Lint** | `npm run lint` | Type-check with `tsc --noEmit` |
| **Test** | `npm run test` | Run tests with Vitest |
| **Test Watch** | `npm run test:watch` | Run tests in watch mode |
| **Prisma Generate** | `npm run prisma:generate` | Generate Prisma client |
| **Prisma Migrate** | `npm run prisma:migrate` | Run database migrations |
| **Prisma Studio** | `npm run prisma:studio` | Open Prisma Studio GUI |

---

## 🗄️ Database Schema

The application uses two main models:

### `AnalysisRun`

Stores each analysis request and its results.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` | Primary key |
| `ticker` | `VARCHAR(10)` | Stock ticker symbol |
| `timeframe` | `VARCHAR(10)` | Analysis timeframe (default: `30d`) |
| `includeSocial` | `BOOLEAN` | Whether social data was included |
| `status` | `ENUM` | `PENDING` → `RUNNING` → `COMPLETED` / `FAILED` / `CANCELLED` |
| `agentOutputs` | `JSON` | Array of agent analysis results |
| `consensusData` | `JSON` | Final consensus decision |
| `errorMessage` | `TEXT` | Error details (on failure) |
| `retryCount` | `INT` | Number of retry attempts |
| `llmModel` | `VARCHAR(100)` | LLM model used |
| `newsSourcesCount` | `INT` | Number of news sources processed |
| `priceDataPoints` | `INT` | Number of price data points |
| `createdAt` | `TIMESTAMP` | Record creation time |
| `startedAt` | `TIMESTAMP` | When processing began |
| `completedAt` | `TIMESTAMP` | When processing ended |
| `executionTimeSec` | `INT` | Total execution time in seconds |

### `AnalysisArchive`

Archives completed analyses for historical tracking and backtesting.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` | Primary key |
| `analysisRunId` | `UUID` | Foreign key → `AnalysisRun` (cascade delete) |
| `archivedAt` | `TIMESTAMP` | Archive timestamp |
| `actualOutcome` | `TEXT` | Real-world outcome after the analysis |
| `actualPriceChange` | `FLOAT` | Actual price change for backtesting |

---

## 🛡️ Middleware Stack

| Middleware | Purpose |
|------------|---------|
| `express.json()` | JSON body parsing |
| `requestIdMiddleware` | Attaches UUID (`x-request-id` header) for request tracing |
| `pino-http` | Structured HTTP request logging |
| `analysisRateLimiter` | Rate limiting: 10 requests/minute on analysis endpoint |
| `validateBody` | Zod schema validation for request bodies |
| `notFoundMiddleware` | Returns 404 for unmatched routes |
| `errorMiddleware` | Global error handler (ZodError, AppError, unhandled) |

---

## 🧪 Testing

Tests are written with **Vitest** and include both unit and integration tests:

```bash
# Run all tests
npm run test

# Run in watch mode
npm run test:watch
```

- **Unit tests**: `src/tests/unit/` — parser validation, utility functions
- **Integration tests**: `src/tests/integration/` — health endpoint testing

---

## 🐳 Docker

The `docker-compose.yml` provides local development infrastructure:

```bash
# Start PostgreSQL + Redis
docker-compose up -d

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

| Service | Image | Port |
|---------|-------|------|
| PostgreSQL | `postgres:16-alpine` | `5432` |
| Redis | `redis:7-alpine` | `6379` |

---

## 🔧 Tech Stack

| Technology | Purpose |
|------------|---------|
| **TypeScript** | Language (strict mode, ES2022, NodeNext modules) |
| **Express 4** | HTTP framework |
| **Prisma 7** | ORM + PostgreSQL adapter (`@prisma/adapter-pg`) |
| **BullMQ** | Job queue for async analysis processing |
| **IORedis** | Redis client |
| **Google Generative AI** | Gemini 1.5 Flash for AI agent reasoning |
| **Zod** | Runtime schema validation |
| **Pino** | Structured JSON logging (with `pino-pretty` in dev) |
| **Vitest** | Test framework |
| **tsx** | TypeScript execution & hot-reload |
| **Docker Compose** | Local infrastructure (Postgres + Redis) |

---

## 📄 License

This project is private and proprietary.

---

<p align="center">
  Built with ❤️ using TypeScript, Express, Prisma, BullMQ, and Google Gemini
</p>
