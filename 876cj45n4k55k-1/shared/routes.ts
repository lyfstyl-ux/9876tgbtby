import { z } from 'zod';
import { insertChallengeSchema, challenges, leaderboard, creatorCoins, creatorCoinSettings, stakes, matches, notifications } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  challenges: {
    list: {
      method: 'GET' as const,
      path: '/api/challenges',
      responses: {
        200: z.array(z.custom<typeof challenges.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/challenges',
      input: insertChallengeSchema.extend({
        settlementToken: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(), // creator coin contract address
      }),
      responses: {
        201: z.custom<typeof challenges.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    escrow: {
      method: 'POST' as const,
      path: '/api/challenges/:id/escrow',
      input: z.object({ txHash: z.string(), escrowId: z.number().optional(), tokenAddress: z.string().optional() }),
      responses: {
        200: z.custom<typeof challenges.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    accept: {
      method: 'POST' as const,
      path: '/api/challenges/:id/accept',
      input: z.object({ txHash: z.string().optional(), escrowId: z.number().optional(), tokenAddress: z.string().optional(), opponentAddress: z.string().optional() }),
      responses: {
        200: z.custom<typeof challenges.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    decline: {
      method: 'POST' as const,
      path: '/api/challenges/:id/decline',
      input: z.object({ reason: z.string().optional() }),
      responses: {
        200: z.custom<typeof challenges.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/challenges/:id',
      responses: {
        200: z.custom<typeof challenges.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  leaderboard: {
    list: {
      method: 'GET' as const,
      path: '/api/leaderboard',
      responses: {
        200: z.array(z.custom<typeof leaderboard.$inferSelect>()),
      },
    },
  },
  coins: {
    list: {
      method: 'GET' as const,
      path: '/api/coins',
      responses: {
        200: z.array(z.custom<typeof creatorCoins.$inferSelect>()),
      },
    },
    add: {
      method: 'POST' as const,
      path: '/admin/coins',
      input: z.object({
        name: z.string().min(1),
        contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
        decimals: z.number().min(0).max(18),
        dexAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
        chainId: z.number().default(8453),
      }),
      responses: {
        201: z.custom<typeof creatorCoins.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    setCreatorSettings: {
      method: 'POST' as const,
      path: '/admin/creators/:handle/coin',
      input: z.object({
        coinId: z.number().int().positive(),
        isEnabled: z.boolean().default(true),
      }),
      responses: {
        200: z.custom<typeof creatorCoinSettings.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    getCreatorSettings: {
      method: 'GET' as const,
      path: '/api/creators/:handle/coin',
      responses: {
        200: z.custom<typeof creatorCoinSettings.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  stakes: {
    accept: {
      method: 'POST' as const,
      path: '/api/challenges/:id/accept/:side',
      input: z.object({
        username: z.string().min(1), // @username accepting the challenge
        side: z.enum(['yes', 'no']), // which side (yes/no)
        amount: z.number().int().positive(), // amount to stake (minor units)
        escrowId: z.number().int().positive().optional(), // EscrowERC20.id from smart contract
        escrowTxHash: z.string().optional(), // tx hash of createEscrowERC20 or matchEscrowERC20
        opponentAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(), // wallet address of opponent
      }),
      responses: {
        201: z.custom<typeof stakes.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/challenges/:id/stakes',
      responses: {
        200: z.array(z.custom<typeof stakes.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/stakes/:id',
      responses: {
        200: z.custom<typeof stakes.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  matches: {
    list: {
      method: 'GET' as const,
      path: '/api/challenges/:id/matches',
      responses: {
        200: z.array(z.custom<typeof matches.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/matches/:id',
      responses: {
        200: z.custom<typeof matches.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  notifications: {
    list: {
      method: 'GET' as const,
      path: '/api/notifications',
      input: z.object({
        username: z.string().min(1),
        unreadOnly: z.boolean().default(false),
      }),
      responses: {
        200: z.array(z.custom<typeof notifications.$inferSelect>()),
      },
    },
    markRead: {
      method: 'POST' as const,
      path: '/api/notifications/:id/read',
      responses: {
        200: z.custom<typeof notifications.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    subscribe: {
      method: 'GET' as const,
      path: '/api/notifications/subscribe/:username',
      responses: {
        200: z.object({
          message: z.string(),
        }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type ChallengeInput = z.infer<typeof api.challenges.create.input>;
export type ChallengeResponse = z.infer<typeof api.challenges.create.responses[201]>;
