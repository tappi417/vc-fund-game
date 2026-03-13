import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { GameState, GameSettings, Player, Screen } from '../types/game';
import { DEFAULT_SETTINGS, calcInvestableCapital } from '../data/constants';
import { buildDealDeck, buildEventDeck } from '../data/deckBuilder';

// --- アプリ全体の状態 ---

interface AppState {
  screen: Screen;
  game: GameState | null;
}

// --- アクション定義 ---

type AppAction =
  | { type: 'NAVIGATE'; screen: Screen }
  | { type: 'START_GAME'; playerNames: string[]; settings?: Partial<GameSettings> }
  | { type: 'SET_GAME_STATE'; state: GameState }
  | { type: 'LOAD_GAME'; state: AppState };

// --- 初期状態 ---

const initialState: AppState = {
  screen: 'title',
  game: null,
};

// --- ゲーム初期化 ---

function initializeGame(playerNames: string[], settingsOverride?: Partial<GameSettings>): GameState {
  const settings: GameSettings = { ...DEFAULT_SETTINGS, ...settingsOverride };
  const investableCapital = calcInvestableCapital(settings);

  const players: Player[] = playerNames.map((name, index) => ({
    id: `player_${index}`,
    fundName: name,
    remainingCapital: investableCapital,
    totalInvested: 0,
    realizedReturns: 0,
    portfolio: [],
    handDeals: [],
  }));

  const { startups, dealCards } = buildDealDeck(playerNames.length);
  const eventDeck = buildEventDeck();

  return {
    settings,
    currentRound: 1,
    currentPhase: 'management_fee',
    currentPlayerIndex: 0,
    actionsRemaining: settings.actionsPerTurn,
    players,
    dealDeck: dealCards,
    sharedDeals: [],
    currentEvent: null,
    eventDeck,
    eventHistory: [],
    allStartups: startups,
    roundHistory: [],
  };
}

// --- Reducer ---

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'NAVIGATE':
      return { ...state, screen: action.screen };

    case 'START_GAME': {
      const game = initializeGame(action.playerNames, action.settings);
      return { screen: 'game', game };
    }

    case 'SET_GAME_STATE':
      return { ...state, game: action.state };

    case 'LOAD_GAME':
      return action.state;

    default:
      return state;
  }
}

// --- Context ---

interface GameContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  // localStorageからの復元を試みる
  const savedState = loadFromLocalStorage();
  const [state, dispatch] = useReducer(appReducer, savedState ?? initialState);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return ctx;
}

// --- localStorage ---

const SAVE_KEY = 'vc-fund-game-save';

export function saveToLocalStorage(state: AppState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable
  }
}

function loadFromLocalStorage(): AppState | null {
  try {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      return JSON.parse(saved) as AppState;
    }
  } catch {
    // corrupt data
  }
  return null;
}

export function clearSaveData(): void {
  localStorage.removeItem(SAVE_KEY);
}

export function hasSaveData(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}
