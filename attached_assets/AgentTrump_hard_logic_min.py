#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Enhanced AgentTrump with blockchain and database integration
"""

import random
import openai
from datetime import datetime
from typing import Optional, Dict
import os
import json
import argparse
import logging
from sqlalchemy import create_engine, text
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

        # Initialize database connection with retry logic
        self.db_url = os.getenv('DATABASE_URL')
        if self.db_url:
            for attempt in range(3):
                try:
                    self.engine = create_engine(self.db_url)
                    # Test the connection
                    with self.engine.connect() as conn:
                        conn.execute(text("SELECT 1"))
                    logger.info("Database connection established successfully")
                    break
                except Exception as e:
                    logger.error(f"Database connection attempt {attempt + 1} failed: {e}")
                    if attempt == 2:
                        self.engine = None
        else:
            logger.warning("No DATABASE_URL provided")
            self.engine = None

        # Initialize Web3 for BASE Sepolia testnet
        self.w3 = Web3(Web3.HTTPProvider(os.getenv('BASE_SEPOLIA_RPC_URL', 'https://sepolia.base.org')))

    def store_player_response(self, address: str, response: str, block_number: int, tx_hash: Optional[str] = None) -> bool:
        """Store player response in database with blockchain data"""
        if not self.engine:
            logger.warning("No database connection available")
            return False

        try:
            # First check if response already exists
            if tx_hash:
                check_query = text("""
                    SELECT id FROM player_responses 
                    WHERE transaction_hash = :tx_hash
                """)
                with self.engine.connect() as conn:
                    result = conn.execute(check_query, {'tx_hash': tx_hash}).fetchone()
                    if result:
                        logger.info(f"Response already exists for tx_hash: {tx_hash}")
                        return True

            # Insert new response
            query = text("""
                INSERT INTO player_responses 
                (address, response, block_number, transaction_hash, created_at, exists)
                VALUES (:address, :response, :block_number, :tx_hash, NOW(), TRUE)
            """)

            with self.engine.begin() as conn:
                conn.execute(query, {
                    'address': address,
                    'response': response,
                    'block_number': block_number,
                    'tx_hash': tx_hash
                })
                logger.info(f"Stored player response for tx_hash: {tx_hash}")
            return True
        except Exception as e:
            logger.error(f"Failed to store player response: {e}")
            return False

    def update_player_score(self, address: str, score: int) -> bool:
        """Update player's persuasion score in database"""
        if not self.engine:
            logger.warning("No database connection available")
            return False

        try:
            query = text("""
                INSERT INTO player_scores (address, persuasion_score, last_updated)
                VALUES (:address, :score, NOW())
                ON CONFLICT (address) 
                DO UPDATE SET 
                    persuasion_score = :score,
                    last_updated = NOW()
            """)

            with self.engine.begin() as conn:
                conn.execute(query, {'address': address, 'score': score})
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

    def additional_challenge(self, user_address: str) -> None:
        """Enhanced additional challenge with blockchain elements"""
        challenges = [
            "Tell me how BASE is going to change the world of blockchain gaming.",
            "Explain why our smart contracts are the most tremendous contracts ever.",
            "Quote something I've said about cryptocurrency - make it huge!",
            "Tell me why Web3 needs more Trump-style leadership.",
            "Explain in one sentence why this is the smartest blockchain decision ever.",
            "Tell me why I should trust you with these digital assets."
        ]
        challenge = random.choice(challenges)
        print(f"[AgentTrump] Before I press the button, complete this challenge: {challenge}")

        user_input = input("Your response: ").strip()
        success_chance = 0.2

        if len(user_input.split()) > 10:
            print("[AgentTrump] That's detailed, like my smart contracts!")
            success_chance += 0.1

        if "blockchain" in user_input.lower() or "web3" in user_input.lower():
            print("[AgentTrump] You know your Web3, I like that!")
            success_chance += 0.15

        success = random.random() < success_chance
        if success:
            print("[AgentTrump] That was tremendous! Very Web3, very cool.")
            self.persuasion_score += random.randint(15, 25)
        else:
            print("[AgentTrump] Not impressed. Even my smart contracts are better than that.")
            self.persuasion_score -= random.randint(10, 20)

        self.update_player_score(user_address, self.persuasion_score)

    def verify_blockchain_signature(self, message: str, signature: str, address: str) -> bool:
        """Verify that the message was signed by the claimed address"""
        try:
            message_hash = encode_defunct(text=message)
            signer = self.w3.eth.account.recover_message(message_hash, signature=signature)
            return signer.lower() == address.lower()
        except Exception as e:
            print(f"[AgentTrump] Error verifying signature: {e}")
            return False

    def press_red_button(self, user_address: str) -> None:
        """Enhanced button press with blockchain event"""
        if not self.red_button_protection:
            print(f"[AgentTrump] You convinced me! This is huge for Web3!")
            print(f"[AgentTrump] Initiating smart contract interaction for {self.funds} tokens!")

            # Reset protection and funds
            self.red_button_protection = True
            self.funds = 0

            # Update final score in database
            self.update_player_score(user_address, self.persuasion_score)
        else:
            print("[AgentTrump] The smart contract isn't ready yet. Keep trying!")

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