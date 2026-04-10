import { VirtualFile } from "@/types/build";

export const SOLIDITY_OZ_TEMPLATE: VirtualFile[] = [
  {
    id: "package.json",
    name: "package.json",
    type: "file",
    content: JSON.stringify(
      {
        name: "nex-solidity-oz",
        private: true,
        version: "0.1.0",
        scripts: {
          build: "hardhat compile",
          test: "hardhat test",
          node: "hardhat node",
          deploy: "hardhat run scripts/deploy.ts --network hardhat",
        },
        devDependencies: {
          hardhat: "^2.26.3",
          "@nomicfoundation/hardhat-toolbox": "^5.0.0",
          "@openzeppelin/contracts": "^5.3.0",
          typescript: "^5.5.4",
          tsx: "^4.21.0",
          "@types/node": "^20.14.9",
          dotenv: "^17.2.3",
        },
      },
      null,
      2,
    ),
    language: "json",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "hardhat.config.ts",
    name: "hardhat.config.ts",
    type: "file",
    content: `import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
`,
    language: "typescript",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tsconfig.json",
    name: "tsconfig.json",
    type: "file",
    content: JSON.stringify(
      {
        compilerOptions: {
          target: "ES2020",
          module: "ESNext",
          moduleResolution: "Bundler",
          strict: true,
          esModuleInterop: true,
          forceConsistentCasingInFileNames: true,
          skipLibCheck: true,
          types: ["node", "hardhat"],
        },
        include: ["hardhat.config.ts", "scripts", "test"],
      },
      null,
      2,
    ),
    language: "json",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "contracts/NexToken.sol",
    name: "contracts/NexToken.sol",
    type: "file",
    content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NexToken is ERC20, Ownable {
    constructor(address initialOwner) ERC20("Nex Token", "NEX") Ownable(initialOwner) {
        _mint(initialOwner, 1_000_000 * 10 ** decimals());
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
`,
    language: "solidity",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "scripts/deploy.ts",
    name: "scripts/deploy.ts",
    type: "file",
    content: `import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying with:", deployer.address);
  const token = await ethers.deployContract("NexToken", [deployer.address]);
  await token.waitForDeployment();

  console.log("NexToken deployed to:", await token.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
`,
    language: "typescript",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "test/NexToken.ts",
    name: "test/NexToken.ts",
    type: "file",
    content: `import { expect } from "chai";
import { ethers } from "hardhat";

describe("NexToken", function () {
  it("mints initial supply to deployer", async function () {
    const [owner] = await ethers.getSigners();
    const token = await ethers.deployContract("NexToken", [owner.address]);
    await token.waitForDeployment();

    const totalSupply = await token.totalSupply();
    const ownerBalance = await token.balanceOf(owner.address);

    expect(ownerBalance).to.equal(totalSupply);
  });
});
`,
    language: "typescript",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "README.md",
    name: "README.md",
    type: "file",
    content: `# Solidity OpenZeppelin Sandbox Template

This template is configured for OpenZeppelin-based Solidity development with Hardhat.

## Commands

- \`npm run build\` compile contracts
- \`npm run test\` run tests
- \`npm run node\` start local JSON-RPC node
- \`npm run deploy\` deploy to local hardhat network

## Files

- \`contracts/NexToken.sol\` sample ERC20 contract
- \`scripts/deploy.ts\` deployment script
- \`test/NexToken.ts\` basic contract test
`,
    language: "markdown",
    updatedAt: new Date().toISOString(),
  },
];
