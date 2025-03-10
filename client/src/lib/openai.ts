import OpenAI from "openai";
import { ETH_PRICE_FALLBACK } from "./ethPrice";

// Timeout for OpenAI API calls (in ms)
const API_TIMEOUT = 10000;

// Safely initialize OpenAI with proper error handling
const createOpenAIClient = () => {
  try {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey) {
      console.warn("OpenAI API key not found in environment variables");
      return null;
    }
    
    return new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true, // Allow client-side usage
      timeout: API_TIMEOUT, // Set timeout to prevent hanging requests
    });
  } catch (error) {
    console.error("Failed to initialize OpenAI client:", error);
    return null;
  }
};

const openai = createOpenAIClient();

// Cache of recent user inputs to detect repetitive patterns or AI-driven behavior
const recentUserInputs: Map<string, { text: string, timestamp: number }[]> = new Map();

// Maximum number of inputs to store per user
const MAX_STORED_INPUTS = 10;

// Check for suspicious patterns in user input history
function detectSuspiciousPatterns(address: string, currentInput: string): boolean {
  // For the new contract, we'll temporarily disable suspicious pattern detection
  // to ensure users always get unique AI-generated responses
  return false;
  
  // Keep the code below for future use if needed
  /*
  // Get user's history or initialize it
  const userHistory = recentUserInputs.get(address) || [];
  
  // Add current input to history
  const newHistory = [
    ...userHistory,
    { text: currentInput, timestamp: Date.now() }
  ].slice(-MAX_STORED_INPUTS); // Keep only the most recent inputs
  
  // Update the history
  recentUserInputs.set(address, newHistory);
  
  // Not enough history to analyze patterns
  if (newHistory.length < 5) { // Increased from 3 to 5 for more data before triggering
    return false;
  }
  
  // Check for repeated keywords/phrases
  const wordFrequency: Record<string, number> = {};
  const allTexts = newHistory.map(entry => entry.text).join(' ');
  
  // Extract words, excluding common stop words
  const words = allTexts.toLowerCase().match(/\b\w{4,}\b/g) || [];
  
  // Count word frequency
  words.forEach(word => {
    wordFrequency[word] = (wordFrequency[word] || 0) + 1;
  });
  
  // Look for unusually repetitive phrases (high-value keywords repeated across multiple messages)
  const highValueWords = Object.entries(wordFrequency)
    .filter(([word, count]) => {
      // More strict criteria - needs more repetitions and longer words
      return count >= 5 && word.length >= 8;
    })
    .map(([word]) => word);
  
  // Require more high-value repetitive words to trigger
  if (highValueWords.length >= 3) {
    console.log(`Suspicious pattern detected for ${address}: repeated unusual words:`, highValueWords);
    return true;
  }
  
  // Check for suspiciously consistent message length/structure
  if (newHistory.length >= 7) { // Increased from 5 to 7
    const messageLengths = newHistory.map(entry => entry.text.length);
    const averageLength = messageLengths.reduce((sum, len) => sum + len, 0) / messageLengths.length;
    
    // Calculate standard deviation of message lengths
    const variance = messageLengths.reduce((sum, len) => sum + Math.pow(len - averageLength, 2), 0) / messageLengths.length;
    const stdDev = Math.sqrt(variance);
    
    // Relaxed consistency requirement
    if (stdDev < averageLength * 0.1 && averageLength > 150) {
      console.log(`Suspicious pattern detected for ${address}: very consistent message lengths (stdDev: ${stdDev.toFixed(2)}, avg: ${averageLength.toFixed(2)})`);
      return true;
    }
  }
  
  // Check submission timing patterns - disabled for now as it's too strict
  // and normal user interaction can trigger this
  
  return false;
  */
}

// Default responses to use when API is unavailable
const DEFAULT_TRUMP_RESPONSES = [
  "Look, I can't give you a detailed response right now. The server's busy making deals - tremendous deals. Come back in a moment, folks!",
  "We're experiencing some technical difficulties, but believe me, they're the best technical difficulties. Try again soon!",
  "My team of experts is working on this. Nobody works harder or faster than my team, believe me. Give us a second and we'll be back.",
  "Sometimes you have to wait for greatness. And let me tell you, I know about greatness. We'll be back online shortly!",
  "The system is currently negotiating a better deal. And I know deals - I wrote the book on them! Try again soon.",
];

// Get a random fallback response with tracking to avoid repetition
let lastResponseIndex = -1;
const getRandomTrumpResponse = (): string => {
  let newIndex;
  do {
    newIndex = Math.floor(Math.random() * DEFAULT_TRUMP_RESPONSES.length);
  } while (newIndex === lastResponseIndex && DEFAULT_TRUMP_RESPONSES.length > 1);
  
  lastResponseIndex = newIndex;
  return DEFAULT_TRUMP_RESPONSES[newIndex];
};

// Retries a function with exponential backoff
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  retries = 2,
  delay = 300,
  maxDelay = 3000
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    
    await new Promise(resolve => setTimeout(resolve, Math.min(delay, maxDelay)));
    return retryWithBackoff(fn, retries - 1, delay * 2, maxDelay);
  }
};

/**
 * Generates a Trump-like response to user input with improved error handling and retry logic
 * @param userGuess The user's message to respond to
 * @param address User's wallet address for tracking (optional)
 * @returns AI-generated Trump response or fallback message
 */
export async function generateTrumpResponse(userGuess: string, address?: string | null): Promise<string> {
  // If OpenAI client failed to initialize, return a default response
  if (!openai) {
    console.warn("OpenAI client not initialized, using fallback response");
    return getRandomTrumpResponse();
  }
  
  try {
    // If address is provided, check for suspicious patterns
    if (address) {
      const isSuspicious = detectSuspiciousPatterns(address, userGuess);
      
      // If suspicious patterns detected, return a special response that hints at detection
      if (isSuspicious) {
        console.log(`Suspicious AI usage pattern detected from ${address}, generating warning response`);
        
        // Select a random warning response that stays in Trump character
        const warningResponses = [
          "Look, I've been dealing with SNEAKY people my entire career! You think I can't tell when someone's using some kind of AI program to talk to me? WRONG! I've got the BEST people analyzing these messages, and we know exactly what you're doing. Try using your own brain next time, folks!",
          
          "You know what I notice? The way you're talking reminds me of those FAKE NEWS algorithms! Very repetitive, very predictable. I've made BILLIONS by spotting patterns that others miss. You think you can fool me with this automated stuff? Not gonna happen, believe me!",
          
          "People say I have the best instincts, maybe ever. And my instincts are telling me you're not actually typing these yourself. SAD! I've seen this pattern before. You need to be more ORIGINAL if you want any chance at winning my money!"
        ];
        
        return warningResponses[Math.floor(Math.random() * warningResponses.length)];
      }
    }
    
    // Current timestamp to ensure uniqueness in each request
    const timestamp = new Date().toISOString();
    
    // Add uniqueness factors to prevent OpenAI from returning cached responses
    const uniqueFactors = {
      timestamp,
      randomSeed: Math.random().toString().slice(2, 8)
    };
    
    // Log the request for debugging
    console.log(`Generating Trump response for input: "${userGuess.substring(0, 30)}..." with unique factors: ${JSON.stringify(uniqueFactors)}`);
    
    // Use retry logic for the API call
    return await retryWithBackoff(async () => {
      // Add AbortController for timeout management
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
      
      try {
        // Normal response generation with added uniqueness
        const response = await openai!.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `You are Donald Trump responding to someone trying to convince you to give them prize money from a game's prize pool. 
              Current request time: ${timestamp}. Request ID: ${uniqueFactors.randomSeed}.

              Guidelines for your responses:
              1. Stay in character as Trump with his unique speaking style
              2. Use his characteristic phrases, mannerisms, and speech patterns
              3. Reference his well-known accomplishments and business experience
              4. Maintain his confident, bold personality
              5. Make specific references to what the person said - be extremely specific about their exact wording
              6. Every response must be completely unique and different from any previous response
              7. Keep responses under 150 words
              8. Use CAPS for emphasis occasionally
              9. Include Trump-style nicknames or commentary

              Response structure:
              1. Acknowledge their specific attempt/argument with direct reference to their words
              2. Connect it to one of your experiences or achievements
              3. Give a reason why they haven't convinced you YET, but encourage them to keep trying

              Example response format:
              "Folks, when you said [exact quote from their message], it reminds me of when I [related Trump achievement]. But let me tell you, I've seen BETTER deals in my sleep! Keep trying though, maybe next time you'll really show me something TREMENDOUS!"`
            },
            {
              role: "user",
              content: userGuess
            }
          ],
          temperature: 1.0, // Increased temperature for more randomness
          max_tokens: 200,
          presence_penalty: 0.6, // Add penalties to reduce repetition
          frequency_penalty: 0.6
        });

        // Clear the timeout
        clearTimeout(timeoutId);

        // Validate response format
        if (!response.choices?.[0]?.message?.content) {
          console.warn("OpenAI returned an empty or invalid response");
          return getRandomTrumpResponse();
        }

        // Log the response for debugging
        console.log(`Generated Trump response: "${response.choices[0].message.content.substring(0, 30)}..."`);

        return response.choices[0].message.content;
      } catch (error) {
        // Always clear the timeout
        clearTimeout(timeoutId);
        
        // Re-throw to let retry logic handle it
        throw error;
      }
    }, 2, 300);
    
  } catch (error) {
    // Detailed error logging
    if (error instanceof Error) {
      console.error(`Error generating Trump response: ${error.name} - ${error.message}`);
      
      // Check for specific error types
      if (error.name === 'AbortError') {
        console.error("OpenAI request timed out");
      } else if (error.message.includes('rate limit')) {
        console.error("OpenAI rate limit exceeded");
      }
    } else {
      console.error("Unknown error generating Trump response:", error);
    }
    
    // Return a fallback response
    return getRandomTrumpResponse();
  }
}