import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Plus,
  Dna,
  ScanFace,
  ShieldCheck,
  ChevronRight,
  MoveRight,
  FileText,
  Activity,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import useAuthStore from '../store/authStore';

const LandingPage = () => {
  const { currentUser } = useAuthStore();

  const fadeIn = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
  };

  return (
    <div className="h-screen w-full bg-[#FAFAFA] text-slate-900 font-sans overflow-hidden flex flex-col relative selection:bg-teal-100">

      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-teal-100/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[30vw] h-[30vw] bg-emerald-100/40 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 contrast-150" />
      </div>

      {/* Editorial Navigation */}
      <nav className="w-full z-50 bg-white/60 backdrop-blur-md border-b border-slate-200/50 px-8 py-4 flex justify-between items-center shrink-0 h-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-teal-700 rounded-xl flex items-center justify-center shadow-lg shadow-teal-700/20">
            <Plus className="text-white" size={20} strokeWidth={3} />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">Shushrut<span className="text-teal-600">AI</span></span>
        </div>



        <div className="flex gap-4">
          <Link to="/future-aspect">
            <button className="relative overflow-hidden flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-6 py-2.5 bg-slate-900 border border-teal-500/30 text-white rounded-lg group hover:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.6)]">
              <div className="absolute inset-0 bg-gradient-to-r from-teal-500/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <Sparkles size={14} className="text-teal-400 group-hover:rotate-12 transition-transform" />
              <span className="relative z-10 bg-gradient-to-r from-teal-200 to-cyan-200 bg-clip-text text-transparent group-hover:text-white transition-colors">Future Aspect</span>
            </button>
          </Link>

          <Link to={currentUser ? "/dashboard" : "/login"}>
            <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-5 py-2.5 bg-white border border-slate-200 rounded-lg hover:border-teal-600 hover:text-teal-700 transition-all shadow-sm hover:shadow-md">
              {currentUser ? "Access Portal" : "Practitioner Login"} <MoveRight size={14} />
            </button>
          </Link>
        </div>
      </nav>

      {/* Main Clinical Canvas */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center max-w-[1600px] mx-auto px-8 lg:px-12 gap-12 lg:gap-24 w-full h-[calc(100vh-80px)]">

        {/* Hero Section: Editorial Style */}
        <div className="lg:w-1/2 flex flex-col justify-center space-y-8 z-10">
          <motion.div {...fadeIn}>

            <h1 className="text-5xl lg:text-7xl font-medium tracking-tight leading-[1] text-slate-900 mb-6">
              Precision <span className="text-teal-700 font-serif italic">Dermatology</span> <br />
              Powered by Neural Vision.
            </h1>
          </motion.div>

          <motion.p {...fadeIn} transition={{ delay: 0.1 }} className="text-base lg:text-lg text-slate-500 max-w-lg leading-relaxed font-medium">
            Agentic AI + DL as a tool powered end to end dermatology platform
          </motion.p>

          <motion.div {...fadeIn} transition={{ delay: 0.2 }} className="flex flex-wrap gap-4 items-center">
            <Link to={currentUser ? "/dashboard" : "/login"}>
              <button className="px-8 py-4 bg-teal-700 text-white text-xs font-bold uppercase tracking-[0.15em] rounded-xl hover:bg-teal-800 hover:shadow-xl hover:shadow-teal-700/20 hover:-translate-y-0.5 transition-all">
                Initialize Analysis
              </button>
            </Link>

          </motion.div>

          {/* Clinical Stats - Compact Row */}

        </div>

        {/* Right Section: The "Patient Case" Mockup - Redesigned */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className="lg:w-1/2 h-full max-h-[600px] flex items-center justify-center lg:justify-center relative"
        >
          {/* Tablet/Card Container */}
          <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden ring-4 ring-slate-50 z-20">

            {/* Header Bar */}
            <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-slate-50/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700">
                  <Activity size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Analysis #8821</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Just now • Auto-generated</p>
                </div>
              </div>
              <div className="px-2 py-1 bg-green-50 border border-green-100 rounded text-[10px] font-bold text-green-700 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 size={10} /> Verified
              </div>
            </div>

            {/* Main Image Area */}
            <div className="p-6">
              <div className="relative aspect-[4/3] bg-slate-900 rounded-xl overflow-hidden mb-6 group border border-slate-200 shadow-inner">
                {/* Grid Overlay */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
                <div className="absolute inset-0 border-[0.5px] border-white/10 opacity-30 grid grid-cols-4 grid-rows-4" />

                {/* Scanning Animation */}
                <motion.div
                  animate={{ top: ['-10%', '110%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-1 bg-teal-400/80 shadow-[0_0_20px_rgba(45,212,191,0.5)] z-20"
                />

                {/* Placeholder Icon (representing skin image) */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <ScanFace size={64} className="text-white/20" />
                </div>

                {/* HUD Elements */}
                <div className="absolute top-4 left-4 flex gap-1">
                  <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-[9px] font-mono text-white/60 tracking-widest">LIVE FEED</span>
                </div>
                <div className="absolute bottom-4 right-4 text-[9px] font-mono text-teal-400 tracking-widest">
                  ISO: 400 • F/1.8
                </div>
              </div>

              {/* Analysis Data Rows */}
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                  <span className="text-xs font-semibold text-slate-500">Predicted Pathology</span>
                  <span className="text-sm font-bold text-slate-900">Benign Nevus</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-slate-500">Confidence Score</span>
                    <span className="text-teal-700 font-bold">99.2%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "99.2%" }}
                      transition={{ duration: 1.5, delay: 0.5 }}
                      className="h-full bg-teal-600 rounded-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center hover:border-teal-200 transition-colors">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Urgency</div>
                    <div className="text-xs font-bold text-slate-800">Low Priority</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center hover:border-teal-200 transition-colors">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Rec. Action</div>
                    <div className="text-xs font-bold text-slate-800">Observation</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Elements for depth */}
          {/* <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -right-8 top-20 bg-white p-4 rounded-xl shadow-xl border border-slate-100 z-30 hidden lg:block"
          >
            <FileText className="text-teal-600 mb-2" size={20} />
            <div className="h-1 w-12 bg-slate-100 rounded mb-1" />
            <div className="h-1 w-8 bg-slate-100 rounded" />
          </motion.div> */}
        </motion.div>
      </main>


      {/* Footer */}
      <footer className="absolute bottom-2 w-full text-center py-2 z-50 pointer-events-none">
        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold opacity-60">
          © {new Date().getFullYear()} Team Dominators
        </p>
      </footer>
    </div >
  );
};

const Stat = ({ label, value }) => (
  <div className="flex flex-col">
    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">{label}</span>
    <span className="text-2xl md:text-3xl font-medium tracking-tight text-slate-900">{value}</span>
  </div>
);

export default LandingPage;