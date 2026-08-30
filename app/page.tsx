"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import DecisionNode from "@/components/ui/DecisionNode";

type NodeStatus =
  | "idle"
  | "running"
  | "yes"
  | "no"
  | "error";

type DecisionNodeData = {
  prompt: string;
  status?: NodeStatus;
};

type ExecutionLog = {
  nodeId: string;
  prompt: string;
  decision: "YES" | "NO";
  timestamp: string;
  status: "success" | "error";
  error?: string;
};

const nodeTypes = {
  decision: DecisionNode,
};

const initialNodes: Node[] = [
  {
    id: "1",
    type: "decision",
    position: {
      x: 100,
      y: 100,
    },
    data: {
      prompt: "Is this a support request?",
      status: "idle",
    },
  },
];

const initialEdges: Edge[] = [];

export default function Home() {
  const [nodes, setNodes, onNodesChange] =
    useNodesState(initialNodes);

  const [edges, setEdges, onEdgesChange] =
    useEdgesState(initialEdges);

  const [selectedNode, setSelectedNode] =
    useState<string | null>(null);

  const [logs, setLogs] =
    useState<ExecutionLog[]>([]);

  const [running, setRunning] =
    useState(false);

  const [importValue, setImportValue] =
    useState("");

  useEffect(() => {
    const saved =
      localStorage.getItem("ai-workflow");

    if (!saved) return;

    try {
      const workflow = JSON.parse(saved);

      setNodes(workflow.nodes ?? []);
      setEdges(workflow.edges ?? []);
    } catch {
      localStorage.removeItem("ai-workflow");
    }
  }, [setNodes, setEdges]);

  useEffect(() => {
    if (nodes.length === 0) return;

    localStorage.setItem(
      "ai-workflow",
      JSON.stringify({
        nodes,
        edges,
      })
    );
  }, [nodes, edges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const label =
        connection.sourceHandle === "yes"
          ? "YES"
          : "NO";

      setEdges((currentEdges) =>
        addEdge(
          {
            ...connection,
            type: "smoothstep",
            label,
            animated: false,
          },
          currentEdges
        )
      );
    },
    [setEdges]
  );

  const addNode = () => {
    const id = Date.now().toString();

    setNodes((currentNodes) => [
      ...currentNodes,
      {
        id,
        type: "decision",
        position: {
          x:
            100 +
            (currentNodes.length % 3) * 300,
          y:
            150 +
            Math.floor(
              currentNodes.length / 3
            ) * 250,
        },
        data: {
          prompt: "Is this a ...?",
          status: "idle",
        },
      },
    ]);
  };

  const deleteSelectedNode = () => {
    if (!selectedNode) return;

    setNodes((currentNodes) =>
      currentNodes.filter(
        (node) =>
          node.id !== selectedNode
      )
    );

    setEdges((currentEdges) =>
      currentEdges.filter(
        (edge) =>
          edge.source !== selectedNode &&
          edge.target !== selectedNode
      )
    );

    setSelectedNode(null);
  };

  const resetWorkflow = () => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setLogs([]);
    setSelectedNode(null);

    localStorage.removeItem(
      "ai-workflow"
    );
  };

  const exportWorkflow = () => {
    const data = JSON.stringify(
      {
        nodes,
        edges,
      },
      null,
      2
    );

    const blob = new Blob(
      [data],
      {
        type: "application/json",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      "ai-workflow.json";

    link.click();

    URL.revokeObjectURL(url);
  };

  const importWorkflow = () => {
    try {
      const workflow =
        JSON.parse(importValue);

      if (
        !Array.isArray(workflow.nodes) ||
        !Array.isArray(workflow.edges)
      ) {
        throw new Error(
          "Invalid workflow"
        );
      }

      setNodes(workflow.nodes);
      setEdges(workflow.edges);
      setImportValue("");
    } catch {
      alert(
        "Invalid workflow JSON"
      );
    }
  };

  const findNextNode = (
    nodeId: string,
    decision: "YES" | "NO"
  ) => {
    const edge = edges.find(
      (item) =>
        item.source === nodeId &&
        item.label === decision
    );

    return edge?.target;
  };

  const runWorkflow = async () => {
    if (running || nodes.length === 0) {
      return;
    }

    setRunning(true);
    setLogs([]);

    setNodes((currentNodes) =>
      currentNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          status: "idle",
        },
      }))
    );

    setEdges((currentEdges) =>
      currentEdges.map((edge) => {
        const { style, ...rest } = edge;
        return {
          ...rest,
          animated: false,
        };
      })
    );

    const visited = new Set<string>();

    let currentNode = nodes[0];

    try {
      while (
        currentNode &&
        !visited.has(currentNode.id)
      ) {
        visited.add(currentNode.id);

        setNodes((currentNodes) =>
          currentNodes.map(
            (node) =>
              node.id === currentNode.id
                ? {
                    ...node,
                    data: {
                      ...node.data,
                      status: "running",
                    },
                  }
                : node
          )
        );

        const response =
          await fetch("/api/workflow", {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              nodeId: currentNode.id,
              prompt:
                (
                  currentNode.data as DecisionNodeData
                ).prompt,
            }),
          });

        if (!response.ok) {
          throw new Error(
            "Failed to execute node"
          );
        }

        const data =
          await response.json();

        let decision:
          | "YES"
          | "NO"
          | null = null;

        for (
          let attempt = 0;
          attempt < 30;
          attempt++
        ) {
          await new Promise(
            (resolve) =>
              setTimeout(
                resolve,
                1000
              )
          );

          const result = await fetch(
            `/api/workflow?eventId=${data.eventId}`
          );

          if (result.ok) {
            const resultData =
              await result.json();

            if (
              resultData.decision ===
                "YES" ||
              resultData.decision ===
                "NO"
            ) {
              decision =
                resultData.decision;

              break;
            }
          }
        }

        if (!decision) {
          throw new Error(
            "Workflow execution timed out"
          );
        }

        const prompt =
          (
            currentNode.data as DecisionNodeData
          ).prompt;

        setNodes((currentNodes) =>
          currentNodes.map(
            (node) =>
              node.id === currentNode.id
                ? {
                    ...node,
                    data: {
                      ...node.data,
                      status:
                        decision === "YES"
                          ? "yes"
                          : "no",
                    },
                  }
                : node
          )
        );

        setLogs((currentLogs) => [
          ...currentLogs,
          {
            nodeId: currentNode.id,
            prompt,
            decision,
            timestamp:
              new Date().toISOString(),
            status: "success",
          },
        ]);

        // Animate and highlight the traversed edge
        setEdges((currentEdges) =>
          currentEdges.map((edge) => {
            if (
              edge.source === currentNode.id &&
              edge.label === decision
            ) {
              return {
                ...edge,
                animated: true,
                style: {
                  stroke: decision === "YES" ? "#22c55e" : "#f97316",
                  strokeWidth: 3,
                },
              };
            }
            return edge;
          })
        );

        const nextNodeId =
          findNextNode(
            currentNode.id,
            decision
          );

        if (!nextNodeId) {
          break;
        }

        const nextNode =
          nodes.find(
            (node) =>
              node.id === nextNodeId
          );

        if (!nextNode) {
          break;
        }

        currentNode = nextNode;
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error";

      setNodes((currentNodes) =>
        currentNodes.map(
          (node) =>
            node.id ===
            currentNode?.id
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    status: "error",
                  },
                }
              : node
        )
      );

      setLogs((currentLogs) => [
        ...currentLogs,
        {
          nodeId:
            currentNode?.id ?? "unknown",
          prompt:
            currentNode
              ? (
                  currentNode.data as DecisionNodeData
                ).prompt
              : "",
          decision: "NO",
          timestamp:
            new Date().toISOString(),
          status: "error",
          error: message,
        },
      ]);
    } finally {
      setRunning(false);
    }
  };

  return (
    <main className="h-screen w-screen">
      <div className="absolute left-4 top-4 z-20 w-72 rounded-xl border bg-white p-4 shadow-lg">
        <h1 className="text-xl font-bold">
          AI Decision Flow
        </h1>

        <p className="mt-1 text-xs text-gray-500">
          Build and execute AI-powered
          YES/NO workflows.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={addNode}
            className="rounded-md bg-black px-3 py-2 text-sm text-white"
          >
            Add Decision
          </button>

          <button
            onClick={runWorkflow}
            disabled={running}
            className="rounded-md bg-green-600 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {running
              ? "Running..."
              : "Run Workflow"}
          </button>

          <button
            onClick={deleteSelectedNode}
            disabled={!selectedNode}
            className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
          >
            Delete Node
          </button>

          <button
            onClick={resetWorkflow}
            className="rounded-md border px-3 py-2 text-sm"
          >
            Reset
          </button>
        </div>

        <button
          onClick={exportWorkflow}
          className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
        >
          Export JSON
        </button>

        <textarea
          value={importValue}
          onChange={(e) =>
            setImportValue(e.target.value)
          }
          placeholder="Paste workflow JSON here..."
          className="mt-2 h-20 w-full rounded-md border p-2 text-xs"
        />

        <button
          onClick={importWorkflow}
          className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
        >
          Import JSON
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) =>
          setSelectedNode(node.id)
        }
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>

      <div className="absolute bottom-4 right-4 z-20 w-96 rounded-xl border bg-white p-4 shadow-lg">
        <h2 className="font-semibold">
          Execution Logs
        </h2>

        <div className="mt-2 max-h-48 overflow-auto">
          {logs.length === 0 ? (
            <p className="text-sm text-gray-500">
              No executions yet.
            </p>
          ) : (
            logs.map(
              (log, index) => (
                <div
                  key={`${log.nodeId}-${index}`}
                  className="mb-2 rounded-md border p-2 text-xs"
                >
                  <div className="font-medium">
                    Node {log.nodeId}
                  </div>

                  <div>
                    Decision:{" "}
                    <span
                      className={
                        log.decision ===
                        "YES"
                          ? "font-semibold text-green-600"
                          : "font-semibold text-red-600"
                      }
                    >
                      {log.decision}
                    </span>
                  </div>

                  {log.error && (
                    <div className="text-orange-600">
                      {log.error}
                    </div>
                  )}
                </div>
              )
            )
          )}
        </div>
      </div>
    </main>
  );
}