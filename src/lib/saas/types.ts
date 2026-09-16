export type OrgStatus = "active" | "suspended" | "closed";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "expired";

export type PlanId = "pilot" | "team" | "business" | "enterprise";

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  seats: string;
}

export interface Subscription {
  status: SubscriptionStatus;
  plan: PlanId;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  accessOverrideUntil: string | null;
  overrideReason: string | null;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string;
  status: OrgStatus;
  records: number;
  seats: number;
  createdAt: string;
  subscription: Subscription;
}

export type AuditAction =
  | "access_extended"
  | "access_override_granted"
  | "subscription_status_changed"
  | "organization_status_changed"
  | "plan_changed"
  | "payment_recorded";

export interface AuditEntry {
  id: string;
  actor: string;
  organizationId: string;
  action: AuditAction;
  field: string;
  oldValue: string;
  newValue: string;
  reason: string;
  createdAt: string;
  source: "saas_admin" | "system" | "billing_webhook";
}

export const PLANS: Plan[] = [
  { id: "pilot", name: "Pilot", price: 0, seats: "до 3 сотрудников" },
  { id: "team", name: "Team", price: 2900, seats: "до 10 сотрудников" },
  { id: "business", name: "Business", price: 7900, seats: "до 30 сотрудников" },
  { id: "enterprise", name: "Enterprise", price: 19900, seats: "без лимита" },
];

export const planName = (id: PlanId) => PLANS.find((p) => p.id === id)?.name ?? id;

export const ORG_STATUS_LABEL: Record<OrgStatus, string> = {
  active: "Активна",
  suspended: "Приостановлена",
  closed: "Закрыта",
};

export const SUB_STATUS_LABEL: Record<SubscriptionStatus, string> = {
  trialing: "Пробный период",
  active: "Активна",
  past_due: "Требует оплаты",
  canceled: "Отменена",
  expired: "Истекла",
};

export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  access_extended: "Продлил доступ",
  access_override_granted: "Выдал льготный доступ",
  subscription_status_changed: "Изменил статус подписки",
  organization_status_changed: "Изменил статус организации",
  plan_changed: "Изменил план",
  payment_recorded: "Зафиксировал оплату",
};
