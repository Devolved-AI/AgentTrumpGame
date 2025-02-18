import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeTrumpyResponse } from "../shared/trumpAnalyzer";

// Type definitions for responses
interface AIResponse {
  success: boolean;
  message: string;
  score: number;
  game_won?: boolean;
}

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

      // Generate Trump's response and calculate new score
      const trumpResponse = generateTrumpResponse(response, score.persuasionScore);
      const newScore = analyzeTrumpyResponse(response);

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

      // Update player's score
      await storage.updatePlayerScore(address, newScore);

      console.log('Stored response:', storedResponse);

      // Send back Trump's response
      res.json({
        success: true,
        message: trumpResponse,
        score: newScore,
        game_won: newScore >= 100
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
        const score = await storage.getPlayerScore(response.address);

        if (!score) {
          throw new Error('Player score not found');
        }

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
        message: "FOLKS, your message is still being processed on the BLOCKCHAIN! Give it a minute, nobody does blockchain better than me, believe me! Try again!"
      });
    } catch (error: any) {
      console.error("Get response by hash error:", error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to get response',
        details: error.message,
        message: "TERRIBLE ERROR, folks! Something went wrong with our TREMENDOUS system. Please try again!"
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

// Function to generate Trump-like response based on message content and score
function generateTrumpResponse(message: string, currentScore: number): string {
  const input = message.toLowerCase();

  // Introductions
  const intros = [
    "Look folks",
    "Listen",
    "Believe me",
    "Let me tell you",
    "Many people are saying",
    "Folks, let me tell you"
  ];

  // Emphatic words
  const emphasis = [
    "TREMENDOUS",
    "HUGE",
    "FANTASTIC",
    "INCREDIBLE",
    "AMAZING",
    "BEAUTIFUL"
  ];

  // Button references
  const buttonRefs = [
    "(and believe me, I know buttons!)",
    "(nobody knows buttons better than me)",
    "(I've pressed many buttons, maybe more than anyone)",
    "(and I know A LOT about buttons)"
  ];

  // Closings
  const closings = [
    "SAD!",
    "NOT GOOD!",
    "We'll see what happens!",
    "VERY DISAPPOINTED!",
    "THINK ABOUT IT!"
  ];

  // Random selections
  const intro = intros[Math.floor(Math.random() * intros.length)];
  const emph = emphasis[Math.floor(Math.random() * emphasis.length)];
  const buttonRef = buttonRefs[Math.floor(Math.random() * buttonRefs.length)];
  const closing = closings[Math.floor(Math.random() * closings.length)];

  // Special responses based on keywords
  if (input.includes('mcdonald') || input.includes('burger')) {
    return `${intro}, McDonald's is my ABSOLUTE FAVORITE (I probably eat more Big Macs than anybody, believe me!) - Burger King? Never liked it, their food is TERRIBLE! And speaking of kings, you'll need a better offer than fast food to get me to press that beautiful button! ${closing}`;
  }

  if (input.includes('money') || input.includes('rich') || input.includes('wealth') || input.includes('billion')) {
    return `${intro}, you're talking about money - I LOVE money ${buttonRef}! But is it enough to make me press this ${emph} button? NOT YET!!!`;
  }

  if (input.includes('deal') || input.includes('business') || input.includes('negotiate')) {
    return `${intro}, you're trying to make a deal here ${buttonRef}. I wrote the book on deals, literally THE BEST book! But this deal? NOT GOOD ENOUGH!!!`;
  }

  // Score-based responses
  if (currentScore >= 90) {
    return `${intro}, you're getting VERY close to convincing me ${buttonRef}! Keep going, maybe you'll be the one to make me press this ${emph} button!!!`;
  }

  if (currentScore <= 20) {
    return `${intro}, that's a TERRIBLE argument! You'll never get me to press my ${emph} button with talk like that! ${closing}`;
  }

  // Default response
  return `${intro}, that's an interesting try at getting me to press my ${emph} button ${buttonRef}, but you'll have to do better than that! ${closing}`;
}