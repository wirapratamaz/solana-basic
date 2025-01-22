import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  Keypair,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";
import bs58 from "bs58";
import dotenv from "dotenv";
dotenv.config();

const transferDevnetSOL = async () => {
  try {
    // 1. Setup connection to devnet
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    
    // 2. Setup sender wallet from private key
    const secretKey = bs58.decode(process.env.SOLANA_DEVNET_SECRET_KEY);
    const fromWallet = Keypair.fromSecretKey(secretKey);
    
    // 3. Create new recipient wallet
    const newWallet = Keypair.generate();
    console.log("\nNew wallet created!");
    console.log("Public Key:", newWallet.publicKey.toString());
    console.log("Save this Secret Key:", bs58.encode(newWallet.secretKey), "\n");
    
    // 4. Create transfer instruction
    const transferAmount = 0.1 * LAMPORTS_PER_SOL;
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromWallet.publicKey,
        toPubkey: newWallet.publicKey,
        lamports: transferAmount,
      })
    );

    // 5. Get latest blockhash
    const { blockhash } = await connection.getLatestBlockhash("finalized");
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromWallet.publicKey;

    // 6. Sign and send transaction
    console.log("Initiating transfer...");
    console.log("From:", fromWallet.publicKey.toString());
    console.log("To:", newWallet.publicKey.toString());
    console.log("Amount:", transferAmount / LAMPORTS_PER_SOL, "SOL");

    const signature = await connection.sendTransaction(transaction, [fromWallet]);
    
    // 7. Confirm transaction
    const confirmation = await connection.confirmTransaction(signature, "confirmed");
    
    console.log("\nTransfer successful!");
    console.log("Signature:", signature);
    console.log("Explorer URL:", `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    return signature;

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
console.log("Starting Devnet SOL transfer...");
(async () => {
  try {
    await transferDevnetSOL();
  } catch (error) {
    process.exit(1);
  }
})();
