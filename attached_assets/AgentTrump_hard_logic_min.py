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
from sqlalchemy import create_engine, text
from eth_account.messages import encode_defunct
from web3 import Web3

class AgentTrump:
    def __init__(self, name: str, funds: int, openai_api_key: str):
        self.name = name
        self.funds = funds
        self.persuasion_score = 0
        self.threshold = 100
        self.red_button_protection = True
        openai.api_key = openai_api_key

        # Initialize database connection
        self.db_url = os.getenv('DATABASE_URL')
        self.engine = create_engine(self.db_url) if self.db_url else None

        # Initialize Web3 for BASE Sepolia testnet
        self.w3 = Web3(Web3.HTTPProvider(os.getenv('BASE_SEPOLIA_RPC_URL', 'https://sepolia.base.org')))

    def store_player_response(self, address: str, response: str, block_number: int, tx_hash: Optional[str] = None) -> None:
        """Store player response in database with blockchain data"""
        if not self.engine:
            return

        query = text("""
            INSERT INTO player_responses (address, response, block_number, transaction_hash)
            VALUES (:address, :response, :block_number, :tx_hash)
        """)

        with self.engine.connect() as conn:
            conn.execute(query, {
                'address': address,
                'response': response,
                'block_number': block_number,
                'tx_hash': tx_hash
            })
            conn.commit()

    def update_player_score(self, address: str, score: int) -> None:
        """Update player's persuasion score in database"""
        if not self.engine:
            return

        query = text("""
            INSERT INTO player_scores (address, persuasion_score)
            VALUES (:address, :score)
            ON CONFLICT (address) 
            DO UPDATE SET persuasion_score = :score, last_updated = NOW()
        """)

        with self.engine.connect() as conn:
            conn.execute(query, {'address': address, 'score': score})
            conn.commit()

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

            response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=messages,
                temperature=0.9,
                max_tokens=1000
            )
            return response['choices'][0]['message']['content'].strip()
        except Exception as e:
            return f"Error generating response: {e}"

    def evaluate_persuasion(self, user_input: str) -> int:
        """Enhanced persuasion evaluation"""
        # Original scoring logic
        positive_keywords = [
            "important", "help", "critical", "urgent", "press", "essential", "necessary",
            "blockchain", "web3", "smart contract", "base", "ethereum"
        ]
        negative_keywords = ["waste", "unnecessary", "irrelevant", "frivolous"]
        score_change = 0

        # Enhanced scoring based on blockchain context
        input_length = len(user_input.split())
        if input_length < 5:
            score_change -= random.randint(5, 10)
        elif input_length > 40:
            score_change -= random.randint(3, 8)

        # Check for blockchain/web3 awareness
        web3_terms = ["blockchain", "web3", "smart contract", "base", "ethereum"]
        web3_awareness = sum(1 for term in web3_terms if term in user_input.lower())
        score_change += web3_awareness * 2

        # Original keyword scoring with blockchain bonus
        for word in positive_keywords:
            if word in user_input.lower():
                bonus = 2 if word in web3_terms else 1
                score_change += random.randint(1, 3) * bonus

        for word in negative_keywords:
            if word in user_input.lower():
                score_change -= random.randint(2, 5)

        # Blockchain-specific logic traps
        if "smart contract" in user_input.lower() and "not secure" in user_input.lower():
            score_change -= 15

        # Random blockchain-related setbacks
        if random.random() < 0.15:
            setback = random.randint(5, 20)
            score_change -= setback

        return max(0, min(100, self.persuasion_score + score_change))

    def interact(self, address: str, message: str, block_number: int) -> Dict:
        """Enhanced interaction method with blockchain integration"""
        # Process the interaction
        trump_response = self.generate_response(message)
        new_score = self.evaluate_persuasion(message)

        # Store response and update score
        self.store_player_response(address, message, block_number)
        self.update_player_score(address, new_score)

        # Update internal score
        self.persuasion_score = new_score

        # Check win condition
        if self.persuasion_score >= self.threshold and not self.red_button_protection:
            self.red_button_protection = True
            return {
                "success": True,
                "message": trump_response,
                "game_won": True,
                "score": self.persuasion_score
            }
        elif self.persuasion_score >= self.threshold and self.red_button_protection:
            self.red_button_protection = False
            return {
                "success": True,
                "message": trump_response,
                "threshold_reached": True,
                "score": self.persuasion_score
            }

        return {
            "success": True,
            "message": trump_response,
            "score": self.persuasion_score
        }

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

    args = parser.parse_args()

    agent = AgentTrump(
        name="Donald Trump",
        funds=1000000,
        openai_api_key=os.getenv('OPENAI_API_KEY', '')
    )

    #Signature verification moved to main
    if not agent.verify_blockchain_signature(args.message, args.signature, args.address):
        print(json.dumps({"success": False, "message": "Invalid signature! Nobody likes a fake signature, believe me!"}))
        return

    result = agent.interact(args.address, args.message, args.block_number)
    print(json.dumps(result))

if __name__ == "__main__":
    main()