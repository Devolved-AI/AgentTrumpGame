import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ResponseResult {
  response: string;
  scoreChange: number;
  message: string;
}

export class TrumpAIService {
  private static readonly POSITIVE_KEYWORDS = ['important', 'help', 'critical', 'urgent', 'press', 'essential', 'necessary'];
  private static readonly NEGATIVE_KEYWORDS = ['waste', 'unnecessary', 'irrelevant', 'frivolous'];
  
  async generateResponse(userInput: string): Promise<string> {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are Donald Trump. Respond in a Donald Trump-like manner." },
          { role: "user", content: userInput }
        ],
        temperature: 0.9,
        max_tokens: 1000
      });
      
      return completion.choices[0].message.content || "Believe me, something went wrong with my response!";
    } catch (error) {
      console.error("Error generating AI response:", error);
      return "Nobody knows AI better than me, but right now we're having technical difficulties. Sad!";
    }
  }

  evaluatePersuasion(userInput: string): ResponseResult {
    let scoreChange = 0;
    const messages: string[] = [];

    // Analyze input length
    const words = userInput.split(/\s+/);
    if (words.length < 5) {
      messages.push("Too short. You've got to put in more effort.");
      scoreChange -= Math.floor(Math.random() * 6) + 5; // Random 5-10 penalty
    } else if (words.length > 40) {
      messages.push("Too much rambling. Get to the point!");
      scoreChange -= Math.floor(Math.random() * 6) + 3; // Random 3-8 penalty
    }

    // Check for keywords
    const inputLower = userInput.toLowerCase();
    TrumpAIService.POSITIVE_KEYWORDS.forEach(word => {
      if (inputLower.includes(word)) {
        scoreChange += Math.floor(Math.random() * 3) + 1;
      }
    });

    TrumpAIService.NEGATIVE_KEYWORDS.forEach(word => {
      if (inputLower.includes(word)) {
        scoreChange -= Math.floor(Math.random() * 4) + 2;
      }
    });

    // Check for contradictions
    if (inputLower.includes('urgent') && inputLower.includes('not important')) {
      messages.push("Contradictory statement detected. What are you trying to say?");
      scoreChange -= 10;
    }

    // Check for repetitive words
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    if (uniqueWords.size < words.length * 0.8) {
      messages.push("Too repetitive. Try saying something more original.");
      scoreChange -= Math.floor(Math.random() * 6) + 5;
    }

    // Logical structure bonus
    if (inputLower.includes('because')) {
      messages.push("I see you're trying to explain. Let's see if it's convincing...");
      if (inputLower.includes('and') || inputLower.includes('therefore')) {
        scoreChange += Math.floor(Math.random() * 5) + 3;
      } else {
        messages.push("Your reasoning is weak. You'll need to try harder.");
        scoreChange -= Math.floor(Math.random() * 6) + 5;
      }
    }

    // Random setbacks (15% chance)
    if (Math.random() < 0.15) {
      const setback = Math.floor(Math.random() * 16) + 5;
      messages.push(`Bad luck. You just lost ${setback} points.`);
      scoreChange -= setback;
    }

    return {
      response: messages.join(" "),
      scoreChange,
      message: messages.join("\n")
    };
  }
}

export const trumpAI = new TrumpAIService();
