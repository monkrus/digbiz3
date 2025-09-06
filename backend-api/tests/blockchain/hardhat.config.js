require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomiclabs/hardhat-ethers");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("dotenv").config();

/**
 * Hardhat Configuration for DigBiz3 Blockchain Testing
 * 
 * This configuration sets up comprehensive blockchain testing environment
 * with support for multiple networks, gas optimization, and coverage analysis.
 */

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true, // Enable Yul intermediate representation for better optimization
    },
  },

  networks: {
    // Local development network using Hardhat's built-in node
    hardhat: {
      chainId: 31337,
      gas: 12000000,
      blockGasLimit: 12000000,
      allowUnlimitedContractSize: false,
      throwOnTransactionFailures: true,
      throwOnCallFailures: true,
      loggingEnabled: false,
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        count: 20, // Generate 20 test accounts
        accountsBalance: "10000000000000000000000", // 10000 ETH per account
      },
      forking: process.env.MAINNET_FORK_URL ? {
        url: process.env.MAINNET_FORK_URL,
        blockNumber: process.env.MAINNET_FORK_BLOCK ? parseInt(process.env.MAINNET_FORK_BLOCK) : undefined,
      } : undefined,
    },

    // Local Ganache network for testing
    ganache: {
      url: "http://127.0.0.1:7545",
      chainId: 1337,
      gas: 6721975,
      gasPrice: 20000000000, // 20 gwei
      accounts: process.env.GANACHE_ACCOUNTS ? process.env.GANACHE_ACCOUNTS.split(",") : [],
    },

    // Polygon Mumbai testnet
    mumbai: {
      url: process.env.MUMBAI_RPC_URL || "https://rpc-mumbai.maticvigil.com",
      chainId: 80001,
      gasPrice: 20000000000, // 20 gwei
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },

    // Polygon mainnet
    polygon: {
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      chainId: 137,
      gasPrice: 30000000000, // 30 gwei
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },

    // Ethereum Sepolia testnet
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/" + (process.env.INFURA_PROJECT_ID || ""),
      chainId: 11155111,
      gasPrice: 20000000000, // 20 gwei
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },

    // Ethereum mainnet
    mainnet: {
      url: process.env.MAINNET_RPC_URL || "https://mainnet.infura.io/v3/" + (process.env.INFURA_PROJECT_ID || ""),
      chainId: 1,
      gasPrice: 30000000000, // 30 gwei
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },

    // BSC Testnet
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      gasPrice: 20000000000,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },

    // BSC Mainnet
    bsc: {
      url: "https://bsc-dataseed1.binance.org",
      chainId: 56,
      gasPrice: 5000000000,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },

  // Gas reporter configuration
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    gasPrice: 20, // gwei
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    token: "ETH", // Can be changed to MATIC for Polygon
    gasPriceApi: "https://api.etherscan.io/api?module=proxy&action=eth_gasPrice",
    showTimeSpent: true,
    showMethodSig: true,
    maxMethodDiff: 10,
    outputFile: process.env.GAS_REPORT_FILE || "gas-report.txt",
    noColors: false,
    rst: false, // Output in reStructuredText format
    rstTitle: "DigBiz3 Smart Contract Gas Usage Report",
  },

  // Solidity coverage configuration
  coverage: {
    enabled: process.env.COVERAGE === "true",
    url: "http://localhost:8555",
    port: 8555,
    network_id: 1002,
    gas: 0xfffffffffff,
    gasPrice: 0x01,
    skipFiles: [
      "test/",
      "mocks/",
      "interfaces/",
    ],
    measureStatements: true,
    measureFunctions: true,
    measureBranches: true,
    measureLines: true,
    instrument: true,
    istanbulReporter: ["html", "lcov", "text", "json"],
    istanbulFolder: "./coverage",
    mocha: {
      grep: process.env.COVERAGE_GREP || "",
      invert: process.env.COVERAGE_INVERT === "true",
    },
  },

  // Etherscan verification
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY,
      sepolia: process.env.ETHERSCAN_API_KEY,
      polygon: process.env.POLYGONSCAN_API_KEY,
      polygonMumbai: process.env.POLYGONSCAN_API_KEY,
      bsc: process.env.BSCSCAN_API_KEY,
      bscTestnet: process.env.BSCSCAN_API_KEY,
    },
    customChains: [
      {
        network: "mumbai",
        chainId: 80001,
        urls: {
          apiURL: "https://api-testnet.polygonscan.com/api",
          browserURL: "https://mumbai.polygonscan.com"
        }
      }
    ]
  },

  // Mocha test configuration
  mocha: {
    timeout: 120000, // 2 minutes timeout for complex tests
    bail: false, // Don't stop on first test failure
    recursive: true,
    reporter: process.env.MOCHA_REPORTER || "spec",
    reporterOptions: {
      output: process.env.MOCHA_REPORTER_OUTPUT || undefined,
      configFile: process.env.MOCHA_CONFIG_FILE || undefined,
    },
    grep: process.env.MOCHA_GREP || "", // Run specific tests
    invert: process.env.MOCHA_INVERT === "true", // Invert grep pattern
    parallel: process.env.MOCHA_PARALLEL === "true", // Run tests in parallel
    jobs: process.env.MOCHA_JOBS ? parseInt(process.env.MOCHA_JOBS) : undefined, // Number of parallel jobs
  },

  // Contract size limits
  contractSizer: {
    enabled: process.env.CONTRACT_SIZE === "true",
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
    strict: true,
    only: process.env.CONTRACT_SIZE_ONLY ? process.env.CONTRACT_SIZE_ONLY.split(",") : [],
    except: process.env.CONTRACT_SIZE_EXCEPT ? process.env.CONTRACT_SIZE_EXCEPT.split(",") : [],
  },

  // Source map configuration for debugging
  sourceMaps: {
    enabled: process.env.SOURCE_MAPS === "true",
    artifactsPath: "artifacts",
    sourcesPath: "contracts",
  },

  // Docgen configuration for documentation
  docgen: {
    enabled: process.env.DOCGEN === "true",
    path: "./docs/contracts",
    clear: true,
    runOnCompile: false,
    except: ["test/", "mocks/", "interfaces/"],
    pages: "files",
    templates: "./docs/templates",
    theme: "markdown",
    collapseNewlines: true,
    pageExtension: ".md",
  },

  // Path configuration
  paths: {
    sources: "./contracts",
    tests: "./tests/blockchain/contracts",
    cache: "./cache",
    artifacts: "./artifacts",
    deploy: "./deploy",
    deployments: "./deployments",
  },

  // TypeChain configuration for TypeScript bindings
  typechain: {
    enabled: process.env.TYPECHAIN === "true",
    outDir: "typechain-types",
    target: "ethers-v5",
    alwaysGenerateOverloads: false,
    discriminateTypes: true,
    tsNocheck: false,
  },

  // Defender configuration for OpenZeppelin Defender
  defender: {
    apiKey: process.env.DEFENDER_API_KEY,
    apiSecret: process.env.DEFENDER_API_SECRET,
  },

  // Custom tasks configuration
  tasks: {
    // Custom task for deploying contracts with verification
    deployAndVerify: {
      enabled: true,
      networks: ["mumbai", "polygon", "sepolia", "mainnet"],
      constructorArgs: process.env.CONSTRUCTOR_ARGS || "",
      verify: process.env.AUTO_VERIFY === "true",
    },

    // Custom task for contract interaction
    interact: {
      enabled: true,
      defaultNetwork: "hardhat",
      scripts: "./scripts/interactions",
    },

    // Custom task for gas optimization analysis
    gasOptimization: {
      enabled: true,
      threshold: 100000, // Gas limit threshold for optimization warnings
      reportFile: "./reports/gas-optimization.json",
    },

    // Custom task for security analysis
    security: {
      enabled: true,
      tools: ["slither", "mythril"],
      outputDir: "./reports/security",
    },
  },

  // Warnings configuration
  warnings: {
    "*": {
      "unreachable-code": "error",
      "unused-param": "warning",
      "unused-var": "warning",
      "code-size": "warning",
    },
    "contracts/test/": "off",
    "contracts/mocks/": "off",
  },

  // External networks configuration
  external: process.env.HARDHAT_FORK ? {
    contracts: [
      {
        artifacts: process.env.EXTERNAL_ARTIFACTS_DIR || "./external/artifacts",
        deploy: process.env.EXTERNAL_DEPLOY_DIR || "./external/deploy",
      }
    ],
    deployments: {
      hardhat: process.env.HARDHAT_FORK_DEPLOYMENTS ? [process.env.HARDHAT_FORK_DEPLOYMENTS] : [],
    },
  } : undefined,
};