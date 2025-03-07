import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Files to store game data persistently
const SCORES_FILE = path.join(__dirname, '../scores.json');
const WINNERS_FILE = path.join(__dirname, '../winners.json');

// Interface for winner data
interface Winner {
  address: string;
  timestamp: number;
  score: number;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Load persistent scores from file or initialize empty map
  let persistentScores: Record<string, number> = {};
  
  try {
    if (fs.existsSync(SCORES_FILE)) {
      const fileContent = fs.readFileSync(SCORES_FILE, 'utf8');
      persistentScores = JSON.parse(fileContent);
      console.log('Loaded persistent scores:', Object.keys(persistentScores).length);
    } else {
      console.log('No existing scores file found, creating a new one');
      fs.writeFileSync(SCORES_FILE, JSON.stringify({}), 'utf8');
    }
  } catch (error) {
    console.error('Error loading persistent scores:', error);
    // Continue with empty scores if file can't be loaded
  }
  
  // Convert to Map for runtime use
  const scoreCache = new Map<string, number>(Object.entries(persistentScores));
  
  // Load past winners
  let winners: Winner[] = [];
  
  try {
    if (fs.existsSync(WINNERS_FILE)) {
      const fileContent = fs.readFileSync(WINNERS_FILE, 'utf8');
      winners = JSON.parse(fileContent);
      console.log('Loaded past winners:', winners.length);
    } else {
      console.log('No existing winners file found, creating a new one');
      fs.writeFileSync(WINNERS_FILE, JSON.stringify([]), 'utf8');
    }
  } catch (error) {
    console.error('Error loading winners:', error);
    // Continue with empty winners if file can't be loaded
  }

  // Helper function to save scores to disk
  const saveScoresToDisk = () => {
    try {
      const scoresObject = Object.fromEntries(scoreCache.entries());
      fs.writeFileSync(SCORES_FILE, JSON.stringify(scoresObject, null, 2), 'utf8');
      console.log('Saved scores to disk');
    } catch (error) {
      console.error('Error saving scores to disk:', error);
    }
  };
  
  // Helper function to save winners to disk
  const saveWinnersToDisk = () => {
    try {
      fs.writeFileSync(WINNERS_FILE, JSON.stringify(winners, null, 2), 'utf8');
      console.log('Saved winners to disk');
    } catch (error) {
      console.error('Error saving winners to disk:', error);
    }
  };

  // Make sure we save scores when the process is terminated
  process.on('SIGINT', () => {
    console.log('Saving scores before shutdown');
    saveScoresToDisk();
    process.exit(0);
  });

  // Endpoint to get all persuasion scores - this must come BEFORE the dynamic :address route
  app.get('/api/persuasion/all', async (req, res) => {
    try {
      // Convert Map to Object for JSON response
      const scores = Object.fromEntries(
        Array.from(scoreCache.entries()).map(([address, score]) => [
          address, 
          { score }
        ])
      );
      
      res.json(scores);
    } catch (error) {
      console.error('Error getting all persuasion scores:', error);
      res.status(500).json({ error: 'Failed to get all persuasion scores' });
    }
  });

  app.get('/api/persuasion/:address', async (req, res) => {
    try {
      const { address } = req.params;
      
      // Get score from cache or use 50 as default
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
      const { score, gameOver } = req.body;

      if (typeof score !== 'number' || score < 0 || score > 100) {
        return res.status(400).json({ error: 'Invalid score value' });
      }

      // If game is over, don't update scores
      if (gameOver) {
        return res.status(403).json({ error: 'Game is over. No more updates allowed.' });
      }

      // Update score in memory
      scoreCache.set(address, score);
      
      // Save to disk after updating
      saveScoresToDisk();
      
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
      
      // Save to disk after deletion
      saveScoresToDisk();
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error clearing persuasion score:', error);
      res.status(500).json({ error: 'Failed to clear persuasion score' });
    }
  });
  
  // Endpoint to get game winners
  app.get('/api/winners', async (req, res) => {
    try {
      res.json(winners);
    } catch (error) {
      console.error('Error getting winners:', error);
      res.status(500).json({ error: 'Failed to get winners' });
    }
  });
  
  // Endpoint to register a new winner
  app.post('/api/winners', async (req, res) => {
    try {
      const { address } = req.body;
      
      if (!address) {
        return res.status(400).json({ error: 'Winner address is required' });
      }
      
      // Get score for this address
      const score = scoreCache.get(address) ?? 0;
      
      // Create new winner entry
      const newWinner: Winner = {
        address,
        score,
        timestamp: Date.now()
      };
      
      // Check if this address is already in winners
      const existingWinnerIndex = winners.findIndex(w => w.address === address);
      
      if (existingWinnerIndex >= 0) {
        // Update existing winner
        winners[existingWinnerIndex] = newWinner;
      } else {
        // Add new winner
        winners.push(newWinner);
      }
      
      // Save winners to disk
      saveWinnersToDisk();
      
      res.status(201).json({ success: true, winner: newWinner });
    } catch (error) {
      console.error('Error registering winner:', error);
      res.status(500).json({ error: 'Failed to register winner' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}