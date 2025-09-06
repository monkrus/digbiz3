const { network } = require("hardhat");

/**
 * Deploy DigBizIdentity Contract
 * 
 * This script deploys the identity verification contract with proper
 * configuration for different networks and environments.
 */

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer, admin } = await getNamedAccounts();

  log("----------------------------------------------------");
  log("Deploying DigBizIdentity contract...");
  log("Network:", network.name);
  log("Deployer:", deployer);
  log("Admin:", admin);
  log("----------------------------------------------------");

  const args = [];
  
  const digBizIdentity = await deploy("DigBizIdentity", {
    from: deployer,
    args: args,
    log: true,
    deterministicDeployment: false,
    waitConfirmations: network.name === "hardhat" ? 1 : 6,
  });

  log(`DigBizIdentity deployed at: ${digBizIdentity.address}`);

  // Setup initial configuration if not on hardhat network
  if (network.name !== "hardhat") {
    log("Setting up initial configuration...");
    
    const identityContract = await ethers.getContractAt("DigBizIdentity", digBizIdentity.address);
    
    // Transfer ownership to admin if different from deployer
    if (admin && admin !== deployer) {
      log(`Transferring ownership to admin: ${admin}`);
      const transferTx = await identityContract.transferOwnership(admin);
      await transferTx.wait(1);
      log("Ownership transferred successfully");
    }
    
    log("Initial configuration completed");
  }

  log("----------------------------------------------------");
  log("DigBizIdentity deployment completed!");
  log("----------------------------------------------------");

  return true;
};

module.exports.tags = ["DigBizIdentity", "identity", "core"];
module.exports.dependencies = [];