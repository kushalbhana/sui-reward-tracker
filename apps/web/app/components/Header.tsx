"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { IoRocketOutline } from "react-icons/io5";

const navLinks = [
  { label: 'report', href: '##report' },
  { label: 'validators', href: '#validators' },
  { label: 'about us', href: '#about' },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
        ? 'bg-white/90 backdrop-blur-md shadow-sm'
        : 'bg-transparent'
        }`}
    >
      <div className="mx-auto px-6 lg:px-12">
        <div className="relative flex items-center h-20 lg:h-24">

          {/* Left - Logo */}
          <motion.a
            href="#"
            className="flex items-center gap-3 z-10 hover:opacity-80 transition-opacity"
          >
            <div className="w-12 h-12 bg-[#4c32ff] rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl"><IoRocketOutline /></span>
            </div>
            <span className="text-xl lg:text-[2.5vw] font-semibold hidden sm:block">
              SuiRewards
            </span>
          </motion.a>

          {/* Center - Navigation */}
          <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="relative text-[2.5vw] font-medium text-black hover:opacity-70 transition-opacity group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-black transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </nav>

          {/* Right - Actions */}
          <div className="ml-auto flex items-center gap-5 z-10">
            <button className="hidden sm:flex w-11 h-11 items-center justify-center border border-black/20 rounded-2xl text-[1vw] font-medium hover:bg-black hover:text-white transition-colors">
              ENG
            </button>

            <a
              href="#signin"
              className="hidden md:flex items-center gap-2 px-6 py-3 bg-transparent text-[#4c32ff] text-[2.5vw] font-medium transition-all duration-300"
            >
              sign in
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-black transition-all duration-300 group-hover:w-full" />
            </a>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu */}
      <motion.div
        initial={false}
        animate={{
          height: mobileMenuOpen ? 'auto' : 0,
          opacity: mobileMenuOpen ? 1 : 0,
        }}
        transition={{ duration: 0.3 }}
        className="lg:hidden overflow-hidden bg-white"
      >
        <nav className="flex flex-col px-6 py-4 gap-4">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-base font-medium py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <a
            href="#signin"
            className="inline-flex items-center justify-center px-6 py-3 bg-black text-white rounded-full text-[2.5vw] font-medium mt-2"
            onClick={() => setMobileMenuOpen(false)}
          >
            sign in

          </a>
        </nav>
      </motion.div>
    </motion.header>
  );
}
