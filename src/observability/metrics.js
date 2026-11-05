const startedAt = Date.now();
const requests = new Map();
const durations = new Map();
let inFlight = 0;
const buckets = [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5];

function labels(method, route, status) {
    return { method, route, status };
}
function keyOf(label) {
    return [label.method, label.route, label.status].join('|');
}
function escapeLabel(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}
function labelText(label) {
    return `method="${escapeLabel(label.method)}",route="${escapeLabel(label.route)}",status_code="${escapeLabel(label.status)}"`;
}

function metricsMiddleware(req, res, next) {
    inFlight++;
    const start = process.hrtime.bigint();

    res.once('finish', () => {
        inFlight = Math.max(0, inFlight - 1);
        const route = req.route && req.route.path
            ? String(req.baseUrl || '') + String(req.route.path)
            : 'unmatched';
        const label = labels(req.method, route, res.statusCode);
        const key = keyOf(label);
        requests.set(key, { label, value: (requests.get(key)?.value || 0) + 1 });

        const seconds = Number(process.hrtime.bigint() - start) / 1e9;
        if (!durations.has(key)) {
            durations.set(key, { label, count: 0, sum: 0, buckets: buckets.map(le => ({ le, count: 0 })) });
        }
        const metric = durations.get(key);
        metric.count++;
        metric.sum += seconds;
        for (const bucket of metric.buckets) {
            if (seconds <= bucket.le) bucket.count++;
        }
    });

    next();
}

function renderMetrics() {
    const lines = [
        '# HELP supermercado_http_requests_total Total de requisições HTTP concluídas.',
        '# TYPE supermercado_http_requests_total counter'
    ];
    for (const metric of requests.values()) {
        lines.push(`supermercado_http_requests_total{${labelText(metric.label)}} ${metric.value}`);
    }

    lines.push('# HELP supermercado_http_request_duration_seconds Duração das requisições HTTP em segundos.');
    lines.push('# TYPE supermercado_http_request_duration_seconds histogram');
    for (const metric of durations.values()) {
        for (const bucket of metric.buckets) {
            lines.push(`supermercado_http_request_duration_seconds_bucket{${labelText(metric.label)},le="${bucket.le}"} ${bucket.count}`);
        }
        lines.push(`supermercado_http_request_duration_seconds_bucket{${labelText(metric.label)},le="+Inf"} ${metric.count}`);
        lines.push(`supermercado_http_request_duration_seconds_sum{${labelText(metric.label)}} ${metric.sum}`);
        lines.push(`supermercado_http_request_duration_seconds_count{${labelText(metric.label)}} ${metric.count}`);
    }

    lines.push('# HELP supermercado_http_requests_in_flight Requisições HTTP em andamento.');
    lines.push('# TYPE supermercado_http_requests_in_flight gauge');
    lines.push(`supermercado_http_requests_in_flight ${inFlight}`);
    lines.push('# HELP supermercado_process_uptime_seconds Tempo de atividade do processo em segundos.');
    lines.push('# TYPE supermercado_process_uptime_seconds gauge');
    lines.push(`supermercado_process_uptime_seconds ${(Date.now() - startedAt) / 1000}`);
    return lines.join('\n') + '\n';
}

module.exports = { metricsMiddleware, renderMetrics };
