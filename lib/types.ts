export type DecisionNodeData = {
  prompt: string;
  status?: "idle" | "running" | "yes" | "no" | "error";
};

export type WorkflowNode = {
  id: string;
  type?: string;
  position: {
    x: number;
    y: number;
  };
  data: DecisionNodeData;
};

export type WorkflowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  label?: string;
};

export type Workflow = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

export type ExecutionResult = {
  nodeId: string;
  prompt: string;
  decision: "YES" | "NO";
  status: "success" | "error";
  timestamp: string;
  error?: string;
};