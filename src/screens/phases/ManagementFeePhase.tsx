import { useGame } from '../../context/GameContext';
import { formatCurrency } from '../../data/constants';

export function ManagementFeePhase() {
  const { state, dispatchGame } = useGame();
  const game = state.game!;

  const annualFee = game.settings.fundSize * game.settings.managementFeeRate;
  const totalFees = annualFee * game.settings.totalRounds;
  const investableCapital = game.settings.fundSize - totalFees;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="bg-slate-800/60 rounded-2xl p-8 border border-slate-700 w-full max-w-md text-center">
        <h2 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-6">
          管理報酬フェーズ — Year {game.currentRound}
        </h2>

        <div className="space-y-4 mb-8">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">ファンド規模</span>
            <span className="text-white font-semibold">{formatCurrency(game.settings.fundSize)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">年間管理報酬 ({(game.settings.managementFeeRate * 100).toFixed(0)}%)</span>
            <span className="text-amber-400 font-semibold">−{formatCurrency(annualFee)}</span>
          </div>
          <div className="border-t border-slate-700 pt-3 flex justify-between text-sm">
            <span className="text-slate-400">管理報酬総額（{game.settings.totalRounds}年分）</span>
            <span className="text-red-400 font-semibold">−{formatCurrency(totalFees)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">投資可能総額</span>
            <span className="text-emerald-400 font-bold text-lg">{formatCurrency(investableCapital)}</span>
          </div>
        </div>

        <p className="text-slate-500 text-xs mb-6">
          管理報酬はファンド開始時に一括控除済みです。
        </p>

        <button
          onClick={() => dispatchGame({ type: 'DEDUCT_MANAGEMENT_FEE' })}
          className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors"
        >
          次のフェーズへ →
        </button>
      </div>
    </div>
  );
}
