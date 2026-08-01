# Script PowerShell para ejecutar todos los tests relacionados con /config/theme
# Ejecuta: unit, integration y e2e tests con configuración específica

Write-Host "🧪 Ejecutando tests para /config/theme" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$ErrorActionPreference = "Stop"

# 1. Tests Unitarios
Write-Host ""
Write-Host "📦 Ejecutando tests unitarios..." -ForegroundColor Yellow
npm run test:run -- app/hooks/__tests__/useThemeConfig.test.ts app/routes/__tests__/config.theme.test.tsx
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Tests unitarios fallaron" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Tests unitarios completados" -ForegroundColor Green

# 2. Tests de Integración
Write-Host ""
Write-Host "🔗 Ejecutando tests de integración..." -ForegroundColor Yellow
npm run test:run -- app/__tests__/integration/config/theme-api.test.ts
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Tests de integración fallaron" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Tests de integración completados" -ForegroundColor Green

# 3. Tests E2E con Playwright
Write-Host ""
Write-Host "🎭 Ejecutando tests E2E con Playwright..." -ForegroundColor Yellow
Write-Host "   Configuración: project=chromium, workers=4, headed, maxFailures=1, reporter=line" -ForegroundColor Gray
npx playwright test app/__tests__/e2e/config/theme-config-e2e.spec.ts `
  --project=chromium `
  --workers=4 `
  --headed `
  --max-failures=1 `
  --reporter=line
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Tests E2E fallaron" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Tests E2E completados" -ForegroundColor Green

Write-Host ""
Write-Host "✨ Todos los tests pasaron exitosamente!" -ForegroundColor Green

