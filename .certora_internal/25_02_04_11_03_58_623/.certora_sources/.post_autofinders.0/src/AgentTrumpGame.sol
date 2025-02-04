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
        
        uint256 ownerReward;assembly ("memory-safe"){mstore(0xffffff6e4604afefe123321beef1b02fffffffffffffffffffffffff00000001,ownerReward)}
        uint256 lastPlayerReward;assembly ("memory-safe"){mstore(0xffffff6e4604afefe123321beef1b02fffffffffffffffffffffffff00000002,lastPlayerReward)}
        address paymentReceiver = lastPlayer;assembly ("memory-safe"){mstore(0xffffff6e4604afefe123321beef1b02fffffffffffffffffffffffff00000003,paymentReceiver)}
        
        if (block.number >= gameEndBlock) {
            lastPlayerReward = (totalCollected * 10) / 100;
            ownerReward = totalCollected - lastPlayerReward;
        } else {
            ownerReward = totalCollected;assembly ("memory-safe"){mstore(0xffffff6e4604afefe123321beef1b02fffffffffffffffffffffffff00000011,ownerReward)}
            lastPlayerReward = 0;assembly ("memory-safe"){mstore(0xffffff6e4604afefe123321beef1b02fffffffffffffffffffffffff00000012,lastPlayerReward)}
        }
        
        totalCollected = 0;
        gameEndBlock = block.number;
        gameWon = false;
        
        if (lastPlayerReward > 0) {
            (bool success1, ) = payable(paymentReceiver).call{value: lastPlayerReward}("");
            require(success1, "Last player reward transfer failed");
        }
        
        (bool success2, ) = payable(owner()).call{value: ownerReward}("");assembly ("memory-safe"){mstore(0xffffff6e4604afefe123321beef1b02fffffffffffffffffffffffff00010004,0)}
        require(success2, "Owner reward transfer failed");
        
        emit GameEnded(paymentReceiver, lastPlayerReward, ownerReward);
    }

    function withdraw() external onlyOwner {
        require(address(this).balance > 0, "No balance to withdraw");
        require(totalCollected == 0, "Must call endGame first to distribute rewards");
        
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");assembly ("memory-safe"){mstore(0xffffff6e4604afefe123321beef1b02fffffffffffffffffffffffff00010005,0)}
        require(success, "Withdraw failed");
    }
    
    function getCurrentRequiredAmount() public view returns (uint256) {assembly ("memory-safe") { mstore(0xffffff6e4604afefe123321beef1b01fffffffffffffffffffffffff000b0000, 1037618708491) mstore(0xffffff6e4604afefe123321beef1b01fffffffffffffffffffffffff000b0001, 0) mstore(0xffffff6e4604afefe123321beef1b01fffffffffffffffffffffffff000b0004, 0) }
        if (!escalationActive) return GAME_FEE;
        return currentRequiredAmount;
    }
    
    function shouldStartEscalation() public view returns (bool) {assembly ("memory-safe") { mstore(0xffffff6e4604afefe123321beef1b01fffffffffffffffffffffffff00040000, 1037618708484) mstore(0xffffff6e4604afefe123321beef1b01fffffffffffffffffffffffff00040001, 0) mstore(0xffffff6e4604afefe123321beef1b01fffffffffffffffffffffffff00040004, 0) }
        return !escalationActive && 
               block.number >= (gameEndBlock - ESCALATION_PERIOD);
    }
    
    function shouldExtendGame() public view returns (bool) {assembly ("memory-safe") { mstore(0xffffff6e4604afefe123321beef1b01fffffffffffffffffffffffff00070000, 1037618708487) mstore(0xffffff6e4604afefe123321beef1b01fffffffffffffffffffffffff00070001, 0) mstore(0xffffff6e4604afefe123321beef1b01fffffffffffffffffffffffff00070004, 0) }
        return escalationActive && 
               block.number <= gameEndBlock &&
               (block.number - lastGuessBlock) <= ESCALATION_PERIOD;
    }    
    
    function submitGuess(string calldata response) external payable nonReentrant {
        require(!gameWon, "Game already won");
        require(bytes(response).length > 0, "Response cannot be empty");
        require(bytes(response).length <= 1000, "Response too long");
        
        uint256 requiredAmount = getCurrentRequiredAmount();assembly ("memory-safe"){mstore(0xffffff6e4604afefe123321beef1b02fffffffffffffffffffffffff00000006,requiredAmount)}
        require(msg.value >= requiredAmount, "Insufficient payment");
        
        if (shouldStartEscalation()) {
            escalationActive = true;
            escalationStartBlock = block.number;
            currentRequiredAmount = GAME_FEE * BASE_MULTIPLIER / 100;
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
        
        uint256 ownerShare = (requiredAmount * 30) / 100;assembly ("memory-safe"){mstore(0xffffff6e4604afefe123321beef1b02fffffffffffffffffffffffff00000007,ownerShare)}
        totalCollected += (requiredAmount - ownerShare);
        
        if (msg.value > requiredAmount) {
            uint256 excess = msg.value - requiredAmount;
            (bool success1, ) = payable(msg.sender).call{value: excess}("");
            require(success1, "Refund failed");
        }
        
        (bool success2, ) = payable(owner()).call{value: ownerShare}("");assembly ("memory-safe"){mstore(0xffffff6e4604afefe123321beef1b02fffffffffffffffffffffffff00010008,0)}
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

    function getPlayerResponseCount(address player) public view returns (uint256) {assembly ("memory-safe") { mstore(0xffffff6e4604afefe123321beef1b01fffffffffffffffffffffffff00030000, 1037618708483) mstore(0xffffff6e4604afefe123321beef1b01fffffffffffffffffffffffff00030001, 1) mstore(0xffffff6e4604afefe123321beef1b01fffffffffffffffffffffffff00030005, 1) mstore(0xffffff6e4604afefe123321beef1b01fffffffffffffffffffffffff00036000, player) }
        return playerResponses[player].length;
    }

    function getPlayerResponseByIndex(address player, uint256 index) public view returns (
        string memory response, 
        uint256 timestamp, 
        bool exists
    ) {assembly ("memory-safe") { mstore(0xffffff6e4604afefe123321beef1b01fffffffffffffffffffffffff00000000, 1037618708480) mstore(0xffffff6e4604afefe123321beef1b01fffffffffffffffffffffffff00000001, 2) mstore(0xffffff6e4604afefe123321beef1b01fffffffffffffffffffffffff00000005, 9) mstore(0xffffff6e4604afefe123321beef1b01fffffffffffffffffffffffff00006001, index) }
        require(index < playerResponses[player].length, "Response index out of bounds");
        PlayerResponse memory playerResponse = playerResponses[player][index];assembly ("memory-safe"){mstore(0xffffff6e4604afefe123321beef1b02fffffffffffffffffffffffff00010009,0)}
        return (playerResponse.response, playerResponse.blockNumber, playerResponse.exists);
    }

    function getAllPlayerResponses(address player) public view returns (
        string[] memory responses,
        uint256[] memory timestamps,
        bool[] memory exists
    ) {assembly ("memory-safe") { mstore(0xffffff6e4604afefe123321beef1b01fffffffffffffffffffffffff00090000, 1037618708489) mstore(0xffffff6e4604afefe123321beef1b01fffffffffffffffffffffffff00090001, 1) mstore(0xffffff6e4604afefe123321beef1b01fffffffffffffffffffffffff00090005, 1) mstore(0xffffff6e4604afefe123321beef1b01fffffffffffffffffffffffff00096000, player) }
        uint256 responseCount = playerResponses[player].length;assembly ("memory-safe"){mstore(0xffffff6e4604afefe123321beef1b02fffffffffffffffffffffffff0000000a,responseCount)}
        
        responses = new string[](responseCount);assembly ("memory-safe"){mstore(0xffffff6e4604afefe123321beef1b02fffffffffffffffffffffffff0002000d,0)}
        timestamps = new uint256[](responseCount);assembly ("memory-safe"){mstore(0xffffff6e4604afefe123321beef1b02fffffffffffffffffffffffff0002000e,0)}
        exists = new bool[](responseCount);assembly ("memory-safe"){mstore(0xffffff6e4604afefe123321beef1b02fffffffffffffffffffffffff0002000f,0)}
        
        for (uint256 i = 0; i < responseCount; i++) {
            PlayerResponse memory response = playerResponses[player][i];assembly ("memory-safe"){mstore(0xffffff6e4604afefe123321beef1b02fffffffffffffffffffffffff00010010,0)}
            responses[i] = response.response;assembly ("memory-safe"){mstore(0xffffff6e4604afefe123321beef1b02fffffffffffffffffffffffff00020013,0)}
            timestamps[i] = response.blockNumber;uint256 certora_local20 = timestamps[i];assembly ("memory-safe"){mstore(0xffffff6e4604afefe123321beef1b02fffffffffffffffffffffffff00000014,certora_local20)}
            exists[i] = response.exists;bool certora_local21 = exists[i];assembly ("memory-safe"){mstore(0xffffff6e4604afefe123321beef1b02fffffffffffffffffffffffff00000015,certora_local21)}
        }
        
        return (responses, timestamps, exists);
    }
    
    function buttonPushed(address winner) external onlyOwner nonReentrant {
        require(!gameWon, "Game already won");
        require(winner != address(0), "Invalid winner address");
        require(playerResponses[winner].length > 0, "Winner must have submitted at least one response");
        
        gameWon = true;
        uint256 reward = totalCollected;assembly ("memory-safe"){mstore(0xffffff6e4604afefe123321beef1b02fffffffffffffffffffffffff0000000b,reward)}
        totalCollected = 0;
        
        (bool success, ) = payable(winner).call{value: reward}("");assembly ("memory-safe"){mstore(0xffffff6e4604afefe123321beef1b02fffffffffffffffffffffffff0001000c,0)}
        require(success, "Reward transfer failed");
        
        emit GameWon(winner, reward);
    }

    function getTimeRemaining() public view returns (uint256) {assembly ("memory-safe") { mstore(0xffffff6e4604afefe123321beef1b01fffffffffffffffffffffffff00080000, 1037618708488) mstore(0xffffff6e4604afefe123321beef1b01fffffffffffffffffffffffff00080001, 0) mstore(0xffffff6e4604afefe123321beef1b01fffffffffffffffffffffffff00080004, 0) }
        if (block.number >= gameEndBlock) return 0;
        // Convert blocks to seconds (approximate)
        return (gameEndBlock - block.number) * 15;
    }
    
    function getContractBalance() public view returns (uint256) {assembly ("memory-safe") { mstore(0xffffff6e4604afefe123321beef1b01fffffffffffffffffffffffff00050000, 1037618708485) mstore(0xffffff6e4604afefe123321beef1b01fffffffffffffffffffffffff00050001, 0) mstore(0xffffff6e4604afefe123321beef1b01fffffffffffffffffffffffff00050004, 0) }
        return address(this).balance;
    }
    
    function getCurrentEscalationPeriod() public view returns (uint256) {assembly ("memory-safe") { mstore(0xffffff6e4604afefe123321beef1b01fffffffffffffffffffffffff000a0000, 1037618708490) mstore(0xffffff6e4604afefe123321beef1b01fffffffffffffffffffffffff000a0001, 0) mstore(0xffffff6e4604afefe123321beef1b01fffffffffffffffffffffffff000a0004, 0) }
        if (!escalationActive) return 0;
        return (block.number - escalationStartBlock) / ESCALATION_PERIOD;
    }
    
    function deposit() external payable onlyOwner {
        require(msg.value > 0, "Must deposit some ETH");
    }
    
    receive() external payable {}
    fallback() external payable {}
}
