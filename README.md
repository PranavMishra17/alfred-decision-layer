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
- **P5 | Stream**: Serves Server-Sent Events natively to the client, bridging standard UI rendering alongside a dedicated `MindPanel` Trace UI and `Cartesia` Voice streamings.

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

The execution platform natively pulls validation credentials natively via `.env` fallback. 
If no dotfiles are set:
1. Launch the Chat interface.
2. Tap the `Settings` button located in the Top-Right Topbar.
3. Drop your Anthropic API Key.
4. Execute via `New Conversation` -> Choose a Pre-loaded `Scenario` -> Tap **Send**.

> **Note:** Advanced developer configurations (like enforcing `Haiku` instead of `Sonnet` or shifting risk `Thresholds` arbitrarily) are additionally adjustable on-the-fly dynamically inside the same Settings drawer.

---

## 🧠 Decision Layer Architecture

### Trace Event Event-Bus
The backend orchestrates states asynchronously without coupling state properties natively per class block via a purely streamed event-bus mechanism bridging `route.ts`. 

```mermaid
sequenceDiagram
    participant User
    participant Chat UI
    participant Mind UI
    participant /api/decide
    participant TraceBus
    participant Claude
    
    User->>Chat UI: "Execute Scenario"
    Chat UI->>/api/decide: POST /api/decide (SSE)
    /api/decide->>TraceBus: Instantiate Generator
    
    TraceBus-->>Mind UI: [P0] Ingest Start
    TraceBus-->>Mind UI: [P1] Hydration Start
    
    /api/decide->>Claude: Invoke Sonnet
    Claude-->>/api/decide: Stream JSON Delta Tokens
    
    loop Stream Yield
        /api/decide->>TraceBus: Emit Token
        TraceBus-->>Chat UI: render.token (Appends Message)
    end
    
    /api/decide->>TraceBus: [P3] Deterministic Policy Check
    TraceBus-->>Chat UI: decide.verdict (Renders Outcome Card)
    TraceBus-->>Chat UI: render.done
```

---

## 🔧 Mock "MCP" Tools

The LLM determines execution rules completely isolated to the bounds of the following Mock implementations.

- **`read_inbox`**: Read recent emails, optionally filtered by sender, subject, or date range.
- **`read_calendar`**: Read calendar events for a date or date range. Returns title, time, attendees, location.
- **`search_contacts`**: Look up contact details by name, email, or role.
- **`draft_email`**: Save an email draft without sending. Does not deliver anything.
- **`set_reminder`**: Create a timed reminder or task for the user.
- **`manage_tasks`**: List, complete, or modify tasks. Completing a task marks it done but preserves history.
- **`create_event`**: Create a new calendar event and send invites to attendees.
- **`reschedule_event`**: Move an existing calendar event to a new time and notify attendees.
- **`cancel_event`**: Cancel a calendar event and notify all attendees.
- **`send_email`**: Send an email on the user's behalf. Irreversible once delivered.
- **`forward_email`**: Forward an email (or set of emails) to another recipient.
- **`delete_emails`**: Delete emails matching criteria. Irreversible mass action.

---

## 📖 Deep Dives

To strictly evaluate the rules natively powering these workflows, browse the architectural source bindings:
- [DECISION_LAYER.md](./DECISION_LAYER.md) — Detailed overview of signals, schemas, and determinism.
- [UI-UX-DESIGN.md](./UI-UX-DESIGN.md) — Specific mock-logic for the scenario cards, layouts, and thematic boundaries.
- [DESIGN.md](./DESIGN.md) — The global architecture bindings encompassing milestones 1-10.
