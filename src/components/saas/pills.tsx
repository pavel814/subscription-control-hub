import { cn } from "@/lib/utils";
import type { AccessState } from "@/lib/saas/access";
import {
  ORG_STATUS_LABEL,
  SUB_STATUS_LABEL,
  type OrgStatus,
  type SubscriptionStatus,
} from "@/lib/saas/types";

const base =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap";

const tone = {
  success: "border-success/30 bg-success/12 text-success",
  warning: "border-warning/30 bg-warning/12 text-warning",
  danger: "border-destructive/35 bg-destructive/12 text-destructive",
  info: "border-info/30 bg-info/12 text-info",
  neutral: "border-border bg-muted/60 text-muted-foreground",
} as const;

function Dot({ className }: { className?: string }) {
  return <span className={cn("size-1.5 rounded-full bg-current", className)} />;
}

export function OrgStatusPill({ status }: { status: OrgStatus }) {
  const t = status === "active" ? tone.success : status === "suspended" ? tone.danger : tone.neutral;
  return (
    <span className={cn(base, t)}>
      <Dot />
      {ORG_STATUS_LABEL[status]}
    </span>
  );
}

export function SubStatusPill({ status }: { status: SubscriptionStatus }) {
  const map: Record<SubscriptionStatus, string> = {
    active: tone.success,
    trialing: tone.info,
    past_due: tone.warning,
    canceled: tone.neutral,
    expired: tone.danger,
  };
  return (
    <span className={cn(base, map[status])}>
      <Dot />
      {SUB_STATUS_LABEL[status]}
    </span>
  );
}

export function AccessPill({ access }: { access: AccessState }) {
  const map: Record<AccessState["level"], string> = {
    full: tone.success,
    grace: tone.warning,
    read_only: tone.neutral,
    blocked: tone.danger,
  };
  return (
    <span className={cn(base, map[access.level])}>
      <Dot />
      {access.label}
    </span>
  );
}
