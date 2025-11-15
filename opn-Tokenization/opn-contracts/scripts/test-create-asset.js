// scripts/test-create-asset.js
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🧪 Testing Asset Creation");
  console.log("Network:", hre.network.name);
  console.log("=".repeat(50));
  
  // Load deployment info
  const deploymentsDir = path.join(__dirname, "../deployments");
  const filename = path.join(deploymentsDir, `${hre.network.name}-deployment.json`);
  
  if (!fs.existsSync(filename)) {
    console.error("❌ Deployment file not found!");
    process.exit(1);
  }
  
  const deploymentInfo = JSON.parse(fs.readFileSync(filename, 'utf8'));
  const contracts = deploymentInfo.contracts;
  
  const [deployer] = await ethers.getSigners();
  console.log("\n👤 Testing with account:", deployer.address);
  
  // Get contract instance
  const assetRegistry = await ethers.getContractAt(
    "OPNAssetRegistry",
    contracts.OPNAssetRegistry
  );
  
  console.log("\n⏳ Creating test asset (Fixed Model)...");
  
  try {
    const tx = await assetRegistry.createFixedAsset(
      "Real Estate",                           // assetType
      "Test Property - Luxury Apartment",      // assetName
      "Test asset for deployment verification", // assetDescription
      "https://example.com/image.jpg",         // mainImageUrl
      "https://example.com/metadata.json",     // metadataUrl
      ethers.parseUnits("1000", 0),           // totalSupply (1000 tokens)
      ethers.parseEther("0.1"),               // pricePerToken (0.1 OPN each)
      ethers.parseUnits("10", 0),             // minPurchaseAmount (10 tokens min)
      ethers.parseUnits("100", 0),            // maxPurchaseAmount (100 tokens max)
      ethers.parseUnits("5", 0)               // maxPositionsPerUser (5 positions)
    );
    
    console.log("📤 Transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed!");
    console.log("⛽ Gas used:", receipt.gasUsed.toString());
    
    // Find AssetCreated event
    const event = receipt.logs.find(log => {
      try {
        const parsed = assetRegistry.interface.parseLog(log);
        return parsed.name === "AssetCreated";
      } catch {
        return false;
      }
    });
    
    if (event) {
      const parsed = assetRegistry.interface.parseLog(event);
      const assetId = parsed.args[0];
      
      console.log("\n🎉 Asset created successfully!");
      console.log("📋 Asset ID:", assetId.toString());
      
      // Get asset details
      console.log("\n⏳ Fetching asset details...");
      const asset = await assetRegistry.assets(assetId);
      
      console.log("\n📊 Asset Details:");
      console.log("- Asset ID:", asset.assetId.toString());
      console.log("- Creator:", asset.creator);
      console.log("- Name:", asset.assetName);
      console.log("- Type:", asset.assetType);
      console.log("- Total Supply:", asset.totalSupply.toString(), "tokens");
      console.log("- Price per Token:", ethers.formatEther(asset.pricePerToken), "OPN");
      console.log("- Min Purchase:", asset.minPurchaseAmount.toString(), "tokens");
      console.log("- Max Purchase:", asset.maxPurchaseAmount.toString(), "tokens");
      console.log("- Is Active:", asset.isActive);
      
      console.log("\n✅ Asset creation test PASSED!");
      console.log("\n💡 You can now:");
      console.log("  1. View this asset in your frontend");
      console.log("  2. Test purchasing fractions");
      console.log("  3. Create more assets");
      
    } else {
      console.log("⚠️  Asset created but couldn't find event");
    }
    
  } catch (error) {
    console.error("\n❌ Asset creation FAILED:");
    console.error(error.message);
    
    if (error.message.includes("Only admin")) {
      console.error("\n💡 TIP: Make sure your account has ADMIN_ROLE");
    } else if (error.message.includes("insufficient funds")) {
      console.error("\n💡 TIP: Make sure your account has enough OPN for gas");
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });