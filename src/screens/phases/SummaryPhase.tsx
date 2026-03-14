import { useGame } from '../../context/GameContext';
import { formatCurrency } from '../../data/constants';
import { calcUnrealizedValue } from '../../logic/gameEngine';
import type { GrowthJudgmentResult } from '../../types/game';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const PLAYER_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function calcDPI(realizedReturns: number, liquidationReturns: number, totalInvested: number): number {
  if (totalInvested === 0) return 0;
  return (realizedReturns + liquidationReturns) / totalInvested;
}

const GROWTH_LABELS: Record<string, string> = {
  death: '倒産',
  struggling: '苦戦',
  stable: '横ばい',
  growth: '成長',
  rapid_growth: '急成長',
  breakout: 'ブレイクアウト',
};

const GROWTH_ICONS: Record<string, string> = {
  death: '✕',
  struggling: '↓',
  stable: '→',
  growth: '↑',
  rapid_growth: '↑↑',
  breakout: '🚀',
};

export function SummaryPhase() {
  const { state, dispatchGame } = useGame();
  const game = state.game!;

  const isLastRound = game.currentRound >= game.settings.totalRounds;

  // DPIでソートしたプレイヤーランキング
  const rankedPlayers = [...game.players].sort((a, b) => {
    const dpiA = calcDPI(a.realizedReturns, a.liquidationReturns, a.totalInvested);
    const dpiB = calcDPI(b.realizedReturns, b.liquidationReturns, b.totalInvested);
    return dpiB - dpiA;
  });

  // 今ラウンドのハイライト
  const results = game.currentGrowthResults;
  const highlights = results
    .filter(r => r.result === 'breakout' || r.result === 'rapid_growth' || r.result === 'death' || r.isExitJudgment)
    .slice(0, 5);

  // DPI推移グラフデータ（roundHistory から構築）
  const dpiChartData = game.roundHistory.map(snap => {
    const point: Record<string, string | number> = { round: `Y${snap.round}` };
    snap.playerSnapshots.forEach(ps => {
      const name = game.players.find(p => p.id === ps.playerId)?.fundName ?? ps.playerId;
      point[name] = +ps.dpi.toFixed(3);
    });
    return point;
  });

  function handleNext() {
    if (isLastRound) {
      dispatchGame({ type: 'FINAL_SETTLEMENT' });
    } else {
      dispatchGame({ type: 'ADVANCE_ROUND' });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-lg">
          ラウンドサマリー — Year {game.currentRound}
          {isLastRound && (
            <span className="ml-2 text-amber-400 text-sm">（最終ラウンド）</span>
          )}
        </h2>
        <button
          onClick={handleNext}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors text-sm"
        >
          {isLastRound ? '最終清算へ →' : `Year ${game.currentRound + 1} へ →`}
        </button>
      </div>

      {/* ファンドランキング */}
      <section className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
        <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-4">
          ファンドランキング
        </h3>
        <div className="space-y-3">
          {rankedPlayers.map((p, rank) => {
            const dpi = calcDPI(p.realizedReturns, p.liquidationReturns, p.totalInvested);
            const unrealized = calcUnrealizedValue(p, game.allStartups);
            const isCurrentPlayer =
              p.id === game.players[game.currentPlayerIndex]?.id;

            return (
              <div
                key={p.id}
                className={`flex items-center gap-4 p-3 rounded-lg ${
                  rank === 0
                    ? 'bg-yellow-900/20 border border-yellow-700/50'
                    : isCurrentPlayer
                    ? 'bg-indigo-900/20 border border-indigo-700/50'
                    : 'bg-slate-700/30'
                }`}
              >
                <span className={`text-lg font-bold w-8 text-center ${
                  rank === 0 ? 'text-yellow-400' : 'text-slate-500'
                }`}>
                  #{rank + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">{p.fundName}</span>
                    {rank === 0 && <span className="text-yellow-400 text-xs">👑 リード</span>}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    投資{p.portfolio.length}社 · 残り{formatCurrency(p.remainingCapital)}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold text-lg ${dpi >= 1 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {dpi.toFixed(2)}x
                  </div>
                  <div className="text-xs text-slate-400">
                    未実現 {formatCurrency(unrealized)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* DPI推移グラフ（Round 2以降に表示） */}
      {dpiChartData.length > 0 && (
        <section className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
          <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-4">
            DPI推移
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={dpiChartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <XAxis dataKey="round" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={(val: number) => [`${val.toFixed(2)}x`, '']}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              {game.players.map((p, i) => (
                <Line
                  key={p.id}
                  type="monotone"
                  dataKey={p.fundName}
                  stroke={PLAYER_COLORS[i % PLAYER_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* 今ラウンドのハイライト */}
      {highlights.length > 0 && (
        <section className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
          <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-4">
            今ラウンドのハイライト
          </h3>
          <div className="space-y-2">
            {highlights.map((r: GrowthJudgmentResult) => {
              const startup = game.allStartups.find(s => s.id === r.startupId);
              if (!startup) return null;
              const icon = r.isExitJudgment && r.exitResult
                ? (r.exitResult.result === 'mega_ipo' ? '🌟' : r.exitResult.result === 'ipo' ? '⭐' : r.exitResult.result === 'ma' ? '💰' : '💀')
                : (GROWTH_ICONS[r.result] ?? '');
              const label = r.isExitJudgment && r.exitResult
                ? (r.exitResult.result === 'fail' ? 'Exit失敗' : r.exitResult.result === 'mega_ipo' ? 'メガIPO！' : r.exitResult.result === 'ipo' ? 'IPO！' : 'M&A Exit')
                : (GROWTH_LABELS[r.result] ?? r.result);

              return (
                <div key={r.startupId} className="flex items-center gap-3 text-sm">
                  <span className="text-xl w-8 text-center">{icon}</span>
                  <span className="text-white font-semibold">{startup.name}</span>
                  <span className="text-slate-400">{label}</span>
                  {r.isExitJudgment && r.exitResult && r.exitResult.result !== 'fail' && (
                    <span className="text-emerald-400 font-semibold">
                      {formatCurrency(r.exitResult.exitValuation)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 次ラウンドのプレビュー情報 */}
      {!isLastRound && (
        <div className="text-slate-500 text-xs text-center">
          Next: Year {game.currentRound + 1} —
          {game.currentRound + 1 <= game.settings.investmentPeriod
            ? ' 新規投資可能'
            : ' フォローオンのみ'}
        </div>
      )}
    </div>
  );
}
