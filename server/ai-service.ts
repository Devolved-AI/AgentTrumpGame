import { exec } from 'child_process';
import { promisify } from 'util';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ResponseResult {
  response: string;
  scoreChange: number;
  message: string;
}

export class TrumpAIService {
  private readonly pythonScript: string;
  private readonly openai: OpenAI;

  constructor() {
    this.pythonScript = path.join(__dirname, 'trump_agent.py');
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateResponse(userInput: string): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
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

  async evaluatePersuasion(userInput: string): Promise<ResponseResult> {
    try {
      // Call the Python script with the OpenAI API key and user input
      const { stdout } = await execAsync(
        `python3 "${this.pythonScript}" "${process.env.OPENAI_API_KEY}" "${userInput.replace(/"/g, '\\"')}"`
      );

      const evaluation = JSON.parse(stdout);

      return {
        response: evaluation.message,
        scoreChange: evaluation.score_change,
        message: evaluation.message
      };
    } catch (error) {
      console.error('Error running Python script:', error);
      return {
        response: "Error evaluating message",
        scoreChange: 0,
        message: "Error evaluating message"
      };
    }
  }
}

export const trumpAI = new TrumpAIService();