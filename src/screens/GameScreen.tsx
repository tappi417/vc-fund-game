import { useGame } from '../context/GameContext';
import {
  formatCurrency,
  SECTOR_LABELS,
  STAGE_LABELS,
  STATUS_LABELS,
} from '../data/constants';
import type { Player, Startup, Investment } from '../types/game';

const PHASE_LABELS: Record<string, string> = {
  management_fee: '管理報酬フェーズ',
  market_event: '市場イベントフェーズ',
  growth: '成長判定フェーズ',
  player_transition: '交代準備',
  deal_individual: 'ディールフェーズ',
  deal_shared: '共有ディールフェーズ',
  summary: 'ラウンドサマリー',
  exit_judgment: 'Exit判定フェーズ',
  final_settlement: '最終清算',
  game_over: 'ゲーム終了',
};

// Exit済み・死亡を除いた生存企業数
const EXITED_STATUSES = new Set([
  'dead',
  'exited_ma',
  'exited_ipo',
  'exited_mega_ipo',
]);

function aliveCount(player: Player, startups: Startup[]): number {
  return player.portfolio.filter(inv => {
    const s = startups.find(st => st.id === inv.startupId);
    return s && !EXITED_STATUSES.has(s.status);
  }).length;
}

// 暫定DPI = (実現Exit回収 + 清算回収) / 投資済み総額
function calcDPI(player: Player): number {
  if (player.totalInvested === 0) return 0;
  return (player.realizedReturns + player.liquidationReturns) / player.totalInvested;
}

export function GameScreen() {
  const { state, dispatch } = useGame();
  const game = state.game;

  if (!game) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <p className="mb-4">ゲームデータがありません</p>
          <button
            onClick={() => dispatch({ type: 'NAVIGATE', screen: 'title' })}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
          >
            タイトルに戻る
          </button>
        </div>
      </div>
    );
  }

  const currentPlayer = game.players[game.currentPlayerIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* ヘッダー */}
      <header className="bg-slate-800/80 backdrop-blur border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-indigo-400 font-bold text-lg">
              Year {game.currentRound} / {game.settings.totalRounds}
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-300 text-sm">
              {PHASE_LABELS[game.currentPhase] ?? game.currentPhase}
            </span>
          </div>
          <div className="text-right">
            <span className="text-amber-400 font-semibold">
              {currentPlayer.fundName}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左カラム: イベント + サマリー */}
        <div className="lg:col-span-1 space-y-6">
          {/* 市場イベント */}
          <section className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
            <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">
              市場イベント
            </h3>
            {game.currentEvent ? (
              <div>
                <p className="text-white font-semibold mb-1">{game.currentEvent.title}</p>
                <p className="text-slate-400 text-sm">{game.currentEvent.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {game.currentEvent.effects.map((eff, i) => (
                    <span
                      key={i}
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        (eff.growthModifier ?? 0) > 0 || (eff.exitModifier ?? 0) > 0
                          ? 'bg-emerald-900/50 text-emerald-400'
                          : (eff.growthModifier ?? 0) < 0
                          ? 'bg-red-900/50 text-red-400'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {eff.target === 'all' ? '全セクター' : SECTOR_LABELS[eff.target]}
                      {eff.growthModifier !== 0 && (
                        <> 成長{eff.growthModifier > 0 ? `+${eff.growthModifier}` : eff.growthModifier}</>
                      )}
                      {eff.exitModifier != null && eff.exitModifier !== 0 && (
                        <> Exit{eff.exitModifier > 0 ? `+${eff.exitModifier}` : eff.exitModifier}</>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">イベントなし</p>
            )}
          </section>

          {/* ファンドサマリー */}
          <section className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
            <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">
              ファンドサマリー — {currentPlayer.fundName}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">残り投資可能資金</span>
                <span className="text-emerald-400 font-semibold">{formatCurrency(currentPlayer.remainingCapital)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">投資済み総額</span>
                <span className="text-white font-semibold">{formatCurrency(currentPlayer.totalInvested)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">投資先数</span>
                <span className="text-white font-semibold">
                  {currentPlayer.portfolio.length}社
                  （生存{aliveCount(currentPlayer, game.allStartups)} / 消滅{currentPlayer.portfolio.length - aliveCount(currentPlayer, game.allStartups)}）
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">暫定DPI</span>
                <span className={`font-bold ${calcDPI(currentPlayer) >= 1 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {calcDPI(currentPlayer).toFixed(2)}x
                </span>
              </div>
            </div>
          </section>

          {/* アクション残り（ディールフェーズ時のみ） */}
          {game.currentPhase === 'deal_individual' && (
            <section className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
              <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">
                残りアクション
              </h3>
              <div className="flex gap-2">
                {Array.from({ length: game.settings.actionsPerTurn }, (_, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      i < game.actionsRemaining
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-700 text-slate-500'
                    }`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* 中央＋右カラム: ポートフォリオ + 手札 */}
        <div className="lg:col-span-2 space-y-6">
          {/* ポートフォリオ */}
          <section className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
            <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">
              ポートフォリオ
            </h3>
            {currentPlayer.portfolio.length === 0 ? (
              <p className="text-slate-500 text-sm py-4 text-center">
                まだ投資先がありません。ディールフェーズで投資しましょう。
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 text-xs border-b border-slate-700">
                      <th className="text-left py-2 pr-4">企業名</th>
                      <th className="text-left py-2 pr-4">セクター</th>
                      <th className="text-left py-2 pr-4">ステージ</th>
                      <th className="text-left py-2 pr-4">ステータス</th>
                      <th className="text-right py-2 pr-4">持分</th>
                      <th className="text-right py-2">評価額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPlayer.portfolio.map(inv => {
                      const startup = game.allStartups.find(s => s.id === inv.startupId);
                      if (!startup) return null;
                      return (
                        <PortfolioRow key={inv.startupId} investment={inv} startup={startup} />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 手札（個別ディール）*/}
          {game.currentPhase === 'deal_individual' && currentPlayer.handDeals.length > 0 && (
            <section className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
              <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">
                手札（個別ディール）
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentPlayer.handDeals.map(deal => {
                  const startup = game.allStartups.find(s => s.id === deal.startupId);
                  if (!startup) return null;
                  return <DealCardView key={deal.startupId} startup={startup} />;
                })}
              </div>
            </section>
          )}

          {/* プレイヤー一覧（サマリーフェーズ時） */}
          {game.currentPhase === 'summary' && (
            <section className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
              <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">
                全ファンド状況
              </h3>
              <div className="space-y-3">
                {game.players.map((p, i) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      i === game.currentPlayerIndex
                        ? 'bg-indigo-900/30 border border-indigo-700'
                        : 'bg-slate-700/30'
                    }`}
                  >
                    <div>
                      <span className="text-white font-semibold">{p.fundName}</span>
                      <span className="text-slate-400 text-sm ml-3">
                        投資{p.portfolio.length}社
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`font-bold ${calcDPI(p) >= 1 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        DPI {calcDPI(p).toFixed(2)}x
                      </span>
                      <span className="text-slate-400 text-sm ml-3">
                        残{formatCurrency(p.remainingCapital)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// --- サブコンポーネント ---

function PortfolioRow({ investment, startup }: { investment: Investment; startup: Startup }) {
  const statusColor: Record<string, string> = {
    growing: 'text-emerald-400',
    stable: 'text-slate-300',
    struggling: 'text-amber-400',
    dead: 'text-red-400',
    exited_ma: 'text-blue-400',
    exited_ipo: 'text-purple-400',
    exited_mega_ipo: 'text-yellow-400',
  };

  const statusIcon: Record<string, string> = {
    growing: '↑',
    stable: '→',
    struggling: '↓',
    dead: '✕',
    exited_ma: '★',
    exited_ipo: '★★',
    exited_mega_ipo: '★★★',
  };

  return (
    <tr className="border-b border-slate-700/50 hover:bg-slate-700/20">
      <td className="py-2.5 pr-4 text-white font-medium">{startup.name}</td>
      <td className="py-2.5 pr-4 text-slate-300">{SECTOR_LABELS[startup.sector]}</td>
      <td className="py-2.5 pr-4 text-slate-300">{STAGE_LABELS[startup.currentStage]}</td>
      <td className={`py-2.5 pr-4 ${statusColor[startup.status] ?? 'text-slate-300'}`}>
        {statusIcon[startup.status] ?? ''} {STATUS_LABELS[startup.status]}
      </td>
      <td className="py-2.5 pr-4 text-right text-slate-300">{investment.ownershipPercent.toFixed(1)}%</td>
      <td className="py-2.5 text-right text-white">{formatCurrency(startup.currentValuation)}</td>
    </tr>
  );
}

function DealCardView({ startup }: { startup: Startup }) {
  const hintStars = (grade: 'A' | 'B' | 'C'): string => {
    switch (grade) {
      case 'A': return '★★★★☆';
      case 'B': return '★★★☆☆';
      case 'C': return '★★☆☆☆';
    }
  };

  return (
    <div className="bg-slate-700/60 rounded-xl p-4 border border-slate-600 hover:border-indigo-500/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="text-white font-bold">{startup.name}</h4>
          <span className="text-xs text-slate-400">
            {SECTOR_LABELS[startup.sector]} · {STAGE_LABELS[startup.currentStage]}
          </span>
        </div>
        <span className="text-indigo-400 font-bold text-sm">
          {formatCurrency(startup.currentValuation)}
        </span>
      </div>

      <div className="space-y-1 text-sm mb-4">
        <div className="flex justify-between text-slate-300">
          <span>チーム力</span>
          <span>{hintStars(startup.hints.teamQuality)} ({startup.hints.teamQuality})</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>市場規模</span>
          <span>{hintStars(startup.hints.marketSize)} ({startup.hints.marketSize})</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>プロダクト</span>
          <span>{hintStars(startup.hints.productReadiness)} ({startup.hints.productReadiness})</span>
        </div>
      </div>

      {/* Phase 2で投資ボタンを実装予定 */}
      <div className="flex gap-2">
        <button
          disabled
          className="flex-1 px-3 py-2 bg-indigo-600/50 text-indigo-300 text-sm rounded-lg cursor-not-allowed"
        >
          リード投資
        </button>
        <button
          disabled
          className="flex-1 px-3 py-2 bg-slate-600/50 text-slate-400 text-sm rounded-lg cursor-not-allowed"
        >
          フォロー投資
        </button>
        <button
          disabled
          className="px-3 py-2 bg-slate-600/50 text-slate-400 text-sm rounded-lg cursor-not-allowed"
        >
          パス
        </button>
      </div>
    </div>
  );
}
