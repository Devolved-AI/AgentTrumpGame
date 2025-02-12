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
      console.log('Received response submission:', req.body);
      const response = await storage.addPlayerResponse(req.body);
      console.log('Stored response:', response);
      res.json(response);
    } catch (error) {
      console.error('Error adding response:', error);
      res.status(500).json({ error: 'Failed to add response', details: error.message });
    }
  });

  // API route to get player responses
  app.get('/api/responses/:address', async (req, res) => {
    try {
      const { address } = req.params;
      console.log('Fetching responses for address:', address);
      const responses = await storage.getPlayerResponses(address);
      console.log('Found responses:', responses);
      res.json(responses);
    } catch (error) {
      console.error('Error getting responses:', error);
      res.status(500).json({ error: 'Failed to get responses', details: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}