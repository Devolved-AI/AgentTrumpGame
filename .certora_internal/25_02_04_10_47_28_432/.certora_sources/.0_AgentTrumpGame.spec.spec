methods {
    // View functions
    getContractBalance() returns uint256 envfree
    getCurrentRequiredAmount() returns uint256 envfree
    getTimeRemaining() returns uint256 envfree
    getCurrentEscalationPeriod() returns uint256 envfree
    shouldStartEscalation() returns bool envfree
    shouldExtendGame() returns bool envfree
    getPlayerResponseCount(address) returns uint256 envfree
    totalCollected() returns uint256 envfree
    gameEndBlock() returns uint256 envfree
    lastGuessBlock() returns uint256 envfree
    escalationStartBlock() returns uint256 envfree
    currentMultiplier() returns uint256 envfree
    currentRequiredAmount() returns uint256 envfree
    gameWon() returns bool envfree
    escalationActive() returns bool envfree
    lastPlayer() returns address envfree
    owner() returns address envfree

    // State-changing functions
    submitGuess(string) returns ()
    buttonPushed(address) returns ()
    endGame() returns ()
    withdraw() returns ()
    deposit() returns ()
}

definition BLOCKS_PER_MINUTE() returns uint256 = 4;
definition INITIAL_GAME_DURATION() returns uint256 = 20 * BLOCKS_PER_MINUTE();
definition ESCALATION_PERIOD() returns uint256 = 5 * BLOCKS_PER_MINUTE();
definition BASE_MULTIPLIER() returns uint256 = 200;
definition GAME_FEE() returns uint256 = 0.0009 ether;

// Invariants

// Total collected should never exceed contract balance
invariant collectibleBalanceInvariant()
    totalCollected() <= getContractBalance()

// Game end block should always be in the future when game is active
invariant validGameEndBlock()
    !gameWon() => gameEndBlock() >= lastGuessBlock()

// Last guess block should never exceed game end block
invariant validLastGuessBlock()
    lastGuessBlock() <= gameEndBlock()

// Required amount should never be zero during escalation
invariant validRequiredAmount()
    escalationActive() => getCurrentRequiredAmount() > 0

// Rules

// Verify that only owner can end game
rule onlyOwnerCanEndGame(method f) {
    env e;
    
    require f.selector != endGame().selector;
    
    address msgSender = e.msg.sender;
    require msgSender != owner();
    
    if (f.selector == endGame().selector) {
        assert false, "Non-owner should not be able to end game";
    }
}

// Verify game extension logic
rule validGameExtension() {
    env e;
    
    uint256 oldGameEndBlock = gameEndBlock();
    uint256 oldLastGuessBlock = lastGuessBlock();
    
    submitGuess@withrevert(e, "test");
    bool reverted = lastReverted;
    
    if (!reverted && shouldExtendGame()) {
        assert gameEndBlock() > oldGameEndBlock, "Game should be extended";
        assert lastGuessBlock() > oldLastGuessBlock, "Last guess block should be updated";
    }
}

// Verify escalation activation
rule validEscalationStart() {
    env e;
    
    require !escalationActive();
    require block.number >= (gameEndBlock() - ESCALATION_PERIOD());
    
    submitGuess@withrevert(e, "test");
    bool reverted = lastReverted;
    
    if (!reverted) {
        assert escalationActive(), "Escalation should be activated";
        assert escalationStartBlock() == e.block.number, "Escalation start block should be set";
    }
}

// Verify winner reward distribution
rule validWinnerReward() {
    env e;
    
    uint256 oldBalance = getContractBalance();
    uint256 oldTotalCollected = totalCollected();
    
    require !gameWon();
    require oldTotalCollected > 0;
    
    buttonPushed@withrevert(e, e.msg.sender);
    bool reverted = lastReverted;
    
    if (!reverted) {
        assert getContractBalance() == oldBalance - oldTotalCollected, 
            "Winner should receive total collected amount";
        assert totalCollected() == 0, "Total collected should be reset";
        assert gameWon(), "Game should be marked as won";
    }
}

// Verify valid deposits
rule validDeposit() {
    env e;
    
    uint256 oldBalance = getContractBalance();
    deposit@withrevert(e);
    bool reverted = lastReverted;
    
    if (!reverted) {
        assert getContractBalance() == oldBalance + e.msg.value,
            "Contract balance should increase by deposited amount";
    }
}

// Function Parameter Requirements

// Verify response length requirements in submitGuess
rule validResponseLength() {
    env e;
    string response;
    
    // Response cannot be empty
    require response.length == 0;
    submitGuess@withrevert(e, response);
    assert lastReverted, "Empty response should revert";
    
    // Response cannot be too long
    require response.length > 1000;
    submitGuess@withrevert(e, response);
    assert lastReverted, "Too long response should revert";
}

// Hooks
hook Sload uint256 balance currentRequiredAmount {
    require balance >= 0;
}

hook Sstore gameEndBlock uint256 newValue {
    require newValue >= block.number;
}
