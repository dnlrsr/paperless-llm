import type { FastifyInstance } from 'fastify';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Serve i18n locale JSON files to the frontend.
 * GET /api/locales/:lng/:ns  →  packages/shared/src/locales/<lng>.json
 *
 * SRP: this route has one job — serve static locale data.
 */
export async function localesRoutes(app: FastifyInstance): Promise<void> {
    const LOCALES_DIR = join(process.cwd(), 'packages', 'shared', 'src', 'locales');

    app.get<{
        Params: { lng: string; ns: string };
    }>('/locales/:lng/:ns', async (request, reply) => {
        const { lng } = request.params;
        const allowed = ['en', 'de'];

        if (!allowed.includes(lng)) {
            return reply.status(404).send({ error: 'Unknown locale' });
        }

        try {
            const raw = readFileSync(join(LOCALES_DIR, `${lng}.json`), 'utf-8');
            return reply.header('Content-Type', 'application/json').send(raw);
        } catch {
            return reply.status(404).send({ error: 'Locale file not found' });
        }
    });
}
