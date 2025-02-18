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

      // Get player score
      const score = await storage.getPlayerScore(address) || {
        address,
        persuasionScore: 50,
        lastUpdated: new Date()
      };

      // Generate Trump's response based on the input
      const trumpResponse = generateTrumpResponse(response, score.persuasionScore);

      // Store both user's response and Trump's response
      const storedResponse = await storage.storePlayerResponse(address, {
        address,
        response: response, // User's message
        ai_response: trumpResponse, // Trump's response
        blockNumber,
        transactionHash,
        created_at: new Date().toISOString(),
        exists: true
      });

      console.log('Stored response:', storedResponse);

      // Send back Trump's response
      res.json({
        success: true,
        message: trumpResponse,
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

      const response = await storage.getPlayerResponseByHash(hash);

      if (response) {
        // Get player score
        const score = await storage.getPlayerScore(response.address) || {
          address: response.address,
          persuasionScore: 50,
          lastUpdated: new Date()
        };

        return res.json({
          success: true,
          message: response.ai_response, // Return Trump's response
          score: score.persuasionScore,
          game_won: score.persuasionScore >= 100
        });
      }

      return res.status(404).json({ 
        success: false,
        error: 'Response not found',
        message: "Trump's response is being processed. Please try again."
      });
    } catch (error: any) {
      console.error("Get response by hash error:", error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to get response',
        details: error.message,
        message: "Failed to get Trump's response. Please try again."
      });
    }
  });

  // API route to get player score
  app.get('/api/scores/:address', async (req, res) => {
    try {
      const { address } = req.params;
      if (!address) {
        return res.status(400).json({ error: 'Address is required' });
      }

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

  const httpServer = createServer(app);
  return httpServer;
}

// Function to generate Trump-like response
function generateTrumpResponse(message: string, score: number): string {
  const input = message.toLowerCase();

  // McDonald's specific response
  if (input.includes('mcdonald') || input.includes('burger king')) {
    return "Look folks, McDonald's is my ABSOLUTE FAVORITE (I probably eat more Big Macs than anybody, believe me!) - Burger King? Never liked it, their food is TERRIBLE! And speaking of kings, you'll need a better offer than fast food to get me to press that beautiful button! SAD!";
  }

  // Score-based responses
  if (score >= 90) {
    return "Believe me folks, you're getting VERY close to convincing me! Keep going, maybe you'll be the one to make me press this TREMENDOUS button!!!";
  }

  if (score <= 20) {
    return "Listen, that's a TERRIBLE argument! You'll never get me to press my BEAUTIFUL button with talk like that! SAD!";
  }

  // Default response
  return "Many people are saying that's an interesting try at getting me to press my HUGE button (and believe me, I know buttons!), but you'll have to do better than that! THINK ABOUT IT!";
}