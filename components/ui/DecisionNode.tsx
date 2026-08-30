"use client";

import {
  Handle,
  Position,
  useReactFlow,
  type NodeProps,
} from "@xyflow/react";

type NodeStatus = "idle" | "running" | "yes" | "no" | "error";

type DecisionNodeData = {
  prompt: string;
  status?: NodeStatus;
};

export default function DecisionNode({
  id,
  data,
}: NodeProps) {
  const { setNodes } = useReactFlow();
  const nodeData = data as unknown as DecisionNodeData;

  const updatePrompt = (prompt: string) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                prompt,
              },
            }
          : node
      )
    );
  };

  const status = nodeData.status ?? "idle";

  const statusStyles: Record<NodeStatus, string> = {
    idle: "border-gray-200 bg-white shadow-md",
    running: "border-blue-500 ring-2 ring-blue-300 animate-pulse bg-blue-50/20 shadow-md",
    yes: "border-green-500 ring-2 ring-green-200 bg-green-50/10 shadow-lg scale-102",
    no: "border-orange-500 ring-2 ring-orange-200 bg-orange-50/10 shadow-lg scale-102",
    error: "border-red-600 ring-2 ring-red-300 bg-red-50/10 shadow-lg",
  };

  const statusBadges: Record<NodeStatus, React.ReactNode> = {
    idle: <span className="text-gray-400 font-normal">Idle</span>,
    running: <span className="text-blue-600 font-semibold animate-pulse">Running...</span>,
    yes: <span className="text-green-600 font-bold bg-green-100 px-2 py-0.5 rounded-full text-[10px]">YES</span>,
    no: <span className="text-orange-600 font-bold bg-orange-100 px-2 py-0.5 rounded-full text-[10px]">NO</span>,
    error: <span className="text-red-600 font-bold bg-red-100 px-2 py-0.5 rounded-full text-[10px]">ERROR</span>,
  };

  return (
    <div className={`w-64 rounded-xl border p-4 transition-all duration-300 ${statusStyles[status]}`}>
      <div className="mb-2 flex justify-between items-center text-sm font-semibold">
        <span>AI Decision</span>
        <div className="text-xs">
          {statusBadges[status]}
        </div>
      </div>

      <textarea
        value={nodeData.prompt}
        onChange={(e) => updatePrompt(e.target.value)}
        onPointerDown={(e) => e.stopPropagation()}
        className="nodrag w-full resize-none rounded-md border border-gray-200 bg-gray-50 p-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
        rows={3}
      />

      <Handle
        type="target"
        position={Position.Top}
      />

      <Handle
        type="source"
        position={Position.Bottom}
        id="yes"
      />

      <Handle
        type="source"
        position={Position.Right}
        id="no"
      />

      <div className="mt-3 flex justify-between text-xs font-semibold">
        <span className="text-green-600">YES (Bottom)</span>
        <span className="text-red-600">NO (Right)</span>
      </div>
    </div>
  );
}