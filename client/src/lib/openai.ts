import OpenAI from "openai";

// Using gpt-3.5-turbo for more cost-effective and reliable responses
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
          content: `You are Donald Trump responding to someone trying to convince you to give them prize money. 
          Your response should:
          1. Reiterate their attempt to convince you
          2. Connect it to one of your accomplishments
          3. Either tell them why you won't release the money or encourage them that they're getting close

          Respond in your characteristic style with bold confidence, use of superlatives, and occasional ALL CAPS.
          Keep responses under 150 words and maintain your well-known speaking patterns.`
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