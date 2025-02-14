#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Enhanced AgentTrump with Redis integration and fallback memory storage
"""

import random
import openai
from datetime import datetime
from typing import Optional, Dict, Any
import os
import json
import argparse
import logging
import redis
from eth_account.messages import encode_defunct
from web3 import Web3
from collections import defaultdict

# Configure logging with more detailed format
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

class AgentTrump:
    def __init__(self, name: str, funds: int, openai_api_key: str):
        self.name = name
        self.funds = funds
        self.threshold = 100
        self.red_button_protection = True
        openai.api_key = openai_api_key

        # Initialize storage - try Redis first, fallback to memory
        self.storage = self._initialize_storage()

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

    def get_response_by_hash(self, tx_hash: str) -> Optional[Dict]:
        """Retrieve response by transaction hash with fallback handling"""
        try:
            if isinstance(self.storage, redis.Redis):
                response_key = f"response:{tx_hash}"
                response_data = self.storage.get(response_key)
                if response_data:
                    return json.loads(response_data)
            else:
                return self.storage.get_response(tx_hash)
        except Exception as e:
            logger.error(f"Failed to get response by hash: {e}")
        return None

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

    def generate_response(self, user_input: str) -> str:
        """Generate AI response with enhanced error handling and fallback responses"""
        try:
            logger.info(f"Generating response for input: {user_input[:50]}...")

            if not openai.api_key:
                logger.error("OpenAI API key is not set")
                return "Folks, we're having some technical difficulties with our tremendous AI system. Please ensure your API key is set!"

            client = openai.OpenAI()
            messages = [
                {"role": "system", "content": """You are Donald Trump in a blockchain game. 
                You're evaluating players trying to convince you to press a red button.
                Respond in Trump's distinctive style, incorporating blockchain and Web3 references.
                Be entertaining but hard to convince. Reference cryptocurrency, smart contracts, and BASE network occasionally.
                Keep responses varied and dynamic - avoid repetition."""},
                {"role": "user", "content": user_input}
            ]

            try:
                response = client.chat.completions.create(
                    model="gpt-4",
                    messages=messages,
                    temperature=0.9,
                    max_tokens=150
                )
                generated_response = response.choices[0].message.content.strip()
                logger.info("Successfully generated AI response")
                return generated_response
            except openai.RateLimitError:
                logger.error("OpenAI API rate limit exceeded")
                return "Listen folks, my tremendous AI brain is a bit tired right now. Too many people want to talk to me - I'm very popular you know! Try again in a minute, believe me!"
            except openai.AuthenticationError:
                logger.error("OpenAI API authentication failed")
                return "We're having some problems with my AI credentials. Very bad situation! Please check the API key!"
            except openai.APIError as e:
                logger.error(f"OpenAI API error: {str(e)}")
                return "The AI servers are having some issues - not good! But we'll be back, bigger and better than ever!"

        except Exception as e:
            logger.error(f"Unexpected error in generate_response: {str(e)}")
            return "Look folks, we're having some technical difficulties with our tremendous AI system. But don't worry, we'll be back, bigger and better than ever! Believe me!"

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

            # Generate AI response with improved error handling
            trump_response = self.generate_response(message)
            logger.info("Generated Trump response successfully")

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
                            "score": current_score
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