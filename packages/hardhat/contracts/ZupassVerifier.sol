//SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "./Groth16Verifier.sol";

/**
 * A smart contract that uses a Groth16 verifier to verify a proof
 * @author BuidlGuidl
 */
contract ZupassVerifier is Groth16Verifier {
  // ----------------------
  // Predefined constatns |
  // ----------------------

  // This are DevConnect events UUIDs converted to bigint
  uint256[10] VALID_EVENT_IDS = [
    159998235512551662513795025856152008380, // AW Assembly
    12746885520180312913963899346253838012, // Programmable Cryptography
    327191738497033322235372973028470388666, // 0xPARC Event
    215044871853663930618877187302106366364, // Devconnect Cowork Space
    64184720578049698369149532776111445453, // Solidity Summit
    232265566639431563197006857049078036156, // EVM Summit
    163950200751872883273921880665741105506, // ETHconomics
    299420096544626786108848901027260962253, // Next Billion
    26642335343961279011750113402825948254, // Wallet Unconference
    234254580133246406732636908896641409375 // TEST event
  ];

  // This is hex to bigint conversion for Zupass signer
  uint256[2] ZUPASS_SIGNER = [
    2658696990997679927259430495938453033612384821046330804164935913637421782846,
    18852953264765021758165045442761617487242246681540213362114332008455443692095
  ];

  // ----------------------
  // State variables      |
  // ----------------------

  struct ProofArgs {
    uint256[2] _pA;
    uint256[2][2] _pB;
    uint256[2] _pC;
    uint256[38] _pubSignals;
  }

  // ----------------------
  // Modifiers            |
  // ----------------------

  modifier verifiedProof(ProofArgs calldata proof) {
    require(this.verifyProof(proof._pA, proof._pB, proof._pC, proof._pubSignals), "Invalid proof");
    _;
  }

  modifier validEventIds(uint256[38] memory _pubSignals) {
    uint256[] memory eventIds = getValidEventIdFromPublicSignals(_pubSignals);
    require(keccak256(abi.encodePacked(eventIds)) == keccak256(abi.encodePacked(VALID_EVENT_IDS)), "Invalid event ids");
    _;
  }

  modifier validSigner(uint256[38] memory _pubSignals) {
    uint256[2] memory signer = getSignerFromPublicSignals(_pubSignals);
    require(signer[0] == ZUPASS_SIGNER[0] && signer[1] == ZUPASS_SIGNER[1], "Invalid signer");
    _;
  }

  modifier validWaterMark(uint256[38] memory _pubSignals) {
    require(getWaterMarkFromPublicSignals(_pubSignals) == uint256(uint160(msg.sender)), "Invalid watermark");
    _;
  }

  // ----------------------------------------------------------
  // Utility functions for destructuring a proof publicSignals|
  // ----------------------------------------------------------

  function getWaterMarkFromPublicSignals(uint256[38] memory _pubSignals) public pure returns (uint256) {
    return _pubSignals[37];
  }

  // Numbers of events is arbitary but for this example we are using 10 (including test eventID)
  function getValidEventIdFromPublicSignals(uint256[38] memory _pubSignals) public view returns (uint256[] memory) {
    // Events are stored from starting index 15 to till valid event ids length
    uint256[] memory eventIds = new uint256[](VALID_EVENT_IDS.length);
    for (uint256 i = 0; i < VALID_EVENT_IDS.length; i++) {
      eventIds[i] = _pubSignals[15 + i];
    }
    return eventIds;
  }

  function getSignerFromPublicSignals(uint256[38] memory _pubSignals) public pure returns (uint256[2] memory) {
    uint256[2] memory signer;
    signer[0] = _pubSignals[13];
    signer[1] = _pubSignals[14];
    return signer;
  }
}
