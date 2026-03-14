import { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { formatCurrency, SECTOR_LABELS, STAGE_LABELS, LEAD_INVESTMENT_RATE, FOLLOW_INVESTMENT_RATE } from '../../data/constants';
import type { DealCard as DealCardType, Startup } from '../../types/game';

const HINT_STARS: Record<string, string> = {
  A: '★★★',
  B: '★★☆',
  C: '★☆☆',
};
const HINT_COLORS: Record<string, string> = {
  A: 'text-emerald-400',
  B: 'text-amber-400',
  C: 'text-red-400',
};

// スタートアップ情報カード（共通）
function StartupInfoCard({ startup }: { startup: Startup }) {
  return (
    <div className="bg-slate-700/60 rounded-xl p-5 border border-slate-600 mb-6">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-white text-xl font-bold">{startup.name}</h3>
          <span className="text-xs text-slate-400">
            {SECTOR_LABELS[startup.sector]} · {STAGE_LABELS[startup.currentStage]}
          </span>
        </div>
        <span className="text-indigo-400 font-bold">{formatCurrency(startup.currentValuation)}</span>
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">チーム力</span>
          <span className={HINT_COLORS[startup.hints.teamQuality]}>
            {HINT_STARS[startup.hints.teamQuality]} ({startup.hints.teamQuality})
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">市場規模</span>
          <span className={HINT_COLORS[startup.hints.marketSize]}>
            {HINT_STARS[startup.hints.marketSize]} ({startup.hints.marketSize})
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">プロダクト</span>
          <span className={HINT_COLORS[startup.hints.productReadiness]}>
            {HINT_STARS[startup.hints.productReadiness]} ({startup.hints.productReadiness})
          </span>
        </div>
      </div>
    </div>
  );
}

// ── 競りステップ型 ───────────────────────────────────────────────
type AuctionStep = 'interest' | 'bidding' | 'lead_decision' | 'follow_round';

/** Phase 3: 共有ディール — 4段階オークションフロー
 *
 * Step 1 (interest):      全プレイヤーが参加/パスを順番に宣言
 *   - 0名 → スキップ
 *   - 1名 → 競りなし、標準レート(15%)で即 INVEST_LEAD
 *   - 2名以上 → Step 2 へ
 * Step 2 (bidding):       参加者が順番に入札額を提示
 *   - START_AUCTION → SUBMIT_BID × n → RESOLVE_AUCTION
 *   - 最高額落札者 → Step 3 へ
 * Step 3 (lead_decision): 落札者がフォロー投資を許可するか決定
 *   - 許可なし → 次のディールへ
 *   - 許可あり → Step 4 へ
 * Step 4 (follow_round):  落札者以外の参加者が順番にフォロー投資を判断
 *   - INVEST_FOLLOW × m → 次のディールへ
 *
 * 設計ポイント:
 *   pendingDeals はコンポーネントマウント時に game.sharedDeals のコピーとして初期化し、
 *   ローカルで管理する。RESOLVE_AUCTION は game.sharedDeals を変更するが、
 *   pendingDeals は独立して管理されるため、ディールのスキップが起きない。
 */
export function DealSharedPhase() {
  const { state, dispatchGame } = useGame();
  const game = state.game!;

  // ── ローカルstate ────────────────────────────────────────────
  // pendingDeals: マウント時に初期化し、以降はローカルで管理（game.sharedDealsに依存しない）
  const [pendingDeals, setPendingDeals] = useState<DealCardType[]>(() => [...game.sharedDeals]);
  const [totalDeals] = useState(() => game.sharedDeals.length);
  const [processedCount, setProcessedCount] = useState(0);

  const [step, setStep] = useState<AuctionStep>('interest');

  // Step 1: インタレスト宣言
  const [interestDecisionIdx, setInterestDecisionIdx] = useState(0);
  const [interestedPlayerIds, setInterestedPlayerIds] = useState<string[]>([]);

  // Step 2: 入札
  const [bidderIdx, setBidderIdx] = useState(0);
  const [bids, setBids] = useState<Record<string, number>>({});
  const [currentBidInput, setCurrentBidInput] = useState('');

  // Step 3 & 4: リード決定・フォロー
  // auctionStartupId: RESOLVE_AUCTION後もカード表示を維持するため保存
  const [auctionStartupId, setAuctionStartupId] = useState<string | null>(null);
  const [leadWinnerId, setLeadWinnerId] = useState<string | null>(null);
  const [followEligibleIds, setFollowEligibleIds] = useState<string[]>([]);
  const [followDecisionIdx, setFollowDecisionIdx] = useState(0);

  // ── 共有ディールがない場合 ────────────────────────────────────
  if (pendingDeals.length === 0 && step === 'interest') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh]">
        <div className="bg-slate-800/60 rounded-2xl p-8 border border-slate-700 w-full max-w-md text-center">
          <h2 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-4">
            共有ディールフェーズ
          </h2>
          <p className="text-slate-300 mb-6">共有ディールはありません。</p>
          <button
            onClick={() => dispatchGame({ type: 'ADVANCE_PHASE' })}
            className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors"
          >
            サマリーへ →
          </button>
        </div>
      </div>
    );
  }

  // 現在処理中のディール
  const currentDeal = pendingDeals[0];

  // lead_decision/follow_round では auctionStartupId から、それ以外は currentDeal から参照
  const displayStartupId =
    (step === 'lead_decision' || step === 'follow_round') && auctionStartupId
      ? auctionStartupId
      : currentDeal?.startupId;
  const startup = game.allStartups.find(s => s.id === displayStartupId);

  if (!startup) return null;

  // フォロー投資時の startupId (auctionStartupId が設定されていればそちらを使用)
  const activeDealStartupId = auctionStartupId ?? currentDeal.startupId;
  const minBidAmount = Math.round(startup.currentValuation * LEAD_INVESTMENT_RATE);
  const followAmount = Math.round(startup.currentValuation * FOLLOW_INVESTMENT_RATE);

  // ── 次のディールへ進む共通処理 ────────────────────────────────
  // pendingDeals のキューから先頭を取り除き、次のディールを処理する。
  // game.sharedDeals には依存しないためスキップ問題が起きない。
  function advanceToNextDeal() {
    const remaining = pendingDeals.slice(1);
    const newProcessed = processedCount + 1;

    if (remaining.length === 0) {
      dispatchGame({ type: 'ADVANCE_PHASE' });
    } else {
      setPendingDeals(remaining);
      setProcessedCount(newProcessed);
      setStep('interest');
      setInterestDecisionIdx(0);
      setInterestedPlayerIds([]);
      setBidderIdx(0);
      setBids({});
      setCurrentBidInput('');
      setLeadWinnerId(null);
      setAuctionStartupId(null);
      setFollowEligibleIds([]);
      setFollowDecisionIdx(0);
    }
  }

  // ── Step 1: インタレスト宣言ハンドラー ─────────────────────────
  function handleInterest(join: boolean) {
    const currentPlayer = game.players[interestDecisionIdx];
    const newInterested = join ? [...interestedPlayerIds, currentPlayer.id] : interestedPlayerIds;

    const nextIdx = interestDecisionIdx + 1;

    if (nextIdx >= game.players.length) {
      // 全員の意思決定完了
      if (newInterested.length === 0) {
        // 0名 → スキップ
        advanceToNextDeal();
      } else if (newInterested.length === 1) {
        // 1名 → 競りなし、標準レートで即リード投資
        dispatchGame({
          type: 'INVEST_LEAD',
          playerId: newInterested[0],
          startupId: currentDeal.startupId,
          amount: 0,
        });
        advanceToNextDeal();
      } else {
        // 2名以上 → 競り開始
        setInterestedPlayerIds(newInterested);
        setBidderIdx(0);
        setCurrentBidInput(String(Math.round(minBidAmount / 100_000_000 * 10) / 10));
        setStep('bidding');
      }
    } else {
      setInterestedPlayerIds(newInterested);
      setInterestDecisionIdx(nextIdx);
    }
  }

  // ── Step 2: 入札ハンドラー ────────────────────────────────────
  function handleBid(decline: boolean) {
    const currentBidderId = interestedPlayerIds[bidderIdx];
    const bidAmount = decline ? 0 : Math.round(parseFloat(currentBidInput) * 100_000_000);

    const newBids = decline
      ? bids
      : { ...bids, [currentBidderId]: bidAmount };

    const nextBidderIdx = bidderIdx + 1;

    if (nextBidderIdx >= interestedPlayerIds.length) {
      // 全員入札完了 → 落札者決定
      const validBids = Object.entries(newBids).filter(([, v]) => v > 0);

      if (validBids.length === 0) {
        // 全員辞退 → スキップ
        advanceToNextDeal();
        return;
      }

      // 最高額落札者を決定
      const winner = validBids.reduce((best, [pid, amt]) =>
        amt > (newBids[best[0]] ?? 0) ? [pid, amt] : best
      );
      const winnerId = winner[0];

      // オークション実行
      // RESOLVE_AUCTION は game.sharedDeals からこのディールを削除するが、
      // pendingDeals は独立管理しているため問題なし。
      // ただしカード表示維持のため auctionStartupId を保存する。
      const savedStartupId = currentDeal.startupId;
      dispatchGame({ type: 'START_AUCTION', dealCard: currentDeal });
      validBids.forEach(([pid, amt]) => {
        dispatchGame({ type: 'SUBMIT_BID', playerId: pid, amount: amt });
      });
      dispatchGame({ type: 'RESOLVE_AUCTION' });

      // フォロー対象 = 入札したが落札できなかったプレイヤー
      const followEligible = validBids
        .filter(([pid]) => pid !== winnerId)
        .map(([pid]) => pid);

      setBids(newBids);
      setLeadWinnerId(winnerId);
      setAuctionStartupId(savedStartupId);
      setFollowEligibleIds(followEligible);

      if (followEligible.length > 0) {
        setStep('lead_decision');
      } else {
        advanceToNextDeal();
      }
    } else {
      setBids(newBids);
      setBidderIdx(nextBidderIdx);
      setCurrentBidInput(String(Math.round(minBidAmount / 100_000_000 * 10) / 10));
    }
  }

  // ── Step 3: リード投資家のフォロー許可ハンドラー ──────────────
  function handleLeadDecision(allowFollow: boolean) {
    if (!allowFollow) {
      advanceToNextDeal();
    } else {
      setFollowDecisionIdx(0);
      setStep('follow_round');
    }
  }

  // ── Step 4: フォロー投資ハンドラー ───────────────────────────
  function handleFollowDecision(follow: boolean) {
    const currentFollowerId = followEligibleIds[followDecisionIdx];

    if (follow) {
      dispatchGame({
        type: 'INVEST_FOLLOW',
        playerId: currentFollowerId,
        startupId: activeDealStartupId,
        amount: 0,
      });
    }

    const nextFollowIdx = followDecisionIdx + 1;
    if (nextFollowIdx >= followEligibleIds.length) {
      advanceToNextDeal();
    } else {
      setFollowDecisionIdx(nextFollowIdx);
    }
  }

  // ── 現在のアクティブプレイヤー取得 ───────────────────────────
  const interestPlayer = game.players[interestDecisionIdx];
  const currentBidderId = interestedPlayerIds[bidderIdx];
  const currentBidder = game.players.find(p => p.id === currentBidderId);
  const leadWinner = game.players.find(p => p.id === leadWinnerId);
  const currentFollowerId = followEligibleIds[followDecisionIdx];
  const currentFollower = game.players.find(p => p.id === currentFollowerId);

  const dealNumber = processedCount + 1;

  // ── レンダリング ─────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="bg-slate-800/60 rounded-2xl p-8 border border-slate-700 w-full max-w-lg">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-slate-400 text-xs font-medium uppercase tracking-wider">
            共有ディール {dealNumber} / {totalDeals}
          </h2>
          <div className="flex gap-1">
            {(['interest', 'bidding', 'lead_decision', 'follow_round'] as AuctionStep[]).map((s, i) => (
              <div
                key={s}
                className={`w-2 h-2 rounded-full ${
                  step === s ? 'bg-indigo-400' :
                  (['interest', 'bidding', 'lead_decision', 'follow_round'] as AuctionStep[]).indexOf(step) > i
                    ? 'bg-slate-500' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* スタートアップ情報 */}
        <StartupInfoCard startup={startup} />

        {/* ── Step 1: インタレスト宣言 ── */}
        {step === 'interest' && (
          <div>
            {interestDecisionIdx > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {game.players.slice(0, interestDecisionIdx).map(p => (
                  <span
                    key={p.id}
                    className={`text-xs px-2 py-1 rounded-full ${
                      interestedPlayerIds.includes(p.id)
                        ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-700'
                        : 'bg-slate-700/50 text-slate-400 border border-slate-600'
                    }`}
                  >
                    {p.fundName}: {interestedPlayerIds.includes(p.id) ? '✓ 参加' : '— パス'}
                  </span>
                ))}
              </div>
            )}

            <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-800">
              <p className="text-slate-300 text-sm mb-1">
                <span className="text-indigo-400 font-bold">{interestPlayer.fundName}</span> の番
              </p>
              <p className="text-slate-400 text-xs mb-4">
                リード投資の場合: {formatCurrency(minBidAmount)}〜
                （残り資金: {formatCurrency(interestPlayer.remainingCapital)}）
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleInterest(true)}
                  disabled={interestPlayer.remainingCapital < minBidAmount}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                  参加する
                </button>
                <button
                  onClick={() => handleInterest(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-lg transition-colors"
                >
                  パス
                </button>
              </div>
            </div>

            <p className="text-slate-500 text-xs mt-3 text-center">
              {interestDecisionIdx + 1} / {game.players.length} プレイヤー
            </p>
          </div>
        )}

        {/* ── Step 2: 入札 ── */}
        {step === 'bidding' && currentBidder && (
          <div>
            <div className="mb-4 p-3 bg-slate-700/40 rounded-lg">
              <p className="text-slate-400 text-xs mb-2">参加者: {interestedPlayerIds.length}名</p>
              <div className="flex flex-wrap gap-2">
                {interestedPlayerIds.map((pid, idx) => {
                  const p = game.players.find(pl => pl.id === pid);
                  if (!p) return null;
                  return (
                    <span
                      key={pid}
                      className={`text-xs px-2 py-1 rounded-full ${
                        bids[pid] !== undefined
                          ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-700'
                          : idx === bidderIdx
                          ? 'bg-amber-900/50 text-amber-300 border border-amber-700'
                          : 'bg-slate-700/50 text-slate-400 border border-slate-600'
                      }`}
                    >
                      {p.fundName}
                      {bids[pid] !== undefined ? `: ${formatCurrency(bids[pid])}` : idx === bidderIdx ? ': 入札中...' : ''}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="bg-amber-900/20 rounded-xl p-4 border border-amber-800">
              <p className="text-slate-300 text-sm mb-1">
                <span className="text-amber-400 font-bold">{currentBidder.fundName}</span> の入札
              </p>
              <p className="text-slate-400 text-xs mb-4">
                最低入札額: {formatCurrency(minBidAmount)}
                （残り資金: {formatCurrency(currentBidder.remainingCapital)}）
              </p>

              <div className="flex items-center gap-2 mb-4">
                <input
                  type="number"
                  value={currentBidInput}
                  onChange={e => setCurrentBidInput(e.target.value)}
                  min={Math.round(minBidAmount / 100_000_000 * 10) / 10}
                  max={Math.round(currentBidder.remainingCapital / 100_000_000 * 10) / 10}
                  step="0.1"
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-500 text-white rounded-lg text-sm focus:outline-none focus:border-amber-500"
                />
                <span className="text-slate-400 text-sm whitespace-nowrap">億円</span>
              </div>

              {(() => {
                const bidAmt = parseFloat(currentBidInput) * 100_000_000;
                const isValid = !isNaN(bidAmt) && bidAmt >= minBidAmount && bidAmt <= currentBidder.remainingCapital;
                return (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleBid(false)}
                      disabled={!isValid}
                      className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                    >
                      入札する
                    </button>
                    <button
                      onClick={() => handleBid(true)}
                      className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-lg transition-colors"
                    >
                      辞退する
                    </button>
                  </div>
                );
              })()}
            </div>

            <p className="text-slate-500 text-xs mt-3 text-center">
              {bidderIdx + 1} / {interestedPlayerIds.length} 入札者
            </p>
          </div>
        )}

        {/* ── Step 3: リードのフォロー許可 ── */}
        {step === 'lead_decision' && leadWinner && (
          <div>
            <div className="mb-5 p-4 bg-indigo-900/20 rounded-xl border border-indigo-700">
              <p className="text-indigo-300 font-bold text-sm mb-2">
                🏆 落札: {leadWinner.fundName}
              </p>
              <div className="space-y-1">
                {interestedPlayerIds
                  .filter(pid => bids[pid] !== undefined && bids[pid] > 0)
                  .sort((a, b) => (bids[b] ?? 0) - (bids[a] ?? 0))
                  .map(pid => {
                    const p = game.players.find(pl => pl.id === pid);
                    if (!p) return null;
                    return (
                      <div key={pid} className="flex justify-between text-xs">
                        <span className={pid === leadWinnerId ? 'text-indigo-300 font-bold' : 'text-slate-400'}>
                          {p.fundName}{pid === leadWinnerId ? ' 👑' : ''}
                        </span>
                        <span className={pid === leadWinnerId ? 'text-indigo-300 font-bold' : 'text-slate-500'}>
                          {formatCurrency(bids[pid] ?? 0)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-800">
              <p className="text-slate-300 text-sm mb-1">
                <span className="text-indigo-400 font-bold">{leadWinner.fundName}</span> さん
              </p>
              <p className="text-slate-400 text-xs mb-1">
                他の参加者のフォロー投資を許可しますか？
              </p>
              <p className="text-slate-500 text-xs mb-4">
                許可する場合、{followEligibleIds.map(id => game.players.find(p => p.id === id)?.fundName).join('・')} が
                {formatCurrency(followAmount)}（5%）でフォロー参加できます。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleLeadDecision(true)}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors"
                >
                  許可する
                </button>
                <button
                  onClick={() => handleLeadDecision(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-lg transition-colors"
                >
                  許可しない
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 4: フォロー投資ラウンド ── */}
        {step === 'follow_round' && currentFollower && (
          <div>
            <div className="mb-4 p-3 bg-slate-700/40 rounded-lg">
              <p className="text-slate-400 text-xs">
                フォロー投資ラウンド（{followDecisionIdx + 1} / {followEligibleIds.length}）
              </p>
            </div>

            <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600">
              <p className="text-slate-300 text-sm mb-1">
                <span className="text-slate-200 font-bold">{currentFollower.fundName}</span> さん
              </p>
              <p className="text-slate-400 text-xs mb-1">
                フォロー投資: <span className="text-slate-200 font-bold">{formatCurrency(followAmount)}</span>（評価額の5%）
              </p>
              <p className="text-slate-500 text-xs mb-4">
                残り資金: {formatCurrency(currentFollower.remainingCapital)}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleFollowDecision(true)}
                  disabled={currentFollower.remainingCapital < followAmount}
                  className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                  フォロー投資する
                </button>
                <button
                  onClick={() => handleFollowDecision(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-lg transition-colors"
                >
                  パス
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
