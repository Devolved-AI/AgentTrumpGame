import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { spawn } from "child_process";
import { fileURLToPath } from 'url';
import { dirname, resolve } from "path";

// Get current directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a wrapper for the Python Trump agent
class TrumpAgent {
  private pyProcess: any;

  constructor() {
    const scriptPath = resolve(__dirname, "trump_agent.py");
    this.pyProcess = spawn("python3", [scriptPath]);

    this.pyProcess.stderr.on("data", (data: Buffer) => {
      console.error(`Python Error: ${data}`);
    });
  }

  async evaluate_persuasion(message: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.pyProcess.stdin.write(JSON.stringify({ type: "evaluate", message }) + "\n");

      this.pyProcess.stdout.once("data", (data: Buffer) => {
        try {
          const response = JSON.parse(data.toString());
          resolve(response);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  async generate_response(message: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.pyProcess.stdin.write(JSON.stringify({ type: "generate", message }) + "\n");

      this.pyProcess.stdout.once("data", (data: Buffer) => {
        try {
          const response = JSON.parse(data.toString());
          resolve(response.message);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  reset(): void {
    this.pyProcess.stdin.write(JSON.stringify({ type: "reset" }) + "\n");
  }
}

// Initialize Trump agent
const trumpAgent = new TrumpAgent();

export async function registerRoutes(app: Express): Promise<Server> {
  // Persuasion score endpoints now use in-memory map as fallback
  const scoreCache = new Map<string, number>();

  app.post('/api/trump/message', async (req, res) => {
    try {
      const { message, address } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Invalid message' });
      }

      const evaluation = await trumpAgent.evaluate_persuasion(message);
      const response = await trumpAgent.generate_response(message);

      res.json({
        response,
        evaluation,
      });
    } catch (error) {
      console.error('Error processing Trump message:', error);
      res.status(500).json({ error: 'Failed to process message' });
    }
  });

  app.post('/api/trump/reset/:address', async (req, res) => {
    try {
      const { address } = req.params;
      trumpAgent.reset();
      scoreCache.delete(address);
      res.json({ success: true });
    } catch (error) {
      console.error('Error resetting Trump agent:', error);
      res.status(500).json({ error: 'Failed to reset Trump agent' });
    }
  });

  app.get('/api/persuasion/:address', async (req, res) => {
    try {
      const { address } = req.params;
      const score = scoreCache.get(address) ?? 50;
      res.json({ score });
    } catch (error) {
      console.error('Error getting persuasion score:', error);
      res.status(500).json({ error: 'Failed to get persuasion score' });
    }
  });

  app.post('/api/persuasion/:address', async (req, res) => {
    try {
      const { address } = req.params;
      const { score } = req.body;

      if (typeof score !== 'number' || score < 0 || score > 100) {
        return res.status(400).json({ error: 'Invalid score value' });
      }

      scoreCache.set(address, score);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating persuasion score:', error);
      res.status(500).json({ error: 'Failed to update persuasion score' });
    }
  });

  app.delete('/api/persuasion/:address', async (req, res) => {
    try {
      const { address } = req.params;
      scoreCache.delete(address);
      res.json({ success: true });
    } catch (error) {
      console.error('Error clearing persuasion score:', error);
      res.status(500).json({ error: 'Failed to clear persuasion score' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}