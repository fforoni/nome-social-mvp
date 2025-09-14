const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying BrazilianIdentitySBT contract...");

  // Get the contract factory
  const BrazilianIdentitySBT = await ethers.getContractFactory("BrazilianIdentitySBT");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Get minter address from environment or use deployer as fallback
  const minterAddress = process.env.MINTER_ADDRESS || deployer.address;
  console.log("Minter address:", minterAddress);

  // Deploy the contract
  const contract = await BrazilianIdentitySBT.deploy(
    "Brazilian Identity SBT", // name
    "BRSBT",                  // symbol
    minterAddress             // minter address
  );

  await contract.deployed();

  console.log("BrazilianIdentitySBT deployed to:", contract.address);
  console.log("Transaction hash:", contract.deployTransaction.hash);

  // Wait for a few block confirmations
  console.log("Waiting for block confirmations...");
  await contract.deployTransaction.wait(5);

  console.log("Deployment completed!");
  console.log("Contract address:", contract.address);
  console.log("Owner:", await contract.owner());
  console.log("Minter:", await contract.minter());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});