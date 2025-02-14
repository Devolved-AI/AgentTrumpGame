#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Enhanced AgentTrump with Redis integration for faster response handling
"""

import random
import openai
from datetime import datetime
from typing import Optional, Dict
import os
import json
import argparse
import logging
import redis
from eth_account.messages import encode_defunct
from web3 import Web3

# Configure logging with more detailed format
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class AgentTrump:
    def __init__(self, name: str, funds: int, openai_api_key: str):
        self.name = name
        self.funds = funds
        self.persuasion_score = 0
        self.threshold = 100
        self.red_button_protection = True
        openai.api_key = openai_api_key

        # Initialize Redis connection with retry logic
        redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
        for attempt in range(3):
            try:
                self.redis = redis.from_url(redis_url)
                self.redis.ping()  # Test connection
                logger.info("Redis connection established successfully")
                break
            except Exception as e:
                logger.error(f"Redis connection attempt {attempt + 1} failed: {e}")
                if attempt == 2:
                    self.redis = None

        # Initialize Web3 for BASE Sepolia testnet
        self.w3 = Web3(Web3.HTTPProvider(os.getenv('BASE_SEPOLIA_RPC_URL', 'https://sepolia.base.org')))

    def store_player_response(self, address: str, response: str, block_number: int, tx_hash: Optional[str] = None) -> bool:
        """Store player response in Redis"""
        if not self.redis:
            logger.warning("No Redis connection available")
            return False

        try:
            # Create response data
            response_data = {
                'address': address,
                'response': response,
                'block_number': block_number,
                'transaction_hash': tx_hash,
                'created_at': datetime.utcnow().isoformat(),
                'exists': True
            }

            # Store by transaction hash
            if tx_hash:
                response_key = f"response:{tx_hash}"
                if self.redis.exists(response_key):
                    logger.info(f"Response already exists for tx_hash: {tx_hash}")
                    return True

                self.redis.set(response_key, json.dumps(response_data))
                logger.info(f"Stored player response for tx_hash: {tx_hash}")

                # Add to user's response list
                user_responses_key = f"user_responses:{address}"
                self.redis.rpush(user_responses_key, tx_hash)

            return True
        except Exception as e:
            logger.error(f"Failed to store player response: {e}")
            return False

    def update_player_score(self, address: str, score: int) -> bool:
        """Update player's persuasion score in Redis"""
        if not self.redis:
            logger.warning("No Redis connection available")
            return False

        try:
            score_key = f"score:{address}"
            score_data = {
                'persuasion_score': score,
                'last_updated': datetime.utcnow().isoformat()
            }
            self.redis.set(score_key, json.dumps(score_data))
            logger.info(f"Updated score for address {address}: {score}")
            return True
        except Exception as e:
            logger.error(f"Failed to update player score: {e}")
            return False

    def generate_response(self, user_input: str, user_history: Optional[list] = None) -> str:
        """Enhanced OpenAI API response generation with context"""
        try:
            messages = [
                {"role": "system", "content": """You are Donald Trump in a blockchain game. 
                You're evaluating players trying to convince you to press a red button.
                Respond in Trump's distinctive style, incorporating blockchain and Web3 references.
                Be entertaining but hard to convince. Reference cryptocurrency, smart contracts, and BASE network occasionally."""},
                {"role": "user", "content": user_input}
            ]

            # Add conversation history for context if available
            if user_history:
                for msg in user_history[-3:]:  # Include last 3 messages for context
                    messages.insert(1, {"role": "assistant" if msg['is_trump'] else "user", "content": msg['text']})

            logger.info("Generating AI response...")
            response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=messages,
                temperature=0.9,
                max_tokens=150  # Reduced for faster response
            )
            logger.info("AI response generated successfully")
            return response['choices'][0]['message']['content'].strip()
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return "Look folks, we're having some technical difficulties - but we'll be back, bigger and better than ever!"

    def evaluate_persuasion(self, user_input: str) -> int:
        """Enhanced persuasion evaluation"""
        logger.info("Evaluating persuasion score...")

        score_change = 0

        # Simplified scoring for faster processing
        input_length = len(user_input.split())
        if 5 <= input_length <= 30:
            score_change += 5

        # Check for blockchain/web3 terms
        web3_terms = ["blockchain", "web3", "smart contract", "base", "ethereum"]
        web3_awareness = sum(1 for term in web3_terms if term.lower() in user_input.lower())
        score_change += web3_awareness * 3

        # Random element to make it challenging
        score_change += random.randint(-5, 10)

        final_score = max(0, min(100, self.persuasion_score + score_change))
        logger.info(f"New persuasion score calculated: {final_score}")
        return final_score

    def interact(self, address: str, message: str, block_number: int, tx_hash: Optional[str] = None) -> Dict:
        """Enhanced interaction method with blockchain integration"""
        logger.info(f"Processing interaction for address: {address}, tx_hash: {tx_hash}")

        # Store response first to ensure it's available for retrieval
        store_success = self.store_player_response(address, message, block_number, tx_hash)
        if not store_success:
            logger.error("Failed to store player response")
            return {
                "success": False,
                "message": "Failed to store response",
                "score": self.persuasion_score
            }

        # Generate response and evaluate
        trump_response = self.generate_response(message)
        new_score = self.evaluate_persuasion(message)

        # Update the score
        update_success = self.update_player_score(address, new_score)
        if not update_success:
            logger.error("Failed to update player score")
            return {
                "success": False,
                "message": trump_response,
                "score": new_score
            }

        # Update internal score
        self.persuasion_score = new_score

        response_data = {
            "success": True,
            "message": trump_response,
            "score": self.persuasion_score
        }

        # Check win conditions
        if self.persuasion_score >= self.threshold:
            if self.red_button_protection:
                self.red_button_protection = False
                response_data["threshold_reached"] = True
            else:
                self.red_button_protection = True
                response_data["game_won"] = True

        logger.info(f"Interaction completed successfully: {response_data}")
        return response_data

    def get_response_by_hash(self, tx_hash: str) -> Optional[Dict]:
        """Retrieve response by transaction hash from Redis"""
        if not self.redis or not tx_hash:
            return None

        try:
            response_key = f"response:{tx_hash}"
            response_data = self.redis.get(response_key)

            if response_data:
                return json.loads(response_data)
            return None
        except Exception as e:
            logger.error(f"Error retrieving response by hash: {e}")
            return None

    def verify_blockchain_signature(self, message: str, signature: str, address: str) -> bool:
        """Verify that the message was signed by the claimed address"""
        try:
            message_hash = encode_defunct(text=message)
            signer = self.w3.eth.account.recover_message(message_hash, signature=signature)
            return signer.lower() == address.lower()
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
        funds=1000000,
        openai_api_key=os.getenv('OPENAI_API_KEY', '')
    )

    if not agent.verify_blockchain_signature(args.message, args.signature, args.address):
        error_response = {
            "success": False,
            "message": "Invalid signature! Nobody likes a fake signature, believe me!"
        }
        print(json.dumps(error_response))
        return

    result = agent.interact(args.address, args.message, args.block_number, args.tx_hash)
    print(json.dumps(result))
    logger.info(f"Request processed successfully: {result}")

if __name__ == "__main__":
    main()