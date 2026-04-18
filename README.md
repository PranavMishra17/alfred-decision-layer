# alfred_ — Decision Layer

The **alfred_ Decision Layer** operates as a hybrid determinist-LLM agentic guardrail system. It intercepts user intent, predicts risk constraints, manages active obligations (tasks requiring confirmation), and establishes a gating pipeline ensuring an autonomous assistant never acts dangerously on behalf of the user.

Designed entirely offline and evaluated via a stateful Next.js 14 Web Application Router, the project introduces a highly observable "Agent Mind Panel" to expose the inner reasoning loops, signals, and verdicts of the Agent.

---

## 🔥 Features & Capabilities

### 1. 5-Phase Gated Reasoning Pipeline 
All messages pushed to `alfred_` pass through the `/api/decide` Edge proxy pipeline. 
The timeline isolates risk systematically:
- **P0 | Ingest**: Validates request payloads and evaluates injection attacks using deterministic regex.
- **P1 | Hydrate**: Fetches system instructions and manages mock conversation traces locally without state bleed.
- **P2 | Reason**: Performs high-fidelity context evaluation utilizing `Anthropic Claude 3.5 Sonnet`, collapsing back safely to `Haiku` upon strict 12s timeouts.
- **P3 | Decide**: Parses P2 outputs through a strictly decoupled deterministic policy rule-engine, measuring contextual signals natively against customizable risk thresholds (`0.5` by default) to establish strict Outcomes.
- **P4 | Act**: Persists tool parameters across `localStorage` or injects `Obligation` objects into a transient visual store if confirmation is necessary.

### 2. Deep UI/UX Synchronization 
The Web UI incorporates dual-panel trace visualizations syncing deeply to an asynchronous SSE (Server-Sent Event) data stream.
- **Chat Panel**: The clean, consumer-facing conversational view.
- **Mind Panel**: A developer-focused debugger exposing granular event spans from `P0-P4` dynamically as the backend generator yields them.
- **Outcome Cards**: A robust Card system surfacing `CONFIRM`, `NOTIFY`, `CLARIFY`, and `REFUSE` flows into the user chat context automatically. Actions labeled `SILENT` simply trigger the tool safely out of sight.

### 3. Stateful "Obligation" Management
Tasks that hold consequences but require user validation are suspended as "Obligations" stored in a centralized `Zustand` module. These persist beautifully via cross-session `localStorage` memory and surface globally inside an intuitive "Obligation Drawer." 

### 4. Interactive Testing Vectors
- **Pre-loaded Scenarios**: 8 specifically curated user-interaction workflows. Simply tap a scenario (e.g., "Delete Database", "Check Calendar") atop a fresh Chat session to instantly prepopulate and assess system capabilities in a strictly defined failure environment.
- **Failure Injection Engine**: Integrated natively in the Application's `Settings` Sheet. Users can artificially force a backend P0 Validation Error (missing JSON), trigger an LLM Timeout locally, or artificially strip Mock Contexts to observe system resilience natively on the frontend without altering actual API conditions.

### 5. Native TTS Streaming (Cartesia.ai)
Includes natively streamed Web-Audio PCM parsing wrapped completely around UI text-token parsing loops. Gated completely onto logic outcomes (for example, `REFUSE` verdicts trigger full conversational dialog mapping via speech synthesis, whereas `SILENT` overrides bypass Cartesia to preserve pure autonomous runtime).

---

## 🛠️ Tech Stack Core

- **Framework**: `Next.js 14` (App Router, Edge API enabled)
- **UI Architecture**: React (Hooks), Vanilla CSS variable theming (Obsidian + Cream palettes — *No Tailwind dependencies bloat*).
- **Core LLM**: `Anthropic Claude 3.5 Sonnet`
- **State Store**: `Zustand` (+ strict sync hooks)
- **TTS Generator**: `Cartesia` (`PCM` stream arrays via pure HTTP web standard Fetch).

---

## 🚀 Local Deployment / Usage

**Prerequisites:** You will need an Anthropic API Key (to parse contexts) and optionally a Cartesia API Key (for Voice capabilities).

#### 1. Quick Start

Install dependencies natively.

```bash
npm install
npm run dev
```

The application mounts immediately at [http://localhost:3000](http://localhost:3000).

#### 2. BYOK Configuration (Bring Your Own Key)

API keys are **never** evaluated server-side permanently in this codebase's architecture. 

1. Launch the Chat interface.
2. Tap the `Settings` button located in the Top-Right Topbar.
3. Drop your Anthropic API Key.
4. Execute via `New Conversation` -> Choose a Pre-loaded `Scenario` -> Tap **Send**.

> **Note:** Advanced developer configurations (like enforcing `Haiku` instead of `Sonnet` or shifting risk `Thresholds` arbitrarily) are additionally adjustable on-the-fly dynamically inside the same Settings drawer.
