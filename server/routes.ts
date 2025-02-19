import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeTrumpyResponse } from "../shared/trumpAnalyzer";
import OpenAI from "openai";

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Type definitions for responses
interface AIResponse {
  success: boolean;
  message: string;
  score: number;
  game_won?: boolean;
}

async function generateTrumpResponseWithAI(userMessage: string, currentScore: number): Promise<string> {
  try {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are Donald J. Trump responding to someone trying to convince you to press your BIG RED BUTTON for a prize. Their current persuasion score is ${currentScore}/100.

REQUIREMENTS:
1. ALWAYS respond directly to their specific message first
2. Reference their exact words and topic in your response
3. Use these elements in EVERY response:
   - Start with: "Look folks", "Listen", or "Believe me"
   - Use CAPS for emphasis
   - Reference your personal experience with their topic
   - Add Trump-style asides in parentheses
   - End with "SAD!", "NOT GOOD!", or "THINK ABOUT IT!"

RESPONSE FORMAT:
1. First sentence: Direct response to their specific topic/argument
2. Second sentence: Your personal experience/opinion on their exact point
3. Final sentence: Brief tie-in to the button/prize and their current score

Example:
User: "I'll give you a lifetime supply of McDonald's Big Macs!"
Response: "Look folks, trying to bribe me with Big Macs (my ABSOLUTE FAVORITE, I eat them more than anybody!) shows you know what I like, but let me tell you - I already have the BEST Big Mac supply in history! You'll need more than fast food to get me to press this beautiful button, your persuasion score is only ${currentScore}! SAD!"`
        },
        { role: "user", content: userMessage }
      ],
      temperature: 0.9,
      max_tokens: 150
    });

    return response.choices[0].message.content || fallbackTrumpResponse(userMessage);
  } catch (error) {
    console.error("OpenAI API error:", error);
    return fallbackTrumpResponse(userMessage);
  }
}

// Fallback response generator
function fallbackTrumpResponse(message: string): string {
  const intros = ["Look folks", "Listen", "Believe me"];
  const emphasis = ["TREMENDOUS", "HUGE", "FANTASTIC"];
  const closings = ["SAD!", "NOT GOOD!", "THINK ABOUT IT!"];

  const intro = intros[Math.floor(Math.random() * intros.length)];
  const emph = emphasis[Math.floor(Math.random() * emphasis.length)];
  const closing = closings[Math.floor(Math.random() * closings.length)];

  return `${intro}, that's a ${emph} try at getting me to press my button (and believe me, I know buttons!), but you'll have to do better than that! ${closing}`;
}

export function registerRoutes(app: Express): Server {
  // API route to handle player responses - now generates response immediately
  app.post('/api/responses', async (req, res) => {
    try {
      const { address, response, blockNumber, transactionHash } = req.body;

      if (!address || !response) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          details: 'address and response are required'
        });
      }

      console.log('Processing response from address:', address);

      // Get current score
      const currentScore = (await storage.getPlayerScore(address))?.persuasionScore || 50;

      // Generate Trump's response using OpenAI
      const trumpResponse = await generateTrumpResponseWithAI(response, currentScore);

      // Calculate new score
      const newScore = analyzeTrumpyResponse(response);

      // Store response data with AI response
      const responseData = {
        address,
        response,
        ai_response: trumpResponse,
        blockNumber: blockNumber || 0,
        transactionHash: transactionHash || '',
        created_at: new Date().toISOString(),
        exists: true,
        score: newScore
      };

      // Store response asynchronously - don't wait for storage
      storage.storePlayerResponse(address, responseData).catch(console.error);
      storage.updatePlayerScore(address, newScore).catch(console.error);

      // Send immediate response
      res.json({
        success: true,
        message: trumpResponse,
        score: newScore,
        game_won: newScore >= 100
      });

    } catch (error: any) {
      console.error("Generate response error:", error);
      res.status(500).json({ 
        error: 'Failed to generate response',
        details: error.message 
      });
    }
  });

  // API route to get response by transaction hash - for blockchain confirmation
  app.get('/api/responses/tx/:hash', async (req, res) => {
    try {
      const { hash } = req.params;

      if (!hash) {
        return res.status(400).json({ 
          success: false,
          error: 'Transaction hash is required'
        });
      }

      const storedResponse = await storage.getPlayerResponseByHash(hash);

      // If we have a stored response, return it
      if (storedResponse && storedResponse.ai_response) {
        return res.json({
          success: true,
          message: storedResponse.ai_response,
          score: storedResponse.score || 50,
          game_won: (storedResponse.score || 50) >= 100
        });
      }

      // If no stored response, return success false but with 200 status
      // This allows the frontend to keep polling
      return res.json({ 
        success: false,
        message: "Still processing your message (and nobody processes messages better than me, believe me!)... Try again!",
        score: 50
      });

    } catch (error: any) {
      console.error("Get response by hash error:", error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to get response',
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