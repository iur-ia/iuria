import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Create dummy DB structure with all required chained methods for drizzle
const dummyDb = {
  select: () => dummyDb,
  from: () => dummyDb,
  where: () => dummyDb,
  orderBy: () => dummyDb,
  limit: () => dummyDb,
  insert: () => dummyDb,
  values: () => dummyDb,
  returning: () => dummyDb,
  update: () => dummyDb,
  set: () => dummyDb,
  delete: () => dummyDb,
  execute: async () => [],
  then: (resolve: any) => resolve([]),
  query: {
    equipe: { findMany: async () => [] },
    clientes: { findMany: async () => [] },
    processos: { findMany: async () => [] },
    atividades: { findMany: async () => [] },
    deadlineRules: { findMany: async () => [] },
    escritorioConfig: { findFirst: async () => null }
  }
};

let poolObj: any;
let dbObj: any;

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL is missing. Mocking DB...");
  poolObj = {
    connect: async () => ({ release: () => {} }),
    query: async () => ({ rows: [] }),
    end: async () => {}
  };
  dbObj = dummyDb;
} else {
  poolObj = new Pool({ connectionString: process.env.DATABASE_URL });
  dbObj = drizzle({ client: poolObj, schema });
}

export const pool = poolObj;
export const db = dbObj;
