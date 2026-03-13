import type { Startup, DealCard, Stage } from '../types/game';
import type { EventCard } from '../types/game';
import { STARTUP_TEMPLATES } from './startups';
import { generateHints } from './startups';
import { EVENT_CARDS } from './events';
import { POTENTIAL_DISTRIBUTION, VALUATION_RANGE } from './constants';

// Web Crypto APIベースの乱数
function secureRandom(): number {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] / (0xFFFFFFFF + 1);
}

// 範囲内のランダム浮動小数
function randomFloat(min: number, max: number): number {
  return secureRandom() * (max - min) + min;
}

// 重み付きランダム選択
function weightedPick<T>(items: { value: T; weight: number }[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let r = secureRandom() * totalWeight;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

// 配列シャッフル (Fisher-Yates)
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(secureRandom() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// バリュエーション生成
function generateValuation(stage: Stage): number {
  const range = VALUATION_RANGE[stage as keyof typeof VALUATION_RANGE];
  if (!range) return 0;
  // 億円単位で丸める
  const raw = randomFloat(range.min, range.max);
  return Math.round(raw / 100_000_000) * 100_000_000;
}

// ステージのランダム選択（Seedが多め）
function randomStage(): Stage {
  return weightedPick([
    { value: 'seed' as Stage, weight: 50 },
    { value: 'series_a' as Stage, weight: 35 },
    { value: 'series_b' as Stage, weight: 15 },
  ]);
}

// ポテンシャル割り当て
function randomPotential(): 1 | 2 | 3 | 4 | 5 {
  return weightedPick(
    POTENTIAL_DISTRIBUTION.map(d => ({ value: d.potential, weight: d.weight }))
  );
}

// ディールデッキ用のスタートアップとカードを生成
export function buildDealDeck(playerCount: number): { startups: Startup[]; dealCards: DealCard[] } {
  // プレイヤー数に応じてディール数を決定
  // 5ラウンド × (各プレイヤー2〜3枚 + 共有1〜2枚) を十分カバーする数
  const totalDeals = Math.max(40, playerCount * 15);

  const shuffledTemplates = shuffle(STARTUP_TEMPLATES);
  const startups: Startup[] = [];
  const dealCards: DealCard[] = [];

  for (let i = 0; i < totalDeals; i++) {
    const template = shuffledTemplates[i % shuffledTemplates.length];
    const stage = randomStage();
    const potential = randomPotential();
    const id = `startup_${i}_${Date.now()}`;

    const startup: Startup = {
      id,
      name: template.name + (i >= shuffledTemplates.length ? ` ${Math.floor(i / shuffledTemplates.length) + 1}` : ''),
      sector: template.sector,
      currentStage: stage,
      status: 'stable',
      currentValuation: generateValuation(stage),
      growthPotential: potential,
      hints: generateHints(potential),
      leadInvestorId: null,
      investors: [],
      valuationHistory: [],
    };

    startups.push(startup);
    dealCards.push({ startupId: id, isShared: false });
  }

  return { startups, dealCards: shuffle(dealCards) };
}

// イベントカードデッキを生成（シャッフル済み）
export function buildEventDeck(): EventCard[] {
  return shuffle([...EVENT_CARDS]);
}
