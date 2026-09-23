const { Pool } = require('pg');

const cleanPassword = (pw) => {
  if (!pw) return pw;
  if ((pw.startsWith('"') && pw.endsWith('"')) || (pw.startsWith("'") && pw.endsWith("'"))) {
    return pw.slice(1, -1);
  }
  return pw;
};

const validateDatabaseConfig = (cfg) => {
  const host = cfg.host || "";
  const user = cfg.user || "";

  if (host.startsWith("postgres.") && !host.includes("supabase")) {
    throw new Error(
      "Invalid DATABASE_SERVER: it looks like a Supabase username (postgres.xxxx). " +
        "Use the Session pooler host from Supabase (e.g. aws-0-xx.pooler.supabase.com) " +
        "as DATABASE_SERVER, and put postgres.your-project-ref in DATABASE_USER_NAME."
    );
  }

  if (user.includes("pooler.supabase.com") || user.includes(".supabase.co")) {
    throw new Error(
      "Invalid DATABASE_USER_NAME: it looks like a hostname. " +
        "DATABASE_SERVER must be the pooler host; DATABASE_USER_NAME must be postgres.your-project-ref."
    );
  }

  if (
    process.env.DATABASE_SSL !== "true" &&
    host.includes("supabase") &&
    !host.includes("pooler.supabase.com") &&
    host.startsWith("db.")
  ) {
    console.warn(
      "Warning: Using Supabase direct host (db.*.supabase.co) on serverless often fails. " +
        "Prefer Session pooler: aws-0-xx.pooler.supabase.com on port 5432."
    );
  }
};

const useSsl =
  process.env.DATABASE_SSL === "true" ||
  (process.env.DATABASE_SERVER || "").includes("supabase");

const dbConfig = {
  host: process.env.DATABASE_SERVER || "localhost",
  port: parseInt(process.env.DATABASE_PORT || "5432", 10),
  user: process.env.DATABASE_USER_NAME || "postgres",
  password: cleanPassword(process.env.DATABASE_PASS || "postgres"),
  database: process.env.DATABASE_NAME || "HardWare",
  ...(useSsl && { ssl: { rejectUnauthorized: false } }),
};

validateDatabaseConfig(dbConfig);

const pool = new Pool(dbConfig);
console.log("PostgreSQL Pool Configured with:", { ...dbConfig, password: dbConfig.password ? '****' : null });

const poolPromise = pool.connect()
  .then(client => {
    console.log("Connected to PostgreSQL successfully!");
    client.release();
    return pool;
  })
  .catch(err => {
    console.error("Database connection failed: ", err);
    throw err;
  });

module.exports = poolPromise;