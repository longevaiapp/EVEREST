# ═══════════════════════════════════════════════════════════════
# Script de Deployment al VPS - EVEREST
# ═══════════════════════════════════════════════════════════════

$VPS_IP = "187.77.3.106"
$VPS_USER = "root"
$APP_DIR = "/root/EVEREST"

Write-Host "🚀 Iniciando deployment al VPS..." -ForegroundColor Cyan

# Comandos a ejecutar en el VPS
$deployCommands = @"
cd $APP_DIR && \
echo '📂 Directorio actual:' && pwd && \
echo '' && \
echo '📊 Estado Git antes del pull:' && git status && \
echo '' && \
echo '⬇️  Obteniendo últimos cambios...' && \
git pull origin main && \
echo '' && \
echo '📦 Instalando dependencias del frontend...' && \
pnpm install && \
echo '' && \
echo '🔨 Construyendo frontend...' && \
pnpm build && \
echo '' && \
echo '📦 Instalando dependencias del backend...' && \
cd backend && pnpm install && cd .. && \
echo '' && \
echo '🔄 Reiniciando servicios...' && \
pm2 restart all && \
echo '' && \
echo '✅ Deployment completado!' && \
pm2 status
"@

Write-Host "📡 Conectando a VPS: $VPS_USER@$VPS_IP" -ForegroundColor Yellow
Write-Host ""

# Ejecutar comandos en el VPS
ssh "$VPS_USER@$VPS_IP" $deployCommands

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deployment exitoso!" -ForegroundColor Green
    Write-Host "🌐 La aplicación ha sido actualizada en el VPS" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Error durante el deployment" -ForegroundColor Red
    Write-Host "Código de salida: $LASTEXITCODE" -ForegroundColor Red
}
