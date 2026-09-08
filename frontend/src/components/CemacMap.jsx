import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const COUNTRIES = [
  {
    id: 'cm',
    name: 'Cameroun',
    capital: 'Yaoundé',
    flag: '🇨🇲',
    teachers: '320+',
    students: '2 800+',
    color: '#22c55e',
    cx: 155, cy: 195,
    path: 'M 100 115 L 188 108 L 205 145 L 248 162 L 250 198 L 228 235 L 198 270 L 158 285 L 120 268 L 92 238 L 88 192 Z',
    isHub: true,
    share: 100,
  },
  {
    id: 'td',
    name: 'Tchad',
    capital: "N'Djamena",
    flag: '🇹🇩',
    teachers: '80+',
    students: '650+',
    color: '#60a5fa',
    cx: 268, cy: 102,
    path: 'M 192 58 L 235 22 L 328 28 L 358 78 L 342 142 L 290 165 L 248 162 L 205 145 L 188 108 L 192 58 Z',
    share: 25,
  },
  {
    id: 'cf',
    name: 'Rép. Centrafricaine',
    capital: 'Bangui',
    flag: '🇨🇫',
    teachers: '45+',
    students: '380+',
    color: '#f59e0b',
    cx: 388, cy: 208,
    path: 'M 290 165 L 342 142 L 362 80 L 460 100 L 482 155 L 464 212 L 434 245 L 372 256 L 330 240 L 308 210 Z',
    share: 14,
  },
  {
    id: 'ga',
    name: 'Gabon',
    capital: 'Libreville',
    flag: '🇬🇦',
    teachers: '95+',
    students: '820+',
    color: '#a78bfa',
    cx: 112, cy: 318,
    path: 'M 92 285 L 120 268 L 158 285 L 168 316 L 154 354 L 118 362 L 96 346 L 90 316 Z',
    share: 30,
  },
  {
    id: 'cg',
    name: 'Congo',
    capital: 'Brazzaville',
    flag: '🇨🇬',
    teachers: '110+',
    students: '940+',
    color: '#f97316',
    cx: 240, cy: 302,
    path: 'M 158 285 L 198 270 L 228 235 L 250 198 L 308 210 L 330 240 L 314 280 L 276 312 L 240 322 L 198 316 L 168 316 L 158 285 Z',
    share: 34,
  },
  {
    id: 'gq',
    name: 'Guinée Équatoriale',
    capital: 'Malabo',
    flag: '🇬🇶',
    teachers: '20+',
    students: '160+',
    color: '#ec4899',
    cx: 90, cy: 277,
    path: 'M 82 270 L 102 270 L 104 286 L 92 285 Z',
    isSmall: true,
    share: 6,
  },
];

const HUB = { x: 155, y: 195 };

export default function CemacMap() {
  const [hovered, setHovered] = useState(null);
  const active = hovered ? COUNTRIES.find(c => c.id === hovered) : null;

  return (
    <section className="py-20 md:py-32 px-4 sm:px-8 bg-slate-950 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-sky-600/6 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] bg-violet-600/6 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">

        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-block text-[10px] font-black uppercase tracking-[0.4em] text-sky-400 mb-4">
            Couverture géographique
          </span>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-[0.9] tracking-tighter">
            6 pays.{' '}
            <span className="text-sky-500">Une seule</span> plateforme.
          </h2>
          <p className="text-slate-400 mt-5 max-w-lg mx-auto font-medium leading-relaxed">
            EduUp connecte élèves et répétiteurs certifiés dans toute la zone CEMAC — du Cameroun au Tchad, du Gabon à la RCA.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-14">
          {[
            { val: '670+', lbl: 'Répétiteurs', icon: '👨‍🏫' },
            { val: '5 750+', lbl: 'Élèves', icon: '🎓' },
            { val: '15+', lbl: 'Villes', icon: '🏙️' },
          ].map((s, i) => (
            <div key={i} className="text-center bg-white/5 border border-white/8 rounded-2xl py-5 px-3 backdrop-blur-sm">
              <span className="text-2xl">{s.icon}</span>
              <p className="text-2xl font-black text-sky-400 mt-1">{s.val}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-0.5">{s.lbl}</p>
            </div>
          ))}
        </div>

        {/* Main content: list | map | detail */}
        <div className="grid lg:grid-cols-5 gap-6 lg:gap-10 items-center">

          {/* Country list */}
          <div className="lg:col-span-1 flex flex-row flex-wrap lg:flex-col gap-2 order-2 lg:order-1">
            {COUNTRIES.map(c => (
              <button
                key={c.id}
                onMouseEnter={() => setHovered(c.id)}
                onMouseLeave={() => setHovered(null)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all duration-200 w-full"
                style={{
                  borderColor: hovered === c.id ? c.color : 'rgba(255,255,255,0.08)',
                  background: hovered === c.id ? c.color + '1A' : 'rgba(255,255,255,0.03)',
                  color: hovered === c.id ? c.color : '#64748b',
                  boxShadow: hovered === c.id ? `0 0 12px ${c.color}30` : 'none',
                }}
              >
                <span className="text-base flex-shrink-0">{c.flag}</span>
                <span className="text-xs font-bold leading-tight">{c.name}</span>
              </button>
            ))}
          </div>

          {/* SVG Map */}
          <motion.div
            className="lg:col-span-3 relative order-1 lg:order-2"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <svg
              viewBox="0 15 580 395"
              className="w-full"
              style={{ filter: 'drop-shadow(0 0 50px rgba(14,165,233,0.1))' }}
            >
              {/* Subtle grid */}
              {[80, 130, 180, 230, 280, 330, 380].map(y => (
                <line key={`h${y}`} x1="60" y1={y} x2="520" y2={y} stroke="rgba(255,255,255,0.025)" strokeWidth="1" />
              ))}
              {[80, 130, 180, 230, 280, 330, 380, 430, 480].map(x => (
                <line key={`v${x}`} x1={x} y1="25" x2={x} y2="400" stroke="rgba(255,255,255,0.025)" strokeWidth="1" />
              ))}

              {/* Connection lines from Yaoundé hub */}
              {COUNTRIES.filter(c => c.id !== 'cm' && c.id !== 'gq').map(c => (
                <line
                  key={`line-${c.id}`}
                  x1={HUB.x} y1={HUB.y}
                  x2={c.cx} y2={c.cy}
                  stroke={hovered === c.id ? c.color : '#38bdf8'}
                  strokeWidth={hovered === c.id ? 1.8 : 0.7}
                  strokeDasharray="5 4"
                  opacity={hovered === c.id ? 0.75 : 0.15}
                  style={{ transition: 'all 0.3s ease' }}
                />
              ))}

              {/* Country shapes */}
              {COUNTRIES.map(c => (
                <g
                  key={c.id}
                  onMouseEnter={() => setHovered(c.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Glow when hovered */}
                  {hovered === c.id && (
                    <path
                      d={c.path}
                      fill={c.color}
                      fillOpacity={0.2}
                      stroke={c.color}
                      strokeWidth={10}
                      strokeOpacity={0.15}
                      style={{ filter: 'blur(8px)' }}
                    />
                  )}

                  {/* Country fill */}
                  <path
                    d={c.path}
                    fill={c.color}
                    fillOpacity={hovered === c.id ? 0.72 : 0.32}
                    stroke={c.color}
                    strokeWidth={hovered === c.id ? 2 : 1}
                    strokeOpacity={hovered === c.id ? 1 : 0.55}
                    style={{ transition: 'all 0.25s ease' }}
                  />

                  {/* Pulsing city dot */}
                  <circle cx={c.cx} cy={c.cy} r="4.5" fill={c.color} opacity={0.95} />
                  <circle cx={c.cx} cy={c.cy} r="4.5" fill={c.color} opacity={0.25}>
                    <animate attributeName="r" from="4.5" to="13" dur="2.2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.3" to="0" dur="2.2s" repeatCount="indefinite" />
                  </circle>

                  {/* Hub ring for Yaoundé */}
                  {c.isHub && (
                    <circle cx={c.cx} cy={c.cy} r="8" fill="none" stroke={c.color} strokeWidth="1.5" opacity={0.7} />
                  )}

                  {/* Country name label */}
                  {!c.isSmall && (
                    <text
                      x={c.cx} y={c.cy - 14}
                      textAnchor="middle"
                      fill="white"
                      fontSize={c.id === 'cf' ? '7.5' : '8.5'}
                      fontWeight="700"
                      opacity={hovered === c.id ? 1 : 0.55}
                      style={{ pointerEvents: 'none', fontFamily: 'system-ui', letterSpacing: '0.04em', transition: 'opacity 0.25s' }}
                    >
                      {c.id === 'cf' ? 'RCA' : c.name}
                    </text>
                  )}
                </g>
              ))}

              {/* Watermark */}
              <text x="290" y="408" textAnchor="middle" fill="rgba(255,255,255,0.1)" fontSize="7.5" fontFamily="system-ui" fontWeight="800" letterSpacing="7">
                ZONE CEMAC
              </text>
            </svg>
          </motion.div>

          {/* Detail panel */}
          <div className="lg:col-span-1 order-3 flex flex-col justify-center min-h-[300px]">
            <AnimatePresence mode="wait">
              {active ? (
                <motion.div
                  key={active.id}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.22 }}
                  className="rounded-2xl border p-5"
                  style={{
                    borderColor: active.color + '55',
                    background: `linear-gradient(135deg, ${active.color}12, ${active.color}06)`,
                    boxShadow: `0 0 30px ${active.color}18`,
                  }}
                >
                  <div className="text-4xl mb-3">{active.flag}</div>
                  <h3 className="font-black text-white text-lg leading-tight mb-1">{active.name}</h3>
                  <p className="text-slate-400 text-xs mb-5">🏙️ {active.capital}</p>

                  <div className="space-y-4">
                    <div>
                      <p className="font-black text-2xl" style={{ color: active.color }}>{active.teachers}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Répétiteurs certifiés</p>
                    </div>
                    <div>
                      <p className="font-black text-2xl" style={{ color: active.color }}>{active.students}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Élèves inscrits</p>
                    </div>
                  </div>

                  {/* Relative bar */}
                  <div className="mt-5">
                    <div className="h-1.5 rounded-full w-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${active.share}%` }}
                        transition={{ duration: 0.5 }}
                        style={{ background: active.color }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-600 font-bold mt-1.5">Part relative vs Cameroun</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-8"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🗺️</span>
                  </div>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed">
                    Survolez un pays<br />pour voir les détails
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </section>
  );
}
