const { MeterProvider, PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { resourceFromAttributes } = require('@opentelemetry/resources');
const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

let provider;
let instruments = null;

function initializeOpenTelemetry() {
    const endpoint = process.env.GRAFANA_CLOUD_OTLP_ENDPOINT;
    const auth = process.env.GRAFANA_CLOUD_OTLP_AUTH;

    if (!endpoint || !auth) {
        console.log('[OpenTelemetry] Exportação desativada: configure GRAFANA_CLOUD_OTLP_ENDPOINT e GRAFANA_CLOUD_OTLP_AUTH.');
        return false;
    }

    const base = endpoint.replace(/\/+$/, '');
    const url = base.endsWith('/v1/metrics') ? base : base + '/v1/metrics';
    const exporter = new OTLPMetricExporter({
        url,
        headers: { Authorization: 'Basic ' + auth },
        timeoutMillis: 10000
    });
    const reader = new PeriodicExportingMetricReader({
        exporter,
        exportIntervalMillis: 15000,
        exportTimeoutMillis: 10000
    });

    provider = new MeterProvider({
        resource: resourceFromAttributes({
            'service.name': process.env.OTEL_SERVICE_NAME || 'supermercado-inteligente',
            'deployment.environment': process.env.NODE_ENV || 'development'
        }),
        readers: [reader]
    });

    const meter = provider.getMeter('supermercado-inteligente', '1.0.0');
    instruments = {
        requests: meter.createCounter('supermercado.http.requests', {
            description: 'Total de requisições HTTP concluídas'
        }),
        duration: meter.createHistogram('supermercado.http.request.duration', {
            description: 'Duração das requisições HTTP em segundos',
            unit: 's'
        }),
        inFlight: meter.createUpDownCounter('supermercado.http.requests.in_flight', {
            description: 'Requisições HTTP em andamento'
        }),
        uptime: meter.createObservableGauge('supermercado.process.uptime', {
            description: 'Tempo de atividade do processo em segundos',
            unit: 's'
        })
    };
    instruments.uptime.addCallback(result => result.observe(process.uptime()));
    console.log('[OpenTelemetry] Exportação OTLP/HTTP para Grafana Cloud habilitada.');
    return true;
}

function recordRequest(method, route, statusCode, durationSeconds) {
    if (!instruments) return;
    const attributes = {
        'http.request.method': method,
        'http.route': route,
        'http.response.status_code': statusCode
    };
    instruments.requests.add(1, attributes);
    instruments.duration.record(durationSeconds, attributes);
}

function changeInFlight(delta) {
    if (instruments) instruments.inFlight.add(delta);
}

async function shutdownOpenTelemetry() {
    if (provider) await provider.shutdown();
}

module.exports = { initializeOpenTelemetry, recordRequest, changeInFlight, shutdownOpenTelemetry };
