/**
 * Auth routes — delegates identity verification to Paperless-ngx.
 * No local password storage: paperless-llm trusts Paperless-ngx as the IdP.
 */
import type { AppConfig } from '@paperless-llm/shared';
import axios from 'axios';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

interface AuthDeps {
    config: AppConfig;
}

const LoginBodySchema = z.object({
    username: z.string().min(1),
    password: z.string().min(1),
});

interface PaperlessUser {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    is_staff: boolean;
    is_superuser: boolean;
}

export const authRoutes: FastifyPluginAsync<AuthDeps> = async (fastify, opts) => {
    const { config } = opts;

    // POST /auth/login
    fastify.post('/auth/login', async (req, reply) => {
        const parsed = LoginBodySchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: 'username and password are required' });
        }

        const { username, password } = parsed.data;

        // 1. Exchange credentials for a Paperless-ngx token
        let paperlessToken: string;
        try {
            const tokenRes = await axios.post<{ token: string }>(
                `${config.PAPERLESS_BASE_URL}/api/token/`,
                { username, password },
                { headers: { 'Content-Type': 'application/json' }, timeout: 10_000 },
            );
            paperlessToken = tokenRes.data.token;
        } catch {
            return reply.status(401).send({ error: 'Invalid credentials' });
        }

        // 2. Try to fetch user details — fall back gracefully if the endpoint is unavailable
        let user: Partial<PaperlessUser> = { username };
        try {
            const userRes = await axios.get<PaperlessUser>(
                `${config.PAPERLESS_BASE_URL}/api/users/me/`,
                {
                    headers: { Authorization: `Token ${paperlessToken}` },
                    timeout: 5_000,
                },
            );
            user = userRes.data;
        } catch {
            // /api/users/me/ may not exist in all Paperless-ngx versions — username is enough
        }

        // 3. Issue our own JWT (8 h TTL)
        const token = fastify.jwt.sign(
            {
                sub: String(user.id ?? username),
                username: user.username ?? username,
                email: user.email ?? '',
                isStaff: user.is_staff ?? false,
                isSuperuser: user.is_superuser ?? false,
            },
            { expiresIn: '8h' },
        );

        return reply.send({
            token,
            user: { id: user.id ?? 0, username: user.username ?? username, email: user.email ?? '' },
        });
    });

    // GET /auth/me — returns the current user decoded from JWT
    fastify.get('/auth/me', { onRequest: [fastify.authenticate] }, async (req) => {
        return { user: req.user };
    });
};
