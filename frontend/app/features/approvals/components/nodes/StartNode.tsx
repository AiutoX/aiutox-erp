/**
 * Start Node Component
 * Custom node for flow start
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Play } from "lucide-react";
import type { StartEndNodeData } from "../../types/flow-editor.types";

export const StartNode = memo(
  ({ data, selected }: NodeProps<StartEndNodeData>) => {
    return (
      <div
        className={`px-4 py-3 rounded-lg border-2 bg-green-50 shadow-lg min-w-[150px] ${
          selected
            ? "border-green-500 ring-2 ring-green-200"
            : "border-green-300"
        }`}
      >
        {/* Node content */}
        <div className="flex items-center gap-2">
          <div className="text-green-600">
            <Play className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm text-gray-900">
              {data.name}
            </div>
            <div className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded mt-1">
              Inicio
            </div>
          </div>
        </div>

        {/* Output handle */}
        <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
      </div>
    );
  }
);

StartNode.displayName = "StartNode";
