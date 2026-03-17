const Database = require('better-sqlite3');
const db = new Database('./database.sqlite');
db.exec(`
  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
try {
  db.exec('ALTER TABLE shopping_session_items ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id);');
} catch (e) {
  // column might already exist
}
console.log('Suppliers tables created/updated.');
