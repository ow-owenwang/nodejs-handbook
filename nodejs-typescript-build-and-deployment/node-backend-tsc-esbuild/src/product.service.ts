import type { RowDataPacket } from 'mysql2';
import { pool } from './db';

export interface Product extends RowDataPacket {
  id: number;
  name: string;
  // mysql2 returns DECIMAL as a string to preserve precision.
  price: string;
  stock: number;
  created_at: Date;
}

export async function listProducts(): Promise<Product[]> {
  const [products] = await pool.query<Product[]>(
    'SELECT id, name, price, stock, created_at FROM products ORDER BY id ASC',
  );

  return products;
}
