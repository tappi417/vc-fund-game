import { useGame } from '../../context/GameContext';

export function PlayerTransitionPhase() {
  const { state, dispatchGame } = useGame();
  const game = state.game!;
  const nextPlayer = game.players[game.currentPlayerIndex];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="bg-slate-800/60 rounded-2xl p-10 border border-indigo-700 w-full max-w-md text-center shadow-2xl">
        <div className="text-6xl mb-6">🎮</div>
        <h2 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">
          端末を渡してください
        </h2>
        <h3 className="text-white text-2xl font-bold mb-2">{nextPlayer.fundName}</h3>
        <p className="text-slate-300 text-sm mb-8">
          Year {game.currentRound} · ディールフェーズ
        </p>

        <div className="bg-slate-700/40 rounded-xl p-4 mb-8 text-left space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">残り投資可能資金</span>
            <span className="text-emerald-400 font-semibold">
              {new Intl.NumberFormat('ja-JP').format(Math.round(nextPlayer.remainingCapital / 100_000_000))}億円
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
          className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg rounded-xl transition-colors"
        >
          ゲームを続ける
        </button>
      </div>
    </div>
  );
}
