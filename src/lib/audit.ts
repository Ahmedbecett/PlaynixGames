import crypto from "node:crypto";
import { run } from "./db";
import { nowIso } from "./time";

/** Append-only administrator activity log. */
export async function logAdminAction(params: {
  adminId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}): Promise<void> {
  await run(
    `INSERT INTO admin_logs (id, admin_id, action, entity_type, entity_id, metadata, ip, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      crypto.randomUUID(),
      params.adminId,
      params.action,
      params.entityType ?? null,
      params.entityId ?? null,
      params.metadata ? JSON.stringify(params.metadata) : null,
      params.ip ?? null,
      nowIso(),
    ],
  );
}
