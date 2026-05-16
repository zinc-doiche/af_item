type AuditEvent = {
  action: string;
  user: string;
  detail?: Record<string, unknown>;
};

export function audit(event: AuditEvent) {
  console.info(
    JSON.stringify({
      at: new Date().toISOString(),
      actor: event.user,
      action: event.action,
      detail: event.detail || {}
    })
  );
}
