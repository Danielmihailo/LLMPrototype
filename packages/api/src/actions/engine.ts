import { v4 as uuidv4 } from "uuid";
import { query } from "../db/pool.js";
import type { AIAction, ActionStep } from "@jarvis/shared";
import { broadcastProgress } from "../ws/hub.js";
import { executeConnectorStep } from "../connectors/registry.js";
import { logAudit } from "../security/audit.js";

export async function createActionFromPlan(
  shopConnectionId: string,
  conversationId: string | null,
  plan: Record<string, unknown>,
  steps: Array<{
    connector: string;
    operation: string;
    payload: Record<string, unknown>;
  }>,
): Promise<string> {
  const actionId = uuidv4();
  await query(
    `INSERT INTO ai_actions (id, shop_connection_id, conversation_id, status, plan)
     VALUES ($1, $2, $3, 'planned', $4)`,
    [actionId, shopConnectionId, conversationId, JSON.stringify(plan)],
  );
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    await query(
      `INSERT INTO action_steps (id, action_id, step_order, connector, operation, payload, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'planned')`,
      [uuidv4(), actionId, i, s.connector, s.operation, JSON.stringify(s.payload)],
    );
  }
  return actionId;
}

export async function getAction(actionId: string): Promise<AIAction | null> {
  const { rows } = await query<AIAction>(
    `SELECT * FROM ai_actions WHERE id = $1`,
    [actionId],
  );
  if (!rows[0]) return null;
  const { rows: steps } = await query<ActionStep>(
    `SELECT * FROM action_steps WHERE action_id = $1 ORDER BY step_order`,
    [actionId],
  );
  return { ...rows[0], steps };
}

export async function confirmAction(
  actionId: string,
  userId: string,
  approved: boolean,
): Promise<{ action_id: string; status: string }> {
  const action = await getAction(actionId);
  if (!action) throw new Error("Action not found");
  if (!approved) {
    await query(`UPDATE ai_actions SET status = 'failed' WHERE id = $1`, [
      actionId,
    ]);
    return { action_id: actionId, status: "failed" };
  }
  await query(`UPDATE ai_actions SET status = 'confirmed' WHERE id = $1`, [
    actionId,
  ]);
  await executeAction(actionId, userId);
  const updated = await getAction(actionId);
  return { action_id: actionId, status: updated?.status ?? "running" };
}

async function executeAction(actionId: string, userId: string): Promise<void> {
  await query(`UPDATE ai_actions SET status = 'running' WHERE id = $1`, [
    actionId,
  ]);
  const action = await getAction(actionId);
  if (!action?.steps?.length) {
    await query(`UPDATE ai_actions SET status = 'success', result = $2 WHERE id = $1`, [
      actionId,
      JSON.stringify({ message: "No steps" }),
    ]);
    return;
  }

  const { rows: shopRows } = await query<{ user_id: string }>(
    `SELECT user_id FROM shop_connections WHERE id = $1`,
    [action.shop_connection_id],
  );
  if (shopRows[0]?.user_id !== userId) throw new Error("Forbidden");

  const results: unknown[] = [];
  const total = action.steps.length;

  for (let i = 0; i < action.steps.length; i++) {
    const step = action.steps[i];
    broadcastProgress(action.shop_connection_id, {
      event: "action_progress",
      step: i + 1,
      percent: Math.round(((i + 1) / total) * 100),
      message: `${step.operation}…`,
    });
    await query(`UPDATE action_steps SET status = 'running' WHERE id = $1`, [
      step.id,
    ]);
    try {
      const result = await executeConnectorStep(
        action.shop_connection_id,
        step.connector,
        step.operation,
        step.payload,
      );
      results.push(result);
      await query(
        `UPDATE action_steps SET status = 'success', result = $2 WHERE id = $1`,
        [step.id, JSON.stringify(result)],
      );
    } catch (err) {
      await query(`UPDATE action_steps SET status = 'failed' WHERE id = $1`, [
        step.id,
      ]);
      await query(
        `UPDATE ai_actions SET status = 'failed', result = $2 WHERE id = $1`,
        [actionId, JSON.stringify({ error: String(err) })],
      );
      await logAudit(userId, "action_failed", { actionId, error: String(err) });
      return;
    }
  }

  await query(
    `UPDATE ai_actions SET status = 'success', result = $2 WHERE id = $1`,
    [actionId, JSON.stringify({ steps: results })],
  );
  await logAudit(userId, "action_success", { actionId });
}

export async function rollbackAction(
  actionId: string,
  userId: string,
): Promise<{ action_id: string; status: string }> {
  const action = await getAction(actionId);
  if (!action) throw new Error("Action not found");
  await query(`UPDATE ai_actions SET status = 'rolled_back' WHERE id = $1`, [
    actionId,
  ]);
  await logAudit(userId, "action_rollback", { actionId });
  return { action_id: actionId, status: "rolled_back" };
}
