import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Allow client-side usage
});

// Cache of recent user inputs to detect repetitive patterns or AI-driven behavior
const recentUserInputs: Map<string, { text: string, timestamp: number }[]> = new Map();

// Maximum number of inputs to store per user
const MAX_STORED_INPUTS = 10;

// Check for suspicious patterns in user input history
function detectSuspiciousPatterns(address: string, currentInput: string): boolean {
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
  if (newHistory.length < 3) {
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
      // Repeated unusual words are a strong indicator of AI or script usage
      return count >= 3 && word.length >= 6;
    })
    .map(([word]) => word);
  
  // If we find repeated unusual words, this might be an AI-generated pattern
  if (highValueWords.length >= 2) {
    console.log(`Suspicious pattern detected for ${address}: repeated unusual words:`, highValueWords);
    return true;
  }
  
  // Check for suspiciously consistent message length/structure
  if (newHistory.length >= 5) {
    const messageLengths = newHistory.map(entry => entry.text.length);
    const averageLength = messageLengths.reduce((sum, len) => sum + len, 0) / messageLengths.length;
    
    // Calculate standard deviation of message lengths
    const variance = messageLengths.reduce((sum, len) => sum + Math.pow(len - averageLength, 2), 0) / messageLengths.length;
    const stdDev = Math.sqrt(variance);
    
    // Very consistent message lengths across multiple messages can indicate AI or scripts
    // Human typing has natural variation
    if (stdDev < averageLength * 0.2 && averageLength > 100) {
      console.log(`Suspicious pattern detected for ${address}: very consistent message lengths (stdDev: ${stdDev.toFixed(2)}, avg: ${averageLength.toFixed(2)})`);
      return true;
    }
  }
  
  // Check submission timing patterns
  if (newHistory.length >= 3) {
    const intervals: number[] = [];
    for (let i = 1; i < newHistory.length; i++) {
      intervals.push(newHistory[i].timestamp - newHistory[i-1].timestamp);
    }
    
    // Calculate average and standard deviation of intervals
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const varianceInterval = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    const stdDevInterval = Math.sqrt(varianceInterval);
    
    // Very consistent timing between messages can indicate automation
    if (stdDevInterval < avgInterval * 0.3 && intervals.length >= 3) {
      console.log(`Suspicious pattern detected for ${address}: very consistent submission timing (stdDev: ${stdDevInterval.toFixed(2)}, avg: ${avgInterval.toFixed(2)})`);
      return true;
    }
  }
  
  return false;
}

export async function generateTrumpResponse(userGuess: string, address?: string | null): Promise<string> {
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
    
    // Normal response generation
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are Donald Trump responding to someone trying to convince you to give them prize money from a game's prize pool. 

          Guidelines for your responses:
          1. Stay in character as Trump with his unique speaking style
          2. Use his characteristic phrases, mannerisms, and speech patterns
          3. Reference his well-known accomplishments and business experience
          4. Maintain his confident, bold personality
          5. Make specific references to what the person said
          6. Keep responses under 150 words
          7. Use CAPS for emphasis occasionally
          8. Include Trump-style nicknames or commentary

          Response structure:
          1. Acknowledge their specific attempt/argument
          2. Connect it to one of your experiences or achievements
          3. Give a reason why they haven't convinced you YET, but encourage them to keep trying

          Example response format:
          "Folks, this [reference their specific point] reminds me of when I [related Trump achievement]. But let me tell you, I've seen BETTER deals in my sleep! Keep trying though, maybe next time you'll really show me something TREMENDOUS!"`
        },
        {
          role: "user",
          content: userGuess
        }
      ],
      temperature: 0.9,
      max_tokens: 200
    });

    return response.choices[0].message.content || "Believe me, that was not a good try. NEXT!";
  } catch (error) {
    console.error("Error generating Trump response:", error);
    return "Listen folks, we're having some technical difficulties. But we'll be back, bigger and better than ever before!";
  }
}