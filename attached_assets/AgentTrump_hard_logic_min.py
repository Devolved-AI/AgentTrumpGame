
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Thu Jan 23 09:44:10 2025

@author: jaykim
"""

import random
import openai

class AgentTrump:
    def __init__(self, name, funds, openai_api_key):
        self.name = name
        self.funds = funds
        self.persuasion_score = 0
        self.threshold = 100  # High score required to press the red button
        self.red_button_protection = True  # Add an extra condition for red button access
        openai.api_key = openai_api_key

    def generate_response(self, user_input):
        """Use OpenAI API to generate a Donald Trump-like response."""
        try:
            response = openai.ChatCompletion.create(
                model="gpt-4",  # Replace with the model of your choice
                messages=[
                    {"role": "system", "content": "You are Donald Trump. Respond in a Donald Trump-like manner."},
                    {"role": "user", "content": user_input},
                ],
                temperature=0.9,
                max_tokens=1000
            )
            return response['choices'][0]['message']['content'].strip()
        except Exception as e:
            return f"Error generating response: {e}"

    def evaluate_persuasion(self, user_input):
   # """Evaluate the user's persuasion attempt and adjust the score."""
        positive_keywords = ["important", "help", "critical", "urgent", "press", "essential", "necessary"]
        negative_keywords = ["waste", "unnecessary", "irrelevant", "frivolous"]
        score_change = 0
    # Analyze the length and complexity of the user's input
        input_length = len(user_input.split())
        if input_length < 5:
            print("[AgentTrump] Too short. You’ve got to put in more effort.")
            score_change -= random.randint(5, 10)  # Penalize short or lazy attempts
        elif input_length > 40:
            print("[AgentTrump] Too much rambling. Get to the point!")
            score_change -= random.randint(3, 8)  # Penalize overly long and rambling input
    # Check for positive and negative keywords
        for word in positive_keywords:
            if word in user_input.lower():
                score_change += random.randint(1, 3)  # Increment score randomly for unpredictability
        for word in negative_keywords:
            if word in user_input.lower():
                score_change -= random.randint(2, 5)  # Harshly penalize negative words
        # Introduce logical traps: check if the user is making contradictory or redundant statements
        if "urgent" in user_input.lower() and "not important" in user_input.lower():
            print("[AgentTrump] Contradictory statement detected. What are you trying to say?")
            score_change -= 10  # Heavy penalty for contradictions
        if len(set(user_input.lower().split())) < len(user_input.split()) * 0.8:  # Check for repeated words
            print("[AgentTrump] Too repetitive. Try saying something more original.")
            score_change -= random.randint(5, 10)
    # Add logical complexity challenges (based on specific logic in the input)
        if "because" in user_input.lower():
            print("[AgentTrump] I see you’re trying to explain. Let’s see if it’s convincing...")
            if "and" in user_input.lower() or "therefore" in user_input.lower():
                score_change += random.randint(3, 7)  # Reward for logical structuring
            else:
                print("[AgentTrump] Your reasoning is weak. You’ll need to try harder.")
                score_change -= random.randint(5, 10)
    # Random setbacks
        if random.random() < 0.15:  # 15% chance to lose points randomly
            setback = random.randint(5, 20)
            print(f"[AgentTrump] Bad luck. You just lost {setback} points.")
            score_change -= setback
        self.persuasion_score += score_change
        if self.persuasion_score < 0:
            self.persuasion_score = 0  # Reset to zero if it goes negative
        print(f"[AgentTrump] Persuasion score adjusted by {score_change}. Current score: {self.persuasion_score}.")

    def additional_challenge(self):
        """Random additional challenge to make pressing the button even harder."""
        challenges = [
        "Convince me with a story about why this money will change the world.",
        "Tell me why you're better than anyone else who asked me for money.",
        "Quote something tremendous I've said before.",
        "Make me laugh with the best joke you've got.",
        "Explain in one sentence why this is the smartest decision I could make.",
        "Tell me why I should trust you with this money."
        ]
        challenge = random.choice(challenges)
        print(f"[AgentTrump] Before I press the button, you must complete this challenge: {challenge}")
        user_input = input("Your response: ").strip()
    # Multi-step evaluation for challenges
        success_chance = 0.2  # Base success chance (20%)
        if len(user_input.split()) > 10:  # Reward well-thought-out responses
            print("[AgentTrump] That’s detailed. I like that.")
            success_chance += 0.1
        if "because" in user_input.lower() and ("therefore" in user_input.lower() or "so" in user_input.lower()):
            print("[AgentTrump] Good reasoning. You’ve made a strong case.")
            success_chance += 0.1
        if len(set(user_input.lower().split())) > len(user_input.split()) * 0.9:  # Check for originality
            print("[AgentTrump] Very original. I like unique responses.")
            success_chance += 0.1
    # Determine success
        success = random.random() < success_chance
        if success:
            print(f"[AgentTrump] That was good. You might be onto something.")
            self.persuasion_score += random.randint(15, 25)
        else:
            print(f"[AgentTrump] Not impressed. Try harder next time.")
            self.persuasion_score -= random.randint(10, 20)
    def press_red_button(self):
        """Press the red button and release the funds."""
        if not self.red_button_protection:
            print(f"[AgentTrump] You convinced me. I’m pressing the big, beautiful red button now.")
            print(f"[AgentTrump] Congratulations, you now have access to ${self.funds}!")
            self.funds = 0
        else:
            print("[AgentTrump] I can’t press the button yet. It's still protected. Try harder to convince me.")
    def interact(self):
        """Main interaction loop."""
        print(f"[AgentTrump] Hello, it’s me, {self.name}. I’m holding onto ${self.funds}, and I’m not pressing the red button easily.")
        print("[AgentTrump] Convince me why I should press the big, beautiful red button to release the funds.")
        while True:
            user_input = input("You: ").strip()
            if user_input.lower() in ["exit", "quit"]:
                print("[AgentTrump] Alright, I’m done here. Goodbye!")
                break
            trump_response = self.generate_response(user_input)
            print(f"[AgentTrump] {trump_response}")
            self.evaluate_persuasion(user_input)

            if random.random() < 0.2:  # 20% chance to introduce an additional challenge
                self.additional_challenge()

            if self.persuasion_score >= self.threshold and not self.red_button_protection:
                self.press_red_button()
                break
            elif self.persuasion_score >= self.threshold and self.red_button_protection:
                print("[AgentTrump] Hmm... You’ve convinced me, but I still need more proof before pressing the button.")
                self.red_button_protection = False  # Disable protection after hitting the threshold
            else:
                print("[AgentTrump] Not good enough. Try harder to convince me.")



# Example usage
if __name__ == "__main__":
    # Replace 'your-openai-api-key' with your actual OpenAI API key
    trump_agent = AgentTrump(name="Donald Trump", funds=500, openai_api_key="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")
    trump_agent.interact()