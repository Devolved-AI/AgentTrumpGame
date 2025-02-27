#!/usr/bin/env python3
import sys
import json
import random
import openai
from typing import Dict, Any

class AgentTrump:
    def __init__(self):
        self.POSITIVE_KEYWORDS = ["important", "help", "critical", "urgent", "press", "essential", "necessary"]
        self.NEGATIVE_KEYWORDS = ["waste", "unnecessary", "irrelevant", "frivolous"]
        openai.api_key = sys.argv[1]  # API key passed as argument

    def evaluate_persuasion(self, user_input: str) -> Dict[str, Any]:
        score_change = 0
        messages = []

        words = user_input.split()
        if len(words) < 5:
            messages.append("Too short. You've got to put in more effort.")
            score_change -= random.randint(5, 10)
        elif len(words) > 40:
            messages.append("Too much rambling. Get to the point!")
            score_change -= random.randint(3, 8)

        input_lower = user_input.lower()
        for word in self.POSITIVE_KEYWORDS:
            if word in input_lower:
                score_change += random.randint(1, 3)

        for word in self.NEGATIVE_KEYWORDS:
            if word in input_lower:
                score_change -= random.randint(2, 5)

        if "urgent" in input_lower and "not important" in input_lower:
            messages.append("Contradictory statement detected. What are you trying to say?")
            score_change -= 10

        unique_words = set(words)
        if len(unique_words) < len(words) * 0.8:
            messages.append("Too repetitive. Try saying something more original.")
            score_change -= random.randint(5, 10)

        if "because" in input_lower:
            messages.append("I see you're trying to explain. Let's see if it's convincing...")
            if "and" in input_lower or "therefore" in input_lower:
                score_change += random.randint(3, 7)
                messages.append("Strong reasoning there! Keep it up!")
            else:
                messages.append("Your reasoning is weak. You'll need to try harder.")
                score_change -= random.randint(5, 10)

        if random.random() < 0.15:
            setback = random.randint(5, 20)
            messages.append(f"Bad luck. You just lost {setback} points.")
            score_change -= setback

        # Always add at least one evaluation message
        if not messages:
            messages.append("Keep trying to convince me, folks!")

        return {
            "score_change": score_change,
            "messages": messages,
            "message": " ".join(messages)
        }

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(json.dumps({
            "score_change": 0,
            "messages": ["Error: Invalid arguments"],
            "message": "Error: Invalid arguments"
        }))
        sys.exit(1)

    try:
        agent = AgentTrump()
        evaluation = agent.evaluate_persuasion(sys.argv[2])
        print(json.dumps(evaluation))
    except Exception as e:
        print(json.dumps({
            "score_change": 0,
            "messages": [f"Error: {str(e)}"],
            "message": f"Error: {str(e)}"
        }))
        sys.exit(1)