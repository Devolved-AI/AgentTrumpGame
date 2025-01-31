from web3 import Web3
import asyncio
import json
import logging
from datetime import datetime
import os
from dotenv import load_dotenv
import csv
from pathlib import Path

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

CONTRACT_ADDRESS = os.getenv('CONTRACT_ADDRESS')
RPC_URL = os.getenv('RPC_URL')
PRIVATE_KEY = os.getenv('PRIVATE_KEY')

with open('contract_abi.json', 'r') as f:
    CONTRACT_ABI = json.load(f)

class AgentTrumpListener:
    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(RPC_URL))
        self.contract = self.w3.eth.contract(
            address=CONTRACT_ADDRESS,
            abi=CONTRACT_ABI
        )
        self.account = self.w3.eth.account.from_key(PRIVATE_KEY)
        self.last_processed_block = self.w3.eth.block_number
        
        self.csv_path = Path('event_logs.csv')
        self.json_path = Path('event_logs.json')
        self.initialize_files()
        
        logger.info(f"Initialized listener for contract: {CONTRACT_ADDRESS}")

    def initialize_files(self):
        """Initialize CSV and JSON files"""
        # Initialize CSV
        headers = ['timestamp', 'player', 'response', 'block_number', 'transaction_hash']
        if not self.csv_path.exists():
            with open(self.csv_path, 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(headers)

        # Initialize JSON
        if not self.json_path.exists():
            with open(self.json_path, 'w') as f:
                json.dump([], f)

    def log_event(self, event_data):
        """Log event to CSV, JSON and terminal"""
        timestamp = datetime.fromtimestamp(event_data['timestamp'])
        
        # Prepare event record
        event_record = {
            'timestamp': timestamp.isoformat(),
            'player': event_data['player'],
            'response': event_data['response'],
            'block_number': event_data['blockNumber'],
            'transaction_hash': event_data['transactionHash'].hex()
        }

        # Log to CSV
        with open(self.csv_path, 'a', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                timestamp,
                event_record['player'],
                event_record['response'],
                event_record['block_number'],
                event_record['transaction_hash']
            ])

        # Log to JSON
        try:
            with open(self.json_path, 'r') as f:
                events = json.load(f)
        except json.JSONDecodeError:
            events = []
        
        events.append(event_record)
        
        with open(self.json_path, 'w') as f:
            json.dump(events, f, indent=4)

        # Print to terminal
        print("\n=== New Event Detected ===")
        print(f"Timestamp: {timestamp}")
        print(f"Player: {event_record['player']}")
        print(f"Response: {event_record['response']}")
        print(f"Block Number: {event_record['block_number']}")
        print(f"Transaction Hash: {event_record['transaction_hash']}")
        print("=======================\n")

    async def process_response(self, player, response, timestamp, block_number, tx_hash):
        """Process the player's response through the AI agent"""
        try:
            logger.info(f"Processing response from {player}")
            self.log_event({
                'timestamp': timestamp,
                'player': player,
                'response': response,
                'blockNumber': block_number,
                'transactionHash': tx_hash
            })
            
            # TODO: Add your AI agent processing logic here
            # is_winning = await ai_agent.evaluate_response(response)
            # if is_winning:
            #     await self.submit_winner(player)
            
        except Exception as e:
            logger.error(f"Error processing response: {e}")

    async def submit_winner(self, winner_address):
        """Submit a winner to the smart contract"""
        try:
            nonce = self.w3.eth.get_transaction_count(self.account.address)
            
            tx = self.contract.functions.buttonPushed(winner_address).build_transaction({
                'from': self.account.address,
                'nonce': nonce,
                'gas': 200000,
                'gasPrice': self.w3.eth.gas_price
            })
            
            signed_tx = self.w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            logger.info(f"Winner submitted! Transaction hash: {receipt.transactionHash.hex()}")
            
        except Exception as e:
            logger.error(f"Error submitting winner: {e}")

    async def process_events(self, events):
        """Process a batch of events"""
        for event in events:
            player = event['args']['player']
            response = event['args']['response']
            timestamp = event['args']['timestamp']
            block_number = event['blockNumber']
            tx_hash = event['transactionHash']
            await self.process_response(player, response, timestamp, block_number, tx_hash)

    async def poll_for_events(self):
        """Poll for new GuessSubmitted events"""
        while True:
            try:
                current_block = self.w3.eth.block_number
                
                if current_block > self.last_processed_block:
                    events = self.contract.events.GuessSubmitted.get_logs(
                        fromBlock=self.last_processed_block + 1,
                        toBlock=current_block
                    )
                    
                    if events:
                        logger.info(f"Found {len(events)} new events")
                        await self.process_events(events)
                    
                    self.last_processed_block = current_block
                
                await asyncio.sleep(2)
                
            except Exception as e:
                logger.error(f"Error polling for events: {e}")
                await asyncio.sleep(5)

    def start(self):
        """Start the event listener"""
        try:
            asyncio.run(self.poll_for_events())
        except KeyboardInterrupt:
            logger.info("Shutting down listener...")

if __name__ == "__main__":
    listener = AgentTrumpListener()
    listener.start()
