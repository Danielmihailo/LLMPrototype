export type Route = "home" | "chat" | "shops" | "login";

type Listener = (route: Route) => void;

let current: Route = "home";
const listeners = new Set<Listener>();

export function getRoute(): Route {
  return current;
}

export function navigate(route: Route): void {
  current = route;
  for (const l of listeners) l(route);
}

export function onRoute(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export interface AppState {
  userId: string | null;
  conversationId: string | null;
  shopConnectionId: string | null;
}

const state: AppState = {
  userId: null,
  conversationId: null,
  shopConnectionId: null,
};

export function getState(): AppState {
  return state;
}

export function patchState(partial: Partial<AppState>): void {
  Object.assign(state, partial);
}
