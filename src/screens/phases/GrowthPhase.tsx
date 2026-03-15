import { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { formatCurrency, SECTOR_LABELS, STAGE_LABELS } from '../../data/constants';
import type { GrowthJudgmentResult } from '../../types/game';

const GROWTH_LABELS: Record<string, string> = {
  death: '清算',
  struggling: '苦戦',
  stable: '横ばい',
  growth: '成長',
  rapid_growth: '急成長',
  breakout: 'ブレイクアウト',
};

const GROWTH_COLORS: Record<string, string> = {
  death: 'text-red-400',
  struggling: 'text-amber-400',
  stable: 'text-slate-300',
  growth: 'text-emerald-400',
  rapid_growth: 'text-emerald-300',
  breakout: 'text-yellow-300',
};

const EXIT_LABELS: Record<string, string> = {
  fail: 'Exit失敗',
  ma: 'M&A Exit',
  ipo: 'IPO',
  mega_ipo: 'メガIPO',
};

const EXIT_COLORS: Record<string, string> = {
  fail: 'text-red-400',
  ma: 'text-blue-400',
  ipo: 'text-purple-400',
  mega_ipo: 'text-yellow-400',
};

function DiceIcon({ values }: { values: [number, number] }) {
  return (
    <span className="font-mono text-white bg-slate-700 px-2 py-0.5 rounded text-sm">
      [{values[0]}+{values[1]}={values[0] + values[1]}]
    </span>
  );
}

function GrowthRow({ result, index }: { result: GrowthJudgmentResult; index: number }) {
  const { state } = useGame();
  const startup = state.game!.allStartups.find(s => s.id === result.startupId);
  if (!startup) return null;

  const stageChanged = result.newStage !== result.previousStage;
  const valuationChanged = result.newValuation !== result.previousValuation;

  return (
    <div
      className={`rounded-xl p-4 border ${
        result.result === 'death'
          ? 'bg-red-900/20 border-red-700/60'
          : result.result === 'breakout'
          ? 'bg-yellow-900/20 border-yellow-600/60'
          : 'bg-slate-700/40 border-slate-600'
      }`}
      style={{ animation: `fadeInUp 0.35s ease-out ${index * 80}ms both` }}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="text-white font-bold">{startup.name}</span>
          <span className="text-slate-400 text-xs ml-2">
            {SECTOR_LABELS[startup.sector]} · {STAGE_LABELS[result.previousStage]}
          </span>
          {startup.investors.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {startup.investors.map(pid => {
                const player = state.game!.players.find(p => p.id === pid);
                if (!player) return null;
                const isLead = startup.leadInvestorId === pid;
                return (
                  <span
                    key={pid}
                    className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                      isLead
                        ? 'bg-indigo-900/60 text-indigo-300 border-indigo-600/60'
                        : 'bg-slate-700/60 text-slate-400 border-slate-600/60'
                    }`}
                  >
                    {player.fundName}{isLead ? ' ★' : ''}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <span className={`font-bold text-sm ${GROWTH_COLORS[result.result] ?? 'text-slate-300'}`}>
          {GROWTH_LABELS[result.result] ?? result.result}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs mb-2">
        <DiceIcon values={result.dice} />
        <span className="text-slate-400">
          ポテンシャル{result.potentialModifier >= 0 ? '+' : ''}{result.potentialModifier}
        </span>
        {result.leadModifier !== 0 && (
          <span className="text-indigo-400">リード+{result.leadModifier}</span>
        )}
        {result.eventModifier !== 0 && (
          <span className={result.eventModifier > 0 ? 'text-emerald-400' : 'text-red-400'}>
            イベント{result.eventModifier > 0 ? '+' : ''}{result.eventModifier}
          </span>
        )}
        <span className="text-white font-bold">= {result.modifiedTotal}</span>
      </div>

      {/* ステージ進行 */}
      {stageChanged && (
        <div className="text-xs text-emerald-400 mb-1">
          ステージ: {STAGE_LABELS[result.previousStage]} → {STAGE_LABELS[result.newStage]}
        </div>
      )}

      {/* バリュエーション変化 */}
      {valuationChanged && (
        <div className="text-xs text-slate-300">
          評価額: {formatCurrency(result.previousValuation)} → {formatCurrency(result.newValuation)}
        </div>
      )}

      {/* Exit判定結果 */}
      {result.isExitJudgment && result.exitResult && (
        <div className={`mt-2 p-2 rounded-lg bg-slate-800/60 text-xs ${EXIT_COLORS[result.exitResult.result]}`}>
          <span className="font-bold">
            Exit判定: {EXIT_LABELS[result.exitResult.result]}
          </span>
          {result.exitResult.result !== 'fail' && (
            <span className="text-slate-300 ml-2">
              → {formatCurrency(result.exitResult.exitValuation)}
            </span>
          )}
          {result.exitResult.returnsPerPlayer.map(ret => {
            const player = state.game!.players.find(p => p.id === ret.playerId);
            return player ? (
              <div key={ret.playerId} className="text-slate-300 mt-1">
                {player.fundName}: {formatCurrency(ret.amount)} ({ret.multiple.toFixed(1)}x)
              </div>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

export function GrowthPhase() {
  const { state, dispatchGame } = useGame();
  const game = state.game!;
  const results = game.currentGrowthResults;
  const [hasRolled, setHasRolled] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [rollingDice, setRollingDice] = useState<[number, number]>([1, 1]);

  function handleRoll() {
    setIsRolling(true);
    const iv = setInterval(() => {
      setRollingDice([
        Math.ceil(Math.random() * 6) as 1 | 2 | 3 | 4 | 5 | 6,
        Math.ceil(Math.random() * 6) as 1 | 2 | 3 | 4 | 5 | 6,
      ]);
    }, 80);
    setTimeout(() => {
      clearInterval(iv);
      setIsRolling(false);
      setHasRolled(true);
      dispatchGame({ type: 'RESOLVE_GROWTH' });
    }, 900);
  }

  // ダイスロール演出中
  if (isRolling) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="text-center">
          <div className="text-5xl mb-6">🎲</div>
          <div className="font-mono font-bold text-white bg-slate-700 px-8 py-5 rounded-2xl text-5xl tracking-widest">
            {rollingDice[0]} + {rollingDice[1]}
          </div>
          <p className="text-slate-400 mt-4 text-sm">判定中...</p>
        </div>
      </div>
    );
  }

  // 成長判定がまだ実行されていない
  if (!hasRolled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-slate-800/60 rounded-2xl p-8 border border-slate-700 w-full max-w-md text-center">
          <h2 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-4">
            成長判定フェーズ — Year {game.currentRound}
          </h2>
          <p className="text-slate-300 mb-8">
            全ポートフォリオ企業の成長判定を行います。
          </p>
          <button
            onClick={handleRoll}
            className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors"
          >
            🎲 判定実行
          </button>
        </div>
      </div>
    );
  }

  const nextPhaseLabel =
    game.currentRound <= game.settings.investmentPeriod ? 'ディールフェーズへ' : 'サマリーへ';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-lg">
          成長判定結果 — Year {game.currentRound}
        </h2>
        <button
          onClick={() => dispatchGame({ type: 'CONFIRM_GROWTH' })}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors text-sm"
        >
          {nextPhaseLabel} →
        </button>
      </div>

      {results.length === 0 ? (
        <p className="text-slate-500 text-sm py-8 text-center">
          投資先企業がありません。
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {results.map((r, i) => (
            <GrowthRow key={r.startupId} result={r} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
