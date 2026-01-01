import { eq, like, and, or } from "drizzle-orm";
import { db } from "./db";
import { storedCategories, type StoredCategory, type InsertStoredCategory } from "@shared/schema";

export interface IStorage {
  getAllCategories(): Promise<StoredCategory[]>;
  getGroceryCategories(): Promise<StoredCategory[]>;
  saveCategories(categories: InsertStoredCategory[]): Promise<void>;
  updateCategoryGroceryStatus(id: string, isGrocery: boolean): Promise<void>;
  bulkUpdateGroceryStatus(ids: string[], isGrocery: boolean): Promise<void>;
  updateCategoryWithDescendants(id: string, isGrocery: boolean): Promise<number>;
  deleteAllCategories(): Promise<void>;
  searchCategories(query: string): Promise<StoredCategory[]>;
  updateRimiCategoryId(id: string, rimiCategoryId: number | null): Promise<void>;
  bulkUpdateRimiCategoryIds(updates: { id: string; rimiCategoryId: number }[]): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getAllCategories(): Promise<StoredCategory[]> {
    return await db.select().from(storedCategories).orderBy(storedCategories.fullPath);
  }

  async getGroceryCategories(): Promise<StoredCategory[]> {
    return await db.select()
      .from(storedCategories)
      .where(eq(storedCategories.isGrocery, true))
      .orderBy(storedCategories.fullPath);
  }

  async saveCategories(categories: InsertStoredCategory[]): Promise<void> {
    if (categories.length === 0) return;
    
    // Delete existing categories first
    await db.delete(storedCategories);
    
    // Insert in batches of 100
    const batchSize = 100;
    for (let i = 0; i < categories.length; i += batchSize) {
      const batch = categories.slice(i, i + batchSize);
      await db.insert(storedCategories).values(batch);
    }
  }

  async updateCategoryGroceryStatus(id: string, isGrocery: boolean): Promise<void> {
    await db.update(storedCategories)
      .set({ isGrocery })
      .where(eq(storedCategories.id, id));
  }

  async bulkUpdateGroceryStatus(ids: string[], isGrocery: boolean): Promise<void> {
    if (ids.length === 0) return;
    
    for (const id of ids) {
      await db.update(storedCategories)
        .set({ isGrocery })
        .where(eq(storedCategories.id, id));
    }
  }

  async updateCategoryWithDescendants(id: string, isGrocery: boolean): Promise<number> {
    // Get the category to find its name for matching descendants
    const allCategories = await this.getAllCategories();
    const targetCategory = allCategories.find(c => c.id === id);
    
    if (!targetCategory) return 0;
    
    // Find all descendants by matching fullPath prefix
    const categoryPath = targetCategory.fullPath;
    const descendantIds = allCategories
      .filter(c => c.fullPath.startsWith(categoryPath))
      .map(c => c.id);
    
    // Update all matching categories
    for (const catId of descendantIds) {
      await db.update(storedCategories)
        .set({ isGrocery })
        .where(eq(storedCategories.id, catId));
    }
    
    return descendantIds.length;
  }

  async deleteAllCategories(): Promise<void> {
    await db.delete(storedCategories);
  }

  async searchCategories(query: string): Promise<StoredCategory[]> {
    const searchPattern = `%${query}%`;
    return await db.select()
      .from(storedCategories)
      .where(
        or(
          like(storedCategories.name, searchPattern),
          like(storedCategories.fullPath, searchPattern)
        )
      )
      .orderBy(storedCategories.fullPath);
  }

  async updateRimiCategoryId(id: string, rimiCategoryId: number | null): Promise<void> {
    await db.update(storedCategories)
      .set({ rimiCategoryId })
      .where(eq(storedCategories.id, id));
  }

  async bulkUpdateRimiCategoryIds(updates: { id: string; rimiCategoryId: number }[]): Promise<void> {
    if (updates.length === 0) return;
    
    for (const update of updates) {
      await db.update(storedCategories)
        .set({ rimiCategoryId: update.rimiCategoryId })
        .where(eq(storedCategories.id, update.id));
    }
  }
}

export const storage = new DatabaseStorage();
