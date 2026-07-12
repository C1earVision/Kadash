const { Pool } = require('pg');

const cleanPassword = (pw) => {
  if (!pw) return pw;
  if ((pw.startsWith('"') && pw.endsWith('"')) || (pw.startsWith("'") && pw.endsWith("'"))) {
    return pw.slice(1, -1);
  }
  return pw;
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