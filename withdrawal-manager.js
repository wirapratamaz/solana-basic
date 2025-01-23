import { PrivyClient } from "@privy-io/server-auth";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
  Keypair
} from "@solana/web3.js";
import bs58 from "bs58";
import dotenv from "dotenv";
import BN from "bn.js";
dotenv.config();

class WithdrawalManager {
  constructor() {
    this.client = new PrivyClient(
      process.env.PRIVY_APP_ID,
      process.env.PRIVY_APP_SECRET,
      {
        walletApi: {
          chainConfig: {
            solana: { network: "devnet" }
          },
          authorizationPrivateKey: process.env.PRIVY_AUTHORIZATION_PRIVATE_KEY,
        }
      }
    );
    this.connection = new Connection("https://api.devnet.solana.com", "confirmed");
    this.withdrawals = new Map();
  }

  /**
   * Get or create Privy-managed wallet for user
   * @param {string} accountId - User account identifier
   * @returns {Promise<Object>} - Privy wallet details
   */
  async getPrivyWallet(accountId) {
    const idempotencyKey = `wallet-${accountId}`;
    
    try {
      return await this.client.walletApi.create({
        chainType: "solana",
        idempotencyKey,
      });
    } catch (error) {
      if (error.status === 409) { // Wallet already exists
        return this.client.walletApi.get(idempotencyKey);
      }
      throw error;
    }
  }

  /**
   * Fund a Privy wallet with SOL
   * @param {string} accountId - User account ID
   * @param {number} lamports - Amount to fund
   */
  async fundPrivyWallet(accountId, lamports) {
    const privyWallet = await this.getPrivyWallet(accountId);
    const funderKeypair = Keypair.fromSecretKey(
      bs58.decode(process.env.SOLANA_DEVNET_SECRET_KEY)
    );
    
    const transaction = new Transaction()
      .add(
        SystemProgram.transfer({
          fromPubkey: funderKeypair.publicKey,
          toPubkey: new PublicKey(privyWallet.address),
          lamports,
        })
      );
    
    const signature = await this.connection.sendTransaction(transaction, [funderKeypair]);
    await this.connection.confirmTransaction(signature);
    return signature;
  }

  /**
   * Validate Solana address
   * @param {string} address - Solana address to validate
   * @returns {boolean} - Whether address is valid
   */
  validateAddress(address) {
    try {
      const pubKey = new PublicKey(address);
      return PublicKey.isOnCurve(pubKey);
    } catch (error) {
      return false;
    }
  }

  /**
   * Submit a withdrawal request
   * @param {Object} params - Withdrawal parameters
   * @param {string} params.accountId - User account ID
   * @param {string} params.recipient - Recipient Solana address
   * @param {string} params.amount - Amount in lamports
   * @param {string} params.idempotencyKey - Unique key for the transaction
   * @returns {Promise<Object>} - Withdrawal details
   */
  async submitWithdrawal({ accountId, recipient, amount, idempotencyKey }) {
    try {
      // 1. Get Privy-managed wallet
      const privyWallet = await this.getPrivyWallet(accountId);
      
      // 2. Validate and check balance
      if (!this.validateAddress(recipient)) {
        throw new Error("Invalid recipient address");
      }

      const balance = await this.connection.getBalance(
        new PublicKey(privyWallet.address)
      );
      
      if (balance < parseInt(amount)) {
        throw new Error("Insufficient balance in Privy wallet");
      }

      // 3. Create transaction using VersionedTransaction
      const { blockhash } = await this.connection.getLatestBlockhash("finalized");
      
      // Build transaction message
      const message = new TransactionMessage({
        payerKey: new PublicKey(privyWallet.address),
        recentBlockhash: blockhash,
        instructions: [
          SystemProgram.transfer({
            fromPubkey: new PublicKey(privyWallet.address),
            toPubkey: new PublicKey(recipient),
            lamports: parseInt(amount),
          })
        ]
      }).compileToV0Message();

      const transaction = new VersionedTransaction(message);

      // 4. Serialize and send via Privy
      const serializedTx = transaction.serialize();

      const privyResponse = await this.client.walletApi.solana.signAndSendTransaction({
        walletId: privyWallet.id,
        chainType: "solana",
        transaction: serializedTx,
        idempotencyKey,
        headers: { "privy-network": "devnet" }
      });

      // 5. Record withdrawal
      const withdrawal = {
        id: `withdraw_${Date.now()}`,
        accountId,
        chainId: "solana:devnet",
        walletAddress: privyWallet.address,
        recipient,
        amount,
        hash: privyResponse.transactionHash,
        blockTimestamp: Math.floor(Date.now() / 1000),
        status: "pending" // Update via webhook later
      };

      this.withdrawals.set(withdrawal.id, withdrawal);
      
      return withdrawal;

    } catch (error) {
      console.error("Privy withdrawal failed:", error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get withdrawals with optional filters
   * @param {Object} filters - Optional filters
   * @param {string} filters.accountId - Filter by account ID
   * @param {string} filters.chainId - Filter by chain ID
   * @param {string} filters.status - Filter by status
   * @returns {Array<Object>} - Filtered withdrawals
   */
  getWithdrawals(filters = {}) {
    let withdrawals = Array.from(this.withdrawals.values());

    if (filters.accountId) {
      withdrawals = withdrawals.filter(w => w.accountId === filters.accountId);
    }
    if (filters.chainId) {
      withdrawals = withdrawals.filter(w => w.chainId === filters.chainId);
    }
    if (filters.status) {
      withdrawals = withdrawals.filter(w => w.status === filters.status);
    }

    return withdrawals;
  }

  /**
   * Update withdrawal status (e.g., from webhook)
   * @param {string} id - Withdrawal ID
   * @param {string} status - New status
   * @returns {Object} - Updated withdrawal
   */
  updateWithdrawalStatus(id, status) {
    const withdrawal = this.withdrawals.get(id);
    if (withdrawal) {
      withdrawal.status = status;
      this.withdrawals.set(id, withdrawal);
    }
    return withdrawal;
  }
}

// Example usage
const manager = new WithdrawalManager();

// Submit withdrawal example
async function testWithdrawal() {
  try {
    // First, create and fund a Privy wallet
    const accountId = "user_12345";
    const fundingAmount = 0.2 * LAMPORTS_PER_SOL; // Fund with 0.2 SOL
    
    console.log("Creating and funding Privy wallet...");
    const fundingSignature = await manager.fundPrivyWallet(accountId, fundingAmount);
    console.log("Wallet funded:", fundingSignature);

    // Then submit withdrawal
    const withdrawal = await manager.submitWithdrawal({
      accountId,
      recipient: process.env.RECIPIENT_DEVNET_ADDRESS,
      amount: (0.1 * LAMPORTS_PER_SOL).toString(),
      idempotencyKey: `withdraw_${Date.now()}`
    });
    
    console.log("Withdrawal submitted:", withdrawal);
    
    // Get withdrawals example
    const withdrawals = manager.getWithdrawals({
      accountId: "user_12345",
      chainId: "solana:devnet",
      status: "pending"
    });
    
    console.log("Pending withdrawals:", withdrawals);
    
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Run test
console.log("Testing Withdrawal Management System with Privy...");
testWithdrawal(); 