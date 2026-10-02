import React, { useState } from 'react';
import { UnderwaterScene } from '../three/UnderwaterScene';
import { api, setAuthToken } from '../services/api';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Compass,
  Boxes,
  MapPin,
  Leaf,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const loginEmail = email.trim() || 'demo@aquasentinel.ocean';
    const loginPassword = password || 'AquaSentinel2026!';

    setLoading(true);
    try {
      const res = await api.login({ email: loginEmail, password: loginPassword });
      setAuthToken(res.access_token);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccess = async () => {
    setError(null);
    setDemoLoading(true);
    try {
      const res = await api.demoLogin();
      setAuthToken(res.access_token);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize demo session.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#031322] select-none font-sans text-slate-100 flex flex-col justify-between p-6 md:p-10">
      {/* Interactive 3D Underwater Scene */}
      <UnderwaterScene interactive={true} />

      {/* Subtle Oceanic Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#020b14]/70 via-transparent to-[#041527]/30 pointer-events-none" />

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto flex-1 flex flex-col justify-between">
        {/* Top Navbar / Minimal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 backdrop-blur-md shadow-glow-cyan">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              SIH26057 • MoES Autonomous Sonar Intelligence
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDemoAccess}
              disabled={demoLoading}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 transition-all shadow-glow-cyan font-bold"
            >
              {demoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-slate-950" />}
              Try Demo Access
            </button>
          </div>
        </div>

        {/* Center Grid: Left Branding + Right Glass Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center my-auto py-4">
          {/* Left Column: AquaSentinel Branding */}
          <div className="lg:col-span-7 flex flex-col items-start text-left max-w-xl">
            {/* Luminous Wave Logo and Brand */}
            <div className="flex items-center gap-4 mb-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 p-[2px] shadow-glow-cyan">
                <div className="w-full h-full rounded-[14px] bg-[#041527] flex items-center justify-center">
                  <svg className="w-9 h-9 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.2 0 1.9.5 2.5 1" />
                    <path d="M2 7c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.2 0 1.9.5 2.5 1" />
                    <path d="M2 17c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.2 0 1.9.5 2.5 1" />
                  </svg>
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-lg">
                Aqua<span className="text-cyan-400">Sentinel</span>
              </h1>
            </div>

            {/* Slogan */}
            <h2 className="text-xl md:text-2xl font-semibold text-cyan-200 tracking-wide mb-3 drop-shadow">
              See Beneath. Understand Beyond.
            </h2>

            {/* Description */}
            <p className="text-sm md:text-base text-slate-200/90 leading-relaxed max-w-lg mb-6 drop-shadow">
              AI-powered underwater intelligence for a cleaner, safer and more sustainable ocean.
              Autonomous side-scan sonar processing, target shadow trigonometry, and geospatial classification.
            </p>

            {/* Live Indicator Badges */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <span className="px-3 py-1.5 rounded-lg bg-ocean-950/80 border border-cyan-800/80 backdrop-blur-md font-mono text-cyan-300">
                NVIDIA RTX 4050 • CUDA 13.1
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-ocean-950/80 border border-cyan-800/80 backdrop-blur-md font-mono text-cyan-300">
                10,000 Sonar Image Target
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-ocean-950/80 border border-cyan-800/80 backdrop-blur-md font-mono text-cyan-300">
                50 Planned Capabilities
              </span>
            </div>
          </div>

          {/* Right Column: Glassmorphism Login Card */}
          <div className="lg:col-span-5 w-full max-w-md ml-auto">
            <div className="relative rounded-[28px] p-7 md:p-8 bg-[#04192b]/75 backdrop-blur-2xl border border-cyan-400/35 shadow-2xl shadow-cyan-950/70">
              {/* Card Header */}
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center mb-3 text-cyan-300 shadow-glow-cyan">
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 12c1.5 2 2.5 2 4 0s2.5-2 4 0" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white tracking-tight">Welcome Back</h3>
                <p className="text-xs text-cyan-100/80 mt-1">Sign in to your AquaSentinel account</p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#031322]/85 border border-cyan-900/70 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 text-white placeholder-slate-500 text-sm transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#031322]/85 border border-cyan-900/70 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 text-white placeholder-slate-500 text-sm transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded bg-[#031322] border-cyan-800 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                    />
                    Remember me
                  </label>
                  <a href="#forgot" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                    Forgot password?
                  </a>
                </div>

                {/* Sign In Primary Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-2.5 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-slate-950 transition-all shadow-glow-cyan flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* OR Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700/60" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-[#04192b] text-slate-400 font-semibold uppercase tracking-wider">
                    OR
                  </span>
                </div>
              </div>

              {/* Try Demo Evaluator Button */}
              <button
                type="button"
                onClick={handleDemoAccess}
                disabled={demoLoading}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-sm bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-400/60 text-cyan-200 transition-all flex items-center justify-center gap-2 mb-3 shadow-glow-cyan"
              >
                {demoLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-300" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-cyan-300" />
                    <span>Try Demo (1-Click Evaluator Access)</span>
                  </>
                )}
              </button>

              {/* Continue with Google */}
              <button
                type="button"
                onClick={handleDemoAccess}
                className="w-full py-2.5 px-4 rounded-xl font-medium text-xs bg-[#031322]/85 hover:bg-[#031322] border border-slate-700 text-slate-300 transition-all flex items-center justify-center gap-2.5"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.7 2.9C6.5 7.4 9 5 12 5z" />
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                  <path fill="#FBBC05" d="M5.6 14.7c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.2C.7 9.6 0 12.3 0 15.2c0 2.9.7 5.6 1.9 8l3.7-2.9z" />
                  <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.3L1.9 16.4C3.7 20.2 7.5 23.5 12 23.5z" />
                </svg>
                Continue with Google
              </button>

              {/* Security Badge */}
              <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Secure access for marine researchers and survey operators</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: 4 Feature Pills + Right Slogan */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-cyan-900/40">
          {/* 4 Feature Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full md:w-auto">
            {/* 1. AI Detection */}
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#041527]/85 border border-cyan-900/60 backdrop-blur-md">
              <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Compass className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white">AI Detection</div>
                <div className="text-[10px] text-slate-400">Find what matters</div>
              </div>
            </div>

            {/* 2. 3D Visualization */}
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#041527]/85 border border-cyan-900/60 backdrop-blur-md">
              <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Boxes className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white">3D Visualization</div>
                <div className="text-[10px] text-slate-400">Explore in depth</div>
              </div>
            </div>

            {/* 3. Geospatial Mapping */}
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#041527]/85 border border-cyan-900/60 backdrop-blur-md">
              <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white">Geospatial Mapping</div>
                <div className="text-[10px] text-slate-400">Pinpoint with precision</div>
              </div>
            </div>

            {/* 4. Ocean Conservation */}
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#041527]/85 border border-cyan-900/60 backdrop-blur-md">
              <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Leaf className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white">Ocean Conservation</div>
                <div className="text-[10px] text-slate-400">A healthier tomorrow</div>
              </div>
            </div>
          </div>

          {/* Right Slogan */}
          <div className="text-[11px] font-semibold tracking-widest text-slate-400/90 uppercase whitespace-nowrap">
            SMARTER OCEAN, BRIGHTER FUTURE.
          </div>
        </div>
      </div>
    </div>
  );
};
