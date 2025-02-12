import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeTrumpyResponse } from "../shared/trumpAnalyzer";

export function registerRoutes(app: Express): Server {
  // API route to update player score
  app.post('/api/scores', async (req, res) => {
    try {
      const { address, response } = req.body;

      // Analyze how "Trumpy" the response is (0-100 score)
      const trumpScore = analyzeTrumpyResponse(response);

      // Update player's persuasion score based on the analysis
      const updatedScore = await storage.updatePlayerScore(address, trumpScore);
      res.json(updatedScore);
    } catch (error) {
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
      res.status(500).json({ error: 'Failed to get score' });
    }
  });

  // API route to add player response
  app.post('/api/responses', async (req, res) => {
    try {
      // Add response to database and get transaction data
      const response = await storage.addPlayerResponse(req.body);

      // Calculate new persuasion score based on response
      const trumpScore = analyzeTrumpyResponse(response.response);
      await storage.updatePlayerScore(response.address, trumpScore);

      res.json(response);
    } catch (error) {
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
      res.status(500).json({ error: 'Failed to get responses' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}