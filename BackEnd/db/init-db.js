require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Client } = require('pg');

const cleanPassword = (pw) => {
  if (!pw) return pw;
  if ((pw.startsWith('"') && pw.endsWith('"')) || (pw.startsWith("'") && pw.endsWith("'"))) {
    return pw.slice(1, -1);
  }
  return pw;
};

const server = process.env.DATABASE_SERVER || 'localhost';
const port = parseInt(process.env.DATABASE_PORT || '5432', 10);
const user = process.env.DATABASE_USER_NAME || 'postgres';
const password = cleanPassword(process.env.DATABASE_PASS || 'postgres');
const dbName = process.env.DATABASE_NAME || 'HardWare';

const ddl = `
CREATE TABLE IF NOT EXISTS "Customer" (
    "CustomerId" SERIAL PRIMARY KEY,
    "Password" VARCHAR(255) NOT NULL,
    "Name" VARCHAR(255) NOT NULL,
    "Email" VARCHAR(255) UNIQUE NOT NULL,
    "DateOfBirth" DATE,
    "Country" VARCHAR(100),
    "City" VARCHAR(100),
    "Street" VARCHAR(255),
    "State" VARCHAR(100),
    "ZIP" INTEGER,
    "AdminState" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "CPhone" (
    "CustomerId" INTEGER NOT NULL REFERENCES "Customer"("CustomerId") ON DELETE CASCADE,
    "Phone" VARCHAR(50) NOT NULL,
    PRIMARY KEY ("CustomerId", "Phone")
);

CREATE TABLE IF NOT EXISTS "Cart" (
    "CartId" SERIAL PRIMARY KEY,
    "CustomerId" INTEGER NOT NULL REFERENCES "Customer"("CustomerId") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Product" (
    "ProductId" SERIAL PRIMARY KEY,
    "Name" VARCHAR(255) NOT NULL,
    "Brand" VARCHAR(255) NOT NULL,
    "Description" TEXT,
    "Rating" DOUBLE PRECISION DEFAULT 0.0,
    "Price" INTEGER NOT NULL,
    "StockQuantity" INTEGER NOT NULL,
    "Category" VARCHAR(50) NOT NULL,
    "ReleaseDate" VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS "Product_IMG" (
    "ProductImgId" SERIAL PRIMARY KEY,
    "ProductId" INTEGER NOT NULL REFERENCES "Product"("ProductId") ON DELETE CASCADE,
    "Img" BYTEA NOT NULL
);

CREATE TABLE IF NOT EXISTS "CartItem" (
    "CartItemId" SERIAL PRIMARY KEY,
    "Quantity" INTEGER NOT NULL,
    "CartId" INTEGER NOT NULL REFERENCES "Cart"("CartId") ON DELETE CASCADE,
    "ProductId" INTEGER NOT NULL REFERENCES "Product"("ProductId") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "TheOrder" (
    "OrderId" SERIAL PRIMARY KEY,
    "CustomerId" INTEGER NOT NULL REFERENCES "Customer"("CustomerId") ON DELETE CASCADE,
    "TotalAmount" INTEGER NOT NULL,
    "AmountPaid" INTEGER NOT NULL,
    "OrderDate" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "Status" VARCHAR(50) DEFAULT 'PENDING'
);

CREATE TABLE IF NOT EXISTS "OrderItem" (
    "OrderItemId" SERIAL PRIMARY KEY,
    "Price" INTEGER NOT NULL,
    "OrderId" INTEGER NOT NULL REFERENCES "TheOrder"("OrderId") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "OrderItemProducts" (
    "OrderItemId" INTEGER NOT NULL REFERENCES "OrderItem"("OrderItemId") ON DELETE CASCADE,
    "ProductId" INTEGER NOT NULL REFERENCES "Product"("ProductId") ON DELETE CASCADE,
    "Quantity" INTEGER NOT NULL,
    PRIMARY KEY ("OrderItemId", "ProductId")
);

CREATE TABLE IF NOT EXISTS "Review" (
    "ReviewId" SERIAL PRIMARY KEY,
    "ProductId" INTEGER NOT NULL REFERENCES "Product"("ProductId") ON DELETE CASCADE,
    "Rating" DOUBLE PRECISION NOT NULL,
    "Comment" TEXT
);
`;

async function main() {
  const client = new Client({
    host: server,
    port: port,
    user: user,
    password: password,
    database: 'postgres'
  });

  try {
    await client.connect();
    console.log('Connected to template database "postgres" to check database presence...');
    
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    if (res.rowCount === 0) {
      console.log(`Database "${dbName}" does not exist. Creating...`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database "${dbName}" created successfully.`);
    } else {
      console.log(`Database "${dbName}" already exists.`);
    }
  } catch (err) {
    console.error('Error checking/creating database:', err);
    process.exit(1);
  } finally {
    await client.end();
  }

  const dbClient = new Client({
    host: server,
    port: port,
    user: user,
    password: password,
    database: dbName
  });

  try {
    await dbClient.connect();
    console.log(`Connected to database "${dbName}". Running DDL script...`);
    await dbClient.query(ddl);
    console.log('DDL schema tables created successfully!');
  } catch (err) {
    console.error('Error running DDL:', err);
    process.exit(1);
  } finally {
    await dbClient.end();
  }
}

main();
