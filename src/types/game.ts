// --- セクター・ステージ・ステータス ---

export type Sector = 'saas' | 'fintech' | 'healthtech' | 'deeptech' | 'consumer' | 'cleantech';

export type Stage = 'seed' | 'series_a' | 'series_b' | 'series_c' | 'exited' | 'dead';

export type StartupStatus = 'growing' | 'stable' | 'struggling' | 'dead' | 'exited_ma' | 'exited_ipo';

// --- ゲームフェーズ ---

export type Phase =
  | 'management_fee'
  | 'market_event'
  | 'growth'
  | 'deal_individual'
  | 'deal_shared'
  | 'summary';

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
}

// --- ディールカード ---

export interface DealCard {
  startupId: string;        // 対応するStartupのID
  isShared: boolean;        // 共有ディールかどうか
}

// --- イベントカード ---

export interface EventEffect {
  target: 'all' | Sector;
  growthModifier: number;         // 成長判定ダイスへの補正
  valuationModifier?: number;     // バリュエーション倍率への影響
  specialEffect?: 'force_ma_exit' | 'random_death' | 'deal_flow_reduce';
}

export interface EventCard {
  id: string;
  title: string;
  description: string;
  category: 'bubble' | 'winter' | 'regulation' | 'breakthrough' | 'exit_window' | 'black_swan' | 'lp_pressure';
  effects: EventEffect[];
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
  rounds: InvestmentRound[];    // 投資履歴（初回＋フォローオン）
  ownershipPercent: number;     // 現在の持分比率
}

// --- プレイヤー ---

export interface Player {
  id: string;
  fundName: string;
  remainingCapital: number;     // 残り投資可能資金
  totalInvested: number;        // 投資済み総額
  realizedReturns: number;      // Exit済み回収額合計
  portfolio: Investment[];
  handDeals: DealCard[];        // 今ラウンドの個別手札
}

// --- 履歴 ---

export interface PlayerSnapshot {
  playerId: string;
  dpi: number;                  // 暫定DPI
  totalInvested: number;
  realizedReturns: number;
  portfolioCount: number;
  aliveCount: number;
}

export interface RoundSnapshot {
  round: number;
  playerSnapshots: PlayerSnapshot[];
}

// --- ゲーム全体の状態 ---

export interface GameState {
  settings: GameSettings;
  currentRound: number;
  currentPhase: Phase;
  currentPlayerIndex: number;
  actionsRemaining: number;
  players: Player[];
  dealDeck: DealCard[];           // 未配布のディールカードの山
  sharedDeals: DealCard[];        // 今ラウンドの共有ディール
  currentEvent: EventCard | null;
  eventDeck: EventCard[];
  eventHistory: EventCard[];
  allStartups: Startup[];         // 全スタートアップの状態管理
  roundHistory: RoundSnapshot[];
}

// --- プレイヤーアクション ---

export type PlayerAction =
  | { type: 'invest_lead'; startupId: string; amount: number }
  | { type: 'invest_follow'; startupId: string; amount: number }
  | { type: 'follow_on'; startupId: string; amount: number }
  | { type: 'write_off'; startupId: string }
  | { type: 'bid_shared_deal'; startupId: string; amount: number }
  | { type: 'pass' };

// --- 画面遷移 ---

export type Screen = 'title' | 'settings' | 'game' | 'result';
