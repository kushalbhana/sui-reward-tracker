"use client";

import { motion } from 'framer-motion';
import { AnimatedText } from './components/AnimatedText';
import RewardsWidget from './components/RewardsWidget';
import { SiAutodeskmaya } from "react-icons/si";
import { PiCodesandboxLogoBold } from "react-icons/pi";
import { PiBehanceLogoFill } from "react-icons/pi";
import { RxModulzLogo } from "react-icons/rx";
import { BiLogoMastodon } from "react-icons/bi";

const clientLogos = [
  { name: 'Awwwards', icon: <SiAutodeskmaya size={36} /> },
  { name: 'CSS Design', icon: <PiCodesandboxLogoBold size={36} /> },
  { name: 'FWA', icon: <PiBehanceLogoFill size={36} /> },
  { name: 'Webby', icon: <RxModulzLogo size={36} /> },
  { name: 'Lovie', icon: <BiLogoMastodon size={36} /> },
];

export default function Home() {
  return (
    <section className="min-h-screen pt-36 lg:pt-48 pb-20 px-6 lg:px-12 bg-[#F5F5F5]">
      <div className="max-w-full lg:mx-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-12 items-center lg:mt-10">

          {/* Left Column - Text Content */}
          <div className="order-1 lg:order-1 flex justify-center items-center flex-col">
            {/* Label */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xs font-medium tracking-[0.2em] uppercase text-gray-500 mb-5 "
            >
              Sui Network Explorer
            </motion.p>

            {/* Main Headline */}
            <h1 className="text-4xl text-[15vw] md:text-[6.25vw] lg:text-[6.25vw] xl:text-[6.25vw] font-medium leading-none mb-8 font-display">
              <AnimatedText text="Track your" delay={0.3} className='ml-10 lg:ml-0' />
              <br />
              <AnimatedText text="rewards" delay={0.5} className='lg:-ml-20' />
              <br />
              <AnimatedText text="Instantly" delay={0.7} className='ml-10 lg:ml-4' />
            </h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="text-xs font-medium tracking-[0.15em] uppercase text-gray-400 mb-12"
            >
              Real-time insights across every epoch
            </motion.p>

            {/* Client Logos */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.1 }}
              className="flex items-center gap-8 md:gap-8 lg:gap-16 w-full justify-center lg:justify-start"
            >
              {clientLogos.map((logo, index) => (
                <motion.div
                  key={logo.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 1.2 + index * 0.1 }}
                  className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 grayscale opacity-60 hover:opacity-100 transition-opacity"
                >
                  <span className="text-xl md:text-2xl font-bold">{logo.icon}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Right Column - Project Showcase Replaced by RewardsWidget */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="order-2 lg:order-2 flex justify-center lg:justify-end lg:translate-x-12 xl:translate-x-20"
          >
            {/* The form sits on the right, pushing to the right slightly as requested */}
            <div className="w-full max-w-[500px] xl:max-w-[560px] mx-auto lg:mx-0 lg:ml-auto">
              <RewardsWidget />
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
