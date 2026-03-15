import { useGame, clearSaveData } from '../context/GameContext';
import { formatCurrency, SECTOR_LABELS, STAGE_LABELS } from '../data/constants';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';

const PLAYER_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const EXIT_COLORS: Record<string, string> = {
  mega_ipo: '#fbbf24',
  ipo: '#a78bfa',
  ma: '#34d399',
};

function calcFinalDPI(realizedReturns: number, liquidationReturns: number, totalInvested: number): number {
  if (totalInvested === 0) return 0;
  return (realizedReturns + liquidationReturns) / totalInvested;
}

export function ResultScreen() {
  const { state, dispatch } = useGame();
  const game = state.game!;

  // 最終ランキング（DPI降順）
  const rankedPlayers = [...game.players].sort((a, b) => {
    const dpiA = calcFinalDPI(a.realizedReturns, a.liquidationReturns, a.totalInvested);
    const dpiB = calcFinalDPI(b.realizedReturns, b.liquidationReturns, b.totalInvested);
    if (dpiB !== dpiA) return dpiB - dpiA;
    // 同点: 総投資額が多い方を上位（より積極的）、さらに同じならファンド名アルファベット順
    if (b.totalInvested !== a.totalInvested) return b.totalInvested - a.totalInvested;
    return a.fundName.localeCompare(b.fundName);
  });

  // DPI推移グラフデータ（全ラウンド）
  const dpiChartData = game.roundHistory.map(snap => {
    const point: Record<string, string | number> = { round: `Y${snap.round}` };
    snap.playerSnapshots.forEach(ps => {
      const name = game.players.find(p => p.id === ps.playerId)?.fundName ?? ps.playerId;
      point[name] = +ps.dpi.toFixed(3);
    });
    return point;
  });

  // パワーロウチャート: Exit済みスタートアップを exitValuation 降順
  const exitData = game.allStartups
    .filter(s => s.exitValuation !== null && s.exitValuation > 0)
    .map(s => ({
      name: s.name.length > 9 ? s.name.slice(0, 9) + '…' : s.name,
      value: Math.round((s.exitValuation ?? 0) / 100_000_000 * 10) / 10, // 億円
      exitType: s.exitType ?? 'ma',
    }))
    .sort((a, b) => b.value - a.value);

  function handleRestart() {
    clearSaveData();
    dispatch({ type: 'NAVIGATE', screen: 'title' });
  }

  const winner = rankedPlayers[0];
  const winnerDPI = winner
    ? calcFinalDPI(winner.realizedReturns, winner.liquidationReturns, winner.totalInvested)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-3xl mx-auto space-y-6 pb-12">

        {/* ヘッダー */}
        <div className="text-center py-8">
          <div className="text-5xl mb-3">🏆</div>
          <h1 className="text-3xl font-bold text-white mb-2">ゲーム終了</h1>
          <p className="text-slate-400">
            {game.settings.totalRounds}年間の運用が完了しました
          </p>
          {winner && (
            <div className="mt-4 inline-block bg-yellow-900/30 border border-yellow-700/60 rounded-xl px-6 py-2">
              <span className="text-yellow-400 font-bold text-lg">{winner.fundName}</span>
              <span className="text-slate-300 ml-2">優勝！ {winnerDPI.toFixed(2)}x</span>
            </div>
          )}
        </div>

        {/* 最終ランキング */}
        <section className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
          <h2 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-4">
            最終ランキング
          </h2>
          <div className="space-y-3">
            {rankedPlayers.map((p, rank) => {
              const dpi = calcFinalDPI(p.realizedReturns, p.liquidationReturns, p.totalInvested);
              const totalReturn = p.realizedReturns + p.liquidationReturns;
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-4 p-4 rounded-xl ${
                    rank === 0
                      ? 'bg-yellow-900/25 border border-yellow-700/60'
                      : rank === 1
                      ? 'bg-slate-700/40 border border-slate-600'
                      : 'bg-slate-700/20 border border-slate-700/50'
                  }`}
                >
                  <span className={`text-2xl font-bold w-10 text-center ${
                    rank === 0 ? 'text-yellow-400' : rank === 1 ? 'text-slate-300' : 'text-slate-500'
                  }`}>
                    #{rank + 1}
                  </span>
                  <div className="flex-1">
                    <div className="text-white font-bold text-base">{p.fundName}</div>
                    <div className="text-slate-400 text-xs mt-0.5">
                      総投資 {formatCurrency(p.totalInvested)} →
                      回収 {formatCurrency(totalReturn)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold text-2xl ${dpi >= 2 ? 'text-yellow-400' : dpi >= 1 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {dpi.toFixed(2)}x
                    </div>
                    <div className="text-xs text-slate-500">DPI</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* DPI推移グラフ */}
        {dpiChartData.length > 0 && (
          <section className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
            <h2 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-4">
              DPI推移
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dpiChartData} margin={{ top: 4, right: 12, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="round" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  labelStyle={{ color: '#94a3b8' }}
                  formatter={(val: unknown) => [typeof val === 'number' ? `${val.toFixed(2)}x` : '', '']}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                {game.players.map((p, i) => (
                  <Line
                    key={p.id}
                    type="monotone"
                    dataKey={p.fundName}
                    stroke={PLAYER_COLORS[i % PLAYER_COLORS.length]}
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </section>
        )}

        {/* ファンド別パワーロウ分析 */}
        <section className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
          <h2 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">
            ファンド別 パワーロウ分析
          </h2>
          <p className="text-slate-500 text-xs mb-4">
            各ファンドのリターンが少数の投資先に集中しているかを確認する
          </p>
          <div className="space-y-4">
            {rankedPlayers.map(player => {
              const playerIdx = game.players.findIndex(p => p.id === player.id);
              const playerColor = PLAYER_COLORS[playerIdx % PLAYER_COLORS.length];

              // 各投資先のリターンを計算（コスト・回収額・倍率）
              const invReturns = player.portfolio.map(inv => {
                const s = game.allStartups.find(st => st.id === inv.startupId);
                const costBasis = inv.rounds.reduce((sum, r) => sum + r.amount, 0);
                const returnValue = !s || s.status === 'dead' ? 0
                  : (s.exitValuation ?? s.currentValuation) * inv.ownershipPercent / 100;
                return {
                  name: s?.name ?? '不明',
                  sector: s?.sector ?? 'saas' as const,
                  costBasis,
                  returnValue,
                  multiple: costBasis > 0 ? returnValue / costBasis : 0,
                };
              }).sort((a, b) => b.returnValue - a.returnValue);

              const totalReturn = invReturns.reduce((sum, r) => sum + r.returnValue, 0);
              const topShare = totalReturn > 0 ? (invReturns[0]?.returnValue ?? 0) / totalReturn * 100 : 0;

              const badge = topShare >= 50
                ? { text: 'パワーロウ顕著', cls: 'text-emerald-400 bg-emerald-900/30 border-emerald-700/50' }
                : topShare >= 30
                ? { text: 'やや集中', cls: 'text-amber-400 bg-amber-900/30 border-amber-700/50' }
                : { text: '分散型', cls: 'text-slate-400 bg-slate-700/50 border-slate-600/50' };

              return (
                <div key={player.id} className="bg-slate-900/40 rounded-lg p-4 border border-slate-700/60">
                  {/* ヘッダー */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: playerColor }} />
                      <span className="text-white font-semibold text-sm">{player.fundName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${badge.cls}`}>
                        {badge.text}
                      </span>
                    </div>
                    {totalReturn > 0 && (
                      <span className="text-slate-400 text-xs">上位1社 {topShare.toFixed(0)}%</span>
                    )}
                  </div>

                  {/* 投資先ランキング（バー付き） */}
                  {invReturns.length === 0 ? (
                    <p className="text-slate-500 text-xs">投資なし</p>
                  ) : (
                    <div className="space-y-1.5">
                      {invReturns.map((inv, i) => {
                        const barPct = totalReturn > 0 ? inv.returnValue / totalReturn * 100 : 0;
                        const isTop = i === 0 && inv.returnValue > 0;
                        return (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="text-slate-600 w-4 shrink-0 text-center">#{i + 1}</span>
                            <span className={`w-24 truncate shrink-0 ${isTop ? 'text-white font-semibold' : 'text-slate-300'}`}>
                              {inv.name}
                            </span>
                            <span className="text-slate-500 w-14 shrink-0">{SECTOR_LABELS[inv.sector]}</span>
                            <div className="flex-1 h-3.5 bg-slate-700/50 rounded overflow-hidden">
                              {barPct > 0 && (
                                <div
                                  className={`h-full rounded ${isTop ? 'bg-indigo-500' : 'bg-slate-600'}`}
                                  style={{ width: `${barPct}%` }}
                                />
                              )}
                            </div>
                            <span className="text-slate-400 w-8 text-right shrink-0">{barPct.toFixed(0)}%</span>
                            <span className={`w-12 text-right shrink-0 font-medium ${
                              inv.multiple >= 3 ? 'text-yellow-400' :
                              inv.multiple >= 1 ? 'text-emerald-400' :
                              inv.multiple > 0 ? 'text-amber-400' : 'text-red-400'
                            }`}>
                              {inv.multiple.toFixed(1)}x
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* パワーロウ分布 */}
        {exitData.length > 0 && (
          <section className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
            <h2 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">
              リターン分布（パワーロウ）
            </h2>
            <p className="text-slate-500 text-xs mb-4">
              Exit済み {exitData.length}社 — 上位少数がリターンを支配
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={exitData} margin={{ top: 4, right: 8, bottom: 40, left: -16 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  angle={-40}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit="億" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  labelStyle={{ color: '#e2e8f0' }}
                  formatter={(val: unknown) => [typeof val === 'number' ? `${val}億円` : '', 'Exit評価額']}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {exitData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={EXIT_COLORS[entry.exitType] ?? '#6366f1'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-3 justify-center text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: EXIT_COLORS.mega_ipo }} />
                メガIPO
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: EXIT_COLORS.ipo }} />
                IPO
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: EXIT_COLORS.ma }} />
                M&A
              </span>
            </div>
          </section>
        )}

        {/* ポートフォリオ全体 */}
        <section className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
          <h2 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-4">
            全スタートアップ（{game.allStartups.length}社）
          </h2>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {[...game.allStartups]
              .sort((a, b) => (b.exitValuation ?? b.currentValuation) - (a.exitValuation ?? a.currentValuation))
              .map(s => {
                const statusColor =
                  s.status === 'exited_mega_ipo' ? 'text-yellow-400' :
                  s.status === 'exited_ipo' ? 'text-purple-400' :
                  s.status === 'exited_ma' ? 'text-emerald-400' :
                  s.status === 'dead' ? 'text-red-400' :
                  s.status === 'struggling' ? 'text-amber-400' :
                  'text-slate-300';
                const statusLabel =
                  s.status === 'exited_mega_ipo' ? 'メガIPO' :
                  s.status === 'exited_ipo' ? 'IPO' :
                  s.status === 'exited_ma' ? 'M&A Exit' :
                  s.status === 'dead' ? '清算' :
                  s.status === 'struggling' ? '苦戦' :
                  s.status === 'stable' ? '横ばい' :
                  '成長中';
                return (
                  <div key={s.id} className="flex items-center gap-2 text-xs py-1 border-b border-slate-700/40">
                    <span className="text-slate-400 w-20 shrink-0">{SECTOR_LABELS[s.sector]}</span>
                    <span className="text-white font-medium flex-1">{s.name}</span>
                    <span className="text-slate-500">{STAGE_LABELS[s.currentStage]}</span>
                    <span className={`font-semibold w-16 text-right ${statusColor}`}>{statusLabel}</span>
                    <span className="text-slate-400 w-20 text-right">
                      {formatCurrency(s.exitValuation ?? s.currentValuation)}
                    </span>
                  </div>
                );
              })}
          </div>
        </section>

        {/* もう一度プレイ */}
        <div className="flex justify-center pt-2">
          <button
            onClick={handleRestart}
            className="px-10 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors text-base"
          >
            もう一度プレイ
          </button>
        </div>

      </div>
    </div>
  );
}
