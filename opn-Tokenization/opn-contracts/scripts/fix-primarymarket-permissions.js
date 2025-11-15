// fix-primarymarket-permissions.js
// Run this to grant PrimaryMarket permission to call recordSale() in AssetRegistry
// Usage: node fix-primarymarket-permissions.js

const { ethers } = require('ethers');

// Your deployed contract addresses
const ASSET_REGISTRY = "0x02C24BC4094F028796Fec1FEBeF331bfc476400C";
const PRIMARY_MARKET = "0xb4De64Ba962dfc5F4912C0B84b14ed7073C7A8D4";

// OPN Network config
const RPC_URL = "https://rpc.cor3innovations.io/";

// AssetRegistry ABI (just what we need)
const ASSET_REGISTRY_ABI = [
  "function grantRole(bytes32 role, address account)",
  "function ADMIN_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function recordSale(uint256 _assetId, uint256 _tokensOrWeight, uint256 _revenue)"
];

async function main() {
  console.log("🔧 Fixing PrimaryMarket Permissions\n");
  
  // Connect to OPN network
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  
  // Get your wallet from MetaMask or private key
  // OPTION 1: Use MetaMask (if available in Node)
  // const signer = provider.getSigner();
  
  // OPTION 2: Use private key (NEVER COMMIT THIS!)
  const PRIVATE_KEY = process.env.PRIVATE_KEY || "efba79fce4b1fcf939ffd280049c296412d4000797ea0943cfe133c66f9dd095";
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log("📍 Using wallet:", await signer.getAddress());
  console.log("💰 Balance:", ethers.utils.formatEther(await signer.getBalance()), "OPN\n");
  
  // Connect to AssetRegistry
  const assetRegistry = new ethers.Contract(
    ASSET_REGISTRY,
    ASSET_REGISTRY_ABI,
    signer
  );
  
  console.log("📋 Contract Addresses:");
  console.log("  AssetRegistry:", ASSET_REGISTRY);
  console.log("  PrimaryMarket:", PRIMARY_MARKET);
  console.log("");
  
  // Get ADMIN_ROLE
  const ADMIN_ROLE = await assetRegistry.ADMIN_ROLE();
  console.log("🔑 ADMIN_ROLE:", ADMIN_ROLE);
  
  // Check if PrimaryMarket already has the role
  const hasRole = await assetRegistry.hasRole(ADMIN_ROLE, PRIMARY_MARKET);
  
  if (hasRole) {
    console.log("✅ PrimaryMarket already has ADMIN_ROLE!");
    console.log("✅ Permissions are correct - the issue must be elsewhere");
    return;
  }
  
  console.log("❌ PrimaryMarket does NOT have ADMIN_ROLE");
  console.log("⏳ Granting ADMIN_ROLE to PrimaryMarket...\n");
  
  try {
    const tx = await assetRegistry.grantRole(ADMIN_ROLE, PRIMARY_MARKET);
    console.log("📤 Transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait(2);
    
    if (receipt.status === 1) {
      console.log("✅ Transaction confirmed!");
      console.log("✅ PrimaryMarket now has ADMIN_ROLE");
      console.log("✅ PrimaryMarket can now call recordSale()");
      console.log("\n🎉 Permissions fixed! Try your purchase again!");
    } else {
      console.log("❌ Transaction failed!");
    }
    
    console.log("\n📊 Transaction Details:");
    console.log("  Gas used:", receipt.gasUsed.toString());
    console.log("  Block:", receipt.blockNumber);
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    
    if (error.message.includes("AccessControl")) {
      console.log("\n⚠️  You don't have admin permissions!");
      console.log("   Only the AssetRegistry admin can grant roles.");
      console.log("   Make sure you're using the wallet that deployed the contracts.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });