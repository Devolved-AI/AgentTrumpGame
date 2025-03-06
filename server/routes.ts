import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Persuasion score endpoints now use in-memory map as fallback
  const scoreCache = new Map<string, number>();

  app.get('/api/persuasion/:address', async (req, res) => {
    try {
      const { address } = req.params;
      const score = scoreCache.get(address) ?? 50;
      res.json({ score });
    } catch (error) {
      console.error('Error getting persuasion score:', error);
      res.status(500).json({ error: 'Failed to get persuasion score' });
    }
  });

  app.post('/api/persuasion/:address', async (req, res) => {
    try {
      const { address } = req.params;
      const { score, gameOver } = req.body;

      if (typeof score !== 'number' || score < 0 || score > 100) {
        return res.status(400).json({ error: 'Invalid score value' });
      }

      // If game is over, don't update scores
      if (gameOver) {
        return res.status(403).json({ error: 'Game is over. No more updates allowed.' });
      }

      scoreCache.set(address, score);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating persuasion score:', error);
      res.status(500).json({ error: 'Failed to update persuasion score' });
    }
  });

  app.delete('/api/persuasion/:address', async (req, res) => {
    try {
      const { address } = req.params;
      scoreCache.delete(address);
      res.json({ success: true });
    } catch (error) {
      console.error('Error clearing persuasion score:', error);
      res.status(500).json({ error: 'Failed to clear persuasion score' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}