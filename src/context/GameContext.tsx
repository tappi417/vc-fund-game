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
import { DEFAULT_SETTINGS, calcInvestableCapital, LEAD_INVESTMENT_RATE, FOLLOW_INVESTMENT_RATE } from '../data/constants';
import { buildDealDeck, buildEventDeck } from '../data/deckBuilder';
import {
  drawEvent,
  resolveAllGrowth,
  applyGrowthResultsToState,
  distributeDealsForRound,
  executeLeadInvestment,
  executeFollowInvestment,
  advanceRound,
  doFinalSettlement,
} from '../logic/gameEngine';

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

    // ──── ラウンド進行 ────

    case 'DEDUCT_MANAGEMENT_FEE': {
      // 管理報酬は初期化時に investable capital として事前控除済み。
      // このフェーズは表示・確認用のみ。フェーズを market_event へ進める。
      return { ...state, currentPhase: 'market_event' };
    }

    case 'DRAW_EVENT': {
      const next = drawEvent(state);
      return { ...next, currentPhase: 'growth' };
    }

    case 'RESOLVE_GROWTH': {
      const results = resolveAllGrowth(state);
      const next = applyGrowthResultsToState(state, results);
      // 投資期間内（investmentPeriod以下）のラウンドはディール配布あり
      if (state.currentRound <= state.settings.investmentPeriod) {
        const withDeals = distributeDealsForRound(next);
        return { ...withDeals, currentPhase: 'player_transition' };
      }
      return { ...next, currentPhase: 'summary' };
    }

    case 'ADVANCE_PHASE': {
      // 汎用フェーズ進行（コンポーネントから直接呼ぶ場合のフォールバック）
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

    case 'ADVANCE_ROUND': {
      const next = advanceRound(state);
      if (next.currentPhase === 'final_settlement') {
        // 最終ラウンド終了 → 即清算
        return doFinalSettlement(next);
      }
      return next;
    }

    case 'NEXT_PLAYER': {
      const nextIndex = state.currentPlayerIndex + 1;
      if (nextIndex >= state.players.length) {
        // 全プレイヤー完了 → 共有ディールフェーズへ（または summary）
        const hasShared = state.sharedDeals.length > 0;
        return {
          ...state,
          currentPlayerIndex: 0,
          actionsRemaining: state.settings.actionsPerTurn,
          currentPhase: hasShared ? 'deal_shared' : 'summary',
        };
      }
      return {
        ...state,
        currentPlayerIndex: nextIndex,
        actionsRemaining: state.settings.actionsPerTurn,
        currentPhase: 'player_transition',
      };
    }

    // ──── 投資アクション ────

    case 'INVEST_LEAD': {
      const amount = Math.round(
        action.amount ??
          (state.allStartups.find(s => s.id === action.startupId)?.currentValuation ?? 0) *
            LEAD_INVESTMENT_RATE,
      );
      const currentPlayer = state.players[state.currentPlayerIndex];
      return executeLeadInvestment(state, currentPlayer.id, action.startupId, amount);
    }

    case 'INVEST_FOLLOW': {
      const amount = Math.round(
        action.amount ??
          (state.allStartups.find(s => s.id === action.startupId)?.currentValuation ?? 0) *
            FOLLOW_INVESTMENT_RATE,
      );
      const currentPlayer = state.players[state.currentPlayerIndex];
      return executeFollowInvestment(state, currentPlayer.id, action.startupId, amount);
    }

    case 'FOLLOW_ON': {
      const currentPlayer = state.players[state.currentPlayerIndex];
      return executeFollowInvestment(state, currentPlayer.id, action.startupId, action.amount);
    }

    case 'WRITE_OFF': {
      // 不良企業の自発的損金処理（アクションを消費するが資金回収なし）
      const updatedPlayers = state.players.map((p, i) => {
        if (i !== state.currentPlayerIndex) return p;
        return {
          ...p,
          handDeals: p.handDeals.filter(d => d.startupId !== action.startupId),
        };
      });
      return {
        ...state,
        players: updatedPlayers,
        actionsRemaining: state.actionsRemaining - 1,
      };
    }

    case 'PASS_ACTION': {
      const remaining = state.actionsRemaining - 1;
      return { ...state, actionsRemaining: remaining };
    }

    case 'END_TURN': {
      return { ...state, actionsRemaining: 0 };
    }

    // ──── 共有ディール（簡易版: Phase 2 は入札なし、先着順）────

    case 'START_AUCTION': {
      return {
        ...state,
        currentAuction: {
          dealCard: action.dealCard,
          bids: [],
          winnerId: null,
          isResolved: false,
        },
      };
    }

    case 'SUBMIT_BID': {
      if (!state.currentAuction) return state;
      const bids = [
        ...state.currentAuction.bids.filter(b => b.playerId !== action.playerId),
        { playerId: action.playerId, amount: action.amount },
      ];
      return {
        ...state,
        currentAuction: { ...state.currentAuction, bids },
      };
    }

    case 'RESOLVE_AUCTION': {
      if (!state.currentAuction) return state;
      const { bids, dealCard } = state.currentAuction;
      if (bids.length === 0) {
        // 誰も入札しなかった
        return {
          ...state,
          sharedDeals: state.sharedDeals.filter(d => d.startupId !== dealCard.startupId),
          currentAuction: null,
        };
      }
      // 最高入札者がリード投資実行
      const winner = bids.reduce((a, b) => (a.amount >= b.amount ? a : b));
      const startup = state.allStartups.find(s => s.id === dealCard.startupId);
      if (!startup) return { ...state, currentAuction: null };

      let next = executeLeadInvestment(state, winner.playerId, dealCard.startupId, winner.amount);
      next = {
        ...next,
        sharedDeals: next.sharedDeals.filter(d => d.startupId !== dealCard.startupId),
        currentAuction: null,
      };
      return next;
    }

    // ──── ゲーム終了 ────

    case 'FINAL_SETTLEMENT': {
      const settled = doFinalSettlement(state);
      return { ...settled, currentPhase: 'game_over', isGameOver: true };
    }

    case 'END_GAME': {
      return { ...state, currentPhase: 'game_over', isGameOver: true };
    }

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
