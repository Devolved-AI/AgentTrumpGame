from web3 import Web3
import asyncio
import json
import logging
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Contract configuration
CONTRACT_ADDRESS = os.getenv('CONTRACT_ADDRESS')
RPC_URL = os.getenv('RPC_URL')  # Your Base network RPC URL
PRIVATE_KEY = os.getenv('PRIVATE_KEY')  # Contract owner's private key

# Load contract ABI
with open('contract_abi.json', 'r') as f:
    CONTRACT_ABI = json.load(f)

class AgentTrumpListener:
    def __init__(self):
        # Initialize Web3
        self.w3 = Web3(Web3.HTTPProvider(RPC_URL))
        
        # Create contract instance
        self.contract = self.w3.eth.contract(
            address=CONTRACT_ADDRESS,
            abi=CONTRACT_ABI
        )
        
        # Set up account
        self.account = self.w3.eth.account.from_key(PRIVATE_KEY)
        
        # Track the last block we processed
        self.last_processed_block = self.w3.eth.block_number
        
        logger.info(f"Initialized listener for contract: {CONTRACT_ADDRESS}")

    async def process_response(self, player, response, timestamp):
        """
        Process the player's response through the AI agent
        """
        try:
            logger.info(f"Processing response from {player}")
            logger.info(f"Response: {response}")
            logger.info(f"Timestamp: {datetime.fromtimestamp(timestamp)}")
            
            # TODO: Add your AI agent processing logic here
            # is_winning = await ai_agent.evaluate_response(response)
            # if is_winning:
            #     await self.submit_winner(player)
            
        except Exception as e:
            logger.error(f"Error processing response: {e}")

    async def submit_winner(self, winner_address):
        """
        Submit a winner to the smart contract
        """
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
        """
        Process a batch of events
        """
        for event in events:
            player = event['args']['player']
            response = event['args']['response']
            timestamp = event['args']['timestamp']
            await self.process_response(player, response, timestamp)

    async def poll_for_events(self):
        """
        Poll for new GuessSubmitted events
        """
        while True:
            try:
                # Get current block number
                current_block = self.w3.eth.block_number
                
                # If new blocks exist, check for events
                if current_block > self.last_processed_block:
                    events = self.contract.events.GuessSubmitted.get_logs(
                        fromBlock=self.last_processed_block + 1,
                        toBlock=current_block
                    )
                    
                    if events:
                        logger.info(f"Found {len(events)} new events")
                        await self.process_events(events)
                    
                    self.last_processed_block = current_block
                
                # Wait before next poll
                await asyncio.sleep(2)
                
            except Exception as e:
                logger.error(f"Error polling for events: {e}")
                await asyncio.sleep(5)

    def start(self):
        """
        Start the event listener
        """
        try:
            asyncio.run(self.poll_for_events())
        except KeyboardInterrupt:
            logger.info("Shutting down listener...")

if __name__ == "__main__":
    # Create and start the listener
    listener = AgentTrumpListener()
    listener.start()
