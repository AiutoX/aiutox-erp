/**
 * Approval Request Card Component
 * Displays a single approval request
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import {
  UploadIcon,
  DownloadIcon,
  PlugIcon,
  ArrowLeftIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type {
  ApprovalRequestResponse,
  ApprovalStatus,
} from "~/features/approvals/types/approval.types";

interface ApprovalRequestCardProps {
  request: ApprovalRequestResponse;
  onAction?: (
    requestId: string,
    action: string,
    decision?: { comment?: string }
  ) => void;
  showActions?: boolean;
}

export function ApprovalRequestCard({
  request,
  onAction,
  showActions = true,
}: ApprovalRequestCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getStatusBadge = (status: ApprovalStatus): string => {
    switch (status) {
      case "pending":
        return "bg-yellow-500 text-white";
      case "approved":
        return "bg-green-500 text-white";
      case "rejected":
        return "bg-red-500 text-white";
      case "delegated":
        return "bg-purple-500 text-white";
      case "cancelled":
        return "bg-gray-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const handleAction = (action: string, decision?: { comment?: string }) => {
    if (onAction) {
      onAction(request.id, action, decision);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{request.title}</CardTitle>
            <p className="text-sm text-gray-600 mt-1">{request.description}</p>

            <div className="flex items-center gap-4 mt-2">
              <Badge className={getStatusBadge(request.status)}>
                {request.status}
              </Badge>
              <span className="text-sm text-gray-500">
                • {request.entity_type} • Step {request.current_step}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              Requested by: {request.requested_by || "Unknown"}
            </span>
            <span className="text-sm text-gray-500">
              Created: {new Date(request.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Current Step */}
          <div className="border-l-4 border-blue-200 bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-blue-900">Current Step</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Step {request.current_step}
                </p>
              </div>
            </div>
          </div>

          {/* Request Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Entity Type
              </label>
              <div className="text-sm text-gray-900">{request.entity_type}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Entity ID
              </label>
              <div className="text-sm text-gray-900">{request.entity_id}</div>
            </div>
          </div>

          {/* Request Metadata */}
          {request.request_metadata &&
            Object.keys(request.request_metadata).length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2">
                  Request Metadata
                </label>
                <div className="bg-gray-50 p-3 rounded-lg">
                  {Object.entries(request.request_metadata).map(
                    ([key, value]) => (
                      <div
                        key={key}
                        className="flex justify-between py-2 border-b border-gray-200"
                      >
                        <span className="font-medium text-gray-700">
                          {key}:
                        </span>
                        <span className="text-gray-600">
                          {typeof value === "object"
                            ? JSON.stringify(value, null, 2)
                            : String(value)}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

          {/* Actions */}
          {showActions && (
            <>
              <Separator />
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium text-gray-900">Actions</h4>
                </div>

                <div className="flex gap-2">
                  {request.status === "pending" && (
                    <Button
                      size="sm"
                      onClick={() => handleAction("approve")}
                      className="text-green-600 hover:text-green-700"
                    >
                      <HugeiconsIcon
                        icon={PlugIcon}
                        size={16}
                        className="mr-2"
                      />
                      Approve
                    </Button>
                  )}

                  {request.status === "pending" && (
                    <Button
                      size="sm"
                      onClick={() => handleAction("reject")}
                      className="text-red-600 hover:text-red-700"
                    >
                      <HugeiconsIcon
                        icon={UploadIcon}
                        size={16}
                        className="mr-2"
                      />
                      Reject
                    </Button>
                  )}

                  {request.status === "pending" && (
                    <Button
                      size="sm"
                      onClick={() => handleAction("delegate")}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <HugeiconsIcon
                        icon={ArrowLeftIcon}
                        size={16}
                        className="mr-2"
                      />
                      Delegate
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <label className="font-medium text-gray-700">Created</label>
              <div className="flex items-center gap-2">
                <HugeiconsIcon
                  icon={DownloadIcon}
                  size={16}
                  className="text-gray-400"
                />
                <span>{new Date(request.created_at).toLocaleString()}</span>
              </div>
            </div>
            <div>
              <label className="font-medium text-gray-700">Updated</label>
              <div className="flex items-center gap-2">
                <HugeiconsIcon
                  icon={DownloadIcon}
                  size={16}
                  className="text-gray-400"
                />
                <span>{new Date(request.updated_at).toLocaleString()}</span>
              </div>
            </div>
            {request.completed_at && (
              <div>
                <label className="font-medium text-gray-700">Completed</label>
                <div className="flex items-center gap-2">
                  <HugeiconsIcon
                    icon={PlugIcon}
                    size={16}
                    className="text-green-500"
                  />
                  <span>{new Date(request.completed_at).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Expand Details Toggle */}
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full"
            >
              {showDetails ? "Hide Details" : "Show Details"}
            </Button>
          </div>

          {/* Expanded Details */}
          {showDetails && (
            <div className="mt-4 border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-4">
                Request Information
              </h4>
              <div className="space-y-3">
                <div className="border-l-4 border-gray-200 p-4 rounded-lg">
                  <div className="text-sm text-gray-700">
                    <p>
                      <strong>Flow ID:</strong> {request.flow_id}
                    </p>
                    <p>
                      <strong>Status:</strong> {request.status}
                    </p>
                    <p>
                      <strong>Current Step:</strong> {request.current_step}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
