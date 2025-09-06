const { network } = require("hardhat");

/**
 * Deploy ReputationToken Contract
 * 
 * This script deploys the reputation token contract with proper
 * role configuration and initial parameters.
 */

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer, admin, minter } = await getNamedAccounts();

  log("----------------------------------------------------");
  log("Deploying ReputationToken contract...");
  log("Network:", network.name);
  log("Deployer:", deployer);
  log("Admin:", admin);
  log("Minter:", minter);
  log("----------------------------------------------------");

  const args = [
    "DigBiz Reputation Token", // Token name
    "DBR"                      // Token symbol
  ];
  
  const reputationToken = await deploy("ReputationToken", {
    from: deployer,
    args: args,
    log: true,
    deterministicDeployment: false,
    waitConfirmations: network.name === "hardhat" ? 1 : 6,
  });

  log(`ReputationToken deployed at: ${reputationToken.address}`);

  // Setup roles and initial configuration
  if (network.name !== "hardhat" || process.env.SETUP_ROLES === "true") {
    log("Setting up roles and configuration...");
    
    const tokenContract = await ethers.getContractAt("ReputationToken", reputationToken.address);
    
    // Get role identifiers
    const MINTER_ROLE = await tokenContract.MINTER_ROLE();
    const DEFAULT_ADMIN_ROLE = await tokenContract.DEFAULT_ADMIN_ROLE();
    
    // Grant minter role to specified minter account
    if (minter && minter !== deployer) {
      log(`Granting MINTER_ROLE to: ${minter}`);
      const grantMinterTx = await tokenContract.grantRole(MINTER_ROLE, minter);
      await grantMinterTx.wait(1);
      log("MINTER_ROLE granted successfully");
    }
    
    // Transfer admin role to admin account if different from deployer
    if (admin && admin !== deployer) {
      log(`Transferring DEFAULT_ADMIN_ROLE to admin: ${admin}`);
      
      // Grant admin role to new admin
      const grantAdminTx = await tokenContract.grantRole(DEFAULT_ADMIN_ROLE, admin);
      await grantAdminTx.wait(1);
      
      // Renounce admin role from deployer
      const renounceAdminTx = await tokenContract.renounceRole(DEFAULT_ADMIN_ROLE, deployer);
      await renounceAdminTx.wait(1);
      
      log("Admin role transferred successfully");
    }
    
    // Set up initial token economics parameters
    log("Configuring token economics...");
    
    // These would be custom functions in the actual contract
    // Example configurations that might exist:
    /*
    if (typeof tokenContract.setStakingRewardRate === 'function') {
      const setRewardRateTx = await tokenContract.setStakingRewardRate(500); // 5% APY
      await setRewardRateTx.wait(1);
      log("Staking reward rate set to 5% APY");
    }
    
    if (typeof tokenContract.setMaxSupply === 'function') {
      const maxSupply = ethers.utils.parseEther("1000000"); // 1M tokens max
      const setMaxSupplyTx = await tokenContract.setMaxSupply(maxSupply);
      await setMaxSupplyTx.wait(1);
      log("Max supply set to 1,000,000 DBR");
    }
    */
    
    log("Configuration completed");
  }

  // Verify contract on block explorers
  if (network.name !== "hardhat" && process.env.VERIFY_CONTRACTS === "true") {
    log("Verifying contract on block explorer...");
    
    try {
      await hre.run("verify:verify", {
        address: reputationToken.address,
        constructorArguments: args,
      });
      log("Contract verified successfully");
    } catch (error) {
      log("Contract verification failed:", error.message);
    }
  }

  log("----------------------------------------------------");
  log("ReputationToken deployment completed!");
  log("Contract Address:", reputationToken.address);
  log("Token Name: DigBiz Reputation Token");
  log("Token Symbol: DBR");
  log("----------------------------------------------------");

  return true;
};

module.exports.tags = ["ReputationToken", "token", "reputation", "core"];
module.exports.dependencies = [];