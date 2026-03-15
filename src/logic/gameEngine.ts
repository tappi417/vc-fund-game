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

/**
 * バリュエーション追加倍率をイベントから取得。
 * valuationModifier は「成長後バリュエーションへの追加乗数」として扱う。
 * 例: valuationModifier = 0.5 → 成長後 × 1.5
 */
function getValuationModifierFromEvent(
  event: EventCard | null,
  sector: Sector,
): number {
  if (!event) return 0;
  let total = 0;
  for (const eff of event.effects) {
    if ((eff.target === 'all' || eff.target === sector) && eff.valuationModifier != null) {
      total += eff.valuationModifier;
    }
  }
  return total;
}

// ──────────────────────────────────────────────
// バリュエーション更新 (Fix 1.5: valuationModifier 適用)
// ──────────────────────────────────────────────

function applyGrowthValuation(
  current: number,
  result: GrowthResult,
  event: EventCard | null,
  sector: Sector,
): number {
  let base = current;

  if (result === 'growth') {
    const { min, max } = VALUATION_MULTIPLIER.growth;
    base = current * randomFloat(min, max);
  } else if (result === 'rapid_growth') {
    const { min, max } = VALUATION_MULTIPLIER.rapid_growth;
    base = current * randomFloat(min, max);
  } else if (result === 'breakout') {
    const { min, max } = VALUATION_MULTIPLIER.breakout;
    base = current * randomFloat(min, max);
  } else {
    return current; // stable / struggling は変化なし
  }

  // イベントの valuationModifier を追加乗数として適用
  const extraMultiplier = getValuationModifierFromEvent(event, sector);
  if (extraMultiplier !== 0) {
    base = base * (1 + extraMultiplier);
  }

  return Math.round(base / 100_000_000) * 100_000_000;
}

// ──────────────────────────────────────────────
// Exit判定
// ──────────────────────────────────────────────

export function resolveExitJudgment(
  startup: Startup,
  baseValuation: number,   // Fix 3.3: 成長後バリュエーションを受け取る
  event: EventCard | null,
  players: Player[],
): ExitJudgmentResult {
  const dice = rollDice();
  const rawTotal = dice[0] + dice[1];
  const eventModifier = getExitModifierFromEvent(event);
  const modifiedTotal = Math.min(12, Math.max(2, rawTotal + eventModifier));
  const result: ExitResult = getExitResult(modifiedTotal);

  let exitValuation = baseValuation;

  if (result !== 'fail') {
    const multiplierKey = result as 'ma' | 'ipo' | 'mega_ipo';
    const { min, max } = EXIT_MULTIPLIER[multiplierKey];
    exitValuation = Math.round(
      (baseValuation * randomFloat(min, max)) / 100_000_000,
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
// Fix 3.3: Series C Breakout は成長倍率をExit判定のベースに使用
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

  // Series C の場合は Exit 判定へ
  const isExitJudgment = startup.currentStage === 'series_c';
  let exitResult: ExitJudgmentResult | undefined;
  let newStage = previousStage;
  let newValuation = previousValuation;

  if (isExitJudgment) {
    // Fix 3.3: Breakout でも成長倍率をまずバリュエーションに反映してからExit判定
    const preExitValuation = result === 'death'
      ? previousValuation
      : applyGrowthValuation(previousValuation, result, event, startup.sector);

    exitResult = resolveExitJudgment(startup, preExitValuation, event, players);
    if (exitResult.result !== 'fail') {
      newStage = 'exited';
      newValuation = exitResult.exitValuation;
    } else {
      // Exit失敗 → series_c のまま、バリュエーションは事前計算値を反映
      newValuation = preExitValuation;
    }
  } else if (result === 'death') {
    newStage = 'dead';
  } else if (result === 'struggling' || result === 'stable') {
    newValuation = previousValuation;
  } else {
    // growth / rapid_growth / breakout → ステージ進行 + バリュエーション更新
    newStage = advanceStage(previousStage);
    newValuation = applyGrowthValuation(previousValuation, result, event, startup.sector);

    // breakout は2段階進行（series_c は上限）
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
// Fix 3.2: 投資済み企業のみ判定
// ──────────────────────────────────────────────

export function resolveAllGrowth(game: GameState): GrowthJudgmentResult[] {
  const activeStatuses = new Set(['growing', 'stable', 'struggling']);
  // 投資済み（investors.length > 0）かつアクティブなスタートアップのみ判定
  const activeStartups = game.allStartups.filter(
    s => activeStatuses.has(s.status) && s.investors.length > 0,
  );

  return activeStartups.map(startup =>
    resolveGrowthJudgment(startup, game.currentEvent, game.players),
  );
}

// ──────────────────────────────────────────────
// 成長判定結果をゲームステートに適用
// Fix 1.6: specialEffect (random_death, force_ma_exit) を実装
// ──────────────────────────────────────────────

export function applyGrowthResultsToState(
  game: GameState,
  results: GrowthJudgmentResult[],
): GameState {
  const resultMap = new Map(results.map(r => [r.startupId, r]));

  // スタートアップ更新
  let updatedStartups = game.allStartups.map(startup => {
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
        er.result === 'mega_ipo' ? 'exited_mega_ipo' :
        er.result === 'ipo'      ? 'exited_ipo' :
                                   'exited_ma';
      exitValuation = er.exitValuation;
      exitRound = game.currentRound;
      exitType = er.result === 'ma' ? 'ma' : er.result === 'ipo' ? 'ipo' : 'mega_ipo';
      consecutiveStruggling = 0;
    } else if (r.result === 'death') {
      newStatus = 'dead';
      consecutiveStruggling = 0;
    } else if (r.result === 'struggling') {
      consecutiveStruggling += 1;
      if (consecutiveStruggling >= 2 && secureRandom() < 0.3) {
        newStatus = 'dead';
        consecutiveStruggling = 0;
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

    return {
      ...startup,
      status: newStatus,
      currentStage: r.newStage,
      currentValuation: r.newValuation,
      valuationHistory: [...startup.valuationHistory, { round: game.currentRound, valuation: r.newValuation }],
      consecutiveStruggling,
      stageAdvancedThisRound,
      exitValuation,
      exitRound,
      exitType,
    };
  });

  // Fix 1.6: specialEffect の適用
  const event = game.currentEvent;
  if (event) {
    for (const eff of event.effects) {
      if (!eff.specialEffect) continue;

      if (eff.specialEffect === 'random_death') {
        // 生存中かつ未投資のスタートアップからランダムに1社を死亡させる
        const candidates = updatedStartups.filter(
          s => (s.status === 'growing' || s.status === 'stable' || s.status === 'struggling') && s.investors.length === 0,
        );
        if (candidates.length > 0) {
          const victim = candidates[Math.floor(secureRandom() * candidates.length)];
          updatedStartups = updatedStartups.map(s =>
            s.id === victim.id ? { ...s, status: 'dead' as const, currentStage: 'dead' as const } : s,
          );
        }
      }

      if (eff.specialEffect === 'force_ma_exit') {
        // Series C の全企業を強制M&A Exit（投資済みのみ）
        const forceTargets = updatedStartups.filter(
          s => s.currentStage === 'series_c' && s.investors.length > 0,
        );
        for (const target of forceTargets) {
          const { min, max } = EXIT_MULTIPLIER.ma;
          const exitVal = Math.round(
            (target.currentValuation * randomFloat(min, max)) / 100_000_000,
          ) * 100_000_000;
          updatedStartups = updatedStartups.map(s =>
            s.id !== target.id ? s : {
              ...s,
              status: 'exited_ma' as const,
              currentStage: 'exited' as const,
              exitValuation: exitVal,
              exitRound: game.currentRound,
              exitType: 'ma' as const,
            },
          );
        }
      }
      // deal_flow_reduce はディール配布フェーズで参照するため、ここでは無処理
    }
  }

  // プレイヤーへのExit回収分を反映
  const updatedPlayers = game.players.map(player => {
    let realizedReturns = player.realizedReturns;

    for (const r of results) {
      if (!r.isExitJudgment || !r.exitResult || r.exitResult.result === 'fail') continue;
      const ret = r.exitResult.returnsPerPlayer.find(x => x.playerId === player.id);
      if (ret) realizedReturns += ret.amount;
    }

    // force_ma_exit 分の回収も計上
    if (event?.effects.some(e => e.specialEffect === 'force_ma_exit')) {
      for (const startup of updatedStartups) {
        if (startup.status !== 'exited_ma' || startup.exitRound !== game.currentRound) continue;
        // results に含まれていない（通常判定外）Exit
        const alreadyCounted = results.some(r => r.startupId === startup.id && r.exitResult?.result !== 'fail');
        if (!alreadyCounted) {
          const inv = player.portfolio.find(i => i.startupId === startup.id);
          if (inv && startup.exitValuation != null) {
            realizedReturns += Math.round(startup.exitValuation * (inv.ownershipPercent / 100));
          }
        }
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
// Fix 3.1: late ラウンドでも handDeals をクリア
// Fix 1.6: deal_flow_reduce specialEffect を参照
// ──────────────────────────────────────────────

export function distributeDealsForRound(game: GameState): GameState {
  const phase = getDealPhase(game.currentRound);
  const config = DEAL_DISTRIBUTION[phase];

  if (phase === 'late') {
    // Fix 3.1: 手札を期限切れにする
    const clearedPlayers = game.players.map(p => ({ ...p, handDeals: [] as DealCard[] }));
    return { ...game, players: clearedPlayers, sharedDeals: [] };
  }

  const hasDealFlowReduce = game.currentEvent?.effects.some(
    e => e.specialEffect === 'deal_flow_reduce',
  ) ?? false;

  // deal_flow_reduce 発動時は個別ディールを1枚減らす
  const { min, max } = config.individual;
  const adjustedMin = hasDealFlowReduce ? Math.max(0, min - 1) : min;
  const adjustedMax = hasDealFlowReduce ? Math.max(0, max - 1) : max;
  const sharedCount = hasDealFlowReduce ? Math.max(0, config.shared - 1) : config.shared;

  let deck = [...game.dealDeck];
  const newPlayers = game.players.map(p => ({ ...p, handDeals: [] as DealCard[] }));
  const newSharedDeals: DealCard[] = [];

  for (let pi = 0; pi < newPlayers.length; pi++) {
    const count = Math.floor(secureRandom() * (adjustedMax - adjustedMin + 1)) + adjustedMin;
    const hand: DealCard[] = [];
    for (let i = 0; i < count && deck.length > 0; i++) {
      const card = { ...deck.shift()!, assignedToPlayerId: newPlayers[pi].id };
      hand.push(card);
    }
    newPlayers[pi] = { ...newPlayers[pi], handDeals: hand };
  }

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
    followOnDoneThisRound: false,
  };

  const updatedPlayer: Player = {
    ...player,
    remainingCapital: player.remainingCapital - amount,
    totalInvested: player.totalInvested + amount,
    portfolio: [...player.portfolio, newInvestment],
    handDeals: player.handDeals.filter(d => d.startupId !== startupId),
  };

  const updatedPlayers = game.players.map((p, i) =>
    i === playerIdx ? updatedPlayer : p,
  );

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

  const existingIdx = player.portfolio.findIndex(inv => inv.startupId === startupId);

  let newPortfolio: Investment[];
  if (existingIdx !== -1) {
    const existing = player.portfolio[existingIdx];
    const updatedInv: Investment = {
      ...existing,
      rounds: [...existing.rounds, { round: game.currentRound, amount, stage: startup.currentStage, valuationAtInvestment: startup.currentValuation }],
      ownershipPercent: existing.ownershipPercent + ownership,
      followOnDoneThisRound: true,
    };
    newPortfolio = player.portfolio.map((inv, i) => (i === existingIdx ? updatedInv : inv));
  } else {
    newPortfolio = [...player.portfolio, {
      startupId,
      investmentType: 'follow',
      rounds: [{ round: game.currentRound, amount, stage: startup.currentStage, valuationAtInvestment: startup.currentValuation }],
      ownershipPercent: ownership,
      hasProRataRight: false,
      followOnDoneThisRound: true,
    }];
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
    const liquidationTotal = player.portfolio.reduce((sum, inv) => {
      const startup = game.allStartups.find(s => s.id === inv.startupId);
      if (!startup || EXITED_OR_DEAD.has(startup.status)) return sum;
      return sum + startup.currentValuation * (inv.ownershipPercent / 100) * LIQUIDATION_DISCOUNT;
    }, 0);

    return { ...player, liquidationReturns: player.liquidationReturns + liquidationTotal };
  });

  return { ...game, players: updatedPlayers };
}

// ──────────────────────────────────────────────
// ラウンド進行
// ──────────────────────────────────────────────

/**
 * イベントカードを1枚ドローし、ゲームに適用する。
 * - カードあり: フェーズは 'market_event' のまま維持。MarketEventPhase でカード内容を確認後、
 *   「成長判定へ」ボタン（ADVANCE_PHASE）で 'growth' に進む。
 * - カードなし: イベントデッキ枯渇のためフェーズを 'growth' へ自動進行。
 */
export function drawEvent(game: GameState): GameState {
  if (game.eventDeck.length === 0) {
    return { ...game, currentEvent: null, currentPhase: 'growth' };
  }
  const [card, ...rest] = game.eventDeck;
  return {
    ...game,
    currentEvent: card,
    eventDeck: rest,
    eventHistory: [...game.eventHistory, card],
    // currentPhase は 'market_event' のまま — MarketEventPhase でカードを確認させる
  };
}

/**
 * ラウンドをインクリメント（SummaryPhase から呼ぶ）。
 * Fix 1.2: 常に 'management_fee' へ。final_settlement への遷移は SummaryPhase が担当。
 * Fix 3.1: handDeals をクリア。
 * Fix 5.3: currentAuction をリセット。
 */
export function advanceRound(game: GameState): GameState {
  const snapshot = takeRoundSnapshot(game);
  const nextRound = game.currentRound + 1;

  const clearedPlayers = game.players.map(p => ({
    ...p,
    handDeals: [] as DealCard[],
    portfolio: p.portfolio.map(inv => ({ ...inv, followOnDoneThisRound: false })),
  }));
  const resetStartups = game.allStartups.map(s => ({ ...s, stageAdvancedThisRound: false }));

  return {
    ...game,
    players: clearedPlayers,
    currentRound: nextRound,
    currentPhase: 'management_fee',  // 常に次ラウンドの最初へ（last round判定はSummaryPhaseが行う）
    currentPlayerIndex: 0,
    actionsRemaining: game.settings.actionsPerTurn,
    currentEvent: null,
    currentGrowthResults: [],
    sharedDeals: [],
    currentAuction: null,            // Fix 5.3
    roundHistory: [...game.roundHistory, snapshot],
    allStartups: resetStartups,
  };
}

/**
 * 成長判定後の次フェーズを決定する。
 * - 投資期間内: player_transition → deal_individual
 * - 投資期間外: summary
 */
export function getPhaseAfterGrowth(game: GameState): GameState['currentPhase'] {
  return game.currentRound <= game.settings.investmentPeriod
    ? 'player_transition'
    : 'summary';
}
