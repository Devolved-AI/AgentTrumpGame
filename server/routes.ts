import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export function registerRoutes(app: Express): Server {
  // API route to update player score
  app.post('/api/scores', async (req, res) => {
    try {
      const { address, score } = req.body;
      const updatedScore = await storage.updatePlayerScore(address, score);
      res.json(updatedScore);
    } catch (error) {
      console.error('Error updating score:', error);
      res.status(500).json({ error: 'Failed to update score' });
    }
  });

  // API route to get player score
  app.get('/api/scores/:address', async (req, res) => {
    try {
      const { address } = req.params;
      const score = await storage.getPlayerScore(address);
      res.json(score || { persuasionScore: 50 });
    } catch (error) {
      console.error('Error getting score:', error);
      res.status(500).json({ error: 'Failed to get score' });
    }
  });

  // API route to add player response
  app.post('/api/responses', async (req, res) => {
    try {
      const response = await storage.addPlayerResponse(req.body);
      res.json(response);
    } catch (error) {
      console.error('Error adding response:', error);
      res.status(500).json({ error: 'Failed to add response' });
    }
  });

  // API route to get player responses
  app.get('/api/responses/:address', async (req, res) => {
    try {
      const { address } = req.params;
      const responses = await storage.getPlayerResponses(address);
      res.json(responses);
    } catch (error) {
      console.error('Error getting responses:', error);
      res.status(500).json({ error: 'Failed to get responses' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}