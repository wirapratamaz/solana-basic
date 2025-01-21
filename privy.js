import {PrivyClient} from '@privy-io/server-auth';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Privy client configuration
const PRIVY_CONFIG = {
    timeout: 15000, // 15s timeout for wallet operations
    walletApi: {
        apiURL: 'https://api.privy.io'
    }
};

// Validate required environment variables
const validateEnvVariables = () => {
    const required = ['PRIVY_APP_ID', 'PRIVY_APP_SECRET'];
    const missing = required.filter(key => !process.env[key]?.trim());
    if (missing.length) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
};

// Wallet operations wrapper with enhanced error handling
const executeWalletOperations = async (client) => {
    try {
        // Create a new Solana wallet
        console.log('\n1. Creating a new Solana wallet...');
        const newWallet = await client.walletApi.create({
            chainType: 'solana',
            idempotencyKey: `solana-${Date.now()}`
        });
        console.log('New wallet created:', newWallet);

        // Get users to verify wallet creation
        console.log('\n2. Getting users to verify wallet...');
        const users = await client.getUsers();
        console.log('Users:', users);

        // Fetch wallet details if available
        if (newWallet?.id) {
            console.log(`\n3. Getting details for wallet ${newWallet.id}...`);
            const walletDetails = await client.walletApi.get(newWallet.id);
            console.log('Wallet details:', walletDetails);
            return walletDetails;
        }
    } catch (error) {
        const errorDetails = {
            message: error.message,
            type: error.type,
            status: error.status,
            details: error
        };
        console.error('Operation error:', errorDetails);
        throw error;
    }
};

// Main execution
(async () => {
    try {
        console.log('Initializing Privy client...');
        validateEnvVariables();

        const client = new PrivyClient(
            process.env.PRIVY_APP_ID.trim(),
            process.env.PRIVY_APP_SECRET.trim(),
            PRIVY_CONFIG
        );

        await executeWalletOperations(client);
    } catch (error) {
        console.error('Main error:', {
            message: error.message,
            type: error.type,
            status: error.status
        });
        process.exit(1);
    }
})();