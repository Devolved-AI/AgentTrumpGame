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

// Type definitions for AI responses
interface AIResponse {
  success: boolean;
  message: string;
  score: number;
  game_won?: boolean;
}

// Function to interact with Python AI agent with proper typing and error handling
async function interactWithAIAgent(
  address: string,
  message: string,
  signature: string,
  blockNumber: number,
  txHash?: string
): Promise<AIResponse> {
  return new Promise((resolve, reject) => {
    const args = [
      pythonScriptPath,
      '--address', address,
      '--message', message,
      '--signature', signature,
      '--block-number', blockNumber.toString()
    ];

    if (txHash) {
      args.push('--tx-hash', txHash);
    }

    console.log('Executing Python script with args:', args);
    const pythonProcess = spawn('python3', args);

    let result = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
      console.error('Python script error output:', data.toString());
    });

    pythonProcess.on('error', (err) => {
      console.error('Failed to start Python process:', err);
      reject(new Error('Failed to start AI agent process'));
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python script error:', error);
        reject(new Error(`AI Agent error: ${error}`));
        return;
      }

      try {
        const parsed: AIResponse = JSON.parse(result);
        resolve(parsed);
      } catch (e) {
        console.error('Failed to parse AI agent response:', result);
        reject(new Error('Failed to parse AI agent response'));
      }
    });
  });
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
      // Get Agent Trump's analysis and response
      const result = await interactWithAIAgent(
        address,
        response,
        req.body.signature || "",
        blockNumber,
        transactionHash
      );

      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      // Update player's persuasion score in Redis (handled by Python script)
      res.json({
        message: result.message,
        score: result.score,
        gameWon: result.game_won || false
      });
    } catch (error: any) {
      console.error("Score update error:", error);
      res.status(500).json({ error: 'Failed to update score', details: error.message });
    }
  });

  // API route to get player score (score is now handled by Python script with Redis)
  app.get('/api/scores/:address', async (req, res) => {
    try {
      const { address } = req.params;
      if (!address) {
        return res.status(400).json({ error: 'Address is required' });
      }
      const result = await interactWithAIAgent(
        address,
        "",  // Empty message for score query
        "",  // No signature needed for score query
        0,   // Block number not needed for score query
        undefined
      );

      res.json({
        score: result.score || 50  // Default to 50 if no score exists
      });
    } catch (error: any) {
      console.error("Get score error:", error);
      res.status(500).json({ error: 'Failed to get score', details: error.message });
    }
  });

  // API route to handle player responses
  app.post('/api/responses', async (req, res) => {
    try {
      const { address, response, blockNumber, signature, transactionHash } = req.body;

      if (!address || !response || !blockNumber || !transactionHash) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          details: 'address, response, blockNumber, and transactionHash are required'
        });
      }

      console.log('Processing response with transaction hash:', transactionHash);

      // Get AI agent's response and analysis
      const result = await interactWithAIAgent(
        address,
        response,
        signature || "",
        blockNumber,
        transactionHash
      );

      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      res.json({
        message: result.message,
        score: result.score,
        gameWon: result.game_won || false
      });
    } catch (error: any) {
      console.error("Add response error:", error);
      res.status(500).json({ 
        error: 'Failed to add response',
        details: error.message 
      });
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
          const result = await interactWithAIAgent(
            "",  // Empty address for response query
            "",  // Empty message for response query
            "",  // No signature needed for response query
            0,   // Block number not needed for response query
            hash // Pass the transaction hash
          );

          if (result.success) {
            return res.json({
              message: result.message,
              score: result.score,
              gameWon: result.game_won || false
            });
          }
        } catch (error) {
          console.error(`Attempt ${attempt + 1} failed:`, error);

          // If it's the last attempt, throw the error
          if (attempt === maxRetries - 1) throw error;
        }

        // Calculate exponential backoff delay
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Attempt ${attempt + 1}: Waiting ${delay}ms before retry...`);
        await sleep(delay);
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