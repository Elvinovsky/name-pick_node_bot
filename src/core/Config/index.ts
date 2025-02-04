import { PoolConfig } from 'pg';
import 'process';
type PgSqlConfig = PoolConfig;

export interface Config {
  stage?: string;

  datasource?: {
    db?: PgSqlConfig;
  };

  services?: {
    telegram?: {
      authKey: string;
      chat_id: number;
    };

    seedpeekAI?: {
      authKey: string;
    };
  };
}

export const defaultConfig: Config = {
  stage: process.env.STAGE || 'dev',

  datasource: {
    db: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: Number.parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'db',
      user: process.env.POSTGRES_USER || 'user',
      password: process.env.POSTGRES_PASSWORD || 'pass',
      max: Number.parseInt(process.env.POSTGRES_DB_MAX_CONN || '100'),
    },
  },

  services: {
    telegram: {
      authKey: process.env.SERVICE_TELEGRAM_API_KEY || '7871110241:AAHJ2G5iPwFVC-Ly0EZ347dIJSTIUv1r8MY',
      chat_id: 0,
    },
    seedpeekAI: {
      authKey: process.env.SERVICE_SEEDPEEK_API_KEY || '',
    },
  },
};
