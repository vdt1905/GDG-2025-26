import React from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';

const LoadingScreen = () => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center">
                <div className="relative">
                    {/* Pulsing Background Circles */}
                    <motion.div
                        className="absolute inset-0 rounded-full bg-emerald-100"
                        animate={{
                            scale: [1, 2],
                            opacity: [0.5, 0]
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeOut"
                        }}
                    />
                    <motion.div
                        className="absolute inset-0 rounded-full bg-teal-100"
                        animate={{
                            scale: [1, 1.5],
                            opacity: [0.5, 0]
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            delay: 0.2,
                            ease: "easeOut"
                        }}
                    />

                    {/* Logo/Icon Container */}
                    <motion.div
                        className="relative z-10 w-24 h-24 bg-white rounded-full shadow-xl flex items-center justify-center border-4 border-white"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <motion.div
                            animate={{
                                scale: [1, 1.2, 1],
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        >
                            <Activity className="w-10 h-10 text-teal-600" />
                        </motion.div>
                    </motion.div>
                </div>

                <motion.div
                    className="mt-8 text-center"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Dr. Shushrut</h2>
                    <div className="flex items-center justify-center gap-1 mt-2">
                        <span className="text-sm font-medium text-slate-400 uppercase tracking-widest">Initializing System</span>
                        <motion.span
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.1 }}
                            className="text-teal-500 font-bold"
                        >.</motion.span>
                        <motion.span
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.2 }}
                            className="text-teal-500 font-bold"
                        >.</motion.span>
                        <motion.span
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.3 }}
                            className="text-teal-500 font-bold"
                        >.</motion.span>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default LoadingScreen;
