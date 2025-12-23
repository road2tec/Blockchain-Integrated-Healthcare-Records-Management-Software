const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("Deploying Healthcare Blockchain contracts...\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());
    console.log("");

    // 1. Deploy UserRegistry
    console.log("1. Deploying UserRegistry...");
    const UserRegistry = await hre.ethers.getContractFactory("UserRegistry");
    const userRegistry = await UserRegistry.deploy();
    await userRegistry.waitForDeployment();
    const userRegistryAddress = await userRegistry.getAddress();
    console.log("   UserRegistry deployed to:", userRegistryAddress);

    // 2. Deploy ConsentManager
    console.log("2. Deploying ConsentManager...");
    const ConsentManager = await hre.ethers.getContractFactory("ConsentManager");
    const consentManager = await ConsentManager.deploy();
    await consentManager.waitForDeployment();
    const consentManagerAddress = await consentManager.getAddress();
    console.log("   ConsentManager deployed to:", consentManagerAddress);

    // 3. Deploy MedicalRecordIndex
    console.log("3. Deploying MedicalRecordIndex...");
    const MedicalRecordIndex = await hre.ethers.getContractFactory("MedicalRecordIndex");
    const medicalRecordIndex = await MedicalRecordIndex.deploy();
    await medicalRecordIndex.waitForDeployment();
    const medicalRecordIndexAddress = await medicalRecordIndex.getAddress();
    console.log("   MedicalRecordIndex deployed to:", medicalRecordIndexAddress);

    // 4. Deploy AuditLog
    console.log("4. Deploying AuditLog...");
    const AuditLog = await hre.ethers.getContractFactory("AuditLog");
    const auditLog = await AuditLog.deploy();
    await auditLog.waitForDeployment();
    const auditLogAddress = await auditLog.getAddress();
    console.log("   AuditLog deployed to:", auditLogAddress);

    // 5. Deploy AccessControl (depends on ConsentManager and UserRegistry)
    console.log("5. Deploying AccessControl...");
    const AccessControl = await hre.ethers.getContractFactory("AccessControl");
    const accessControl = await AccessControl.deploy(consentManagerAddress, userRegistryAddress);
    await accessControl.waitForDeployment();
    const accessControlAddress = await accessControl.getAddress();
    console.log("   AccessControl deployed to:", accessControlAddress);

    console.log("\n========================================");
    console.log("All contracts deployed successfully!");
    console.log("========================================\n");

    // Save deployment addresses
    const deploymentInfo = {
        network: hre.network.name,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            UserRegistry: userRegistryAddress,
            ConsentManager: consentManagerAddress,
            MedicalRecordIndex: medicalRecordIndexAddress,
            AccessControl: accessControlAddress,
            AuditLog: auditLogAddress
        }
    };

    // Save to JSON file
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentPath = path.join(deploymentsDir, `deployment-${hre.network.name}.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("Deployment info saved to:", deploymentPath);

    // Copy ABIs to backend
    const backendAbisDir = path.join(__dirname, "../../backend/contracts/abis");
    if (!fs.existsSync(backendAbisDir)) {
        fs.mkdirSync(backendAbisDir, { recursive: true });
    }

    const contracts = ["UserRegistry", "ConsentManager", "MedicalRecordIndex", "AccessControl", "AuditLog"];
    for (const contractName of contracts) {
        const artifactPath = path.join(__dirname, `../artifacts/src/${contractName}.sol/${contractName}.json`);
        if (fs.existsSync(artifactPath)) {
            const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
            fs.writeFileSync(
                path.join(backendAbisDir, `${contractName}.json`),
                JSON.stringify(artifact.abi, null, 2)
            );
        }
    }
    console.log("ABIs copied to backend:", backendAbisDir);

    // Print environment variables to add to backend .env
    console.log("\n========================================");
    console.log("Add these to your backend .env file:");
    console.log("========================================\n");
    console.log(`USER_REGISTRY_ADDRESS=${userRegistryAddress}`);
    console.log(`CONSENT_MANAGER_ADDRESS=${consentManagerAddress}`);
    console.log(`MEDICAL_RECORD_INDEX_ADDRESS=${medicalRecordIndexAddress}`);
    console.log(`ACCESS_CONTROL_ADDRESS=${accessControlAddress}`);
    console.log(`AUDIT_LOG_ADDRESS=${auditLogAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
