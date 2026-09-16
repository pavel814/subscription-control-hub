import { ArrowRight, History } from "lucide-react";
import { AUDIT_ACTION_LABEL, type AuditEntry } from "@/lib/saas/types";
import { fmtDateTime } from "@/lib/saas/access";

const SOURCE_LABEL: Record<AuditEntry["source"], string> = {
  saas_admin: "SaaS Admin",
  system: "Система",
  billing_webhook: "Биллинг",
};

export function AuditTimeline({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0)
    return (
      <p className="flex items-center gap-2 rounded-xl border border-border bg-surface-muted/40 p-4 text-sm text-muted-foreground">
        <History className="size-4" />
        Действий пока не было.
      </p>
    );

  return (
    <ol className="relative space-y-3 border-l border-border pl-5">
      {entries.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute top-2 -left-[23px] size-2 rounded-full bg-primary" />
          <div className="rounded-xl border border-border bg-surface-muted/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium">{AUDIT_ACTION_LABEL[e.action]}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {fmtDateTime(e.createdAt)}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 font-mono text-xs">
              <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                {e.oldValue}
              </span>
              <ArrowRight className="size-3 text-muted-foreground" />
              <span className="rounded bg-primary/12 px-1.5 py-0.5 text-primary">{e.newValue}</span>
              <span className="text-muted-foreground">· {e.field}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Причина: «{e.reason}»</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {e.actor} · {SOURCE_LABEL[e.source]}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
