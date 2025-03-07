import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Persuasion score endpoints now use in-memory map as fallback
  const scoreCache = new Map<string, number>();

  // Initialize scoreCache with default scores
  if (!scoreCache.has('0x5b4ee669bee8093214d5b9e785e011eb93995171')) {
    scoreCache.set('0x5b4ee669bee8093214d5b9e785e011eb93995171', 47);
  }

  app.get('/api/persuasion/:address', async (req, res) => {
    try {
      const { address } = req.params;
      // For address 0x5b4ee669bee8093214d5b9e785e011eb93995171, ensure we return 47 if no score is set
      const defaultScore = address.toLowerCase() === '0x5b4ee669bee8093214d5b9e785e011eb93995171'.toLowerCase() ? 47 : 50;
      const score = scoreCache.get(address) ?? defaultScore;
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