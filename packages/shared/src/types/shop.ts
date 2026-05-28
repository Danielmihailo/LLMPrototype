export type Platform = "shopify" | "wordpress" | "greenfield";

export type ShopConnectionStatus = "active" | "revoked" | "error";

export interface ShopConnection {
  id: string;
  user_id: string;
  platform: Platform;
  external_shop_id: string;
  status: ShopConnectionStatus;
  connected_at: string;
  display_name?: string;
}

export type MessageRole = "user" | "jarvis" | "system";
export type MessageModality = "text" | "voice";

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  modality: MessageModality;
  content: string;
  audio_meta?: Record<string, unknown>;
  tool_calls?: Record<string, unknown>;
  created_at: string;
}

export type ActionStatus =
  | "planned"
  | "confirmed"
  | "running"
  | "success"
  | "failed"
  | "rolled_back";

export interface ActionStep {
  id: string;
  action_id: string;
  step_order: number;
  connector: string;
  operation: string;
  payload: Record<string, unknown>;
  status: ActionStatus;
}

export interface AIAction {
  id: string;
  shop_connection_id: string;
  conversation_id: string | null;
  status: ActionStatus;
  plan: Record<string, unknown>;
  result: Record<string, unknown> | null;
  created_at: string;
  steps?: ActionStep[];
}

export interface JarvisAction {
  connector: Platform | string;
  operation: string;
  payload: Record<string, unknown>;
}

export interface BrainInferResponse {
  response_text: string;
  actions: JarvisAction[];
  confidence: number;
}

export type SseEventType = "token" | "action_plan" | "done" | "error";

export interface SseEvent {
  type: SseEventType;
  data: unknown;
}

export interface WsProgressEvent {
  event: "action_progress";
  step: number;
  percent: number;
  message?: string;
}
