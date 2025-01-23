import { PrivyClient } from "@privy-io/server-auth";
import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import dotenv from "dotenv";
dotenv.config();

const transferDevnetSOL = async () => {
  try {
    //  // 1. Setup connection to devnet
    //  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

    //  // 2. Setup sender wallet from private key
    //  const secretKey = bs58.decode(process.env.SOLANA_DEVNET_SECRET_KEY);
    //  const fromWallet = Keypair.fromSecretKey(secretKey);

    //  // 3. Create new recipient wallet
    //  const newWallet = Keypair.generate();
    //  console.log("\nNew wallet created!");
    //  console.log("Public Key:", newWallet.publicKey.toString());
    //  console.log("Save this Secret Key:", bs58.encode(newWallet.secretKey), "\n");

    //  // 4. Create transfer instruction
    //  const transferAmount = 0.1 * LAMPORTS_PER_SOL;

    //  const transaction = new Transaction().add(
    //    SystemProgram.transfer({
    //      fromPubkey: fromWallet.publicKey,
    //      toPubkey: newWallet.publicKey,
    //      lamports: transferAmount,
    //    })

    // 1. Initialize Privy client
    const privyClient = new PrivyClient(
      process.env.PRIVY_APP_ID,
      process.env.PRIVY_APP_SECRET,
      {
        walletApi: {
          chainConfig: {
            solana: { network: "devnet" },
          },
          authorizationPrivateKey:
            "MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg2rNfzXFqOV0UGXSemlRZBVFhVlPM5TSYNEw0ucod4YmhRANCAATFYXVUH8zu6emxnEmvm9wODDp3z0qhoDFUIKVAF4ocKz7XFZkQGVfVcKAyjh+KQjhtIVEfI2WP6Ev9T4N2HbmK",
        },
      }
    );

    // 2. Get or create sender wallet using Privy
    const senderWallet = await privyClient.walletApi.create({
      chainType: "solana",
      idempotencyKey: `sender-${Date.now()}`,
    });

    console.log("Sender wallet created:", senderWallet);

    // 3. Create recipient wallet (could also be Privy-managed)
    const recipientWallet = await privyClient.walletApi.create({
      chainType: "solana",
      idempotencyKey: `recipient-${Date.now()}`,
    });

    // 4. Fund sender wallet (using testnet faucet pattern)
    const connection = new Connection(
      "https://api.devnet.solana.com",
      "confirmed"
    );
    const fundTx = new VersionedTransaction(
      new TransactionMessage({
        payerKey: new PublicKey(senderWallet.address),
        recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
        instructions: [
          SystemProgram.transfer({
            fromPubkey: new PublicKey(senderWallet.address),
            toPubkey: new PublicKey(recipientWallet.address),
            lamports: 0.1 * LAMPORTS_PER_SOL,
          }),
        ],
      }).compileToV0Message()
    );

    // 5. Sign and send transaction through Privy
    // console.log("Initiating transfer...");
    // console.log("From:", fromWallet.publicKey.toString());
    // console.log("To:", newWallet.publicKey.toString());
    // console.log("Amount:", transferAmount / LAMPORTS_PER_SOL, "SOL");
    const serializedTx = fundTx.serialize();
    const { transactionHash } =
      await privyClient.walletApi.solana.signAndSendTransaction({
        walletId: senderWallet.id,
        chainType: "solana",
        transaction: serializedTx,
        idempotencyKey: `transfer-${Date.now()}`,
        headers: { "privy-network": "devnet" },
      });

    console.log("\nTransfer successful!");
    console.log("Transaction Hash:", transactionHash);
    console.log(
      "Explorer URL:",
      `https://explorer.solana.com/tx/${transactionHash}?cluster=devnet`
    );

    return transactionHash;
  } catch (error) {
    console.error("Transfer failed:", {
      message: error.message,
      code: error.code,
      status: error.status,
    });
    throw error;
  }
};

// Execute the transfer
console.log("Starting Privy-powered Devnet SOL transfer...");
(async () => {
  try {
    await transferDevnetSOL();
  } catch (error) {
    process.exit(1);
  }
})();
