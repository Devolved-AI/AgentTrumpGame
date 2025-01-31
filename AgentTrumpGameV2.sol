// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AgentTrumpGame is ReentrancyGuard, Ownable {
    // State variables remain the same
    uint256 public gameEndTime;
    uint256 public constant INITIAL_GAME_DURATION = 30 minutes;
    uint256 public constant ESCALATION_PERIOD = 5 minutes;
    uint256 public constant BASE_MULTIPLIER = 200;
    uint256 public constant GAME_FEE = 0.0009 ether;
    uint256 public escalationStartTime;
    uint256 public currentMultiplier;
    uint256 public lastGuessTime;
    uint256 public totalCollected;
    uint256 public currentRequiredAmount;
    address public lastPlayer;
    bool public gameWon;
    bool public escalationActive;
    
    struct PlayerResponse {
        string response;
        uint256 timestamp;
        bool exists;
    }
    
    mapping(address => PlayerResponse[]) public playerResponses;
    
    // Events remain the same
    event GuessSubmitted(
        address indexed player, 
        uint256 amount, 
        uint256 multiplier, 
        string response,
        uint256 timestamp,
        uint256 responseIndex
    );
    event GameWon(address indexed winner, uint256 reward);
    event GameEnded(address indexed lastPlayer, uint256 lastPlayerReward, uint256 ownerReward);
    event EscalationStarted(uint256 startTime);
    event GameExtended(uint256 newEndTime, uint256 newMultiplier);

    // Constructor and other functions remain the same until endGame
    constructor() Ownable(msg.sender) {
        gameEndTime = block.timestamp + INITIAL_GAME_DURATION;
        currentMultiplier = 100;
        lastGuessTime = block.timestamp;
        currentRequiredAmount = GAME_FEE;
    }

    // Modified endGame function
    function endGame() external onlyOwner nonReentrant {
        require(totalCollected > 0, "No funds to distribute");
        require(lastPlayer != address(0), "No players participated");
        
        uint256 lastPlayerReward = (totalCollected * 10) / 100;
        uint256 ownerReward = totalCollected - lastPlayerReward;
        
        totalCollected = 0;
        
        (bool success1, ) = payable(lastPlayer).call{value: lastPlayerReward}("");
        require(success1, "Last player reward transfer failed");
        
        (bool success2, ) = payable(owner()).call{value: ownerReward}("");
        require(success2, "Owner reward transfer failed");
        
        // Update game state
        gameEndTime = block.timestamp;
        gameWon = false;
        
        emit GameEnded(lastPlayer, lastPlayerReward, ownerReward);
    }

    // Rest of the contract functions remain unchanged
    function deposit() external payable onlyOwner {
        require(msg.value > 0, "Must deposit some ETH");
    }

    function withdraw() external onlyOwner {
        require(block.timestamp > gameEndTime || gameWon, "Game still in progress");
        require(address(this).balance > 0, "No balance to withdraw");
        
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }
    
    function getCurrentRequiredAmount() public view returns (uint256) {
        if (!escalationActive) return GAME_FEE;
        return currentRequiredAmount;
    }
    
    function shouldStartEscalation() public view returns (bool) {
        return !escalationActive && 
               block.timestamp >= (gameEndTime - ESCALATION_PERIOD);
    }
    
    function shouldExtendGame() public view returns (bool) {
        return escalationActive && 
               block.timestamp <= gameEndTime &&
               (block.timestamp - lastGuessTime) <= ESCALATION_PERIOD;
    }
    
    function submitGuess(string calldata response) external payable nonReentrant {
        require(!gameWon, "Game already won");
        require(bytes(response).length > 0, "Response cannot be empty");
        require(bytes(response).length <= 1000, "Response too long");
        
        if (shouldStartEscalation()) {
            escalationActive = true;
            escalationStartTime = block.timestamp;
            currentRequiredAmount = GAME_FEE * BASE_MULTIPLIER / 100;
            emit EscalationStarted(escalationStartTime);
        }

        require(msg.value >= currentRequiredAmount, "Insufficient payment");
        
        if (shouldExtendGame()) {
            gameEndTime = block.timestamp + ESCALATION_PERIOD;
            currentRequiredAmount = currentRequiredAmount * BASE_MULTIPLIER / 100;
            emit GameExtended(gameEndTime, currentRequiredAmount);
        }
        
        require(block.timestamp <= gameEndTime, "Game has ended");
        
        if (msg.value > currentRequiredAmount) {
            uint256 excess = msg.value - currentRequiredAmount;
            (bool success, ) = payable(msg.sender).call{value: excess}("");
            require(success, "Refund failed");
        }
        
        uint256 ownerShare = (currentRequiredAmount * 30) / 100;
        (bool success2, ) = payable(owner()).call{value: ownerShare}("");
        require(success2, "Owner payment failed");
        
        playerResponses[msg.sender].push(PlayerResponse({
            response: response,
            timestamp: block.timestamp,
            exists: true
        }));
        
        uint256 responseIndex = playerResponses[msg.sender].length - 1;
        
        totalCollected += (currentRequiredAmount - ownerShare);
        lastPlayer = msg.sender;
        lastGuessTime = block.timestamp;
        
        emit GuessSubmitted(
            msg.sender, 
            currentRequiredAmount, 
            currentMultiplier, 
            response,
            block.timestamp,
            responseIndex
        );
    }

    function getPlayerResponseCount(address player) external view returns (uint256) {
        return playerResponses[player].length;
    }

    function getPlayerResponseByIndex(address player, uint256 index) external view returns (
        string memory response, 
        uint256 timestamp, 
        bool exists
    ) {
        require(index < playerResponses[player].length, "Response index out of bounds");
        PlayerResponse memory playerResponse = playerResponses[player][index];
        return (playerResponse.response, playerResponse.timestamp, playerResponse.exists);
    }

    function getAllPlayerResponses(address player) external view returns (
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
            timestamps[i] = response.timestamp;
            exists[i] = response.exists;
        }
        
        return (responses, timestamps, exists);
    }
    
    function buttonPushed(address winner) external onlyOwner nonReentrant {
        require(block.timestamp <= gameEndTime, "Game has ended");
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

    function getTimeRemaining() external view returns (uint256) {
        if (block.timestamp >= gameEndTime) return 0;
        return gameEndTime - block.timestamp;
    }
    
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    function getCurrentEscalationPeriod() external view returns (uint256) {
        if (!escalationActive) return 0;
        return (block.timestamp - escalationStartTime) / ESCALATION_PERIOD;
    }
    
    receive() external payable {}
    fallback() external payable {}
}
