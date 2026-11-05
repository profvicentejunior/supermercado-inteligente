const router = require('express').Router();
const { renderMetrics, getTelemetrySnapshot } = require('../observability/metrics');

router.get('/health', (req, res) => res.json({
    status: 'ok',
    application: 'supermercado-inteligente',
    database: 'not_checked',
    timestamp: new Date().toISOString()
}));

router.get('/metrics', (req, res) => {
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(renderMetrics());
});

// Painel didático de telemetria: atualizado automaticamente a cada 5 segundos.
router.get('/telemetry', (req, res) => {
    res.type('html').send(`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Telemetria | Supermercado Inteligente</title>
<style>
*{box-sizing:border-box}body{margin:0;padding:28px;background:#0b1220;color:#e5e7eb;font:15px system-ui, sans-serif}
main{max-width:1100px;margin:auto}h1{margin:0 0 6px;font-size:28px}.muted{color:#94a3b8}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px;margin:24px 0}
.card{background:#131f32;border:1px solid #26364e;border-radius:14px;padding:18px}
.label{font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em}
.value{font-size:30px;font-weight:700;margin-top:8px}
section{background:#131f32;border:1px solid #26364e;border-radius:14px;padding:18px;margin-top:16px}
table{width:100%;border-collapse:collapse;margin-top:12px}th,td{text-align:left;padding:12px;border-bottom:1px solid #26364e}th{color:#94a3b8;font-size:12px;text-transform:uppercase}
.pill{display:inline-block;padding:4px 9px;border-radius:20px;background:#123b32;color:#6ee7b7;font-size:12px}
@media(max-width:600px){body{padding:16px}th,td{padding:9px 5px;font-size:13px}}
</style></head>
<body><main>
<div class="pill">● MONITORAMENTO ATIVO</div>
<h1>Telemetria da aplicação</h1>
<p class="muted">Supermercado Inteligente · atualização automática a cada 5 segundos</p>
<div class="grid">
<div class="card"><div class="label">Requisições HTTP</div><div class="value" id="total">—</div></div>
<div class="card"><div class="label">Erros HTTP (4xx/5xx)</div><div class="value" id="errors">—</div></div>
<div class="card"><div class="label">Taxa de erro</div><div class="value" id="rate">—</div></div>
<div class="card"><div class="label">Latência média</div><div class="value" id="latency">—</div></div>
<div class="card"><div class="label">Latência p95 (faixa)</div><div class="value" id="p95">—</div></div>
<div class="card"><div class="label">Em andamento</div><div class="value" id="flight">—</div></div>
<div class="card"><div class="label">Uptime</div><div class="value" id="uptime">—</div></div>
</div>
<section><h2>Requisições por rota</h2><table><thead><tr><th>Rota</th><th>Requisições</th><th>Erros</th></tr></thead><tbody id="routes"><tr><td colspan="3">Aguardando métricas...</td></tr></tbody></table></section>
<p class="muted" id="updated">Coletando dados...</p>
</main>
<script>
const fmt = n => Number(n).toLocaleString('pt-BR');
async function refresh(){
 try{
  const r=await fetch('/system/telemetry/data',{cache:'no-store'});const d=await r.json();
  document.getElementById('total').textContent=fmt(d.requests_total);
  document.getElementById('errors').textContent=fmt(d.errors_total);
  document.getElementById('rate').textContent=d.error_rate_percent+'%';
  document.getElementById('latency').textContent=d.average_latency_ms+' ms';
  document.getElementById('p95').textContent=d.p95_latency_bucket_seconds===null?'—':d.p95_latency_bucket_seconds+' s';
  document.getElementById('flight').textContent=fmt(d.requests_in_flight);
  const s=d.uptime_seconds;document.getElementById('uptime').textContent=Math.floor(s/3600)+'h '+Math.floor(s%3600/60)+'m '+s%60+'s';
  document.getElementById('routes').innerHTML=d.routes.length?d.routes.map(x=>'<tr><td>'+x.route.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))+'</td><td>'+fmt(x.requests)+'</td><td>'+fmt(x.errors)+'</td></tr>').join(''):'<tr><td colspan="3">Ainda não há requisições concluídas.</td></tr>';
  document.getElementById('updated').textContent='Última atualização: '+new Date(d.captured_at).toLocaleTimeString('pt-BR');
 }catch(e){document.getElementById('updated').textContent='Não foi possível atualizar os dados.'}
}
refresh();setInterval(refresh,5000);
</script></body></html>`);
});

router.get('/telemetry/data', (req, res) => res.json(getTelemetrySnapshot()));

router.get('/metrics', (req, res) => {
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(renderMetrics());
});

module.exports = router;
