import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { spawn } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Initialize path to Python script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pythonScriptPath = join(__dirname, '..', 'attached_assets', 'AgentTrump_hard_logic_min.py');

// Function to interact with Python AI agent
async function interactWithAIAgent(address: string, message: string, signature: string, blockNumber: number) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', [
      pythonScriptPath,
      '--address', address,
      '--message', message,
      '--signature', signature,
      '--block-number', blockNumber.toString()
    ]);

    let result = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python script error:', error);
        reject(new Error(`AI Agent error: ${error}`));
      } else {
        try {
          const parsed = JSON.parse(result);
          resolve(parsed);
        } catch (e) {
          reject(new Error('Failed to parse AI agent response'));
        }
      }
    });
  });
}

export function registerRoutes(app: Express): Server {
  // API route to update player score
  app.post('/api/scores', async (req, res) => {
    try {
      const { address, response, blockNumber } = req.body;

      // Get Agent Trump's analysis and response
      const result = await interactWithAIAgent(
        address,
        response,
        req.body.signature || "",
        blockNumber
      );

      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      // Update player's persuasion score in the database
      const updatedScore = await storage.updatePlayerScore(address, result.score);

      res.json({
        ...updatedScore,
        message: result.message,
        gameWon: result.game_won || false
      });
    } catch (error) {
      console.error("Score update error:", error);
      res.status(500).json({ error: 'Failed to update score' });
    }
  });

  // API route to get player score
  app.get('/api/scores/:address', async (req, res) => {
    try {
      const { address } = req.params;
      const score = await storage.getPlayerScore(address);

      if (!score) {
        // If no score exists, create initial score
        const initialScore = await storage.updatePlayerScore(address, 50);
        return res.json(initialScore);
      }

      res.json(score);
    } catch (error) {
      console.error("Get score error:", error);
      res.status(500).json({ error: 'Failed to get score' });
    }
  });

  // API route to add player response
  app.post('/api/responses', async (req, res) => {
    try {
      const { address, response, blockNumber, signature } = req.body;

      // Get AI agent's response and analysis
      const result = await interactWithAIAgent(
        address,
        response,
        signature || "",
        blockNumber
      );

      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      // Store the response in database
      const storedResponse = await storage.addPlayerResponse({
        ...req.body,
        exists: true
      });

      // Update the player's score
      await storage.updatePlayerScore(address, result.score);

      res.json({
        ...storedResponse,
        aiResponse: result.message,
        score: result.score,
        gameWon: result.game_won || false
      });
    } catch (error) {
      console.error("Add response error:", error);
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
      console.error("Get responses error:", error);
      res.status(500).json({ error: 'Failed to get responses' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}