const Database = require('better-sqlite3');
const db = new Database('./database.sqlite');

const tables = [
  'meal_compositions',
  'meals',
  'menu_component_items',
  'menu_components',
  'technical_sheet_ingredients',
  'technical_sheets',
  'shopping_session_items',
  'shopping_sessions',
  'expenses',
  'furniture',
  'suppliers',
  'raw_materials'
];

try {
  db.exec('PRAGMA foreign_keys = OFF;');
  
  db.transaction(() => {
    for (const table of tables) {
      try {
        db.exec(`DELETE FROM ${table};`);
      } catch (e) {
        console.error(`Error deleting from ${table}:`, e.message);
      }
    }
    
    try {
      db.exec('DELETE FROM sqlite_sequence;');
    } catch (e) {
      console.error('Error resetting auto increments:', e.message);
    }
  })();
  
  db.exec('PRAGMA foreign_keys = ON;');
  console.log('Banco de dados completamente zerado.');
} catch (error) {
  console.error('Failed to clear database:', error);
}
