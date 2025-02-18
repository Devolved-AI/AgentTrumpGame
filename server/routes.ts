import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

// Type definitions for responses
interface AIResponse {
  success: boolean;
  message: string;
  score: number;
  game_won?: boolean;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function registerRoutes(app: Express): Server {
  // API route to update player score
  app.post('/api/scores', async (req, res) => {
    try {
      const { address, response, blockNumber, transactionHash } = req.body;
      if (!address || !response || !blockNumber || !transactionHash) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Get or initialize player score
      const score = await storage.getPlayerScore(address) || {
        address,
        persuasionScore: 50,
        lastUpdated: new Date()
      };

      res.json({
        success: true,
        message: "Score updated",
        score: score.persuasionScore,
        game_won: score.persuasionScore >= 100
      });
    } catch (error: any) {
      console.error("Score update error:", error);
      res.status(500).json({ error: 'Failed to update score', details: error.message });
    }
  });

  // API route to get player score
  app.get('/api/scores/:address', async (req, res) => {
    try {
      const { address } = req.params;
      if (!address) {
        return res.status(400).json({ error: 'Address is required' });
      }

      // Get or initialize player score
      const score = await storage.getPlayerScore(address) || {
        address,
        persuasionScore: 50,
        lastUpdated: new Date()
      };

      res.json({
        success: true,
        score: score.persuasionScore
      });
    } catch (error: any) {
      console.error("Get score error:", error);
      res.status(500).json({ error: 'Failed to get score', details: error.message });
    }
  });

  // API route to handle player responses
  app.post('/api/responses', async (req, res) => {
    try {
      const { address, response, blockNumber, transactionHash } = req.body;

      if (!address || !response || !blockNumber || !transactionHash) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          details: 'address, response, blockNumber, and transactionHash are required'
        });
      }

      console.log('Processing response with transaction hash:', transactionHash);

      // Get or initialize player score
      const score = await storage.getPlayerScore(address) || {
        address,
        persuasionScore: 50,
        lastUpdated: new Date()
      };

      // Store the response with all required fields
      const storedResponse = await storage.storePlayerResponse(address, {
        address,
        response,
        blockNumber,
        transactionHash,
        created_at: new Date().toISOString(),
        exists: true
      });

      console.log('Stored response:', storedResponse);

      res.json({
        success: true,
        message: "Response processed",
        score: score.persuasionScore,
        game_won: score.persuasionScore >= 100
      });
    } catch (error: any) {
      console.error("Add response error:", error);
      res.status(500).json({ 
        error: 'Failed to add response',
        details: error.message 
      });
    }
  });

  // API route to get response by transaction hash
  app.get('/api/responses/tx/:hash', async (req, res) => {
    try {
      const { hash } = req.params;
      console.log('Looking for response with transaction hash:', hash);

      const maxRetries = 5;  // Increased from 3 to 5
      const baseDelay = 1000; // Increased from 500 to 1000ms

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const response = await storage.getPlayerResponseByHash(hash);
        console.log(`Attempt ${attempt + 1}: Response found:`, response);

        if (response) {
          // Get or initialize player score
          const score = await storage.getPlayerScore(response.address) || {
            address: response.address,
            persuasionScore: 50,
            lastUpdated: new Date()
          };

          return res.json({
            success: true,
            message: "Response retrieved",
            score: score.persuasionScore,
            game_won: score.persuasionScore >= 100
          });
        }

        // Calculate exponential backoff delay
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Attempt ${attempt + 1}: Waiting ${delay}ms before retry...`);
        await sleep(delay);
      }

      console.log('No response found after all retries');
      return res.status(404).json({ 
        success: false,
        error: 'Response not found',
        message: "Failed to find your response. Please try again."
      });
    } catch (error: any) {
      console.error("Get response by hash error:", error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to get response',
        details: error.message,
        message: "Failed to process your response. Please try again."
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}