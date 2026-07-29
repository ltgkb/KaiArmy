import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const workspaceStates = sqliteTable("workspace_states", {
  id: integer("id").primaryKey(),
  payload: text("payload").notNull(),
  version: integer("version").notNull().default(1),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
