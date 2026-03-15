import { useGame, hasSaveData, getSaveTimestamp } from '../context/GameContext';

export function TitleScreen() {
  const { dispatch } = useGame();
  const canContinue = hasSaveData();
  const saveTimestamp = getSaveTimestamp();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="text-center max-w-lg">
        {/* タイトル */}
        <div className="mb-2 text-6xl">🏦</div>
        <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">
          VC Fund Game
        </h1>
        <p className="text-indigo-300 text-lg mb-12 leading-relaxed">
          VCファンドのパートナーとなり、10年ファンドを運用せよ。
          <br />
          パワーロウの世界で、ユニコーンを見つけ出せ。
        </p>

        {/* ボタン */}
        <div className="space-y-4">
          <button
            onClick={() => dispatch({ type: 'NAVIGATE', screen: 'settings' })}
            className="w-full max-w-xs mx-auto block px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white text-lg font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-600/30"
          >
            新規ゲーム
          </button>

          {canContinue && (
            <div>
              <button
                onClick={() => dispatch({ type: 'NAVIGATE', screen: 'game' })}
                className="w-full max-w-xs mx-auto block px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white text-lg font-semibold rounded-xl transition-colors"
              >
                続きから
              </button>
              {saveTimestamp && (
                <p className="text-slate-500 text-xs text-center mt-1.5">
                  {saveTimestamp}
                </p>
              )}
            </div>
          )}

          <button
            onClick={() => dispatch({ type: 'NAVIGATE', screen: 'help' })}
            className="w-full max-w-xs mx-auto block px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm font-semibold rounded-xl transition-colors border border-slate-700"
          >
            📖 ルールを確認
          </button>
        </div>

        {/* フッター */}
        <div className="mt-16 text-slate-500 text-sm">
          <p>2〜6人 ・ 20〜30分 ・ 1台の端末でプレイ</p>
        </div>
      </div>
    </div>
  );
}
