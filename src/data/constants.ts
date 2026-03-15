import type { GameSettings } from '../types/game';

// --- デフォルトゲーム設定 ---

export const DEFAULT_SETTINGS: GameSettings = {
  totalRounds: 10,
  fundSize: 5_000_000_000,      // 50億円
  managementFeeRate: 0.02,       // 年2%
  investmentPeriod: 5,           // 前半5ラウンド
  actionsPerTurn: 3,
};

// --- 投資可能資金の計算 ---
// ファンドサイズ − 管理報酬総額（100億 − 20億 = 80億）
export const calcInvestableCapital = (settings: GameSettings): number =>
  settings.fundSize * (1 - settings.managementFeeRate * settings.totalRounds);

// --- 投資パラメータ ---

export const LEAD_INVESTMENT_RATE = 0.15;    // バリュエーションの15%（仕様範囲: 15〜20%の下限を採用）
export const FOLLOW_INVESTMENT_RATE = 0.05;  // バリュエーションの5%（仕様範囲: 5〜10%の下限を採用）
export const LEAD_DICE_BONUS = 1;            // リード投資家ダイス+1

// --- バリュエーションレンジ（億円単位を円に変換済み） ---

export const VALUATION_RANGE = {
  seed:     { min: 300_000_000, max: 800_000_000 },      // 3〜8億円
  series_a: { min: 1_000_000_000, max: 3_000_000_000 },  // 10〜30億円
  series_b: { min: 3_000_000_000, max: 10_000_000_000 }, // 30〜100億円
} as const;

// --- ポテンシャル補正 ---

export const POTENTIAL_MODIFIER: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: -2,
  2: -1,
  3: 0,
  4: 1,
  5: 2,
};

// --- ポテンシャル分布 ---

export const POTENTIAL_DISTRIBUTION: { potential: 1 | 2 | 3 | 4 | 5; weight: number }[] = [
  { potential: 1, weight: 35 },
  { potential: 2, weight: 25 },
  { potential: 3, weight: 25 },
  { potential: 4, weight: 10 },
  { potential: 5, weight: 5 },
];

// --- 成長判定テーブル ---
// GrowthResult / ExitResult の型は types/game.ts で定義
// ここでは判定ロジック（関数）のみ保持する

import type { GrowthResult, ExitResult } from '../types/game';

export const getGrowthResult = (modifiedRoll: number): GrowthResult => {
  if (modifiedRoll <= 3) return 'death';
  if (modifiedRoll <= 5) return 'struggling';
  if (modifiedRoll <= 8) return 'stable';
  if (modifiedRoll <= 10) return 'growth';
  if (modifiedRoll <= 12) return 'rapid_growth';
  return 'breakout';
};

// --- ステージ進行時のバリュエーション上昇倍率 ---

export const VALUATION_MULTIPLIER = {
  growth:       { min: 2, max: 3 },
  rapid_growth: { min: 3, max: 5 },
  breakout:     { min: 5, max: 10 },
} as const;

// --- Exit判定テーブル ---

export const getExitResult = (modifiedRoll: number): ExitResult => {
  if (modifiedRoll <= 5) return 'fail';
  if (modifiedRoll <= 8) return 'ma';
  if (modifiedRoll <= 11) return 'ipo';
  return 'mega_ipo';
};

// --- Exit倍率 ---

export const EXIT_MULTIPLIER = {
  ma:       { min: 1, max: 2 },
  ipo:      { min: 2, max: 5 },
  mega_ipo: { min: 5, max: 10 },
} as const;

// --- 最終清算の流動性ディスカウント ---

export const LIQUIDATION_DISCOUNT = 0.5;

// --- ディールフロー配布枚数 ---

export const DEAL_DISTRIBUTION = {
  early: { individual: { min: 2, max: 3 }, shared: 2 }, // ラウンド1〜3
  mid:   { individual: { min: 1, max: 2 }, shared: 1 }, // ラウンド4〜5
  late:  { individual: { min: 0, max: 0 }, shared: 0 }, // ラウンド6〜10（フォローオンのみ）
} as const;

export const getDealPhase = (round: number): 'early' | 'mid' | 'late' => {
  if (round <= 3) return 'early';
  if (round <= 5) return 'mid';
  return 'late';
};

// --- セクター表示名 ---

export const SECTOR_LABELS: Record<string, string> = {
  saas: 'SaaS',
  fintech: 'Fintech',
  healthtech: 'HealthTech',
  deeptech: 'DeepTech',
  consumer: 'Consumer',
  cleantech: 'CleanTech',
};

// --- ステージ表示名 ---

export const STAGE_LABELS: Record<string, string> = {
  seed: 'Seed',
  series_a: 'Series A',
  series_b: 'Series B',
  series_c: 'Series C',
  exited: 'Exit済み',
  dead: '清算',
};

// --- ステータス表示名 ---

export const STATUS_LABELS: Record<string, string> = {
  growing: '成長中',
  stable: '横ばい',
  struggling: '苦戦中',
  dead: '清算',
  exited_ma: 'M&A Exit',
  exited_ipo: 'IPO Exit',
  exited_mega_ipo: 'メガIPO Exit',
};

// --- 金額フォーマット ---

export const formatCurrency = (amount: number): string => {
  const oku = amount / 100_000_000;
  if (oku >= 1) {
    return `${oku.toFixed(oku % 1 === 0 ? 0 : 1)}億円`;
  }
  const man = amount / 10_000;
  return `${man.toFixed(0)}万円`;
};
