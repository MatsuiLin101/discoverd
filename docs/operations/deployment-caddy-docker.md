# 部署方案：Oracle A1 + Docker Compose + Caddy

**狀態：** 建議採用  
**適用主機：** Oracle Cloud Always Free A1（Ubuntu 24.04 / arm64）  
**服務組成：** Caddy、Next.js、PostgreSQL、Cloudflare R2

## 架構

```text
Cloudflare DNS
  -> Oracle A1 VPS
     -> Caddy :80/:443
        -> Next.js app :3000
     -> PostgreSQL :5432（Docker internal only）

Cloudflare R2
  -> files.discoveredtravelgo.tw
```

這個方案不使用 PM2。Next.js、PostgreSQL、Caddy 都由 Docker Compose 管理，容器使用 `restart: unless-stopped` 常駐與自動重啟。

## VPS 前置設定

Oracle Cloud Console 的 VCN / Security List 或 NSG 需放行：

```text
22/tcp
80/tcp
443/tcp
```

主機內 UFW：

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

安裝 Docker：

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

登出再登入 SSH，確認：

```bash
docker version
docker compose version
```

## 初次部署

在 VPS 上：

```bash
git clone <repo-url> discovered
cd discovered/web
cp .env.production.example .env.production
```

編輯 `.env.production`，至少填好：

```text
APP_DOMAIN
CADDY_ACME_EMAIL
POSTGRES_PASSWORD
DATABASE_URL
DIRECT_URL
NEXT_PUBLIC_APP_URL
JWT_SECRET
STORAGE_PUBLIC_BASE_URL
NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET
R2_ENDPOINT
GMAIL_USER
GMAIL_APP_PASSWORD
```

`DATABASE_URL` 與 `DIRECT_URL` 在此 compose 方案中應使用 Docker service host `db`：

```text
postgresql://discovered:<password>@db:5432/discovered
```

部署：

```bash
chmod +x scripts/deploy-prod.sh
./scripts/deploy-prod.sh
```

首次建立管理員：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm migrate npm run db:seed
```

## 日常更新

```bash
cd discovered
git pull
cd web
./scripts/deploy-prod.sh
```

## 常用操作

查看服務：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

查看 app log：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f app
```

查看 Caddy log：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f caddy
```

執行 migration：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm migrate
```

停止服務：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml down
```

不要加 `-v`，除非你明確要刪掉 PostgreSQL 與 Caddy 憑證 volume。

## Caddy 注意事項

Caddy 會自動向 Let's Encrypt 申請與續期憑證。請確認：

- `APP_DOMAIN` 的 DNS A record 已指向 VPS 公網 IP。
- Oracle VCN 和 UFW 都已放行 `80/tcp`、`443/tcp`。
- Cloudflare 若開橘雲代理，SSL/TLS 模式使用 `Full` 或 `Full (strict)`。

## 備份

同機 PostgreSQL 的主要風險是主機或磁碟故障時 App 與 DB 同時受影響。至少設定定期 `pg_dump`，並把備份上傳到 R2 或另一個獨立位置。

手動備份範例：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec db \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > discovered-$(date +%F).sql
```
