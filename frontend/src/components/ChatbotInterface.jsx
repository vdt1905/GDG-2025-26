import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaMicrophone, FaSearch, FaPaperPlane, FaSearchPlus, FaBolt, FaVolumeUp, FaTrash, FaExpand, FaCompress } from 'react-icons/fa';
import { IoClose } from 'react-icons/io5';
import { RiStethoscopeFill } from 'react-icons/ri';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
// Import doctor illustration from assets
import DoctorIllustration from '../assets/bot2.png';

const ChatbotInterface = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { text: "Hello! I'm Dr. Shushrut. How can I assist with your health today?", sender: 'bot' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isBotTyping, setIsBotTyping] = useState(false);
    const [avatarExpression, setAvatarExpression] = useState('neutral');
    const [chatOpen, setChatOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [deepSearch, setDeepSearch] = useState(false);
    const [inputFocused, setInputFocused] = useState(false);
    const messagesEndRef = useRef(null);
    const recognitionRef = useRef(null);

    // Initialize speech recognition
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setInputValue(transcript);
                handleSendMessage(transcript);
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error', event.error);
                setIsListening(false);
                setAvatarExpression('concerned');
                setTimeout(() => setAvatarExpression('neutral'), 2000);

                // Show error message to user
                setMessages(prev => [...prev, {
                    text: "Sorry, I couldn't hear you properly. Could you try again or type your message?",
                    sender: 'bot'
                }]);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
                if (avatarExpression === 'listening') {
                    setAvatarExpression('examining');
                }
            };
        } else {
            console.warn('Speech recognition not supported in this browser');
            // Optionally add a message to inform the user
            setMessages(prev => [...prev, {
                text: "Note: Voice commands are not supported in your browser. Please type your questions.",
                sender: 'bot'
            }]);
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const toggleChat = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            setAvatarExpression('happy');
            setTimeout(() => setAvatarExpression('neutral'), 2000);
        } else {
            setChatOpen(false);
        }
    };

    const clearChat = () => {
        setMessages([{ text: "Conversation cleared. How can I help you now?", sender: 'bot' }]);
        setAvatarExpression('happy');
        setTimeout(() => setAvatarExpression('neutral'), 2000);
    };

    const handleInputChange = (e) => {
        setInputValue(e.target.value);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            handleSendMessage(inputValue);
        }
    };

    const startListening = () => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.start();
                setIsListening(true);
                setAvatarExpression('listening');
            } catch (error) {
                console.error('Speech recognition start error:', error);
                setIsListening(false);
                setMessages(prev => [...prev, {
                    text: "Couldn't start voice input. Please check your microphone permissions.",
                    sender: 'bot'
                }]);
            }
        }
    };

    const stopListening = () => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    };

    const handleSendMessage = (message) => {
        if (!message.trim()) return;

        // Add user message
        const newUserMessage = { text: message, sender: 'user' };
        setMessages(prev => [...prev, newUserMessage]);
        setInputValue('');
        setIsBotTyping(true);
        setAvatarExpression('thinking');
        setChatOpen(true);

        // Simulate typing delay
        setTimeout(async () => {
            // const botResponse = botResponses[Math.floor(Math.random() * botResponses.length)];
            console.log('MESSAGE SENDED:', {
                "query": message,
                "deep_search": deepSearch
            })
            try {
                const newBotMessage = await axios.post('http://localhost:6700/ans', {
                    "query": message,
                    "deep_search": deepSearch
                })
                console.log(newBotMessage);
                const botResponse = {
                    text: newBotMessage.data.response || "I didn't get a response from the server.",
                    sender: 'bot'
                }
                setMessages(prev => [...prev, botResponse]);
            } catch (error) {
                console.error("Error connecting to chatbot server:", error);
                setMessages(prev => [...prev, {
                    text: "I'm having trouble connecting to my brain server (localhost:6700). Please ensure it's running.",
                    sender: 'bot'
                }]);
            }

            setIsBotTyping(false);
            setAvatarExpression('speaking');

            setTimeout(() => setAvatarExpression('neutral'), 3000);
        }, 1500 + Math.random() * 2000);
    };

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <>
            {/* Chat Window - Centered with bot on left */}
            <AnimatePresence>
                {isOpen && chatOpen && (
                    <motion.div
                        className="fixed inset-0 flex items-center justify-center p-4 z-[9999]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {/* Backdrop */}
                        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={toggleChat}></div>

                        <motion.div
                            className={`fixed ${isExpanded ? 'inset-0 m-0' : 'bottom-4 right-4'} w-full ${isExpanded ? '' : 'max-w-md'} z-[10000]`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className={`flex-1 bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col ${isExpanded ? 'h-[95vh]' : 'max-h-[70vh]'} mx-4`}>
                                {/* Header */}
                                <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 p-4 flex justify-between items-center">
                                    <div className="flex items-center space-x-3">
                                        <div className="relative w-10 h-10">
                                            <RiStethoscopeFill className="w-full h-full text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-white">Dr. Shushrut</h3>
                                            <p className="text-xs text-emerald-100">
                                                {isBotTyping ? 'Thinking...' :
                                                    isListening ? 'Listening...' : 'Online'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={toggleExpand}
                                            className="p-1 rounded-full hover:bg-emerald-700 transition-colors text-white"
                                            title={isExpanded ? "Minimize" : "Maximize"}
                                        >
                                            {isExpanded ? <FaCompress /> : <FaExpand />}
                                        </button>
                                        <button
                                            onClick={clearChat}
                                            className="p-1 rounded-full hover:bg-emerald-700 transition-colors text-white"
                                            title="Clear conversation"
                                        >
                                            <FaTrash className="text-sm" />
                                        </button>
                                        <button
                                            onClick={toggleChat}
                                            className="p-1 rounded-full hover:bg-emerald-700 transition-colors"
                                        >
                                            <IoClose className="text-white text-xl" />
                                        </button>
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 p-6 overflow-y-auto bg-gradient-to-b from-emerald-50 to-white">
                                    {messages.map((message, index) => (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className={`mb-4 flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} `}
                                        >
                                            <div
                                                className={`max-w-lg px-4 py-3 rounded-2xl 
                        ${message.sender === 'user'
                                                        ? 'bg-gradient-to-r from-emerald-300 to-emerald-200 font-semibold text-white rounded-br-none'
                                                        : 'bg-white text-gray-800 shadow-sm rounded-bl-none'
                                                    }`}

                                            >
                                                <div className="text-sm">
                                                    <ReactMarkdown
                                                        components={{
                                                            // Make links blue and open in new tab
                                                            a: ({ node, ...props }) => (
                                                                <a
                                                                    className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    {...props}
                                                                />
                                                            ),
                                                            // Style headings
                                                            h3: ({ node, ...props }) => (
                                                                <h3 className="text-2xl font-semibold text-gray-800 mt-8 mb-4 border-b pb-2" {...props} />
                                                            ),
                                                            h4: ({ node, ...props }) => (
                                                                <h4 className="text-xl font-medium text-gray-800 mt-6 mb-3" {...props} />
                                                            ),
                                                            // Style lists
                                                            ul: ({ node, ...props }) => (
                                                                <ul className="list-disc pl-5 my-4 space-y-2" {...props} />
                                                            ),
                                                            li: ({ node, ...props }) => (
                                                                <li className="pl-2" {...props} />
                                                            ),
                                                            // Style bold text
                                                            strong: ({ node, ...props }) => (
                                                                <strong className="font-semibold text-gray-900" {...props} />
                                                            ),
                                                            // Style paragraphs
                                                            p: ({ node, ...props }) => (
                                                                <p className="my-4 leading-relaxed text-gray-700" {...props} />
                                                            )
                                                        }}

                                                    >

                                                        {message.text}</ReactMarkdown></div>
                                                {message.sender === 'bot' && (
                                                    <button
                                                        onClick={() => {
                                                            if ('speechSynthesis' in window) {
                                                                const utterance = new SpeechSynthesisUtterance(message.text);
                                                                window.speechSynthesis.speak(utterance);
                                                            }
                                                        }}
                                                        className="mt-1 flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 hover:bg-emerald-200 ml-auto"
                                                        title="Read aloud"
                                                    >
                                                        <FaVolumeUp className="text-emerald-600 text-xs" />
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}

                                    {isBotTyping && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="flex items-center p-3 bg-white rounded-2xl shadow-sm w-56"
                                        >
                                            <div className="relative w-8 h-8 mr-2">
                                                <div className="absolute top-0 left-0 w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                                </div>
                                                <div className="absolute top-0 left-0 w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center animate-ping opacity-75"></div>
                                            </div>
                                            <div className="text-sm text-emerald-800">Researching medical data...</div>
                                        </motion.div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Enhanced Input Area */}
                                <div className="p-4 border-t border-gray-200 bg-white">
                                    <div className="relative flex items-center">
                                        {/* Gradient Border Animation */}
                                        <motion.div
                                            className={`absolute inset-0 rounded-full p-[2px] ${inputFocused ? 'opacity-100' : 'opacity-80'}`}
                                            animate={{
                                                background: [
                                                    'linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6, #ec4899, #10b981)',
                                                    'linear-gradient(90deg, #10b981, #ec4899, #8b5cf6, #3b82f6, #10b981)'
                                                ],
                                                backgroundSize: '300% 100%',
                                            }}
                                            transition={{
                                                duration: 4,
                                                repeat: Infinity,
                                                ease: 'linear'
                                            }}
                                            style={{ borderRadius: '9999px' }}
                                        />

                                        {/* Input Field */}
                                        <input
                                            type="text"
                                            value={inputValue}
                                            onChange={handleInputChange}
                                            onKeyPress={handleKeyPress}
                                            onFocus={() => setInputFocused(true)}
                                            onBlur={() => setInputFocused(false)}
                                            placeholder="Ask any question.."
                                            className={`flex-1 py-5 px-4 pr-12 focus:outline-none text-sm relative z-10 transition-all duration-300 text-slate-800 placeholder:text-slate-500 ${inputFocused
                                                ? 'bg-white/95 backdrop-blur-sm'
                                                : 'bg-gray-100/90 hover:bg-gray-100'
                                                }`}
                                            style={{
                                                borderRadius: '9999px',
                                                textShadow: inputFocused ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                                                boxShadow: inputFocused ? '0 0 0 2px rgba(255,255,255,0.8) inset' : 'none'
                                            }}
                                        />

                                        {/* Action Buttons */}
                                        <div className="absolute right-2 flex space-x-1 z-20">

                                            <div className="relative">
                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => setDeepSearch((prev) => !prev)}
                                                    className={`p-2 rounded-full relative z-10 transition-all flex items-center justify-center ${deepSearch
                                                        ? "bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-lg"
                                                        : "bg-gradient-to-br from-gray-200 to-gray-300 text-gray-700 hover:shadow-md"
                                                        }`}
                                                    style={{
                                                        borderRadius: "9999px",
                                                        width: "40px",
                                                        height: "40px",
                                                        boxShadow: deepSearch
                                                            ? "0 2px 15px rgba(59, 130, 246, 0.5)"
                                                            : "0 2px 8px rgba(156, 163, 175, 0.3)",
                                                    }}
                                                    aria-label={deepSearch ? "Disable deep search" : "Enable deep search"}
                                                    title={deepSearch ? "Deep search active" : "Deep search inactive"}
                                                >
                                                    {deepSearch ? (
                                                        <>
                                                            <motion.div
                                                                className="absolute -inset-1 rounded-full bg-teal-400/20"
                                                                animate={{
                                                                    scale: [1, 1.2, 1],
                                                                    opacity: [0.7, 0.9, 0.7],
                                                                }}
                                                                transition={{
                                                                    duration: 2,
                                                                    repeat: Infinity,
                                                                }}
                                                            />
                                                            <FaSearchPlus className="text-sm" />
                                                        </>
                                                    ) : (
                                                        <FaSearch className="text-sm" />
                                                    )}
                                                </motion.button>

                                                {deepSearch && (
                                                    <motion.div
                                                        className="absolute -top-2 -right-2 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white"
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        exit={{ scale: 0 }}
                                                    >
                                                        <FaBolt className="text-xs" />
                                                    </motion.div>
                                                )}
                                            </div>

                                            <div className="relative">

                                                {isListening && (
                                                    <motion.div
                                                        className="absolute -inset-2 flex justify-center items-center"
                                                        animate={{
                                                            scale: [1, 1.2, 1],
                                                            opacity: [0.8, 1, 0.8]
                                                        }}
                                                        transition={{
                                                            duration: 1.5,
                                                            repeat: Infinity
                                                        }}
                                                    >
                                                        <div className="absolute inset-0 rounded-full bg-red-400/30 animate-ping"></div>
                                                    </motion.div>
                                                )}
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={isListening ? stopListening : startListening}
                                                    className={`p-2 mt-1 rounded-full relative z-10 transition-all ${isListening
                                                        ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg'
                                                        : 'bg-gradient-to-br from-emerald-200 to-emerald-300 text-emerald-700 hover:shadow-md'
                                                        }`}
                                                    style={{
                                                        borderRadius: '9999px',
                                                        boxShadow: isListening
                                                            ? '0 2px 15px rgba(239, 68, 68, 0.5)'
                                                            : '0 2px 8px rgba(16, 185, 129, 0.3)'
                                                    }}
                                                >
                                                    <FaMicrophone className="text-sm" />
                                                </motion.button>
                                            </div>

                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => handleSendMessage(inputValue)}
                                                disabled={!inputValue.trim()}
                                                className={`p-2 rounded-full transition-all ${!inputValue.trim()
                                                    ? 'bg-gray-200 text-gray-400'
                                                    : 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg hover:shadow-emerald-500/40'
                                                    }`}
                                                style={{
                                                    borderRadius: '9999px',
                                                    boxShadow: inputValue.trim()
                                                        ? '0 2px 20px rgba(16, 185, 129, 0.5)'
                                                        : 'none'
                                                }}
                                            >
                                                <FaPaperPlane className="text-sm" />
                                            </motion.button>
                                        </div>
                                    </div>

                                    {/* Listening Indicator */}
                                    {isListening && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="mt-3 text-center"
                                        >
                                            <p className="text-xs text-emerald-600 mb-1">Listening carefully...</p>
                                            <div className="flex justify-center space-x-1.5">
                                                {[...Array(7)].map((_, i) => (
                                                    <motion.div
                                                        key={i}
                                                        animate={{
                                                            height: [5, 25, 5],
                                                            backgroundColor: ['#a7f3d0', '#10b981', '#a7f3d0'],
                                                            transition: {
                                                                repeat: Infinity,
                                                                duration: 1.2,
                                                                delay: i * 0.15
                                                            }
                                                        }}
                                                        className="w-1.5 bg-emerald-300 rounded-full"
                                                        style={{
                                                            height: `${5 + (i * 3)}px`
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Initial Bot Button - Bottom right */}
            {!chatOpen && (
                <motion.div
                    className="fixed bottom-8 right-8 z-[1000] cursor-pointer"
                    onClick={toggleChat}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <div className="relative">
                        <img
                            src={DoctorIllustration}
                            alt="Doctor Avatar"
                            className="w-32 h-32 object-contain drop-shadow-lg"
                        />
                        <motion.div
                            className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white"
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.8, 1, 0.8]
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity
                            }}
                        />
                    </div>

                    {/* Speech bubble */}
                    {!isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{
                                opacity: 1,
                                y: 0,
                                scale: [1, 1.03, 1],
                                transition: {
                                    y: { type: 'spring', stiffness: 100 },
                                    scale: { duration: 2, repeat: Infinity, repeatType: 'reverse' }
                                }
                            }}
                            className="absolute bottom-full right-0 mb-3 px-4 py-2 rounded-lg shadow-lg text-sm whitespace-nowrap"
                            style={{
                                background: 'linear-gradient(135deg, #fff, #f0fdf4)',
                                border: '1px solid #d1fae5'
                            }}
                        >
                            <div className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-emerald-400">
                                Need medical advice?
                            </div>
                            <div className="absolute -bottom-2 right-4 w-4 h-4 transform rotate-45"
                                style={{
                                    backgroundColor: '#f0fdf4',
                                    borderRight: '1px solid #d1fae5',
                                    borderBottom: '1px solid #d1fae5'
                                }} />
                        </motion.div>
                    )}
                </motion.div>
            )}

            {/* Input Panel - Aligned with initial bot position */}
            <AnimatePresence>
                {isOpen && !chatOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed z-[900] w-[30rem] top-[75%] left-[80%] transform -translate-x-1/2 -translate-y-1/2"
                    >
                        {/* Backdrop */}
                        <div className="fixed inset-0" onClick={toggleChat}></div>

                        <div className="relative bg-white rounded-xl shadow-xl p-6 border border-gray-100 z-10">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-emerald-400">
                                    Medical Consultation
                                </h3>
                                <button
                                    onClick={toggleChat}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <IoClose />
                                </button>
                            </div>
                            <div className="relative max-w-2xl mx-auto">
                                {/* Animated Gradient Border */}
                                <motion.div
                                    className="absolute inset-0 rounded-full p-[2px]"
                                    animate={{
                                        background: [
                                            'linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6, #ec4899, #10b981)',
                                            'linear-gradient(90deg, #10b981, #ec4899, #8b5cf6, #3b82f6, #10b981)'
                                        ],
                                        backgroundSize: '300% 100%',
                                    }}
                                    transition={{
                                        duration: 4,
                                        repeat: Infinity,
                                        ease: 'linear'
                                    }}
                                    style={{
                                        borderRadius: '9999px',
                                        filter: 'blur(1px)',
                                    }}
                                />

                                {/* Input Container */}
                                <div className="relative flex items-center">
                                    {/* Input Field */}
                                    <input
                                        type="text"
                                        value={inputValue}
                                        onChange={handleInputChange}
                                        onKeyPress={handleKeyPress}
                                        onFocus={() => setInputFocused(true)}
                                        onBlur={() => setInputFocused(false)}
                                        placeholder="Describe your symptoms..."
                                        className={`w-full p-4 pr-16 focus:outline-none text-base relative z-10 transition-all text-slate-800 placeholder:text-slate-500 ${inputFocused
                                            ? 'bg-white/95 backdrop-blur-sm'
                                            : 'bg-gray-100/90 hover:bg-gray-100'
                                            }`}
                                        style={{
                                            borderRadius: '9999px',
                                            border: 'none',
                                            boxShadow: inputFocused ? '0 0 0 2px rgba(255,255,255,0.8) inset' : 'none'
                                        }}
                                    />

                                    {/* Voice Waveform (visible when listening) */}
                                    {isListening && (
                                        <motion.div
                                            className="absolute right-14 flex items-center space-x-1"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                        >
                                            {[1, 2, 3, 4, 3, 2].map((height, i) => (
                                                <motion.div
                                                    key={i}
                                                    className="w-1 bg-emerald-500 rounded-full"
                                                    animate={{
                                                        height: [`${height * 4}px`, `${height * 8}px`, `${height * 4}px`],
                                                    }}
                                                    transition={{
                                                        duration: 0.8,
                                                        repeat: Infinity,
                                                        delay: i * 0.1,
                                                    }}
                                                    style={{
                                                        width: '3px',
                                                    }}
                                                />
                                            ))}
                                        </motion.div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="absolute right-2 flex space-x-2 z-20">
                                        <div className="relative">
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => setDeepSearch((prev) => !prev)}
                                                className={`p-2 rounded-full relative z-10 transition-all flex items-center justify-center ${deepSearch
                                                    ? "bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-lg"
                                                    : "bg-gradient-to-br from-gray-200 to-gray-300 text-gray-700 hover:shadow-md"
                                                    }`}
                                                style={{
                                                    borderRadius: "9999px",
                                                    width: "40px",
                                                    height: "40px",
                                                    boxShadow: deepSearch
                                                        ? "0 2px 15px rgba(59, 130, 246, 0.5)"
                                                        : "0 2px 8px rgba(156, 163, 175, 0.3)",
                                                }}
                                                aria-label={deepSearch ? "Disable deep search" : "Enable deep search"}
                                                title={deepSearch ? "Deep search active" : "Deep search inactive"}
                                            >
                                                {deepSearch ? (
                                                    <>
                                                        <motion.div
                                                            className="absolute -inset-1 rounded-full bg-teal-400/20"
                                                            animate={{
                                                                scale: [1, 1.2, 1],
                                                                opacity: [0.7, 0.9, 0.7],
                                                            }}
                                                            transition={{
                                                                duration: 2,
                                                                repeat: Infinity,
                                                            }}
                                                        />
                                                        <FaSearchPlus className="text-sm" />
                                                    </>
                                                ) : (
                                                    <FaSearch className="text-sm" />
                                                )}
                                            </motion.button>

                                            {deepSearch && (
                                                <motion.div
                                                    className="absolute -top-2 -right-2 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white"
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    exit={{ scale: 0 }}
                                                >
                                                    <FaBolt className="text-xs" />
                                                </motion.div>
                                            )}
                                        </div>

                                        <button
                                            onClick={isListening ? stopListening : startListening}
                                            className={`p-2 rounded-full transition-all ${isListening
                                                ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg'
                                                : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 hover:shadow-md'
                                                }`}
                                            style={{
                                                borderRadius: '9999px',
                                                width: '36px',
                                                height: '36px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <FaMicrophone className="text-sm" />
                                        </button>
                                        <button
                                            onClick={() => handleSendMessage(inputValue)}
                                            disabled={!inputValue.trim()}
                                            className={`p-2 rounded-full transition-all ${!inputValue.trim()
                                                ? 'bg-gray-200 text-gray-400'
                                                : 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg hover:shadow-emerald-500/40'
                                                }`}
                                            style={{
                                                borderRadius: '9999px',
                                                width: '36px',
                                                height: '36px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <FaPaperPlane className="text-sm" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            {isListening && (
                                <div className="mt-3 text-center">
                                    <p className="text-xs text-emerald-600 mb-1">Listening carefully...</p>
                                    <div className="flex justify-center space-x-1.5">
                                        {[...Array(7)].map((_, i) => (
                                            <motion.div
                                                key={i}
                                                animate={{
                                                    height: [5, 25, 5],
                                                    backgroundColor: ['#a7f3d0', '#10b981', '#a7f3d0'],
                                                    transition: {
                                                        repeat: Infinity,
                                                        duration: 1.2,
                                                        delay: i * 0.15
                                                    }
                                                }}
                                                className="w-1.5 bg-emerald-300 rounded-full"
                                                style={{
                                                    height: `${5 + (i * 3)}px`
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default ChatbotInterface;
