require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: "0.8.19",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    },
    networks: {
        ganache: {
            url: "http://127.0.0.1:7545",
            chainId: 1337,
            // Mnemonic from Ganache
            accounts: {
                mnemonic: "sign escape kitchen swap page defense peasant found pool polar trumpet test",
                path: "m/44'/60'/0'/0",
                initialIndex: 0,
                count: 10
            }
        },
        localhost: {
            url: "http://127.0.0.1:8545",
            chainId: 31337
        }
    },
    paths: {
        sources: "./src",
        artifacts: "./artifacts",
        cache: "./cache"
    }
};
