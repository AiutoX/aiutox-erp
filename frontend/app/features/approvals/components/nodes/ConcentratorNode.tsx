/**
 * Concentrator Node Component
 * Custom node for parallel approval concentrator
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { GitMerge } from "lucide-react";
import type { ConcentratorNodeData } from "../../types/flow-editor.types";

export const ConcentratorNode = memo(
  ({ data, selected }: NodeProps<ConcentratorNodeData>) => {
    return (
      <div
        className={`px-4 py-3 rounded-lg border-2 bg-purple-50 shadow-lg min-w-[200px] ${
          selected
            ? "border-purple-500 ring-2 ring-purple-200"
            : "border-purple-300"
        }`}
      >
        {/* Input handles (multiple for parallel) */}
        <Handle type="target" position={Position.Top} className="w-3 h-3" />

        {/* Node content */}
        <div className="flex items-start gap-2">
          <div className="mt-1 text-purple-600">
            <GitMerge className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm text-gray-900">
              {data.name}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                Concentrador
              </span>
            </div>
            <div className="text-xs text-gray-600 mt-2">
              {data.requireAll ? (
                <span className="text-green-600">
                  ✓ Requiere todas las aprobaciones
                </span>
              ) : (
                <span className="text-orange-600">
                  Mínimo {data.minApprovals} aprobaciones
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Output handle */}
        <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
      </div>
    );
  }
);

ConcentratorNode.displayName = "ConcentratorNode";
