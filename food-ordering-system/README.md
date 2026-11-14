# NomNom – Simple Food Ordering System

React + TypeScript (Vite) frontend with a C# ASP.NET Core backend. Registration, login, and menu reads use MySQL.

## Running locally

Install the .NET 10 SDK, MySQL Server 8.0.21 or later, PowerShell 7, and Node.js 22.12 or later. Run the commands below from the `food-ordering-system` folder.

### 1. Create the database and import the existing records

1. Stop the old API so the JSON source stays stable. Keep `backend/NomNom.Api/data/db.json` as the migration backup.
2. In MySQL Workbench, open your local administrative connection. Open `backend/NomNom.Api/data/001-schema.sql` and use the lightning bolt that executes the entire script.
3. Generate the import script in PowerShell. It prints the path to a temporary SQL file containing your local JSON records.

```powershell
pwsh -NoProfile -File ./backend/NomNom.Api/data/New-MySqlImport.ps1
```

4. Open the generated SQL file in a new Workbench tab and execute the entire script. Review Action Output for errors and compare the final counts with your JSON backup. The import runs in a transaction and skips IDs already present. If it reports a duplicate email or missing reference, resolve the source conflict before rerunning it. Keep the generated file local because it contains account and order data.

### 2. Create the API's local MySQL account

Run this in a new Workbench SQL tab using the same administrative connection. Copy the generated password from the result grid. If the account already exists, use its existing password.

```sql
CREATE USER IF NOT EXISTS 'nomnom_app'@'localhost'
    IDENTIFIED BY RANDOM PASSWORD REQUIRE SSL;
GRANT SELECT, INSERT ON nomnom.users TO 'nomnom_app'@'localhost';
GRANT SELECT ON nomnom.menu_items TO 'nomnom_app'@'localhost';
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

## Project structure

- `src/pages` – customer pages (`user/`), admin pages (`admin/`), login and register
- `src/components` – shared UI (navbar, inputs, buttons) and admin UI pieces
- `src/context` – `AuthContext` (who is logged in), `CartContext`, `AdminContext` (admin data)
- `src/services/api.ts` – the single HTTP client used by the whole frontend
- `backend/NomNom.Api/` – the ASP.NET Core API, MySQL storage, and migration scripts
- `src/types.ts` – shared data types
- `src/utils` – validation, formatting, storage and order helpers
