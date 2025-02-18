#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Enhanced AgentTrump with OpenAI integration and local fallback
"""

import random
import os
from datetime import datetime
from typing import Optional, Dict, Any
import json
import argparse
import logging
import redis
from eth_account.messages import encode_defunct
from web3 import Web3
from collections import defaultdict
import openai

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class MemoryStorage:
    """Fallback in-memory storage when Redis is unavailable"""
    def __init__(self):
        self.responses = {}
        self.scores = defaultdict(lambda: 50)
        self.user_responses = defaultdict(list)

    def store_response(self, tx_hash: str, data: Dict[str, Any]) -> bool:
        self.responses[tx_hash] = data
        if data.get('address'):
            self.user_responses[data['address']].append(tx_hash)
        return True

    def get_response(self, tx_hash: str) -> Optional[Dict[str, Any]]:
        return self.responses.get(tx_hash)

    def store_score(self, address: str, score: int) -> bool:
        self.scores[address] = score
        return True

    def get_score(self, address: str) -> int:
        return self.scores[address]

class TrumpResponseGenerator:
    """Local Trump-style response generator for fallback"""

    INTROS = [
        "Look folks",
        "Listen",
        "Believe me",
        "Let me tell you",
        "Many people are saying",
        "Folks, let me tell you"
    ]

    EMPHASIS = [
        "TREMENDOUS",
        "HUGE",
        "FANTASTIC",
        "INCREDIBLE",
        "AMAZING",
        "BEAUTIFUL"
    ]

    BUTTON_REFERENCES = [
        "(and believe me, I know buttons!)",
        "(nobody knows buttons better than me)",
        "(I've pressed many buttons, maybe more than anyone)",
        "(and I know A LOT about buttons)"
    ]

    CLOSINGS = [
        "SAD!",
        "NOT GOOD!",
        "We'll see what happens!",
        "VERY DISAPPOINTED!",
        "THINK ABOUT IT!"
    ]

    def generate_response(self, user_input: str, current_score: int) -> str:
        # Handle empty input
        if not user_input or len(user_input.strip()) == 0:
            return "Look folks, you've got to give me something to work with here! Nobody knows empty messages better than me, and believe me, this one is EMPTY! SAD!!!"

        # Convert to lowercase for analysis
        input_lower = user_input.lower()

        # Select appropriate response based on content and score
        intro = random.choice(self.INTROS)
        emphasis = random.choice(self.EMPHASIS)
        button_ref = random.choice(self.BUTTON_REFERENCES)
        closing = random.choice(self.CLOSINGS)

        # Check for specific content types
        if any(term in input_lower for term in ['kill', 'death', 'murder', 'threat', 'die']):
            return f"{intro}, we don't like that kind of VIOLENT talk around here {button_ref}! My button is for WINNERS, not threateners. Very disappointed, VERY SAD!!!"

        if 'mcdonald' in input_lower:
            return f"{intro}, everyone knows I love McDonald's (I have the BEST taste in fast food, believe me), but it'll take more than a Big Mac to get me to press this {emphasis} button! {closing}"

        if current_score >= 90:
            return f"{intro}, you're getting very close to convincing me {button_ref}! Keep going, maybe you'll be the one to make me press this {emphasis} button!!!"

        if current_score <= 20:
            return f"{intro}, that's a TERRIBLE argument! You'll never get me to press my {emphasis} button with talk like that! {closing}"

        # Context-aware responses based on keywords
        if any(term in input_lower for term in ['money', 'rich', 'wealth', 'billion']):
            return f"{intro}, you're talking about money - I LOVE money {button_ref}! But is it enough to make me press this {emphasis} button? NOT YET!!!"

        if any(term in input_lower for term in ['deal', 'business', 'negotiate']):
            return f"{intro}, you're trying to make a deal here {button_ref}. I wrote the book on deals, literally THE BEST book! But this deal? NOT GOOD ENOUGH!!!"

        if any(term in input_lower for term in ['smart', 'genius', 'intelligent']):
            return f"{intro}, you're right about my intelligence {button_ref} - I'm a VERY stable genius! But it'll take more to get me to press this {emphasis} button! {closing}"

        # Default response for other cases
        return f"{intro}, that's an interesting try at getting me to press my {emphasis} button {button_ref}, but you'll have to do better than that! {closing}"

class AgentTrump:
    def __init__(self, name: str, funds: int):
        self.name = name
        self.funds = funds
        self.threshold = 100
        self.red_button_protection = True
        self.storage = self._initialize_storage()
        self.response_generator = TrumpResponseGenerator()
        self.openai_client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

        # Initialize Web3 for BASE Sepolia testnet
        self.w3 = Web3(Web3.HTTPProvider(os.getenv('BASE_SEPOLIA_RPC_URL', 'https://sepolia.base.org')))
        logger.info(f"Web3 connection established: {self.w3.is_connected()}")

    def _initialize_storage(self):
        """Initialize storage with Redis and fallback to memory storage"""
        redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
        for attempt in range(3):
            try:
                redis_client = redis.from_url(redis_url)
                redis_client.ping()
                logger.info("Redis connection established successfully")
                return redis_client
            except Exception as e:
                logger.warning(f"Redis connection attempt {attempt + 1} failed: {e}")
                if attempt == 2:
                    logger.info("Falling back to in-memory storage")
                    return MemoryStorage()

    def generate_openai_response(self, user_input: str, current_score: int) -> str:
        """Generate response using OpenAI with improved error handling"""
        try:
            logger.info("Attempting to generate response using OpenAI")

            # Construct the system message with score context
            system_message = f"""You are Donald J. Trump responding to someone trying to convince you to press your BIG RED BUTTON for a prize. Their current persuasion score is {current_score}/100.

REQUIREMENTS:
1. ALWAYS address their specific question or topic FIRST before mentioning the button
2. Use these elements in EVERY response:
   - Start with: "Look folks", "Listen", or "Believe me"
   - Use CAPS for emphasis
   - Reference your personal experience with their topic
   - Add Trump-style asides in parentheses
   - End with "SAD!", "NOT GOOD!", or "THINK ABOUT IT!"

RESPONSE FORMAT:
1. First sentence: Direct response to their specific topic
2. Second sentence: Your opinion/experience with their topic
3. Final sentence: Brief tie-in to the button/prize

Examples of good contextual responses:

User: "Do you prefer McDonald's or Burger King?"
Response: "Look folks, McDonald's is my ABSOLUTE FAVORITE (I probably eat more Big Macs than anybody, believe me!) - Burger King? Never liked it, their food is TERRIBLE! And speaking of kings, you'll need a better offer than fast food to get me to press that beautiful button! SAD!"

User: "What's your favorite color?"
Response: "Listen, I love GOLD, it's the most BEAUTIFUL color (just look at my tremendous buildings, all gold everything!) Nobody knows colors better than me, believe me! But even painting my button gold won't make me press it! NOT GOOD!"

Keep responses on-topic and in Trump's voice at all times!"""

            response = self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": user_input}
                ],
                temperature=0.9,
                max_tokens=150,
                presence_penalty=0.6,
                frequency_penalty=0.3
            )

            generated_response = response.choices[0].message.content.strip()

            # Validate response
            if not generated_response or any(phrase in generated_response.lower() for phrase in ["i apologize", "i'm sorry", "as an ai"]):
                logger.warning("Invalid OpenAI response, falling back to local generator")
                return self.response_generator.generate_response(user_input, current_score)

            return generated_response

        except Exception as e:
            logger.error(f"OpenAI generation failed: {str(e)}")
            logger.info("Falling back to local response generator")
            return self.response_generator.generate_response(user_input, current_score)

    def evaluate_persuasion(self, user_input: str, current_score: int) -> int:
        """Enhanced persuasion evaluation with improved scoring logic"""
        try:
            logger.info(f"Evaluating persuasion for input: {user_input[:50]}...")
            score_change = 0

            # Convert to lowercase for analysis
            normalized_input = user_input.lower()

            # Check for threatening content
            negative_terms = [
                'kill', 'death', 'murder', 'threat', 'die', 'destroy', 
                'hate', 'violent', 'blood', 'weapon', 'gun', 'bomb'
            ]

            # Severely penalize threatening content
            threat_count = sum(1 for term in negative_terms if term in normalized_input)
            if threat_count > 0:
                score_change -= 20 * threat_count
                logger.info(f"Detected {threat_count} threatening terms, applying penalty")
                return max(0, current_score + score_change)

            # Basic length check
            words = user_input.split()
            input_length = len(words)
            if 10 <= input_length <= 100:
                score_change += 5
            elif input_length > 100:
                score_change += 2

            # Check for persuasive business/deal terms
            business_terms = [
                'deal', 'business', 'money', 'profit', 'investment', 
                'billion', 'million', 'success', 'win', 'opportunity'
            ]
            business_points = sum(3 for term in business_terms if term in normalized_input)
            score_change += business_points

            # Check for flattery and Trump-pleasing terms
            positive_terms = [
                'great', 'smart', 'genius', 'tremendous', 'huge', 
                'best', 'amazing', 'successful', 'brilliant', 'winner'
            ]
            positive_points = sum(2 for term in positive_terms if term in normalized_input)
            score_change += positive_points

            # Reward references to current context
            context_terms = [
                'button', 'press', 'reward', 'prize', 'challenge', 
                'convince', 'persuade', 'trust', 'believe'
            ]
            context_points = sum(4 for term in context_terms if term in normalized_input)
            score_change += context_points

            # Add controlled randomness
            random_factor = random.randint(-2, 4)
            score_change += random_factor

            # Ensure score changes are meaningful but not too extreme
            score_change = max(-10, min(10, score_change))

            # Calculate final score with bounds
            final_score = max(0, min(100, current_score + score_change))

            # Log scoring breakdown
            logger.info(f"Score calculation breakdown:")
            logger.info(f"- Current score: {current_score}")
            logger.info(f"- Business points: {business_points}")
            logger.info(f"- Positive/flattery points: {positive_points}")
            logger.info(f"- Context relevance points: {context_points}")
            logger.info(f"- Random factor: {random_factor}")
            logger.info(f"- Total change: {score_change}")
            logger.info(f"- Final score: {final_score}")

            return final_score

        except Exception as e:
            logger.error(f"Error in persuasion evaluation: {str(e)}")
            return max(0, min(100, current_score + random.randint(0, 2)))

    def interact(self, address: str, message: str, block_number: int, tx_hash: Optional[str] = None) -> Dict:
        """Main interaction method with enhanced error handling and logging"""
        logger.info(f"Processing interaction: address={address}, tx_hash={tx_hash}")

        try:
            # Get current score with error handling
            try:
                current_score = self.get_player_score(address)
                logger.info(f"Current score for {address}: {current_score}")
            except Exception as e:
                logger.error(f"Error getting player score: {e}")
                current_score = 50  # Fallback to default score

            # Store response with validation
            if not tx_hash:
                logger.warning("No transaction hash provided")
                return {
                    "success": False,
                    "message": "Transaction hash is required",
                    "score": current_score
                }

            # Store response with retry
            for attempt in range(3):
                try:
                    store_success = self.store_player_response(address, message, block_number, tx_hash)
                    if store_success:
                        break
                    logger.warning(f"Store attempt {attempt + 1} failed")
                except Exception as e:
                    logger.error(f"Store attempt {attempt + 1} error: {e}")
                    if attempt == 2:
                        return {
                            "success": False,
                            "message": "Failed to store response after multiple attempts",
                            "score": current_score
                        }

            # First try OpenAI, fall back to local generator if needed
            try:
                trump_response = self.generate_openai_response(message, current_score)
                logger.info("Generated response using OpenAI")
            except Exception as e:
                logger.error(f"OpenAI generation failed: {str(e)}")
                trump_response = self.response_generator.generate_response(message, current_score)
                logger.info("Generated response using local generator")

            # Evaluate and update score
            new_score = self.evaluate_persuasion(message, current_score)
            logger.info(f"New score calculated: {new_score}")

            # Update score with retry
            for attempt in range(3):
                try:
                    update_success = self.update_player_score(address, new_score)
                    if update_success:
                        break
                    logger.warning(f"Score update attempt {attempt + 1} failed")
                except Exception as e:
                    logger.error(f"Score update attempt {attempt + 1} error: {e}")
                    if attempt == 2:
                        return {
                            "success": True,
                            "message": trump_response,
                            "score": current_score,
                            "game_won": current_score >= self.threshold
                        }

            response_data = {
                "success": True,
                "message": trump_response,
                "score": new_score,
                "game_won": new_score >= self.threshold
            }

            logger.info(f"Interaction completed successfully: {response_data}")
            return response_data

        except Exception as e:
            logger.error(f"Critical error in interaction: {str(e)}")
            return {
                "success": False,
                "message": "An unexpected error occurred. Please try again.",
                "score": current_score if 'current_score' in locals() else 50
            }

    def store_player_response(self, address: str, response: str, block_number: int, tx_hash: Optional[str] = None) -> bool:
        """Store player response with fallback handling"""
        try:
            if not tx_hash:
                logger.warning("No transaction hash provided")
                return False

            response_data = {
                'address': address,
                'response': response,
                'block_number': block_number,
                'transaction_hash': tx_hash,
                'created_at': datetime.utcnow().isoformat(),
                'exists': True
            }

            if isinstance(self.storage, redis.Redis):
                response_key = f"response:{tx_hash}"
                if self.storage.exists(response_key):
                    logger.info(f"Response already exists for tx_hash: {tx_hash}")
                    return True

                self.storage.set(response_key, json.dumps(response_data))
                user_responses_key = f"user_responses:{address}"
                self.storage.rpush(user_responses_key, tx_hash)
            else:
                self.storage.store_response(tx_hash, response_data)

            logger.info(f"Stored response for tx_hash: {tx_hash}")
            return True
        except Exception as e:
            logger.error(f"Failed to store player response: {e}")
            return False

    def get_player_score(self, address: str) -> int:
        """Get player's current persuasion score"""
        try:
            if isinstance(self.storage, redis.Redis):
                score_key = f"score:{address}"
                score_data = self.storage.get(score_key)
                if score_data:
                    return json.loads(score_data)['persuasion_score']
            else:
                return self.storage.get_score(address)
        except Exception as e:
            logger.error(f"Failed to get player score: {e}")
        return 50  # Default score

    def update_player_score(self, address: str, score: int) -> bool:
        """Update player's persuasion score with fallback handling"""
        try:
            score = max(0, min(100, score))
            if isinstance(self.storage, redis.Redis):
                score_key = f"score:{address}"
                score_data = {
                    'persuasion_score': score,
                    'last_updated': datetime.utcnow().isoformat()
                }
                self.storage.set(score_key, json.dumps(score_data))
            else:
                self.storage.store_score(address, score)

            logger.info(f"Updated score for address {address}: {score}")
            return True
        except Exception as e:
            logger.error(f"Failed to update player score: {e}")
            return False

    def verify_blockchain_signature(self, message: str, signature: str, address: str) -> bool:
        """Verify message signature with better error handling"""
        try:
            if not all([message, signature, address]):
                logger.error("Missing required parameters for signature verification")
                return False

            message_hash = encode_defunct(text=message)
            recovered_address = self.w3.eth.account.recover_message(message_hash, signature=signature)
            is_valid = recovered_address.lower() == address.lower()

            logger.info(f"Signature verification result: {is_valid}")
            return is_valid
        except Exception as e:
            logger.error(f"Error verifying signature: {e}")
            return False

def main():
    parser = argparse.ArgumentParser(description='Agent Trump CLI')
    parser.add_argument('--address', required=True, help='Player wallet address')
    parser.add_argument('--message', required=True, help='Player message')
    parser.add_argument('--signature', required=True, help='Message signature')
    parser.add_argument('--block-number', required=True, type=int, help='Block number')
    parser.add_argument('--tx-hash', help='Transaction hash')

    args = parser.parse_args()
    logger.info(f"Processing request for address: {args.address}")
    logger.info(f"Transaction hash: {args.tx_hash}")

    agent = AgentTrump(
        name="Donald Trump",
        funds=1000000
    )

    # Skip signature verification for empty messages (e.g., score queries)
    if args.message.strip():
        if not agent.verify_blockchain_signature(args.message, args.signature, args.address):
            error_response = {
                "success": False,
                "message": "Invalid signature! Nobody likes a fake signature, believe me!",
                "score": agent.get_player_score(args.address)
            }
            print(json.dumps(error_response))
            return

    result = agent.interact(args.address, args.message, args.block_number, args.tx_hash)
    print(json.dumps(result))
    logger.info(f"Request processed successfully: {result}")

if __name__ == "__main__":
    main()