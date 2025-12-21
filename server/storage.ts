import { randomUUID } from "crypto";

// Category scraping doesn't require persistent storage
// Results are stored in memory in scraper.ts

export interface IStorage {
  // Placeholder for future storage needs
}

export class MemStorage implements IStorage {
  constructor() {
    // Initialize any storage needs here
  }
}

export const storage = new MemStorage();
