
// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract AgentTrumpGame is ReentrancyGuard, Ownable, Pausable {
    uint256 public gameEndBlock;
    uint256 public escalationStartBlock;
    uint256 public lastGuessBlock;
    
    uint256 public constant BLOCKS_PER_MINUTE = 30;
    uint256 public constant INITIAL_GAME_DURATION = 30 * BLOCKS_PER_MINUTE;
    uint256 public constant ESCALATION_PERIOD = 5 * BLOCKS_PER_MINUTE;
    uint256 public constant BASE_MULTIPLIER = 200;
    uint256 public constant GAME_FEE = 0.0009 ether;
    uint256 public constant MAX_RESPONSE_LENGTH = 2000;
    
    // Escalation prices matching the frontend table
    uint256[10] public escalationPrices = [
        0.0018 ether, // First 5 minutes
        0.0036 ether, // Second 5 minutes
        0.0072 ether, // Third 5 minutes
        0.0144 ether, // Fourth 5 minutes
        0.0288 ether, // Fifth 5 minutes
        0.0576 ether, // Sixth 5 minutes
        0.1152 ether, // Seventh 5 minutes
        0.2304 ether, // Eighth 5 minutes
        0.4608 ether, // Ninth 5 minutes
        0.9216 ether  // Tenth 5 minutes
    ];
    
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
    event Deposited(address indexed owner, uint256 amount);
    
    constructor() Ownable(msg.sender) {
        gameEndBlock = block.number + INITIAL_GAME_DURATION;
        currentMultiplier = BASE_MULTIPLIER;
        currentRequiredAmount = GAME_FEE;
    }
    
    receive() external payable {
        deposit();
    }
    
    fallback() external payable {
        deposit();
    }
    
    function deposit() public payable {
        emit Deposited(msg.sender, msg.value);
    }
    
    function withdraw() external onlyOwner {
        uint256 amount = address(this).balance;
        (bool success, ) = owner().call{value: amount}("");
        require(success, "Transfer failed");
        emit Withdrawn(owner(), amount);
    }
    
    function emergencyWithdraw() external onlyOwner {
        uint256 amount = address(this).balance;
        (bool success, ) = owner().call{value: amount}("");
        require(success, "Transfer failed");
        emit EmergencyWithdrawn(owner(), amount);
    }
    
    function submitGuess(string calldata response) external payable nonReentrant whenNotPaused {
        require(!gameWon, "Game already won");
        require(block.number <= gameEndBlock, "Game has ended");
        require(bytes(response).length > 0, "Response cannot be empty");
        require(bytes(response).length <= MAX_RESPONSE_LENGTH, "Response too long");
        
        // Update the current required amount based on escalation status
        updateRequiredAmount();
        
        require(msg.value >= currentRequiredAmount, "Insufficient payment");
        
        // Add the response to the player's list
        playerResponses[msg.sender].push(PlayerResponse({
            response: response,
            blockNumber: block.number,
            exists: true
        }));
        
        // Update game state
        lastPlayer = msg.sender;
        lastGuessBlock = block.number;
        totalCollected += msg.value;
        
        // Check if the game should be extended
        if (shouldExtendGame()) {
            gameEndBlock += BLOCKS_PER_MINUTE;
            currentMultiplier = BASE_MULTIPLIER;
            emit GameExtended(gameEndBlock, currentMultiplier);
        }
        
        // Check if escalation should start
        if (shouldStartEscalation() && !escalationActive) {
            escalationActive = true;
            escalationStartBlock = block.number;
            updateRequiredAmount(); // Update required amount after activation
            emit EscalationStarted(escalationStartBlock);
        }
        
        emit GuessSubmitted(
            msg.sender,
            msg.value,
            currentMultiplier,
            response,
            block.number,
            playerResponses[msg.sender].length - 1
        );
    }
    
    function updateRequiredAmount() internal {
        if (escalationActive) {
            uint256 period = getCurrentEscalationPeriod();
            if (period > 0 && period <= 10) {
                // Use the pre-defined escalation prices array (1-indexed)
                currentRequiredAmount = escalationPrices[period - 1];
            } else {
                // Fallback to base fee if period is out of range
                currentRequiredAmount = GAME_FEE;
            }
        } else {
            currentRequiredAmount = GAME_FEE;
        }
    }
    
    function getCurrentEscalationPeriod() public view returns (uint256) {
        if (!escalationActive || block.number < escalationStartBlock) {
            return 0;
        }
        
        uint256 blocksPassed = block.number - escalationStartBlock;
        uint256 period = (blocksPassed / ESCALATION_PERIOD) + 1;
        
        return period <= 10 ? period : 11; // Return 11 if past the 10th period
    }
    
    function getCurrentRequiredAmount() external view returns (uint256) {
        if (escalationActive) {
            uint256 period = getCurrentEscalationPeriod();
            if (period > 0 && period <= 10) {
                return escalationPrices[period - 1];
            }
        }
        return GAME_FEE;
    }
    
    function buttonPushed(address winner) external onlyOwner {
        require(!gameWon, "Game already won");
        require(block.number <= gameEndBlock, "Game has ended");
        
        gameWon = true;
        uint256 reward = address(this).balance;
        
        (bool success, ) = winner.call{value: reward}("");
        require(success, "Transfer failed");
        
        emit GameWon(winner, reward);
    }
    
    function endGame() external {
        require(block.number > gameEndBlock || 
                (escalationActive && getCurrentEscalationPeriod() > 10), 
                "Game not yet ended");
        require(!gameWon, "Game already won");
        
        uint256 totalBalance = address(this).balance;
        uint256 lastPlayerReward = totalBalance / 10; // 10% to last player
        uint256 ownerReward = totalBalance - lastPlayerReward; // 90% to owner
        
        if (lastPlayer != address(0)) {
            (bool success1, ) = lastPlayer.call{value: lastPlayerReward}("");
            require(success1, "Transfer to last player failed");
        } else {
            ownerReward = totalBalance; // All to owner if no last player
        }
        
        (bool success2, ) = owner().call{value: ownerReward}("");
        require(success2, "Transfer to owner failed");
        
        emit GameEnded(lastPlayer, lastPlayerReward, ownerReward);
    }
    
    function shouldExtendGame() public view returns (bool) {
        // Extend only if not in escalation and a guess was made in the last minute
        return !escalationActive && 
               lastGuessBlock > 0 && 
               gameEndBlock - block.number <= BLOCKS_PER_MINUTE &&
               gameEndBlock - lastGuessBlock <= BLOCKS_PER_MINUTE;
    }
    
    function shouldStartEscalation() public view returns (bool) {
        return !escalationActive && block.number >= gameEndBlock;
    }
    
    function getTimeRemaining() external view returns (uint256) {
        if (block.number >= gameEndBlock && !escalationActive) {
            return 0;
        }
        
        if (escalationActive) {
            uint256 period = getCurrentEscalationPeriod();
            if (period > 10) {
                return 0; // Game is over after 10th period
            }
            
            uint256 currentPeriodEndBlock = escalationStartBlock + (period * ESCALATION_PERIOD);
            if (block.number >= currentPeriodEndBlock) {
                return 0; // Current period is already over
            }
            
            return currentPeriodEndBlock - block.number;
        }
        
        return gameEndBlock - block.number;
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
        return (playerResponse.response, playerResponse.blockNumber, playerResponse.exists);
    }
    
    function getAllPlayerResponses(address player) external view returns (
        string[] memory responses,
        uint256[] memory timestamps,
        bool[] memory exists
    ) {
        uint256 count = playerResponses[player].length;
        responses = new string[](count);
        timestamps = new uint256[](count);
        exists = new bool[](count);
        
        for (uint256 i = 0; i < count; i++) {
            PlayerResponse memory playerResponse = playerResponses[player][i];
            responses[i] = playerResponse.response;
            timestamps[i] = playerResponse.blockNumber;
            exists[i] = playerResponse.exists;
        }
    }
    
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
}
