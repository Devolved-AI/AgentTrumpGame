import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Allow client-side usage
});

export async function generateTrumpResponse(userGuess: string): Promise<string> {
  try {
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