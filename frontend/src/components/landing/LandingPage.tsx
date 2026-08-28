"use client";

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Database, Workflow, Terminal, Cpu, ArrowRight, Brain, Zap, Layers, Lock, ChevronRight, Code2
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const horizontalSectionRef = useRef<HTMLDivElement>(null);
  const horizontalWrapperRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Hero Reveal
      const tl = gsap.timeline();
      tl.fromTo(".hero-title-line",
        { y: 100, opacity: 0, rotateX: -20 },
        { y: 0, opacity: 1, rotateX: 0, duration: 1.2, stagger: 0.15, ease: "power4.out" }
      )
      .fromTo(".hero-fade",
        { opacity: 0, filter: "blur(10px)" },
        { opacity: 1, filter: "blur(0px)", duration: 1.5, ease: "power2.out" },
        "-=0.5"
      );

      // 2. Parallax Background
      gsap.to(".bg-grid", {
        y: "20vh",
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        }
      });

      // 3. Horizontal Scroll for Architecture
      if (horizontalSectionRef.current && horizontalWrapperRef.current) {
        gsap.to(horizontalWrapperRef.current, {
          x: () => -(horizontalWrapperRef.current!.scrollWidth - window.innerWidth),
          ease: "none",
          scrollTrigger: {
            trigger: horizontalSectionRef.current,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
            end: () => "+=" + horizontalWrapperRef.current!.scrollWidth,
          }
        });
      }

      // 4. Reveal Animations for Bento Grid
      const bentoItems = gsap.utils.toArray('.bento-reveal') as HTMLElement[];
      bentoItems.forEach((item) => {
        gsap.fromTo(item,
          { opacity: 0, y: 50, scale: 0.95 },
          {
            opacity: 1, y: 0, scale: 1,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: item,
              start: "top 85%",
            }
          }
        );
      });

      // 5. Interactive 3D Tilt for Bento Cards
      const bentoCards = document.querySelectorAll('.bento-card-interactive');
      bentoCards.forEach((cardElement) => {
        const card = cardElement as HTMLElement;
        card.addEventListener('mousemove', (e: MouseEvent) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          
          const rotateX = ((y - centerY) / centerY) * -4; // Max rotation 4deg
          const rotateY = ((x - centerX) / centerX) * 4;
          
          gsap.to(card, {
            rotateX: rotateX,
            rotateY: rotateY,
            transformPerspective: 1000,
            ease: "power2.out",
            duration: 0.4
          });
        });
        
        card.addEventListener('mouseleave', () => {
          gsap.to(card, {
            rotateX: 0,
            rotateY: 0,
            ease: "elastic.out(1, 0.3)",
            duration: 1.2
          });
        });
      });

      // Footer
      gsap.fromTo(footerRef.current,
        { y: 100, opacity: 0 },
        {
          y: 0, opacity: 1,
          duration: 1.5,
          ease: "power3.out",
          scrollTrigger: {
            trigger: footerRef.current,
            start: "top 90%",
          }
        }
      );

    }, containerRef);
    return () => ctx.revert();
  }, []);

  // Spotlight effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const cards = document.querySelectorAll('.spotlight');
    cards.forEach((card) => {
      const rect = (card as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      (card as HTMLElement).style.setProperty('--mouse-x', `${x}px`);
      (card as HTMLElement).style.setProperty('--mouse-y', `${y}px`);
    });
  };

  return (
    <div 
      ref={containerRef} 
      onMouseMove={handleMouseMove}
      className="relative w-full bg-[#030303] overflow-x-hidden font-sans text-white selection:bg-white/20 selection:text-black"
    >
      <style dangerouslySetInnerHTML={{__html: `
        .spotlight::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          padding: 1px;
          background: radial-gradient(800px circle at var(--mouse-x, 0) var(--mouse-y, 0), rgba(255,255,255,0.4), transparent 40%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.5s ease;
        }
        .spotlight:hover::before { opacity: 1; }
        
        .bento-card-interactive {
          transform-style: preserve-3d;
          will-change: transform;
        }

        @keyframes marqueeLeft {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-25%); }
        }
        @keyframes marqueeRight {
          0% { transform: translateX(-25%); }
          100% { transform: translateX(0%); }
        }
        .animate-marquee-left {
          animation: marqueeLeft 40s linear infinite;
        }
        .animate-marquee-right {
          animation: marqueeRight 40s linear infinite;
        }
      `}} />

      {/* Global Backgrounds */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="bg-grid absolute inset-0 opacity-[0.05]" 
          style={{
            backgroundImage: 'linear-gradient(rgba(255, 255, 255, 1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            backgroundPosition: 'center center'
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_0%,#030303_80%)]" />
      </div>

      {/* HERO SECTION */}
      <section className="relative z-10 w-full min-h-screen flex flex-col pt-8 px-6 sm:px-12">
        {/* Nav */}
        <nav className="flex justify-between items-center w-full max-w-[1400px] mx-auto hero-fade">
          <Image src="/logo/nucleus-white-bgr.png" alt="Nucleus Logo" width={140} height={40} className="h-6 w-auto opacity-80" />
          <Link href="/app" className="px-6 py-2 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 transition-colors text-xs tracking-widest uppercase font-medium backdrop-blur-md">
            Launch App
          </Link>
        </nav>

        {/* Hero Content */}
        <div className="flex-1 flex flex-col justify-center max-w-[1400px] mx-auto w-full pb-20 pt-10">
          <div className="overflow-hidden mb-4">
            <h1 className="hero-title-line text-5xl sm:text-7xl lg:text-8xl xl:text-[8rem] font-bold tracking-tight leading-none">
              COMPRESS
            </h1>
          </div>
          <div className="overflow-hidden mb-4">
            <h1 className="hero-title-line text-5xl sm:text-7xl lg:text-8xl xl:text-[8rem] font-bold tracking-tight leading-none text-white/40">
              CONTEXT.
            </h1>
          </div>
          <div className="overflow-hidden mb-16">
            <h1 className="hero-title-line text-5xl sm:text-7xl lg:text-8xl xl:text-[8rem] font-bold tracking-tight leading-none">
              PRESERVE INTELLIGENCE.
            </h1>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-12 items-start sm:items-center hero-fade max-w-3xl">
            <p className="text-white/60 text-lg sm:text-xl font-light leading-relaxed">
              Nucleus is the definitive engine for reducing massive codebases and logs into hyper-dense tokens, bypassing LLM limits effortlessly.
            </p>
            <div className="w-16 h-[1px] bg-white/20 hidden sm:block shrink-0" />
            <div className="flex flex-col gap-2 shrink-0">
              <span className="text-4xl sm:text-5xl font-medium tracking-tight">99.8%</span>
              <span className="text-[10px] sm:text-xs tracking-widest uppercase text-white/50 font-mono">Semantic Retention</span>
            </div>
          </div>
        </div>
      </section>

      {/* INFINITE MARQUEE SECTION */}
      <section className="relative z-10 w-full pt-24 sm:pt-32 pb-8 sm:pb-12 bg-[#030303] overflow-hidden flex flex-col items-center border-t border-white/5">
        <p className="text-[10px] sm:text-xs tracking-[0.3em] font-mono uppercase text-white/40 mb-16">
          Works with every major LLM provider
        </p>
        
        {/* Marquee 1 */}
        <div className="relative w-full overflow-hidden flex whitespace-nowrap mb-8" 
             style={{ maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)' }}>
          <div className="flex w-max animate-marquee-left items-center">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-16 sm:gap-24 px-8 sm:px-12 items-center">
                {['DeepSeek', 'xAI', 'Mistral', 'Anthropic', 'OpenAI', 'Google'].map((provider, j) => (
                  <span key={j} className="text-3xl sm:text-5xl font-bold tracking-tight text-white/20 hover:text-white transition-colors duration-500 cursor-default drop-shadow-sm">
                    {provider}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Marquee 2 */}
        <div className="relative w-full overflow-hidden flex whitespace-nowrap mb-16" 
             style={{ maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)' }}>
          <div className="flex w-max animate-marquee-right items-center">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-16 sm:gap-24 px-8 sm:px-12 items-center">
                {['Groq', 'Together AI', 'Meta', 'Cohere', 'AWS Bedrock', 'Azure'].map((provider, j) => (
                  <span key={j} className="text-3xl sm:text-5xl font-bold tracking-tight text-white/20 hover:text-white transition-colors duration-500 cursor-default drop-shadow-sm">
                    {provider}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs sm:text-sm font-mono text-white/40 tracking-wider mt-4">
          <span className="font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">12M+</span> tokens compressed and counting
        </p>
      </section>

      {/* HORIZONTAL SCROLL ARCHITECTURE SECTION */}
      <section ref={horizontalSectionRef} className="relative z-10 w-full h-screen bg-[#050505] overflow-hidden flex flex-col justify-center border-y border-white/5">
        
        <div className="absolute top-6 sm:top-8 left-6 sm:left-12 lg:left-24 z-20 pointer-events-none">
          <h2 className="text-4xl sm:text-6xl font-bold tracking-tight text-white drop-shadow-lg">
            The Engine
          </h2>
          <p className="text-white/50 font-mono text-xs sm:text-sm tracking-[0.2em] uppercase mt-4">
            Four phases of absolute compression
          </p>
        </div>

        <div ref={horizontalWrapperRef} className="flex w-max items-center px-6 sm:px-12 lg:px-24 mt-32 sm:mt-40">
          
          {/* Panel 1 */}
          <div className="horizontal-panel spotlight w-[85vw] md:w-[60vw] lg:w-[45vw] shrink-0 h-[400px] sm:h-[450px] rounded-[2.5rem] bg-black border border-white/10 mr-6 md:mr-10 p-8 md:p-10 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4 group-hover:bg-white/[0.04] transition-colors duration-1000" />
            
            <div className="flex justify-between items-start relative z-10">
              <div className="w-16 h-16 rounded-[1.2rem] bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md">
                <Database className="w-8 h-8 text-white/80" />
              </div>
              <span className="text-white/10 font-mono text-6xl md:text-7xl font-bold tracking-tight">01</span>
            </div>
            
            <div className="max-w-2xl relative z-10">
              <h3 className="text-2xl md:text-4xl font-bold mb-4 tracking-tight">Intelligent Ingestion</h3>
              <p className="text-white/60 text-base md:text-lg leading-relaxed font-light mb-6">
                Raw logs, nested JSON payloads, or massive multi-file codebases are fed securely into the processing node. The system instantly detects the data structure and prepares it for optimal parsing.
              </p>
              <div className="flex flex-wrap gap-3">
                <span className="px-4 py-2 rounded-full border border-white/10 text-[10px] text-white/70 font-mono uppercase bg-white/5 backdrop-blur-md tracking-wider">Code</span>
                <span className="px-4 py-2 rounded-full border border-white/10 text-[10px] text-white/70 font-mono uppercase bg-white/5 backdrop-blur-md tracking-wider">Logs</span>
                <span className="px-4 py-2 rounded-full border border-white/10 text-[10px] text-white/70 font-mono uppercase bg-white/5 backdrop-blur-md tracking-wider">JSON</span>
              </div>
            </div>
          </div>

          {/* Panel 2 */}
          <div className="horizontal-panel spotlight w-[85vw] md:w-[60vw] lg:w-[45vw] shrink-0 h-[400px] sm:h-[450px] rounded-[2.5rem] bg-black border border-white/10 mr-6 md:mr-10 p-8 md:p-10 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4 group-hover:bg-white/[0.04] transition-colors duration-1000" />
            
            <div className="flex justify-between items-start relative z-10">
              <div className="w-16 h-16 rounded-[1.2rem] bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md">
                <Workflow className="w-8 h-8 text-white/80" />
              </div>
              <span className="text-white/10 font-mono text-6xl md:text-7xl font-bold tracking-tight">02</span>
            </div>
            
            <div className="max-w-2xl relative z-10">
              <h3 className="text-2xl md:text-4xl font-bold mb-4 tracking-tight">Deep Token Analysis</h3>
              <p className="text-white/60 text-base md:text-lg leading-relaxed font-light mb-6">
                The engine scans the raw payload in milliseconds, identifying deep structural redundancies, syntactic bloat, and non-essential whitespace characters that eat up LLM tokens.
              </p>
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-white w-[35%] rounded-full shadow-[0_0_20px_rgba(255,255,255,0.8)]" />
              </div>
            </div>
          </div>

          {/* Panel 3 */}
          <div className="horizontal-panel spotlight w-[85vw] md:w-[60vw] lg:w-[45vw] shrink-0 h-[400px] sm:h-[450px] rounded-[2.5rem] bg-black border border-white/10 mr-6 md:mr-10 p-8 md:p-10 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4 group-hover:bg-white/[0.04] transition-colors duration-1000" />
            
            <div className="flex justify-between items-start relative z-10">
              <div className="w-16 h-16 rounded-[1.2rem] bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md">
                <Cpu className="w-8 h-8 text-white/80" />
              </div>
              <span className="text-white/10 font-mono text-6xl md:text-7xl font-bold tracking-tight">03</span>
            </div>
            
            <div className="max-w-2xl relative z-10">
              <h3 className="text-2xl md:text-4xl font-bold mb-4 tracking-tight">Active Compression</h3>
              <p className="text-white/60 text-base md:text-lg leading-relaxed font-light mb-6">
                Structural minification algorithms and semantic mappings are applied in parallel. This strips out bloat while perfectly retaining 99.8% of the core contextual meaning required for accurate AI responses.
              </p>
              <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                <span className="text-white/50 font-mono text-xs sm:text-sm tracking-wide">100k Tokens</span>
                <ArrowRight className="w-4 h-4 text-white/50" />
                <span className="text-white font-mono text-xs sm:text-sm font-bold tracking-wide drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">24k Tokens</span>
              </div>
            </div>
          </div>

          {/* Panel 4 */}
          <div className="horizontal-panel spotlight w-[85vw] md:w-[60vw] lg:w-[45vw] shrink-0 h-[400px] sm:h-[450px] rounded-[2.5rem] bg-black border border-white/10 p-8 md:p-10 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4 group-hover:bg-white/[0.04] transition-colors duration-1000" />
            
            <div className="flex justify-between items-start relative z-10">
              <div className="w-16 h-16 rounded-[1.2rem] bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md">
                <Terminal className="w-8 h-8 text-white/80" />
              </div>
              <span className="text-white/10 font-mono text-6xl md:text-7xl font-bold tracking-tight">04</span>
            </div>
            
            <div className="max-w-2xl relative z-10">
              <h3 className="text-2xl md:text-4xl font-bold mb-4 tracking-tight">LLM Handoff</h3>
              <p className="text-white/60 text-base md:text-lg leading-relaxed font-light mb-6">
                A hyper-dense, highly optimized payload is generated and handed off directly to your language model, bypassing token limits effortlessly and significantly reducing inference costs.
              </p>
              <button className="flex items-center gap-3 text-xs font-mono tracking-widest uppercase hover:text-white transition-colors bg-white/5 px-5 py-2.5 rounded-full border border-white/10 text-white/80">
                View API Docs <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* BEYOND LIMITS: INTERACTIVE BENTO GRID (WOW FACTOR) */}
      <section className="relative z-10 w-full pt-40 pb-20 px-6 sm:px-12 max-w-[1400px] mx-auto perspective-[2000px]">
        <div className="text-center mb-32 bento-reveal">
          <h2 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-8 drop-shadow-xl">
            Beyond Limits.
          </h2>
          <p className="text-white/60 text-lg sm:text-xl max-w-2xl mx-auto font-light leading-relaxed">
            Designed for developers who push the boundaries of what LLMs can process in a single shot.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 auto-rows-[450px]">
          
          {/* Card 1: Large Span - Semantic Sync */}
          <div className="bento-card-interactive spotlight bento-reveal md:col-span-8 rounded-[3rem] bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 overflow-hidden relative group p-12 flex flex-col justify-between backdrop-blur-3xl shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,255,255,0.08)_0%,transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
            
            <div className="absolute top-10 right-10 w-64 h-64 opacity-20 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-white/20 blur-[60px] rounded-full group-hover:scale-150 transition-transform duration-1000" />
               <Brain className="w-full h-full text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" strokeWidth={0.5} />
            </div>

            <div className="relative z-10 max-w-xl mt-auto translate-z-10">
              <div className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(255,255,255,0.4)] group-hover:scale-110 transition-transform duration-500">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight text-white drop-shadow-md">O(N) Complexity Scaling</h3>
              <p className="text-sm md:text-lg text-white/60 font-medium max-w-sm leading-relaxed">
                Converts conversation scaling complexity from quadratic down to linear O(N) by natively caching and reusing previously compressed context blocks.
              </p>
            </div>
          </div>

          {/* Card 2: Small Span - Instant Inference */}
          <div className="bento-card-interactive spotlight bento-reveal md:col-span-4 rounded-[3rem] bg-gradient-to-tr from-white/[0.05] to-transparent border border-white/10 overflow-hidden relative group p-12 flex flex-col justify-end backdrop-blur-3xl shadow-2xl">
             <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
             
             <div className="absolute top-12 left-12 right-12 translate-z-10">
               <div className="flex justify-between text-xs font-mono text-white/50 mb-3 tracking-widest uppercase"><span>Latency</span><span>-85%</span></div>
               <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                 <div className="h-full bg-white rounded-full w-[15%] group-hover:w-[95%] transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(255,255,255,1)]" />
               </div>
             </div>

             <div className="absolute -bottom-10 -right-10 text-[10rem] md:text-[12rem] font-bold text-white/[0.03] tracking-tighter group-hover:text-white/[0.08] transition-colors duration-1000 pointer-events-none">
               2.4x
             </div>
             
             <div className="relative z-10 translate-z-10">
               <h3 className="text-2xl md:text-3xl font-bold mb-4 tracking-tight text-white drop-shadow-md">Concurrency Safe</h3>
               <p className="text-sm text-white/60 font-medium leading-relaxed">
                 Mutex locks guarantee race condition protection under extreme concurrent API loads.
               </p>
             </div>
          </div>

          {/* Card 3: Small Span - Universal Parser */}
          <div className="bento-card-interactive spotlight bento-reveal md:col-span-4 rounded-[3rem] bg-gradient-to-bl from-white/[0.05] to-transparent border border-white/10 overflow-hidden relative group p-12 flex flex-col justify-end backdrop-blur-3xl shadow-2xl">
             <div className="absolute top-12 left-12 right-12 flex flex-col gap-3 translate-z-10">
                <div className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-xs font-mono w-max transform group-hover:translate-x-4 transition-transform duration-500 text-white shadow-[0_5px_15px_rgba(255,255,255,0.1)]">compression_cache</div>
                <div className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono w-max transform group-hover:translate-x-8 transition-transform duration-700 delay-100 text-white/80">metrics_history</div>
                <div className="px-5 py-2.5 rounded-xl bg-black/50 border border-white/5 text-xs font-mono w-max transform group-hover:translate-x-2 transition-transform duration-500 delay-200 text-white/40">conversation_sessions</div>
             </div>

             <div className="relative z-10 translate-z-10 mt-auto">
               <h3 className="text-2xl md:text-3xl font-bold mb-4 tracking-tight text-white drop-shadow-md">Appwrite Integration</h3>
               <p className="text-white/70 text-base font-light leading-relaxed">
                 Cloud-hosted tables with strict size-capped automatic eviction hooks for infinite scale.
               </p>
             </div>
          </div>

          {/* Card 4: Large Span - Developer API */}
          <div className="bento-card-interactive spotlight bento-reveal md:col-span-8 rounded-[3rem] bg-gradient-to-tl from-white/[0.05] to-transparent border border-white/10 overflow-hidden relative group p-12 flex flex-col md:flex-row gap-12 items-center backdrop-blur-3xl shadow-2xl">
            <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[radial-gradient(ellipse_at_right,rgba(255,255,255,0.06)_0%,transparent_70%)] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            
            <div className="flex-1 relative z-10 translate-z-10">
              <div className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(255,255,255,0.4)] group-hover:scale-110 transition-transform duration-500">
                <Code2 className="w-8 h-8" />
              </div>
              <h3 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight text-white drop-shadow-md">Enterprise Security</h3>
              <p className="text-white/70 text-lg font-light leading-relaxed max-w-md">
                Strict X-API-Key validation and structured correlation Request ID logging mapped across all compression traces.
              </p>
            </div>

            <div className="flex-1 w-full max-w-sm rounded-[2rem] bg-black/80 border border-white/20 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative group-hover:-translate-y-4 group-hover:rotate-2 transition-transform duration-700 ease-out translate-z-10 backdrop-blur-lg">
               <div className="h-12 bg-white/5 border-b border-white/10 flex items-center px-6 gap-2.5">
                 <div className="w-3.5 h-3.5 rounded-full bg-white/20" />
                 <div className="w-3.5 h-3.5 rounded-full bg-white/20" />
                 <div className="w-3.5 h-3.5 rounded-full bg-white/20" />
               </div>
               <div className="p-8 font-mono text-[13px] leading-[2.2] tracking-wide">
                 <div className="text-white/40">1 | <span className="text-[#a78bfa]">import</span> {'{'} Nucleus {'}'} <span className="text-[#a78bfa]">from</span> <span className="text-[#a3e635]">&apos;nucleus-node&apos;</span>;</div>
                 <div className="text-white/40">2 | </div>
                 <div className="text-white/40">3 | <span className="text-[#60a5fa]">const</span> client = <span className="text-[#a78bfa]">new</span> Nucleus({'{'}</div>
                 <div className="text-white/40">4 |   apiKey: process.env.<span className="text-[#60a5fa]">NUCLEUS_API_KEY</span></div>
                 <div className="text-white/40">5 | {'}'});</div>
               </div>
            </div>
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer ref={footerRef} className="relative z-10 w-full py-32 flex flex-col items-center justify-center border-t border-white/5 bg-black overflow-hidden">
        
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[100vw] h-[60vh] bg-[radial-gradient(ellipse_at_bottom,rgba(255,255,255,0.1)_0%,transparent_70%)] pointer-events-none" />

        <div className="relative z-10 text-center max-w-5xl mx-auto px-6">
          <Image 
            src="/logo/nucleus-white-bgr.png" 
            alt="Nucleus Logo" 
            width={100} 
            height={100} 
            className="w-24 h-24 object-contain mx-auto mb-16 opacity-50"
          />
          
          <h2 className="text-5xl sm:text-7xl md:text-[8rem] font-bold tracking-tight text-white mb-12 leading-none">
            INITIALIZE.
          </h2>
          
          <Link 
            href="/app" 
            className="group relative inline-flex items-center gap-6 text-base tracking-[0.2em] font-bold text-black uppercase font-mono px-16 py-8 rounded-full bg-white hover:bg-white/90 transition-colors overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.2)]"
          >
            <span className="relative z-10">Start Compressing</span>
            <ArrowRight className="relative z-10 w-6 h-6 group-hover:translate-x-2 transition-transform duration-500 ease-out" />
          </Link>
        </div>

        <div className="absolute bottom-10 w-full flex flex-col sm:flex-row gap-6 justify-between items-center px-10 sm:px-20">
          <p className="text-xs text-white/30 uppercase tracking-[0.2em] font-mono">
            © 2026 Nucleus Systems
          </p>
          <div className="flex gap-10">
            <Link href="#" className="text-xs text-white/30 hover:text-white uppercase tracking-[0.2em] font-mono transition-colors">Twitter</Link>
            <Link href="#" className="text-xs text-white/30 hover:text-white uppercase tracking-[0.2em] font-mono transition-colors">GitHub</Link>
            <Link href="#" className="text-xs text-white/30 hover:text-white uppercase tracking-[0.2em] font-mono transition-colors">Docs</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
