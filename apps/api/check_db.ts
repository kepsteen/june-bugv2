import { db } from './src/lib/db';
import { sql } from 'drizzle-orm';

async function checkTables() {
  try {
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log('Current tables:', tables.rows);
    
    // Check users table structure
    const usersColumns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);
    console.log('\nUsers table columns:', usersColumns.rows);
    
    // Check account table structure
    const accountColumns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'account'
      ORDER BY ordinal_position;
    `);
    console.log('\nAccount table columns:', accountColumns.rows);
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkTables();
