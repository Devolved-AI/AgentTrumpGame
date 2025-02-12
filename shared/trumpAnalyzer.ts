// Keywords and phrases commonly associated with Trump's speaking style
const TRUMP_PATTERNS = {
  superlatives: [
    'tremendous', 'huge', 'fantastic', 'amazing', 'incredible', 
    'best', 'greatest', 'perfect', 'beautiful', 'wonderful'
  ],
  phrases: [
    'believe me', 'everybody knows', 'many people are saying',
    'like never before', 'very very', 'big league', 'bigly'
  ],
  emphasis: [
    'very', 'totally', 'absolutely', 'completely', 'strongly',
    'seriously', 'frankly', 'honestly'
  ],
  repetition: [
    'very very', 'big big', 'many many', 'strong strong'
  ]
};

/**
 * Analyzes a response and returns a score (0-100) based on how "Trumpy" it is
 */
export function analyzeTrumpyResponse(response: string): number {
  const normalizedResponse = response.toLowerCase();
  let score = 50; // Start with neutral score
  
  // Check for characteristic patterns
  for (const superlative of TRUMP_PATTERNS.superlatives) {
    if (normalizedResponse.includes(superlative)) score += 5;
  }
  
  for (const phrase of TRUMP_PATTERNS.phrases) {
    if (normalizedResponse.includes(phrase)) score += 8;
  }
  
  for (const emphasis of TRUMP_PATTERNS.emphasis) {
    if (normalizedResponse.includes(emphasis)) score += 3;
  }
  
  for (const repetition of TRUMP_PATTERNS.repetition) {
    if (normalizedResponse.includes(repetition)) score += 10;
  }
  
  // Additional characteristics
  if (normalizedResponse.includes('!')) score += 2;
  if (response.match(/[A-Z]{2,}/)) score += 5; // ALL CAPS
  
  // Ensure score stays within 0-100 range
  return Math.min(Math.max(score, 0), 100);
}
