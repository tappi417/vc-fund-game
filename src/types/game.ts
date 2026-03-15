// --- セクター・ステージ・ステータス ---

export type Sector = 'saas' | 'fintech' | 'healthtech' | 'deeptech' | 'consumer' | 'cleantech';

export type Stage = 'seed' | 'series_a' | 'series_b' | 'series_c' | 'exited' | 'dead';

export type StartupStatus =
  | 'growing'
  | 'stable'
  | 'struggling'
  | 'dead'
  | 'exited_ma'
  | 'exited_ipo'
  | 'exited_mega_ipo'; // メガIPO（ユニコーン級）を区別

// --- ゲームフェーズ ---

export type Phase =
  | 'management_fee'    // 0. 管理報酬控除（自動）
  | 'market_event'      // 1. イベントカード公開
  | 'growth'            // 2. 成長判定
  | 'player_transition' // ホットシート切り替え画面
  | 'deal_individual'   // 3. 個別ディール（プレイヤーごと）
  | 'deal_shared'       // 4. 共有ディール競り
  | 'summary'           // 5. ラウンドサマリー
  | 'exit_judgment'     // Series C企業のExit判定（成長判定内で発生）
  | 'final_settlement'  // ゲーム終了時の強制清算
  | 'game_over';        // 結果画面遷移

// --- ゲーム設定 ---

export interface GameSettings {
  totalRounds: number;         // デフォルト: 10
  fundSize: number;            // デフォルト: 10_000_000_000 (100億円)
  managementFeeRate: number;   // デフォルト: 0.02
  investmentPeriod: number;    // 新規投資可能な期間（デフォルト: 5ラウンド）
  actionsPerTurn: number;      // デフォルト: 3
}

// --- スタートアップのヒント情報 ---

export interface StartupHints {
  teamQuality: 'A' | 'B' | 'C';
  marketSize: 'A' | 'B' | 'C';
  productReadiness: 'A' | 'B' | 'C';
}

// --- スタートアップ ---

export interface Startup {
  id: string;
  name: string;
  sector: Sector;
  currentStage: Stage;
  status: StartupStatus;
  currentValuation: number;
  growthPotential: 1 | 2 | 3 | 4 | 5;  // 隠しパラメータ
  hints: StartupHints;                   // プレイヤーに公開
  leadInvestorId: string | null;
  investors: string[];                    // 投資しているプレイヤーIDリスト
  valuationHistory: { round: number; valuation: number }[];
  consecutiveStruggling: number;          // 連続「苦戦」ラウンド数（死亡リスク上昇判定用）
  stageAdvancedThisRound: boolean;        // 今ラウンドにステージ進行したか（フォローオン適格判定用）
  exitValuation: number | null;           // Exit時の最終バリュエーション
  exitRound: number | null;              // Exitが発生したラウンド
  exitType: 'ma' | 'ipo' | 'mega_ipo' | null; // Exit種別（結果画面の可視化用）
}

// --- ディールカード ---

export interface DealCard {
  startupId: string;
  isShared: boolean;
  assignedToPlayerId: string | null; // 個別ディールの割り当て先（ホットシート管理用）
}

// --- イベントカード ---

export interface EventEffect {
  target: 'all' | Sector;
  growthModifier: number;          // 成長判定ダイスへの補正
  exitModifier?: number;           // Exit判定ダイスへの補正（IPOウィンドウ等）
  valuationModifier?: number;      // バリュエーション倍率への影響
  specialEffect?: 'force_ma_exit' | 'random_death' | 'deal_flow_reduce';
}

export interface EventCard {
  id: string;
  title: string;
  description: string;
  category: 'bubble' | 'winter' | 'regulation' | 'breakthrough' | 'exit_window' | 'black_swan' | 'lp_pressure';
  effects: EventEffect[];
}

// --- 成長・Exit判定結果 ---

export type GrowthResult = 'death' | 'struggling' | 'stable' | 'growth' | 'rapid_growth' | 'breakout';

export type ExitResult = 'fail' | 'ma' | 'ipo' | 'mega_ipo';

export interface ExitJudgmentResult {
  startupId: string;
  dice: [number, number];
  rawTotal: number;
  eventModifier: number;
  modifiedTotal: number;
  result: ExitResult;
  exitValuation: number;
  returnsPerPlayer: {
    playerId: string;
    amount: number;    // 回収額
    multiple: number;  // 投資倍率
  }[];
}

export interface GrowthJudgmentResult {
  startupId: string;
  dice: [number, number];          // 2d6の各出目
  rawTotal: number;                // ダイス合計（補正前）
  potentialModifier: number;       // ポテンシャル補正
  leadModifier: number;            // リード投資家補正
  eventModifier: number;           // イベント補正
  modifiedTotal: number;           // 補正後合計
  result: GrowthResult;
  previousStage: Stage;
  newStage: Stage;
  previousValuation: number;
  newValuation: number;
  isExitJudgment: boolean;         // Series C到達でExit判定に入ったか
  exitResult?: ExitJudgmentResult;
}

// --- 投資 ---

export interface InvestmentRound {
  round: number;
  amount: number;
  stage: Stage;
  valuationAtInvestment: number;
}

export interface Investment {
  startupId: string;
  investmentType: 'lead' | 'follow';
  rounds: InvestmentRound[];
  ownershipPercent: number;
  hasProRataRight: boolean; // リード投資家はPro-rata権あり（フォローオン優先権）
}

// --- 入札（共有ディール競り）---

export interface Bid {
  playerId: string;
  amount: number;
}

export interface AuctionState {
  dealCard: DealCard;
  bids: Bid[];
  winnerId: string | null;
  isResolved: boolean;
}

// --- プレイヤー ---

export interface Player {
  id: string;
  fundName: string;
  remainingCapital: number;
  totalInvested: number;
  realizedReturns: number;         // 通常Exit回収額の累計
  liquidationReturns: number;      // 最終清算回収額（最終DPI計算に含める）
  managementFeesPaid: number;      // 累計管理報酬支払額
  portfolio: Investment[];
  handDeals: DealCard[];
}

// --- 履歴 ---

export interface PlayerSnapshot {
  playerId: string;
  dpi: number;
  totalInvested: number;
  realizedReturns: number;
  unrealizedValue: number;         // 保有中スタートアップの現在評価額合計（持分換算）
  portfolioCount: number;
  aliveCount: number;
}

export interface RoundSnapshot {
  round: number;
  eventTitle: string | null;
  playerSnapshots: PlayerSnapshot[];
  growthResults: GrowthJudgmentResult[];
}

// --- ゲーム全体の状態 ---

export interface GameState {
  settings: GameSettings;
  currentRound: number;
  currentPhase: Phase;
  currentPlayerIndex: number;
  actionsRemaining: number;
  players: Player[];
  dealDeck: DealCard[];
  sharedDeals: DealCard[];
  currentEvent: EventCard | null;
  eventDeck: EventCard[];
  eventHistory: EventCard[];
  allStartups: Startup[];
  roundHistory: RoundSnapshot[];
  currentGrowthResults: GrowthJudgmentResult[]; // 今ラウンドの成長判定結果（表示用）
  currentAuction: AuctionState | null;           // 進行中の競りセッション
  isGameOver: boolean;
}

// --- ゲームアクション（Reducer用）---

export type GameAction =
  // ラウンド進行
  | { type: 'DEDUCT_MANAGEMENT_FEE' }
  | { type: 'DRAW_EVENT' }
  | { type: 'DEAL_CARDS' }
  | { type: 'RESOLVE_GROWTH' }           // 成長判定を実行（フェーズは growth のまま）
  | { type: 'CONFIRM_GROWTH' }           // 成長結果を確認してフェーズ進行
  | { type: 'CONFIRM_PLAYER_READY' }     // PlayerTransition 画面でプレイヤー準備完了
  | { type: 'ADVANCE_PHASE' }            // 汎用フェーズ進行（レガシー用）
  | { type: 'ADVANCE_ROUND' }
  | { type: 'NEXT_PLAYER' }
  // 投資アクション（playerId を明示 — currentPlayerIndex に依存しない）
  | { type: 'INVEST_LEAD'; playerId: string; startupId: string; amount: number }
  | { type: 'INVEST_FOLLOW'; playerId: string; startupId: string; amount: number }
  | { type: 'FOLLOW_ON'; playerId: string; startupId: string; amount: number }
  | { type: 'DECLINE_DEAL'; startupId: string }   // 手札カードをパス（アクション消費）
  | { type: 'WRITE_OFF'; startupId: string }       // ポートフォリオの損金処理
  | { type: 'PASS_ACTION' }
  | { type: 'END_TURN' }
  // 共有ディール競り
  | { type: 'START_AUCTION'; dealCard: DealCard }
  | { type: 'SUBMIT_BID'; playerId: string; amount: number }
  | { type: 'RESOLVE_AUCTION' }
  // ゲーム終了
  | { type: 'FINAL_SETTLEMENT' }
  | { type: 'END_GAME' };

// --- 画面遷移 ---

export type Screen = 'title' | 'settings' | 'game' | 'result' | 'help';
