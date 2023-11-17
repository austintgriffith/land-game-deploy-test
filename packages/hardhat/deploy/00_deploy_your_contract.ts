import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import tokensConfig from "../../nextjs/tokens.config";

/**
 * Deploys a contract named "YourContract" using the deployer account and
 * constructor arguments set to the deployer address
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployYourContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /*
    On localhost, the deployer account is the one that comes with Hardhat, which is already funded.

    When deploying to live networks (e.g `yarn deploy --network goerli`), the deployer account
    should have sufficient balance to pay for the gas fees for contract creation.

    You can generate a random account with `yarn generate` which will fill DEPLOYER_PRIVATE_KEY
    with a random private key in the .env file (then used on hardhat.config.ts)
    You can run the `yarn account` command to check your balance in every network.
  */
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const signer = await hre.ethers.getSigner(deployer);

  const HARDCODED_DELAY = 12000;

  //make a sleep function
  const sleep = (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  const YOUR_LOCAL_BURNER_ADDRESS = "0x98AfB7982F8E86AC8944Bd3c1b6376D1B8033944"; //use punkwallet.io to create a burner that holds credits and can disperse

  const ownerAddress = deployer;
  const dexOwner = YOUR_LOCAL_BURNER_ADDRESS;
  const dispenserOwner = dexOwner;
  const dexPausers = [
    dexOwner,
    /*   "0xd6f85d9d79E3a87eCFe98d907495f85Fb6DAF74f", //Damu
    "0xD26536C559B10C5f7261F3FfaFf728Fe1b3b0dEE", //Damu
    "0x6CE015E312e7240e85323A2a506cbD799534aB68", //Toady
    "0xD26536C559B10C5f7261F3FfaFf728Fe1b3b0dEE", //Toady
    "0xA7430Da2932cf53B329B4eE1307edb361B5852ea", //Austin
    "0x9312Ead97CD5cfDd43EEd47261FB69081e2e17c3", //Austin
    "0x24A1F90D3243844d4020f042E1310fa16ACdF752",*/
  ];
  const dispersers = dexPausers;
  const minters = dexPausers;

  const salt = await deploy("SaltToken", {
    from: deployer,
    args: [ownerAddress],
    log: true,
    autoMine: true,
  });
  if (salt.newlyDeployed) await sleep(HARDCODED_DELAY);

  const tokens = tokensConfig;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    const tokenDeploy = await deploy(token.contractName, {
      from: deployer,
      args: [token.name, token.emoji, ownerAddress],
      log: true,
      autoMine: true,
      contract: "FruitToken",
    });

    if (tokenDeploy.newlyDeployed) await sleep(HARDCODED_DELAY);
  }
  /*
  await deploy("EventSBT", {
    from: deployer,
    // Contract constructor arguments
    args: [ownerAddress, salt.address],
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });*/

  const saltContract = await hre.ethers.getContract("SaltToken", deployer);

  const creditCalcDeploy = await deploy("CreditNwCalc", {
    from: deployer,
    args: [saltContract.address],
    log: true,
    autoMine: true,
  });

  if (creditCalcDeploy.newlyDeployed) await sleep(HARDCODED_DELAY);

  const tokensContracts = [];

  for (let i = 0; i < tokens.length; i++) {
    console.log("Getting contract for " + tokens[i].contractName);
    tokensContracts.push(await hre.ethers.getContract(tokens[i].contractName, deployer));
  }

  for (let i = 0; i < minters.length; i++) {
    const minterRole = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("MINTER_ROLE"));
    const hasRole = await saltContract.hasRole(minterRole, minters[i]);
    if (hasRole) {
      console.log("Address " + minters[i] + " has the minter role already.");
    } else {
      console.log("Granting minter role on salt (credits) contract to " + minters[i]);
      const result = await saltContract.grantRole(minterRole, minters[i]);
      await result.wait();
    }
  }

  console.log("granting all minters on all tokens...");
  for (let i = 0; i < tokens.length; i++) {
    for (let j = 0; j < minters.length; j++) {
      const minterRole = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("MINTER_ROLE"));
      const hasRole = await tokensContracts[i].hasRole(minterRole, minters[j]);

      if (hasRole) {
        console.log("Address " + minters[j] + " has the minter role already.");
      } else {
        console.log("Granting minter role on " + tokens[i].name + " to " + minters[j]);
        const result = await tokensContracts[i].grantRole(minterRole, minters[j]);
        await result.wait();
      }
    }
  }

  console.log("Deploying ZupassDispenser...");
  const zupassDispenser = await deploy("ZupassDispenser", {
    from: deployer,
    args: [saltContract.address],
    log: true,
    autoMine: true,
  });

  if (zupassDispenser.newlyDeployed) await sleep(HARDCODED_DELAY);

  const zupassDispenserBalance = await hre.ethers.provider.getBalance(zupassDispenser.address);
  console.log("zupassDispenserBalance: " + zupassDispenserBalance);

  if (zupassDispenserBalance >= hre.ethers.utils.parseEther("1")) {
    console.log("ZupassDispenser already has enough XDai");
  } else {
    console.log("sending XDai To ZupassDispenser...");
    const sendXDaiToZupassDispenser = await signer.sendTransaction({
      to: zupassDispenser.address,
      value: hre.ethers.utils.parseEther("1"),
    });
    await sendXDaiToZupassDispenser.wait();
  }

  const zupassDispenserSaltBalance = await saltContract.balanceOf(zupassDispenser.address);

  if (zupassDispenserSaltBalance >= hre.ethers.utils.parseEther("5000")) {
    console.log("ZupassDispenser already has enough SALT");
  } else {
    console.log("sending SALT (credits) To ZupassDispenser...");
    await saltContract.transfer(zupassDispenser.address, hre.ethers.utils.parseEther("5000"));
  }

  console.log("Deploying DisperseFunds...");
  const disperseFunds = await deploy("DisperseFunds", {
    from: deployer,
    args: [salt.address],
    log: true,
    autoMine: true,
  });

  if (disperseFunds.newlyDeployed) await sleep(HARDCODED_DELAY);

  const disperseFundsContract = await hre.ethers.getContract("DisperseFunds", deployer);

  for (let i = 0; i < dispersers.length; i++) {
    const role = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("DISPENSER_ROLE"));

    const hasRole = await disperseFundsContract.hasRole(role, dispersers[i]);

    if (hasRole) {
      console.log("Address " + dispersers[i] + " has the DISPENSER_ROLE role already.");
    } else {
      console.log("Granting disperser role to " + dispersers[i]);
      const result = await disperseFundsContract.grantRole(role, dispersers[i]);
      await result.wait();
    }
  }
  /*
  for some reason i don't think disperseFundsContract has an owner() function

  if (dispenserOwner !== currnetDispenserOwner) {
    console.log("Transferring ownership of DisperseFunds to " + dispenserOwner);
    await disperseFundsContract.transferOwnership(dispenserOwner);
  } else {
    console.log("DisperseFunds owner is already set to " + dispenserOwner);
  }*/

  const saltBalanceOfDisperseFunds = await saltContract.balanceOf(disperseFunds.address);
  console.log("saltBalanceOfDisperseFunds: " + saltBalanceOfDisperseFunds);
  if (saltBalanceOfDisperseFunds >= hre.ethers.utils.parseEther("5000")) {
    console.log("DisperseFunds already has enough SALT");
  } else {
    console.log("sending SALT (credits) To DisperseFunds...");
    await saltContract.transfer(disperseFunds.address, hre.ethers.utils.parseEther("5000"));
  }

  const saltBalanceOfBurner = await saltContract.balanceOf(YOUR_LOCAL_BURNER_ADDRESS);
  if (saltBalanceOfBurner >= hre.ethers.utils.parseEther("5000")) {
    console.log("Burner already has enough SALT");
  } else {
    console.log("sending SALT (credits) To Your Local Burner...");
    await saltContract.transfer(YOUR_LOCAL_BURNER_ADDRESS, hre.ethers.utils.parseEther("5000"));
  }

  const ethBalanceOfDisperseFunds = await hre.ethers.provider.getBalance(disperseFunds.address);

  if (ethBalanceOfDisperseFunds >= hre.ethers.utils.parseEther("1")) {
    console.log("DisperseFunds already has enough XDai");
  } else {
    console.log("send XDai To disperseFunds address (" + disperseFunds.address + ")...");
    const sendXDai = await signer.sendTransaction({
      to: disperseFunds.address,
      value: hre.ethers.utils.parseEther("1"),
    });
    sendXDai.wait();
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    console.log("sending token " + token.name + " to YOUR_LOCAL_BURNER_ADDRESS (" + YOUR_LOCAL_BURNER_ADDRESS + ")...");
    //send some tokens to your burner too
    await tokensContracts[i].transfer(YOUR_LOCAL_BURNER_ADDRESS, hre.ethers.utils.parseEther("1000"));

    console.log("deploying dex for credits <-> " + token.name + "...");
    const dex = await deploy(`BasicDex${token.name}`, {
      from: deployer,
      args: [salt.address, tokensContracts[i].address],
      log: true,
      autoMine: true,
      contract: "BasicDex",
    });
    if (dex.newlyDeployed) await sleep(HARDCODED_DELAY);

    const dexContract = await hre.ethers.getContractAt("BasicDex", dex.address, deployer);

    console.log("Approving " + token.name + " dex to spend salt...");
    await saltContract.approve(dex.address, hre.ethers.constants.MaxUint256);

    console.log("Approving " + token.name + " dex to spend " + token.name + "...");
    await tokensContracts[i].approve(dex.address, hre.ethers.constants.MaxUint256);

    console.log("Minting 100 " + token.name + " to dex...");
    await dexContract.init(hre.ethers.utils.parseEther("100"));

    for (let i = 0; i < dexPausers.length; i++) {
      const role = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("PAUSER_ROLE"));
      const hasRole = await dexContract.hasRole(role, dexPausers[i]);
      if (hasRole) {
        console.log("Address " + dexPausers[i] + " has the pauser role already.");
      } else {
        console.log("Granting pauser role to " + dexPausers[i]);
        const result = await dexContract.grantRole(role, dexPausers[i]);
        await result.wait();
      }
    }
    /*
    const currentDexOwner = await dexContract.owner();
    if (currentDexOwner !== dexOwner) {
      console.log("Transferring ownership of " + token.name + " dex to " + dexOwner);
      await dexContract.transferOwnership(dexOwner);
    } else {
      console.log("Dex owner is already set to " + dexOwner);
    }*/
  }

  console.log("Deploying Land");
  const landContract = await deploy("Land", {
    from: deployer,
    args: [salt.address, tokensContracts[3].address],
    log: true,
    autoMine: true,
    contract: "Land",
  });
  if (landContract.newlyDeployed) await sleep(HARDCODED_DELAY);

  console.log("🍓 put some strawberries into the land contract...");
  //put some strawberries into the land contract (really it should just get mint privs right?)
  await tokensContracts[3].transfer(landContract.address, hre.ethers.utils.parseEther("100"));
};

export default deployYourContract;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags YourContract
deployYourContract.tags = ["GameWallet"];
