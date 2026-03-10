"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LogOut, Github } from 'lucide-react';
import { SiSui, SiGoogle } from "react-icons/si";
import { signIn, signOut, useSession } from "next-auth/react";
import { toast } from "sonner";
import DonateButton from "./DonateButton";



const navLinks = [
  { label: 'report', href: '##report' },
  { label: 'validators', href: '#validators' },
  { label: 'about us', href: '#about' },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { data: session, status } = useSession();

  // Show a welcome toast when the user successfully signs in
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const isNewUser = (session.user as any).isNewUser;

      // Store a flag in sessionStorage to prevent showing this toast multiple times
      const greeted = sessionStorage.getItem(`greeted_${session.user.email}`);

      if (!greeted) {
        if (isNewUser) {
          toast.success(`Welcome to SuiRewards! You successfully signed up.`);
        } else {
          toast.success(`Welcome back, ${session.user.name || "User"}! You signed in.`);
        }
        sessionStorage.setItem(`greeted_${session.user.email}`, "true");
      }
    }
  }, [status, session]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${scrolled
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
                <span className="text-white font-bold text-xl"><SiSui /></span>
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
              <DonateButton />

              {status === "loading" ? (
                <div className="hidden md:flex items-center gap-2 px-6 py-3 bg-transparent text-[#4c32ff] font-medium animate-pulse">
                  loading...
                </div>
              ) : status === "authenticated" && session?.user ? (
                <div className="hidden md:flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    {session.user.image ? (
                      <img
                        src={session.user.image}
                        alt="Profile"
                        className="w-10 h-10 rounded-full border-2 border-[#4c32ff] object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full border-2 border-[#4c32ff] bg-gray-200 flex items-center justify-center text-gray-700 font-bold">
                        {session.user.name?.[0]?.toUpperCase() || "U"}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => signOut()}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-red-50 text-[#4c32ff] hover:bg-[#4c32ff] hover:text-white hover:cursor-pointer transition-colors"
                    title="Log out"
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="hidden md:flex items-center gap-2 px-6 hover:cursor-pointer py-3 bg-transparent text-[#4c32ff] text-[2.5vw] font-medium transition-all duration-300 group relative"
                >
                  sign in
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-black transition-all duration-300 group-hover:w-full" />
                </button>
              )}

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

            {status === "authenticated" && session?.user ? (
              <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-2">
                <div className="flex items-center gap-3">
                  {session.user.image && (
                    <img src={session.user.image} alt="Profile" className="w-10 h-10 rounded-full object-cover" />
                  )}
                  <span className="font-medium text-black">{session.user.name}</span>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="flex items-center gap-2 text-red-500 font-medium"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </div>
            ) : (
              <button
                className="inline-flex items-center justify-center px-6 py-3 hover:cursor-pointer bg-black text-white rounded-full font-medium mt-2"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsAuthModalOpen(true);
                }}
              >
                sign in
              </button>
            )}
          </nav>
        </motion.div>
      </motion.header>

      {/* Authentication Modal */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden p-8 border border-white/20"
            >
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-black transition-colors"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-8">
                <div className="mx-auto w-12 h-12 bg-[#4c32ff] rounded-full flex items-center justify-center mb-4">
                  <span className="text-white font-bold text-xl"><SiSui /></span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Welcome Back</h3>
                <p className="text-sm text-gray-500 mt-2">Sign in to track your Sui rewards</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => signIn("google", { callbackUrl: "/" })}
                  className="w-full flex items-center hover:cursor-pointer justify-center gap-3 px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-black font-semibold hover:bg-gray-50 hover:shadow-sm transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                >
                  <SiGoogle className="text-xl" />
                  Continue with Google
                </button>

                <button
                  onClick={() => signIn("github", { callbackUrl: "/" })}
                  className="w-full flex items-center hover:cursor-pointer justify-center gap-3 px-4 py-3.5 bg-[#24292e] text-white rounded-xl font-semibold hover:bg-[#1b1f23] hover:shadow-md transition-all shadow-[0_4px_14px_rgba(0,0,0,0.1)]"
                >
                  <Github className="text-xl" />
                  Continue with GitHub
                </button>
              </div>

              <div className="mt-6 text-center text-xs text-gray-500">
                By signing in, you agree to our Terms of Service and Privacy Policy.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
