import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlarmClock,
  Bell,
  Building2,
  CalendarClock,
  ChevronRight,
  Clock,
  CreditCard,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
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
  { label: "Сегодня", icon: CalendarClock },
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
    <div className="panel flex items-center gap-3 p-3.5">
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-md", toneCls)}>
        <Icon className="size-5" />
      </span>
      <span>
        <span className="block text-lg font-semibold">{value}</span>
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
    <div className="min-h-screen bg-background lg:flex">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <div className="flex items-center gap-2.5 border-b border-sidebar-border px-1 pb-4">
          <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
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
               className="flex cursor-default items-center gap-2.5 rounded-md px-3 py-2 text-sm text-sidebar-foreground/60"
            >
              <item.icon className="size-4" />
              {item.label}
            </span>
          ))}
           <span className="flex items-center gap-2.5 rounded-md bg-sidebar-accent px-3 py-2 text-sm font-medium text-sidebar-accent-foreground">
            <CreditCard className="size-4 text-primary" />
            SaaS Admin
          </span>
        </nav>
         <div className="mt-auto rounded-md border border-sidebar-border bg-sidebar-accent p-3">
          <p className="label-caps">Платформа</p>
          <p className="mt-1 text-sm">
            {stats.paying} из {stats.total} организаций с активной оплатой
          </p>
        </div>
      </aside>

       <main className="min-w-0 flex-1 pb-20 lg:pb-0">
         <header className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 border-b border-border bg-card px-4 py-3 sm:gap-3 lg:px-6">
           <div className="relative min-w-0 max-w-2xl">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Организация, владелец, адрес…"
              className="pl-9"
            />
          </div>
           <Button size="icon" variant="ghost" aria-label="Уведомления"><Bell /></Button>
           <div className="hidden items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm sm:flex">
            <span className="grid size-6 place-items-center rounded-full bg-primary/15 text-xs text-primary">
              П
            </span>
            Павел · Владелец
          </div>
        </header>

         <div className="mx-auto max-w-[1500px] space-y-5 px-4 py-5 lg:px-6 lg:py-6">
           <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
             <div className="min-w-0">
               <p className="label-caps">Платформа</p>
               <h1 className="mt-1 truncate text-2xl font-semibold sm:text-3xl">SaaS Admin</h1>
               <p className="mt-1 text-sm text-muted-foreground">Управление организациями, оплатой и доступом</p>
             </div>
             <Button variant="outline" size="icon" aria-label="Настройки списка"><SlidersHorizontal /></Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Организаций" value={String(stats.total)} icon={Building2} tone="info" />
            <Metric label="С активной оплатой" value={String(stats.paying)} icon={Wallet} tone="primary" />
            <Metric label="Требуют оплаты" value={String(stats.pastDue)} icon={AlarmClock} tone="warning" />
            <Metric label="Ограничен доступ" value={String(stats.blocked)} icon={ShieldCheck} tone="danger" />
          </div>

           <div className="flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((f) => (
               <Button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                 variant="outline"
                 size="sm"
                 className={cn(
                   "shrink-0 rounded-full",
                  filter === f.id
                    ? "border-primary/60 bg-primary/12 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent",
                )}
              >
                {f.label}
               </Button>
            ))}
          </div>

           <div className="panel overflow-hidden">
             <div className="hidden grid-cols-[1.35fr_0.65fr_0.9fr_0.9fr_0.7fr_auto] gap-3 border-b border-border bg-surface-muted/55 px-4 py-2.5 lg:grid">
              {["Организация", "План", "Подписка", "Доступ до", "Активность", ""].map((h, i) => (
                <span key={i} className="label-caps">
                  {h}
                </span>
              ))}
            </div>
            {rows.length === 0 && (
              <p className="p-6 text-sm text-muted-foreground">Ничего не найдено.</p>
            )}
             <div className="hidden lg:block">
             {rows.map(({ org, access }) => (
              <div
                key={org.id}
                 className="grid grid-cols-[1.35fr_0.65fr_0.9fr_0.9fr_0.7fr_auto] items-center gap-3 border-b border-border/70 px-4 py-3 last:border-0 hover:bg-accent/45"
              >
                <div>
                  <p className="font-medium">{org.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{org.slug}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{org.ownerEmail}</p>
                </div>
                <div className="text-sm">{planName(org.subscription.plan)}</div>
                <div className="flex flex-col items-start gap-1.5">
                  <SubStatusPill status={org.subscription.status} />
                   <div className="flex items-center gap-1.5">
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

             <div className="divide-y divide-border lg:hidden">
               {rows.map(({ org, access }) => (
                 <article key={org.id} className="p-4">
                   <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                     <div className="min-w-0">
                       <p className="truncate font-semibold">{org.name}</p>
                       <p className="truncate font-mono text-xs text-muted-foreground">{org.slug} · {org.ownerEmail}</p>
                     </div>
                     <OrgStatusPill status={org.status} />
                   </div>
                   <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-border/70 py-3 text-sm">
                     <div><p className="label-caps">План</p><p className="mt-1 font-medium">{planName(org.subscription.plan)}</p></div>
                     <div><p className="label-caps">Подписка</p><div className="mt-1"><SubStatusPill status={org.subscription.status} /></div></div>
                     <div><p className="label-caps">Доступ до</p><p className="mt-1 font-mono">{fmtDate(access.accessUntil)}</p></div>
                     <div><p className="label-caps">Доступ</p><div className="mt-1"><AccessPill access={access} /></div></div>
                   </div>
                   <p className="mt-3 text-xs text-muted-foreground">{org.records.toLocaleString("ru-RU")} записей{access.isOverride ? " · льготный доступ" : ""}</p>
                   <div className="mt-3 grid grid-cols-2 gap-2">
                     <Button variant="secondary" onClick={() => setQuickExtendId(org.id)}><CalendarClock />Продлить</Button>
                     <Button onClick={() => setSelectedId(org.id)}>Управление<ChevronRight /></Button>
                   </div>
                 </article>
               ))}
             </div>
          </div>

          <section className="space-y-3">
             <div>
               <h2 className="text-lg font-semibold">Журнал административных действий</h2>
               <p className="mt-1 text-sm text-muted-foreground">Каждая запись привязана к конкретному клиенту и его ID</p>
            </div>
             <AuditTimeline entries={audit.slice(0, 12)} organizations={organizations} showToolbar />
          </section>
        </div>
      </main>

       <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-sidebar-border bg-sidebar px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden" aria-label="Основная навигация">
         {[NAV[0], NAV[1], NAV[3]].map((item) => item && (
           <Button key={item.label} variant="ghost" className="h-12 flex-col gap-1 text-[10px] text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"><item.icon className="size-4" />{item.label}</Button>
         ))}
         <Button variant="ghost" className="h-12 flex-col gap-1 bg-sidebar-accent text-[10px] text-sidebar-accent-foreground"><CreditCard className="size-4 text-primary" />SaaS Admin</Button>
       </nav>

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
