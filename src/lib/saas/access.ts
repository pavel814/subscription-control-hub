import type { Organization } from "./types";

export const GRACE_DAYS = 3;

export type AccessLevel = "full" | "grace" | "read_only" | "blocked";

export interface AccessState {
  level: AccessLevel;
  label: string;
  hint: string;
  accessUntil: Date;
  daysLeft: number;
  isOverride: boolean;
}

export const endOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 0, 0);
  return x;
};

export const addDays = (d: Date, days: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};

/** Продление никогда не отнимает уже оплаченный остаток: max(end, now) + N дней */
export const extendFrom = (currentEnd: string, days: number, now = new Date()) => {
  const base = new Date(Math.max(new Date(currentEnd).getTime(), now.getTime()));
  return endOfDay(addDays(base, days));
};

export const effectiveAccessUntil = (org: Organization) => {
  const paid = new Date(org.subscription.currentPeriodEnd).getTime();
  const override = org.subscription.accessOverrideUntil
    ? new Date(org.subscription.accessOverrideUntil).getTime()
    : 0;
  return new Date(Math.max(paid, override));
};

export function computeAccess(org: Organization, now = new Date()): AccessState {
  const accessUntil = effectiveAccessUntil(org);
  const daysLeft = Math.ceil((accessUntil.getTime() - now.getTime()) / 86_400_000);
  const isOverride =
    !!org.subscription.accessOverrideUntil &&
    new Date(org.subscription.accessOverrideUntil) > new Date(org.subscription.currentPeriodEnd);

  if (org.status === "suspended")
    return {
      level: "blocked",
      label: "Заблокирован",
      hint: "Организация приостановлена администратором — доступ закрыт независимо от оплаты.",
      accessUntil,
      daysLeft,
      isOverride,
    };

  if (org.status === "closed")
    return {
      level: "blocked",
      label: "Закрыт",
      hint: "Организация закрыта. Данные доступны только для экспорта по запросу.",
      accessUntil,
      daysLeft,
      isOverride,
    };

  if (org.subscription.status === "canceled" || org.subscription.status === "expired")
    return {
      level: "read_only",
      label: "Только чтение",
      hint: "Подписка неактивна: работа с данными недоступна, чтение сохранено.",
      accessUntil,
      daysLeft,
      isOverride,
    };

  if (accessUntil > now)
    return {
      level: "full",
      label: "Полный доступ",
      hint:
        daysLeft <= 5
          ? `Доступ заканчивается через ${daysLeft} дн.`
          : "Оплаченный период действует, ограничений нет.",
      accessUntil,
      daysLeft,
      isOverride,
    };

  const graceEnd = addDays(accessUntil, GRACE_DAYS);
  if (now <= graceEnd)
    return {
      level: "grace",
      label: "Льготный период",
      hint: `Оплата просрочена, CRM работает до ${graceEnd.toLocaleDateString("ru-RU")} (grace ${GRACE_DAYS} дн.).`,
      accessUntil,
      daysLeft,
      isOverride,
    };

  return {
    level: "read_only",
    label: "Только чтение",
    hint: "Grace-период закончился: запись отключена до поступления оплаты.",
    accessUntil,
    daysLeft,
    isOverride,
  };
}

export const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });

export const fmtDateTime = (d: string | Date) =>
  new Date(d).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const toInputValue = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
