import aiosqlite
from datetime import datetime
from typing import List, Dict, Optional, Any

class MemoryService:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.initialized = False

    async def initialize(self):
        """Initialize the database and create tables if they don't exist."""
        if self.initialized:
            return

        async with aiosqlite.connect(self.db_path) as db:
            # Create memories table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS memories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    content TEXT NOT NULL,
                    type TEXT NOT NULL,
                    importance REAL DEFAULT 1.0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Create interaction_history table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS interaction_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    message TEXT NOT NULL,
                    response TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Create user_preferences table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS user_preferences (
                    user_id INTEGER PRIMARY KEY,
                    preferences TEXT NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            await db.commit()
            self.initialized = True

    async def store_memory(self, user_id: int, content: str, memory_type: str, importance: float = 1.0) -> bool:
        """Store a new memory."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "INSERT INTO memories (user_id, content, type, importance) VALUES (?, ?, ?, ?)",
                (user_id, content, memory_type, importance)
            )
            await db.commit()
            return True

    async def get_memories(self, user_id: int, memory_type: str = None, limit: int = 10) -> List[Dict[str, Any]]:
        """Retrieve memories for a user."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            if memory_type:
                cursor = await db.execute(
                    "SELECT * FROM memories WHERE user_id = ? AND type = ? ORDER BY importance DESC, created_at DESC LIMIT ?",
                    (user_id, memory_type, limit)
                )
            else:
                cursor = await db.execute(
                    "SELECT * FROM memories WHERE user_id = ? ORDER BY importance DESC, created_at DESC LIMIT ?",
                    (user_id, limit)
                )
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

    async def delete_memory(self, user_id: int, memory_id: int) -> bool:
        """Delete a specific memory."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "DELETE FROM memories WHERE id = ? AND user_id = ?",
                (memory_id, user_id)
            )
            await db.commit()
            return cursor.rowcount > 0

    async def store_interaction(self, user_id: int, message: str, response: str) -> bool:
        """Store an interaction in the history."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "INSERT INTO interaction_history (user_id, message, response) VALUES (?, ?, ?)",
                (user_id, message, response)
            )
            await db.commit()
            return True

    async def get_recent_interactions(self, user_id: int, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent interactions for a user."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT * FROM interaction_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
                (user_id, limit)
            )
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

    async def store_user_preferences(self, user_id: int, preferences: dict) -> bool:
        """Store user preferences."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """INSERT INTO user_preferences (user_id, preferences) 
                   VALUES (?, ?)
                   ON CONFLICT(user_id) DO UPDATE SET 
                   preferences = excluded.preferences,
                   updated_at = CURRENT_TIMESTAMP""",
                (user_id, str(preferences))
            )
            await db.commit()
            return True

    async def get_user_preferences(self, user_id: int) -> Optional[dict]:
        """Retrieve user preferences."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT preferences FROM user_preferences WHERE user_id = ?",
                (user_id,)
            )
            row = await cursor.fetchone()
            if row:
                try:
                    return eval(row['preferences'])  # Convert string back to dict
                except:
                    return {}
            return None

    async def clear_user_data(self, user_id: int) -> bool:
        """Clear all data for a specific user."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("DELETE FROM memories WHERE user_id = ?", (user_id,))
            await db.execute("DELETE FROM interaction_history WHERE user_id = ?", (user_id,))
            await db.execute("DELETE FROM user_preferences WHERE user_id = ?", (user_id,))
            await db.commit()
            return True
