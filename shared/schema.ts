import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Stored categories table for database persistence
export const storedCategories = pgTable("stored_categories", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull().default(""),
  level: integer("level").notNull(),
  parentId: varchar("parent_id"),
  parentName: text("parent_name"),
  fullPath: text("full_path").notNull(),
  isGrocery: boolean("is_grocery").notNull().default(true),
  scrapedAt: timestamp("scraped_at").notNull().defaultNow(),
});

export const insertStoredCategorySchema = createInsertSchema(storedCategories).omit({
  scrapedAt: true,
});

export type InsertStoredCategory = z.infer<typeof insertStoredCategorySchema>;
export type StoredCategory = typeof storedCategories.$inferSelect;

// Category types for scraping (in-memory)
export interface Category {
  id: string;
  name: string;
  url: string;
  level: number;
  parentId: string | null;
  children: Category[];
}

export interface FlatCategory {
  id: string;
  name: string;
  url: string;
  level: number;
  parentId: string | null;
  parentName: string | null;
  fullPath: string;
}

export interface ScrapeResult {
  categories: Category[];
  flatCategories: FlatCategory[];
  totalCount: number;
  maxDepth: number;
  scrapedAt: string;
  duration: number;
}

export interface ScrapeStatus {
  status: 'idle' | 'running' | 'completed' | 'error';
  progress: number;
  currentCategory: string | null;
  message: string | null;
  result: ScrapeResult | null;
}
