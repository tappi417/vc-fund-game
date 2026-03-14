import { useGame } from '../context/GameContext';
import {
  formatCurrency,
  SECTOR_LABELS,
  STAGE_LABELS,
  STATUS_LABELS,
} from '../data/constants';
import type { Player, Startup, Investment } from '../types/game';
import { calcUnrealizedValue } from '../logic/gameEngine';

import { ManagementFeePhase } from './phases/ManagementFeePhase';
import { MarketEventPhase } from './phases/MarketEventPhase';
import { GrowthPhase } from './phases/GrowthPhase';
import { PlayerTransitionPhase } from './phases/PlayerTransitionPhase';
import { DealIndividualPhase } from './phases/DealIndividualPhase';
import { DealSharedPhase } from './phases/DealSharedPhase';
import { SummaryPhase } from './phases/SummaryPhase';

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

  // フェーズコンポーネントのルーティング
  const PhaseComponent = (() => {
    switch (game.currentPhase) {
      case 'management_fee':   return <ManagementFeePhase />;
      case 'market_event':     return <MarketEventPhase />;
      case 'growth':           return <GrowthPhase />;
      case 'player_transition':return <PlayerTransitionPhase />;
      case 'deal_individual':  return <DealIndividualPhase />;
      case 'deal_shared':      return <DealSharedPhase />;
      case 'summary':          return <SummaryPhase />;
      case 'final_settlement':
      case 'game_over':
        return (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <p className="text-white text-xl mb-4">ゲーム終了処理中...</p>
            </div>
          </div>
        );
      default:
        return (
          <div className="text-slate-400 text-center py-12">
            未実装フェーズ: {game.currentPhase}
          </div>
        );
    }
  })();

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
          <div className="flex items-center gap-4">
            <span className="text-amber-400 font-semibold text-sm">
              {currentPlayer.fundName}
            </span>
            <span className="text-emerald-400 text-sm font-semibold">
              {formatCurrency(currentPlayer.remainingCapital)}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左サイドバー: ファンドサマリー（player_transition以外で常時表示）*/}
        {game.currentPhase !== 'player_transition' && (
          <aside className="lg:col-span-1 space-y-4">
            {/* 市場イベント */}
            <section className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
              <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
                市場イベント
              </h3>
              {game.currentEvent ? (
                <div>
                  <p className="text-white font-semibold text-sm mb-1">{game.currentEvent.title}</p>
                  <p className="text-slate-400 text-xs">{game.currentEvent.description}</p>
                </div>
              ) : (
                <p className="text-slate-500 text-xs">イベントなし</p>
              )}
            </section>

            {/* ファンドサマリー */}
            <section className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
              <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">
                {currentPlayer.fundName}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">残り資金</span>
                  <span className="text-emerald-400 font-semibold">{formatCurrency(currentPlayer.remainingCapital)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">投資済み</span>
                  <span className="text-white">{formatCurrency(currentPlayer.totalInvested)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">未実現価値</span>
                  <span className="text-slate-300">{formatCurrency(calcUnrealizedValue(currentPlayer, game.allStartups))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">投資先</span>
                  <span className="text-white">
                    {currentPlayer.portfolio.length}社
                    <span className="text-slate-500 text-xs ml-1">
                      （生存{aliveCount(currentPlayer, game.allStartups)}）
                    </span>
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-700 pt-2 mt-2">
                  <span className="text-slate-400">暫定DPI</span>
                  <span className={`font-bold ${calcDPI(currentPlayer) >= 1 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {calcDPI(currentPlayer).toFixed(2)}x
                  </span>
                </div>
              </div>
            </section>

            {/* ポートフォリオ一覧（折りたたみ式） */}
            {currentPlayer.portfolio.length > 0 && (
              <section className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
                <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">
                  ポートフォリオ
                </h3>
                <div className="space-y-2">
                  {currentPlayer.portfolio.map(inv => {
                    const startup = game.allStartups.find(s => s.id === inv.startupId);
                    if (!startup) return null;
                    return (
                      <PortfolioMiniRow key={inv.startupId} investment={inv} startup={startup} />
                    );
                  })}
                </div>
              </section>
            )}
          </aside>
        )}

        {/* メインコンテンツ */}
        <main className={game.currentPhase !== 'player_transition' ? 'lg:col-span-3' : 'lg:col-span-4'}>
          {PhaseComponent}
        </main>
      </div>
    </div>
  );
}

// ── サブコンポーネント ──

function PortfolioMiniRow({ investment, startup }: { investment: Investment; startup: Startup }) {
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

  const isExited = EXITED_STATUSES.has(startup.status);
  // 取得価額 = 全ラウンドの投資額合計
  const costBasis = investment.rounds.reduce((s, r) => s + r.amount, 0);
  // 現在価額 = バリュエーション × 持分（Exit済みはexitValuationを使用）
  const currentValue = isExited
    ? (startup.exitValuation ?? startup.currentValuation) * (investment.ownershipPercent / 100)
    : startup.status === 'dead'
    ? 0
    : startup.currentValuation * (investment.ownershipPercent / 100);
  const multiple = costBasis > 0 ? currentValue / costBasis : 0;

  return (
    <div className="text-xs border-b border-slate-700/50 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-white font-medium truncate">{startup.name}</span>
        <span className={`${statusColor[startup.status] ?? 'text-slate-300'} shrink-0 ml-2`}>
          {statusIcon[startup.status] ?? ''} {STATUS_LABELS[startup.status]}
        </span>
      </div>
      <div className="flex justify-between text-slate-400">
        <span>{SECTOR_LABELS[startup.sector]} · {investment.ownershipPercent.toFixed(1)}%</span>
        <span className={multiple >= 1 ? 'text-emerald-400' : multiple > 0 ? 'text-amber-400' : 'text-red-400'}>
          {multiple.toFixed(1)}x
        </span>
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-slate-500">取得 {formatCurrency(costBasis)}</span>
        <span className={`font-medium ${
          currentValue > costBasis ? 'text-emerald-400' :
          currentValue < costBasis ? 'text-red-400' : 'text-slate-300'
        }`}>
          現在 {formatCurrency(currentValue)}
        </span>
      </div>
    </div>
  );
}
