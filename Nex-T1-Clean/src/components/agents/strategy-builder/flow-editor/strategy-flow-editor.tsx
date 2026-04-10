"use client";

import { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Background,
  Controls,
  ReactFlowProvider,
  Node,
  useReactFlow,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { nanoid } from "nanoid";

import { SidebarPalette } from "./sidebar-palette";
import { SettingsPanel } from "./settings-panel";
import { nodeTypes } from "./custom-nodes"; // Ensure this matches export from custom-nodes

// Initial nodes
const initialNodes: Node[] = [
  {
    id: "start_1",
    type: "strategy_start",
    position: { x: 250, y: 50 },
    data: { label: "Start" },
  },
];

interface StrategyFlowEditorProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onSave?: (nodes: Node[], edges: Edge[]) => void;
}

function FlowEditor({
  initialNodes: propNodes,
  initialEdges: propEdges,
  onSave,
}: StrategyFlowEditorProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(
    propNodes || initialNodes,
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(propEdges || []);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const { screenToFlowPosition } = useReactFlow();

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: "var(--settings-foreground-subtle)", strokeWidth: 2 },
          },
          eds,
        ),
      ),
    [setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow/type");
      const label = event.dataTransfer.getData("application/reactflow/label");

      // check if the dropped element is valid
      if (typeof type === "undefined" || !type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: nanoid(),
        type,
        position,
        data: { label: label },
      };

      setNodes((nds) => nds.concat(newNode));
      setSelectedNodeId(newNode.id); // Auto-select new node
    },
    [screenToFlowPosition, setNodes],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const updateNodeData = useCallback(
    (id: string, newData: Record<string, UntypedJson>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              data: { ...node.data, ...newData },
            };
          }
          return node;
        }),
      );
    },
    [setNodes],
  );

  // Expose changes to parent via onSave prop whenever nodes/edges change
  // Note: For frequent updates, we might want to debounce this in the parent or here
  if (onSave) {
    // Create a stable effect or callback if needed, but for now parent handles storage
    // However, React rules say don't call side effects in render.
    // Let's use an effect to sync back to parent if prop exists
  }

  // Sync changes to parent
  /* useEffect(() => {
     if (onSave) onSave(nodes, edges);
  }, [nodes, edges]); */
  // BETTER: Call onSave in the change handlers or expose a ref.
  // Given the architecture in client, let's keep it simple:
  // We'll update parent state when nodes/edges change.

  // NOTE: The previous handleSave was unused.
  // We need a way to bubble up changes.
  // Let's use useEffect to notify parent of changes.

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  return (
    <div className="flex-1 h-full w-full relative" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={(changes) => {
          onNodesChange(changes);
          if (onSave) setTimeout(() => onSave(nodes, edges), 0); // Defer to process state update
        }}
        onEdgesChange={(changes) => {
          onEdgesChange(changes);
          if (onSave) setTimeout(() => onSave(nodes, edges), 0);
        }}
        onConnect={(conn) => {
          onConnect(conn);
          if (onSave) setTimeout(() => onSave(nodes, edges), 0); // Should use updater result ideally
        }}
        onDrop={(e) => {
          onDrop(e);
          if (onSave) setTimeout(() => onSave(nodes, edges), 0);
        }}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        className="bg-[var(--settings-panel)]"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--settings-border-soft)" gap={20} size={1} />
        <Controls
          position="bottom-left"
          showInteractive={false}
          className="!bg-[var(--settings-panel)] !border-[var(--settings-border)] !fill-[var(--settings-foreground-strong)] [&>button]:!border-[var(--settings-border)] [&>button]:!bg-[var(--settings-card-bg)] [&>button]:!text-[var(--settings-foreground-strong)] hover:[&>button]:!bg-[var(--settings-elevated)]"
        />

        <SidebarPalette />

        {selectedNode && (
          <SettingsPanel
            selectedNode={selectedNode}
            onUpdateNode={updateNodeData}
            onClose={() => setSelectedNodeId(null)}
          />
        )}

        <Panel position="top-right" className="m-4">
          {/* Additional quick actions could go here */}
        </Panel>
      </ReactFlow>
    </div>
  );
}

// Wrap in provider to access useReactFlow hooks
export function StrategyFlowEditor(props: StrategyFlowEditorProps) {
  return (
    <div className="h-full w-full bg-transparent">
      <ReactFlowProvider>
        <FlowEditor {...props} />
      </ReactFlowProvider>
    </div>
  );
}
