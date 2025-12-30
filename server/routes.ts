import type { Express } from "express";
import { createServer, type Server } from "http";
import { getScrapeStatus, startScraping, resetScrapeStatus } from "./scraper";
import { storage } from "./storage";
import type { InsertStoredCategory } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Get scrape status
  app.get('/api/scrape/status', (req, res) => {
    const status = getScrapeStatus();
    res.json(status);
  });

  // Start scraping
  app.post('/api/scrape/start', async (req, res) => {
    const currentStatus = getScrapeStatus();
    
    if (currentStatus.status === 'running') {
      return res.status(400).json({ 
        error: 'Scraping is already in progress' 
      });
    }

    // Start scraping in background
    startScraping().catch(error => {
      console.error('Scraping failed:', error);
    });

    res.json({ 
      message: 'Scraping started',
      status: 'running'
    });
  });

  // Reset status
  app.post('/api/scrape/reset', (req, res) => {
    resetScrapeStatus();
    res.json({ message: 'Status reset' });
  });

  // Save scraped categories to database
  app.post('/api/categories/save', async (req, res) => {
    try {
      const status = getScrapeStatus();
      
      if (!status.result || !status.result.flatCategories) {
        return res.status(400).json({ 
          error: 'No scraped categories available. Please run a scrape first.' 
        });
      }

      const categories: InsertStoredCategory[] = status.result.flatCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        url: cat.url,
        level: cat.level,
        parentId: cat.parentId,
        parentName: cat.parentName,
        fullPath: cat.fullPath,
        isGrocery: true,
      }));

      await storage.saveCategories(categories);

      res.json({ 
        message: `Saved ${categories.length} categories to database`,
        count: categories.length
      });
    } catch (error) {
      console.error('Error saving categories:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to save categories' 
      });
    }
  });

  // Get all stored categories
  app.get('/api/categories', async (req, res) => {
    try {
      const groceryOnly = req.query.grocery === 'true';
      const categories = groceryOnly 
        ? await storage.getGroceryCategories()
        : await storage.getAllCategories();
      
      res.json(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to fetch categories' 
      });
    }
  });

  // Search categories
  app.get('/api/categories/search', async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
      }
      
      const categories = await storage.searchCategories(query);
      res.json(categories);
    } catch (error) {
      console.error('Error searching categories:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to search categories' 
      });
    }
  });

  // Update category grocery status
  app.patch('/api/categories/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { isGrocery } = req.body;
      
      if (typeof isGrocery !== 'boolean') {
        return res.status(400).json({ error: 'isGrocery must be a boolean' });
      }

      await storage.updateCategoryGroceryStatus(id, isGrocery);
      res.json({ message: 'Category updated' });
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to update category' 
      });
    }
  });

  // Bulk update category grocery status
  app.patch('/api/categories/bulk/grocery', async (req, res) => {
    try {
      const { ids, isGrocery } = req.body;
      
      if (!Array.isArray(ids) || typeof isGrocery !== 'boolean') {
        return res.status(400).json({ 
          error: 'ids must be an array and isGrocery must be a boolean' 
        });
      }

      await storage.bulkUpdateGroceryStatus(ids, isGrocery);
      res.json({ message: `Updated ${ids.length} categories` });
    } catch (error) {
      console.error('Error bulk updating categories:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to bulk update categories' 
      });
    }
  });

  // Update category and all its descendants
  app.patch('/api/categories/:id/with-descendants', async (req, res) => {
    try {
      const { id } = req.params;
      const { isGrocery } = req.body;
      
      if (typeof isGrocery !== 'boolean') {
        return res.status(400).json({ error: 'isGrocery must be a boolean' });
      }

      const count = await storage.updateCategoryWithDescendants(id, isGrocery);
      res.json({ message: `Updated ${count} categories (including subcategories)`, count });
    } catch (error) {
      console.error('Error updating category with descendants:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to update category' 
      });
    }
  });

  // Delete all stored categories
  app.delete('/api/categories', async (req, res) => {
    try {
      await storage.deleteAllCategories();
      res.json({ message: 'All categories deleted' });
    } catch (error) {
      console.error('Error deleting categories:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to delete categories' 
      });
    }
  });

  return httpServer;
}
