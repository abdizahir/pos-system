# Deploying a shop on Railway

Every mini-market gets **its own copy**: its own database, server and
website. Shops never share data. Repeat these steps once per shop.

Each shop needs 3 Railway services, all in one Railway **project** named
after the shop (e.g. `abdi-mini-market`):

| Service | What it is | Root directory |
| --- | --- | --- |
| **Postgres** | The shop's database | — |
| **server** | The API (Node + Express) | `server` |
| **client** | The website staff use | `client` |

---

## 1. Create the project and database

1. Railway → **New Project** → **Deploy PostgreSQL**.
2. Rename the project to the shop's name.
3. Open the Postgres service → check whether **Backups** are available
   on your plan and turn on daily backups (see step 6 if not).

## 2. Add the server

1. In the project: **New** → **GitHub Repo** → `pos-system`.
2. **Settings**
   - Root Directory: `server`
   - Build Command: `npm run build`
   - Start Command: `npm start`
     (applies database migrations, seeds the chart of accounts, then starts)
   - Healthcheck Path: `/api/health`
3. **Variables** (see `server/.env.example`):

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
   | `JWT_SECRET` | A long random string — **different for every shop** (e.g. `openssl rand -hex 32`) |
   | `CORS_ORIGIN` | The client's address from step 3, e.g. `https://abdi-mini-market.up.railway.app` |
   | `SHOP_NAME` | The shop's name, e.g. `Abdi Mini Market` |
   | `SHOP_ADDRESS` | Optional, shown on invoices and PDFs |
   | `SHOP_PHONE` | Optional |
   | `SHOP_TIN` | Optional |

4. **Networking** → **Generate Domain**. Note the address
   (e.g. `https://abdi-mini-market-server.up.railway.app`).
5. Check it works: open `<server address>/api/health` → `{"status":"ok"}`.

## 3. Add the client (website)

1. **New** → **GitHub Repo** → `pos-system` again.
2. **Settings**
   - Root Directory: `client`
   - Build Command: `npm run build`
   - Start Command: `npm start`
3. **Variables** (see `client/.env.example`):

   | Variable | Value |
   | --- | --- |
   | `VITE_API_URL` | The server address from step 2.4 (no `/api`, no trailing `/`) |

   `VITE_API_URL` is used at **build** time — redeploy the client after
   changing it.
4. **Networking** → **Generate Domain**. This is the address the shop
   uses. Put it in the server's `CORS_ORIGIN` (step 2.3) and redeploy
   the server.

## 4. Create the shop's manager login

Railway → server service → **⋯** → **Shell** (or run locally with the
shop's `DATABASE_URL`):

```bash
# The shop owner (one manager per shop)
npm run users -- create owner@example.com "StrongPassword1" MANAGER

# Cashiers
npm run users -- create cashier1@example.com "StrongPassword2" CASHIER

# Other commands
npm run users -- list
npm run users -- password <email> <new-password>
npm run users -- deactivate <email>
npm run users -- activate <email>
```

## 5. Check the shop

- Open the client address → the login page shows the shop's name.
- Log in as the manager, add a product, a purchase and a sale.
- Print an invoice and download a PDF report — both show the shop's name.

## 6. Backups

A shop's database is its sales history — losing it cannot be undone.

- If Railway backups are available on your plan, keep them on.
- Otherwise take a copy regularly from your computer
  (needs PostgreSQL client tools installed):

  ```bash
  pg_dump "<the shop's public DATABASE_URL>" -F c -f abdi-mini-market-2026-10-12.dump
  ```

  Keep copies somewhere other than Railway.

## Updating all shops

Push to the `main` branch on GitHub. Railway redeploys every shop's
server and client automatically; each server applies new database
migrations on start.

Test changes on one shop first. Consider pointing real shops at a
`release` branch and merging into it only when a change is tested.
