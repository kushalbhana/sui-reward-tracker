"use client";

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, AlertCircle, Check, Loader2 } from 'lucide-react';
import { SiSui, SiSolana } from "react-icons/si";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { Connection, PublicKey, SystemProgram, Transaction, clusterApiUrl } from '@solana/web3.js';
import { getWallets, Wallet as StandardWallet } from '@mysten/wallet-standard';
import { TransactionBlock } from '@mysten/sui.js/transactions';

const DESTINATION_SOL = new PublicKey(process.env.NEXT_PUBLIC_SOLANA_WALLET!);
const DESTINATION_SUI = process.env.NEXT_PUBLIC_SUI_WALLET;

// Approximate prices — $25 equivalent
const PRICES = {
  SUI: 25,   // ~$25 worth of SUI (adjust based on market)
  SOL: 0.18, // ~$25 worth of SOL (adjust based on market)
  USDT: 25,
};

type CryptoOption = 'SUI' | 'SOL' | 'USDT';

interface RecognizedWallet {
  name: string;
  icon: string;
  provider?: any;
  standardWallet?: StandardWallet;
}

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SubscriptionModal({ isOpen, onClose, onSuccess }: SubscriptionModalProps) {
  const { data: session, update: updateSession } = useSession();
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoOption>('SUI');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'select' | 'processing' | 'complete'>('select');

  // Wallet State
  const [suiWallets, setSuiWallets] = useState<RecognizedWallet[]>([]);
  const [solWallets, setSolWallets] = useState<RecognizedWallet[]>([]);

  useEffect(() => {
    const walletsAPI = getWallets();
    const updateSuiWallets = () => {
      const standardWallets = walletsAPI.get();
      const uniqueMap = new Map();
      standardWallets.forEach(item => {
        const normalizedName = item.name.toLowerCase().trim();
        if (!uniqueMap.has(normalizedName) || (Object.keys(item.features || {}).length > Object.keys(uniqueMap.get(normalizedName).features || {}).length)) {
          uniqueMap.set(normalizedName, item);
        }
      });
      const uniqueWallets = Array.from(uniqueMap.values());
      const mapped = uniqueWallets.map(w => ({
        name: w.name,
        icon: w.icon,
        standardWallet: w,
      }));
      setSuiWallets(mapped);
    };
    updateSuiWallets();
    const unsubscribeSui = walletsAPI.on('register', updateSuiWallets);

    const updateSolWallets = () => {
      const sol: RecognizedWallet[] = [];
      const seenNames = new Set<string>();
      const addSolWallet = (name: string, icon: string, provider: any) => {
        const normalizedName = name.toLowerCase().trim();
        if (!seenNames.has(normalizedName)) {
          seenNames.add(normalizedName);
          sol.push({ name, icon, provider });
        }
      };
      if (typeof window !== 'undefined') {
        if ((window as any).phantom?.solana) {
          addSolWallet('Phantom', 'https://phantom.app/img/phantom-logo.svg', (window as any).phantom.solana);
        }
        if ((window as any).solflare) {
          addSolWallet('Solflare', 'https://solflare.com/assets/logo.svg', (window as any).solflare);
        }
      }
      setSolWallets(sol);
    };
    updateSolWallets();
    const timeout = setTimeout(updateSolWallets, 1500);

    return () => {
      clearTimeout(timeout);
      unsubscribeSui();
    };
  }, []);

  const activateSubscription = async (txHash: string, walletAddress: string, paidAmount: number, paidCurrency: string) => {
    const res = await fetch('/api/subscription/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txHash, walletAddress, paidAmount, paidCurrency }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Subscription activation failed');
    }

    return res.json();
  };

  const handlePaySUI = async (wallet: RecognizedWallet) => {
    try {
      if (!wallet.standardWallet) return;
      setIsProcessing(true);
      setStep('processing');

      let accounts: any[] = [];
      const features = wallet.standardWallet.features as any;

      if (typeof features['standard:connect'] !== 'undefined') {
        const result = await features['standard:connect'].connect();
        accounts = result.accounts;
      } else {
        toast.error(`${wallet.name} does not support standard connection.`);
        setIsProcessing(false);
        setStep('select');
        return;
      }

      if (!accounts || accounts.length === 0) {
        accounts = wallet.standardWallet.accounts as any[];
      }
      if (!accounts || accounts.length === 0) {
        toast.error(`No accounts found in ${wallet.name}.`);
        setIsProcessing(false);
        setStep('select');
        return;
      }

      const signAndExecuteFeature = features['sui:signAndExecuteTransactionBlock'] || features['sui:signAndExecuteTransaction'];
      if (!signAndExecuteFeature) {
        toast.error(`${wallet.name} does not support transaction execution.`);
        setIsProcessing(false);
        setStep('select');
        return;
      }

      const amountMist = PRICES.SUI * 1_000_000_000;
      const txb = new TransactionBlock();
      const [coin] = txb.splitCoins(txb.gas, [txb.pure(amountMist)]);
      txb.transferObjects([coin as any], DESTINATION_SUI!);

      toast.info(`Please approve the transaction in ${wallet.name}.`);

      let txResult: any;
      if (features['sui:signAndExecuteTransactionBlock']) {
        txResult = await features['sui:signAndExecuteTransactionBlock'].signAndExecuteTransactionBlock({
          transactionBlock: txb,
          account: accounts[0],
          chain: 'sui:mainnet',
        });
      } else {
        txResult = await features['sui:signAndExecuteTransaction'].signAndExecuteTransaction({
          transaction: txb,
          account: accounts[0],
          chain: 'sui:mainnet',
        });
      }

      const txHash = txResult?.digest || txResult?.hash || 'unknown';
      const walletAddress = accounts[0]?.address || 'unknown';

      await activateSubscription(txHash, walletAddress, PRICES.SUI, 'SUI');
      await updateSession();
      setStep('complete');
      toast.success('Subscription activated! Welcome to Pro! 🎉');
      onSuccess();
    } catch (error: any) {
      console.error(error);
      toast.error(`Payment failed: ${error.message || "Unknown error"}`);
      setStep('select');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaySOL = async (wallet: RecognizedWallet) => {
    try {
      if (!wallet.provider) return;
      setIsProcessing(true);
      setStep('processing');

      await wallet.provider.connect();
      const senderPublicKey = new PublicKey(wallet.provider.publicKey.toString());

      const connection = new Connection(clusterApiUrl('mainnet-beta'));
      const amountLamports = PRICES.SOL * 1_000_000_000;

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: senderPublicKey,
          toPubkey: DESTINATION_SOL,
          lamports: amountLamports,
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = senderPublicKey;

      toast.info(`Please approve the transaction in ${wallet.name}.`);
      const { signature } = await wallet.provider.signAndSendTransaction(transaction);

      await connection.confirmTransaction(signature, 'confirmed');
      const walletAddress = senderPublicKey.toString();

      await activateSubscription(signature, walletAddress, PRICES.SOL, 'SOL');
      await updateSession();
      setStep('complete');
      toast.success('Subscription activated! Welcome to Pro! 🎉');
      onSuccess();
    } catch (error: any) {
      console.error(error);
      toast.error(`Payment failed: ${error.message || "Unknown error"}`);
      setStep('select');
    } finally {
      setIsProcessing(false);
    }
  };

  const processPayment = (wallet: RecognizedWallet) => {
    if (selectedCrypto === 'SUI') {
      handlePaySUI(wallet);
    } else if (selectedCrypto === 'SOL') {
      handlePaySOL(wallet);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setStep('select');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-md"
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
        >
          {/* Decorative top gradient */}
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
              /* ── Success State ── */
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
              /* ── Payment Selection ── */
              <>
                <div className="text-center mb-6 mt-1">
                  <div className="mx-auto w-14 h-14 bg-linear-to-tr from-[#4c32ff] to-[#cf42ff] rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-[#4c32ff]/20">
                    <SiSui className="text-white text-2xl" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Upgrade to Pro</h3>
                  <p className="text-sm text-gray-500 mt-1">One-time payment of <span className="font-bold text-[#4c32ff]">$25</span> for 30 days</p>
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
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Amount</span>
                      <span className="text-lg font-bold text-gray-900">
                        {PRICES[selectedCrypto]} {selectedCrypto}
                      </span>
                    </div>
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
                    ) : selectedCrypto === 'SUI' ? (
                      suiWallets.length > 0 ? (
                        suiWallets.map(wallet => (
                          <button
                            key={wallet.name}
                            onClick={() => processPayment(wallet)}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-[#4c32ff] text-white hover:bg-[#3d27cc] rounded-xl font-semibold transition-all shadow-md shadow-[#4c32ff]/20 hover:shadow-lg hover:shadow-[#4c32ff]/30 hover:-translate-y-0.5 active:translate-y-0"
                          >
                            {wallet.icon && <img src={wallet.icon} alt={wallet.name} className="w-6 h-6 rounded" />}
                            {!wallet.icon && <Wallet className="w-5 h-5" />}
                            Pay with {wallet.name}
                          </button>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl text-center gap-2 border border-gray-100">
                          <AlertCircle className="w-6 h-6 text-gray-400" />
                          <p className="text-sm text-gray-600 font-medium">No Sui wallets found</p>
                          <a href="https://suiwallet.com/" target="_blank" rel="noreferrer" className="text-xs text-[#4c32ff] hover:underline">Download Sui Wallet</a>
                        </div>
                      )
                    ) : selectedCrypto === 'SOL' ? (
                      solWallets.length > 0 ? (
                        solWallets.map(wallet => (
                          <button
                            key={wallet.name}
                            onClick={() => processPayment(wallet)}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-[#4c32ff] text-white hover:bg-[#3d27cc] rounded-xl font-semibold transition-all shadow-md shadow-[#4c32ff]/20 hover:shadow-lg hover:shadow-[#4c32ff]/30 hover:-translate-y-0.5 active:translate-y-0"
                          >
                            {wallet.icon && <img src={wallet.icon} alt={wallet.name} className="w-6 h-6 rounded" />}
                            {!wallet.icon && <Wallet className="w-5 h-5" />}
                            Pay with {wallet.name}
                          </button>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl text-center gap-2 border border-gray-100">
                          <AlertCircle className="w-6 h-6 text-gray-400" />
                          <p className="text-sm text-gray-600 font-medium">No Solana wallets found</p>
                          <a href="https://phantom.app/" target="_blank" rel="noreferrer" className="text-xs text-[#4c32ff] hover:underline">Download Phantom</a>
                        </div>
                      )
                    ) : (
                      <button disabled className="w-full px-4 py-3.5 bg-gray-100 text-gray-400 rounded-xl font-medium cursor-not-allowed">
                        USDT integration coming soon
                      </button>
                    )}
                  </div>

                  <p className="text-center text-[11px] text-gray-400 font-medium pb-1">
                    Secure payment via your browser wallet. Non-refundable.
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
