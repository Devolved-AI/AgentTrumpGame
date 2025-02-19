import os
import openai
import random
import json
import sys
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

        logging.info("Initializing Trump Agent")
        openai.api_key = self.api_key
        logging.info("Trump Agent initialized successfully")

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

    def _calculate_score(self, message: str, current_score: int) -> Tuple[int, int]:
        """Calculate score change based on message content."""
        logging.info(f"Calculating score for message: {message}")
        score_change = 0
        message = message.lower()

        # Check for negative terms
        negative_terms = ['kill', 'death', 'hate', 'murder', 'harm']
        if any(term in message for term in negative_terms):
            logging.info("Negative terms found, applying penalty")
            return -25, max(0, current_score - 25)

        # Score positive mentions
        for category, terms in self.scoring_terms.items():
            for term in terms:
                if term in message:
                    if category == 'business':
                        score_change += 5
                        logging.info(f"Business term '{term}' found: +5")
                    elif category == 'food':
                        score_change += 3
                        logging.info(f"Food term '{term}' found: +3")
                    elif category == 'flattery':
                        score_change += 4
                        logging.info(f"Flattery term '{term}' found: +4")

        # Add random factor (-2 to +2)
        random_factor = random.randint(-2, 2)
        score_change += random_factor
        logging.info(f"Added random factor: {random_factor}")

        # Cap score change
        score_change = max(-10, min(15, score_change))
        logging.info(f"Final score change: {score_change}")

        # Calculate new total score
        new_score = max(0, min(100, current_score + score_change))
        logging.info(f"New score: {new_score} (previous: {current_score})")

        return score_change, new_score

    def generate_response(self, user_message: str, current_score: int) -> Dict:
        """Generate a Trump-like response to user message."""
        try:
            logging.info(f"Generating response for: {user_message}")

            # Calculate new score
            score_change, new_score = self._calculate_score(user_message, current_score)

            # Prepare system prompt
            system_prompt = f"""You are Donald J. Trump responding to someone. Their current persuasion score is {current_score}/100.

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
5. ALWAYS mention their current score of {current_score}
6. Include at least one brag about yourself in parentheses
7. Keep response under 150 words"""

            logging.info("Making OpenAI API call")
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
            logging.info(f"Received response from OpenAI: {ai_response}")

            result = {
                'response': ai_response,
                'previous_score': current_score,
                'score_change': score_change,
                'new_score': new_score,
                'game_won': new_score >= 100,
                'timestamp': datetime.now().isoformat()
            }

            logging.info("Returning response")
            return result

        except Exception as e:
            logging.error(f"Error generating response: {str(e)}")
            return {
                'response': "Look folks, something went wrong with my TREMENDOUS brain (and believe me, it's usually perfect). Let's try that again! SAD!",
                'previous_score': current_score,
                'score_change': 0,
                'new_score': current_score,
                'game_won': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }

def main():
    """Main function to run the agent as a service."""
    logging.info("Starting Trump Agent service")
    try:
        agent = TrumpAgent()
        logging.info("Trump Agent initialized successfully")

        while True:
            try:
                # Read input as JSON
                logging.info("Waiting for input...")
                input_line = sys.stdin.readline()
                if not input_line:
                    logging.info("No input received, exiting")
                    break

                logging.info(f"Received input: {input_line.strip()}")

                # Parse input
                data = json.loads(input_line)
                message = data.get('message', '')
                current_score = int(data.get('current_score', 50))

                # Generate response
                logging.info(f"Generating response for message: {message}")
                result = agent.generate_response(message, current_score)

                # Send response
                response_json = json.dumps(result)
                logging.info(f"Sending response: {response_json}")
                print(response_json, flush=True)  # Ensure the response is sent immediately
                sys.stdout.flush()

            except Exception as e:
                logging.error(f"Error in main loop: {str(e)}")
                error_response = {
                    'error': str(e),
                    'response': "Look folks, something went wrong with my TREMENDOUS brain (and believe me, it's usually perfect). Let's try that again! SAD!",
                    'previous_score': 50,
                    'score_change': 0,
                    'new_score': 50,
                    'game_won': False,
                    'timestamp': datetime.now().isoformat()
                }
                print(json.dumps(error_response), flush=True)
                sys.stdout.flush()

    except Exception as e:
        logging.error(f"Critical error in main: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()