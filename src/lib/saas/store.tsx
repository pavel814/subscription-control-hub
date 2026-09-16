import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { INITIAL_AUDIT, INITIAL_ORGS, CURRENT_ACTOR } from "./mock-data";
import type {
  AuditAction,
  AuditEntry,
  Organization,
  OrgStatus,
  PlanId,
  SubscriptionStatus,
} from "./types";
import { fmtDate, endOfDay } from "./access";
import { planName, ORG_STATUS_LABEL, SUB_STATUS_LABEL } from "./types";

interface LogInput {
  organizationId: string;
  action: AuditAction;
  field: string;
  oldValue: string;
  newValue: string;
  reason: string;
}

interface Ctx {
  organizations: Organization[];
  audit: AuditEntry[];
  extendPaidPeriod: (id: string, newEnd: Date, reason: string) => void;
  grantOverride: (id: string, until: Date, reason: string) => void;
  revokeOverride: (id: string, reason: string) => void;
  setSubscriptionStatus: (id: string, status: SubscriptionStatus, reason: string) => void;
  setOrgStatus: (id: string, status: OrgStatus, reason: string) => void;
  changePlan: (id: string, plan: PlanId, reason: string) => void;
  auditFor: (id: string) => AuditEntry[];
}

const SaasContext = createContext<Ctx | null>(null);

export function SaasProvider({ children }: { children: ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>(INITIAL_ORGS);
  const [audit, setAudit] = useState<AuditEntry[]>(INITIAL_AUDIT);

  const log = useCallback((input: LogInput) => {
    setAudit((prev) => [
      {
        id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        actor: CURRENT_ACTOR,
        createdAt: new Date().toISOString(),
        source: "saas_admin",
        ...input,
      },
      ...prev,
    ]);
  }, []);

  const patch = useCallback(
    (id: string, fn: (org: Organization) => Organization) =>
      setOrganizations((prev) => prev.map((o) => (o.id === id ? fn(o) : o))),
    [],
  );

  const find = useCallback(
    (id: string) => organizations.find((o) => o.id === id)!,
    [organizations],
  );

  const extendPaidPeriod = useCallback(
    (id: string, newEnd: Date, reason: string) => {
      const org = find(id);
      const end = endOfDay(newEnd).toISOString();
      patch(id, (o) => ({
        ...o,
        subscription: {
          ...o.subscription,
          // Начало оплаченного периода не переписываем — история границ сохраняется
          currentPeriodEnd: end,
          status: o.subscription.status === "canceled" ? "active" : o.subscription.status,
        },
      }));
      log({
        organizationId: id,
        action: "access_extended",
        field: "subscription.current_period_end",
        oldValue: fmtDate(org.subscription.currentPeriodEnd),
        newValue: fmtDate(end),
        reason,
      });
      if (org.subscription.status !== "active") {
        patch(id, (o) => ({ ...o, subscription: { ...o.subscription, status: "active" } }));
        log({
          organizationId: id,
          action: "subscription_status_changed",
          field: "subscription.status",
          oldValue: SUB_STATUS_LABEL[org.subscription.status],
          newValue: SUB_STATUS_LABEL.active,
          reason: "Автоматически после фиксации оплаты",
        });
      }
    },
    [find, log, patch],
  );

  const grantOverride = useCallback(
    (id: string, until: Date, reason: string) => {
      const org = find(id);
      const value = endOfDay(until).toISOString();
      patch(id, (o) => ({
        ...o,
        subscription: { ...o.subscription, accessOverrideUntil: value, overrideReason: reason },
      }));
      log({
        organizationId: id,
        action: "access_override_granted",
        field: "subscription.access_override_until",
        oldValue: org.subscription.accessOverrideUntil
          ? fmtDate(org.subscription.accessOverrideUntil)
          : "—",
        newValue: fmtDate(value),
        reason,
      });
    },
    [find, log, patch],
  );

  const revokeOverride = useCallback(
    (id: string, reason: string) => {
      const org = find(id);
      patch(id, (o) => ({
        ...o,
        subscription: { ...o.subscription, accessOverrideUntil: null, overrideReason: null },
      }));
      log({
        organizationId: id,
        action: "access_override_granted",
        field: "subscription.access_override_until",
        oldValue: org.subscription.accessOverrideUntil
          ? fmtDate(org.subscription.accessOverrideUntil)
          : "—",
        newValue: "—",
        reason,
      });
    },
    [find, log, patch],
  );

  const setSubscriptionStatus = useCallback(
    (id: string, status: SubscriptionStatus, reason: string) => {
      const org = find(id);
      patch(id, (o) => ({ ...o, subscription: { ...o.subscription, status } }));
      log({
        organizationId: id,
        action: "subscription_status_changed",
        field: "subscription.status",
        oldValue: SUB_STATUS_LABEL[org.subscription.status],
        newValue: SUB_STATUS_LABEL[status],
        reason,
      });
    },
    [find, log, patch],
  );

  const setOrgStatus = useCallback(
    (id: string, status: OrgStatus, reason: string) => {
      const org = find(id);
      patch(id, (o) => ({ ...o, status }));
      log({
        organizationId: id,
        action: "organization_status_changed",
        field: "organization.status",
        oldValue: ORG_STATUS_LABEL[org.status],
        newValue: ORG_STATUS_LABEL[status],
        reason,
      });
    },
    [find, log, patch],
  );

  const changePlan = useCallback(
    (id: string, plan: PlanId, reason: string) => {
      const org = find(id);
      patch(id, (o) => ({ ...o, subscription: { ...o.subscription, plan } }));
      log({
        organizationId: id,
        action: "plan_changed",
        field: "subscription.plan",
        oldValue: planName(org.subscription.plan),
        newValue: planName(plan),
        reason,
      });
    },
    [find, log, patch],
  );

  const auditFor = useCallback(
    (id: string) => audit.filter((a) => a.organizationId === id),
    [audit],
  );

  const value = useMemo(
    () => ({
      organizations,
      audit,
      extendPaidPeriod,
      grantOverride,
      revokeOverride,
      setSubscriptionStatus,
      setOrgStatus,
      changePlan,
      auditFor,
    }),
    [
      organizations,
      audit,
      extendPaidPeriod,
      grantOverride,
      revokeOverride,
      setSubscriptionStatus,
      setOrgStatus,
      changePlan,
      auditFor,
    ],
  );

  return <SaasContext.Provider value={value}>{children}</SaasContext.Provider>;
}

export function useSaas() {
  const ctx = useContext(SaasContext);
  if (!ctx) throw new Error("useSaas must be used inside SaasProvider");
  return ctx;
}
