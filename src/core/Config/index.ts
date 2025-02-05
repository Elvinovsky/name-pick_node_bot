import { PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();
export interface Config {
  stage?: string;

  datasource?: {
    db?: PoolConfig;
  };

  services?: {
    telegram?: {
      authKey: string;
      chat_id: number;
    };

    behindthename?: {
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
      authKey: process.env.SERVICE_TELEGRAM_API_KEY || '',
      chat_id: 0,
    },
    behindthename: {
      authKey: process.env.BEHINDTHENAME_API_KEY || ''
    },
  },
};
