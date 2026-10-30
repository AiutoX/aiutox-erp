#!/bin/bash
# Script para ejecutar todos los tests relacionados con /config/theme
# Ejecuta: unit, integration y e2e tests con configuración específica

set -e

echo "🧪 Ejecutando tests para /config/theme"
echo "========================================"

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para mostrar resultados
show_result() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ $1${NC}"
  else
    echo -e "${RED}❌ $1${NC}"
    exit 1
  fi
}

# 1. Tests Unitarios
echo ""
echo "📦 Ejecutando tests unitarios..."
npm run test:run -- app/hooks/__tests__/useThemeConfig.test.ts app/routes/__tests__/config.theme.test.tsx
show_result "Tests unitarios completados"

# 2. Tests de Integración
echo ""
echo "🔗 Ejecutando tests de integración..."
npm run test:run -- app/__tests__/integration/config/theme-api.test.ts
show_result "Tests de integración completados"

# 3. Tests E2E con Playwright
echo ""
echo "🎭 Ejecutando tests E2E con Playwright..."
echo "   Configuración: workers=4, headless=false, maxFailures=1"
npx playwright test app/__tests__/e2e/config/theme-config-e2e.spec.ts \
  --workers=4 \
  --headed \
  --max-failures=1
show_result "Tests E2E completados"

echo ""
echo -e "${GREEN}✨ Todos los tests pasaron exitosamente!${NC}"











