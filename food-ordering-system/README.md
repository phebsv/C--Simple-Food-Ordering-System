# NomNom – Simple Food Ordering System

React + TypeScript (Vite) frontend with a C# ASP.NET Core backend. All application data uses the single MySQL `nomnom` database; `data/db.json` is only a legacy migration backup.

## Running locally

Install the .NET 10 SDK, MySQL Server 8.0.21 or later, PowerShell 7, and Node.js 22.12 or later. Run the commands below from the `food-ordering-system` folder.

### 1. Create or update the database and import existing records

1. In MySQL Workbench, use your local administrative connection to execute `backend/NomNom.Api/data/001-schema.sql`.
2. For an existing installation, execute `backend/NomNom.Api/data/003-soft-delete.sql`. This idempotent migration adds soft-delete and restoration fields without removing existing records.
3. Keep `backend/NomNom.Api/data/db.json` as a migration backup. If you intentionally need to import legacy records, stop the old API so the JSON source stays stable, then generate the import script in PowerShell. The command prints the path to a temporary SQL file containing the local JSON records.

```powershell
pwsh -NoProfile -File ./backend/NomNom.Api/data/New-MySqlImport.ps1
```

4. Open the generated SQL file in a new Workbench tab and execute the entire script. Review Action Output for errors and compare the final counts with your JSON backup. The import runs in a transaction and skips IDs already present. If it reports a duplicate email or missing reference, resolve the source conflict before rerunning it. Keep the generated file local because it contains account and order data. Do not run a legacy import over live data without reviewing the records and taking a backup.

The admin API archives menu items, orders, users, and reviews instead of permanently deleting them. Each has a `GET .../deleted` listing and a `POST .../{id}/restore` endpoint; the matching `DELETE` endpoint archives the record. Customer cart removal/clear also archives transient cart rows; adding the same item again reactivates that customer's prior cart row.

### 2. Create the API's local MySQL account

Run this in a new Workbench SQL tab using the same administrative connection. Copy the generated password from the result grid. If the account already exists, use its existing password.

```sql
CREATE USER IF NOT EXISTS 'nomnom_app'@'localhost'
    IDENTIFIED BY RANDOM PASSWORD REQUIRE SSL;
GRANT SELECT, INSERT, UPDATE, DELETE ON nomnom.* TO 'nomnom_app'@'localhost';
SHOW GRANTS FOR 'nomnom_app'@'localhost';
```

### 3. Configure and run the API

In PowerShell 7, paste the generated password into the masked prompt. The connection string is stored in local .NET user secrets.

```powershell
$dbPassword = Read-Host 'Paste the MySQL password for nomnom_app' -MaskInput
$connection = 'Server=localhost;Port=3306;Database=nomnom;User ID=nomnom_app;Password="{0}";SslMode=Required' -f $dbPassword.Replace('"', '""')
@{ 'ConnectionStrings:NomNom' = $connection } | ConvertTo-Json -Compress | dotnet user-secrets set --project backend/NomNom.Api
Remove-Variable dbPassword, connection
dotnet run --project backend/NomNom.Api --launch-profile http
```

### 4. Run and check React

In a second terminal, run `npm ci` and `npm run dev`. Vite uses port `5173` and React's default API URL is `http://localhost:3001`. Clear any old `VITE_API_URL` override pointing to another port.

1. Open `http://localhost:3001/menu` and check that it returns the imported menu.
2. Open `http://localhost:5173/register` and create an account with a new test email. The Network tab should show HTTP 201 for `POST /auth/register`.
3. Log in with that account. The request to `POST /auth/login` should return HTTP 200 and React should open the dashboard.
4. Restart the API and sign in again to verify that the account persists in MySQL. You can also sign in with an imported account if you know its original password.

## Scripts

| Command            | What it does                         |
| ------------------ | ------------------------------------ |
| `npm run dev`      | Start the frontend dev server        |
| `npm run build`    | Type-check and build for production  |
| `npm run lint`     | Run ESLint                           |
| `npm test`         | Run the unit tests (Vitest)          |
| `dotnet run --project backend/NomNom.Api.IntegrationTests` | Run the MySQL order-total and archive/restore integration checks |

The integration check requires `NOMNOM_TEST_CONNECTION_STRING` to point to a database with the schema and migration applied. It accepts `nomnom_test` by default. To explicitly run against the local `nomnom` database, also set `NOMNOM_TEST_ALLOW_NOMNOM=1`; the check creates uniquely named fixture rows and removes them in a `finally` cleanup.

## Project structure

- `src/pages` – customer pages (`user/`), admin pages (`admin/`), login and register
- `src/components` – shared UI (navbar, inputs, buttons) and admin UI pieces
- `src/context` – `AuthContext` (who is logged in), `CartContext`, `AdminContext` (admin data)
- `src/services/api.ts` – the single HTTP client used by the whole frontend
- `backend/NomNom.Api/` – the ASP.NET Core API, MySQL storage, and migration scripts
- `backend/NomNom.Api/Repositories/` – MySQL data access; menu, user, order, and review deletion is archived and restorable
- `src/types.ts` – shared data types
- `src/utils` – validation, formatting, storage and order helpers
