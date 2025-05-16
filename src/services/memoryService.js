import { MEMORY_SETTINGS } from '../config/config';

export class MemoryService {
  constructor(db) {
    this.db = db;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    const stmt = this.db.prepare(`
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        type TEXT NOT NULL,
        importance REAL DEFAULT 1.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await stmt.run();

    const interactionsStmt = this.db.prepare(`
      CREATE TABLE IF NOT EXISTS interaction_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        response TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await interactionsStmt.run();

    const preferencesStmt = this.db.prepare(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id INTEGER PRIMARY KEY,
        preferences TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await preferencesStmt.run();

    this.initialized = true;
  }

  async storeMemory(userId, content, memoryType, importance = 1.0) {
    await this.initialize();
    const stmt = this.db.prepare(
      "INSERT INTO memories (user_id, content, type, importance) VALUES (?, ?, ?, ?)"
    );
    await stmt.bind([userId, content, memoryType, importance]).run();
    return true;
  }

  async getMemories(userId, memoryType = null, limit = 10) {
    await this.initialize();
    let query = "SELECT * FROM memories WHERE user_id = ?";
    let params = [userId];

    if (memoryType) {
      query += " AND type = ?";
      params.push(memoryType);
    }

    query += " ORDER BY importance DESC, created_at DESC LIMIT ?";
    params.push(limit);
    
    const stmt = this.db.prepare(query);
    const results = await stmt.bind(params).all();
    return results.map(row => ({ ...row }));
  }

  async deleteMemory(userId, memoryId) {
    await this.initialize();
    const stmt = this.db.prepare(
      "DELETE FROM memories WHERE id = ? AND user_id = ?"
    );
    const result = await stmt.bind([memoryId, userId]).run();
    return result.changes > 0;
  }

  async storeInteraction(userId, message, response) {
    await this.initialize();
    const stmt = this.db.prepare(
      "INSERT INTO interaction_history (user_id, message, response) VALUES (?, ?, ?)"
    );
    await stmt.bind([userId, message, response]).run();
    return true;
  }

  async getRecentInteractions(userId, limit = 10) {
    await this.initialize();
    const stmt = this.db.prepare(
      "SELECT * FROM interaction_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?"
    );
    const results = await stmt.bind([userId, limit]).all();
    return results.map(row => ({ ...row }));
  }

  async storeUserPreferences(userId, preferences) {
    await this.initialize();
    const stmt = this.db.prepare(`
      INSERT INTO user_preferences (user_id, preferences)
      VALUES (?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
      preferences = excluded.preferences,
      updated_at = CURRENT_TIMESTAMP
    `);
    await stmt.bind([userId, JSON.stringify(preferences)]).run();
    return true;
  }

  async getUserPreferences(userId) {
    await this.initialize();
    const stmt = this.db.prepare(
      "SELECT preferences FROM user_preferences WHERE user_id = ?"
    );
    const result = await stmt.bind([userId]).get();
    return result ? JSON.parse(result.preferences) : null;
  }

  async clearUserData(userId) {
    await this.initialize();
    const stmts = [
      this.db.prepare("DELETE FROM memories WHERE user_id = ?"),
      this.db.prepare("DELETE FROM interaction_history WHERE user_id = ?"),
      this.db.prepare("DELETE FROM user_preferences WHERE user_id = ?")
    ];

    for (const stmt of stmts) {
      await stmt.bind([userId]).run();
    }

    return true;
  }
}
