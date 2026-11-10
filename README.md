# RoHaC — Relationship of Head and Council

「自分の住む自治体の首長と議会構成の関係の変化を調べてみよう。」を調査するための、日本語の選挙データ閲覧サイトです。

## 開発・ビルド

Node.js 24 / npm 11 で確認。外部API・データベース・認証情報は不要です。Excelから生成したデータと日本語フォントは同梱しているため、実行中の外部サービスへの接続は不要です。

```sh
cd /workspace/RoHaC
npm ci
npm run dev
```

```sh
npm run build
npm run preview
```

`dist/` を静的ホスティングに配置できます。GitHub Pages の `/RoHaC/` 配下への配置を想定しています（`vite.config.js` の `base`）。選択した自治体は `?city=14100` のようにURLに保存します。自治体ごとのJSONを必要なときに読み込む構成です。

## 機能

- 都道府県・自治体名・コードで検索（旧自治体を含む）
- 政党別当選者数の積み上げグラフと、選挙日以前の直近の首長選挙
- 期間の絞り込み、首長・議会選挙の時系列一覧
- 選択した期間の両選挙のCSV出力、自治体の共有URL
- 出典行、原資料Excelのダウンロード、欠損・不整合の表示
- スマートフォンのレイアウトとキーボードでのグラフ選択

## 出典と統合

出典：地方自治総合研究所「自治体選挙データ」
https://jichisoken.jp/gikai_sennkyodata/

アップロードされた以下の原資料を `public/data/mayors.xlsx` と `public/data/councils.xlsx` に保持しています。

- `2017izen_kubicyou_senkyodata_20250128.xlsx`
- `gikaigiinnsennkyo_20250124.xlsx`

3,696自治体コード、首長選挙45,835件（候補者名あり82,953件）、議会選挙45,532件。議会表の自治体コードなしの1行は実質空行で、除外しています。

市町村コードを結合キーに用い、首長表の候補者継続行は直前の選挙情報を引き継ぎます。合併前後や同名・別コードは独自に統合しません。原表にある非標準の6桁コード（津別町 `014544`）も別に保持します。首長の所属欄から推薦・支持・対立を推定しません。

欠損値は `null` として保持し、画面では「—」と表示。日付不詳は原表記と読み取れる年を保持し、年も不明なら一覧のみ。首長の対応表示は双方の完全な日付がある場合のみ行います。在職期間を推定するものではありません。議会グラフは補選・増員・在任特例を除外します。党派別合計が総数を下回る部分は未分類、上回る記録には不一致を明示します。原表の数値自体は補正しません。

議会の政党別当選者数は会派や現在の議員数ではありません。収録中の最後の当選首長も現在の首長ではありません。サイト内の「データの読み方」にも説明しています。

## データの再生成・検証

Python 3 / openpyxl 3.1.5（開発サイトの実行には不要）。

```sh
python -m venv /workspace/rohac-venv
/workspace/rohac-venv/bin/pip install -r requirements.txt
/workspace/rohac-venv/bin/python scripts/import_data.py public/data/mayors.xlsx public/data/councils.xlsx
/workspace/rohac-venv/bin/python scripts/verify_data.py
```

`verify_data.py` は生成された全選挙の出典行、当選フラグ、候補者名、全党派の当選者数を原Excelと照合します。

ブラウザーの操作検証（先に開発サーバーを起動）：

```sh
npm test
# ビルド後のプレビューサーバーを検証する場合
BASE_URL=http://localhost:4173/RoHaC/ npm test
```

テストは `/usr/bin/chromium` を使用。検索・期間絞り込み・グラフ選択・CSVダウンロード・一覧・出典・検索結果なし・モバイル幅とナビゲーション、ブラウザー例外を確認します。スクリーンショットとCSVのテスト出力は `/workspace/artifacts/` に保存します。

既存のクラウドタスクは隔離された環境です。このチェックアウトを使用し、明示的な依頼がなければ新しいGit worktreeは作成しません。プロセスは次のタスクに引き継がれないため、開発時は `npm run dev` を起動してください。

## GitHub Pagesへの公開

`main` へのpushで `.github/workflows/deploy.yml` がビルドしてPagesへデプロイします。初回はGitHubのリポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定してください。

予定URL: https://marumiii0612.github.io/RoHaC/

実際の公開成否はGitHub Actionsの「Deploy RoHaC to GitHub Pages」の実行結果と、上記URLの応答で確認してください。
