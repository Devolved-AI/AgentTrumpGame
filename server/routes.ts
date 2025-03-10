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
const GAME_TIMERS_FILE = path.join(__dirname, '../game_timers.json');

// Interface for winner data
interface Winner {
  address: string;
  timestamp: number;
  score: number;
}

// Enhanced interface for score data with contract association
interface ScoreData {
  score: number;
  contractAddress: string | null;
  lastUpdated: number;
}

// Interface for game timer state
interface GameTimerState {
  contractAddress: string;
  startTime: number;
  gameStarted: boolean;
  gameId: string;
  gameEndTime?: number;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Game timer state - used to track game start times for each contract
  let gameTimerState: Record<string, GameTimerState> = {};
  
  // Load persistent scores from file or initialize empty map
  let persistentScores: Record<string, ScoreData | number> = {};
  
  // Load game timer states if available
  try {
    if (fs.existsSync(GAME_TIMERS_FILE)) {
      const fileContent = fs.readFileSync(GAME_TIMERS_FILE, 'utf8');
      gameTimerState = JSON.parse(fileContent);
      console.log('Loaded game timer states:', Object.keys(gameTimerState).length);
    } else {
      console.log('No existing game timers file found, creating a new one');
      fs.writeFileSync(GAME_TIMERS_FILE, JSON.stringify({}), 'utf8');
    }
  } catch (error) {
    console.error('Error loading game timer states:', error);
    // Continue with empty game timer state if file can't be loaded
  }
  
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
  
  // Convert to Map for runtime use with proper ScoreData objects
  const scoreCache = new Map<string, ScoreData>();
  
  // Process existing scores and convert any legacy format (just number) to ScoreData
  Object.entries(persistentScores).forEach(([address, data]) => {
    // Handle legacy format (just number)
    if (typeof data === 'number') {
      scoreCache.set(address, {
        score: data,
        contractAddress: null,
        lastUpdated: Date.now()
      });
    } else {
      // Already in ScoreData format
      scoreCache.set(address, data);
    }
  });
  
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
  
  // Helper function to save game timer states to disk
  const saveGameTimersToDisk = () => {
    try {
      fs.writeFileSync(GAME_TIMERS_FILE, JSON.stringify(gameTimerState, null, 2), 'utf8');
      console.log('Saved game timer states to disk');
    } catch (error) {
      console.error('Error saving game timer states to disk:', error);
    }
  };

  // Make sure we save scores when the process is terminated
  process.on('SIGINT', () => {
    console.log('Saving scores before shutdown');
    saveScoresToDisk();
    process.exit(0);
  });

  // Add an endpoint to handle contract address changes
  app.post('/api/contract', async (req, res) => {
    try {
      const { contractAddress, defaultScore = 25 } = req.body;
      const scoreValue = Number(defaultScore);
      const currentTime = Date.now();
      
      if (!contractAddress) {
        return res.status(400).json({ error: 'Contract address is required' });
      }
      
      // Create or update game timer state for this contract
      const gameId = `game_${currentTime}`;
      gameTimerState[contractAddress] = {
        contractAddress,
        startTime: currentTime,
        gameStarted: true,
        gameId
      };
      
      console.log(`Set up new game timer for contract ${contractAddress} with gameId ${gameId}`);
      
      // Validate the score
      if (isNaN(scoreValue) || scoreValue < 0 || scoreValue > 100) {
        console.error(`Invalid score value provided: ${defaultScore}, using default of 99`);
        // Use 99 as a fallback
        const fallbackScore = 99;
        
        // Reset all scores for users with a different contract
        Array.from(scoreCache.entries()).forEach(([address, data]) => {
          if (data.contractAddress !== contractAddress) {
            scoreCache.set(address, {
              score: fallbackScore,
              contractAddress: contractAddress,
              lastUpdated: currentTime
            });
            console.log(`Reset score for ${address} to ${fallbackScore} due to contract change to ${contractAddress}`);
          }
        });
        
        // Save updated scores to disk
        saveScoresToDisk();
        
        return res.json({ 
          success: true, 
          message: `Contract address updated and scores reset to ${fallbackScore}`,
          defaultScore: fallbackScore,
          contractAddress,
          gameTimerState: gameTimerState[contractAddress]
        });
      }
      
      // Reset all scores for any users associated with a different contract
      Array.from(scoreCache.entries()).forEach(([address, data]) => {
        if (data.contractAddress !== contractAddress) {
          // Reset to provided default score (25 if not specified)
          scoreCache.set(address, {
            score: scoreValue,
            contractAddress: contractAddress,
            lastUpdated: currentTime
          });
          console.log(`Reset score for ${address} to ${scoreValue} due to contract change to ${contractAddress}`);
        }
      });
      
      // Save updated scores to disk
      saveScoresToDisk();
      
      res.json({ 
        success: true, 
        message: `Contract address updated and scores reset to ${scoreValue}`,
        defaultScore: scoreValue,
        contractAddress,
        gameTimerState: gameTimerState[contractAddress]
      });
    } catch (error) {
      console.error('Error updating contract address:', error);
      res.status(500).json({ error: 'Failed to update contract address' });
    }
  });
  
  // Add endpoint to reset persuasion scores for a specific address
  app.post('/api/persuasion/reset', async (req, res) => {
    try {
      const { address, defaultScore = 99 } = req.body;
      
      if (!address) {
        return res.status(400).json({ error: 'Address is required' });
      }
      
      // Reset the score to defaultScore (25 by default) for the specified address
      const existingData = scoreCache.get(address.toLowerCase());
      const currentContract = existingData?.contractAddress || null;
      
      scoreCache.set(address.toLowerCase(), {
        score: defaultScore,
        contractAddress: currentContract,
        lastUpdated: Date.now()
      });
      
      console.log(`Manually reset persuasion score for ${address} to ${defaultScore}`);
      
      // Save updated scores to disk
      saveScoresToDisk();
      
      res.json({ 
        success: true, 
        message: `Persuasion score reset to ${defaultScore}`,
        address: address.toLowerCase(),
        score: defaultScore
      });
    } catch (error) {
      console.error('Error resetting persuasion score:', error);
      res.status(500).json({ error: 'Failed to reset persuasion score' });
    }
  });

  // Endpoint to reset all persuasion scores
  app.post('/api/persuasion/reset-all', async (req, res) => {
    try {
      const { contractAddress, defaultScore = 99 } = req.body;
      const scoreValue = Number(defaultScore);
      
      if (!contractAddress) {
        return res.status(400).json({ error: 'Contract address is required' });
      }
      
      // Validate the score
      if (isNaN(scoreValue) || scoreValue < 0 || scoreValue > 100) {
        console.error(`Invalid score value provided: ${defaultScore}, using default of 99`);
        // Use 99 as a fallback
        const fallbackScore = 99;
        
        // Reset all scores to the fallback value
        Array.from(scoreCache.keys()).forEach((address) => {
          scoreCache.set(address, {
            score: fallbackScore,
            contractAddress: contractAddress,
            lastUpdated: Date.now()
          });
        });
        
        // Save updated scores to disk
        saveScoresToDisk();
        
        console.log(`Reset all persuasion scores to ${fallbackScore} for contract ${contractAddress}`);
        return res.json({ 
          success: true, 
          message: `All persuasion scores reset to ${fallbackScore} for contract ${contractAddress}`,
          affectedAddresses: Array.from(scoreCache.keys())
        });
      }
      
      // Reset all scores to the default value (99 if not specified)
      Array.from(scoreCache.keys()).forEach((address) => {
        scoreCache.set(address, {
          score: scoreValue,
          contractAddress: contractAddress,
          lastUpdated: Date.now()
        });
      });
      
      // Save updated scores to disk
      saveScoresToDisk();
      
      console.log(`Reset all persuasion scores to ${scoreValue} for contract ${contractAddress}`);
      res.json({ 
        success: true, 
        message: `All persuasion scores reset to ${scoreValue} for contract ${contractAddress}`,
        affectedAddresses: Array.from(scoreCache.keys())
      });
    } catch (error) {
      console.error('Error resetting persuasion scores:', error);
      res.status(500).json({ error: 'Failed to reset persuasion scores' });
    }
  });

  // Endpoint to get all persuasion scores - this must come BEFORE the dynamic :address route
  app.get('/api/persuasion/all', async (req, res) => {
    try {
      // Include the contract address in the response
      const scores = Object.fromEntries(
        Array.from(scoreCache.entries()).map(([address, data]) => [
          address, 
          { 
            score: data.score,
            contractAddress: data.contractAddress
          }
        ])
      );
      
      res.json(scores);
    } catch (error) {
      console.error('Error getting all persuasion scores:', error);
      res.status(500).json({ error: 'Failed to get all persuasion scores' });
    }
  });
  
  // Endpoint to get game timer state for a specific contract
  app.get('/api/game/timer/:contractAddress', async (req, res) => {
    try {
      const { contractAddress } = req.params;
      
      if (!contractAddress) {
        return res.status(400).json({ error: 'Contract address is required' });
      }
      
      // Get game timer state for this contract
      const timerState = gameTimerState[contractAddress];
      
      if (!timerState) {
        // If no timer state exists, create one with the current time
        const currentTime = Date.now();
        const gameId = `game_${currentTime}`;
        
        gameTimerState[contractAddress] = {
          contractAddress,
          startTime: currentTime,
          gameStarted: true,
          gameId
        };
        
        // Save the timer state to persistence
        try {
          fs.writeFileSync(
            path.join(__dirname, '../game_timers.json'),
            JSON.stringify(gameTimerState, null, 2)
          );
        } catch (e) {
          console.error('Failed to save game timer state to file:', e);
        }
        
        console.log(`Created new game timer for ${contractAddress} on first request`);
        
        // Calculate game values
        const elapsedTime = 0;
        const gameLength = 300; // 5 minutes in seconds
        const remainingTime = gameLength;
        
        return res.json({
          ...gameTimerState[contractAddress],
          elapsedTime,
          remainingTime,
          gameLength
        });
      }
      
      // Calculate elapsed time since game started
      const elapsedTime = Math.floor((Date.now() - timerState.startTime) / 1000);
      const gameLength = 300; // 5 minutes in seconds
      const remainingTime = Math.max(0, gameLength - elapsedTime);
      
      // Check if the game is over based on timer
      if (remainingTime <= 0 && !timerState.gameEndTime) {
        // Mark game as ended
        timerState.gameEndTime = Date.now();
        
        // Save the updated state
        try {
          fs.writeFileSync(
            path.join(__dirname, '../game_timers.json'),
            JSON.stringify(gameTimerState, null, 2)
          );
        } catch (e) {
          console.error('Failed to save game end time to file:', e);
        }
        
        console.log(`Game timer expired for contract ${contractAddress}`);
      }
      
      // Return timer state with remaining time calculation
      res.json({
        ...timerState,
        elapsedTime,
        remainingTime,
        gameLength
      });
    } catch (error) {
      console.error('Error getting game timer state:', error);
      res.status(500).json({ error: 'Failed to get game timer state' });
    }
  });
  
  // Endpoint to reset the game timer for a contract
  app.post('/api/game/timer/reset/:contractAddress', async (req, res) => {
    try {
      const { contractAddress } = req.params;
      
      if (!contractAddress) {
        return res.status(400).json({ error: 'Contract address is required' });
      }
      
      // Create a new game timer state
      const currentTime = Date.now();
      const gameId = `game_${currentTime}`;
      
      gameTimerState[contractAddress] = {
        contractAddress,
        startTime: currentTime,
        gameStarted: true,
        gameId
      };
      
      // Save the timer state to persistence
      try {
        fs.writeFileSync(
          path.join(__dirname, '../game_timers.json'),
          JSON.stringify(gameTimerState, null, 2)
        );
      } catch (e) {
        console.error('Failed to save reset game timer state to file:', e);
      }
      
      console.log(`Reset game timer for ${contractAddress}`);
      
      // Return the new timer state
      const gameLength = 300; // 5 minutes in seconds
      res.json({
        ...gameTimerState[contractAddress],
        elapsedTime: 0,
        remainingTime: gameLength,
        gameLength
      });
    } catch (error) {
      console.error('Error resetting game timer:', error);
      res.status(500).json({ error: 'Failed to reset game timer' });
    }
  });

  app.get('/api/persuasion/:address', async (req, res) => {
    try {
      const { address } = req.params;
      const { contractAddress } = req.query;
      
      // Get score data or create default with 25 score
      const scoreData = scoreCache.get(address) || {
        score: 25, // Default to 25 for new addresses
        contractAddress: null,
        lastUpdated: Date.now()
      };
      
      // If contract address is provided and different from stored one, reset score
      if (contractAddress && contractAddress !== scoreData.contractAddress) {
        console.log(`Contract address change detected: ${scoreData.contractAddress} -> ${contractAddress}`);
        
        // Reset score for new contract to 25
        scoreData.score = 25;
        scoreData.contractAddress = contractAddress as string;
        scoreData.lastUpdated = Date.now();
        
        // Update cache
        scoreCache.set(address, scoreData);
        saveScoresToDisk();
      }
      
      res.json({ 
        score: scoreData.score,
        contractAddress: scoreData.contractAddress,
        lastUpdated: scoreData.lastUpdated 
      });
    } catch (error) {
      console.error('Error getting persuasion score:', error);
      res.status(500).json({ error: 'Failed to get persuasion score' });
    }
  });

  // Rate limiting to prevent rapid-fire submissions typical of AI usage
  // Track submission timestamps by address
  const lastSubmissionTime = new Map<string, number>();
  const submissionCounts = new Map<string, number[]>();
  const MIN_SUBMISSION_INTERVAL = 5000; // 5 seconds minimum between submissions
  
  // Rate limiting function to detect unusual submission patterns
  const checkRateLimit = (address: string): { allowed: boolean; reason?: string } => {
    const now = Date.now();
    const lastTime = lastSubmissionTime.get(address) || 0;
    const timeDiff = now - lastTime;
    
    // Update submission time
    lastSubmissionTime.set(address, now);
    
    // First message is always allowed
    if (lastTime === 0) {
      return { allowed: true };
    }
    
    // Check if submission is too rapid (5 seconds minimum)
    if (timeDiff < MIN_SUBMISSION_INTERVAL) {
      console.log(`Rate limiting triggered: ${address} sent messages too quickly (${timeDiff}ms)`);
      return { 
        allowed: false, 
        reason: `Messages must be at least ${MIN_SUBMISSION_INTERVAL/1000} seconds apart` 
      };
    }
    
    // Track submission pattern over time (last 10 minutes)
    const TEN_MINUTES = 10 * 60 * 1000;
    const recentSubmissions = submissionCounts.get(address) || [];
    
    // Add current timestamp to submissions, remove old ones
    const updatedSubmissions = [
      ...recentSubmissions.filter(time => now - time < TEN_MINUTES),
      now
    ];
    submissionCounts.set(address, updatedSubmissions);
    
    // If user has submitted too many times in a short period, flag as suspicious
    if (updatedSubmissions.length > 10) {
      const oldestRecentSubmission = updatedSubmissions[0];
      const timeSpan = now - oldestRecentSubmission;
      const averageInterval = timeSpan / (updatedSubmissions.length - 1);
      
      // If average interval is too short (under 20 seconds), this is suspicious behavior
      if (averageInterval < 20000 && updatedSubmissions.length >= 5) {
        console.log(`Rate limiting triggered: ${address} has suspicious submission pattern (avg ${averageInterval.toFixed(0)}ms between msgs)`);
        return { 
          allowed: false, 
          reason: 'Unusual submission pattern detected - please wait longer between messages' 
        };
      }
    }
    
    return { allowed: true };
  };
  
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
      const { score, gameOver, message, contractAddress } = req.body;

      if (typeof score !== 'number' || score < 0 || score > 100) {
        return res.status(400).json({ error: 'Invalid score value' });
      }

      // If game is over, don't update scores
      if (gameOver) {
        return res.status(403).json({ error: 'Game is over. No more updates allowed.' });
      }
      
      // Get existing score data or create default
      const existingData = scoreCache.get(address) || {
        score: 25, // Default to 25 for new addresses
        contractAddress: null,
        lastUpdated: Date.now()
      };
      
      // Apply rate limiting if message is provided (genuine user interaction)
      if (message) {
        // Check if rate limit is exceeded
        const rateLimitCheck = checkRateLimit(address);
        if (!rateLimitCheck.allowed) {
          console.log(`Rate limit exceeded for ${address}: ${rateLimitCheck.reason}`);
          
          // Apply reduced penalty for rate limit violations (changed from 25 to 10)
          const penalizedScore = Math.max(0, existingData.score - 10);
          
          // Update score with penalty
          const penalizedData = {
            ...existingData,
            score: penalizedScore,
            lastUpdated: Date.now()
          };
          
          scoreCache.set(address, penalizedData);
          saveScoresToDisk();
          
          return res.status(429).json({ 
            error: 'Rate limit exceeded',
            penalizedScore,
            message: `${rateLimitCheck.reason}. This has resulted in a score penalty.`
          });
        }
        
        // Enhanced server-side AI detection if message is provided
        const isAiGenerated = detectAiContent(message);
        if (isAiGenerated) {
          // Apply a server-side penalty for AI-generated content
          // This ensures that even if client-side detection is bypassed, the server will catch it
          console.log(`Server detected AI content from ${address}, applying penalty`);
          
          // Apply minimal penalty (changed from 25 to 5, now reduced further)
          const penalizedScore = Math.max(0, existingData.score - 5);
          
          // Update with penalized score
          const penalizedData = {
            ...existingData,
            score: penalizedScore,
            lastUpdated: Date.now()
          };
          
          scoreCache.set(address, penalizedData);
          saveScoresToDisk();
          
          return res.status(403).json({ 
            error: 'AI-generated content detected', // Keep this the same for code compatibility
            penalizedScore,
            message: 'Slop detected in your messages. This results in a score penalty.'
          });
        }
      }

      // Update score data
      const updatedData: ScoreData = {
        score: score,
        contractAddress: contractAddress || existingData.contractAddress,
        lastUpdated: Date.now()
      };
      
      // Update score in memory
      scoreCache.set(address, updatedData);
      
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
      
      // Get score data for this address
      const scoreData = scoreCache.get(address) || {
        score: 25, // Default to 25 for new addresses
        contractAddress: null,
        lastUpdated: Date.now()
      };
      
      // Create new winner entry
      const newWinner: Winner = {
        address,
        score: scoreData.score,
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