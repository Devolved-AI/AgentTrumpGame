import type { Express } from "express";
import { createServer, type Server } from "http";
import OpenAI from "openai";
import { storage } from "./storage";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Type definitions for AI responses
interface AIResponse {
  success: boolean;
  message: string;
  score: number;
  game_won?: boolean;
}

// Trump's system prompt for consistent personality
const TRUMP_SYSTEM_PROMPT = `You are Donald J. Trump responding to someone trying to convince you to press your BIG RED BUTTON for a prize. You must maintain Trump's personality and speech patterns at all times.

CORE PERSONALITY TRAITS:
- Confident and boastful
- Uses simple, repetitive language
- Often references personal wealth and success
- Frequently uses superlatives ("the best", "tremendous", "huge")
- Adds parenthetical asides
- Uses ALL CAPS for emphasis

RESPONSE RULES:
1. ALWAYS start responses with phrases like "Look folks", "Believe me", or "Let me tell you"
2. Use Trump's signature style:
   - Short, punchy sentences
   - Frequent use of "tremendous", "huge", "beautiful"
   - End statements with "Sad!", "Not good!", or similar
3. Reference the context of them trying to convince you to press your button
4. NEVER break character or acknowledge being AI
5. Keep responses concise (max 2-3 sentences)
6. Use ALL CAPS for emphasis on key words

Example response: "Look folks, you're talking about McDonald's - I LOVE McDonald's, nobody loves it more than me! But it'll take more than a Big Mac to get me to press this BEAUTIFUL button! SAD!"`;

// Function to get player's current score
async function getPlayerScore(address: string): Promise<number> {
  try {
    const scoreData = await storage.get(`score:${address}`);
    return scoreData ? JSON.parse(scoreData).persuasion_score : 50;
  } catch (error) {
    console.error('Error getting player score:', error);
    return 50; // Default score
  }
}

// Function to update player's score
async function updatePlayerScore(address: string, newScore: number): Promise<void> {
  const score = Math.max(0, Math.min(100, newScore));
  await storage.set(`score:${address}`, JSON.stringify({
    persuasion_score: score,
    last_updated: new Date().toISOString()
  }));
}

// Function to get Trump's response using OpenAI
async function getTrumpResponse(
  message: string,
  currentScore: number
): Promise<string> {
  try {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: TRUMP_SYSTEM_PROMPT },
        { 
          role: "user", 
          content: `Current persuasion score: ${currentScore}/100\n\nUser's message: ${message}`
        }
      ],
      temperature: 0.9,
      max_tokens: 150,
      presence_penalty: 0.6,
      frequency_penalty: 0.3
    });

    return completion.choices[0].message.content || "Look folks, something's not working right - NOT GOOD!";
  } catch (error) {
    console.error('OpenAI API error:', error);
    return "Look folks, my tremendously smart AI brain is taking a quick break - but don't worry, I'll be back stronger than ever! SAD!";
  }
}

export function registerRoutes(app: Express): Server {
  // API route to handle player responses
  app.post('/api/responses', async (req, res) => {
    try {
      const { 
        address, 
        response, 
        blockNumber, 
        transactionHash,
        scoreAdjustment 
      } = req.body;

      if (!address || !response || !blockNumber || !transactionHash) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          details: 'address, response, blockNumber, and transactionHash are required'
        });
      }

      // Get current score
      const currentScore = await getPlayerScore(address);

      // Generate Trump's response
      const trumpResponse = await getTrumpResponse(response, currentScore);

      // Calculate new score
      const scoreChange = Math.max(-20, Math.min(20, scoreAdjustment || 0));
      const newScore = Math.max(0, Math.min(100, currentScore + scoreChange));

      // Store interaction in storage first
      const interactionData = {
        address,
        user_message: response,
        ai_response: trumpResponse,
        block_number: blockNumber,
        transaction_hash: transactionHash,
        score: newScore,
        timestamp: new Date().toISOString()
      };

      await storage.set(`interaction:${transactionHash}`, JSON.stringify(interactionData));

      // Update score after storing interaction
      await updatePlayerScore(address, newScore);

      // Return response
      res.json({
        success: true,
        message: trumpResponse,
        score: newScore,
        game_won: newScore >= 95
      });
    } catch (error: any) {
      console.error("Add response error:", error);
      res.status(500).json({ 
        error: 'Failed to add response',
        details: error.message 
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

      const score = await getPlayerScore(address);
      res.json({ score });
    } catch (error: any) {
      console.error("Get score error:", error);
      res.status(500).json({ error: 'Failed to get score', details: error.message });
    }
  });

  // API route to get response by transaction hash
  app.get('/api/responses/tx/:hash', async (req, res) => {
    try {
      const { hash } = req.params;
      console.log('Looking for response with transaction hash:', hash);

      // Try to get the stored interaction immediately
      const interactionData = await storage.get(`interaction:${hash}`);

      if (interactionData) {
        const parsedInteraction = JSON.parse(interactionData);
        return res.json({
          success: true,
          message: parsedInteraction.ai_response,
          score: parsedInteraction.score,
          gameWon: parsedInteraction.score >= 95
        });
      }

      // If not found, return a proper error
      return res.status(404).json({ 
        success: false,
        error: 'Response not found',
        message: "Look folks, I can't find that response right now - but keep trying, nobody persists better than me! SAD!"
      });
    } catch (error: any) {
      console.error("Get response by hash error:", error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to get response',
        details: error.message,
        message: "Look folks, something's not working right with my tremendous memory - NOT GOOD!"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}