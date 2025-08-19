# cc-sdd

**仕様駆動開発でコーディングワークフローを変革**

> 📦 **ベータリリース** - 使用可能、改善中[問題を報告 →](https://github.com/gotalab/claude-code-spec/issues)

ワンライナーで **AI-DLC**（AI駆動開発ライフサイクル）と **SDD**（仕様駆動開発）ワークフローをインストール。Claude Codeにあなたのプロジェクトコンテキストと開発パターンを教える **プロジェクトメモリ**（ステアリング）を含む：**requirements → design → tasks → implementation**

**Kiro IDEと高い互換性** — 既存のKiro流SDDの仕様・ワークフローをそのまま活用できます。

## 🚀 クイックスタート

```bash
# 基本インストール（デフォルトはClaude Code）
npx cc-sdd@latest

# 言語指定: --lang en (英語) または --lang ja (日本語) または --lang zh-TW (繁体字中国語)
# OS指定: --os mac または --os windows (自動検出が失敗した場合)
npx cc-sdd@latest --lang ja --os mac

# 異なるエージェント: gemini-cli or claude-code
npx cc-sdd@latest --gemini-cli

# 準備完了！Claude CodeとGemini CLIを立ち上げると `/kiro:spec-init <作りたいアプリやもの>` から完全なSDDワークフローを活用できます
```

## ✨ 何が手に入るか

cc-sddを実行すると、以下が得られます：

- **8つの強力なスラッシュコマンド** (`/kiro:steering`, `/kiro:spec-requirements`, など)
- **プロジェクトメモリ（ステアリング）** - AIがあなたのコードベース、パターン、設定を学習
- **構造化されたAI-DLCワークフロー** と品質ゲート、承認機能
- **仕様駆動開発** 手法を内蔵
- **Kiro IDE互換性** でシームレスな仕様管理

**最適な用途**: 機能開発、コードレビュー、技術計画、チーム全体の開発基準維持

## 🤖 対応コーディングエージェント

- **✅ Claude Code** - 8つのカスタムスラッシュコマンドとCLAUDE.mdで完全対応
- **✅ Gemini CLI** - 8つのカスタムコマンドとGEMINI.mdで完全対応
- **📅 その他のエージェント** - 追加のAIコーディングアシスタントを計画中

*現在Claude Code向けに最適化されています。完全な機能を使用するには `--agent claude-code`（デフォルト）を使用してください。*
 
## 📋 AI-DLCワークフロー

**ステップ0: プロジェクトメモリの設定（推奨）**
```bash
# Claude Codeにあなたのプロジェクトについて教える
/kiro:steering
```

**SDD開発フロー:**
```bash
# 1. 新しい機能仕様を開始
/kiro:spec-init User authentication with OAuth and 2FA

# 2. 詳細な要件を生成  
/kiro:spec-requirements user-auth

# 3. 技術設計を作成（要件レビュー後）
/kiro:spec-design user-auth -y

# 4. タスクに分解（設計レビュー後）  
/kiro:spec-tasks user-auth -y

# 5. TDDで実装（タスクレビュー後）
/kiro:spec-impl user-auth 1.1,1.2,1.3
```

**品質ゲート**: 各フェーズは進行前に人間の承認が必要（自動承認するには `-y` を使用）

## 🎯 高度なオプション

```bash
# 言語とOSを選択
npx cc-sdd@latest --lang ja --os mac

# 適用前に変更をプレビュー
npx cc-sdd@latest --dry-run

# バックアップ付きの安全な更新
npx cc-sdd@latest --backup --overwrite force

# カスタム仕様ディレクトリ
npx cc-sdd@latest --kiro-dir docs/specs
```

## 機能

✅ **AI-DLC統合** - 完全なAI駆動開発ライフサイクル  
✅ **プロジェクトメモリ** - あなたのコードベースとパターンを学習するステアリング  
✅ **仕様駆動開発** - 構造化された要件 → 設計 → タスク → 実装  
✅ **クロスプラットフォーム** - macOSとWindowsサポート、自動検出付き  
✅ **多言語対応** - 日本語、英語、繁体字中国語  
✅ **安全な更新** - バックアップオプション付きの対話的プロンプト  

---

## 📚 追加情報

### Kiro IDE互換性

cc-sddで生成される仕様とステアリングはKiro IDEと完全に互換性があります：
- Kiroネイティブ構造: `<kiro-dir>/specs/`, `<kiro-dir>/steering/`（デフォルト `.kiro/`; `--kiro-dir` で変更可能）
- Kiro IDEで開く/編集し、Claude Codeスラッシュコマンドで同じファイルを使用

### コマンドオプション

| オプション | 機能 | デフォルト |
|--------|-------------|---------|
| `--os <auto\|mac\|windows>` | オペレーティングシステムを選択（指定しない場合は自動検出） | `auto` |
| `--lang <ja\|en\|zh-TW>` | 生成されるドキュメント（CLAUDE.md）の言語。コマンドは英語。 | `en` |
| `--dry-run` | 実際に実行することなく、作成/変更されるファイルをプレビュー | - |
| `--backup[=<dir>]` | 既存ファイルを上書きする前にコピーを保存 | - |
| `--overwrite <prompt\|skip\|force>` | ファイルが既に存在する場合の対処法:<br>• `prompt`: 各ファイルごとに確認（デフォルト）<br>• `skip`: 上書きしない<br>• `force`: 常に上書き | `prompt` |
| `--yes, -y` | すべてのプロンプトをスキップ（`prompt` を `force` のように動作させる） | - |
| `--agent <claude-code>` | セットアップするコーディングエージェント（現在はClaude Codeのみ） | `claude-code` |
| `--kiro-dir <path>` | 仕様ディレクトリを作成する場所（プロジェクトルートからの相対パス） | `.kiro` |

### その他の使用例

```bash
# macOS用日本語ドキュメント
npx cc-sdd@latest --lang ja --os mac

# バックアップ付きの安全な更新
npx cc-sdd@latest --backup

# 上書きをスキップ（既存ファイルを保持）
npx cc-sdd@latest --overwrite skip
```

## 出力構造

cc-sddを実行後、あなたのプロジェクトには以下が含まれます：

```
project/
├── .claude/
│   └── commands/
│       └── kiro/
│           ├── spec-init.md
│           ├── spec-requirements.md  
│           ├── spec-design.md
│           ├── spec-tasks.md
│           ├── spec-impl.md
│           ├── spec-status.md
│           ├── steering.md
│           └── steering-custom.md
├── .kiro/                    # コマンドによって作成（--kiro-dirで設定可能）
│   ├── specs/               # 仕様書  
│   └── steering/            # AI指導ルール
├── CLAUDE.md                # プロジェクトドキュメント
```

## ワークフロー概要

生成されるコマンドは3フェーズの開発ワークフローをサポートします：

### フェーズ0: ステアリング（オプション）
- `/kiro:steering` - AI指導ルールの作成/更新
- `/kiro:steering-custom` - 特殊なシナリオ用のカスタムコンテキスト

### フェーズ1: 仕様策定 
1. `/kiro:spec-init [説明]` - 機能仕様の初期化
2. `/kiro:spec-requirements [機能]` - 要件の生成 
3. `/kiro:spec-design [機能]` - 設計の作成（要件レビューが必要）
4. `/kiro:spec-tasks [機能]` - タスクへの分解（設計レビューが必要）

### フェーズ2: 実装と追跡
- `/kiro:spec-impl [機能] <task_ids>` - タスク承認後にTDDでタスクを実行
- `/kiro:spec-status [機能]` - 現在の進捗と次のステップを確認

## プラットフォームサポート

| プラットフォーム | 自動検出 | 手動オーバーライド |
|----------|---------------|-----------------|
| macOS | ✅ `darwin` | `--os mac` |
| Windows | ✅ `win32` | `--os windows` |

## 言語サポート

- **日本語（`ja`）** - 日本語ドキュメント
- **英語（`en`）** - English documentation  
- **繁体字中国語（`zh-TW`）** - 繁體中文文件

## 安全機能

- **対話的プロンプト** - 既存ファイルを上書きする前に確認
- **バックアップ作成** - `--backup` で元のファイルを保存
- **ドライランモード** - `--dry-run` ですべての変更をプレビュー
- **スキップモード** - `--overwrite skip` で上書きを回避

### ファイル上書き動作

ファイルが既に存在する場合、cc-sddは3つのモードを提供します：

#### プロンプトモード（デフォルト）
競合する各ファイルに対する対話的プロンプト：
```
Overwrite existing/file.md? [y]es/[n]o/[a]ll/[s]kip all: 
```
- `y` - このファイルのみ上書き
- `n` - このファイルのみスキップ  
- `a` - 残りすべてのファイルを上書き
- `s` - 残りすべてのファイルをスキップ

#### スキップモード
既存ファイルを決して上書きしません：
```bash
npx cc-sdd --overwrite skip
```

#### 強制モード
プロンプトなしで常に上書きします：
```bash
npx cc-sdd --overwrite force
```

#### CI/CD使用

非対話環境では、プロンプトモードは警告付きで自動的にスキップモードにフォールバックします。CI/CDで上書きを有効にするには `--yes` または `--overwrite force` を使用してください：

```bash
# 安全なCI/CD更新（バックアップ付きで上書き）
npx cc-sdd --yes --backup

# CI検証用のプレビューのみモード
npx cc-sdd --dry-run
```

## トラブルシューティング

### よくある問題

**macOSでのPermission denied:**
```bash
chmod +x ~/.npm/_npx/*/node_modules/.bin/cc-sdd
```

**既存ファイルの競合:**
```bash
npx cc-sdd --backup --overwrite force  # 安全な上書き
```

### ベータリリースの既知の問題

- Windowsテンプレートのエスケープが最近修正されました - 残りの問題があれば報告してください
- クロスプラットフォームテストは限定的 - フィードバック歓迎
- テンプレートのカスタマイズはまだサポートされていません

### 問題の報告

バグや問題は以下で報告してください: https://github.com/gotalab/claude-code-spec/issues

## 貢献

このツールはClaude Code Specプロジェクトの一部です。貢献ガイドラインについてはメインリポジトリを参照してください。

## ライセンス

MIT License
