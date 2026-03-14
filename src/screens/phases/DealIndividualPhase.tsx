import { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { formatCurrency, SECTOR_LABELS, STAGE_LABELS, LEAD_INVESTMENT_RATE, FOLLOW_INVESTMENT_RATE } from '../../data/constants';
import type { Startup, DealCard } from '../../types/game';

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

function DealCard({ deal, startup, onLead, onFollow, onPass, disabled }: {
  deal: DealCard;
  startup: Startup;
  onLead: () => void;
  onFollow: () => void;
  onPass: () => void;
  disabled: boolean;
}) {
  const [mode, setMode] = useState<'view' | 'confirm_lead' | 'confirm_follow'>('view');

  const leadAmount = Math.round(startup.currentValuation * LEAD_INVESTMENT_RATE);
  const followAmount = Math.round(startup.currentValuation * FOLLOW_INVESTMENT_RATE);

  if (mode === 'confirm_lead') {
    return (
      <div className="bg-indigo-900/30 rounded-xl p-4 border border-indigo-600">
        <h4 className="text-white font-bold mb-1">{startup.name}</h4>
        <p className="text-slate-300 text-sm mb-4">
          リード投資: <span className="text-indigo-300 font-bold">{formatCurrency(leadAmount)}</span>
          （評価額の{(LEAD_INVESTMENT_RATE * 100).toFixed(0)}%）
        </p>
        <p className="text-slate-400 text-xs mb-4">
          リード投資家として持分を取得し、成長判定に+{1}のボーナスを付与します。
        </p>
        <div className="flex gap-2">
          <button
            onClick={onLead}
            className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            確定
          </button>
          <button
            onClick={() => setMode('view')}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'confirm_follow') {
    return (
      <div className="bg-slate-700/60 rounded-xl p-4 border border-slate-500">
        <h4 className="text-white font-bold mb-1">{startup.name}</h4>
        <p className="text-slate-300 text-sm mb-4">
          フォロー投資: <span className="text-slate-200 font-bold">{formatCurrency(followAmount)}</span>
          （評価額の{(FOLLOW_INVESTMENT_RATE * 100).toFixed(0)}%）
        </p>
        <div className="flex gap-2">
          <button
            onClick={onFollow}
            className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            確定
          </button>
          <button
            onClick={() => setMode('view')}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-700/60 rounded-xl p-4 border border-slate-600 hover:border-indigo-500/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="text-white font-bold">{startup.name}</h4>
          <span className="text-xs text-slate-400">
            {SECTOR_LABELS[startup.sector]} · {STAGE_LABELS[startup.currentStage]}
          </span>
        </div>
        <span className="text-indigo-400 font-bold text-sm">{formatCurrency(startup.currentValuation)}</span>
      </div>

      <div className="space-y-1 text-sm mb-4">
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

      <div className="flex gap-2">
        <button
          onClick={() => setMode('confirm_lead')}
          disabled={disabled}
          className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
        >
          リード {formatCurrency(leadAmount)}
        </button>
        <button
          onClick={() => setMode('confirm_follow')}
          disabled={disabled}
          className="flex-1 px-3 py-2 bg-slate-600 hover:bg-slate-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
        >
          フォロー {formatCurrency(followAmount)}
        </button>
        <button
          onClick={onPass}
          disabled={disabled}
          className="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 text-sm rounded-lg transition-colors"
        >
          パス
        </button>
      </div>
    </div>
  );
}

export function DealIndividualPhase() {
  const { state, dispatchGame } = useGame();
  const game = state.game!;
  const currentPlayer = game.players[game.currentPlayerIndex];

  const actionsLeft = game.actionsRemaining;
  const isOutOfActions = actionsLeft <= 0;

  function handleLead(startupId: string) {
    dispatchGame({ type: 'INVEST_LEAD', playerId: currentPlayer.id, startupId, amount: 0 });
  }

  function handleFollow(startupId: string) {
    dispatchGame({ type: 'INVEST_FOLLOW', playerId: currentPlayer.id, startupId, amount: 0 });
  }

  function handlePass() {
    dispatchGame({ type: 'PASS_ACTION' });
  }

  function handleEndTurn() {
    // 次のプレイヤーへ or deal_shared へ
    dispatchGame({ type: 'NEXT_PLAYER' });
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-lg">個別ディール — {currentPlayer.fundName}</h2>
          <p className="text-slate-400 text-sm">
            残り投資可能資金: <span className="text-emerald-400 font-semibold">{formatCurrency(currentPlayer.remainingCapital)}</span>
          </p>
        </div>

        {/* アクション残り */}
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {Array.from({ length: game.settings.actionsPerTurn }, (_, i) => (
              <div
                key={i}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  i < actionsLeft ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-500'
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>
          <button
            onClick={handleEndTurn}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded-lg transition-colors"
          >
            ターン終了 →
          </button>
        </div>
      </div>

      {/* 手札 */}
      {currentPlayer.handDeals.length === 0 ? (
        <div className="bg-slate-800/60 rounded-xl p-8 border border-slate-700 text-center">
          <p className="text-slate-400">手札がありません。</p>
          <button
            onClick={handleEndTurn}
            className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors"
          >
            次へ →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentPlayer.handDeals.map(deal => {
            const startup = game.allStartups.find(s => s.id === deal.startupId);
            if (!startup) return null;
            return (
              <DealCard
                key={deal.startupId}
                deal={deal}
                startup={startup}
                onLead={() => handleLead(deal.startupId)}
                onFollow={() => handleFollow(deal.startupId)}
                onPass={handlePass}
                disabled={isOutOfActions}
              />
            );
          })}
        </div>
      )}

      {/* アクション消費済みバナー */}
      {isOutOfActions && currentPlayer.handDeals.length > 0 && (
        <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600 text-center">
          <p className="text-slate-400 text-sm mb-3">アクションを全て使いました。</p>
          <button
            onClick={handleEndTurn}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors"
          >
            ターン終了 →
          </button>
        </div>
      )}
    </div>
  );
}
