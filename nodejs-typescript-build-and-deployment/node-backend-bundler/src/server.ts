import 'dotenv/config';
import express from 'express';
import type { RowDataPacket } from 'mysql2';
import { pool } from './db';

interface ProductRow extends RowDataPacket {
  id: number;
  name: string;
  price: string; // MySQL DECIMAL is returned as a string to preserve precision.
  stock: number;
  created_at: Date;
}

const app = express();

app.get('/api/products', async (_req, res) => {
  try {
    const [products] = await pool.query<ProductRow[]>(
      'SELECT id, name, price, stock, created_at FROM products ORDER BY id ASC',
    );
    res.json({ data: products });
  } catch (error) {
    console.error('Failed to query products:', error);
    res.status(500).json({ error: 'Failed to query products' });
  }
});

async function main(): Promise<void> {
  // Fail at startup when the database or credentials are unavailable.
  await pool.query('SELECT 1');

  const rawPort = process.env.PORT || '3000';
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  const server = app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
  });

  const shutdown = (): void => {
    server.close(() => {
      void pool.end().then(() => process.exit(0));
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error: unknown) => {
  console.error('Unable to start server:', error);
  void pool.end().finally(() => process.exit(1));
});
