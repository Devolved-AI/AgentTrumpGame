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

  // Patterns to detect AI-generated content for server-side validation
  const AI_PATTERNS = [
    'as an ai', 'as a language model', 'assist you', 'happy to help',
    'based on my training', 'my programming', 'cannot provide',
    'i apologize', 'im not able to', 'ethical considerations',
    'my knowledge cutoff', 'to summarize', 'in conclusion'
  ];
  
  // Enhanced server-side function to detect AI-generated content
  const detectAiContent = (message: string): boolean => {
    if (!message) return false;
    
    const textLower = message.toLowerCase();
    
    // Pattern matching for common AI phrases
    const hasAiPattern = AI_PATTERNS.some(pattern => 
      textLower.includes(pattern.toLowerCase())
    );
    
    if (hasAiPattern) {
      console.log('Server detected AI pattern in message');
      return true;
    }
    
    // Check for unnatural formality in casual conversation
    const hasUnusualFormality = 
      (textLower.includes(". furthermore,") || 
       textLower.includes(". additionally,") || 
       textLower.includes(". moreover,") ||
       textLower.includes("in conclusion") || 
       textLower.includes("to summarize") ||
       (textLower.includes("firstly") && textLower.includes("secondly")) ||
       (textLower.includes("first point") && textLower.includes("second point")));
    
    if (hasUnusualFormality) {
      console.log('Server detected unusually formal language in message');
      return true;
    }
    
    // Check for suspiciously high entropy in long messages
    if (message.length > 500) {
      const uniqueChars = new Set(message.split('')).size;
      const entropyScore = uniqueChars / message.length;
      
      if (entropyScore > 0.4) {
        console.log(`Server detected high entropy (${entropyScore.toFixed(2)}) in long message`);
        return true;
      }
    }
    
    // Additional server-side heuristics - ratio checks
    // AI often writes with very balanced sentence lengths
    if (message.length > 100) {
      const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 0);
      if (sentences.length >= 3) {
        // Calculate average sentence length
        const avgLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
        
        // Calculate standard deviation of sentence lengths
        const variance = sentences.reduce((sum, s) => sum + Math.pow(s.length - avgLength, 2), 0) / sentences.length;
        const stdDev = Math.sqrt(variance);
        
        // Human writing typically has more sentence length variation
        // Very low standard deviation suggests AI-generated content
        if (stdDev < avgLength * 0.3) {
          console.log(`Server detected suspiciously consistent sentence lengths (stdDev: ${stdDev.toFixed(2)}, avg: ${avgLength.toFixed(2)})`);
          return true;
        }
      }
    }
    
    return false;
  };

  app.post('/api/persuasion/:address', async (req, res) => {
    try {
      const { address } = req.params;
      const { score, gameOver, message } = req.body;

      if (typeof score !== 'number' || score < 0 || score > 100) {
        return res.status(400).json({ error: 'Invalid score value' });
      }

      // If game is over, don't update scores
      if (gameOver) {
        return res.status(403).json({ error: 'Game is over. No more updates allowed.' });
      }
      
      // Enhanced server-side AI detection if message is provided
      if (message) {
        const isAiGenerated = detectAiContent(message);
        if (isAiGenerated) {
          // Apply a server-side penalty for AI-generated content
          // This ensures that even if client-side detection is bypassed, the server will catch it
          console.log(`Server detected AI content from ${address}, applying penalty`);
          
          // Get current score
          const currentScore = scoreCache.get(address) ?? 50;
          
          // Apply significant penalty (more severe than client-side penalty)
          const penalizedScore = Math.max(0, currentScore - 75);
          
          // Update with penalized score
          scoreCache.set(address, penalizedScore);
          saveScoresToDisk();
          
          return res.status(403).json({ 
            error: 'AI-generated content detected',
            penalizedScore,
            message: 'Using AI to play the game is not allowed and results in a significant score penalty.'
          });
        }
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