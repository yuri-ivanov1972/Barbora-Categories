import type { Express } from "express";
import { createServer, type Server } from "http";
import { getScrapeStatus, startScraping, resetScrapeStatus } from "./scraper";

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

  return httpServer;
}
