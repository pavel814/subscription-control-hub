import { useState } from "react";
import {
  BadgeCheck,
  CalendarClock,
  CircleSlash,
  Gift,
  Layers,
  Lock,
  PlayCircle,
  Receipt,
  ShieldAlert,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { computeAccess, fmtDateTime, GRACE_DAYS } from "@/lib/saas/access";
import { useSaas } from "@/lib/saas/store";
import { planName, type Organization } from "@/lib/saas/types";
import { AccessPill, OrgStatusPill, SubStatusPill } from "./pills";
import { AuditTimeline } from "./audit-timeline";
import { ChangePlanDialog, ExtendAccessDialog, ReasonDialog } from "./dialogs";

type ActionId =
  | "extend"
  | "plan"
  | "activate"
  | "past_due"
  | "cancel"
  | "suspend"
  | "resume"
  | "close"
  | "reopen"
  | "revoke_override"
  | null;

function Field({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-muted/40 p-3">
      <p className="label-caps">{label}</p>
      <div className="mt-1.5 text-sm font-medium">{value}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function OrgDetail({
  org,
  open,
  onOpenChange,
}: {
  org: Organization | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { auditFor, setSubscriptionStatus, setOrgStatus, revokeOverride } = useSaas();
  const [action, setAction] = useState<ActionId>(null);

  if (!org) return null;
  const access = computeAccess(org);
  const sub = org.subscription;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
          <SheetHeader className="gap-2">
            <p className="label-caps">Организация</p>
            <SheetTitle className="text-2xl">{org.name}</SheetTitle>
            <SheetDescription>
              {org.slug} · {org.ownerEmail}
            </SheetDescription>
            <div className="flex flex-wrap gap-2 pt-1">
              <OrgStatusPill status={org.status} />
              <SubStatusPill status={sub.status} />
              <AccessPill access={access} />
            </div>
          </SheetHeader>

          <div className="px-4 pb-8">
            <Tabs defaultValue="overview">
              <TabsList className="w-full">
                <TabsTrigger value="overview" className="flex-1">
                  Обзор
                </TabsTrigger>
                <TabsTrigger value="actions" className="flex-1">
                  Действия
                </TabsTrigger>
                <TabsTrigger value="history" className="flex-1">
                  История
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Field label="План" value={planName(sub.plan)} hint={`${org.seats} сотрудников`} />
                  <Field label="Доступ до" value={fmtDateTime(access.accessUntil)} hint={access.hint} />
                  <Field
                    label="Оплаченный период"
                    value={`${fmtDateTime(sub.currentPeriodStart)} → ${fmtDateTime(sub.currentPeriodEnd)}`}
                  />
                  <Field
                    label="Льготный доступ"
                    value={sub.accessOverrideUntil ? fmtDateTime(sub.accessOverrideUntil) : "не выдан"}
                    hint={sub.overrideReason ?? undefined}
                  />
                  <Field label="Записей" value={org.records.toLocaleString("ru-RU")} />
                  <Field label="Создана" value={fmtDateTime(org.createdAt)} />
                </div>

                <div className="rounded-xl border border-info/25 bg-info/8 p-3 text-sm">
                  <p className="flex items-center gap-2 font-medium">
                    <ShieldAlert className="size-4 text-info" />
                    Политика доступа
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Статус организации, статус подписки и срок доступа — независимые слои. После
                    окончания оплаты CRM работает ещё {GRACE_DAYS} дн., затем переходит в режим только
                    чтения. Приостановка организации блокирует доступ независимо от оплаты.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="actions" className="mt-4 space-y-5">
                <section className="space-y-2">
                  <p className="label-caps">Доступ и подписка</p>
                  <div className="grid gap-2">
                    <Button className="justify-start" onClick={() => setAction("extend")}>
                      <CalendarClock className="size-4" /> Продлить доступ
                    </Button>
                    <Button
                      variant="secondary"
                      className="justify-start"
                      onClick={() => setAction("activate")}
                    >
                      <BadgeCheck className="size-4" /> Активировать подписку
                    </Button>
                    <Button
                      variant="secondary"
                      className="justify-start"
                      onClick={() => setAction("past_due")}
                    >
                      <Receipt className="size-4" /> Отметить задолженность
                    </Button>
                    <Button
                      variant="secondary"
                      className="justify-start"
                      onClick={() => setAction("plan")}
                    >
                      <Layers className="size-4" /> Изменить план
                    </Button>
                    {sub.accessOverrideUntil && (
                      <Button
                        variant="outline"
                        className="justify-start"
                        onClick={() => setAction("revoke_override")}
                      >
                        <Gift className="size-4" /> Снять льготный доступ
                      </Button>
                    )}
                  </div>
                </section>

                <Separator />

                <section className="space-y-2">
                  <p className="label-caps">Опасные операции</p>
                  <div className="grid gap-2">
                    {org.status === "suspended" ? (
                      <Button
                        variant="secondary"
                        className="justify-start"
                        onClick={() => setAction("resume")}
                      >
                        <PlayCircle className="size-4" /> Возобновить организацию
                      </Button>
                    ) : (
                      <Button
                        variant="destructive"
                        className="justify-start"
                        onClick={() => setAction("suspend")}
                      >
                        <Lock className="size-4" /> Приостановить организацию
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      className="justify-start"
                      onClick={() => setAction("cancel")}
                    >
                      <CircleSlash className="size-4" /> Отменить подписку
                    </Button>
                    {org.status === "closed" ? (
                      <Button
                        variant="secondary"
                        className="justify-start"
                        onClick={() => setAction("reopen")}
                      >
                        <PlayCircle className="size-4" /> Открыть организацию заново
                      </Button>
                    ) : (
                      <Button
                        variant="destructive"
                        className="justify-start"
                        onClick={() => setAction("close")}
                      >
                        <Users className="size-4" /> Закрыть организацию
                      </Button>
                    )}
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                <AuditTimeline entries={auditFor(org.id)} />
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      <ExtendAccessDialog
        org={org}
        open={action === "extend"}
        onOpenChange={(v) => !v && setAction(null)}
      />
      <ChangePlanDialog
        org={org}
        open={action === "plan"}
        onOpenChange={(v) => !v && setAction(null)}
      />

      <ReasonDialog
        open={action === "activate"}
        onOpenChange={(v) => !v && setAction(null)}
        title="Активировать подписку"
        description="Статус подписки станет «Активна». Срок доступа не меняется — продлевайте его отдельной операцией."
        confirmLabel="Активировать"
        placeholder="Оплата подтверждена бухгалтерией"
        onConfirm={(reason) => {
          setSubscriptionStatus(org.id, "active", reason);
          toast.success("Подписка активирована");
        }}
      />
      <ReasonDialog
        open={action === "past_due"}
        onOpenChange={(v) => !v && setAction(null)}
        title="Отметить задолженность"
        description="Подписка получит статус «Требует оплаты». Организация остаётся активной."
        confirmLabel="Отметить"
        placeholder="Счёт за сентябрь не оплачен"
        note={`После окончания оплаченного периода CRM продолжит работать ещё ${GRACE_DAYS} дн., затем перейдёт в режим только чтения.`}
        onConfirm={(reason) => {
          setSubscriptionStatus(org.id, "past_due", reason);
          toast.success("Отмечена задолженность");
        }}
      />
      <ReasonDialog
        open={action === "cancel"}
        onOpenChange={(v) => !v && setAction(null)}
        title="Отменить подписку"
        description="Подписка будет отменена. Организация не блокируется, но запись отключается."
        confirmLabel="Отменить подписку"
        destructive
        placeholder="Клиент отказался от продления"
        onConfirm={(reason) => {
          setSubscriptionStatus(org.id, "canceled", reason);
          toast.success("Подписка отменена");
        }}
      />
      <ReasonDialog
        open={action === "suspend"}
        onOpenChange={(v) => !v && setAction(null)}
        title="Приостановить организацию"
        description="Доступ будет закрыт независимо от оплаты."
        confirmLabel="Приостановить"
        destructive
        placeholder="Нарушение правил, аккаунт на проверке"
        onConfirm={(reason) => {
          setOrgStatus(org.id, "suspended", reason);
          toast.success("Организация приостановлена");
        }}
      />
      <ReasonDialog
        open={action === "resume"}
        onOpenChange={(v) => !v && setAction(null)}
        title="Возобновить организацию"
        description="Блокировка снимается, доступ снова определяется подпиской и сроком."
        confirmLabel="Возобновить"
        placeholder="Проверка завершена, нарушений нет"
        onConfirm={(reason) => {
          setOrgStatus(org.id, "active", reason);
          toast.success("Организация возобновлена");
        }}
      />
      <ReasonDialog
        open={action === "close"}
        onOpenChange={(v) => !v && setAction(null)}
        title="Закрыть организацию"
        description="Аккаунт закрывается: работа в CRM прекращается, данные остаются для экспорта."
        confirmLabel="Закрыть"
        destructive
        placeholder="Клиент закрыл компанию, запрос от владельца"
        onConfirm={(reason) => {
          setOrgStatus(org.id, "closed", reason);
          toast.success("Организация закрыта");
        }}
      />
      <ReasonDialog
        open={action === "reopen"}
        onOpenChange={(v) => !v && setAction(null)}
        title="Открыть организацию заново"
        description="Организация снова станет активной."
        confirmLabel="Открыть"
        placeholder="Клиент вернулся, продолжаем работу"
        onConfirm={(reason) => {
          setOrgStatus(org.id, "active", reason);
          toast.success("Организация открыта");
        }}
      />
      <ReasonDialog
        open={action === "revoke_override"}
        onOpenChange={(v) => !v && setAction(null)}
        title="Снять льготный доступ"
        description="Оплаченный период не меняется — снимается только ручное исключение."
        confirmLabel="Снять льготу"
        placeholder="Оплата поступила, льгота больше не нужна"
        onConfirm={(reason) => {
          revokeOverride(org.id, reason);
          toast.success("Льготный доступ снят");
        }}
      />
    </>
  );
}
