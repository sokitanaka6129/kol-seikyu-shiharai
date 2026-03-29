# 請求書管理アプリ - デプロイ手順

## Vercelへのデプロイ（5分で完了）

### ステップ1：Anthropic APIキーを取得
1. https://console.anthropic.com にログイン
2. 「API Keys」→「Create Key」でキーを作成
3. `sk-ant-...` で始まるキーをコピーしておく

### ステップ2：このフォルダをVercelにデプロイ
方法A（一番簡単）：
1. https://vercel.com にGitHubアカウントでログイン
2. 「Add New」→「Project」→「Upload」をクリック
3. このフォルダ（invoice-app）をまるごとドラッグ＆ドロップ
4. 「Deploy」をクリック

方法B（GitHubリポジトリ経由）：
1. GitHubに新しいリポジトリを作成
2. このフォルダの中身をpush
3. Vercelで「Import Git Repository」→ デプロイ

### ステップ3：環境変数を設定
1. Vercelのプロジェクト設定 → 「Environment Variables」
2. 以下を追加：
   - Key: `ANTHROPIC_API_KEY`
   - Value: ステップ1でコピーしたキー（sk-ant-...）
3. 「Save」→「Redeploy」

### 完了！
デプロイ後のURLでアクセスできます。
例: https://kol-invoice.vercel.app

## ファイル構成
```
invoice-app/
├── public/
│   └── index.html     ← メインアプリ
├── api/
│   └── read-pdf.js    ← PDF読取API（Vercel Serverless Function）
├── vercel.json        ← Vercel設定
├── package.json
└── README.md          ← このファイル
```

## 注意事項
- データはブラウザのlocalStorageに保存されます（ブラウザを変えるとデータは別）
- APIキーはVercelの環境変数に保存されるため外部に漏れません
- PDF読取以外の機能（編集、計算、CSV出力）はAPIキー不要で動きます
- 無料プラン（Hobby）で問題なく動作します
