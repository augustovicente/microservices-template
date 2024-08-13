import { create_connection } from './utils/mysql';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import 'dotenv/config'

const filePath = resolve(__dirname, "../db-migrations/logs-table.sql");
const sql = readFileSync(filePath, "utf8");

const conn = create_connection();
conn.query(sql, (err) => {
    if (err) {
        console.error(err);
    } else {
        console.log('Migration completed');
    }
    conn.end();
});
