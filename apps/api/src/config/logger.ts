import pino from 'pino';
import { getConfig } from './loader.js';

let _logger: pino.Logger | null = null;

export function createLogger(): pino.Logger {
    const config = getConfig();
    _logger = pino({
        level: config.LOG_LEVEL,
        transport:
            process.env['NODE_ENV'] !== 'production'
                ? { target: 'pino-pretty', options: { colorize: true } }
                : undefined,
        base: { service: 'paperless-llm' },
    });
    return _logger;
}

export function getLogger(): pino.Logger {
    if (!_logger) throw new Error('Logger not initialised — call createLogger() first');
    return _logger;
}
