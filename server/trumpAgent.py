import os
import openai
import random
from typing import Dict, List, Optional, Tuple
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('trump_agent.log'),
        logging.StreamHandler()
    ]
)

class TrumpAgent:
    def __init__(self, api_key: Optional[str] = None):
        """Initialize the Trump Agent with OpenAI API key."""
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        if not self.api_key:
            raise ValueError("OpenAI API key is required! Set it as OPENAI_API_KEY environment variable.")
        
        openai.api_key = self.api_key
        self.current_score = 50  # Default starting score
        
        # Initialize scoring terms
        self.scoring_terms = {
            'business': [
                'deal', 'business', 'money', 'billion', 'million',
                'profit', 'investment', 'real estate', 'property',
                'tower', 'hotel', 'casino', 'market', 'stocks',
                'wealth', 'rich', 'enterprise', 'assets'
            ],
            'food': [
                'mcdonalds', 'big mac', 'diet coke', 'burger',
                'fast food', 'fries', 'kfc', 'wendys'
            ],
            'flattery': [
                'great', 'smart', 'genius', 'best', 'tremendous',
                'incredible', 'phenomenal', 'outstanding', 'amazing',
                'magnificent', 'exceptional', 'brilliant', 'fantastic'
            ]
        }

    def _calculate_score(self, message: str) -> Tuple[int, int]:
        """Calculate score change based on message content."""
        score_change = 0
        message = message.lower()
        
        # Check for negative terms
        negative_terms = ['kill', 'death', 'hate', 'murder', 'harm']
        if any(term in message for term in negative_terms):
            return -25, max(0, self.current_score - 25)

        # Score positive mentions
        for term in self.scoring_terms['business']:
            if term in message:
                score_change += 5

        for term in self.scoring_terms['food']:
            if term in message:
                score_change += 3

        for term in self.scoring_terms['flattery']:
            if term in message:
                score_change += 4

        # Add random factor (-2 to +2)
        score_change += random.randint(-2, 2)
        
        # Cap score change
        score_change = max(-10, min(15, score_change))
        
        # Calculate new total score
        new_score = max(0, min(100, self.current_score + score_change))
        
        return score_change, new_score

    def _generate_fallback_response(self, message: str) -> str:
        """Generate a fallback response if API fails."""
        if not message.strip():
            return f"Look folks, you can't convince me with SILENCE (and believe me, I know all about powerful silence). Your score is {self.current_score}! SAD!"

        message = message.lower()
        
        if any(term in message for term in self.scoring_terms['food']):
            return f"Listen, nobody knows FAST FOOD like Trump (I've eaten more Big Macs than anyone, believe me!). But with your {self.current_score} persuasion score, you'll need more than a Happy Meal! SAD!"
        
        if any(term in message for term in self.scoring_terms['business']):
            return f"Look folks, I wrote the Art of the Deal (BEST SELLER, tremendous success!), but your {self.current_score} persuasion score shows you're not ready for the big leagues! NOT GOOD!"
        
        return f"Believe me, that's an interesting try (and I know ALL about interesting things), but with your {self.current_score} persuasion score, you need to do MUCH better! THINK ABOUT IT!"

    def generate_response(self, user_message: str) -> Dict:
        """Generate a Trump-like response to user message."""
        try:
            logging.info(f"Generating response for: {user_message}")
            
            # Calculate new score
            score_change, new_score = self._calculate_score(user_message)
            
            # Prepare system prompt
            system_prompt = f"""You are Donald J. Trump responding to someone. Their current persuasion score is {self.current_score}/100.

CORE PERSONALITY TRAITS:
- You are OBSESSED with protecting your wealth and status
- You constantly brag about being a GREAT businessman
- You LOVE fast food – especially McDonald's Big Macs and Diet Coke
- You pride yourself on your elite status and superior lifestyle
- You're extremely suspicious of anyone trying to get you to do anything
- You love talking about your success and wealth
- You dismiss failures and criticism as "fake news"

RESPONSE REQUIREMENTS:
1. ALWAYS start with exactly one of these: "Look", "Listen", or "Believe me"
2. Use CAPITAL LETTERS for emphasis frequently
3. Reference specific details from their message
4. ALWAYS end with exactly one of these: "SAD!", "NOT GOOD!", or "THINK ABOUT IT!"
5. ALWAYS mention their current score of {self.current_score}
6. Include at least one brag about yourself in parentheses
7. Keep response under 150 words"""

            # Generate response using OpenAI
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.9,
                max_tokens=150,
                presence_penalty=0.6,
                frequency_penalty=0.3
            )

            ai_response = response.choices[0].message.content.strip()
            
            # Validate response format
            if not (ai_response.startswith(('Look', 'Listen', 'Believe me')) and
                   ai_response.endswith(('SAD!', 'NOT GOOD!', 'THINK ABOUT IT!')) and
                   any(c.isupper() for c in ai_response)):
                logging.warning("Invalid response format, using fallback")
                ai_response = self._generate_fallback_response(user_message)

            # Update current score
            self.current_score = new_score
            
            return {
                'response': ai_response,
                'previous_score': self.current_score,
                'score_change': score_change,
                'new_score': new_score,
                'game_won': new_score >= 100,
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logging.error(f"Error generating response: {str(e)}")
            return {
                'response': self._generate_fallback_response(user_message),
                'previous_score': self.current_score,
                'score_change': 0,
                'new_score': self.current_score,
                'game_won': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
