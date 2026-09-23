const CustomAPIError = require('../errors/custom-error')

const formatDatabaseError = (err) => {
  const message = err?.message || String(err)
  if (message.includes("tenant/user") && message.includes("not found")) {
    return (
      "Database connection misconfigured for Supabase. In Vercel, set DATABASE_SERVER to " +
      "the Session pooler host (aws-0-xx.pooler.supabase.com), DATABASE_USER_NAME to " +
      "postgres.your-project-ref, DATABASE_NAME to postgres, DATABASE_PORT to 5432, " +
      "DATABASE_SSL to true, and DATABASE_PASS to your database password. " +
      "Also confirm the Supabase project is not paused."
    )
  }
  if (message.includes("Invalid DATABASE_")) {
    return message
  }
  return null
}

const errorHandlerMiddleware = (err, req, res, next) => {
  if (err instanceof CustomAPIError) {
    return res.status(err.statusCode).json({ msg: err.message })
  }
  const dbHint = formatDatabaseError(err)
  if (dbHint) {
    console.error("Database error:", err.message)
    return res.status(500).json({ msg: dbHint })
  }
  return res.status(500).json({ msg: err.message })
}

module.exports = errorHandlerMiddleware
