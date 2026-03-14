import { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { SECTOR_LABELS } from '../../data/constants';

export function MarketEventPhase() {
  const { state, dispatchGame } = useGame();
  const game = state.game!;
  const [isRevealing, setIsRevealing] = useState(false);

  // イベントカードが引かれたとき（null → 非null）にアニメーションをトリガー
  useEffect(() => {
    if (game.currentEvent) {
      setIsRevealing(true);
      const t = setTimeout(() => setIsRevealing(false), 600);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.currentEvent?.id]);

  const categoryLabel: Record<string, string> = {
    bubble: 'バブル',
    winter: '冬の時代',
    regulation: '規制変化',
    breakthrough: '技術革新',
    exit_window: 'Exitウィンドウ',
    black_swan: 'ブラックスワン',
    lp_pressure: 'LPプレッシャー',
  };

  const categoryColor: Record<string, string> = {
    bubble: 'text-emerald-400 bg-emerald-900/30 border-emerald-700',
    winter: 'text-blue-400 bg-blue-900/30 border-blue-700',
    regulation: 'text-amber-400 bg-amber-900/30 border-amber-700',
    breakthrough: 'text-purple-400 bg-purple-900/30 border-purple-700',
    exit_window: 'text-yellow-400 bg-yellow-900/30 border-yellow-700',
    black_swan: 'text-red-400 bg-red-900/30 border-red-700',
    lp_pressure: 'text-orange-400 bg-orange-900/30 border-orange-700',
  };

  // まだイベントが引かれていない場合はドロー画面を表示
  if (!game.currentEvent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="bg-slate-800/60 rounded-2xl p-8 border border-slate-700 w-full max-w-md text-center">
          <h2 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-6">
            市場イベントフェーズ — Year {game.currentRound}
          </h2>
          <p className="text-slate-300 mb-8">イベントカードをドローします。</p>
          <button
            onClick={() => dispatchGame({ type: 'DRAW_EVENT' })}
            className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors"
          >
            カードをドロー
          </button>
        </div>
      </div>
    );
  }

  const ev = game.currentEvent;
  const colorClass = categoryColor[ev.category] ?? 'text-slate-400 bg-slate-700/30 border-slate-600';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="bg-slate-800/60 rounded-2xl p-8 border border-slate-700 w-full max-w-lg">
        <h2 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-6 text-center">
          市場イベント — Year {game.currentRound}
        </h2>

        <div
          className={`rounded-xl p-6 border mb-6 ${colorClass}`}
          style={isRevealing ? { animation: 'cardReveal 0.45s ease-out' } : undefined}
        >
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-white text-xl font-bold">{ev.title}</h3>
            <span className={`text-xs px-2 py-1 rounded-full border ${colorClass}`}>
              {categoryLabel[ev.category] ?? ev.category}
            </span>
          </div>
          <p className="text-slate-300 text-sm mb-4">{ev.description}</p>

          <div className="space-y-2">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">効果</p>
            {ev.effects.map((eff, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-slate-400">
                  {eff.target === 'all' ? '全セクター' : SECTOR_LABELS[eff.target] ?? eff.target}
                </span>
                {eff.growthModifier !== 0 && (
                  <span className={eff.growthModifier > 0 ? 'text-emerald-400' : 'text-red-400'}>
                    成長判定 {eff.growthModifier > 0 ? `+${eff.growthModifier}` : eff.growthModifier}
                  </span>
                )}
                {eff.exitModifier != null && eff.exitModifier !== 0 && (
                  <span className={eff.exitModifier > 0 ? 'text-yellow-400' : 'text-red-400'}>
                    Exit判定 {eff.exitModifier > 0 ? `+${eff.exitModifier}` : eff.exitModifier}
                  </span>
                )}
                {eff.specialEffect && (
                  <span className="text-orange-400">
                    特殊: {eff.specialEffect}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => dispatchGame({ type: 'ADVANCE_PHASE' })}
          className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors"
        >
          成長判定へ →
        </button>
      </div>
    </div>
  );
}
