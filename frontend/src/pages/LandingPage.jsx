import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  UserPlus,
  ScanFace,
  ShieldCheck,
  Zap,
  Activity,
  Microscope
} from 'lucide-react';
import useAuthStore from '../store/authStore';

const LandingPage = () => {
  const { currentUser } = useAuthStore();
  // Animation Variants
  const containerVars = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.3 }
    }
  };

  const itemVars = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.8, ease: "easeOut" } }
  };

  return (
    <div className="min-h-screen bg-[#050b0a] text-emerald-50 selection:bg-emerald-500/30 overflow-x-hidden">

      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-900/20 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 pointer-events-none"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-50 flex items-center justify-between px-10 py-6 backdrop-blur-md border-b border-emerald-900/30">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500 blur-md opacity-50"></div>
            <Activity className="relative text-emerald-400" size={32} />
          </div>
          <span className="text-2xl font-black tracking-tighter uppercase italic">Derm<span className="text-emerald-500">AI</span></span>
        </div>

        <div className="hidden md:flex gap-10 text-sm font-bold tracking-widest text-emerald-100/60 uppercase">
          {['Features', 'Technology', 'About', 'Support'].map((item) => (
            // Simple anchor links for now
            <a key={item} href="#" className="hover:text-emerald-400 transition-colors duration-300">{item}</a>
          ))}
        </div>

        <Link to={currentUser ? "/dashboard" : "/login"}>
          <button className="group relative px-8 py-3 bg-emerald-500 text-black font-bold rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95">
            <span className="relative z-10">{currentUser ? "Open Dashboard" : "Doctor Login"}</span>
            <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          </button>
        </Link>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-10 pt-24 pb-32 grid lg:grid-cols-2 gap-16 items-center">
        <motion.div initial="hidden" animate="visible" variants={containerVars}>
          <motion.div variants={itemVars} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-[0.2em] mb-8">
            <Zap size={14} /> AI Diagnostics v2.0 Live
          </motion.div>

          <motion.h1 variants={itemVars} className="text-7xl lg:text-8xl font-black leading-[0.9] mb-8 italic">
            PRECISION <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">SKIN CARE</span>
          </motion.h1>

          <motion.p variants={itemVars} className="text-emerald-100/60 text-lg max-w-lg leading-relaxed mb-10">
            Augmenting clinical expertise with neural-vision. Upload, analyze, and diagnose complex dermatological conditions with 99.2% model accuracy.
          </motion.p>

          <motion.div variants={itemVars} className="flex flex-wrap gap-5">
            <Link to={currentUser ? "/dashboard" : "/login"}>
              <button className="px-10 py-5 bg-emerald-500 text-black font-black rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-emerald-500/50 transition-all uppercase tracking-wider">
                Get Started
              </button>
            </Link>
            <button className="px-10 py-5 bg-transparent border-2 border-emerald-500/30 text-emerald-400 font-black rounded-2xl hover:bg-emerald-500/5 transition-all uppercase tracking-wider">
              Watch Demo
            </button>
          </motion.div>
        </motion.div>

        {/* Futuristic Card Mockup */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="relative group"
        >
          <div className="absolute -inset-4 bg-emerald-500/20 blur-3xl group-hover:bg-emerald-500/30 transition duration-1000"></div>
          <div className="relative bg-[#0a1210] border border-emerald-500/30 rounded-[2.5rem] p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-10">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-900" />
                <div className="w-3 h-3 rounded-full bg-emerald-800" />
                <div className="w-3 h-3 rounded-full bg-emerald-700" />
              </div>
              <div className="px-3 py-1 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">LIVE PROCESSING</div>
            </div>

            <div className="space-y-6">
              <div className="h-48 rounded-3xl bg-emerald-500/5 border border-dashed border-emerald-500/40 flex flex-col items-center justify-center group/upload cursor-pointer">
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                  <ScanFace className="text-emerald-500 mb-4" size={48} />
                </motion.div>
                <p className="text-emerald-500 text-sm font-bold tracking-widest uppercase">Analyze Lesion</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-24 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 p-4">
                    <div className="w-1/2 h-2 bg-emerald-900 rounded mb-3" />
                    <div className="w-full h-4 bg-emerald-500/20 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Feature Section */}
      <section className="relative z-10 px-10 py-24 bg-[#080e0d]">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<UserPlus size={28} />}
            title="Bio-Profile"
            desc="Automated patient onboarding with secure cloud encryption."
          />
          <FeatureCard
            icon={<Microscope size={28} />}
            title="Derm-Scanner"
            desc="High-fidelity image processing for deep-tissue analysis."
          />
          <FeatureCard
            icon={<ShieldCheck size={28} />}
            title="Neural Guard"
            desc="HIPAA-compliant AI architecture for sensitive medical data."
          />
        </div>
      </section>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }) => (
  <motion.div
    whileHover={{ y: -10, backgroundColor: "rgba(16, 185, 129, 0.05)" }}
    className="p-10 rounded-[2rem] border border-emerald-900/50 bg-[#0a1210] transition-all duration-500 group"
  >
    <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mb-8 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h3 className="text-2xl font-bold mb-4 tracking-tight">{title}</h3>
    <p className="text-emerald-100/40 leading-relaxed font-medium">{desc}</p>
  </motion.div>
);

export default LandingPage;