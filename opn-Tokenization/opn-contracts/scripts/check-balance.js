// scripts/check-balance.js
const hre = require("hardhat");

async function main() {
  console.log("💰 Checking Account Balance");
  console.log("Network:", hre.network.name);
  console.log("=".repeat(50));
  
  const [deployer] = await ethers.getSigners();
  console.log("\n👤 Account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  const balanceInEther = ethers.formatEther(balance);
  
  console.log("💵 Balance:", balanceInEther, "OPN");
  
  // Estimate if enough for deployment
  const estimatedGasNeeded = ethers.parseEther("0.5"); // Rough estimate
  
  if (balance > estimatedGasNeeded) {
    console.log("✅ Sufficient balance for deployment");
  } else {
    console.log("⚠️  Balance might be insufficient");
    console.log("💡 Recommended: At least 0.5 OPN for gas");
  }
  
  console.log("\n📊 Network Info:");
  const network = await ethers.provider.getNetwork();
  console.log("- Chain ID:", network.chainId.toString());
  console.log("- Network Name:", hre.network.name);
  
  const blockNumber = await ethers.provider.getBlockNumber();
  console.log("- Current Block:", blockNumber);
  
  console.log("\n✅ Check complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });