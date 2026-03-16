"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, AlertCircle } from 'lucide-react';
import { SiSui } from "react-icons/si";
import { toast } from "sonner";
import { Connection, PublicKey, SystemProgram, Transaction, clusterApiUrl } from '@solana/web3.js';
import { getWallets, Wallet as StandardWallet } from '@mysten/wallet-standard';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import bs58 from 'bs58';

const DESTINATION_SOL = new PublicKey(process.env.NEXT_PUBLIC_SOLANA_WALLET!);
const DESTINATION_SUI = process.env.NEXT_PUBLIC_SUI_WALLET!;

const IS_TESTNET    = process.env.NEXT_PUBLIC_PAYMENT_KIT_NETWORK === 'testnet';
const SOLANA_CLUSTER = IS_TESTNET ? 'devnet' : 'mainnet-beta';
const SOLANA_CHAIN   = IS_TESTNET ? 'solana:devnet' : 'solana:mainnet';

type CryptoOption = 'SUI' | 'SOL' | 'USDT';

interface RecognizedWallet {
  name: string;
  icon: string;
  standardWallet: StandardWallet;
}

export default function DonateButton() {
  const [isDonateOpen, setIsDonateOpen] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoOption>('SUI');
  const [amount, setAmount] = useState<string>('1');
  const [isProcessing, setIsProcessing] = useState(false);

  const [suiWallets, setSuiWallets] = useState<RecognizedWallet[]>([]);
  const [solWallets, setSolWallets] = useState<RecognizedWallet[]>([]);

  // Unified wallet detection via wallet-standard.
  // Every modern wallet (Phantom, Solflare, MetaMask, Backpack, etc.) registers here.
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

  const handleDonateSOL = async (wallet: RecognizedWallet, amountLamports: number) => {
    try {
      setIsProcessing(true);

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
        return;
      }

      const account = accounts[0];
      const senderPublicKey = new PublicKey(account.address);
      const connection = new Connection(clusterApiUrl(SOLANA_CLUSTER as any));

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: senderPublicKey,
          toPubkey: DESTINATION_SOL,
          lamports: amountLamports,
        })
      );
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = senderPublicKey;

      toast.info(`Please approve the transaction in ${wallet.name}.`);

      const serializedTx = transaction.serialize({ requireAllSignatures: false, verifySignatures: false });
      const solanaFeature = features['solana:signAndSendTransaction'];
      const outputs = await solanaFeature.signAndSendTransaction({
        transaction: serializedTx,
        account,
        chain: SOLANA_CHAIN,
      });
      const signature: Uint8Array = Array.isArray(outputs)
        ? outputs[0]?.signature
        : (outputs as any)?.signature;
      if (!signature) throw new Error('Wallet did not return a transaction signature');

      const txId = bs58.encode(Buffer.from(signature));

      toast.promise(
        connection.confirmTransaction({ signature: txId, blockhash, lastValidBlockHeight }, 'confirmed'),
        {
          loading: 'Confirming SOL donation...',
          success: `Thank you for your SOL donation via ${wallet.name}! 🎉`,
          error: 'Failed to confirm transaction.',
        }
      );
      setIsDonateOpen(false);
    } catch (error: any) {
      console.error(error);
      toast.error(`SOL donation failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDonateSUI = async (wallet: RecognizedWallet, amountMist: number) => {
    try {
      setIsProcessing(true);

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
        return;
      }

      const signAndExecuteFeature =
        features['sui:signAndExecuteTransaction'] ||
        features['sui:signAndExecuteTransactionBlock'];
      if (!signAndExecuteFeature) {
        toast.error(`${wallet.name} does not support transaction execution.`);
        setIsProcessing(false);
        return;
      }

      const txb = new TransactionBlock();
      const [coin] = txb.splitCoins(txb.gas, [txb.pure(amountMist)]);
      txb.transferObjects([coin as any], DESTINATION_SUI);

      toast.info(`Please approve the transaction in ${wallet.name}.`);

      const suiChain = `sui:${process.env.NEXT_PUBLIC_PAYMENT_KIT_NETWORK || 'mainnet'}`;

      if (features['sui:signAndExecuteTransaction']) {
        await features['sui:signAndExecuteTransaction'].signAndExecuteTransaction({
          transaction: txb,
          account: accounts[0],
          chain: suiChain,
        });
      } else {
        await features['sui:signAndExecuteTransactionBlock'].signAndExecuteTransactionBlock({
          transactionBlock: txb,
          account: accounts[0],
          chain: suiChain,
        });
      }

      toast.success(`Thank you for your SUI donation via ${wallet.name}! 🎉`);
      setIsDonateOpen(false);
    } catch (error: any) {
      console.error(error);
      toast.error(`SUI donation failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const processDonation = (wallet: RecognizedWallet) => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }
    if (selectedCrypto === 'SOL') {
      handleDonateSOL(wallet, Math.round(numericAmount * 1_000_000_000));
    } else if (selectedCrypto === 'SUI') {
      handleDonateSUI(wallet, Math.round(numericAmount * 1_000_000_000));
    }
  };

  const activeWallets = selectedCrypto === 'SUI' ? suiWallets : selectedCrypto === 'SOL' ? solWallets : [];

  return (
    <>
      <button
        onClick={() => setIsDonateOpen(true)}
        className="hidden sm:flex p-2 px-4 items-center gap-2 justify-center border border-[#4c32ff] text-[#4c32ff] hover:cursor-pointer rounded-2xl text-[1vw] font-medium hover:bg-[#4c32ff] hover:text-white transition-all shadow-sm hover:shadow-md"
      >
        <Wallet size={16} />
        Donate
      </button>

      <AnimatePresence>
        {isDonateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isProcessing && setIsDonateOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden p-6 border border-white/20"
            >
              <button
                onClick={() => !isProcessing && setIsDonateOpen(false)}
                disabled={isProcessing}
                className="absolute top-4 right-4 text-gray-400 hover:text-black transition-colors disabled:opacity-50"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-6 mt-2">
                <div className="mx-auto w-12 h-12 bg-linear-to-tr from-[#4c32ff] to-[#cf42ff] rounded-full flex items-center justify-center mb-3 shadow-lg">
                  <span className="text-white font-bold text-xl"><SiSui /></span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Support Us</h3>
                <p className="text-sm text-gray-500 mt-1">Select your preferred asset to donate</p>
              </div>

              <div className="space-y-5">
                {/* Network Selection */}
                <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                  {(['SUI', 'SOL', 'USDT'] as CryptoOption[]).map((crypto) => (
                    <button
                      key={crypto}
                      onClick={() => setSelectedCrypto(crypto)}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                        selectedCrypto === crypto
                          ? 'bg-white text-[#4c32ff] shadow-sm'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      {crypto}
                    </button>
                  ))}
                </div>

                {/* Amount Input */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Amount to Donate</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 5"
                      min="0.1"
                      step="0.1"
                      className="w-full rounded-xl px-4 py-3 pb-3 bg-gray-50 border border-gray-200 text-black text-lg font-medium focus:outline-none focus:ring-2 focus:ring-[#4c32ff]/50 transition-all font-sans"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold pointer-events-none">
                      {selectedCrypto}
                    </div>
                  </div>
                </div>

                {/* Wallet Selection & Donation */}
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                    Available Wallets
                  </label>

                  {isProcessing ? (
                    <div className="w-full relative flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-[#4c32ff]/20 bg-[#4c32ff]/5 text-[#4c32ff] rounded-xl font-bold tracking-wide">
                      <span className="animate-pulse flex items-center gap-2">
                        <Wallet className="w-5 h-5 animate-bounce" /> Awaiting Wallet...
                      </span>
                    </div>
                  ) : selectedCrypto === 'USDT' ? (
                    <button disabled className="w-full px-4 py-3 bg-gray-100 text-gray-400 rounded-xl font-medium cursor-not-allowed">
                      USDT integration coming soon
                    </button>
                  ) : activeWallets.length > 0 ? (
                    activeWallets.map(wallet => (
                      <button
                        key={wallet.name}
                        onClick={() => processDonation(wallet)}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#4c32ff] text-white hover:bg-[#4c32ff]/90 rounded-xl font-medium transition-all shadow-sm"
                      >
                        {wallet.icon
                          ? <img src={wallet.icon} alt={wallet.name} className="w-6 h-6 rounded" />
                          : <Wallet className="w-5 h-5" />}
                        <span>Donate with {wallet.name}</span>
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
                  Direct transfer from your browser wallet.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
