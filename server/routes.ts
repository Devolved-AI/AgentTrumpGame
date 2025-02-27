import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { trumpAI } from "./ai-service";

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
      const { score } = req.body;

      if (typeof score !== 'number' || score < 0 || score > 100) {
        return res.status(400).json({ error: 'Invalid score value' });
      }

      scoreCache.set(address, score);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating persuasion score:', error);
      res.status(500).json({ error: 'Failed to update persuasion score' });
    }
  });

  // New endpoint to handle message submissions and get AI responses
  app.post('/api/submit-message', async (req, res) => {
    try {
      const { message, address } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Invalid message' });
      }

      if (!address || typeof address !== 'string') {
        return res.status(400).json({ error: 'Invalid address' });
      }

      // Get current score
      const currentScore = scoreCache.get(address) ?? 50;

      // Evaluate persuasion and generate AI response
      const evaluation = trumpAI.evaluatePersuasion(message);
      const aiResponse = await trumpAI.generateResponse(message);

      // Calculate and update new score
      let newScore = currentScore + evaluation.scoreChange;
      newScore = Math.max(0, Math.min(100, newScore)); // Clamp between 0 and 100
      scoreCache.set(address, newScore);

      res.json({
        aiResponse,
        evaluation: evaluation.message,
        scoreChange: evaluation.scoreChange,
        newScore
      });
    } catch (error) {
      console.error('Error processing message:', error);
      res.status(500).json({ error: 'Failed to process message' });
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