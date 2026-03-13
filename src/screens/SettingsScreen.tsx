import { useState } from 'react';
import { useGame } from '../context/GameContext';
import type { GameSettings } from '../types/game';
import { DEFAULT_SETTINGS, formatCurrency, calcInvestableCapital } from '../data/constants';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;

export function SettingsScreen() {
  const { dispatch } = useGame();

  const [playerCount, setPlayerCount] = useState(3);
  const [playerNames, setPlayerNames] = useState<string[]>(
    Array.from({ length: MAX_PLAYERS }, (_, i) => `Fund ${String.fromCharCode(65 + i)}`)
  );
  const [settings, setSettings] = useState<GameSettings>({ ...DEFAULT_SETTINGS });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleNameChange = (index: number, name: string) => {
    const updated = [...playerNames];
    updated[index] = name;
    setPlayerNames(updated);
  };

  const handleStart = () => {
    const names = playerNames.slice(0, playerCount).map(n => n.trim() || `Fund ${playerNames.indexOf(n) + 1}`);
    dispatch({
      type: 'START_GAME',
      playerNames: names,
      settings: settings,
    });
  };

  const investable = calcInvestableCapital(settings);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-800/80 backdrop-blur rounded-2xl p-8 shadow-2xl">
        <h2 className="text-3xl font-bold text-white mb-8 text-center">ゲーム設定</h2>

        {/* プレイヤー人数 */}
        <div className="mb-8">
          <label className="block text-slate-300 text-sm font-medium mb-3">
            プレイヤー人数
          </label>
          <div className="flex gap-2">
            {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => i + MIN_PLAYERS).map(n => (
              <button
                key={n}
                onClick={() => setPlayerCount(n)}
                className={`w-12 h-12 rounded-lg font-bold text-lg transition-colors ${
                  playerCount === n
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* ファンド名入力 */}
        <div className="mb-8">
          <label className="block text-slate-300 text-sm font-medium mb-3">
            ファンド名
          </label>
          <div className="space-y-3">
            {Array.from({ length: playerCount }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-slate-400 text-sm w-8 shrink-0">P{i + 1}</span>
                <input
                  type="text"
                  value={playerNames[i]}
                  onChange={e => handleNameChange(i, e.target.value)}
                  placeholder={`ファンド名を入力`}
                  className="flex-1 px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  maxLength={20}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 詳細設定 */}
        <div className="mb-8">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-slate-400 text-sm hover:text-slate-300 transition-colors flex items-center gap-1"
          >
            <span className={`transform transition-transform ${showAdvanced ? 'rotate-90' : ''}`}>▶</span>
            詳細設定
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-4 bg-slate-700/50 rounded-xl p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-xs mb-1">運用年数（ラウンド）</label>
                  <select
                    value={settings.totalRounds}
                    onChange={e => setSettings(s => ({ ...s, totalRounds: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {[6, 8, 10, 12].map(n => (
                      <option key={n} value={n}>{n}年</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 text-xs mb-1">ファンドサイズ</label>
                  <select
                    value={settings.fundSize}
                    onChange={e => setSettings(s => ({ ...s, fundSize: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {[5_000_000_000, 10_000_000_000, 20_000_000_000].map(n => (
                      <option key={n} value={n}>{formatCurrency(n)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 text-xs mb-1">投資期間</label>
                  <select
                    value={settings.investmentPeriod}
                    onChange={e => setSettings(s => ({ ...s, investmentPeriod: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {[3, 4, 5, 6].map(n => (
                      <option key={n} value={n}>前半{n}ラウンド</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 text-xs mb-1">アクション上限/ターン</label>
                  <select
                    value={settings.actionsPerTurn}
                    onChange={e => setSettings(s => ({ ...s, actionsPerTurn: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {[2, 3, 4, 5].map(n => (
                      <option key={n} value={n}>{n}回</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* サマリー */}
        <div className="mb-8 bg-slate-700/50 rounded-xl p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-slate-400 text-xs">ファンドサイズ</div>
              <div className="text-white font-bold">{formatCurrency(settings.fundSize)}</div>
            </div>
            <div>
              <div className="text-slate-400 text-xs">管理報酬総額</div>
              <div className="text-amber-400 font-bold">
                {formatCurrency(settings.fundSize * settings.managementFeeRate * settings.totalRounds)}
              </div>
            </div>
            <div>
              <div className="text-slate-400 text-xs">投資可能資金</div>
              <div className="text-emerald-400 font-bold">{formatCurrency(investable)}</div>
            </div>
          </div>
        </div>

        {/* ボタン */}
        <div className="flex gap-4">
          <button
            onClick={() => dispatch({ type: 'NAVIGATE', screen: 'title' })}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl transition-colors"
          >
            戻る
          </button>
          <button
            onClick={handleStart}
            className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg rounded-xl transition-colors shadow-lg shadow-indigo-600/30"
          >
            ゲーム開始
          </button>
        </div>
      </div>
    </div>
  );
}
