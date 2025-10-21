import sql from 'mssql';

/**
 * Database connection utility for schedulecoaches API
 *
 * Shares database with pbcoach - same Users table
 * Connection string format: Server=...;Database=...;User Id=...;Password=...;Encrypt=true
 */

// Don't use dotenv in production - Azure provides env vars directly
if (process.env.NODE_ENV !== 'production') {
  try {
    const dotenv = require('dotenv');
    dotenv.config();
  } catch (err) {
    console.log('[Database] dotenv not available in production mode');
  }
}

/**
 * Parse connection string into config object
 */
function parseConnectionString(connectionString: string): sql.config {
  const config: any = {
    options: {
      encrypt: true,
      trustServerCertificate: false,
      enableArithAbort: true
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    },
    connectionTimeout: 45000,
    requestTimeout: 45000
  };

  const parts = connectionString.split(';');
  parts.forEach(part => {
    const [key, value] = part.split('=').map(s => s.trim());
    if (!key || !value) return;

    const lowerKey = key.toLowerCase();
    if (lowerKey === 'server' || lowerKey === 'data source') {
      config.server = value;
    } else if (lowerKey === 'database' || lowerKey === 'initial catalog') {
      config.database = value;
    } else if (lowerKey === 'user id' || lowerKey === 'uid') {
      config.user = value;
    } else if (lowerKey === 'password' || lowerKey === 'pwd') {
      config.password = value;
    } else if (lowerKey === 'encrypt') {
      config.options.encrypt = value.toLowerCase() === 'true';
    }
  });

  return config;
}

// Get connection configuration
const connectionString = process.env.SQL_CONNECTION_STRING || '';

if (!connectionString) {
  console.error('[Database] SQL_CONNECTION_STRING environment variable not set');
}

const config: sql.config = connectionString
  ? parseConnectionString(connectionString)
  : {
      server: '',
      database: '',
      user: '',
      password: '',
      options: {
        encrypt: true,
        trustServerCertificate: false,
        enableArithAbort: true
      }
    };

// Log configuration status (without sensitive data)
console.log('[Database] Configuration loaded:', {
  server: config.server ? 'Set' : 'Missing',
  database: config.database ? 'Set' : 'Missing',
  user: config.user ? 'Set' : 'Missing',
  password: config.password ? 'Set' : 'Missing',
  encrypt: config.options?.encrypt,
  NODE_ENV: process.env.NODE_ENV || 'Not set'
});

let pool: sql.ConnectionPool | null = null;

/**
 * Check if error is retryable (network issues, timeouts)
 */
function isRetryableConnectionError(error: any): boolean {
  if (!error) return false;

  const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';
  return error.code === 'ETIMEOUT'
    || error.code === 'ESOCKET'
    || message.includes('failed to connect')
    || message.includes('connect etimedout');
}

/**
 * Delay helper for retry backoff
 */
async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Connect to database with retry logic
 */
async function connectWithRetry(maxAttempts = 4): Promise<sql.ConnectionPool> {
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[Database] Attempt ${attempt} of ${maxAttempts} to connect...`);
      const connection = await sql.connect(config);
      console.log('[Database] Successfully connected to SQL Server');
      return connection;
    } catch (error: any) {
      lastError = error;
      console.error(`[Database] Connection attempt ${attempt} failed:`, error.message);

      if (attempt === maxAttempts || !isRetryableConnectionError(error)) {
        break;
      }

      const backoffMs = Math.min(5000 * attempt, 20000);
      console.log(`[Database] Retrying connection in ${backoffMs}ms...`);
      await delay(backoffMs);
    }
  }

  throw lastError;
}

/**
 * Get database connection (singleton pattern with connection pooling)
 */
export async function getConnection(): Promise<sql.ConnectionPool> {
  if (!pool) {
    try {
      console.log('[Database] Attempting to connect to SQL Server...');
      console.log('[Database] Server:', config.server || 'EMPTY');
      console.log('[Database] Database:', config.database || 'EMPTY');
      console.log('[Database] User:', config.user || 'EMPTY');

      pool = await connectWithRetry();
    } catch (error: any) {
      console.error('[Database] Connection failed:', error.message);
      console.error('[Database] Check your SQL_CONNECTION_STRING environment variable');
      throw error;
    }
  }
  return pool;
}

/**
 * Close database connection (for cleanup)
 */
export async function closeConnection(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('[Database] Connection closed');
  }
}
