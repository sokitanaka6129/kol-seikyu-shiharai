# アップデート手順（kol-seikyu-shiharai）

## 変更内容
1. Supabase同期先を kol-invoice-v2 の専用テーブル app_data に変更（テーブル作成済み・RLS有効）
2. 同期失敗時に「⚠ 同期エラー（ローカル保存のみ）」と赤字表示（従来は失敗しても同期済表示だった）
3. 合言葉認証を追加（/api/db と /api/read-pdf の両方を保護）
4. クラウドが空でローカルにデータがある場合、自動で初回アップロード
5. package.json に "type": "module" 追加（ビルド時の警告解消）

## Vercelでの設定（Settings → Environment Variables）

以下の3つを追加・更新してください（Production にチェック）：

| Key | Value |
|---|---|
| SUPABASE_URL | https://jqrhrfskfywzfqhztezh.supabase.co |
| SUPABASE_SERVICE_KEY | Supabaseダッシュボード（kol-invoice-v2）→ Project Settings → API Keys → service_role の secret キー |
| APP_TOKEN | 好きな合言葉（社内で共有するパスワード。例: kol-2026-xxxx） |

- ANTHROPIC_API_KEY は既存のままでOK
- 古い SUPABASE_ANON_KEY が残っていれば削除してOK（SERVICE_KEYがあれば使われません）

⚠️ service_role キーは絶対にコードやチャットに貼らないでください。Vercelの環境変数にのみ入力します。

## デプロイ方法
このフォルダの中身（index.html, api/, package.json, vercel.json, README.md）を
GitHubリポジトリ main ブランチにそのままアップロード（上書き）→ Vercelが自動デプロイ。

環境変数を追加した後にデプロイした場合はそのままでOK。
先にデプロイしてしまった場合は Deployments → 最新 → Redeploy してください。

## デプロイ後の確認
1. 普段使っているブラウザ（最新データがある方）でアプリを開く
2. 合言葉を聞かれたら APP_TOKEN に設定した値を入力（初回のみ）
3. 右上が「☁ 同期済」（緑）になればクラウド保存成功
4. 別のブラウザ/シークレットウィンドウで開いてデータが表示されれば同期完了
