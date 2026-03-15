# VC Fund Game — 要件定義書

## 1. プロダクト概要

### コンセプト

プレイヤーはVCファンドのパートナーとなり、10年ファンドを運用する。スタートアップへの分散投資を通じて、**パワーロウ（べき乗則）** に基づくVC投資の本質を体感的に学ぶボードゲームアプリケーション。

### パワーロウの原則（ゲームの教育的核心）

VC投資では、ファンドリターンの大部分が少数の大成功案件（ホームラン）から生まれる。100社に投資しても、リターンの90%は上位数社から生まれるのが現実。このゲームでは以下を体感させる。

- 大半のスタートアップは失敗するか小さなリターンにとどまる
- ごく少数の「ユニコーン」がファンド全体のリターンを決定づける
- 打席に多く立ち（投資件数）、勝者に追加投資する（フォローオン）戦略が重要
- 早期に損切りしてファンド資金を温存する判断も必要

### ゴール

- チームやグループでVC投資の意思決定を疑似体験できる
- 1台の端末を囲んでプレイするホットシート型
- サーバー不要、ブラウザだけで完結する静的SPA

### ターゲットユーザー

- VC/スタートアップに関心がある層（社内研修、勉強会、交流会）
- 2〜6人のグループ
- 1ゲーム 20〜30分

---

## 2. 技術要件

| 項目 | 仕様 |
|------|------|
| 形態 | 静的SPA（Single Page Application） |
| 実行環境 | モダンブラウザ（Chrome, Safari, Firefox, Edge） |
| サーバー | 不要（全ロジックをクライアントサイドで実行） |
| データ永続化 | localStorage（ゲーム中断時のセーブ/ロード用） |
| デプロイ | HTMLファイルを開くだけで動作。GitHub Pages等での配信も可能 |

### 推奨技術スタック

- **ビルドツール**: Vite 8
- **フレームワーク**: React 19
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS v4（`@import "tailwindcss"` 構文、設定ファイル不要）
- **状態管理**: useReducer + Context（`appReducer` + `gameReducer` の2層分離）
- **乱数生成**: Web Crypto API（`crypto.getRandomValues` による暗号論的乱数）
- **グラフ**: Recharts（資産推移・ファンドパフォーマンス表示用）

ビルド後は `dist/` フォルダの静的ファイルのみで動作すること。

> **実装ノート**: Vite 8 + Tailwind CSS v4 + Recharts はピア依存関係の不一致があるため、インストール時は `--legacy-peer-deps` フラグを使用する。

---

## 3. ゲームデザイン

### 3.1 世界観

各プレイヤーはVCファンドのジェネラルパートナー（GP）。LPから資金を集め、10年間でスタートアップに投資し、Exit（IPO/M&A）を通じてリターンを最大化する。ファンドのDPI（Distributions to Paid-In Capital = 分配倍率）で勝敗を競う。

### 3.2 ゲームの時間軸

| 設定 | デフォルト値 | 説明 |
|------|------------|------|
| 運用期間 | 10ラウンド | 1ラウンド = 1年。10年ファンドを再現 |
| 投資期間 | 前半5ラウンド | 新規投資が可能な期間。後半はフォローオンのみ |
| ファンドサイズ | **50億円** | 全プレイヤー共通の初期ファンド総額 ※[変更1] |
| 管理報酬 | 年2%（ファンド総額ベース） | 毎ラウンド自動で差し引かれる。10年で計20%（10億円） |
| 投資可能資金 | **40億円** | ファンドサイズ − 管理報酬総額（50億 − 10億）※[変更1] |

> ※[変更1]: 初期設計では100億円（投資可能80億円）だったが、ゲームバランス調整のため50億円（投資可能40億円）に変更。詳細は「変更履歴」参照。

### 3.3 ゲーム構成要素

#### プレイヤー（GPとしてのファンド）

| 属性 | 説明 |
|------|------|
| ファンド名 | ゲーム開始時に入力 |
| 残り投資可能資金 | 投資に使える残り資金 |
| ポートフォリオ | 投資先スタートアップの一覧 |
| 実現リターン | Exit済み案件から得た回収金額（通常Exit分） |
| 清算リターン | 最終清算により得た回収金額（ゲーム終了時） |
| ファンドDPI | 分配総額（Exit回収額 + 清算額）÷ 投資済み総額 |

#### スタートアップ（ディールカード）

各スタートアップは「ディールカード」として表現される。

| 属性 | 説明 |
|------|------|
| 企業名 | 架空のスタートアップ名（48社テンプレートから生成） |
| セクター | SaaS / Fintech / HealthTech / DeepTech / Consumer / CleanTech |
| ステージ | Seed / Series A / Series B（カード出現時のステージ） |
| バリュエーション | 投資時の企業評価額 |
| 成長ポテンシャル | 隠しパラメータ（★1〜★5）。★5はユニコーン候補 |
| ヒント情報 | プレイヤーに見える情報（チーム力、市場規模などの定性評価 A/B/C） |
| 現在ステータス | 成長中 / 横ばい / 苦戦中 / 死亡 / Exit済み（M&A / IPO / メガIPO） |

#### ディールカードの分布（パワーロウの再現）

ゲーム全体のディールデッキは以下の分布で構成する。

| 成長ポテンシャル | 割合 | 最終的な結末の傾向 |
|----------------|------|------------------|
| ★1（失敗） | 35% | 投資額の0〜0.2x回収 ※[変更16] |
| ★2（苦戦） | 25% | 投資額の0.5〜1x回収 |
| ★3（普通） | 25% | 投資額の1〜3x回収 ※[変更16] |
| ★4（成功） | 10% | 投資額の5〜10x回収 |
| ★5（大成功） | 5% | 投資額の20〜50x回収（ユニコーン） |

> **設計意図**: ★4以上の案件がファンドリターンの大部分を占める構造にすることで、パワーロウを体感させる。

### 3.4 ディールフローの仕組み

#### 毎ラウンドのディール配布

| ラウンド | フェーズ | 個別ディール | 共有ディール |
|---------|---------|------------|------------|
| 1〜3年目 | 投資期間（前半） | 各自2〜3枚 | 場に2枚 |
| 4〜5年目 | 投資期間（後半） | 各自1〜2枚 | 場に1枚 |
| 6〜10年目 | 回収期間 | 0枚 | 0枚（フォローオンのみ） |

> **実装ノート**: `deal_flow_reduce` イベント発動時は個別ディール枚数を1枚減算、共有ディールも1枚減算する。

#### 個別ディール

- 各プレイヤーの手札に配られる。他プレイヤーには非公開
- 投資するかパスするかを選択
- パスした案件は捨て札（他プレイヤーには回らない）
- `DealCard.assignedToPlayerId` でホットシート管理

#### 共有ディール（競り）

- 場に公開され、全プレイヤーが見える
- 投資したいプレイヤーが手を挙げる
- 複数名が希望した場合 → **入札**（バリュエーション上乗せ競り）
  - 各プレイヤーが投資額を提示（最低額＝カード記載のバリュエーション相当額）
  - 最も高い投資額を提示したプレイヤーが獲得
  - ただし高値掴みすると、同じ成長をしてもリターン倍率が下がる（バリュエーション交渉の再現）

### 3.5 投資アクション

#### 新規投資（リード vs フォロー）

| 投資タイプ | 投資額 | 取得持分 | 成長ダイスへの影響 | 説明 |
|-----------|--------|---------|-----------------|------|
| リード投資 | バリュエーションの15% | 15% | +1補正（経営関与） | 主導的に投資。コストは大きいがリターンも大きい |
| フォロー投資 | バリュエーションの5% | 5% | 補正なし | 他VCの案件に相乗り。低コスト・低リスク |

- リード投資は1案件につき1名のみ（共有ディールでリードを取り合う駆け引き）
- フォロー投資は複数名可能
- リード投資家には **Pro-rata権**（`hasProRataRight: true`）が付与される

#### フォローオン投資（追加投資）

- 既にポートフォリオにあるスタートアップに追加投資
- `Startup.stageAdvancedThisRound` フラグでステージ進行タイミングを管理
- 追加投資により持分を維持または増加（希薄化防止）
- **Pro-rata権**: リード投資家は次ラウンドで優先的にフォローオン可能

#### 損切り（ライトオフ）

- 「苦戦中」のスタートアップを損切りして、資金をこれ以上失わないようにする
- 投資額は回収不能（0x回収）だが、注意力を他案件に向けられる（アクション数制限）
- ポートフォリオから除去してアクションを1消費

### 3.6 スタートアップの成長モデル（ハイブリッド型）

各スタートアップはステージを持ち、ラウンドごとにダイス＋イベントで成長判定を行う。

#### ステージ遷移

```
Seed → Series A → Series B → Series C → Exit（IPO/M&A/メガIPO）
                                        ↘ 死亡（各ステージで発生しうる）
```

#### 毎ラウンドの成長判定（投資済みスタートアップのみ）

1. **ダイスロール（2d6）** を行い、成長テーブルを参照
2. 成長ポテンシャル（★）に応じて出目に補正を加える
3. リード投資家がいる場合、さらに+1補正
4. イベントカードによるセクター補正を加算
5. 補正後合計は最小2・最大14にクランプ

> **実装ノート**: 投資済み（`investors.length > 0`）かつアクティブ（`growing/stable/struggling`）なスタートアップのみ判定対象とする。

#### 成長判定テーブル（補正後の値で判定）

| 補正後出目 | 結果 |
|-----------|------|
| 2〜3 | **死亡** — スタートアップが倒産。投資額は回収不能 |
| 4〜5 | **苦戦** — ステータスが「苦戦中」に。連続2ラウンド苦戦で30%確率の死亡判定あり |
| 6〜8 | **横ばい** — 現状維持。ステージは進まない |
| 9〜10 | **成長** — 次のステージに進む。バリュエーションが2〜3倍に上昇 |
| 11〜12 | **急成長** — 次のステージに進む。バリュエーションが3〜5倍に上昇 |
| 13以上 | **ブレイクアウト** — 2ステージ飛び級（上限: Series C）。バリュエーション5〜10倍 |

> **連続苦戦ルール**: `Startup.consecutiveStruggling` フィールドで追跡。2ラウンド連続苦戦のとき30%の確率で死亡判定が発生する。

#### ポテンシャル補正

| 成長ポテンシャル | ダイス補正 |
|----------------|----------|
| ★1 | -2 |
| ★2 | -1 |
| ★3 | ±0 |
| ★4 | +1 |
| ★5 | +2 |

> **設計意図**: ★5企業でも2d6+2の最低値は4（苦戦）なので死亡はほぼないが確実に成功するわけでもない。★1企業は補正-2で死亡圏（2-3）に入りやすく、大半が脱落する。

### 3.7 Exit（イグジット）

#### Exit条件

- Series Cに到達したスタートアップは、次のラウンドの成長判定でExit判定に入る
- **ブレイクアウト等でSeries Cに到達した場合**: まず成長倍率をバリュエーションに反映してからExit判定を行う（`resolveExitJudgment` に `preExitValuation` を渡す）
- Exit判定のダイスロール（2d6 + イベント補正）:

| 補正後出目 | 結果 |
|-----------|------|
| 2〜5 | Exit失敗（Series Cのまま。翌ラウンド再判定） |
| 6〜8 | **M&A Exit**（バリュエーションの1〜2倍で買収） |
| 9〜11 | **IPO**（バリュエーションの2〜5倍で上場） |
| 12以上 | **メガIPO**（バリュエーションの5〜10倍で上場。ユニコーン級） |

#### リターン計算

```
回収額 = Exit時バリュエーション × プレイヤーの持分比率
リターン倍率 = 回収額 ÷ そのスタートアップへの投資総額
```

### 3.8 イベントカード（市場環境）

各ラウンド開始時に1枚公開。セクターや市場全体に影響する（全30枚 ※[変更17]）。

| カテゴリ | 例 | 効果 |
|----------|-----|------|
| バブル | 「SaaSバブル到来」 | SaaSセクターの成長判定+2、バリュエーション×1.5倍 |
| 冬の時代 | 「資金調達環境の悪化」 | 全セクターの成長判定-1、ディールフロー減少 |
| 規制 | 「Fintech規制強化」 | Fintechセクターの成長判定-2 |
| ブレイクスルー | 「AI技術革新」 | DeepTechセクターの成長判定+2 |
| Exit環境 | 「IPOウィンドウ開放」 | このラウンドのExit判定+2（`exitModifier`フィールドで実装） |
| ブラックスワン | 「世界的リセッション」 | 全セクターの成長判定-2、未投資企業1社がランダム死亡 |
| LP圧力 | 「LPからの早期回収要請」 | Series C投資済み企業を強制M&A Exit（低倍率） |

> **specialEffectの実装**:
> - `random_death`: 未投資のアクティブ企業1社をランダムに死亡させる
> - `force_ma_exit`: Series C到達の投資済み企業を全て強制M&A Exit
> - `deal_flow_reduce`: 次のディール配布フェーズで個別・共有ディール各1枚減算

### 3.9 ターン構造（1ラウンドの流れ）

```
┌──────────────────────────────────────────────────────┐
│ ラウンド開始（Year X / 10）                              │
│                                                        │
│  0. 管理報酬フェーズ（management_fee）                    │
│     - ファンド総額の2%を事前控除済み（表示・確認のみ）         │
│     - 「次へ」で market_event へ進む                      │
│                                                        │
│  1. 市場フェーズ（market_event）                          │
│     - イベントカードを1枚公開                              │
│     - 効果を全員に表示                                    │
│     - 「次へ」で growth へ進む                            │
│                                                        │
│  2. 成長判定フェーズ（growth）                             │
│     - 「ダイスロール」で RESOLVE_GROWTH を実行              │
│     - 全投資済みスタートアップの成長をダイスで判定             │
│     - ステージ進行・死亡・Exit結果を表示                     │
│     - 「結果を確認した」で CONFIRM_GROWTH を実行            │
│       → 投資期間内: player_transition へ                  │
│       → 投資期間外: summary へ                           │
│                                                        │
│  3. ホットシート切り替え（player_transition）               │
│     - 「○○ファンドのターン。端末を渡してください」と表示       │
│     - 「ゲームを続ける」で deal_individual へ              │
│                                                        │
│  4. 個別ディールフェーズ（deal_individual）（プレイヤーごと）  │
│     - 個別ディールカードを表示（ホットシート）                │
│     - 以下のアクションを実行（上限: 3アクション/ターン）       │
│       a. 新規投資（リード or フォロー）                      │
│       b. フォローオン投資（既存ポートフォリオへの追加投資）      │
│       c. 損切り（ライトオフ）                               │
│       d. パス（DECLINE_DEAL）                            │
│     - 「ターン終了」で次のプレイヤーへ (player_transition)   │
│     - 全プレイヤー完了で deal_shared へ                    │
│                                                        │
│  5. 共有ディールフェーズ（deal_shared）（全体）              │
│     - 共有ディールカードを公開                              │
│     - 投資希望者が競り（バリュエーション入札）                 │
│                                                        │
│  6. ラウンドサマリー（summary）（全体）                      │
│     - 各ファンドの状況を表示（投資件数、残り資金、暫定DPI）     │
│     - 最終ラウンドの場合: FINAL_SETTLEMENT を dispatch     │
│     - 「次のラウンドへ」で ADVANCE_ROUND を dispatch       │
└──────────────────────────────────────────────────────┘
```

### 3.10 終了条件と勝利判定

- **終了条件**: 10ラウンド（10年）を消化したらゲーム終了
- **最終清算**: 未Exit企業は全て強制売却する。売却価格は現在のバリュエーション×持分比率×0.5（流動性ディスカウント）。`liquidationReturns` に加算されDPI計算に含める
- **勝利条件**: ファンドDPI（Distributions to Paid-In Capital）が最も高いプレイヤーの勝利

```
ファンドDPI = (realizedReturns + liquidationReturns) ÷ totalInvested
```

- **タイブレーク**: 同率の場合は投資件数が多い方が勝ち（打席数の重要性を教育）
- **DPIを採用する理由**: 全株式を最終的に売却（実現）するため、未実現評価を含むMOICではなく、実際の分配に基づくDPIが適切な指標となる

### 3.11 プレイヤーに学ばせたいVC投資の原則

| 原則 | ゲーム内の再現 |
|------|--------------|
| パワーロウ | 大半の案件は失敗/微益。少数のホームランがファンドリターンを決める |
| 打席数の重要性 | 投資件数が少ないとホームランに出会う確率が下がる |
| フォローオンの戦略性 | 勝ち馬に追加投資して持分を維持する判断 |
| 損切りの重要性 | 苦戦案件に固執せず早めにライトオフする判断 |
| バリュエーション規律 | 高値掴みするとリターン倍率が下がる |
| セクター分散 | 特定セクターに偏ると市場イベントで大ダメージ |
| リードの価値 | 経営関与で成長確率を上げられるが、コストも大きい |
| 管理報酬の重さ | 10年で20%が報酬に消える。投資に使える資金は限定的 |

---

## 4. 画面設計

### 4.1 画面一覧

| 画面ID | 画面名 | 説明 |
|--------|--------|------|
| `title` | タイトル画面 | ゲーム名、「新規ゲーム」「続きから」「ルールを確認」 |
| `settings` | ゲーム設定画面 | プレイヤー人数（2-6）、ファンド名入力、運用年数・ファンドサイズ設定 |
| `game` | メインゲーム画面 | フェーズルーターとしてのGameScreen。サイドバー常時表示 |
| `result` | ゲーム結果画面 | 最終順位、DPI推移グラフ、パワーロウの可視化、学習ポイント |
| `help` | ルール説明画面 | 4タブ構成（ゲームの目的/フェーズの流れ/投資のしかた/判定テーブル） ※[変更18] |

### 4.2 メインゲーム画面（GameScreen）構成

GameScreen はフェーズルーターとして機能し、右サイドバーに常時以下を表示する。

```
┌──────────────────────────────────────────────────────┐
│ [フェーズコンテンツ（左）] [サイドバー（右）]              │
│                            ┌─ ファンド状況 ──────────┐ │
│  ManagementFeePhase        │ Year 3 / 10             │ │
│  MarketEventPhase          │ Phase: ディールフェーズ  │ │
│  GrowthPhase               │ Player: Fund Alpha      │ │
│  PlayerTransitionPhase     │                         │ │
│  DealIndividualPhase       │ 残り資金: 28億円          │ │
│  DealSharedPhase           │ 投資先: 8社              │ │
│  SummaryPhase              │ 残りアクション: 3         │ │
│                            └──────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### 4.3 ディールカード表示

```
┌─────────────────────────┐
│  🚀 SmartPay Inc.        │
│  セクター: Fintech        │
│  ステージ: Seed           │
│  バリュエーション: 5億円    │
├─────────────────────────┤
│  チーム力:   ★★★☆☆ (B)   │
│  市場規模:   ★★★★☆ (A)   │
│  プロダクト:  ★★☆☆☆ (C)   │
├─────────────────────────┤
│  [ リード投資 0.75億円 ]   │
│  [ フォロー投資 0.25億円 ] │
│  [ パス ]                 │
└─────────────────────────┘
```

> **注意**: 成長ポテンシャル（★1〜★5）はプレイヤーには見えない。ヒント情報（チーム力/市場規模/プロダクト）から推測する要素が駆け引きを生む。

### 4.4 ホットシート切り替え（PlayerTransitionPhase）

- ターン開始時に「○○ファンドのターンです。端末を渡してください」と表示
- 遷移画面では残り資金・ポートフォリオ件数・手札枚数のみ表示
- 他プレイヤーには「画面を見ないでください」と明示
- 「ゲームを続ける」ボタンで `CONFIRM_PLAYER_READY` を dispatch → `deal_individual` フェーズへ

### 4.5 ゲーム結果画面

- 最終DPI順位の表示
- DPI推移グラフ（ラウンドごとの各ファンドのDPI変化）
- パワーロウの可視化：各プレイヤーのリターン分布（「あなたのリターンの80%はこの1社から生まれました」等）
- 投資の学びポイント（自動生成メッセージ）

---

## 5. データモデル

```typescript
// --- セクター・ステージ・ステータス ---

type Sector = 'saas' | 'fintech' | 'healthtech' | 'deeptech' | 'consumer' | 'cleantech';

type Stage = 'seed' | 'series_a' | 'series_b' | 'series_c' | 'exited' | 'dead';

type StartupStatus =        // ※[変更2] exited_mega_ipo を追加
  | 'growing'
  | 'stable'
  | 'struggling'
  | 'dead'
  | 'exited_ma'
  | 'exited_ipo'
  | 'exited_mega_ipo';     // メガIPO（ユニコーン級）を区別

// --- ゲームフェーズ ---       ※[変更3] player_transition 等を追加

type Phase =
  | 'management_fee'        // 0. 管理報酬控除（自動）
  | 'market_event'          // 1. イベントカード公開
  | 'growth'                // 2. 成長判定
  | 'player_transition'     // ホットシート切り替え画面（新規追加）
  | 'deal_individual'       // 3. 個別ディール（プレイヤーごと）
  | 'deal_shared'           // 4. 共有ディール競り
  | 'summary'               // 5. ラウンドサマリー
  | 'exit_judgment'         // Series C企業のExit判定（成長判定内で発生、将来拡張用）
  | 'final_settlement'      // ゲーム終了時の強制清算（将来拡張用）
  | 'game_over';            // 結果画面遷移トリガー

// --- ゲーム設定 ---

interface GameSettings {
  totalRounds: number;         // デフォルト: 10
  fundSize: number;            // デフォルト: 5_000_000_000 (50億円) ※[変更1]
  managementFeeRate: number;   // デフォルト: 0.02
  investmentPeriod: number;    // 新規投資可能な期間（デフォルト: 5ラウンド）
  actionsPerTurn: number;      // デフォルト: 3
}

// --- スタートアップのヒント情報 ---

interface StartupHints {
  teamQuality: 'A' | 'B' | 'C';
  marketSize: 'A' | 'B' | 'C';
  productReadiness: 'A' | 'B' | 'C';
}

// --- スタートアップ ---           ※[変更4] フィールドを追加

interface Startup {
  id: string;
  name: string;
  sector: Sector;
  currentStage: Stage;
  status: StartupStatus;
  currentValuation: number;
  growthPotential: 1 | 2 | 3 | 4 | 5;  // 隠しパラメータ
  hints: StartupHints;                   // プレイヤーに公開
  leadInvestorId: string | null;
  investors: string[];                    // 投資しているプレイヤーIDリスト
  valuationHistory: { round: number; valuation: number }[];
  // --- 追加フィールド ---
  consecutiveStruggling: number;          // 連続「苦戦」ラウンド数（死亡リスク上昇判定用）
  stageAdvancedThisRound: boolean;        // 今ラウンドにステージ進行したか（フォローオン適格判定用）
  exitValuation: number | null;           // Exit時の最終バリュエーション
  exitRound: number | null;              // Exitが発生したラウンド
  exitType: 'ma' | 'ipo' | 'mega_ipo' | null; // Exit種別（結果画面の可視化用）
}

// --- ディールカード ---               ※[変更5] assignedToPlayerId を追加

interface DealCard {
  startupId: string;
  isShared: boolean;
  assignedToPlayerId: string | null;     // 個別ディールの割り当て先（ホットシート管理用）
}

// --- イベントカード ---               ※[変更6] exitModifier を追加

interface EventEffect {
  target: 'all' | Sector;
  growthModifier: number;               // 成長判定ダイスへの補正
  exitModifier?: number;               // Exit判定ダイスへの補正（IPOウィンドウ等）
  valuationModifier?: number;          // バリュエーション追加乗数（(1 + modifier) として適用）
  specialEffect?: 'force_ma_exit' | 'random_death' | 'deal_flow_reduce';
}

interface EventCard {
  id: string;
  title: string;
  description: string;
  category: 'bubble' | 'winter' | 'regulation' | 'breakthrough' | 'exit_window' | 'black_swan' | 'lp_pressure';
  effects: EventEffect[];
}

// --- 成長・Exit判定結果 ---           ※[変更7] 型を明示

type GrowthResult = 'death' | 'struggling' | 'stable' | 'growth' | 'rapid_growth' | 'breakout';

type ExitResult = 'fail' | 'ma' | 'ipo' | 'mega_ipo';

interface ExitJudgmentResult {
  startupId: string;
  dice: [number, number];
  rawTotal: number;
  eventModifier: number;
  modifiedTotal: number;
  result: ExitResult;
  exitValuation: number;
  returnsPerPlayer: {
    playerId: string;
    amount: number;    // 回収額
    multiple: number;  // 投資倍率
  }[];
}

interface GrowthJudgmentResult {
  startupId: string;
  dice: [number, number];          // 2d6の各出目
  rawTotal: number;                // ダイス合計（補正前）
  potentialModifier: number;       // ポテンシャル補正
  leadModifier: number;            // リード投資家補正
  eventModifier: number;           // イベント補正
  modifiedTotal: number;           // 補正後合計
  result: GrowthResult;
  previousStage: Stage;
  newStage: Stage;
  previousValuation: number;
  newValuation: number;
  isExitJudgment: boolean;         // Series C到達でExit判定に入ったか
  exitResult?: ExitJudgmentResult;
}

// --- 投資 ---                       ※[変更8] hasProRataRight を追加

interface InvestmentRound {
  round: number;
  amount: number;
  stage: Stage;
  valuationAtInvestment: number;
}

interface Investment {
  startupId: string;
  investmentType: 'lead' | 'follow';
  rounds: InvestmentRound[];         // 投資履歴（初回＋フォローオン）
  ownershipPercent: number;          // 現在の持分比率
  hasProRataRight: boolean;          // リード投資家はPro-rata権あり（フォローオン優先権）
}

// --- 入札（共有ディール競り）---      ※[変更9] 新規追加

interface Bid {
  playerId: string;
  amount: number;
}

interface AuctionState {
  dealCard: DealCard;
  bids: Bid[];
  winnerId: string | null;
  isResolved: boolean;
}

// --- プレイヤー ---                  ※[変更10] liquidationReturns, managementFeesPaid を追加

interface Player {
  id: string;
  fundName: string;
  remainingCapital: number;
  totalInvested: number;
  realizedReturns: number;           // 通常Exit回収額の累計
  liquidationReturns: number;        // 最終清算回収額（最終DPI計算に含める）
  managementFeesPaid: number;        // 累計管理報酬支払額（表示用）
  portfolio: Investment[];
  handDeals: DealCard[];             // 今ラウンドの個別手札
}

// --- 履歴 ---                       ※[変更11] PlayerSnapshot を独立型に。フィールドを拡張

interface PlayerSnapshot {
  playerId: string;
  dpi: number;                       // (realizedReturns + liquidationReturns) / totalInvested
  totalInvested: number;
  realizedReturns: number;
  unrealizedValue: number;           // 保有中スタートアップの現在評価額合計（持分換算）
  portfolioCount: number;
  aliveCount: number;
}

interface RoundSnapshot {
  round: number;
  eventTitle: string | null;         // 当ラウンドのイベント名
  playerSnapshots: PlayerSnapshot[];
  growthResults: GrowthJudgmentResult[]; // 成長判定の詳細結果
}

// --- ゲーム全体の状態 ---            ※[変更12] currentGrowthResults, currentAuction, isGameOver を追加

interface GameState {
  settings: GameSettings;
  currentRound: number;
  currentPhase: Phase;
  currentPlayerIndex: number;
  actionsRemaining: number;
  players: Player[];
  dealDeck: DealCard[];
  sharedDeals: DealCard[];
  currentEvent: EventCard | null;
  eventDeck: EventCard[];
  eventHistory: EventCard[];
  allStartups: Startup[];
  roundHistory: RoundSnapshot[];
  currentGrowthResults: GrowthJudgmentResult[]; // 今ラウンドの成長判定結果（表示用）
  currentAuction: AuctionState | null;           // 進行中の競りセッション
  isGameOver: boolean;
}

// --- ゲームアクション（Reducer用）--- ※[変更13] PlayerAction を全面再設計

type GameAction =
  // ラウンド進行
  | { type: 'DEDUCT_MANAGEMENT_FEE' }
  | { type: 'DRAW_EVENT' }
  | { type: 'DEAL_CARDS' }
  | { type: 'RESOLVE_GROWTH' }           // 成長判定を実行（フェーズは growth のまま）
  | { type: 'CONFIRM_GROWTH' }           // 成長結果を確認してフェーズ進行
  | { type: 'CONFIRM_PLAYER_READY' }     // PlayerTransition 画面でプレイヤー準備完了
  | { type: 'ADVANCE_PHASE' }            // 汎用フェーズ進行（レガシー用）
  | { type: 'ADVANCE_ROUND' }
  | { type: 'NEXT_PLAYER' }
  // 投資アクション（playerId を明示 — currentPlayerIndex に依存しない）
  | { type: 'INVEST_LEAD'; playerId: string; startupId: string; amount: number }
  | { type: 'INVEST_FOLLOW'; playerId: string; startupId: string; amount: number }
  | { type: 'FOLLOW_ON'; playerId: string; startupId: string; amount: number }
  | { type: 'DECLINE_DEAL'; startupId: string }   // 手札カードをパス（アクション消費）
  | { type: 'WRITE_OFF'; startupId: string }       // ポートフォリオの損金処理
  | { type: 'PASS_ACTION' }
  | { type: 'END_TURN' }
  // 共有ディール競り
  | { type: 'START_AUCTION'; dealCard: DealCard }
  | { type: 'SUBMIT_BID'; playerId: string; amount: number }
  | { type: 'RESOLVE_AUCTION' }
  // ゲーム終了
  | { type: 'FINAL_SETTLEMENT' }
  | { type: 'END_GAME' };

// --- 画面遷移 ---

type Screen = 'title' | 'settings' | 'game' | 'result' | 'help'; // ※[変更18]
```

---

## 6. ゲームバランスパラメータ

プレイテスト後に調整する前提の初期値。`src/data/constants.ts` で一元管理する。

### 投資パラメータ

| パラメータ | 初期値 | 説明 |
|-----------|--------|------|
| リード投資額 | バリュエーションの15% | `LEAD_INVESTMENT_RATE = 0.15` |
| フォロー投資額 | バリュエーションの5% | `FOLLOW_INVESTMENT_RATE = 0.05` |
| リード投資のダイス補正 | +1 | `LEAD_DICE_BONUS = 1` |
| 1ターンのアクション上限 | 3回 | 投資判断の重みを出す |
| フォローオン投資可能タイミング | ステージ進行時 | `stageAdvancedThisRound` フラグで管理 |

### バリュエーション初期値

| ステージ | バリュエーションレンジ |
|---------|---------------------|
| Seed | 3〜8億円 |
| Series A | 10〜30億円 |
| Series B | 30〜100億円 |

### 成長判定

| パラメータ | 値 |
|-----------|------|
| ダイス | 2d6（Web Crypto API使用） |
| ポテンシャル補正 | ★1: -2, ★2: -1, ★3: ±0, ★4: +1, ★5: +2 |
| リード補正 | +1 |
| 補正後合計クランプ | 最小2、最大14 |
| 死亡判定 | 補正後出目 2〜3 |
| 苦戦判定 | 補正後出目 4〜5 |
| 横ばい判定 | 補正後出目 6〜8 |
| 成長判定 | 補正後出目 9〜10 |
| 急成長判定 | 補正後出目 11〜12 |
| ブレイクアウト | 補正後出目 13以上 |
| 連続苦戦死亡確率 | 2ラウンド連続苦戦で30% |

### ステージ進行時のバリュエーション上昇

| 成長結果 | バリュエーション倍率 |
|---------|-------------------|
| 成長 | 2〜3x |
| 急成長 | 3〜5x |
| ブレイクアウト | 5〜10x |

### Exit倍率

| Exit種別 | 最終バリュエーションに対する倍率 |
|---------|---------------------------|
| M&A | 1〜2x |
| IPO | 2〜5x |
| メガIPO | 5〜10x |

### 最終清算

| パラメータ | 値 |
|-----------|------|
| 未Exit企業の強制売却価格 | 現バリュエーション×持分×0.5（`LIQUIDATION_DISCOUNT = 0.5`） |
| 売却額の扱い | `liquidationReturns` に加算し、DPI計算に含める |

---

## 7. アーキテクチャ

### 7.1 ファイル構成

```
src/
  types/game.ts          - 全TypeScriptインターフェース/型定義
  data/
    constants.ts         - ゲームパラメータ、判定テーブル、formatCurrency
    startups.ts          - 48スタートアップテンプレート + ヒント生成ロジック
    events.ts            - 30枚のイベントカード定義 ※[変更17]
    deckBuilder.ts       - Web Crypto APIを使ったデッキ生成
  logic/
    gameEngine.ts        - 純粋関数のゲームロジック（UIに非依存）
  context/
    GameContext.tsx      - useReducer + Context、localStorage セーブ/ロード
  screens/
    TitleScreen.tsx
    SettingsScreen.tsx
    GameScreen.tsx       - フェーズルーター + サイドバー
    ResultScreen.tsx
    HelpScreen.tsx       - ルール説明画面（4タブ） ※[変更18]
    phases/
      ManagementFeePhase.tsx
      MarketEventPhase.tsx
      GrowthPhase.tsx
      PlayerTransitionPhase.tsx
      DealIndividualPhase.tsx
      DealSharedPhase.tsx
      SummaryPhase.tsx
  App.tsx                - 画面ルーター（Screen型で分岐）
  main.tsx               - エントリーポイント（GameProviderで包む）
```

### 7.2 Reducer 設計

2層構成で責務を分離する。

```
AppState
  └─ appReducer         - 画面遷移（NAVIGATE, START_GAME, LOAD_SAVE）
       └─ gameReducer   - ゲームロジック（GameAction を処理）
```

- `dispatchGame(action: GameAction)` は `dispatch({ type: 'DISPATCH_GAME', action })` のショートハンド
- `gameReducer` は `src/logic/gameEngine.ts` の純粋関数を呼び出す
- `currentPhase === 'game_over'` になった時点で `appReducer` が `screen: 'result'` に遷移

### 7.3 セーブ/ロード

```typescript
interface SaveEnvelope {
  version: number;   // SAVE_VERSION（型変更時にインクリメント）
  savedAt: string;   // ISO timestamp
  state: AppState;
}
```

- `localStorage` キー: `'vc-fund-game-save'`
- 状態変化のたびに自動セーブ（`useEffect([state])`）
- バージョン不一致時は古いセーブを破棄して初期状態に戻る

---

## 8. 非機能要件

| 項目 | 要件 |
|------|------|
| レスポンシブ | タブレット横置き（1024px以上）を主対象。PC画面にも対応 |
| パフォーマンス | 全操作が100ms以内に応答（ダイス演出を除く） |
| オフライン対応 | ネットワーク接続なしで完全動作 |
| セーブ/ロード | localStorageにAppState全体をSaveEnvelope形式で保存。ブラウザを閉じても再開可能 |
| アクセシビリティ | 色覚多様性に配慮。ステータスは色＋アイコンの両方で表現 |
| 言語 | 日本語。UIテキストは定数ファイルに集約（将来の多言語化対応） |

---

## 9. 実装フェーズ（進捗）

### Phase 1: 基盤（MVP）✅ 完了

- プロジェクト初期化（Vite 8 + React 19 + TypeScript + Tailwind CSS v4）
- 全型定義（`src/types/game.ts`）
- ゲーム状態管理（`useReducer + Context`、`AppState` / `gameReducer` 2層構成）
- 画面遷移（タイトル → 設定 → ゲーム開始）
- ディールカードデッキ（48テンプレート）とイベントカードデッキ（23枚）

### Phase 2: コアゲームループ ✅ 完了

- `src/logic/gameEngine.ts`（純粋関数）の実装
  - `resolveAllGrowth` / `applyGrowthResultsToState`（投資済みのみ判定）
  - `resolveGrowthJudgment` / `resolveExitJudgment`（Exit時バリュエーション補正対応）
  - `applyGrowthValuation`（valuationModifier を `(1 + modifier)` 乗数として適用）
  - `distributeDealsForRound`（late ラウンドでのhandDealsクリア、deal_flow_reduce対応）
  - `advanceRound`（currentAuction リセット、stageAdvancedThisRound リセット）
  - `getPhaseAfterGrowth`（成長判定後のフェーズ決定を一元化）
  - `doFinalSettlement`（liquidationReturns への加算）
- フェーズコンポーネント全7画面の実装
- `RESOLVE_GROWTH`（計算のみ）/ `CONFIRM_GROWTH`（フェーズ進行）分離
- `CONFIRM_PLAYER_READY` による明示的なホットシート切り替え
- 投資アクションへの `playerId` 明示（`currentPlayerIndex` に非依存）
- `DECLINE_DEAL`（手札パス）/ `WRITE_OFF`（ポートフォリオ損切り）分離
- localStorage セーブ/ロード（`SaveEnvelope` + バージョン管理）

### Phase 3: 駆け引き要素 ✅ 完了 — commit `8ead84b`

- 共有ディールの4段階競りフェーズ（バリュエーション入札UI）
  - 挙手 → 入札 → 結果確認 → リード/フォロー確定 の4ステップフロー
- フォローオン投資UIの改善（ポートフォリオ一覧からワンクリック追加投資）
- 損切り（ライトオフ）UIの改善（DealIndividualPhaseから直接実行）

### Phase 4: 演出とUX ✅ 完了

- ダイスロールのアニメーション（GrowthPhase）
- スタートアップの成長/死亡の演出（アイコン・色分けカード）
- DPI推移グラフ（Recharts）— ResultScreen
- パワーロウの可視化（Exit分布、投資倍率ランキング）— ResultScreen
- イベントカードの演出（MarketEventPhase）

### Phase 5: ブラッシュアップ ✅ 完了 — commit `c166ad1`

- イベントカードのバリエーション追加（23枚 → 30枚） ※[変更17]
- ゲームバランス調整（ポテンシャル分布微調整） ※[変更16]
- ルール説明画面（HelpScreen）— 4タブ構成 ※[変更18]
- SummaryPhaseに学習ポイント自動生成メッセージ追加 ※[変更19]
- セーブ日時表示（TitleScreenの「続きから」ボタン下部）

---

## 10. 初期データ（実装済み）

### スタートアップテンプレート（48社）

| セクター | 企業名 |
|---------|--------|
| SaaS | CloudBoard, DataPipe, WorkStream, SyncFlow, MetricHub, DocuForce, TeamPulse, ApiNest |
| Fintech | PayBridge, LendTech, CashFlow AI, TrustVault, NeoBank, InsurTech X, CryptoBase, WealthPilot |
| HealthTech | MediScan, GeneCure, CareLink, PharmaAI, VitalSign, BioNova, HealthMesh, MindCare |
| DeepTech | QuantumLeap, RoboForge, FusionCore + 5社 |
| Consumer | FoodBox, StyleMatch, TripCraft + 5社 |
| CleanTech | SolarGrid, GreenDrive, CarbonZero + 5社 |

### イベントカード（30枚 ※[変更17]）

| カテゴリ | 枚数 |
|---------|------|
| バブル | 6枚（SaaS, Fintech, Consumer, CleanTech, HealthTech, 全体） |
| 冬の時代 | 4枚 |
| 規制 | 6枚（全セクター） |
| ブレイクスルー | 6枚（全セクター） |
| Exit環境 | 3枚（+IPO凍結を追加） |
| ブラックスワン | 2枚 |
| LP圧力 | 2枚 |
| 平穏 | 1枚 |

---

## 11. 補足事項

- **著作権**: ゲームルールは完全オリジナル。アクワイアからはメカニクスの着想のみ参考にしている
- **拡張性**: 将来的にオンライン対戦（WebRTC）やAI対戦相手の追加を想定した設計にする。ただしPhase 1〜5ではスコープ外
- **テスト**: ゲームロジック（成長判定、DPI計算、Exit計算）にユニットテストを重点的に書く
- **パワーロウの検証**: ディールデッキの分布が実際にパワーロウ的なリターン分布を生むか、シミュレーションで検証することを推奨

---

## 変更履歴

### [変更1] デフォルトファンドサイズの変更 — commit `394fa48`

**変更前**: ファンドサイズ = 100億円、投資可能資金 = 80億円
**変更後**: ファンドサイズ = 50億円、投資可能資金 = 40億円

**理由**: ゲームバランス調整。100億円ではリード投資のバリュエーション（Seed: 3〜8億円）に対して資金が潤沢すぎ、戦略的緊張感が生まれにくかった。50億円に縮小することで1ターンあたりの投資判断に重みを持たせる。

**影響ファイル**: `src/data/constants.ts` (`fundSize: 5_000_000_000`)

---

### [変更2] `StartupStatus` 型の拡張 — commit `4576752`

**変更前**: `'exited_ma' | 'exited_ipo'`
**変更後**: `'exited_ma' | 'exited_ipo' | 'exited_mega_ipo'`

**理由**: メガIPO（ユニコーン級Exit）を他のIPOと区別するため。結果画面でのパワーロウ可視化に使用。

**影響ファイル**: `src/types/game.ts`, `src/data/constants.ts` (`STATUS_LABELS`)

---

### [変更3] `Phase` 型の拡張 — commit `4576752` + `4fc3d85`

**変更前**: `'management_fee' | 'market_event' | 'growth' | 'deal_individual' | 'deal_shared' | 'summary'`
**変更後**: 上記に加え `'player_transition' | 'exit_judgment' | 'final_settlement' | 'game_over'` を追加

**理由**:
- `player_transition`: ホットシート切り替えを独立フェーズとして明示化
- `exit_judgment`: 将来のExit判定フェーズ独立化に向けた予約（現在は `growth` フェーズ内で処理）
- `final_settlement`: 最終清算の独立フェーズ予約
- `game_over`: `appReducer` が `result` 画面へのナビゲーションをトリガーするフラグフェーズ

**影響ファイル**: `src/types/game.ts`

---

### [変更4] `Startup` インターフェースのフィールド追加 — commit `4576752`

追加フィールド:
- `consecutiveStruggling: number` — 苦戦連続ラウンド数の追跡（2ラウンド連続で30%死亡）
- `stageAdvancedThisRound: boolean` — フォローオン投資の適格タイミング判定用
- `exitValuation: number | null` — Exit時バリュエーションの記録（結果表示用）
- `exitRound: number | null` — Exit発生ラウンドの記録
- `exitType: 'ma' | 'ipo' | 'mega_ipo' | null` — Exit種別の記録（パワーロウ可視化用）

**影響ファイル**: `src/types/game.ts`, `src/logic/gameEngine.ts`

---

### [変更5] `DealCard` インターフェースへの `assignedToPlayerId` 追加 — commit `4576752`

**理由**: ホットシート管理のため、個別ディールカードの割り当て先プレイヤーIDを持つ必要があった。

**影響ファイル**: `src/types/game.ts`, `src/logic/gameEngine.ts` (`distributeDealsForRound`)

---

### [変更6] `EventEffect` への `exitModifier` フィールド追加 — commit `4576752`

**変更前**: `exitModifier` なし（IPOウィンドウ効果はコメントで「別途ロジックで処理」としていた）
**変更後**: `exitModifier?: number` を追加し `getExitModifierFromEvent()` で集約処理

**影響ファイル**: `src/types/game.ts`, `src/logic/gameEngine.ts`, `src/data/events.ts`

---

### [変更7] `GrowthJudgmentResult` / `ExitJudgmentResult` 型の追加 — commit `4576752`

**理由**: 成長判定・Exit判定の結果を型安全に表現し、`GrowthPhase.tsx` での表示と `RoundSnapshot` への記録に使用するため。

**影響ファイル**: `src/types/game.ts`

---

### [変更8] `Investment` への `hasProRataRight` フィールド追加 — commit `4576752`

**理由**: リード投資家のPro-rata権を型レベルで表現するため。`executeLeadInvestment` で `true`、`executeFollowInvestment` で `false` に設定される。

**影響ファイル**: `src/types/game.ts`, `src/logic/gameEngine.ts`

---

### [変更9] `Bid` / `AuctionState` インターフェースの追加 — commit `4576752`

**理由**: 共有ディール競りフェーズ（`DealSharedPhase`）の実装に必要。`GameState.currentAuction` として管理。

**影響ファイル**: `src/types/game.ts`

---

### [変更10] `Player` インターフェースへのフィールド追加 — commit `4576752`

追加フィールド:
- `liquidationReturns: number` — 最終清算による回収額（DPI計算で `realizedReturns` と合算）
- `managementFeesPaid: number` — 累計管理報酬（表示・分析用）

**DPI計算式の変更**:
変更前: `realizedReturns / totalInvested`
変更後: `(realizedReturns + liquidationReturns) / totalInvested`

**影響ファイル**: `src/types/game.ts`, `src/logic/gameEngine.ts`, `src/context/GameContext.tsx`

---

### [変更11] `RoundSnapshot` / `PlayerSnapshot` の拡張 — commit `4576752`

- `PlayerSnapshot` を独立した名前付き型に昇格
- `PlayerSnapshot.unrealizedValue` を追加（未実現評価額）
- `RoundSnapshot.eventTitle` を追加（イベント名の表示用）
- `RoundSnapshot.growthResults` を追加（成長判定詳細の記録）

**影響ファイル**: `src/types/game.ts`, `src/logic/gameEngine.ts` (`takeRoundSnapshot`)

---

### [変更12] `GameState` へのフィールド追加 — commit `4576752`

追加フィールド:
- `currentGrowthResults: GrowthJudgmentResult[]` — 今ラウンドの成長判定結果（`GrowthPhase` で表示）
- `currentAuction: AuctionState | null` — 進行中の競りセッション管理
- `isGameOver: boolean` — ゲーム終了フラグ（アクション受付制御用）

**影響ファイル**: `src/types/game.ts`, `src/context/GameContext.tsx`

---

### [変更13] `PlayerAction` 型を `GameAction` に全面再設計 — commit `4576752` + `2fde677`

**変更前**: 小文字snake_caseのUnion型 (`invest_lead`, `invest_follow`, etc.)
**変更後**: UPPER_SNAKE_CASEのReducerアクション型

**主な設計変更**:
1. 投資アクションに `playerId` を明示 — `currentPlayerIndex` への依存を排除
2. `RESOLVE_GROWTH`（計算のみ）と `CONFIRM_GROWTH`（フェーズ進行）を分離
3. `CONFIRM_PLAYER_READY` を追加（`ADVANCE_PHASE` の配列依存を排除）
4. `DECLINE_DEAL`（手札パス）と `WRITE_OFF`（ポートフォリオ損切り）を明示的に分離
5. 競りアクション（`START_AUCTION`, `SUBMIT_BID`, `RESOLVE_AUCTION`）を追加

**影響ファイル**: `src/types/game.ts`, `src/context/GameContext.tsx`, 全フェーズコンポーネント

---

### [変更14] ゲームエンジンの純粋関数分離 — commit `4576752` + `2fde677`

**変更**: `src/logic/gameEngine.ts` を新規作成し、ゲームロジックをUIから独立した純粋関数として実装

**主要関数**:
- `rollDice()` — Web Crypto APIによる2d6
- `resolveGrowthJudgment()` — 1社分の成長判定
- `resolveExitJudgment(startup, baseValuation, event, players)` — Exit判定（成長後バリュエーションを受け取る設計）
- `resolveAllGrowth()` — 全投資済み企業の成長判定
- `applyGrowthResultsToState()` — specialEffect含む成長結果の適用
- `distributeDealsForRound()` — ラウンド別ディール配布
- `executeLeadInvestment()` / `executeFollowInvestment()` — 投資実行
- `advanceRound()` — ラウンド進行（`currentAuction` リセット等含む）
- `getPhaseAfterGrowth()` — 成長後フェーズの一元決定
- `doFinalSettlement()` — 最終清算
- `takeRoundSnapshot()` — ラウンド履歴記録

**理由**: テスタビリティ向上、`gameReducer` の見通し改善、副作用の明示化

**影響ファイル**: `src/logic/gameEngine.ts`（新規）, `src/context/GameContext.tsx`

---

### [変更16] ポテンシャル分布のバランス調整 — Phase 5, commit `c166ad1`

**変更前**: ★1: 40%, ★3: 20%
**変更後**: ★1: 35%, ★3: 25%

**理由**: 初心者プレイヤーが大半の案件で即倒産するとゲームへの親しみが低下するため、最低ポテンシャルの割合を微減し、中程度ポテンシャルを増加。パワーロウの本質は維持しつつ、初プレイでも「勝ち筋」を感じやすくする。

**影響ファイル**: `src/data/constants.ts` (`POTENTIAL_DISTRIBUTION`)

---

### [変更17] イベントカード追加（23枚 → 30枚）— Phase 5, commit `c166ad1`

追加した7枚:

| ID | タイトル | 効果 |
|----|---------|------|
| `regulation_saas` | データ独占規制 | SaaS 成長判定 -2 |
| `regulation_cleantech` | 補助金削減 | CleanTech 成長判定 -2 |
| `exit_03` | IPO市場凍結 | Exit判定 -2 |
| `bubble_all` | スタートアップ投資ブーム | 全セクター成長判定 +1 |
| `breakthrough_consumer` | SNS新プラットフォーム台頭 | Consumer 成長判定 +2 |
| `breakthrough_fintech` | デジタル通貨普及 | Fintech 成長判定 +2 |
| `winter_04` | 地政学リスク上昇 | 全セクター成長判定 -1 |

**理由**: 10ラウンドで同じカードが繰り返し出ることを防ぎリプレイ性を高める。規制/ブレイクスルー/Exitウィンドウの全セクター対称性も改善。

**影響ファイル**: `src/data/events.ts`

---

### [変更18] ルール説明画面（HelpScreen）の追加 — Phase 5, commit `c166ad1`

**追加**: `src/screens/HelpScreen.tsx`（新規）
- 4タブ構成: ゲームの目的 / フェーズの流れ / 投資のしかた / 判定テーブル
- TitleScreenに「📖 ルールを確認」ボタン追加
- `Screen` 型に `'help'` を追加

**影響ファイル**: `src/types/game.ts`, `src/App.tsx`, `src/screens/HelpScreen.tsx`, `src/screens/TitleScreen.tsx`

---

### [変更19] SummaryPhaseへの学習ポイント自動生成メッセージ追加 — Phase 5, commit `c166ad1`

**追加**: `generateLearningMessages(game: GameState): string[]` 関数

ラウンド結果から最大2件のメッセージを自動生成（優先度順）:
1. 高ポテンシャル（★4-5）企業が倒産 → 「運の要素」解説
2. リード補正が成否の分岐点 → 「リード投資の価値」解説
3. イベント補正 ±2 以上 → 「市場環境の波及」解説
4. ラウンド3以降で全員DPI < 1 → 「後半戦への集中投資」促進
5. ブレイクアウト発生 → 「パワーロウ則」解説

**影響ファイル**: `src/screens/phases/SummaryPhase.tsx`

---

### [変更15] Phase 2 レビューでの不具合修正 — commit `2fde677`

以下の不具合を修正:

| No. | 不具合内容 | 修正内容 |
|-----|----------|---------|
| 1 | `RESOLVE_GROWTH` がフェーズを変更し、成長結果の表示前にフェーズが進んでいた | `RESOLVE_GROWTH` は計算のみ・フェーズ維持。新 `CONFIRM_GROWTH` でフェーズ進行 |
| 2 | `WRITE_OFF` が `portfolio` でなく `handDeals` から除去していた | `portfolio.filter(inv => inv.startupId !== action.startupId)` に修正 |
| 3 | 共有ディール競り（`DealSharedPhase`）で `ADVANCE_ROUND` を呼び、ラウンドが誤進行 | `ADVANCE_PHASE`（deal_shared → summary）に変更 |
| 4 | 共有ディール投資が常に `currentPlayerIndex` のプレイヤーに帰属していた | `winner.id` を `playerId` として `INVEST_LEAD` に渡す設計に変更 |
| 5 | `valuationModifier` がバリュエーションに加算（+x）ではなく乗算（×x）されていなかった | `base * (1 + extraMultiplier)` として正しく乗数適用 |
| 6 | `random_death` が投資済み企業を対象にしていた | `investors.length === 0` のみを対象に変更 |
| 7 | late ラウンドで前ラウンドの `handDeals` が残留していた | `distributeDealsForRound` の `phase === 'late'` で `handDeals: []` にクリア |
| 8 | ラウンド進行時に前ラウンドの `currentAuction` が残留していた | `advanceRound` で `currentAuction: null` にリセット |

**影響ファイル**: `src/logic/gameEngine.ts`, `src/context/GameContext.tsx`, `src/screens/phases/GrowthPhase.tsx`, `src/screens/phases/PlayerTransitionPhase.tsx`, `src/screens/phases/DealIndividualPhase.tsx`, `src/screens/phases/DealSharedPhase.tsx`
