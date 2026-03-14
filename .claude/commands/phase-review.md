# Phase Review & Fix

実装済みPhaseのコードを精査し、次のPhaseに入る前に修正すべき問題を洗い出して修正します。

## 手順

1. **コードレビュー** — 以下の観点でPhase 2以降のコードを検査する:
   - ロジックバグ（誤った計算・誰も実行されないコードパス）
   - フェーズ遷移の問題（スキップ・二重実行・誤った順序）
   - 状態の整合性（フィールドが更新されない・二重適用）
   - 次Phaseで変更が困難になるアーキテクチャ上の決定
   - デッドコード（呼ばれない関数・到達しない分岐）

2. **優先度付き問題リスト** — 以下の優先度で分類して列挙する:
   - **Priority 1**: ゲームの結果に影響する論理バグ（必須修正）
   - **Priority 2**: フェーズ遷移の問題（必須修正）
   - **Priority 3**: 状態整合性の問題（推奨修正）
   - **Priority 4**: 次Phaseで変更困難になるアーキテクチャ（推奨修正）
   - **Priority 5**: デッドコード（任意）

3. **修正実施** — ユーザーが承認した問題を修正する。各修正後にTypeScriptビルドチェックを行う。

4. **動作確認** — preview_* ツールでゲームフローを通してテストする。

5. **コミット** — 修正内容をgit commitする。

## 調査対象ファイル

```
src/types/game.ts
src/logic/gameEngine.ts
src/context/GameContext.tsx
src/screens/GameScreen.tsx
src/screens/phases/*.tsx
src/data/constants.ts
src/data/events.ts
```

## 参照ドキュメント

ゲーム仕様書: `requirements-vc-fund-game.md`
