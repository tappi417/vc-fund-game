/**
 * gameEngine.ts — ピュアなゲームロジック関数群
 * React・UIに依存せず、GameState を受け取り新しい GameState を返す純粋関数のみ。
 */

import type {
  GameState,
  Player,
  Startup,
  Investment,
  DealCard,
  EventCard,
  GrowthResult,
  ExitResult,
  GrowthJudgmentResult,
  ExitJudgmentResult,
  Stage,
  Sector,
  PlayerSnapshot,
  RoundSnapshot,
} from '../types/game';

import {
  POTENTIAL_MODIFIER,
  LEAD_DICE_BONUS,
  VALUATION_MULTIPLIER,
  EXIT_MULTIPLIER,
  LIQUIDATION_DISCOUNT,
  DEAL_DISTRIBUTION,
  getDealPhase,
  getGrowthResult,
  getExitResult,
} from '../data/constants';

// ──────────────────────────────────────────────
// 乱数ユーティリティ（Web Crypto API）
// ──────────────────────────────────────────────

function secureRandom(): number {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] / (0xffffffff + 1);
}

/** 2d6 ロール */
export function rollDice(): [number, number] {
  const d1 = Math.floor(secureRandom() * 6) + 1;
  const d2 = Math.floor(secureRandom() * 6) + 1;
  return [d1, d2];
}

function randomFloat(min: number, max: number): number {
  return secureRandom() * (max - min) + min;
}

// ──────────────────────────────────────────────
// ステージ進行
// ──────────────────────────────────────────────

const STAGE_ORDER: Stage[] = ['seed', 'series_a', 'series_b', 'series_c'];

export function advanceStage(stage: Stage): Stage {
  const idx = STAGE_ORDER.indexOf(stage);
  if (idx === -1 || idx >= STAGE_ORDER.length - 1) return stage;
  return STAGE_ORDER[idx + 1];
}

// ──────────────────────────────────────────────
// イベント補正の取得
// ──────────────────────────────────────────────

export function getGrowthModifierFromEvent(
  event: EventCard | null,
  sector: Sector,
): number {
  if (!event) return 0;
  let total = 0;
  for (const eff of event.effects) {
    if (eff.target === 'all' || eff.target === sector) {
      total += eff.growthModifier;
    }
  }
  return total;
}

export function getExitModifierFromEvent(event: EventCard | null): number {
  if (!event) return 0;
  let total = 0;
  for (const eff of event.effects) {
    total += eff.exitModifier ?? 0;
  }
  return total;
}

// ──────────────────────────────────────────────
// バリュエーション更新
// ──────────────────────────────────────────────

function applyGrowthValuation(
  current: number,
  result: GrowthResult,
): number {
  if (result === 'growth') {
    const { min, max } = VALUATION_MULTIPLIER.growth;
    return Math.round((current * randomFloat(min, max)) / 100_000_000) * 100_000_000;
  }
  if (result === 'rapid_growth') {
    const { min, max } = VALUATION_MULTIPLIER.rapid_growth;
    return Math.round((current * randomFloat(min, max)) / 100_000_000) * 100_000_000;
  }
  if (result === 'breakout') {
    const { min, max } = VALUATION_MULTIPLIER.breakout;
    return Math.round((current * randomFloat(min, max)) / 100_000_000) * 100_000_000;
  }
  return current;
}

// ──────────────────────────────────────────────
// Exit判定
// ──────────────────────────────────────────────

export function resolveExitJudgment(
  startup: Startup,
  event: EventCard | null,
  players: Player[],
): ExitJudgmentResult {
  const dice = rollDice();
  const rawTotal = dice[0] + dice[1];
  const eventModifier = getExitModifierFromEvent(event);
  const modifiedTotal = Math.min(12, Math.max(2, rawTotal + eventModifier));
  const result: ExitResult = getExitResult(modifiedTotal);

  let exitValuation = startup.currentValuation;

  if (result !== 'fail') {
    const multiplierKey = result as 'ma' | 'ipo' | 'mega_ipo';
    const { min, max } = EXIT_MULTIPLIER[multiplierKey];
    exitValuation = Math.round(
      (startup.currentValuation * randomFloat(min, max)) / 100_000_000,
    ) * 100_000_000;
  }

  const returnsPerPlayer = players
    .map(p => {
      const inv = p.portfolio.find(i => i.startupId === startup.id);
      if (!inv || result === 'fail') return null;
      const amount = Math.round(exitValuation * (inv.ownershipPercent / 100));
      const totalCost = inv.rounds.reduce((s, r) => s + r.amount, 0);
      const multiple = totalCost > 0 ? amount / totalCost : 0;
      return { playerId: p.id, amount, multiple };
    })
    .filter((x): x is { playerId: string; amount: number; multiple: number } => x !== null);

  return {
    startupId: startup.id,
    dice,
    rawTotal,
    eventModifier,
    modifiedTotal,
    result,
    exitValuation,
    returnsPerPlayer,
  };
}

// ──────────────────────────────────────────────
// 成長判定（1社分）
// ──────────────────────────────────────────────

export function resolveGrowthJudgment(
  startup: Startup,
  event: EventCard | null,
  players: Player[],
): GrowthJudgmentResult {
  const dice = rollDice();
  const rawTotal = dice[0] + dice[1];

  const potentialModifier = POTENTIAL_MODIFIER[startup.growthPotential] ?? 0;
  const leadModifier = startup.leadInvestorId ? LEAD_DICE_BONUS : 0;
  const eventModifier = getGrowthModifierFromEvent(event, startup.sector);

  const modifiedTotal = Math.min(
    14,
    Math.max(2, rawTotal + potentialModifier + leadModifier + eventModifier),
  );
  const result: GrowthResult = getGrowthResult(modifiedTotal);

  const previousStage = startup.currentStage;
  const previousValuation = startup.currentValuation;

  // Series C の場合は成長判定→Exit判定へ
  const isExitJudgment = startup.currentStage === 'series_c';
  let exitResult: ExitJudgmentResult | undefined;
  let newStage = previousStage;
  let newValuation = previousValuation;

  if (isExitJudgment) {
    exitResult = resolveExitJudgment(startup, event, players);
    if (exitResult.result !== 'fail') {
      newStage = 'exited';
      newValuation = exitResult.exitValuation;
    }
  } else if (result === 'death') {
    newStage = 'dead';
  } else if (result === 'struggling' || result === 'stable') {
    // ステージ変わらず、バリュエーションも変わらず
    newValuation = previousValuation;
  } else {
    // growth / rapid_growth / breakout → ステージ進行 + バリュエーション更新
    newStage = advanceStage(previousStage);
    newValuation = applyGrowthValuation(previousValuation, result);

    // breakout は2段階進行
    if (result === 'breakout' && newStage !== 'series_c') {
      newStage = advanceStage(newStage);
    }
  }

  return {
    startupId: startup.id,
    dice,
    rawTotal,
    potentialModifier,
    leadModifier,
    eventModifier,
    modifiedTotal,
    result,
    previousStage,
    newStage,
    previousValuation,
    newValuation,
    isExitJudgment,
    exitResult,
  };
}

// ──────────────────────────────────────────────
// 全スタートアップの成長判定
// ──────────────────────────────────────────────

export function resolveAllGrowth(game: GameState): GrowthJudgmentResult[] {
  const activeStatuses = new Set(['growing', 'stable', 'struggling']);
  const activeStartups = game.allStartups.filter(s => activeStatuses.has(s.status));

  return activeStartups.map(startup =>
    resolveGrowthJudgment(startup, game.currentEvent, game.players),
  );
}

// ──────────────────────────────────────────────
// 成長判定結果をゲームステートに適用
// ──────────────────────────────────────────────

export function applyGrowthResultsToState(
  game: GameState,
  results: GrowthJudgmentResult[],
): GameState {
  const resultMap = new Map(results.map(r => [r.startupId, r]));

  // スタートアップ更新
  const updatedStartups = game.allStartups.map(startup => {
    const r = resultMap.get(startup.id);
    if (!r) return { ...startup, stageAdvancedThisRound: false };

    let newStatus = startup.status;
    let consecutiveStruggling = startup.consecutiveStruggling;
    let exitValuation = startup.exitValuation;
    let exitRound = startup.exitRound;
    let exitType = startup.exitType;
    const stageAdvancedThisRound = r.newStage !== r.previousStage;

    if (r.isExitJudgment && r.exitResult && r.exitResult.result !== 'fail') {
      const er = r.exitResult;
      newStatus =
        er.result === 'mega_ipo'
          ? 'exited_mega_ipo'
          : er.result === 'ipo'
          ? 'exited_ipo'
          : 'exited_ma';
      exitValuation = er.exitValuation;
      exitRound = game.currentRound;
      exitType = er.result === 'ma' ? 'ma' : er.result === 'ipo' ? 'ipo' : 'mega_ipo';
      consecutiveStruggling = 0;
    } else if (r.result === 'death') {
      newStatus = 'dead';
      consecutiveStruggling = 0;
    } else if (r.result === 'struggling') {
      consecutiveStruggling += 1;
      // 2連続苦戦で死亡リスク追加判定（仕様: 確率的死亡）
      if (consecutiveStruggling >= 2) {
        const roll = secureRandom();
        if (roll < 0.3) {
          newStatus = 'dead';
          consecutiveStruggling = 0;
        } else {
          newStatus = 'struggling';
        }
      } else {
        newStatus = 'struggling';
      }
    } else if (r.result === 'stable') {
      consecutiveStruggling = 0;
      newStatus = 'stable';
    } else {
      consecutiveStruggling = 0;
      newStatus = 'growing';
    }

    const newValuationHistory = [
      ...startup.valuationHistory,
      { round: game.currentRound, valuation: r.newValuation },
    ];

    return {
      ...startup,
      status: newStatus,
      currentStage: r.newStage,
      currentValuation: r.newValuation,
      valuationHistory: newValuationHistory,
      consecutiveStruggling,
      stageAdvancedThisRound,
      exitValuation,
      exitRound,
      exitType,
    };
  });

  // プレイヤーへのExit回収分を反映
  const updatedPlayers = game.players.map(player => {
    let realizedReturns = player.realizedReturns;
    for (const r of results) {
      if (!r.isExitJudgment || !r.exitResult || r.exitResult.result === 'fail') continue;
      const ret = r.exitResult.returnsPerPlayer.find(x => x.playerId === player.id);
      if (ret) {
        realizedReturns += ret.amount;
      }
    }
    return { ...player, realizedReturns };
  });

  return {
    ...game,
    allStartups: updatedStartups,
    players: updatedPlayers,
    currentGrowthResults: results,
  };
}

// ──────────────────────────────────────────────
// ディール配布
// ──────────────────────────────────────────────

export function distributeDealsForRound(game: GameState): GameState {
  const phase = getDealPhase(game.currentRound);
  const config = DEAL_DISTRIBUTION[phase];

  if (phase === 'late') {
    // ラウンド6〜10は新規ディールなし
    return game;
  }

  const { min, max } = config.individual;
  const sharedCount = config.shared;

  let deck = [...game.dealDeck];
  let newPlayers = game.players.map(p => ({ ...p, handDeals: [] as DealCard[] }));
  const newSharedDeals: DealCard[] = [];

  // 個別ディール配布
  for (let pi = 0; pi < newPlayers.length; pi++) {
    const count = Math.floor(secureRandom() * (max - min + 1)) + min;
    const hand: DealCard[] = [];
    for (let i = 0; i < count && deck.length > 0; i++) {
      const card = { ...deck.shift()!, assignedToPlayerId: newPlayers[pi].id };
      hand.push(card);
    }
    newPlayers[pi] = { ...newPlayers[pi], handDeals: hand };
  }

  // 共有ディール配布
  for (let i = 0; i < sharedCount && deck.length > 0; i++) {
    const card = { ...deck.shift()!, isShared: true };
    newSharedDeals.push(card);
  }

  return {
    ...game,
    players: newPlayers,
    dealDeck: deck,
    sharedDeals: newSharedDeals,
  };
}

// ──────────────────────────────────────────────
// 投資実行
// ──────────────────────────────────────────────

/** 持分（%）計算: investment / valuation * 100 */
function calcOwnership(amount: number, valuation: number): number {
  return valuation > 0 ? (amount / valuation) * 100 : 0;
}

export function executeLeadInvestment(
  game: GameState,
  playerId: string,
  startupId: string,
  amount: number,
): GameState {
  const playerIdx = game.players.findIndex(p => p.id === playerId);
  if (playerIdx === -1) return game;

  const player = game.players[playerIdx];
  if (player.remainingCapital < amount) return game;

  const startup = game.allStartups.find(s => s.id === startupId);
  if (!startup) return game;

  const ownership = calcOwnership(amount, startup.currentValuation);

  const newInvestment: Investment = {
    startupId,
    investmentType: 'lead',
    rounds: [{ round: game.currentRound, amount, stage: startup.currentStage, valuationAtInvestment: startup.currentValuation }],
    ownershipPercent: ownership,
    hasProRataRight: true,
  };

  const updatedPlayer: Player = {
    ...player,
    remainingCapital: player.remainingCapital - amount,
    totalInvested: player.totalInvested + amount,
    portfolio: [...player.portfolio, newInvestment],
    // 手札から該当カードを除去
    handDeals: player.handDeals.filter(d => d.startupId !== startupId),
  };

  const updatedPlayers = game.players.map((p, i) =>
    i === playerIdx ? updatedPlayer : p,
  );

  // スタートアップのleadInvestorとinvestorsを更新
  const updatedStartups = game.allStartups.map(s => {
    if (s.id !== startupId) return s;
    return {
      ...s,
      leadInvestorId: playerId,
      investors: s.investors.includes(playerId) ? s.investors : [...s.investors, playerId],
    };
  });

  return {
    ...game,
    players: updatedPlayers,
    allStartups: updatedStartups,
    actionsRemaining: game.actionsRemaining - 1,
  };
}

export function executeFollowInvestment(
  game: GameState,
  playerId: string,
  startupId: string,
  amount: number,
): GameState {
  const playerIdx = game.players.findIndex(p => p.id === playerId);
  if (playerIdx === -1) return game;

  const player = game.players[playerIdx];
  if (player.remainingCapital < amount) return game;

  const startup = game.allStartups.find(s => s.id === startupId);
  if (!startup) return game;

  const ownership = calcOwnership(amount, startup.currentValuation);

  // 既存の投資があればフォローオン（ラウンド追加）
  const existingIdx = player.portfolio.findIndex(inv => inv.startupId === startupId);

  let newPortfolio: Investment[];
  if (existingIdx !== -1) {
    const existing = player.portfolio[existingIdx];
    const newRound = { round: game.currentRound, amount, stage: startup.currentStage, valuationAtInvestment: startup.currentValuation };
    const updatedInv: Investment = {
      ...existing,
      rounds: [...existing.rounds, newRound],
      ownershipPercent: existing.ownershipPercent + ownership,
    };
    newPortfolio = player.portfolio.map((inv, i) => (i === existingIdx ? updatedInv : inv));
  } else {
    const newInvestment: Investment = {
      startupId,
      investmentType: 'follow',
      rounds: [{ round: game.currentRound, amount, stage: startup.currentStage, valuationAtInvestment: startup.currentValuation }],
      ownershipPercent: ownership,
      hasProRataRight: false,
    };
    newPortfolio = [...player.portfolio, newInvestment];
  }

  const updatedPlayer: Player = {
    ...player,
    remainingCapital: player.remainingCapital - amount,
    totalInvested: player.totalInvested + amount,
    portfolio: newPortfolio,
    handDeals: player.handDeals.filter(d => d.startupId !== startupId),
  };

  const updatedPlayers = game.players.map((p, i) =>
    i === playerIdx ? updatedPlayer : p,
  );

  const updatedStartups = game.allStartups.map(s => {
    if (s.id !== startupId) return s;
    return {
      ...s,
      investors: s.investors.includes(playerId) ? s.investors : [...s.investors, playerId],
    };
  });

  return {
    ...game,
    players: updatedPlayers,
    allStartups: updatedStartups,
    actionsRemaining: game.actionsRemaining - 1,
  };
}

// ──────────────────────────────────────────────
// 未実現評価額（持分換算）
// ──────────────────────────────────────────────

const EXITED_OR_DEAD = new Set(['dead', 'exited_ma', 'exited_ipo', 'exited_mega_ipo']);

export function calcUnrealizedValue(player: Player, startups: Startup[]): number {
  return player.portfolio.reduce((sum, inv) => {
    const s = startups.find(st => st.id === inv.startupId);
    if (!s || EXITED_OR_DEAD.has(s.status)) return sum;
    return sum + s.currentValuation * (inv.ownershipPercent / 100);
  }, 0);
}

// ──────────────────────────────────────────────
// ラウンドスナップショット
// ──────────────────────────────────────────────

export function takeRoundSnapshot(game: GameState): RoundSnapshot {
  const playerSnapshots: PlayerSnapshot[] = game.players.map(p => {
    const unrealizedValue = calcUnrealizedValue(p, game.allStartups);
    const dpi = p.totalInvested > 0
      ? (p.realizedReturns + p.liquidationReturns) / p.totalInvested
      : 0;
    const aliveCount = p.portfolio.filter(inv => {
      const s = game.allStartups.find(st => st.id === inv.startupId);
      return s && !EXITED_OR_DEAD.has(s.status);
    }).length;

    return {
      playerId: p.id,
      dpi,
      totalInvested: p.totalInvested,
      realizedReturns: p.realizedReturns,
      unrealizedValue,
      portfolioCount: p.portfolio.length,
      aliveCount,
    };
  });

  return {
    round: game.currentRound,
    eventTitle: game.currentEvent?.title ?? null,
    playerSnapshots,
    growthResults: game.currentGrowthResults,
  };
}

// ──────────────────────────────────────────────
// 最終清算
// ──────────────────────────────────────────────

export function doFinalSettlement(game: GameState): GameState {
  const updatedPlayers = game.players.map(player => {
    let liquidationTotal = 0;

    for (const inv of player.portfolio) {
      const startup = game.allStartups.find(s => s.id === inv.startupId);
      if (!startup) continue;
      // Exit・死亡済みは除外（既に realizedReturns に含まれている）
      if (EXITED_OR_DEAD.has(startup.status)) continue;

      // 生存企業を 50% ディスカウントで清算
      const liquidationValue =
        startup.currentValuation * (inv.ownershipPercent / 100) * LIQUIDATION_DISCOUNT;
      liquidationTotal += liquidationValue;
    }

    return {
      ...player,
      liquidationReturns: player.liquidationReturns + liquidationTotal,
    };
  });

  return { ...game, players: updatedPlayers };
}

// ──────────────────────────────────────────────
// ラウンド進行
// ──────────────────────────────────────────────

/** イベントカードを1枚ドローし、ゲームに適用する */
export function drawEvent(game: GameState): GameState {
  if (game.eventDeck.length === 0) {
    return { ...game, currentEvent: null };
  }
  const [card, ...rest] = game.eventDeck;
  return {
    ...game,
    currentEvent: card,
    eventDeck: rest,
    eventHistory: [...game.eventHistory, card],
  };
}

/** ラウンドをインクリメント（サマリー後に呼ぶ） */
export function advanceRound(game: GameState): GameState {
  const snapshot = takeRoundSnapshot(game);
  const nextRound = game.currentRound + 1;

  const isLastRound = game.currentRound >= game.settings.totalRounds;

  // 全スタートアップの stageAdvancedThisRound をリセット
  const resetStartups = game.allStartups.map(s => ({ ...s, stageAdvancedThisRound: false }));

  return {
    ...game,
    currentRound: nextRound,
    currentPhase: isLastRound ? 'final_settlement' : 'management_fee',
    currentPlayerIndex: 0,
    actionsRemaining: game.settings.actionsPerTurn,
    currentEvent: null,
    currentGrowthResults: [],
    sharedDeals: [],
    roundHistory: [...game.roundHistory, snapshot],
    allStartups: resetStartups,
  };
}
