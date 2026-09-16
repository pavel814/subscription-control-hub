import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlarmClock,
  Building2,
  CalendarClock,
  ChevronRight,
  Clock,
  CreditCard,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { computeAccess, fmtDate } from "@/lib/saas/access";
import { SaasProvider, useSaas } from "@/lib/saas/store";
import { planName, type Organization } from "@/lib/saas/types";
import { AccessPill, OrgStatusPill, SubStatusPill } from "@/components/saas/pills";
import { OrgDetail } from "@/components/saas/org-detail";
import { ExtendAccessDialog } from "@/components/saas/dialogs";
import { AuditTimeline } from "@/components/saas/audit-timeline";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SaaS Admin — управление подписками CRM" },
      {
        name: "description",
        content:
          "Операторская панель CRM: статусы организаций, состояние подписок, продление доступа и полный журнал административных действий.",
      },
      { property: "og:title", content: "SaaS Admin — управление подписками CRM" },
      {
        property: "og:description",
        content:
          "Организация, подписка и доступ как независимые слои: продление доступа, grace-период, льготы и аудит.",
      },
    ],
  }),
  component: () => (
    <SaasProvider>
      <SaasAdminPage />
    </SaasProvider>
  ),
});

const NAV = [
  { label: "Сегодня", icon: Sparkles },
  { label: "Клиенты", icon: Users },
  { label: "Услуги", icon: Building2 },
  { label: "Финансы", icon: Wallet },
  { label: "Рабочие часы", icon: Clock },
  { label: "Настройки", icon: Settings },
];

type FilterId = "all" | "attention" | "trialing" | "active" | "blocked";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "attention", label: "Требуют внимания" },
  { id: "trialing", label: "Пробные" },
  { id: "active", label: "Оплаченные" },
  { id: "blocked", label: "Заблокированные" },
];

function Metric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Wallet;
  tone: "primary" | "warning" | "info" | "danger";
}) {
  const toneCls = {
    primary: "text-primary bg-primary/12",
    warning: "text-warning bg-warning/12",
    info: "text-info bg-info/12",
    danger: "text-destructive bg-destructive/12",
  }[tone];
  return (
    <div className="panel flex items-center gap-3 p-4">
      <span className={cn("grid size-10 place-items-center rounded-xl", toneCls)}>
        <Icon className="size-5" />
      </span>
      <span>
        <span className="block text-xl font-semibold">{value}</span>
        <span className="block text-xs text-muted-foreground">{label}</span>
      </span>
    </div>
  );
}

function SaasAdminPage() {
  const { organizations, audit } = useSaas();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quickExtendId, setQuickExtendId] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      organizations
        .map((org) => ({ org, access: computeAccess(org) }))
        .filter(({ org, access }) => {
          const q = query.trim().toLowerCase();
          const matches =
            !q ||
            org.name.toLowerCase().includes(q) ||
            org.slug.toLowerCase().includes(q) ||
            org.ownerEmail.toLowerCase().includes(q);
          if (!matches) return false;
          if (filter === "attention")
            return (
              org.subscription.status === "past_due" ||
              access.level === "grace" ||
              (access.level === "full" && access.daysLeft <= 5)
            );
          if (filter === "trialing") return org.subscription.status === "trialing";
          if (filter === "active") return org.subscription.status === "active";
          if (filter === "blocked") return access.level === "blocked";
          return true;
        }),
    [organizations, query, filter],
  );

  const selected = organizations.find((o) => o.id === selectedId) ?? null;
  const quickExtend = organizations.find((o) => o.id === quickExtendId) ?? null;

  const stats = useMemo(() => {
    const list = organizations.map((o) => ({ o, a: computeAccess(o) }));
    return {
      total: organizations.length,
      paying: list.filter(({ o }) => o.subscription.status === "active").length,
      pastDue: list.filter(({ o }) => o.subscription.status === "past_due").length,
      blocked: list.filter(({ a }) => a.level === "blocked" || a.level === "read_only").length,
    };
  }, [organizations]);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <div className="flex items-center gap-2.5 px-1 pb-6">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" />
          </span>
          <span>
            <span className="block font-display text-sm font-semibold">Собрано</span>
            <span className="label-caps">CRM</span>
          </span>
        </div>
        <nav className="space-y-1">
          {NAV.map((item) => (
            <span
              key={item.label}
              className="flex cursor-default items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/60"
            >
              <item.icon className="size-4" />
              {item.label}
            </span>
          ))}
          <span className="flex items-center gap-2.5 rounded-lg bg-sidebar-accent px-3 py-2 text-sm font-medium text-sidebar-accent-foreground">
            <CreditCard className="size-4 text-primary" />
            SaaS Admin
          </span>
        </nav>
        <div className="mt-auto rounded-xl border border-sidebar-border bg-surface-muted/40 p-3">
          <p className="label-caps">Платформа</p>
          <p className="mt-1 text-sm">
            {stats.paying} из {stats.total} организаций с активной оплатой
          </p>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-4">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Организация, владелец, адрес…"
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm">
            <span className="grid size-6 place-items-center rounded-full bg-primary/15 text-xs text-primary">
              П
            </span>
            Павел · Владелец
          </div>
        </header>

        <div className="space-y-6 px-6 py-6">
          <div>
            <p className="label-caps">Платформа</p>
            <h1 className="mt-1 text-3xl font-semibold">SaaS Admin</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Статус организации, состояние подписки и срок доступа — три независимых слоя. Продление
              доступа не требует переключения статусов, каждое действие фиксируется в журнале с
              автором и причиной.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Организаций" value={String(stats.total)} icon={Building2} tone="info" />
            <Metric label="С активной оплатой" value={String(stats.paying)} icon={Wallet} tone="primary" />
            <Metric label="Требуют оплаты" value={String(stats.pastDue)} icon={AlarmClock} tone="warning" />
            <Metric label="Ограничен доступ" value={String(stats.blocked)} icon={ShieldCheck} tone="danger" />
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                  filter === f.id
                    ? "border-primary/60 bg-primary/12 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="panel overflow-hidden">
            <div className="hidden grid-cols-[1.4fr_0.8fr_1fr_1fr_0.7fr_auto] gap-4 border-b border-border px-5 py-3 lg:grid">
              {["Организация", "План", "Подписка", "Доступ до", "Активность", ""].map((h, i) => (
                <span key={i} className="label-caps">
                  {h}
                </span>
              ))}
            </div>
            {rows.length === 0 && (
              <p className="p-6 text-sm text-muted-foreground">Ничего не найдено.</p>
            )}
            {rows.map(({ org, access }) => (
              <div
                key={org.id}
                className="grid gap-3 border-b border-border/70 px-5 py-4 last:border-0 hover:bg-accent/40 lg:grid-cols-[1.4fr_0.8fr_1fr_1fr_0.7fr_auto] lg:items-center lg:gap-4"
              >
                <div>
                  <p className="font-medium">{org.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{org.slug}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{org.ownerEmail}</p>
                  <div className="mt-2 lg:hidden">
                    <OrgStatusPill status={org.status} />
                  </div>
                </div>
                <div className="text-sm">{planName(org.subscription.plan)}</div>
                <div className="flex flex-col items-start gap-1.5">
                  <SubStatusPill status={org.subscription.status} />
                  <div className="hidden items-center gap-1.5 lg:flex">
                    <span className="label-caps">Орг.</span>
                    <OrgStatusPill status={org.status} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="font-mono text-sm">{fmtDate(access.accessUntil)}</p>
                  <AccessPill access={access} />
                  {access.isOverride && (
                    <p className="text-xs text-warning">льгота поверх оплаты</p>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {org.records.toLocaleString("ru-RU")} записей
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setQuickExtendId(org.id)}>
                    <CalendarClock className="size-4" /> Продлить
                  </Button>
                  <Button size="sm" onClick={() => setSelectedId(org.id)}>
                    Управление <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Журнал административных действий</h2>
              <span className="text-xs text-muted-foreground">
                actor · action · old → new · reason · source
              </span>
            </div>
            <AuditTimeline entries={audit.slice(0, 8)} />
          </section>
        </div>
      </main>

      <OrgDetail
        org={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelectedId(null)}
      />
      {quickExtend && (
        <ExtendAccessDialog
          org={quickExtend as Organization}
          open={!!quickExtend}
          onOpenChange={(v) => !v && setQuickExtendId(null)}
        />
      )}
    </div>
  );
}
