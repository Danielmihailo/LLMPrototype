import React, { createContext, useContext, useReducer } from "react";

export type Page = "home" | "chat" | "login" | "shops";

interface AppState {
  userId: string | null;
  conversationId: string | null;
  shopConnectionId: string | null;
  currentPage: Page;
}

type Action =
  | { type: "SET_USER"; payload: string | null }
  | { type: "SET_CONVERSATION"; payload: string | null }
  | { type: "SET_SHOP_CONNECTION"; payload: string | null }
  | { type: "NAVIGATE"; payload: Page };

const initial: AppState = {
  userId: null,
  conversationId: null,
  shopConnectionId: null,
  currentPage: "home",
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_USER":
      return { ...state, userId: action.payload };
    case "SET_CONVERSATION":
      return { ...state, conversationId: action.payload };
    case "SET_SHOP_CONNECTION":
      return { ...state, shopConnectionId: action.payload };
    case "NAVIGATE":
      return { ...state, currentPage: action.payload };
    default:
      return state;
  }
}

const StateContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function StateProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  return (
    <StateContext.Provider value={{ state, dispatch }}>
      {children}
    </StateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(StateContext);
  if (!ctx) throw new Error("useAppState must be used within StateProvider");
  return ctx;
}
