import { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { formatCurrency, SECTOR_LABELS, STAGE_LABELS, LEAD_INVESTMENT_RATE } from '../../data/constants';
import type { DealCard as DealCardType } from '../../types/game';

const HINT_STARS: Record<string, string> = {
  A: '★★★',
  B: '★★☆',
  C: '★☆☆',
};
const HINT_COLORS: Record<string, string> = {
  A: 'text-emerald-400',
  B: 'text-amber-400',
  C: 'text-red-400',
};

/** Phase 2 簡易版: 全プレイヤーが1枚ずつ共有ディールに対して「投資する」「パス」を選択。
 * 複数が投資希望なら先着（プレイヤー順）でリード投資を実行。 */
export function DealSharedPhase() {
  const { state, dispatchGame } = useGame();
  const game = state.game!;
  const [currentDealIdx, setCurrentDealIdx] = useState(0);
  const [playerDecisions, setPlayerDecisions] = useState<Record<string, boolean>>({});
  const [decisionPlayerIdx, setDecisionPlayerIdx] = useState(0);

  const sharedDeals = game.sharedDeals;

  if (sharedDeals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh]">
        <div className="bg-slate-800/60 rounded-2xl p-8 border border-slate-700 w-full max-w-md text-center">
          <h2 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-4">
            共有ディールフェーズ
          </h2>
          <p className="text-slate-300 mb-6">共有ディールはありません。</p>
          <button
            onClick={() => dispatchGame({ type: 'ADVANCE_PHASE' })}
            className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors"
          >
            サマリーへ →
          </button>
        </div>
      </div>
    );
  }

  const currentDeal: DealCardType = sharedDeals[currentDealIdx];
  const startup = game.allStartups.find(s => s.id === currentDeal.startupId);

  if (!startup) {
    // 万が一スタートアップが見つからなければスキップ
    return null;
  }

  const currentDecisionPlayer = game.players[decisionPlayerIdx];
  const leadAmount = Math.round(startup.currentValuation * LEAD_INVESTMENT_RATE);

  function handleDecision(invest: boolean) {
    const newDecisions = { ...playerDecisions, [currentDecisionPlayer.id]: invest };
    setPlayerDecisions(newDecisions);

    const nextIdx = decisionPlayerIdx + 1;
    if (nextIdx >= game.players.length) {
      // 全プレイヤーの意思決定完了 → 投資実行
      const winner = game.players.find(p => newDecisions[p.id]);
      if (winner) {
        dispatchGame({ type: 'INVEST_LEAD', playerId: winner.id, startupId: currentDeal.startupId, amount: leadAmount });
      }

      // 次の共有ディールへ
      const nextDealIdx = currentDealIdx + 1;
      if (nextDealIdx >= sharedDeals.length) {
        // 全共有ディール終了
        dispatchGame({ type: 'ADVANCE_PHASE' });
      } else {
        setCurrentDealIdx(nextDealIdx);
        setDecisionPlayerIdx(0);
        setPlayerDecisions({});
      }
    } else {
      setDecisionPlayerIdx(nextIdx);
    }
  }

  const isLastDeal = currentDealIdx >= sharedDeals.length - 1;
  const decidedCount = Object.keys(playerDecisions).length;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="bg-slate-800/60 rounded-2xl p-8 border border-slate-700 w-full max-w-lg">
        <h2 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2 text-center">
          共有ディール {currentDealIdx + 1} / {sharedDeals.length}
        </h2>

        {/* 共有ディールカード */}
        <div className="bg-slate-700/60 rounded-xl p-5 border border-slate-600 mb-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-white text-xl font-bold">{startup.name}</h3>
              <span className="text-xs text-slate-400">
                {SECTOR_LABELS[startup.sector]} · {STAGE_LABELS[startup.currentStage]}
              </span>
            </div>
            <span className="text-indigo-400 font-bold">{formatCurrency(startup.currentValuation)}</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">チーム力</span>
              <span className={HINT_COLORS[startup.hints.teamQuality]}>
                {HINT_STARS[startup.hints.teamQuality]} ({startup.hints.teamQuality})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">市場規模</span>
              <span className={HINT_COLORS[startup.hints.marketSize]}>
                {HINT_STARS[startup.hints.marketSize]} ({startup.hints.marketSize})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">プロダクト</span>
              <span className={HINT_COLORS[startup.hints.productReadiness]}>
                {HINT_STARS[startup.hints.productReadiness]} ({startup.hints.productReadiness})
              </span>
            </div>
          </div>
        </div>

        {/* 意思決定フロー */}
        <div className="mb-4">
          <p className="text-slate-400 text-xs mb-2">
            決定済み: {decidedCount} / {game.players.length} プレイヤー
          </p>
          {/* 既に決定したプレイヤー */}
          <div className="flex flex-wrap gap-2 mb-4">
            {game.players.slice(0, decisionPlayerIdx).map(p => (
              <span
                key={p.id}
                className={`text-xs px-2 py-1 rounded-full ${
                  playerDecisions[p.id]
                    ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-700'
                    : 'bg-slate-700/50 text-slate-400 border border-slate-600'
                }`}
              >
                {p.fundName}: {playerDecisions[p.id] ? '投資' : 'パス'}
              </span>
            ))}
          </div>
        </div>

        {/* 現在のプレイヤーの意思決定 */}
        <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-800">
          <p className="text-slate-300 text-sm mb-1">
            <span className="text-indigo-400 font-bold">{currentDecisionPlayer.fundName}</span> の番
          </p>
          <p className="text-slate-400 text-xs mb-4">
            リード投資額: {formatCurrency(leadAmount)}
            （残り資金: {formatCurrency(currentDecisionPlayer.remainingCapital)}）
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => handleDecision(true)}
              disabled={currentDecisionPlayer.remainingCapital < leadAmount}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              投資する
            </button>
            <button
              onClick={() => handleDecision(false)}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-lg transition-colors"
            >
              パス
            </button>
          </div>
        </div>

        {isLastDeal && decidedCount === 0 && (
          <button
            onClick={() => dispatchGame({ type: 'ADVANCE_PHASE' })}
            className="w-full mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-sm transition-colors"
          >
            スキップしてサマリーへ
          </button>
        )}
      </div>
    </div>
  );
}
