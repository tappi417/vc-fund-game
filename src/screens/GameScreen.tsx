import { useState, useEffect } from 'react';
import { useGame, clearSaveData } from '../context/GameContext';
import {
  formatCurrency,
  SECTOR_LABELS,
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

// フェーズステッパー定義（表示用の6ステップ）
const PHASE_STEPS: { phase: string; label: string }[] = [
  { phase: 'management_fee', label: '管理報酬' },
  { phase: 'market_event',   label: 'イベント' },
  { phase: 'growth',         label: '成長判定' },
  { phase: 'deal_individual',label: '個別ディール' },
  { phase: 'deal_shared',    label: '共有ディール' },
  { phase: 'summary',        label: 'サマリー' },
];

// 実フェーズ → ステッパーインデックスのマッピング
const PHASE_TO_STEP: Record<string, number> = {
  management_fee: 0,
  market_event: 1,
  growth: 2,
  exit_judgment: 2,
  player_transition: 3,
  deal_individual: 3,
  deal_shared: 4,
  summary: 5,
  final_settlement: 5,
  game_over: 5,
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
  const [showExitModal, setShowExitModal] = useState(false);

  // セーブロード時に game_over フェーズだった場合は result 画面へ
  useEffect(() => {
    if (game?.currentPhase === 'game_over') {
      dispatch({ type: 'NAVIGATE', screen: 'result' });
    }
  }, [game?.currentPhase, dispatch]);

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
        <div className="max-w-7xl mx-auto px-4 py-2">
          {/* 上段: ラウンド情報 + プレイヤー情報 + 終了ボタン */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-indigo-400 font-bold text-base">
              Year {game.currentRound} / {game.settings.totalRounds}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-amber-400 font-semibold text-sm">
                {currentPlayer.fundName}
              </span>
              <span className="text-emerald-400 text-sm font-semibold">
                {formatCurrency(currentPlayer.remainingCapital)}
              </span>
              <button
                onClick={() => setShowExitModal(true)}
                className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded"
                title="ゲームメニュー"
              >
                ☰
              </button>
            </div>
          </div>
          {/* 下段: フェーズステッパー */}
          <PhaseStepIndicator currentPhase={game.currentPhase} />
        </div>
      </header>

      {/* ゲーム終了確認モーダル */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-600 rounded-2xl p-8 w-full max-w-sm mx-4 shadow-2xl">
            <h2 className="text-white font-bold text-lg mb-2">ゲームを終了しますか？</h2>
            <p className="text-slate-400 text-sm mb-6">
              セーブデータが削除され、タイトル画面に戻ります。この操作は取り消せません。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitModal(false)}
                className="flex-1 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  clearSaveData();
                  dispatch({ type: 'NAVIGATE', screen: 'title' });
                }}
                className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors"
              >
                終了する
              </button>
            </div>
          </div>
        </div>
      )}

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

// ── フェーズステッパー ──

function PhaseStepIndicator({ currentPhase }: { currentPhase: string }) {
  const activeIdx = PHASE_TO_STEP[currentPhase] ?? -1;

  return (
    <div className="flex items-center gap-0">
      {PHASE_STEPS.map((step, i) => {
        const isDone    = i < activeIdx;
        const isActive  = i === activeIdx;
        const isFuture  = i > activeIdx;
        return (
          <div key={step.phase} className="flex items-center">
            {/* ステップノード */}
            <div className="flex flex-col items-center">
              <div className={`w-2 h-2 rounded-full transition-colors ${
                isDone   ? 'bg-indigo-500' :
                isActive ? 'bg-indigo-400 ring-2 ring-indigo-400/40' :
                           'bg-slate-600'
              }`} />
              <span className={`text-[10px] mt-0.5 whitespace-nowrap transition-colors ${
                isDone   ? 'text-indigo-500' :
                isActive ? 'text-indigo-300 font-semibold' :
                isFuture ? 'text-slate-600' :
                           'text-slate-500'
              }`}>
                {step.label}
              </span>
            </div>
            {/* コネクター（最後以外） */}
            {i < PHASE_STEPS.length - 1 && (
              <div className={`h-px w-6 sm:w-10 mx-1 mb-3 transition-colors ${
                i < activeIdx ? 'bg-indigo-500' : 'bg-slate-700'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
