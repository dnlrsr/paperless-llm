import '@fastify/jwt';

declare module '@fastify/jwt' {
    interface FastifyJWT {
        payload: {
            sub: string;
            username: string;
            email: string;
            isStaff: boolean;
            isSuperuser: boolean;
        };
        user: {
            sub: string;
            username: string;
            email: string;
            isStaff: boolean;
            isSuperuser: boolean;
        };
    }
}

declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => Promise<void>;
    }
}
