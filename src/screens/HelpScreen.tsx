import { useState } from 'react';
import { useGame } from '../context/GameContext';

type Tab = 'overview' | 'phases' | 'investment' | 'tables';

const TAB_LABELS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'ゲームの目的' },
  { key: 'phases', label: 'フェーズの流れ' },
  { key: 'investment', label: '投資のしかた' },
  { key: 'tables', label: '判定テーブル' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
      <h3 className="text-white font-bold text-base mb-3">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3 py-1 border-b border-slate-700/50 last:border-0">
      <span className="text-slate-400 text-sm shrink-0 w-28">{label}</span>
      <span className="text-slate-200 text-sm">{value}</span>
    </div>
  );
}

function TableRow({ range, result, color }: { range: string; result: string; color: string }) {
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-slate-700/40 last:border-0">
      <span className="font-mono text-white text-sm w-16 shrink-0 text-center bg-slate-700/60 rounded px-2 py-0.5">
        {range}
      </span>
      <span className={`text-sm font-semibold ${color}`}>{result}</span>
    </div>
  );
}

function OverviewTab() {
  return (
    <div className="space-y-4">
      <Section title="ゲームの目的">
        <p className="text-slate-300 text-sm leading-relaxed mb-3">
          あなたはVCファンドのマネージャーです。スタートアップに投資し、
          10年間（10ラウンド）の運用期間終了時に最も高い <span className="text-emerald-400 font-semibold">DPI</span> を達成したプレイヤーが勝利します。
        </p>
        <p className="text-slate-300 text-sm leading-relaxed">
          VC投資の核心である「<span className="text-amber-400 font-semibold">パワーロウ則</span>」—
          上位少数の大当たりがファンド全体のリターンを左右する—を体験的に学びます。
        </p>
      </Section>

      <Section title="用語集">
        <div className="space-y-0">
          <Row label="DPI" value="配分倍率（Distribution to Paid-In）。回収総額 ÷ 投資総額。1x = 元本回収、2x以上が優秀。" />
          <Row label="LP" value="ファンドに出資するリミテッド・パートナー（機関投資家・年金等）。" />
          <Row label="管理報酬" value="毎年ファンド残高の2%をLPに支払う報酬。投資可能資金が減る。" />
          <Row label="Seed" value="創業初期の最初の外部資金調達ステージ（バリュエーション3〜8億円）。" />
          <Row label="Series A/B" value="事業実証後の成長資金調達ステージ（A: 10〜30億、B: 30〜100億円）。" />
          <Row label="リード投資" value="ラウンドを主導する投資家。持分15%。成長判定にダイス+1ボーナス。" />
          <Row label="フォロー投資" value="リード投資家に追随する投資家。持分5%。ボーナスなし。" />
          <Row label="Exit" value="M&A・IPO等により投資回収すること。Series Cで判定機会が発生。" />
        </div>
      </Section>

      <Section title="勝利条件の目安">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { range: '3x以上', label: 'トップVC', color: 'text-yellow-400 border-yellow-700/50 bg-yellow-900/20' },
            { range: '2x以上', label: '優秀', color: 'text-emerald-400 border-emerald-700/50 bg-emerald-900/20' },
            { range: '1x以上', label: '及第点', color: 'text-blue-400 border-blue-700/50 bg-blue-900/20' },
            { range: '1x未満', label: '元本割れ', color: 'text-red-400 border-red-700/50 bg-red-900/20' },
          ].map(item => (
            <div key={item.range} className={`rounded-lg p-3 border text-center ${item.color}`}>
              <div className="font-bold text-lg">{item.range}</div>
              <div className="text-xs mt-0.5 opacity-80">{item.label}</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function PhasesTab() {
  const phases = [
    { icon: '💰', name: '管理報酬', desc: 'ファンド残高の2%が自動控除されます。投資可能資金が減ります。', color: 'text-amber-400' },
    { icon: '🌍', name: '市場イベント', desc: 'イベントカードを引きます。セクターや全体の成長判定ダイスに補正が入ります。', color: 'text-blue-400' },
    { icon: '🎲', name: '成長判定', desc: '全投資先の成長を2d6で判定します。ポテンシャル・リード・イベントで修正されます。Series Cの企業はExit判定も行います。', color: 'text-purple-400' },
    { icon: '🤝', name: 'ディールフェーズ', desc: '各プレイヤーが手札カードで個別投資を行い、共有ディールは競りで争奪します。前半5ラウンドのみ新規投資可能。', color: 'text-indigo-400' },
    { icon: '📊', name: 'サマリー', desc: 'ラウンドのDPIランキングと成長ハイライトを確認します。', color: 'text-slate-300' },
  ];

  return (
    <div className="space-y-4">
      <Section title="1ラウンドの流れ（繰り返し×10年）">
        <div className="space-y-3">
          {phases.map((p, i) => (
            <div key={p.name} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
                  {i + 1}
                </div>
                {i < phases.length - 1 && (
                  <div className="w-0.5 flex-1 bg-slate-700 mt-1" />
                )}
              </div>
              <div className="pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span>{p.icon}</span>
                  <span className={`font-semibold text-sm ${p.color}`}>{p.name}</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="投資期間について">
        <p className="text-slate-300 text-sm leading-relaxed">
          前半（Year 1〜5）が<span className="text-indigo-400 font-semibold">投資期間</span>。
          新規ディールカードが配られ、積極的に投資できます。<br />
          後半（Year 6〜10）は<span className="text-amber-400 font-semibold">回収期間</span>。
          新規投資なし。既存ポートフォリオのフォローオンとExitが中心となります。
        </p>
      </Section>
    </div>
  );
}

function InvestmentTab() {
  return (
    <div className="space-y-4">
      <Section title="投資の種類">
        <div className="space-y-3">
          <div className="bg-indigo-900/20 rounded-lg p-3 border border-indigo-700/40">
            <div className="text-indigo-400 font-semibold text-sm mb-1">リード投資（15%持分）</div>
            <p className="text-slate-300 text-xs leading-relaxed">
              ラウンドを主導する投資家として参加。成長判定ダイスに<span className="text-indigo-300 font-bold">+1</span>のボーナス。
              共有ディールでは競りで最高額入札者がリード権を獲得します。
            </p>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/40">
            <div className="text-slate-300 font-semibold text-sm mb-1">フォロー投資（5%持分）</div>
            <p className="text-slate-300 text-xs leading-relaxed">
              既存のリード投資家に追随して参加。ダイスボーナスなし。
              共有ディールではリード落札者が許可した場合のみ参加可能。
            </p>
          </div>
        </div>
      </Section>

      <Section title="共有ディールの競りフロー">
        <div className="space-y-2 text-sm">
          {[
            { step: '① インタレスト宣言', desc: '各プレイヤーが「参加する」「パス」を宣言。' },
            { step: '② 入札', desc: '参加者が金額を入力。最高額がリード権を獲得（2名以上参加時）。' },
            { step: '③ フォロー許可', desc: '落札者が他の参加者のフォロー投資を許可するか決定。' },
            { step: '④ フォロー投資', desc: '許可された場合、他の参加者が5%でフォロー参加を選択。' },
          ].map(item => (
            <div key={item.step} className="flex gap-2">
              <span className="text-indigo-400 font-semibold shrink-0 text-xs w-32">{item.step}</span>
              <span className="text-slate-300 text-xs">{item.desc}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="フォローオン投資 & 損切り">
        <div className="space-y-3">
          <div className="bg-emerald-900/20 rounded-lg p-3 border border-emerald-700/40">
            <div className="text-emerald-400 font-semibold text-sm mb-1">↑ フォローオン投資</div>
            <p className="text-slate-300 text-xs leading-relaxed">
              今ラウンドにステージが進行した保有企業に追加投資できます。
              上昇したバリュエーションの5%が投資額。アクションを1消費。
            </p>
          </div>
          <div className="bg-red-900/20 rounded-lg p-3 border border-red-700/40">
            <div className="text-red-400 font-semibold text-sm mb-1">↓ 損切り（Write-off）</div>
            <p className="text-slate-300 text-xs leading-relaxed">
              「苦戦中」の保有企業を損切り。投資額は全損（回収なし）。
              清算リスクを回避し、ポートフォリオを整理できます。アクションを1消費。
            </p>
          </div>
        </div>
      </Section>

      <Section title="ヒント情報の見方">
        <p className="text-slate-400 text-xs mb-3">
          各スタートアップには3つの公開ヒントがあります。ただしポテンシャルとの相関は完全ではなく、不確実性が駆け引きを生みます。
        </p>
        <div className="space-y-1">
          {[
            { hint: 'チーム力', desc: '創業チームの実力・経験。A評価は高ポテンシャルの可能性↑' },
            { hint: '市場規模', desc: 'ターゲット市場の大きさ。A評価はブレイクアウトの可能性↑' },
            { hint: 'プロダクト', desc: 'プロダクトの完成度・PMF進捗。A評価は安定成長の可能性↑' },
          ].map(item => (
            <div key={item.hint} className="flex gap-2 py-1 border-b border-slate-700/40 last:border-0">
              <span className="text-slate-300 font-semibold text-xs w-20 shrink-0">{item.hint}</span>
              <span className="text-slate-400 text-xs">{item.desc}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function TablesTab() {
  return (
    <div className="space-y-4">
      <Section title="成長判定テーブル（2d6 + 修正）">
        <p className="text-slate-400 text-xs mb-3">
          修正値 = ダイス合計 + ポテンシャル補正 + リード補正 + イベント補正
        </p>
        <div className="space-y-0 mb-4">
          <TableRow range="≤ 3" result="清算（Dead）" color="text-red-400" />
          <TableRow range="4〜5" result="苦戦中（Struggling）" color="text-amber-400" />
          <TableRow range="6〜8" result="横ばい（Stable）" color="text-slate-300" />
          <TableRow range="9〜10" result="成長（Growth）" color="text-emerald-400" />
          <TableRow range="11〜12" result="急成長（Rapid Growth）" color="text-emerald-300" />
          <TableRow range="13+" result="ブレイクアウト！" color="text-yellow-300" />
        </div>
        <div className="bg-slate-700/30 rounded-lg p-3 text-xs space-y-1">
          <p className="text-slate-300 font-semibold mb-1">ポテンシャル補正（隠しパラメータ）</p>
          <div className="grid grid-cols-5 gap-1 text-center">
            {[
              { p: '★1', mod: '-2' },
              { p: '★2', mod: '-1' },
              { p: '★3', mod: '±0' },
              { p: '★4', mod: '+1' },
              { p: '★5', mod: '+2' },
            ].map(item => (
              <div key={item.p} className="bg-slate-800/60 rounded p-1">
                <div className="text-slate-400">{item.p}</div>
                <div className="text-white font-bold">{item.mod}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Exit判定テーブル（Series Cで実施）">
        <p className="text-slate-400 text-xs mb-3">
          Series Cに進んだラウンドに自動でExit判定が行われます。
        </p>
        <div className="space-y-0 mb-3">
          <TableRow range="≤ 5" result="Exit失敗（継続）" color="text-slate-400" />
          <TableRow range="6〜8" result="M&A Exit（1〜2x倍）" color="text-blue-400" />
          <TableRow range="9〜11" result="IPO（2〜5x倍）" color="text-purple-400" />
          <TableRow range="12+" result="メガIPO！（5〜10x倍）" color="text-yellow-400" />
        </div>
        <p className="text-slate-500 text-xs">
          ※ IPOウィンドウイベントで Exit判定に ±補正が入ります。
        </p>
      </Section>

      <Section title="ステージ進行">
        <p className="text-slate-400 text-xs mb-2">
          成長（Growth以上）の結果が出るとステージが進行し、バリュエーションが倍増します。
        </p>
        <div className="flex items-center gap-2 flex-wrap text-sm">
          {['Seed', 'Series A', 'Series B', 'Series C', 'Exit'].map((stage, i, arr) => (
            <span key={stage} className="flex items-center gap-2">
              <span className="bg-slate-700 rounded px-2 py-0.5 text-slate-200 text-xs">{stage}</span>
              {i < arr.length - 1 && <span className="text-slate-600">→</span>}
            </span>
          ))}
        </div>
        <div className="mt-3 space-y-1 text-xs">
          <div className="flex gap-2"><span className="text-emerald-400 w-20">成長</span><span className="text-slate-300">バリュエーション 2〜3倍</span></div>
          <div className="flex gap-2"><span className="text-emerald-300 w-20">急成長</span><span className="text-slate-300">バリュエーション 3〜5倍</span></div>
          <div className="flex gap-2"><span className="text-yellow-300 w-20">ブレイクアウト</span><span className="text-slate-300">バリュエーション 5〜10倍</span></div>
        </div>
      </Section>
    </div>
  );
}

export function HelpScreen() {
  const { dispatch } = useGame();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      {/* ヘッダー */}
      <header className="bg-slate-800/80 backdrop-blur border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => dispatch({ type: 'NAVIGATE', screen: 'title' })}
            className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-1"
          >
            ← タイトル
          </button>
          <span className="text-slate-500">|</span>
          <span className="text-white font-bold">📖 ゲームの説明</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* タブ */}
        <div className="flex gap-1 mb-6 bg-slate-800/60 rounded-xl p-1 border border-slate-700">
          {TAB_LABELS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === tab.key
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* タブコンテンツ */}
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'phases' && <PhasesTab />}
        {activeTab === 'investment' && <InvestmentTab />}
        {activeTab === 'tables' && <TablesTab />}
      </div>
    </div>
  );
}
