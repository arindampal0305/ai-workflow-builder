# AI Decision Flow with React Flow + Inngest

A visual AI workflow system where each node represents an AI decision step. Each decision node receives a natural-language prompt, sends it to an LLM, and returns either `YES` or `NO`. The workflow then dynamically branches and traverses through the appropriate edge (`YES` or `NO`) using Inngest event execution.

## Project Overview
This project is an interactive React Flow editor built on Next.js, powered by Inngest for orchestrating background functions and OpenRouter for LLM-based binary decision routing.

```
       [ Node 1 ]
   "Is 10 greater than 2?"
         /       \
     (YES)       (NO)
       /           \
  [ Node 2 ]     [ Node 3 ]
```

---

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **State & Canvas**: React Flow (@xyflow/react)
- **Workflow Orchestration**: Inngest
- **LLM Client**: OpenAI SDK configured with OpenRouter
- **Model**: `minimax/minimax-m3:free` (Optimized for fast, binary completions)
- **Styling**: Tailwind CSS v4

---

## Setup Instructions

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Create a `.env.local` file in the root directory (based on `.env.example`):
   ```env
   OPENROUTER_API_KEY=your_openrouter_api_key
   OPENROUTER_MODEL=minimax/minimax-m3:free
   INNGEST_DEV=1
   ```

---

## Running the Application

To run the workflow and editor, you need to start **both** the Next.js development server and the Inngest development server.

### 1. Start the Next.js Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the editor.

### 2. Start the Inngest Development Server
In a separate terminal tab, run:
```bash
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```
This starts the Inngest dev server at [http://localhost:8288](http://localhost:8288) and automatically hooks into the Next.js backend API routes to register and trigger functions.

---

## How Workflow Execution Works
1. **Trigger**: When you click **Run Workflow** on the frontend, it resets any previous styling and begins at the first node in the editor.
2. **REST Call**: The frontend sends a POST request to `/api/workflow` with the current node's ID and prompt.
3. **Inngest Event**: The workflow API sends a `workflow/decision` event to Inngest.
4. **Step Execution**: Inngest triggers the `execute-decision` function, which calls the `ask-ai` step:
   - Queries OpenRouter using the `minimax/minimax-m3:free` model.
   - Robustly parses the response to extract exactly `YES` or `NO`.
5. **State Updates**:
   - The result is stored in an in-memory store (`lib/workflow-store.ts`).
   - The frontend polls the workflow status via `GET /api/workflow?eventId=...`.
6. **Traversal & Edge Highlight**:
   - Once the decision is received, the frontend updates the node's visual state (`yes` or `no` styling).
   - The edge connecting the source node to the target node matching the decision label (`YES` / `NO`) is highlighted and animated.
   - The workflow continues to execute the next connected node dynamically.

---

## Current Features
- **Interactive Canvas**: Drag and drop nodes, edit natural-language prompts, and draw custom YES/NO edges between nodes.
- **Visual Node States**: Nodes change their borders and indicators dynamically depending on their execution status:
  - `Idle`: Default gray border.
  - `Running`: Animated pulsing blue border.
  - `YES`: Green border and badge.
  - `NO`: Orange border and badge.
  - `Error`: Red border and error badge.
- **Animated Traversed Paths**: Traversed edges automatically turn green (for YES path) or orange (for NO path) and animate with dashed lines to show the flow direction.
- **Export & Import**: Export the flow diagram to a JSON file or import a saved diagram.
- **Local Persistence**: Workflow canvas positions and prompts are automatically persisted in `localStorage`.
- **Execution Logs**: Displays execution results and timestamps in the side drawer.
