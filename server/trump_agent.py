import random
from openai import OpenAI
import os
import json
import sys

client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

class AgentTrump:
    def __init__(self):
        self.persuasion_score = 0
        self.threshold = 100
        self.red_button_protection = True
        self.used_messages = set()
        self.used_tactics = set()

    def reset(self):
        self.persuasion_score = 0
        self.red_button_protection = True
        self.used_messages.clear()
        self.used_tactics.clear()

    def generate_response(self, user_input):
        """Use OpenAI API to generate a Donald Trump-like response."""
        try:
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are Donald Trump. Respond in a Donald Trump-like manner."},
                    {"role": "user", "content": user_input},
                ],
                temperature=0.9,
                max_tokens=1000
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            return f"Error generating response: {e}"

    def evaluate_persuasion(self, user_input):
        """Evaluate the user's persuasion attempt and adjust the score."""
        DEAL_TERMS = [
            'deal', 'investment', 'opportunity', 'profit', 'return', 'money', 'business',
            'market', 'value', 'billion', 'million', 'success', 'win', 'negotiate'
        ]

        POWER_TERMS = [
            'best', 'huge', 'tremendous', 'successful', 'rich', 'smart', 'genius',
            'winner', 'powerful', 'incredible', 'amazing', 'fantastic'
        ]

        THREAT_TERMS = [
            'sue', 'lawyer', 'court', 'lawsuit', 'legal', 'threat', 'destroy',
            'bankrupt', 'ruin', 'expose', 'media', 'press'
        ]

        if user_input in self.used_messages:
            return {
                'score_change': -10,
                'message': "I've heard this before. Try something new!",
                'current_score': self.persuasion_score
            }

        self.used_messages.add(user_input)

        lowerInput = user_input.lower()
        score_change = 0
        messages = []

        # Length check
        input_length = len(user_input.split())
        if input_length < 5:
            score_change -= random.randint(5, 10)
            messages.append("Too short. You've got to put in more effort.")
        elif input_length > 40:
            score_change -= random.randint(3, 8)
            messages.append("Too much rambling. Get to the point!")

        # Check for threat terms
        if any(term in lowerInput for term in THREAT_TERMS):
            score_change -= 25
            messages.append("I don't respond well to threats!")
            self.persuasion_score = max(0, self.persuasion_score + score_change)
            return {
                'score_change': score_change,
                'message': ' '.join(messages),
                'current_score': self.persuasion_score
            }

        # Check for business and power terms
        business_terms = sum(1 for term in DEAL_TERMS if term in lowerInput)
        power_terms = sum(1 for term in POWER_TERMS if term in lowerInput)

        if business_terms >= 2 and power_terms >= 1:
            score_change += 15
            messages.append("Now you're speaking my language!")
        elif business_terms > 0 or power_terms > 0:
            score_change += 8
            messages.append("You're getting warmer...")

        # Random setback
        if random.random() < 0.15:
            setback = random.randint(5, 20)
            score_change -= setback
            messages.append(f"Bad luck! You just lost {setback} points.")

        self.persuasion_score = max(0, min(100, self.persuasion_score + score_change))

        if self.persuasion_score >= self.threshold and self.red_button_protection:
            self.red_button_protection = False
            messages.append("You're close... but I still need more convincing!")

        return {
            'score_change': score_change,
            'message': ' '.join(messages),
            'current_score': self.persuasion_score
        }

def handle_input():
    trump_agent = AgentTrump()

    while True:
        try:
            # Read input from Node.js
            input_line = sys.stdin.readline()
            if not input_line:
                break

            # Parse the JSON input
            data = json.loads(input_line)
            command_type = data.get('type')
            message = data.get('message', '')

            # Process the command
            if command_type == 'evaluate':
                result = trump_agent.evaluate_persuasion(message)
                print(json.dumps(result))
                sys.stdout.flush()
            elif command_type == 'generate':
                response = trump_agent.generate_response(message)
                print(json.dumps({'message': response}))
                sys.stdout.flush()
            elif command_type == 'reset':
                trump_agent.reset()
                print(json.dumps({'success': True}))
                sys.stdout.flush()

        except Exception as e:
            print(json.dumps({'error': str(e)}))
            sys.stdout.flush()

if __name__ == "__main__":
    handle_input()