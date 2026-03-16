import { useGame } from '../../context/GameContext';
import { formatCurrency } from '../../data/constants';

const PLAYER_COLORS_HEX = ['#6366f1', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6', '#06b6d4'];

export function PlayerTransitionPhase() {
  const { state, dispatchGame } = useGame();
  const game = state.game!;
  const nextPlayer = game.players[game.currentPlayerIndex];
  const playerIdx = game.currentPlayerIndex % PLAYER_COLORS_HEX.length;
  const playerColor = PLAYER_COLORS_HEX[playerIdx];

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh]">
      <div
        className="bg-slate-800/80 rounded-2xl border border-slate-700 w-full max-w-xl text-center shadow-2xl overflow-hidden"
        style={{ borderTopColor: playerColor, borderTopWidth: '4px' }}
      >
        <div className="p-10">
          <div className="text-5xl mb-5">🎮</div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mb-3">
            端末を渡してください
          </p>
          <h3
            className="text-3xl font-bold mb-1"
            style={{ color: playerColor }}
          >
            {nextPlayer.fundName}
          </h3>
          <p className="text-slate-400 text-sm mb-8">
            Year {game.currentRound} · ディールフェーズ
          </p>

          <div className="bg-slate-700/40 rounded-xl p-4 mb-8 text-left space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">残り投資可能資金</span>
              <span className="font-semibold" style={{ color: playerColor }}>
                {formatCurrency(nextPlayer.remainingCapital)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">ポートフォリオ</span>
              <span className="text-white font-semibold">{nextPlayer.portfolio.length}社</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">手札</span>
              <span className="text-white font-semibold">{nextPlayer.handDeals.length}枚</span>
            </div>
          </div>

          <p className="text-slate-500 text-xs mb-6">
            他のプレイヤーは画面を見ないでください
          </p>

          <button
            onClick={() => dispatchGame({ type: 'CONFIRM_PLAYER_READY' })}
            className="w-full px-6 py-3 text-white font-bold text-lg rounded-xl transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: playerColor }}
          >
            ゲームを続ける
          </button>
        </div>
      </div>
    </div>
  );
}
