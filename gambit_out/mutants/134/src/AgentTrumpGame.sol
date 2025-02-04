// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AgentTrumpGame is ReentrancyGuard, Ownable {
    uint256 public gameEndBlock;
    uint256 public escalationStartBlock;
    uint256 public lastGuessBlock;
    
    uint256 public constant BLOCKS_PER_MINUTE = 4;
    uint256 public constant INITIAL_GAME_DURATION = 20 * BLOCKS_PER_MINUTE;
    uint256 public constant ESCALATION_PERIOD = 5 * BLOCKS_PER_MINUTE;
    uint256 public constant BASE_MULTIPLIER = 200;
    uint256 public constant GAME_FEE = 0.0009 ether;
    
    uint256 public currentMultiplier;
    uint256 public totalCollected;
    uint256 public currentRequiredAmount;
    address public lastPlayer;
    bool public gameWon;
    bool public escalationActive;

    struct PlayerResponse {
        string response;
        uint256 blockNumber;
        bool exists;
    }
    
    mapping(address => PlayerResponse[]) public playerResponses;
    
    event GuessSubmitted(address indexed player, uint256 amount, uint256 multiplier, string response, uint256 blockNumber, uint256 responseIndex);
    event GameWon(address indexed winner, uint256 reward);
    event GameEnded(address indexed lastPlayer, uint256 lastPlayerReward, uint256 ownerReward);
    event EscalationStarted(uint256 startBlock);
    event GameExtended(uint256 newEndBlock, uint256 newMultiplier);

    constructor() Ownable(msg.sender) {
        gameEndBlock = block.number + INITIAL_GAME_DURATION;
        currentMultiplier = 100;
        lastGuessBlock = block.number;
        currentRequiredAmount = GAME_FEE;
    }

    function endGame() external onlyOwner nonReentrant {
        require(totalCollected > 0, "No funds to distribute");
        require(lastPlayer != address(0), "No players participated");
        
        uint256 ownerReward;
        uint256 lastPlayerReward;
        address paymentReceiver = lastPlayer;
        
        if (block.number >= gameEndBlock) {
            lastPlayerReward = (totalCollected * 10) / 100;
            ownerReward = totalCollected - lastPlayerReward;
        } else {
            ownerReward = totalCollected;
            lastPlayerReward = 0;
        }
        
        totalCollected = 0;
        gameEndBlock = block.number;
        gameWon = false;
        
        if (lastPlayerReward > 0) {
            (bool success1, ) = payable(paymentReceiver).call{value: lastPlayerReward}("");
            require(success1, "Last player reward transfer failed");
        }
        
        (bool success2, ) = payable(owner()).call{value: ownerReward}("");
        require(success2, "Owner reward transfer failed");
        
        emit GameEnded(paymentReceiver, lastPlayerReward, ownerReward);
    }

    function withdraw() external onlyOwner {
        require(address(this).balance > 0, "No balance to withdraw");
        require(totalCollected == 0, "Must call endGame first to distribute rewards");
        
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }
    
    function getCurrentRequiredAmount() public view returns (uint256) {
        if (!escalationActive) return GAME_FEE;
        return currentRequiredAmount;
    }
    
    function shouldStartEscalation() public view returns (bool) {
        return !escalationActive && 
               block.number >= (gameEndBlock - ESCALATION_PERIOD);
    }
    
    function shouldExtendGame() public view returns (bool) {
        return escalationActive && 
               block.number <= gameEndBlock &&
               (block.number - lastGuessBlock) <= ESCALATION_PERIOD;
    }    
    
    function submitGuess(string calldata response) external payable nonReentrant {
        require(!gameWon, "Game already won");
        require(bytes(response).length > 0, "Response cannot be empty");
        require(bytes(response).length <= 1000, "Response too long");
        
        uint256 requiredAmount = getCurrentRequiredAmount();
        require(msg.value >= requiredAmount, "Insufficient payment");
        
        if (shouldStartEscalation()) {
            escalationActive = true;
            escalationStartBlock = block.number;
            /// BinaryOpMutation(`/` |==> `+`) of: `currentRequiredAmount = GAME_FEE * BASE_MULTIPLIER / 100;`
            currentRequiredAmount = GAME_FEE * BASE_MULTIPLIER+100;
            emit EscalationStarted(escalationStartBlock);
        }
        
        if (shouldExtendGame()) {
            gameEndBlock = block.number + ESCALATION_PERIOD;
            currentRequiredAmount = currentRequiredAmount * BASE_MULTIPLIER / 100;
            emit GameExtended(gameEndBlock, currentRequiredAmount);
        }
        
        playerResponses[msg.sender].push(PlayerResponse({
            response: response,
            blockNumber: block.number,
            exists: true
        }));
        
        lastGuessBlock = block.number;
        lastPlayer = msg.sender;
        
        uint256 ownerShare = (requiredAmount * 30) / 100;
        totalCollected += (requiredAmount - ownerShare);
        
        if (msg.value > requiredAmount) {
            uint256 excess = msg.value - requiredAmount;
            (bool success1, ) = payable(msg.sender).call{value: excess}("");
            require(success1, "Refund failed");
        }
        
        (bool success2, ) = payable(owner()).call{value: ownerShare}("");
        require(success2, "Owner payment failed");
        
        emit GuessSubmitted(
            msg.sender,
            requiredAmount,
            currentMultiplier,
            response,
            block.number,
            playerResponses[msg.sender].length - 1
        );
    }

    function getPlayerResponseCount(address player) public view returns (uint256) {
        return playerResponses[player].length;
    }

    function getPlayerResponseByIndex(address player, uint256 index) public view returns (
        string memory response, 
        uint256 timestamp, 
        bool exists
    ) {
        require(index < playerResponses[player].length, "Response index out of bounds");
        PlayerResponse memory playerResponse = playerResponses[player][index];
        return (playerResponse.response, playerResponse.blockNumber, playerResponse.exists);
    }

    function getAllPlayerResponses(address player) public view returns (
        string[] memory responses,
        uint256[] memory timestamps,
        bool[] memory exists
    ) {
        uint256 responseCount = playerResponses[player].length;
        
        responses = new string[](responseCount);
        timestamps = new uint256[](responseCount);
        exists = new bool[](responseCount);
        
        for (uint256 i = 0; i < responseCount; i++) {
            PlayerResponse memory response = playerResponses[player][i];
            responses[i] = response.response;
            timestamps[i] = response.blockNumber;
            exists[i] = response.exists;
        }
        
        return (responses, timestamps, exists);
    }
    
    function buttonPushed(address winner) external onlyOwner nonReentrant {
        require(!gameWon, "Game already won");
        require(winner != address(0), "Invalid winner address");
        require(playerResponses[winner].length > 0, "Winner must have submitted at least one response");
        
        gameWon = true;
        uint256 reward = totalCollected;
        totalCollected = 0;
        
        (bool success, ) = payable(winner).call{value: reward}("");
        require(success, "Reward transfer failed");
        
        emit GameWon(winner, reward);
    }

    function getTimeRemaining() public view returns (uint256) {
        if (block.number >= gameEndBlock) return 0;
        // Convert blocks to seconds (approximate)
        return (gameEndBlock - block.number) * 15;
    }
    
    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }
    
    function getCurrentEscalationPeriod() public view returns (uint256) {
        if (!escalationActive) return 0;
        return (block.number - escalationStartBlock) / ESCALATION_PERIOD;
    }
    
    function deposit() external payable onlyOwner {
        require(msg.value > 0, "Must deposit some ETH");
    }
    
    receive() external payable {}
    fallback() external payable {}
}
