import * as React from "react";
import type { RegistrationStatus } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { getStatusBadgeVariant, formatStatusLabel } from "@/lib/mock/helpers";
import { Clock, CheckCircle2, AlertTriangle, FileEdit, XCircle } from "lucide-react";

export interface StatusBadgeProps {
  status: RegistrationStatus;
  showIcon?: boolean;
  className?: string;
}

export function StatusBadge({ status, showIcon = true, className }: StatusBadgeProps) {
  const variant = getStatusBadgeVariant(status);
  const label = formatStatusLabel(status);

  const renderIcon = () => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="h-3 w-3 mr-1 shrink-0" />;
      case "pending_advisor":
        return <Clock className="h-3 w-3 mr-1 shrink-0" />;
      case "rejected":
        return <AlertTriangle className="h-3 w-3 mr-1 shrink-0" />;
      case "draft":
        return <FileEdit className="h-3 w-3 mr-1 shrink-0" />;
      case "dropped":
        return <XCircle className="h-3 w-3 mr-1 shrink-0" />;
      default:
        return null;
    }
  };

  return (
    <Badge variant={variant} className={className}>
      {showIcon && renderIcon()}
      <span>{label}</span>
    </Badge>
  );
}
