$ErrorActionPreference = "Stop"

Write-Host "Starting Trace local services..."

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd services/ingestion-api; uvicorn main:app --reload --port 8010"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd services/scoring-service; uvicorn main:app --reload --port 8020"

Write-Host "Ingestion API: http://localhost:8010"
Write-Host "Scoring API:   http://localhost:8020"
Write-Host "Open dashboard: apps/dashboard-web/index.html"
