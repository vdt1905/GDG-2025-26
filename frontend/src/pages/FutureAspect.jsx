
import React from 'react';
import Prism from '../components/Prism';
import { Link } from 'react-router-dom';
import { ArrowLeft, Cpu, ShieldCheck, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import hardwareImg from '../assets/hardware-device.png';

export default function FutureAspect() {
    return (
        <div className="w-full h-screen bg-black relative overflow-hidden font-sans">
            {/* Back Button */}
            <Link
                to="/"
                className="absolute top-6 left-6 z-50 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm transition-all border border-white/10"
            >
                <ArrowLeft className="w-5 h-5" />
            </Link>

            {/* Prism Animation Container */}
            <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
                <Prism
                    animationType="rotate"
                    timeScale={0.5}
                    height={3.5}
                    baseWidth={5.5}
                    scale={3.6}
                    hueShift={0}
                    colorFrequency={1}
                    noise={0}
                    glow={1}
                />
            </div>

            {/* Title Overlay */}
            <div className="absolute top-8 right-12 z-10 text-right hidden lg:block">
                <h1 className="text-6xl font-black text-white tracking-tighter opacity-20 uppercase">Future<br />Aspect</h1>
            </div>

            {/* Content Section */}
            <div className="absolute inset-0 z-20 flex items-center justify-center p-6 lg:p-20 pointer-events-none">
                <div className="w-full max-w-7xl flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-24">

                    {/* Left: Text Content */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5, duration: 1 }}
                        className="lg:w-1/2 text-white pointer-events-auto"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="px-3 py-1 rounded-full bg-cyan-900/30 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-widest backdrop-blur-md">
                                Next Gen Hardware
                            </div>
                        </div>
                        <h2 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
                            Edge AI <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400">Dermatoscope</span>
                        </h2>
                        <p className="text-slate-400 text-lg lg:text-xl leading-relaxed max-w-lg mb-8">
                            Experience the power of Shushrut's diagnostic engine directly in the palm of your hand. Our proprietary hardware integrates high-definition optics with real-time on-device neural processing.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-5 rounded-2xl bg-zinc-900/90 border border-white/20 backdrop-blur-md hover:bg-zinc-800 transition-colors shadow-lg shadow-black/50">
                                <Cpu className="w-8 h-8 text-cyan-300 mb-3" />
                                <h3 className="font-bold text-white text-lg mb-1">Local Inference</h3>
                                <p className="text-sm text-gray-300 font-medium">Zero latency analysis. Powered by dedicated NPU for instant results.</p>
                            </div>
                            <div className="p-5 rounded-2xl bg-zinc-900/90 border border-white/20 backdrop-blur-md hover:bg-zinc-800 transition-colors shadow-lg shadow-black/50">
                                <Zap className="w-8 h-8 text-teal-300 mb-3" />
                                <h3 className="font-bold text-white text-lg mb-1">Instant Sync</h3>
                                <p className="text-sm text-gray-300 font-medium">Seamlessly pushes 4K dermoscopic scans to patient records.</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right: Device Image */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, rotate: 10 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ delay: 0.8, duration: 1.2, type: "spring" }}
                        className="lg:w-1/2 relative pointer-events-auto flex justify-center"
                    >
                        <div className="relative z-10 w-full max-w-sm lg:max-w-md">
                            <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 blur-3xl rounded-full" />
                            <img
                                src={hardwareImg}
                                alt="Edge AI Device"
                                className="relative w-full h-auto drop-shadow-2xl hover:scale-105 transition-transform duration-500"
                            />
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

