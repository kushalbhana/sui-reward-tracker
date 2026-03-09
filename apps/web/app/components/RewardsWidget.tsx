"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  delegatorFormSchema, 
  validatorFormSchema, 
  type DelegatorFormValues, 
  type ValidatorFormValues 
} from '@repo/schema';

export default function RewardsWidget() {
  const [activeTab, setActiveTab] = useState<'delegator' | 'validator'>('delegator');

  const delegatorForm = useForm<DelegatorFormValues>({
    resolver: zodResolver(delegatorFormSchema),
  });

  const validatorForm = useForm<ValidatorFormValues>({
    resolver: zodResolver(validatorFormSchema),
  });

  const onSubmitDelegator = (data: DelegatorFormValues) => {
    console.log("Delegator Form Data:", data);
    alert(JSON.stringify(data, null, 2));
  };

  const onSubmitValidator = (data: ValidatorFormValues) => {
    console.log("Validator Form Data:", data);
    alert(JSON.stringify(data, null, 2));
  };

  return (
    <div className="w-full max-w-md rounded-2xl p-6 relative overflow-hidden bg-white/70 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
      {/* Decorative blurred blob inside the card */}
      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-blue-400/20 blur-3xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col space-y-6">
        <div className="flex items-center space-x-1 rounded-xl bg-[#F5F5F5] p-1 shadow-inner border border-black/5">
          <button
            onClick={() => setActiveTab('delegator')}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-300 ${activeTab === 'delegator'
              ? 'bg-white text-blue-600 shadow-sm border border-gray-200/50'
              : 'text-gray-500 hover:text-gray-800 hover:bg-black/5'
              }`}
          >
            Delegator
          </button>
          <button
            onClick={() => setActiveTab('validator')}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-300 ${activeTab === 'validator'
              ? 'bg-white text-blue-600 shadow-sm border border-gray-200/50'
              : 'text-gray-500 hover:text-gray-800 hover:bg-black/5'
              }`}
          >
            Validator <span className="text-[10px] ml-1 bg-[#4c32ff] text-white px-1 rounded-full">Paid</span>
          </button>
        </div>

        <div className="transition-all duration-500">
          {activeTab === 'delegator' && (
            <form onSubmit={delegatorForm.handleSubmit(onSubmitDelegator)} className="flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-800">Delegator Address</label>
                <input
                  type="text"
                  {...delegatorForm.register('delegatorAddress')}
                  placeholder="0x8hfd, 0xJb56"
                  className="w-full rounded-xl px-4 py-3 bg-white/90 border border-black/10 shadow-inner text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                {delegatorForm.formState.errors.delegatorAddress && (
                  <p className="text-red-500 text-xs mt-1">{delegatorForm.formState.errors.delegatorAddress.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-800">Validator Address</label>
                <input
                  type="text"
                  {...delegatorForm.register('validatorAddress')}
                  placeholder="0x..."
                  className="w-full rounded-xl px-4 py-3 bg-white/90 border border-black/10 shadow-inner text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                {delegatorForm.formState.errors.validatorAddress && (
                  <p className="text-red-500 text-xs mt-1">{delegatorForm.formState.errors.validatorAddress.message}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-800">Start Epoch</label>
                  <input
                    type="number"
                    {...delegatorForm.register('startEpoch')}
                    placeholder="e.g. 1020"
                    className="w-full rounded-xl px-4 py-3 bg-white/90 border border-black/10 shadow-inner text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  {delegatorForm.formState.errors.startEpoch && (
                    <p className="text-red-500 text-xs mt-1">{delegatorForm.formState.errors.startEpoch.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-800">End Epoch</label>
                  <input
                    type="number"
                    {...delegatorForm.register('endEpoch')}
                    placeholder="e.g. 1050"
                    className="w-full rounded-xl px-4 py-3 bg-white/90 border border-black/10 shadow-inner text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  {delegatorForm.formState.errors.endEpoch && (
                    <p className="text-red-500 text-xs mt-1">{delegatorForm.formState.errors.endEpoch.message}</p>
                  )}
                </div>
              </div>

              <button type="submit" className="mt-4 w-full rounded-xl px-4 py-3.5 font-bold tracking-wide bg-[#596fff] text-white shadow-[0_8px_16px_rgba(0,82,255,0.2)] hover:shadow-[0_12px_20px_rgba(0,82,255,0.3)] hover:-translate-y-0.5 transition-all duration-300 active:translate-y-0 active:shadow-md border border-blue-400/50">
                Check Rewards
              </button>
            </form>
          )}

          {activeTab === 'validator' && (
            <form onSubmit={validatorForm.handleSubmit(onSubmitValidator)} className="flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-800">Validator Address</label>
                <input
                  type="text"
                  {...validatorForm.register('validatorAddress')}
                  placeholder="0x..."
                  className="w-full rounded-xl px-4 py-3 bg-white/90 border border-black/10 shadow-inner text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                {validatorForm.formState.errors.validatorAddress && (
                  <p className="text-red-500 text-xs mt-1">{validatorForm.formState.errors.validatorAddress.message}</p>
                )}
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-sm font-semibold text-gray-800">Validator Actions</label>
                <ul className="list-disc list-inside text-gray-500 space-y-1 mt-1">
                  <li>Index all historic delegators</li>
                  <li>Generate Reports</li>
                  <li>Track historical rewards</li>
                  <li>Pre Index data for fast response time</li>
                  <li>Track validator daily and set alerts</li>
                </ul>
              </div>

              <button type="submit" className="mt-4 w-full rounded-xl px-4 py-3.5 font-bold tracking-wide bg-[#596fff] text-white shadow-[0_8px_16px_rgba(0,82,255,0.2)] hover:shadow-[0_12px_20px_rgba(0,82,255,0.3)] hover:-translate-y-0.5 transition-all duration-300 active:translate-y-0 active:shadow-md border border-blue-400/50">
                Check Rewards
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
