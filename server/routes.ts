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
    const completion = await openai.chat.completions.create({
      model: "gpt-4", // Using GPT-4 for better personality matching
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
    throw new Error('Failed to generate Trump response');
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
        signature,
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

      // Update score
      await updatePlayerScore(address, newScore);

      // Store interaction in Redis
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


  // API route to get response by transaction hash with enhanced retries
  app.get('/api/responses/tx/:hash', async (req, res) => {
    try {
      const { hash } = req.params;
      console.log('Looking for response with transaction hash:', hash);

      const maxRetries = 3;
      const baseDelay = 500; // 500ms base delay

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const interactionData = await storage.get(`interaction:${hash}`);
          if (interactionData) {
            const parsedInteraction = JSON.parse(interactionData);
            return res.json({
              message: parsedInteraction.ai_response,
              score: parsedInteraction.score,
              gameWon: parsedInteraction.score >= 95
            });
          }
        } catch (error) {
          console.error(`Attempt ${attempt + 1} failed:`, error);
          if (attempt === maxRetries - 1) throw error;
        }

        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Attempt ${attempt + 1}: Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      console.log('No response found after all retries');
      return res.status(404).json({ error: 'Response not found' });
    } catch (error: any) {
      console.error("Get response by hash error:", error);
      res.status(500).json({ 
        error: 'Failed to get response',
        details: error.message 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}