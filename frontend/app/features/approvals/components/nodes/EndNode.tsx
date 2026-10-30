/**
 * End Node Component
 * Custom node for flow end
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Flag } from "lucide-react";
import type { StartEndNodeData } from "../../types/flow-editor.types";

export const EndNode = memo(
  ({ data, selected }: NodeProps<StartEndNodeData>) => {
    return (
      <div
        className={`px-4 py-3 rounded-lg border-2 bg-red-50 shadow-lg min-w-[150px] ${
          selected ? "border-red-500 ring-2 ring-red-200" : "border-red-300"
        }`}
      >
        {/* Input handle */}
        <Handle type="target" position={Position.Top} className="w-3 h-3" />

        {/* Node content */}
        <div className="flex items-center gap-2">
          <div className="text-red-600">
            <Flag className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm text-gray-900">
              {data.name}
            </div>
            <div className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded mt-1">
              Fin
            </div>
          </div>
        </div>
      </div>
    );
  }
);

EndNode.displayName = "EndNode";
