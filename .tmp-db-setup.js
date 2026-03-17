const Database = require('better-sqlite3');
const db = new Database('./database.sqlite');

db.exec(`
  CREATE TABLE IF NOT EXISTS shopping_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_cost REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS shopping_session_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    raw_material_id INTEGER NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    FOREIGN KEY (session_id) REFERENCES shopping_sessions(id),
    FOREIGN KEY (raw_material_id) REFERENCES raw_materials(id)
  );
`);
console.log('Tables created');
