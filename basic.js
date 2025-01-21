// index.js

// 1. Import Dependencies
import {
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    clusterApiUrl,
    Transaction,
    SystemProgram,
    sendAndConfirmTransaction,
    PublicKey,
} from '@solana/web3.js';
import bs58 from 'bs58';

/**
 * 2. Create a Solana Address
 * This function generates a new Keypair and returns the Keypair object.
 */
function createSolanaAddress() {
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toString();
    const secretKey = bs58.encode(keypair.secretKey);
    console.log('New Solana Address Created:');
    console.log('Public Key:', publicKey);
    console.log('Secret Key (Keep it safe!):', secretKey);
    return keypair;
}

/**
 * 3. Fund the Address on Solana Testnet
 * This function requests an airdrop of SOL to the provided public key on the testnet.
 */
async function fundAddress(connection, publicKey) {
    console.log(`Requesting airdrop of 2 SOL to ${publicKey.toString()}...`);
    const signature = await connection.requestAirdrop(
        publicKey,
        2 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(signature, 'confirmed');
    console.log('Airdrop successful:', signature);
}

/**
 * 4. Construct a Transfer Transaction
 * This function creates a transaction to transfer SOL from one public key to another.
 */
function constructTransferTransaction(fromPublicKey, toPublicKey, amountInSOL) {
    const transaction = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: fromPublicKey,
            toPubkey: toPublicKey,
            lamports: amountInSOL * LAMPORTS_PER_SOL,
        })
    );
    return transaction;
}

/**
 * 5. Sign the Transaction
 * This function signs the transaction with the sender's Keypair.
 */
async function signTransaction(connection, transaction, fromKeypair) {
    transaction.feePayer = fromKeypair.publicKey;
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

    // Sign the transaction
    transaction.sign(fromKeypair);

    // Serialize the transaction
    const serializedTransaction = transaction.serialize();

    console.log('Transaction signed and serialized.');
    return serializedTransaction;
}

/**
 * 6. Get Balance of an Address
 * This function retrieves and prints the balance of the provided public key.
 */
async function getBalance(connection, publicKey) {
    const balance = await connection.getBalance(publicKey);
    console.log(`Balance of ${publicKey.toString()}: ${balance / LAMPORTS_PER_SOL} SOL`);
    return balance;
}

/**
 * Constructs a Solana Keypair from a Base58-encoded private key string.
 *
 * @param {string} privateKeyString - The Base58-encoded private key string.
 * @returns {Keypair} - The reconstructed Solana Keypair object.
 * @throws {Error} - Throws an error if the private key string is invalid.
 *
 * @example
 * const privateKeyString = '3v...xyz'; // Your Base58-encoded private key
 * const keypair = constructKeypairFromPrivateKey(privateKeyString);
 * console.log('Public Key:', keypair.publicKey.toString());
 */
function constructKeypairFromPrivateKey(privateKeyString) {
    try {
        // Decode the Base58-encoded private key string to a Uint8Array
        const secretKey = bs58.decode(privateKeyString);

        // Validate the length of the secret key
        if (secretKey.length !== 64) {
            throw new Error(`Invalid secret key length: expected 64 bytes, got ${secretKey.length} bytes.`);
        }

        // Reconstruct the Keypair from the secret key
        const keypair = Keypair.fromSecretKey(secretKey);

        return keypair;
    } catch (error) {
        console.error('Failed to construct Keypair from private key:', error.message);
        throw error;
    }
}

/**
 * Main Execution Function
 */
(async () => {
    try {
        // Connect to the Solana Testnet
        // const connection = new Connection(clusterApiUrl('testnet'), 'confirmed');
        const connection = new Connection("https://api.devnet.solana.com");
        console.log('Connected to Solana Testnet.');

        // // Step 1: Create a new Solana address
        // const fromKeypair = createSolanaAddress();

        // // Step 2: Fund the address with an airdrop
        // await fundAddress(connection, fromKeypair.publicKey);

        // // Check balance after airdrop
        // await getBalance(connection, fromKeypair.publicKey);

        // // For demonstration, create a second keypair to receive funds
        // const toKeypair = Keypair.generate();
        // console.log('Recipient Address Created:');
        // console.log('Public Key:', toKeypair.publicKey.toString());

        // // Step 3: Construct a transfer transaction
        // const fromKeypair = constructKeypairFromPrivateKey('');
        // const toKeypair = constructKeypairFromPrivateKey('');
        // const transferAmount = 0.5; // Amount in SOL
        // const transaction = constructTransferTransaction(
        //     fromKeypair.publicKey,
        //     toKeypair.publicKey,
        //     transferAmount
        // );
        // console.log(`Constructed transfer transaction to send ${transferAmount} SOL to ${toKeypair.publicKey.toString()}.`);

        // // Step 4: Sign the transaction
        // const signedTransaction = await signTransaction(connection, transaction, fromKeypair);

        // // Step 5: Send the signed transaction
        // console.log('Sending the transaction...');
        // const txSignature = await connection.sendRawTransaction(signedTransaction);
        // await connection.confirmTransaction(txSignature, 'confirmed');
        // console.log('Transaction successful with signature:', txSignature);

        // // Check balances after transfer
        // await getBalance(connection, fromKeypair.publicKey);
        // await getBalance(connection, toKeypair.publicKey);

        // reconstruct using private key and get balance - fromKeypair
        // const fromKeypair = constructKeypairFromPrivateKey('');
        // await getBalance(connection, fromKeypair.publicKey);

        // reconstruct using private key and get balance - toKeypair
        // const toKeypair = constructKeypairFromPrivateKey('');
        // await getBalance(connection, toKeypair.publicKey);
        
    } catch (error) {
        console.error('An error occurred:', error);
    }
})();