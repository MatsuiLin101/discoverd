# secrets/

本機專用的機密／憑證檔案存放區。**此資料夾內除了本 README 以外的所有檔案都不會被 git 追蹤**（見根目錄 `.gitignore` 的 `/secrets/*` 規則）。

## 用途

放置不應進入版控的檔案，例如：

- Google Cloud 服務帳戶 JSON 金鑰（GA4 Data API 用）
- 其他 API 金鑰、憑證、`.pem`／`.json` 等機密檔

## ⚠️ 注意

- **絕對不要**把真正的機密檔案 commit 進 git；請確認它們落在本資料夾內（README 以外）。
- 本專案的程式**不會讀取這裡的檔案**——憑證是透過**環境變數**（`web/.env.local`／部署平台的環境變數）讀取。例如 GA4 服務帳戶是把 JSON 內的 `client_email`、`private_key` 填入 `GA_SA_CLIENT_EMAIL`、`GA_SA_PRIVATE_KEY`。
- 因此這裡主要是**安全保存原始金鑰檔案**用（備份／方便日後取值）。若不需要保存，也可直接刪除檔案，金鑰之後可在 Google Cloud 重新產生。
- 正式環境請將機密設定於部署平台的環境變數／Secret，不要把檔案上傳到伺服器的版控目錄。
