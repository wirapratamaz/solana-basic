import { PrivyClient } from "@privy-io/server-auth";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  Keypair
} from "@solana/web3.js";
import bs58 from "bs58";
import dotenv from "dotenv";
dotenv.config();

class WithdrawalManager {
  constructor() {
    this.client = new PrivyClient(
      process.env.PRIVY_APP_ID,
      process.env.PRIVY_APP_SECRET
    );
    this.connection = new Connection("https://api.devnet.solana.com", "confirmed");
    this.withdrawals = new Map(); // In-memory storage (replace with your database)
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
   * Check wallet balance
   * @param {string} address - Wallet address to check
   * @param {number} amount - Amount in lamports to validate against
   * @returns {Promise<boolean>} - Whether wallet has sufficient balance
   */
  async checkBalance(address, amount) {
    try {
      const balance = await this.connection.getBalance(new PublicKey(address));
      return balance >= amount;
    } catch (error) {
      console.error("Balance check failed:", error);
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
      // 1. Validate recipient address
      if (!this.validateAddress(recipient)) {
        throw new Error("Invalid recipient address");
      }

      // 2. Setup sender wallet from environment
      const secretKey = bs58.decode(process.env.SOLANA_DEVNET_SECRET_KEY);
      const fromWallet = Keypair.fromSecretKey(secretKey);

      // 3. Check balance
      const hasBalance = await this.checkBalance(fromWallet.publicKey.toString(), amount);
      if (!hasBalance) {
        throw new Error("Insufficient balance");
      }

      // 4. Create transfer instruction
      const { blockhash } = await this.connection.getLatestBlockhash("finalized");
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: fromWallet.publicKey,
          toPubkey: new PublicKey(recipient),
          lamports: parseInt(amount),
        })
      );

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromWallet.publicKey;

      // 5. Sign and send transaction
      transaction.sign(fromWallet);
      const signature = await this.connection.sendRawTransaction(transaction.serialize());
      await this.connection.confirmTransaction(signature);

      // 6. Record withdrawal
      const withdrawal = {
        id: `withdraw_${Date.now()}`,
        accountId,
        chainId: "solana:devnet",
        walletAddress: fromWallet.publicKey.toString(),
        recipient,
        amount,
        hash: signature,
        blockTimestamp: Math.floor(Date.now() / 1000),
        status: "confirmed"
      };

      this.withdrawals.set(withdrawal.id, withdrawal);
      
      return withdrawal;

    } catch (error) {
      console.error("Withdrawal failed:", error);
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
    const withdrawal = await manager.submitWithdrawal({
      accountId: "user_12345",
      recipient: process.env.RECIPIENT_DEVNET_ADDRESS,
      amount: (0.1 * LAMPORTS_PER_SOL).toString(),
      idempotencyKey: `withdraw_${Date.now()}`
    });
    
    console.log("Withdrawal submitted:", withdrawal);
    
    // Get withdrawals example
    const withdrawals = manager.getWithdrawals({
      accountId: "user_12345",
      chainId: "solana:devnet",
      status: "confirmed"
    });
    
    console.log("Recent withdrawals:", withdrawals);
    
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Run test
console.log("Testing Withdrawal Management System...");
testWithdrawal(); 