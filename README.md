
# CMS MA SCC — Pure PowerShell (Rolling 24m, 48 States, Parent Org)

This repository builds a **rolling 24 months** dataset of **Monthly Medicare Advantage (MA) Enrollment by State/County/Contract (SCC)**, always downloading the **Full version** for each month and enriching rows with **Parent Organization** from the **MA Plan Directory**. It filters to the **48 contiguous U.S. states** (excludes AK, HI, DC, and territories) and writes tidy CSVs to `data/processed/`.

- SCC monthly listing (source discovery): CMS **Monthly MA Enrollment by State/County/Contract**. citeturn4search36  
- Parent Organization: CMS **MA Plan Directory** monthly ZIP. citeturn4search33  
- Update cadence: CMS states monthly updates are generally **published by the 15th**; this repo schedules a run on the **16th**. citeturn2search1

## Outputs

- `data/processed/ma_scc_latest.csv` – Tidy SCC rows across the rolling window with `parent_org` attached  
- `data/processed/ma_scc_kpis_county.csv` – One row per `state, county` with:
  - `latest_period`, `latest_enrollment`
  - `mom_change` (MoM delta and %)
  - `yoy_change` (YoY delta and %)
  - `top_parent_orgs` (Top 5 in latest month as `Parent (Enrollment); …`)

## Local usage (Windows PowerShell / PowerShell Core)

```powershell
# From repo root
.\Invoke-CmsMaSccRefresh.ps1 -RollingMonths 24

# Outputs:
#   data\processed\ma_scc_latest.csv
#   data\processed\ma_scc_kpis_county.csv
```

> The script caches downloads in `data/raw/` and reuses them to minimize bandwidth.

## GitHub Actions (scheduled automation)

This repo includes `.github/workflows/refresh.yml` which runs monthly on the **16th at 13:15 UTC**, then commits updated outputs to the repo.

If you fork or create a new private repo:
1. Push these files.
2. Ensure Actions are enabled for the repo.
3. (Optional) Change the cron schedule in the workflow if you prefer a different time.

## Data caveats

- **Full vs Abridged**: The SCC page publishes both; the **Full** file is used to avoid suppression of small cells. citeturn4search36  
- **Plan Directory format**: The ZIP structure and column names can vary slightly. The script uses fuzzy matching to locate `contract_id`, `parent_org`, and a fallback `org_name`. citeturn4search33  
- **File formats**: If a given month is released only as Excel without CSV/ZIP, the script will skip that month (keeps the pipeline dependency‑free). You’ll see a warning in logs.

## Columns (ma_scc_latest.csv)

- `report_period` (YYYY‑MM‑01)
- `state`, `state_abbr`
- `county`, `fips`
- `contract_id`
- `org_name` (best available organization name)
- `parent_org` (from MA Plan Directory if available; else falls back to `org_name`)
- `plan_id` (if present in SCC source)
- `enrollment` (numeric; suppressed cells are `null`)

---

*Built for automation and transparency. Questions or tweaks (e.g., additional KPIs, AZ‑first exports)? Open an issue or ping me!*
