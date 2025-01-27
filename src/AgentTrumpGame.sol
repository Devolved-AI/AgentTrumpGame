// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@smartcontractkit/chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract AgentTrumpGame is ReentrancyGuard, Ownable {
    // State variables
    uint256 public gameEndTime;
    uint256 public constant INITIAL_GAME_DURATION = 72 hours;
    uint256 public constant ESCALATION_PERIOD = 5 minutes;
    uint256 public constant BASE_MULTIPLIER = 101; // 1.01 in basis points (100 = 1.00)
    uint256 public escalationStartTime;
    uint256 public currentMultiplier;
    uint256 public lastGuessTime;
    uint256 public totalCollected;
    address public lastPlayer;
    bool public gameWon;
    bool public escalationActive;
    
    // Price feed for BASE/USD
    AggregatorV3Interface public priceFeed;
    
    // Events
    event GuessSubmitted(address indexed player, uint256 amount, uint256 multiplier);
    event GameWon(address indexed winner, uint256 reward);
    event GameEnded(address indexed lastPlayer, uint256 lastPlayerReward, uint256 ownerReward);
    event EscalationStarted(uint256 startTime);
    event GameExtended(uint256 newEndTime, uint256 newMultiplier);
    
    constructor(address _priceFeed) Ownable(msg.sender) {
        require(_priceFeed != address(0), "Invalid price feed address");
        priceFeed = AggregatorV3Interface(_priceFeed);
        gameEndTime = block.timestamp + INITIAL_GAME_DURATION;
        currentMultiplier = 100; // Start at 1.00
        lastGuessTime = block.timestamp;
    }
    
    // Get the latest BASE/USD price
    function getLatestPrice() public view returns (uint256) {
        (, int256 price,,,) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price");
        return uint256(price);
    }
    
    // Calculate current required payment amount
    function getCurrentRequiredAmount() public view returns (uint256) {
        uint256 baseAmount = getDollarEquivalent();
        return (baseAmount * currentMultiplier) / 100;
    }
    
    // Calculate how much BASE ETH equals $1
    function getDollarEquivalent() public view returns (uint256) {
        uint256 basePrice = getLatestPrice(); // Price has 8 decimals
        // For $1, multiply by 1e18 (wei) and 1e8 (price decimals)
        return (1e26) / basePrice; // Returns amount in wei
    }
    
    // Check if escalation should start
    function shouldStartEscalation() public view returns (bool) {
        return !escalationActive && 
               block.timestamp >= (gameEndTime - ESCALATION_PERIOD);
    }
    
    // Check if game should be extended
    function shouldExtendGame() public view returns (bool) {
        return escalationActive && 
               block.timestamp <= gameEndTime &&
               (block.timestamp - lastGuessTime) <= ESCALATION_PERIOD;
    }
    
    // Submit a guess
    function submitGuess() external payable nonReentrant {
        require(!gameWon, "Game already won");
        
        // Check if escalation should start
        if (shouldStartEscalation()) {
            escalationActive = true;
            escalationStartTime = block.timestamp;
            currentMultiplier = BASE_MULTIPLIER;
            emit EscalationStarted(escalationStartTime);
        }
        
        // Check if game should be extended
        if (shouldExtendGame()) {
            gameEndTime = block.timestamp + ESCALATION_PERIOD;
            currentMultiplier = (currentMultiplier * BASE_MULTIPLIER) / 100;
            emit GameExtended(gameEndTime, currentMultiplier);
        }
        
        require(block.timestamp <= gameEndTime, "Game has ended");
        
        uint256 requiredAmount = getCurrentRequiredAmount();
        require(msg.value >= requiredAmount, "Insufficient payment");
        
        // Refund excess payment
        if (msg.value > requiredAmount) {
            uint256 excess = msg.value - requiredAmount;
            (bool success, ) = payable(msg.sender).call{value: excess}("");
            require(success, "Refund failed");
        }
        
        // Split payment: 70% to contract, 30% to owner
        uint256 ownerShare = (requiredAmount * 30) / 100;
        (bool success2, ) = payable(owner()).call{value: ownerShare}("");
        require(success2, "Owner payment failed");
        
        // Update state
        totalCollected += (requiredAmount - ownerShare);
        lastPlayer = msg.sender;
        lastGuessTime = block.timestamp;
        
        emit GuessSubmitted(msg.sender, requiredAmount, currentMultiplier);
    }
    
    // Called when button is successfully pushed
    function buttonPushed(address winner) external onlyOwner nonReentrant {
        require(block.timestamp <= gameEndTime, "Game has ended");
        require(!gameWon, "Game already won");
        require(winner != address(0), "Invalid winner address");
        
        gameWon = true;
        uint256 reward = totalCollected;
        totalCollected = 0;
        
        // Transfer all collected BASE to winner
        (bool success, ) = payable(winner).call{value: reward}("");
        require(success, "Reward transfer failed");
        
        emit GameWon(winner, reward);
    }
    
    // End game and distribute rewards if no winner
    function endGame() external nonReentrant {
        require(block.timestamp > gameEndTime, "Game not yet ended");
        require(!gameWon, "Game was won");
        require(totalCollected > 0, "No funds to distribute");
        require(lastPlayer != address(0), "No players participated");
        
        // Calculate rewards: 10% to last player, 90% to owner
        uint256 lastPlayerReward = (totalCollected * 10) / 100;
        uint256 ownerReward = totalCollected - lastPlayerReward;
        
        // Reset state
        totalCollected = 0;
        
        // Transfer rewards
        (bool success1, ) = payable(lastPlayer).call{value: lastPlayerReward}("");
        require(success1, "Last player reward transfer failed");
        
        (bool success2, ) = payable(owner()).call{value: ownerReward}("");
        require(success2, "Owner reward transfer failed");
        
        emit GameEnded(lastPlayer, lastPlayerReward, ownerReward);
    }
    
    // View functions
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
    
    // Fallback and receive functions
    receive() external payable {}
    fallback() external payable {}
}
