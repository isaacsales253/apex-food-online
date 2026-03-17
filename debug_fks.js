const db = require('better-sqlite3')('database.sqlite');
try {
    const session1Count = db.prepare('SELECT COUNT(*) as c FROM raw_material_stock_by_brand WHERE session_id = 1').get();
    console.log('Session 1 entries in raw_material_stock_by_brand:', session1Count.c);
} catch (e) {
    console.log('Table raw_material_stock_by_brand might not exist or error:', e.message);
}

try {
    const fks = db.prepare("PRAGMA foreign_key_list('expenses')").all();
    console.log('Foreign keys for expenses:', fks);
    const refs = db.prepare("SELECT * FROM sqlite_master WHERE sql LIKE '%REFERENCES expenses(id)%'").all();
    console.log('Tables referencing expenses:', refs.map(r => r.name));
    
    const sessRefs = db.prepare("SELECT * FROM sqlite_master WHERE sql LIKE '%REFERENCES shopping_sessions(id)%'").all();
    console.log('Tables referencing shopping_sessions:', sessRefs.map(r => r.name));
} catch (e) {
    console.error('Meta check error:', e.message);
}
