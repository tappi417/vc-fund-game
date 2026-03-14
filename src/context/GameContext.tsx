import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from 'react';
import type {
  GameState,
  GameSettings,
  GameAction,
  Player,
  Screen,
} from '../types/game';
import { DEFAULT_SETTINGS, calcInvestableCapital } from '../data/constants';
import { buildDealDeck, buildEventDeck } from '../data/deckBuilder';

// --- セーブフォーマットバージョン ---
// GameState の型定義を変更したときにインクリメントする。
// ロード時にバージョン不一致が検出されたセーブは破棄する。
const SAVE_VERSION = 1;

// --- アプリ全体の状態 ---

export interface AppState {
  screen: Screen;
  game: GameState | null;
}

interface SaveEnvelope {
  version: number;
  savedAt: string; // ISO timestamp
  state: AppState;
}

// --- アプリレベルのアクション ---

type AppAction =
  | { type: 'NAVIGATE'; screen: Screen }
  | { type: 'START_GAME'; playerNames: string[]; settings?: Partial<GameSettings> }
  | { type: 'DISPATCH_GAME'; action: GameAction }
  | { type: 'LOAD_SAVE'; envelope: SaveEnvelope };

// --- 初期状態 ---

const initialState: AppState = {
  screen: 'title',
  game: null,
};

// --- ゲーム初期化 ---

function initializeGame(
  playerNames: string[],
  settingsOverride?: Partial<GameSettings>
): GameState {
  const settings: GameSettings = { ...DEFAULT_SETTINGS, ...settingsOverride };
  const investableCapital = calcInvestableCapital(settings);

  const players: Player[] = playerNames.map((name, index) => ({
    id: `player_${index}`,
    fundName: name,
    remainingCapital: investableCapital,
    totalInvested: 0,
    realizedReturns: 0,
    liquidationReturns: 0,
    managementFeesPaid: 0,
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
    currentGrowthResults: [],
    currentAuction: null,
    isGameOver: false,
  };
}

// --- ゲームロジックReducer ---
// ゲームの状態変化のみを担当（画面遷移はappReducerが担当）

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    // --- Phase 2 で実装するアクション ---
    // ここにゲームロジックを追加していく
    // 各アクションは GameState を受け取り、新しい GameState を返す純粋関数

    case 'ADVANCE_PHASE': {
      const phaseOrder: GameState['currentPhase'][] = [
        'management_fee',
        'market_event',
        'growth',
        'player_transition',
        'deal_individual',
        'deal_shared',
        'summary',
      ];
      const currentIndex = phaseOrder.indexOf(state.currentPhase);
      const nextPhase = phaseOrder[currentIndex + 1] ?? 'summary';
      return { ...state, currentPhase: nextPhase };
    }

    case 'NEXT_PLAYER': {
      const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
      return {
        ...state,
        currentPlayerIndex: nextIndex,
        actionsRemaining: state.settings.actionsPerTurn,
      };
    }

    case 'PASS_ACTION': {
      const remaining = state.actionsRemaining - 1;
      return { ...state, actionsRemaining: remaining };
    }

    case 'END_TURN': {
      return { ...state, actionsRemaining: 0 };
    }

    case 'END_GAME': {
      return { ...state, currentPhase: 'game_over', isGameOver: true };
    }

    // 未実装アクションはスタブとして現状維持
    default:
      return state;
  }
}

// --- アプリReducer ---
// 画面遷移とゲームReducerへの委譲を担当

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'NAVIGATE':
      return { ...state, screen: action.screen };

    case 'START_GAME': {
      const game = initializeGame(action.playerNames, action.settings);
      return { screen: 'game', game };
    }

    case 'DISPATCH_GAME': {
      if (!state.game) return state;
      const nextGame = gameReducer(state.game, action.action);
      // game_over フェーズになったら result 画面へ
      const nextScreen =
        nextGame.currentPhase === 'game_over' ? 'result' : state.screen;
      return { ...state, screen: nextScreen, game: nextGame };
    }

    case 'LOAD_SAVE':
      return action.envelope.state;

    default:
      return state;
  }
}

// --- Context ---

export interface GameContextValue {
  state: AppState;
  /** 画面遷移・ゲーム開始などアプリレベルのアクション */
  dispatch: React.Dispatch<AppAction>;
  /** ゲームロジックのアクション（game が null のときは no-op） */
  dispatchGame: (action: GameAction) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const savedState = loadSave();
  const [state, dispatch] = useReducer(
    appReducer,
    savedState ? savedState.state : initialState
  );

  // 状態変化のたびに自動セーブ
  useEffect(() => {
    if (state.game) {
      saveToDisk(state);
    }
  }, [state]);

  const dispatchGame = (action: GameAction) => {
    dispatch({ type: 'DISPATCH_GAME', action });
  };

  return (
    <GameContext.Provider value={{ state, dispatch, dispatchGame }}>
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

// --- localStorage（バージョン付き）---

const SAVE_KEY = 'vc-fund-game-save';

function saveToDisk(state: AppState): void {
  try {
    const envelope: SaveEnvelope = {
      version: SAVE_VERSION,
      savedAt: new Date().toISOString(),
      state,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(envelope));
  } catch {
    // localStorage 容量不足など
  }
}

function loadSave(): SaveEnvelope | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('version' in parsed) ||
      (parsed as SaveEnvelope).version !== SAVE_VERSION
    ) {
      // バージョン不一致 → 古いセーブを破棄
      localStorage.removeItem(SAVE_KEY);
      return null;
    }
    return parsed as SaveEnvelope;
  } catch {
    return null;
  }
}

export function clearSaveData(): void {
  localStorage.removeItem(SAVE_KEY);
}

export function hasSaveData(): boolean {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as SaveEnvelope;
    return parsed.version === SAVE_VERSION;
  } catch {
    return false;
  }
}
