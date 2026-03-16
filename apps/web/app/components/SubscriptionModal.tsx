"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, AlertCircle, Check, Loader2 } from 'lucide-react';
import { SiSui } from "react-icons/si";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  clusterApiUrl,
} from '@solana/web3.js';
import { getWallets, Wallet as StandardWallet } from '@mysten/wallet-standard';
import { TransactionBlock as SuiTransactionBlock } from '@mysten/sui.js/transactions';
import { buildPaymentTransaction, getClient } from '../../lib/payment-kit-client';
import bs58 from 'bs58';

/** SPL Memo program — same address on all Solana clusters */
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

const DESTINATION_SOL = new PublicKey(process.env.NEXT_PUBLIC_SOLANA_WALLET!);
const DESTINATION_SUI = process.env.NEXT_PUBLIC_SUI_WALLET!;

// Derive Solana cluster from the shared network env var:
//   NEXT_PUBLIC_PAYMENT_KIT_NETWORK=mainnet → Solana mainnet-beta
//   NEXT_PUBLIC_PAYMENT_KIT_NETWORK=testnet → Solana devnet
const IS_TESTNET = process.env.NEXT_PUBLIC_PAYMENT_KIT_NETWORK === 'testnet';
const SOLANA_CLUSTER = IS_TESTNET ? 'devnet' : 'mainnet-beta';
const SOLANA_CHAIN   = IS_TESTNET ? 'solana:devnet' : 'solana:mainnet';

type CryptoOption = 'SUI' | 'SOL' | 'USDT';

interface PriceInfo {
  usdAmount: number;
  isTestnet: boolean;
  sui: { priceUsd: number | null; amount: number; mistAmount: bigint };
  sol: { priceUsd: number | null; amount: number; lamports: number };
}

interface RecognizedWallet {
  name: string;
  icon: string;
  standardWallet: StandardWallet;
}

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SubscriptionModal({ isOpen, onClose, onSuccess }: SubscriptionModalProps) {
  const { update: updateSession } = useSession();
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoOption>('SUI');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'select' | 'processing' | 'complete'>('select');
  const [priceInfo, setPriceInfo] = useState<PriceInfo | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);

  const [suiWallets, setSuiWallets] = useState<RecognizedWallet[]>([]);
  const [solWallets, setSolWallets] = useState<RecognizedWallet[]>([]);

  // Unified wallet detection via wallet-standard
  useEffect(() => {
    const walletsAPI = getWallets();

    const updateWallets = () => {
      const suiMap = new Map<string, StandardWallet>();
      const solMap = new Map<string, StandardWallet>();

      walletsAPI.get().forEach(item => {
        const features = item.features as Record<string, unknown>;
        const key = item.name.toLowerCase().trim();

        if (
          'sui:signAndExecuteTransaction' in features ||
          'sui:signAndExecuteTransactionBlock' in features
        ) {
          if (!suiMap.has(key)) suiMap.set(key, item);
        }

        if ('solana:signAndSendTransaction' in features) {
          if (!solMap.has(key)) solMap.set(key, item);
        }
      });

      setSuiWallets(
        Array.from(suiMap.values()).map(w => ({ name: w.name, icon: w.icon, standardWallet: w }))
      );
      setSolWallets(
        Array.from(solMap.values()).map(w => ({ name: w.name, icon: w.icon, standardWallet: w }))
      );
    };

    updateWallets();
    const unsubscribe = walletsAPI.on('register', updateWallets);
    return () => unsubscribe();
  }, []);

  // Fetch live prices whenever the modal opens
  useEffect(() => {
    if (!isOpen) return;
    setPriceError(null);
    fetch('/api/subscription/price')
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? 'Price fetch failed');
        return res.json();
      })
      .then((data) => {
        setPriceInfo({
          usdAmount: data.usdAmount,
          isTestnet: data.isTestnet,
          sui: {
            priceUsd: data.sui.priceUsd,
            amount: data.sui.amount,
            mistAmount: BigInt(data.sui.mistAmount),
          },
          sol: {
            priceUsd: data.sol.priceUsd,
            amount: data.sol.amount,
            lamports: data.sol.lamports,
          },
        });
      })
      .catch((err) => setPriceError(err.message));
  }, [isOpen]);

  // ── Activation helpers ──────────────────────────────────────────────────

  const activateSuiSubscription = async (txDigest: string, nonce: string, walletAddress: string) => {
    const res = await fetch('/api/subscription/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txDigest, nonce, walletAddress }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Subscription activation failed');
    return res.json();
  };

  const activateSolSubscription = async (txHash: string, walletAddress: string, nonce: string) => {
    const res = await fetch('/api/subscription/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txHash, walletAddress, nonce }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Subscription activation failed');
    return res.json();
  };

  // ── SUI payment ─────────────────────────────────────────────────────────

  const handlePaySUI = async (wallet: RecognizedWallet) => {
    try {
      if (!priceInfo) {
        toast.error('Price not loaded yet. Please wait a moment and try again.');
        return;
      }
      setIsProcessing(true);
      setStep('processing');

      const features = wallet.standardWallet.features as any;

      let accounts: any[] = [];
      if (features['standard:connect']) {
        const result = await features['standard:connect'].connect();
        accounts = result.accounts;
      } else {
        accounts = wallet.standardWallet.accounts as any[];
      }
      if (!accounts || accounts.length === 0) {
        toast.error(`No accounts found in ${wallet.name}.`);
        setIsProcessing(false);
        setStep('select');
        return;
      }

      const signAndExecuteFeature =
        features['sui:signAndExecuteTransaction'] ||
        features['sui:signAndExecuteTransactionBlock'];
      if (!signAndExecuteFeature) {
        toast.error(`${wallet.name} does not support transaction execution.`);
        setIsProcessing(false);
        setStep('select');
        return;
      }

      const sender: string = accounts[0].address;
      const nonce = crypto.randomUUID();

      const tx = buildPaymentTransaction({
        nonce,
        amountMist: priceInfo.sui.mistAmount,
        receiver: DESTINATION_SUI,
        sender,
      });
      tx.setSender(sender);

      const client = getClient();
      let transactionBytes: Uint8Array;
      try {
        transactionBytes = await tx.build({ client });
      } catch (buildErr: any) {
        toast.error(`Transaction build failed: ${buildErr.message}`);
        setIsProcessing(false);
        setStep('select');
        return;
      }

      const resolvedTx = SuiTransactionBlock.from(transactionBytes);
      toast.info(`Please approve the transaction in ${wallet.name}.`);

      const suiChain = `sui:${process.env.NEXT_PUBLIC_PAYMENT_KIT_NETWORK || 'mainnet'}`;
      let txResult: any;

      if (features['sui:signAndExecuteTransaction']) {
        txResult = await features['sui:signAndExecuteTransaction'].signAndExecuteTransaction({
          transaction: resolvedTx as any,
          account: accounts[0],
          chain: suiChain,
        });
      } else {
        txResult = await features['sui:signAndExecuteTransactionBlock'].signAndExecuteTransactionBlock({
          transactionBlock: resolvedTx as any,
          account: accounts[0],
          chain: suiChain,
        });
      }

      const txDigest: string = txResult?.digest ?? txResult?.hash ?? '';
      if (!txDigest) throw new Error('Wallet did not return a transaction digest');

      await activateSuiSubscription(txDigest, nonce, sender);
      await updateSession();
      setStep('complete');
      toast.success('Subscription activated! Welcome to Pro!');
      onSuccess();
    } catch (error: any) {
      console.error(error);
      toast.error(`Payment failed: ${error.message || 'Unknown error'}`);
      setStep('select');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── SOL payment ─────────────────────────────────────────────────────────

  const handlePaySOL = async (wallet: RecognizedWallet) => {
    try {
      if (!priceInfo) {
        toast.error('Price not loaded yet. Please wait a moment and try again.');
        return;
      }
      setIsProcessing(true);
      setStep('processing');

      const features = wallet.standardWallet.features as any;

      let accounts: any[] = [];
      if (features['standard:connect']) {
        const result = await features['standard:connect'].connect();
        accounts = result.accounts;
      } else {
        accounts = wallet.standardWallet.accounts as any[];
      }
      if (!accounts || accounts.length === 0) {
        toast.error(`No accounts found in ${wallet.name}.`);
        setIsProcessing(false);
        setStep('select');
        return;
      }

      const account = accounts[0];
      const senderPublicKey = new PublicKey(account.address);
      const connection = new Connection(clusterApiUrl(SOLANA_CLUSTER as any));

      // Generate a unique nonce for this payment — written into the SPL Memo
      // instruction so the server can cryptographically tie the on-chain tx to
      // this specific payment request (prevents reuse of a valid tx signature).
      const nonce = crypto.randomUUID();

      const transaction = new Transaction();

      // 1. SOL transfer to platform wallet
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: senderPublicKey,
          toPubkey: DESTINATION_SOL,
          lamports: priceInfo.sol.lamports,
        })
      );

      // 2. SPL Memo carrying the nonce — verified on the server
      transaction.add(
        new TransactionInstruction({
          keys: [{ pubkey: senderPublicKey, isSigner: true, isWritable: false }],
          programId: MEMO_PROGRAM_ID,
          data: Buffer.from(nonce, 'utf8'),
        })
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = senderPublicKey;

      toast.info(`Please approve the transaction in ${wallet.name}.`);

      const serializedTx = transaction.serialize({ requireAllSignatures: false, verifySignatures: false });
      const solanaFeature = features['solana:signAndSendTransaction'];
      // The wallet-standard feature returns an array of outputs
      const outputs = await solanaFeature.signAndSendTransaction({
        transaction: serializedTx,
        account,
        chain: SOLANA_CHAIN,
      });
      const signature: Uint8Array = Array.isArray(outputs)
        ? outputs[0]?.signature
        : (outputs as any)?.signature;
      if (!signature) throw new Error('Wallet did not return a transaction signature');

      // signature is raw bytes; encode to base58 to get the Solana tx ID
      const txId = bs58.encode(Buffer.from(signature));

      await connection.confirmTransaction({ signature: txId, blockhash, lastValidBlockHeight }, 'confirmed');
      await activateSolSubscription(txId, senderPublicKey.toString(), nonce);
      await updateSession();
      setStep('complete');
      toast.success('Subscription activated! Welcome to Pro!');
      onSuccess();
    } catch (error: any) {
      console.error(error);
      toast.error(`Payment failed: ${error.message || 'Unknown error'}`);
      setStep('select');
    } finally {
      setIsProcessing(false);
    }
  };

  const processPayment = (wallet: RecognizedWallet) => {
    if (selectedCrypto === 'SUI') handlePaySUI(wallet);
    else if (selectedCrypto === 'SOL') handlePaySOL(wallet);
  };

  const handleClose = () => {
    if (!isProcessing) {
      setStep('select');
      onClose();
    }
  };

  if (!isOpen) return null;

  const activeWallets = selectedCrypto === 'SUI' ? suiWallets : selectedCrypto === 'SOL' ? solWallets : [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-md"
        />

        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
        >
          <div className="h-2 bg-linear-to-r from-[#4c32ff] via-[#7c5cff] to-[#cf42ff]" />

          <div className="p-6">
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors disabled:opacity-50"
            >
              <X size={20} />
            </button>

            {step === 'complete' ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center py-8 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">You're Pro Now!</h3>
                <p className="text-sm text-gray-500 mb-6">Your subscription has been activated successfully.</p>
                <button
                  onClick={handleClose}
                  className="px-8 py-3 bg-[#4c32ff] text-white rounded-xl font-semibold hover:bg-[#3d27cc] transition-colors"
                >
                  Start Exploring
                </button>
              </motion.div>
            ) : (
              <>
                <div className="text-center mb-6 mt-1">
                  <div className="mx-auto w-14 h-14 bg-linear-to-tr from-[#4c32ff] to-[#cf42ff] rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-[#4c32ff]/20">
                    <SiSui className="text-white text-2xl" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Upgrade to Pro</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    One-time payment of{' '}
                    <span className="font-bold text-[#4c32ff]">
                      ${priceInfo ? priceInfo.usdAmount : '...'}
                    </span>{' '}
                    for 30 days
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Crypto selection */}
                  <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                    {(['SUI', 'SOL', 'USDT'] as CryptoOption[]).map((crypto) => (
                      <button
                        key={crypto}
                        onClick={() => setSelectedCrypto(crypto)}
                        disabled={isProcessing}
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                          selectedCrypto === crypto
                            ? 'bg-white text-[#4c32ff] shadow-sm'
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        {crypto}
                      </button>
                    ))}
                  </div>

                  {/* Price display */}
                  <div className="bg-linear-to-br from-gray-50 to-gray-100/50 rounded-xl p-4 border border-gray-100">
                    {priceError ? (
                      <div className="flex items-center gap-2 text-red-500 text-sm">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Could not load price. Please refresh and try again.</span>
                      </div>
                    ) : selectedCrypto === 'SUI' ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Amount</span>
                          <span className="text-lg font-bold text-gray-900">
                            {priceInfo
                              ? `${priceInfo.isTestnet ? '0.01' : priceInfo.sui.amount.toFixed(4)} SUI`
                              : <span className="text-gray-400 text-sm">Loading...</span>}
                          </span>
                        </div>
                        {priceInfo && !priceInfo.isTestnet && priceInfo.sui.priceUsd && (
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-gray-400">1 SUI ≈ ${priceInfo.sui.priceUsd.toFixed(2)}</span>
                            <span className="text-xs font-medium text-gray-500">≈ ${priceInfo.usdAmount} USD</span>
                          </div>
                        )}
                        {priceInfo?.isTestnet && (
                          <p className="text-xs text-amber-600 mt-1">Testnet mode — nominal amount for testing</p>
                        )}
                      </>
                    ) : selectedCrypto === 'SOL' ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Amount</span>
                          <span className="text-lg font-bold text-gray-900">
                            {priceInfo
                              ? `${priceInfo.isTestnet ? '0.01' : priceInfo.sol.amount.toFixed(4)} SOL`
                              : <span className="text-gray-400 text-sm">Loading...</span>}
                          </span>
                        </div>
                        {priceInfo && !priceInfo.isTestnet && priceInfo.sol.priceUsd && (
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-gray-400">1 SOL ≈ ${priceInfo.sol.priceUsd.toFixed(2)}</span>
                            <span className="text-xs font-medium text-gray-500">≈ ${priceInfo.usdAmount} USD</span>
                          </div>
                        )}
                        {priceInfo?.isTestnet && (
                          <p className="text-xs text-amber-600 mt-1">Testnet mode — nominal amount for testing</p>
                        )}
                      </>
                    ) : (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Amount</span>
                        <span className="text-lg font-bold text-gray-900">
                          ${priceInfo?.usdAmount ?? '...'} USDT
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-gray-400">Duration</span>
                      <span className="text-xs font-medium text-gray-500">30 days</span>
                    </div>
                  </div>

                  {/* Wallet buttons */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                      Pay with Wallet
                    </label>

                    {isProcessing ? (
                      <div className="flex items-center justify-center gap-3 px-4 py-4 border-2 border-dashed border-[#4c32ff]/20 bg-[#4c32ff]/5 text-[#4c32ff] rounded-xl">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="font-semibold">Awaiting wallet confirmation...</span>
                      </div>
                    ) : selectedCrypto === 'USDT' ? (
                      <button disabled className="w-full px-4 py-3.5 bg-gray-100 text-gray-400 rounded-xl font-medium cursor-not-allowed">
                        USDT integration coming soon
                      </button>
                    ) : activeWallets.length > 0 ? (
                      activeWallets.map(wallet => (
                        <button
                          key={wallet.name}
                          onClick={() => processPayment(wallet)}
                          className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-[#4c32ff] text-white hover:bg-[#3d27cc] rounded-xl font-semibold transition-all shadow-md shadow-[#4c32ff]/20 hover:shadow-lg hover:shadow-[#4c32ff]/30 hover:-translate-y-0.5 active:translate-y-0"
                        >
                          {wallet.icon
                            ? <img src={wallet.icon} alt={wallet.name} className="w-6 h-6 rounded" />
                            : <Wallet className="w-5 h-5" />}
                          Pay with {wallet.name}
                        </button>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl text-center gap-2 border border-gray-100">
                        <AlertCircle className="w-6 h-6 text-gray-400" />
                        <p className="text-sm text-gray-600 font-medium">
                          No {selectedCrypto === 'SUI' ? 'Sui' : 'Solana'} wallets detected
                        </p>
                        <a
                          href={selectedCrypto === 'SUI' ? 'https://suiwallet.com/' : 'https://phantom.app/'}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-[#4c32ff] hover:underline"
                        >
                          {selectedCrypto === 'SUI' ? 'Download Sui Wallet' : 'Download Phantom'}
                        </a>
                      </div>
                    )}
                  </div>

                  <p className="text-center text-[11px] text-gray-400 font-medium pb-1">
                    Secure on-chain payment. Non-refundable.
                  </p>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
