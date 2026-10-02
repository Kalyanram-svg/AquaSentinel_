import React, { useState, useEffect } from 'react';
import { X, Trophy, Timer, CheckCircle, XCircle, Award } from 'lucide-react';

interface SonarChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CHALLENGE_QUESTIONS = [
  {
    id: 1,
    title: 'Acoustic Target Alpha',
    description: 'Long continuous specular acoustic reflection with narrow detached acoustic shadow over seabed depression.',
    options: ['Subsea Pipeline', 'Wooden Shipwreck', 'Mine-Like Contact', 'Benthic Reef'],
    correct: 'Subsea Pipeline',
    hint: 'Geometry shows high aspect ratio with shadow cast matching suspended cylindrical pipe.'
  },
  {
    id: 2,
    title: 'Acoustic Target Bravo',
    description: 'Compact high-intensity highlight with sharp rectangular shadow, dimension 2.1m x 1.0m, isolated on smooth silt.',
    options: ['Natural Boulder', 'Mine-Like Contact (MILCO)', 'Fish School', 'Pipeline'],
    correct: 'Mine-Like Contact (MILCO)',
    hint: 'Acoustic shadow reveals cylindrical ordnance casing with tail-fin structure.'
  },
  {
    id: 3,
    title: 'Acoustic Target Charlie',
    description: 'Large complex acoustic return (>25m) with collapsed rib-like shadows and acoustic scouring along keel.',
    options: ['Subsea Cable', 'Historic Shipwreck', 'Ghost Net', 'Human Surrogate'],
    correct: 'Historic Shipwreck',
    hint: 'Hull outline and frames visible in acoustic shadow.'
  }
];

export const SonarChallengeModal: React.FC<SonarChallengeModalProps> = ({ isOpen, onClose }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentIdx(0);
      setSelectedAnswer(null);
      setScore(0);
      setTimeLeft(30);
      setIsFinished(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || isFinished) return;
    if (timeLeft <= 0) {
      setIsFinished(true);
      return;
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [isOpen, timeLeft, isFinished]);

  const handleSelect = (opt: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(opt);
    if (opt === CHALLENGE_QUESTIONS[currentIdx].correct) {
      setScore((s) => s + 100);
    }
    setTimeout(() => {
      if (currentIdx + 1 < CHALLENGE_QUESTIONS.length) {
        setCurrentIdx((i) => i + 1);
        setSelectedAnswer(null);
      } else {
        setIsFinished(true);
      }
    }, 1200);
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setScore(0);
    setTimeLeft(30);
    setIsFinished(false);
  };

  if (!isOpen) return null;

  const q = CHALLENGE_QUESTIONS[currentIdx];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl rounded-3xl bg-[#041527] border border-cyan-500/40 shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-cyan-900/50">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Interactive Sonar Analyst Challenge</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isFinished ? (
          <div className="mt-4">
            <div className="flex justify-between items-center text-xs text-slate-300 mb-3">
              <span className="flex items-center gap-1.5 font-mono text-cyan-300">
                <Timer className="w-4 h-4 text-cyan-400" /> {timeLeft}s remaining
              </span>
              <span className="font-bold text-amber-400">Score: {score} pts</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#020b14] border border-cyan-900/60 mb-4">
              <div className="text-xs font-semibold text-cyan-400 mb-1">{q.title}</div>
              <p className="text-sm text-slate-200 leading-relaxed">{q.description}</p>
            </div>

            <div className="space-y-2">
              {q.options.map((opt) => {
                let btnStyle = 'bg-[#031322] border-slate-800 text-slate-200 hover:border-cyan-500/50';
                if (selectedAnswer) {
                  if (opt === q.correct) btnStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-200';
                  else if (opt === selectedAnswer) btnStyle = 'bg-rose-950/80 border-rose-500 text-rose-200';
                }
                return (
                  <button
                    key={opt}
                    onClick={() => handleSelect(opt)}
                    disabled={!!selectedAnswer}
                    className={`w-full p-3 rounded-xl border text-xs font-semibold text-left transition-all ${btnStyle}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-6 text-center space-y-4">
            <Award className="w-12 h-12 text-amber-400 mx-auto" />
            <h4 className="text-lg font-bold text-white">Challenge Completed!</h4>
            <p className="text-xs text-slate-300">
              Your final score: <span className="font-bold text-cyan-400">{score} points</span>
            </p>
            <button
              onClick={handleRestart}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-glow-cyan"
            >
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
