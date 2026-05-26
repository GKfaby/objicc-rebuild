import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Users, Star, ChevronDown } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import NoticeBoard from '../components/features/NoticeBoard';

export default function HomePage() {
  const { systemSettings, firebaseUser, isMember, isPending } = useUser();

  return (
    <div className="flex flex-col">
      {/* ── Hero ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-white overflow-hidden">

        {/* Animated gradient background */}
        <div className="absolute inset-0 hero-gradient" />

        {/* Decorative rings + floating dots */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-gold/5 blur-3xl" />
          {[800, 600, 400].map((size) => (
            <div key={size} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5"
              style={{ width: size, height: size }} />
          ))}
          {[...Array(16)].map((_, i) => (
            <div key={i} className="absolute w-1 h-1 bg-white/20 rounded-full animate-pulse"
              style={{
                left: `${(i * 37 + 10) % 90 + 5}%`,
                top:  `${(i * 53 + 15) % 70 + 10}%`,
                animationDelay: `${i * 0.3}s`,
                animationDuration: `${2 + (i % 3)}s`,
              }} />
          ))}
        </div>

        {/* ── Main content (centred, doesn't touch the bottom strip) ── */}
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto flex-1 flex flex-col items-center justify-center pb-48">

          {/* Logo */}
          {systemSettings.logoUrl && (
            <div className="flex justify-center mb-8">
              <div className="logo-hero-wrap">
                <img
                  src={systemSettings.logoUrl}
                  alt={systemSettings.orgName}
                  onError={(e) => {
                    (e.target as HTMLImageElement).closest('.logo-hero-wrap')?.classList.add('hidden');
                  }}
                />
              </div>
            </div>
          )}

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm rounded-full px-5 py-2 text-xs font-black uppercase tracking-widest mb-6">
            <Shield className="w-3 h-3 text-gold" />
            Official {systemSettings.orgName} Portal
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter leading-none mb-6">
            {systemSettings.heroText}
          </h1>

          {/* Subtext */}
          {systemSettings.heroSubtext && (
            <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
              {systemSettings.heroSubtext}
            </p>
          )}

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {!firebaseUser ? (
              <>
                <Link to="/signup"
                  className="group px-8 py-4 bg-gold text-navy font-black rounded-full hover:bg-white transition-all uppercase tracking-widest text-sm flex items-center gap-2 justify-center shadow-lg shadow-gold/20">
                  Join OBJICC
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link to="/events"
                  className="px-8 py-4 bg-white/10 border border-white/30 backdrop-blur-sm text-white font-black rounded-full hover:bg-white/20 transition-all uppercase tracking-widest text-sm">
                  View Events
                </Link>
              </>
            ) : isPending ? (
              <Link to="/pending"
                className="px-8 py-4 bg-amber-500 text-white font-black rounded-full hover:bg-amber-400 transition-all uppercase tracking-widest text-sm flex items-center gap-2 justify-center">
                ⏳ Awaiting Approval
              </Link>
            ) : isMember ? (
              <>
                <Link to="/shop"
                  className="group px-8 py-4 bg-gold text-navy font-black rounded-full hover:bg-white transition-all uppercase tracking-widest text-sm flex items-center gap-2 justify-center shadow-lg shadow-gold/20">
                  Visit Shop <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link to="/profile"
                  className="px-8 py-4 bg-white/10 border border-white/30 backdrop-blur-sm text-white font-black rounded-full hover:bg-white/20 transition-all uppercase tracking-widest text-sm">
                  My Profile
                </Link>
              </>
            ) : (
              <Link to="/profile"
                className="px-8 py-4 bg-gold text-navy font-black rounded-full hover:bg-white transition-all uppercase tracking-widest text-sm">
                View My Profile
              </Link>
            )}
          </div>
        </div>

        {/* ── Stats strip — pinned to bottom, ABOVE scroll arrow ── */}
        <div className="relative z-10 w-full border-t border-white/10 bg-navy/40 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-6 flex flex-wrap justify-center gap-8 md:gap-20">
            {[Shield, Users, Star].map((Icon, i) => {
              const stat = systemSettings.heroStats?.[i] ?? { label: '', desc: '' };
              if (!stat.label) return null;
              return (
                <div key={i} className="text-center">
                  <Icon className="w-5 h-5 text-gold mx-auto mb-1 opacity-80" />
                  <p className="text-white font-black text-sm uppercase tracking-widest">{stat.label}</p>
                  <p className="text-white/40 text-xs mt-0.5">{stat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Scroll arrow — sits outside the stats strip, below it ── */}
        <a href="#notices"
          className="relative z-10 flex flex-col items-center gap-1 py-4 text-white/30 hover:text-white/60 transition-colors bg-navy/40 backdrop-blur-sm w-full justify-center"
          aria-label="Scroll to notices">
          <ChevronDown className="w-5 h-5 animate-bounce" />
        </a>
      </section>

      {/* ── Notice board ── */}
      <section id="notices">
        <NoticeBoard />
      </section>

      {/* ── About strip ── */}
      <section className="py-20 bg-navy text-white">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <div className="text-xs font-black uppercase tracking-widest text-gold mb-3">Who We Are</div>
          <h2 className="text-4xl font-black uppercase tracking-tight mb-6">Building Tomorrow's Leaders</h2>
          <p className="text-white/60 text-lg leading-relaxed mb-10">
            {systemSettings.orgName} is dedicated to developing disciplined, confident and community-focused young people through structured cadet training, mentorship and service.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contact"
              className="px-8 py-4 bg-gold text-navy font-black rounded-full hover:bg-white transition-all uppercase tracking-widest text-sm">
              Get in Touch
            </Link>
            {!firebaseUser && (
              <Link to="/signup"
                className="px-8 py-4 bg-white/10 border border-white/20 text-white font-black rounded-full hover:bg-white/20 transition-all uppercase tracking-widest text-sm">
                Apply to Join
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
