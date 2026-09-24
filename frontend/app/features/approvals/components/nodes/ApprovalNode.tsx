/**
 * Approval Node Component
 * Custom node for approval steps in the flow editor
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { User, Users, ShieldCheck } from "lucide-react";
import type { ApprovalNodeData } from "../../types/flow-editor.types";

export const ApprovalNode = memo(
  ({ data, selected }: NodeProps<ApprovalNodeData>) => {
    const getApproverIcon = () => {
      switch (data.approverType) {
        case "user":
          return <User className="w-4 h-4" />;
        case "role":
          return <ShieldCheck className="w-4 h-4" />;
        case "group":
          return <Users className="w-4 h-4" />;
        default:
          return <User className="w-4 h-4" />;
      }
    };

    const getApproverTypeLabel = () => {
      switch (data.approverType) {
        case "user":
          return "Usuario";
        case "role":
          return "Rol";
        case "group":
          return "Grupo";
        default:
          return "Usuario";
      }
    };

    return (
      <div
        className={`px-4 py-3 rounded-lg border-2 bg-white shadow-lg min-w-[200px] ${
          selected ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-300"
        }`}
      >
        {/* Input handle */}
        <Handle type="target" position={Position.Top} className="w-3 h-3" />

        {/* Node content */}
        <div className="flex items-start gap-2">
          <div className="mt-1 text-blue-600">{getApproverIcon()}</div>
          <div className="flex-1">
            <div className="font-semibold text-sm text-gray-900">
              {data.name}
            </div>
            {data.description && (
              <div className="text-xs text-gray-500 mt-1">
                {data.description}
              </div>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                {getApproverTypeLabel()}
              </span>
              <span className="text-xs text-gray-500">
                {data.approvers.length} aprobador
                {data.approvers.length !== 1 ? "es" : ""}
              </span>
            </div>
            {data.requireAll && (
              <div className="text-xs text-green-600 mt-1">
                ✓ Requiere todas las aprobaciones
              </div>
            )}
            {!data.requireAll && data.minApprovals && (
              <div className="text-xs text-orange-600 mt-1">
                Mínimo {data.minApprovals} aprobaciones
              </div>
            )}
          </div>
        </div>

        {/* Output handle */}
        <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
      </div>
    );
  }
);

ApprovalNode.displayName = "ApprovalNode";
