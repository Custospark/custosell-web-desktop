import { createContext, useContext, useReducer, type ReactNode } from 'react';

interface AppState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  /** Mobile auth More sheet (bottom tabs). Closed by tour when sidebar spotlight is needed. */
  mobileMoreOpen: boolean;
  theme: 'light' | 'dark';
  systemStatus: 'online' | 'offline';
  /** Immersive POS mode: app chrome (sidebar, nav, footer, banners) hidden, cashier UI only. */
  posFullscreen: boolean;
}

type AppAction =
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'TOGGLE_SIDEBAR_COLLAPSED' }
  | { type: 'SET_SIDEBAR_OPEN'; payload: boolean }
  | { type: 'SET_SIDEBAR_COLLAPSED'; payload: boolean }
  | { type: 'SET_MOBILE_MORE_OPEN'; payload: boolean }
  | { type: 'TOGGLE_MOBILE_MORE' }
  | { type: 'TOGGLE_THEME' }
  | { type: 'SET_SYSTEM_STATUS'; payload: 'online' | 'offline' }
  | { type: 'SET_POS_FULLSCREEN'; payload: boolean };

const initialState: AppState = {
  // Closed by default so mobile does not start with the drawer overlay open.
  // Desktop sidebar visibility is `lg:translate-x-0`, independent of this flag.
  sidebarOpen: false,
  sidebarCollapsed: false,
  mobileMoreOpen: false,
  theme: 'light',
  systemStatus: 'online',
  posFullscreen: false,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'TOGGLE_SIDEBAR':
      return {
        ...state,
        sidebarOpen: !state.sidebarOpen,
        // Opening the drawer should dismiss the More sheet
        mobileMoreOpen: !state.sidebarOpen ? false : state.mobileMoreOpen,
      };
    case 'TOGGLE_SIDEBAR_COLLAPSED':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case 'SET_SIDEBAR_OPEN':
      return {
        ...state,
        sidebarOpen: action.payload,
        mobileMoreOpen: action.payload ? false : state.mobileMoreOpen,
      };
    case 'SET_SIDEBAR_COLLAPSED':
      return { ...state, sidebarCollapsed: action.payload };
    case 'SET_MOBILE_MORE_OPEN':
      return {
        ...state,
        mobileMoreOpen: action.payload,
        sidebarOpen: action.payload ? false : state.sidebarOpen,
      };
    case 'TOGGLE_MOBILE_MORE':
      return {
        ...state,
        mobileMoreOpen: !state.mobileMoreOpen,
        sidebarOpen: !state.mobileMoreOpen ? false : state.sidebarOpen,
      };
    case 'TOGGLE_THEME':
      return { ...state, theme: state.theme === 'light' ? 'dark' : 'light' };
    case 'SET_SYSTEM_STATUS':
      return { ...state, systemStatus: action.payload };
    case 'SET_POS_FULLSCREEN':
      return { ...state, posFullscreen: action.payload };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

/** Hook colocated with provider (standard React context pattern). */
// eslint-disable-next-line react-refresh/only-export-components -- context hook must live with provider
export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
