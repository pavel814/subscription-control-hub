import { useMemo, useState } from "react";
import { ArrowRight, Building2, Download, History, Search } from "lucide-react";
import { AUDIT_ACTION_LABEL, type AuditEntry, type Organization } from "@/lib/saas/types";
import { fmtDateTime } from "@/lib/saas/access";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SOURCE_LABEL: Record<AuditEntry["source"], string> = {
  saas_admin: "SaaS Admin",
  system: "Система",
  billing_webhook: "Биллинг",
};

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export function AuditTimeline({
  entries,
  organizations = [],
  showToolbar = false,
}: {
  entries: AuditEntry[];
  organizations?: Organization[];
  showToolbar?: boolean;
}) {
  const [query, setQuery] = useState("");
  const orgById = useMemo(
    () => new Map(organizations.map((organization) => [organization.id, organization])),
    [organizations],
  );
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return entries;
    return entries.filter((entry) => {
      const organization = orgById.get(entry.organizationId);
      return [
        organization?.name,
        organization?.slug,
        entry.actor,
        AUDIT_ACTION_LABEL[entry.action],
        entry.reason,
      ].some((item) => item?.toLowerCase().includes(value));
    });
  }, [entries, orgById, query]);

  const exportCsv = () => {
    const header = ["Дата", "Клиент", "ID", "Действие", "Изменение", "Причина", "Автор", "Источник"];
    const rows = filtered.map((entry) => {
      const organization = orgById.get(entry.organizationId);
      return [
        fmtDateTime(entry.createdAt),
        organization?.name ?? "Неизвестная организация",
        organization?.slug ?? entry.organizationId,
        AUDIT_ACTION_LABEL[entry.action],
        `${entry.oldValue} → ${entry.newValue}`,
        entry.reason,
        entry.actor,
        SOURCE_LABEL[entry.source],
      ];
    });
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "saas-admin-audit.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (entries.length === 0)
    return (
      <p className="flex items-center gap-2 rounded-xl border border-border bg-surface-muted/40 p-4 text-sm text-muted-foreground">
        <History className="size-4" />
        Действий пока не было.
      </p>
    );

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {showToolbar && (
        <div className="grid gap-3 border-b border-border bg-surface-muted/55 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="relative min-w-0">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Клиент, действие или автор"
              className="bg-card pl-9"
            />
          </div>
          <Button variant="outline" onClick={exportCsv}>
            <Download /> Экспорт CSV
          </Button>
        </div>
      )}

      <div className="hidden lg:block">
        <div className="audit-grid border-b border-border bg-surface-muted/55 px-4 py-2.5">
          {['Клиент', 'Действие', 'Изменение', 'Автор', 'Дата'].map((label) => (
            <span key={label} className="label-caps">{label}</span>
          ))}
        </div>
        {filtered.map((entry) => {
          const organization = orgById.get(entry.organizationId);
          return (
            <div key={entry.id} className="audit-grid items-center border-b border-border/70 px-4 py-3 last:border-0 hover:bg-accent/45">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/12 text-primary"><Building2 className="size-4" /></span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{organization?.name ?? "Неизвестная организация"}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">{organization?.slug ?? entry.organizationId}</p>
                </div>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{AUDIT_ACTION_LABEL[entry.action]}</p>
                <p className="truncate text-xs text-muted-foreground" title={entry.reason}>{entry.reason}</p>
              </div>
              <div className="flex min-w-0 items-center gap-1.5 font-mono text-xs">
                <span className="max-w-24 truncate rounded bg-muted px-1.5 py-1 text-muted-foreground">{entry.oldValue}</span>
                <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                <span className="max-w-24 truncate rounded bg-primary/12 px-1.5 py-1 text-primary">{entry.newValue}</span>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm">{entry.actor}</p>
                <p className="text-xs text-muted-foreground">{SOURCE_LABEL[entry.source]}</p>
              </div>
              <p className="font-mono text-xs text-muted-foreground">{fmtDateTime(entry.createdAt)}</p>
            </div>
          );
        })}
      </div>

      <div className="divide-y divide-border lg:hidden">
        {filtered.map((entry) => {
          const organization = orgById.get(entry.organizationId);
          return (
            <article key={entry.id} className="p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/12 text-primary"><Building2 className="size-4" /></span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{organization?.name ?? "Неизвестная организация"}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">{organization?.slug ?? entry.organizationId}</p>
                  </div>
                </div>
                <time className="shrink-0 font-mono text-[11px] text-muted-foreground">{fmtDateTime(entry.createdAt)}</time>
              </div>
              <p className="mt-3 text-sm font-medium">{AUDIT_ACTION_LABEL[entry.action]}</p>
              <div className="mt-2 flex min-w-0 items-center gap-1.5 font-mono text-xs">
                <span className="truncate rounded bg-muted px-1.5 py-1 text-muted-foreground">{entry.oldValue}</span>
                <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                <span className="truncate rounded bg-primary/12 px-1.5 py-1 text-primary">{entry.newValue}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">Причина: {entry.reason}</p>
              <p className="mt-1 text-xs text-muted-foreground">{entry.actor} · {SOURCE_LABEL[entry.source]}</p>
            </article>
          );
        })}
      </div>
      {filtered.length === 0 && <p className="p-5 text-sm text-muted-foreground">Записей не найдено.</p>}
    </div>
  );
}
