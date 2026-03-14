"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Lock, Sparkles, Zap, BarChart3, Users, Clock, Shield } from 'lucide-react';
import { useSession } from 'next-auth/react';
import SubscriptionModal from './SubscriptionModal';

const freePlanFeatures = [
  { icon: <Users size={16} />, text: 'Single delegator lookup' },
  { icon: <Clock size={16} />, text: 'Up to 5 epoch range' },
  { icon: <BarChart3 size={16} />, text: 'Basic reward tracking' },
  { icon: <Shield size={16} />, text: 'Community support' },
];

const proPlanFeatures = [
  { icon: <Users size={16} />, text: 'Multiple delegator addresses' },
  { icon: <Clock size={16} />, text: 'Unlimited epoch range' },
  { icon: <Zap size={16} />, text: 'Full validator indexing & reports' },
  { icon: <BarChart3 size={16} />, text: 'Pre-indexed data, fast response' },
  { icon: <Sparkles size={16} />, text: 'Daily tracking & alerts' },
  { icon: <Shield size={16} />, text: 'Priority support' },
];

export default function PricingSection() {
  const { data: session } = useSession();
  const plan = (session?.user as any)?.plan || 'free';
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

  const handleSubscribeClick = () => {
    if (!session) {
      // Could prompt sign-in, but for now just show the modal
      setIsSubscriptionModalOpen(true);
      return;
    }
    setIsSubscriptionModalOpen(true);
  };

  return (
    <>
      <section id="pricing" className="py-20 lg:py-28 px-6 lg:px-12 bg-[#F5F5F5] relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#4c32ff]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto relative z-10">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="inline-block px-4 py-1.5 bg-[#4c32ff]/10 text-[#4c32ff] text-xs font-bold uppercase tracking-[0.2em] rounded-full mb-5"
            >
              Pricing
            </motion.span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold font-display text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-gray-500 text-lg max-w-lg mx-auto">
              Start free, upgrade when you need more power. Pay with crypto.
            </p>
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">

            {/* ── Free Plan ── */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="relative rounded-2xl p-8 bg-white/80 backdrop-blur-sm border border-gray-200/60 shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.08)] transition-all duration-500 group"
            >
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                    <Zap size={20} className="text-gray-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 font-display">Explorer</h3>
                </div>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-4xl font-bold text-gray-900 font-display">Free</span>
                </div>
                <p className="text-sm text-gray-500">Perfect for getting started</p>
              </div>

              <ul className="space-y-3.5 mb-8">
                {freePlanFeatures.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <Check size={12} className="text-gray-600" />
                    </div>
                    <span className="text-sm text-gray-700">{feature.text}</span>
                  </li>
                ))}
                <li className="flex items-center gap-3 opacity-40">
                  <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <Lock size={10} className="text-gray-400" />
                  </div>
                  <span className="text-sm text-gray-500 line-through">Validator indexing</span>
                </li>
              </ul>

              <button
                disabled
                className="w-full py-3.5 rounded-xl font-semibold text-sm bg-gray-100 text-gray-500 cursor-default border border-gray-200"
              >
                {plan === 'free' ? 'Current Plan' : 'Free Plan'}
              </button>
            </motion.div>

            {/* ── Pro Plan ── */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="relative rounded-2xl p-8 bg-white border border-[#4c32ff]/20 shadow-[0_8px_40px_rgba(76,50,255,0.08)] hover:shadow-[0_12px_50px_rgba(76,50,255,0.15)] transition-all duration-500 group overflow-hidden"
            >
              {/* Gradient glow */}
              <div className="absolute -right-16 -top-16 w-48 h-48 bg-[#4c32ff]/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-[#cf42ff]/10 rounded-full blur-3xl pointer-events-none" />

              {/* Popular badge */}
              <div className="absolute top-6 right-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-linear-to-r from-[#4c32ff] to-[#7c5cff] text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm">
                  <Sparkles size={10} />
                  Popular
                </span>
              </div>

              <div className="relative z-10 mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-linear-to-br from-[#4c32ff] to-[#7c5cff] flex items-center justify-center shadow-md shadow-[#4c32ff]/20">
                    <Sparkles size={20} className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 font-display">Pro</h3>
                </div>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-4xl font-bold text-gray-900 font-display">$25</span>
                  <span className="text-sm text-gray-500 font-medium">/month</span>
                </div>
                <p className="text-sm text-gray-500">Pay in SUI, SOL, or USDT</p>
              </div>

              <ul className="relative z-10 space-y-3.5 mb-8">
                {proPlanFeatures.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#4c32ff]/10 flex items-center justify-center shrink-0">
                      <Check size={12} className="text-[#4c32ff]" />
                    </div>
                    <span className="text-sm text-gray-700">{feature.text}</span>
                  </li>
                ))}
              </ul>

              {plan === 'pro' ? (
                <div className="relative z-10 w-full py-3.5 rounded-xl font-semibold text-sm bg-linear-to-r from-[#4c32ff] to-[#7c5cff] text-white text-center border border-[#4c32ff]/50 shadow-md shadow-[#4c32ff]/20">
                  ✓ Active Plan
                </div>
              ) : (
                <button
                  onClick={handleSubscribeClick}
                  className="relative z-10 w-full py-3.5 rounded-xl font-semibold text-sm bg-linear-to-r from-[#4c32ff] to-[#7c5cff] text-white hover:from-[#3d27cc] hover:to-[#6a4ad4] transition-all duration-300 shadow-lg shadow-[#4c32ff]/25 hover:shadow-xl hover:shadow-[#4c32ff]/35 hover:-translate-y-0.5 active:translate-y-0 border border-[#4c32ff]/50 hover:cursor-pointer"
                >
                  Subscribe Now
                </button>
              )}
            </motion.div>
          </div>

          {/* Bottom note */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-center text-xs text-gray-400 mt-8"
          >
            All payments processed securely via blockchain. Non-refundable.
          </motion.p>
        </div>
      </section>

      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        onSuccess={() => setIsSubscriptionModalOpen(false)}
      />
    </>
  );
}
