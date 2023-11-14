//SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "./ZupassVerifier.sol";

interface IERC20 {
  function transfer(address receiver, uint256 amount) external returns (bool);
}

/**
 * A smart contract that uses a Zupass verifier to send ERC20 tokens.
 * @author BuidlGuidl
 */
contract ZupassDispenser is ZupassVerifier {
  // ----------------------
  // State variables      |
  // ----------------------

  uint256 public constant SALT_FAUCET_AMOUNT = 25 ether;
  uint256 public constant DAI_FAUCET_AMOUNT = 0.02 ether;

  mapping(uint256 => bool) public sent;
  IERC20 public creditToken;

  // ----------------------
  // Modifiers            |
  // ----------------------

  modifier notSent(uint256[38] memory _pubSignals) {
    require(!sent[_pubSignals[5]], "Already sent");
    _;
  }

  constructor(address _creditToken) {
    creditToken = IERC20(_creditToken);
  }

  function getFunds(
    ProofArgs calldata proof
  )
    public
    verifiedProof(proof)
    validEventIds(proof._pubSignals)
    validSigner(proof._pubSignals)
    notSent(proof._pubSignals)
  {
    sent[proof._pubSignals[5]] = true;

    (bool daiTransferred, ) = payable(msg.sender).call{value: DAI_FAUCET_AMOUNT}("");
    require(daiTransferred, "Dai transfer failed");

    bool creditTokenTransferred = creditToken.transfer(msg.sender, SALT_FAUCET_AMOUNT);
    require(creditTokenTransferred, "Credit token transfer failed");
  }

  receive() external payable {}
}
