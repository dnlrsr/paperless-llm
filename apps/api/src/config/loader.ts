/**
 * Configuration loader — SRP: single responsibility to load & validate config.
 * DIP: consumers depend on the AppConfig interface, not on process.env directly.
 */
import { AppConfigSchema, type AppConfig } from '@paperless-llm/shared';
import 'dotenv/config';

let _config: AppConfig | null = null;

export function loadConfig(): AppConfig {
    if (_config) return _config;

    const result = AppConfigSchema.safeParse(process.env);
    if (!result.success) {
        const formatted = result.error.issues
            .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
            .join('\n');
        throw new Error(`Configuration validation failed:\n${formatted}`);
    }
    _config = result.data;
    return _config;
}

export function getConfig(): AppConfig {
    if (!_config) throw new Error('Config not loaded — call loadConfig() first');
    return _config;
}
