import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Gift, Info, ShieldAlert, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  computeAccess,
  effectiveAccessUntil,
  endOfDay,
  extendFrom,
  fmtDateTime,
  toInputValue,
} from "@/lib/saas/access";
import { useSaas } from "@/lib/saas/store";
import { PLANS, planName, type Organization, type PlanId } from "@/lib/saas/types";

interface BaseProps {
  org: Organization;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

/* ------------------------------- Продлить доступ ------------------------------ */

type Mode = "payment" | "goodwill";

export function ExtendAccessDialog({ org, open, onOpenChange }: BaseProps) {
  const { extendPaidPeriod, grantOverride } = useSaas();
  const [mode, setMode] = useState<Mode>("payment");
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");

  const paidEnd = org.subscription.currentPeriodEnd;
  const accessUntil = effectiveAccessUntil(org);

  const baseFor = (m: Mode) => (m === "payment" ? paidEnd : accessUntil.toISOString());

  useEffect(() => {
    if (!open) return;
    setMode("payment");
    setReason("");
    setDate(toInputValue(extendFrom(paidEnd, 30)));
  }, [open, paidEnd]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setDate(toInputValue(extendFrom(baseFor(m), m === "payment" ? 30 : 7)));
  };

  const quick = (days: number) => setDate(toInputValue(extendFrom(baseFor(mode), days)));

  const newEnd = date ? endOfDay(new Date(`${date}T12:00:00`)) : null;
  const valid = !!newEnd && reason.trim().length >= 3;

  const submit = () => {
    if (!newEnd) return;
    if (mode === "payment") {
      extendPaidPeriod(org.id, newEnd, reason.trim());
      toast.success("Доступ продлён", {
        description: `Оплаченный период до ${fmtDateTime(newEnd)}`,
      });
    } else {
      grantOverride(org.id, newEnd, reason.trim());
      toast.success("Льготный доступ выдан", {
        description: `Оплаченный период не изменён, доступ до ${fmtDateTime(newEnd)}`,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="size-5 text-primary" />
            Продлить доступ
          </DialogTitle>
          <DialogDescription>
            {org.name} · {planName(org.subscription.plan)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { id: "payment", label: "Оплата получена", icon: Wallet, hint: "Сдвигает период" },
              { id: "goodwill", label: "Льготный доступ", icon: Gift, hint: "Не трогает оплату" },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => switchMode(m.id)}
              className={cn(
                "flex flex-col gap-1 rounded-xl border p-3 text-left transition-colors",
                mode === m.id
                  ? "border-primary/60 bg-primary/10"
                  : "border-border bg-surface-muted/50 hover:bg-accent",
              )}
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <m.icon className="size-4 text-primary" />
                {m.label}
              </span>
              <span className="text-xs text-muted-foreground">{m.hint}</span>
            </button>
          ))}
        </div>

        <div className="space-y-4 rounded-xl border border-border bg-surface-muted/40 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {mode === "payment" ? "Оплаченный период до" : "Текущий доступ до"}
            </span>
            <span className="font-mono">
              {fmtDateTime(mode === "payment" ? paidEnd : accessUntil)}
            </span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-end">Новый срок</Label>
            <Input
              id="new-end"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {newEnd ? `Итог: ${fmtDateTime(newEnd)}` : "Укажите дату"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="label-caps self-center">Быстро</span>
            {[7, 30, 90].map((d) => (
              <Button key={d} type="button" variant="secondary" size="sm" onClick={() => quick(d)}>
                +{d} дней
              </Button>
            ))}
          </div>
          <p className="flex gap-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0 text-info" />
            Считаем от max(текущий срок, сейчас) — остаток уже оплаченного периода не сгорает.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason">Основание</Label>
          <Textarea
            id="reason"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              mode === "payment"
                ? "Оплата за сентябрь получена переводом"
                : "7 дней goodwill, разбираемся с платежом"
            }
          />
          <p className="text-xs text-muted-foreground">
            Комментарий обязателен — попадёт в журнал вместе с автором и старым значением.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button disabled={!valid} onClick={submit}>
            {mode === "payment" ? "Продлить" : "Выдать льготу"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------- Универсальное действие --------------------------- */

export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  placeholder,
  note,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  placeholder?: string;
  note?: string;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {destructive && <ShieldAlert className="size-5 text-destructive" />}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {note && (
          <p className="rounded-lg border border-border bg-surface-muted/50 p-3 text-xs text-muted-foreground">
            {note}
          </p>
        )}
        <div className="space-y-2">
          <Label htmlFor="action-reason">Причина</Label>
          <Textarea
            id="action-reason"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={placeholder ?? "Опишите основание"}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={reason.trim().length < 3}
            onClick={() => {
              onConfirm(reason.trim());
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- Изменить план ------------------------------- */

export function ChangePlanDialog({ org, open, onOpenChange }: BaseProps) {
  const { changePlan } = useSaas();
  const [plan, setPlan] = useState<PlanId>(org.subscription.plan);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setPlan(org.subscription.plan);
      setReason("");
    }
  }, [open, org.subscription.plan]);

  const access = useMemo(() => computeAccess(org), [org]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Изменить план</DialogTitle>
          <DialogDescription>
            {org.name} · доступ до {access.accessUntil.toLocaleDateString("ru-RU")}. Срок доступа при
            смене плана не меняется.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {PLANS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlan(p.id)}
              className={cn(
                "flex items-center justify-between rounded-xl border p-3 text-left transition-colors",
                plan === p.id
                  ? "border-primary/60 bg-primary/10"
                  : "border-border bg-surface-muted/40 hover:bg-accent",
              )}
            >
              <span>
                <span className="block text-sm font-medium">{p.name}</span>
                <span className="block text-xs text-muted-foreground">{p.seats}</span>
              </span>
              <span className="font-mono text-sm">
                {p.price === 0 ? "бесплатно" : `${p.price.toLocaleString("ru-RU")} ₽/мес`}
              </span>
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan-reason">Причина</Label>
          <Textarea
            id="plan-reason"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Клиент переходит на Team с 10 сотрудниками"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            disabled={reason.trim().length < 3 || plan === org.subscription.plan}
            onClick={() => {
              changePlan(org.id, plan, reason.trim());
              toast.success(`План изменён на ${planName(plan)}`);
              onOpenChange(false);
            }}
          >
            Сохранить план
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
