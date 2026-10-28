import React, { useState, useEffect } from 'react';
import {
  Compass,
  MapPin,
  Calendar,
  Sparkles,
  Bookmark,
  RefreshCw,
  CheckCircle2,
  Trash2,
  Globe,
  ArrowRight,
  ArrowLeft,
  Clock,
  Navigation,
  SlidersHorizontal,
  PenTool,
  IndianRupee,
  Utensils,
  Ticket,
  Car
} from 'lucide-react';
import { supabase, saveTripToSupabase, fetchUserTrips } from './lib/supabaseClient';
import { generateItinerary } from './services/api';

const CONTENT = {
  en: {
    brandSubtitle: "Intelligent Travel Architect",
    navFeatures: "Features",
    navPlanner: "Launch Studio",
    navSaved: "Saved Trips",
    heroBadge: "Powered by Gemini 2.5 Flash",
    heroTitle: "Plan Your Next Journey With",
    heroTitleHighlight: "Autonomous Precision.",
    heroDescription:
      "Eliminate backtracking, balance daily activity budgets in ₹ (INR), and assemble cohesive itineraries customized to your personal wishlist.",
    ctaStart: "Build Itinerary Now",
    ctaExplore: "Explore Platform Features",
    statsTrips: "Itineraries Synthesized",
    statsBacktrack: "Zero Backtracking",
    statsTime: "Seconds Generation",
    featuresTitle: "Engineered for Frictionless Exploration",
    featuresSubtitle: "A dedicated design layout tailored to how travelers move through cities.",
    feat1Title: "Spatial Clustering",
    feat1Desc: "Attractions are grouped geographically by day to minimize backtracking and transit overhead.",
    feat2Title: "INR Budget Control",
    feat2Desc: "Set your exact budget in Rupees (₹) with tier-specific breakdown for meals and transport.",
    feat3Title: "Wishlist Inclusion",
    feat3Desc: "Specify mandatory venues and places you want to visit and let the AI build routes around them.",
    savedDrawerTitle: "Saved Journeys",
    savedDrawerSubtitle: "Synchronized with your personal Supabase cloud registry.",
    studioBack: "Back to Home",
    studioTitle: "Itinerary Studio Workspace",
    studioSubtitle: "Define your expedition constraints, custom wishlist, and exact INR budget."
  },
  hi: {
    brandSubtitle: "बुद्धिमान यात्रा वास्तुकार",
    navFeatures: "विशेषताएं",
    navPlanner: "स्टूडियो खोलें",
    navSaved: "सहेजी गई यात्राएं",
    heroBadge: "जेमिनी 2.5 फ्लैश द्वारा संचालित",
    heroTitle: "अपनी अगली यात्रा की योजना बनाएं",
    heroTitleHighlight: "सटीक और स्वचालित रूप से।",
    heroDescription:
      "समय बचाएं, भारतीय रुपयों (₹) में बजट निर्धारित करें और अपनी पसंदीदा जगहों के अनुसार पूरी यात्रा योजना बनाएं।",
    ctaStart: "यात्रा योजना बनाएं",
    ctaExplore: "विशेषताएं देखें",
    statsTrips: "सफलतापूर्वक तैयार योजनाएं",
    statsBacktrack: "शून्य समय की बर्बादी",
    statsTime: "सेकंड औसत पीढ़ी समय",
    featuresTitle: "सुगम और निर्बाध यात्रा के लिए डिज़ाइन किया गया",
    featuresSubtitle: "दूरी और समय को ध्यान में रखकर तैयार की गई आधुनिक यात्रा मार्गदर्शिका।",
    feat1Title: "भौगोलिक क्लस्टरिंग",
    feat1Desc: "यात्रा समय घटाने के लिए गतिविधियों को क्षेत्र के अनुसार समूहीकृत किया जाता है।",
    feat2Title: "रुपयों (₹) में सटीक बजट",
    feat2Desc: "अपना वास्तविक बजट दर्ज करें और भोजन तथा आवागमन का सटीक अनुमान पाएं।",
    feat3Title: "मनपसंद स्थानों का चयन",
    feat3Desc: "वे स्थान लिखें जहाँ आप अवश्य जाना चाहते हैं, AI उन्हें मार्ग में शामिल करेगा।",
    savedDrawerTitle: "सहेजी गई यात्राएं",
    savedDrawerSubtitle: "आपके सुपाबेस क्लाउड डेटाबेस से सिंक की गई।",
    studioBack: "मुख्य पृष्ठ पर वापस जाएं",
    studioTitle: "यात्रा योजना स्टूडियो",
    studioSubtitle: "अपनी यात्रा की अवधि, वास्तविक बजट (₹) और मनपसंद स्थान दर्ज करें।"
  }
};

const INTEREST_CATALOG = [
  'Historic Sites',
  'Local Food & Street Markets',
  'Museums & Art',
  'Nature & Hill Parks',
  'Temple & Spiritual',
  'Architecture',
  'Nightlife & Lounges',
  'Shopping Districts'
];

export default function App() {
  const [currentPage, setCurrentPage] = useState(() => localStorage.getItem('roam_current_page') || 'home');

  const [itinerary, setItinerary] = useState(() => {
    const saved = localStorage.getItem('roam_active_itinerary');
    try { return saved ? JSON.parse(saved) : null; } catch { return null; }
  });

  const [lang, setLang] = useState('en');
  const t = CONTENT[lang];

  // Trip Config Form State
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('roam_form_data');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return {
      destination: 'Jaipur, Rajasthan',
      start_date: '2026-11-01',
      end_date: '2026-11-04',
      budget_amount: '25000',
      budget_tier: 'moderate',
      must_visit_places: 'Hawa Mahal, Amer Fort, Chokhi Dhani',
      group_type: 'solo',
      pace: 'moderate'
    };
  });

  const [selectedInterests, setSelectedInterests] = useState(['Historic Sites', 'Local Food & Street Markets']);
  const [activeDayTab, setActiveDayTab] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [savedTrips, setSavedTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(false);

  useEffect(() => {
    localStorage.setItem('roam_current_page', currentPage);
  }, [currentPage]);

  useEffect(() => {
    if (itinerary) localStorage.setItem('roam_active_itinerary', JSON.stringify(itinerary));
  }, [itinerary]);

  useEffect(() => {
    localStorage.setItem('roam_form_data', JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    loadSavedTrips();
  }, []);

  const toggleInterest = (interest) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const payload = {
        ...formData,
        budget_amount: formData.budget_amount ? parseFloat(formData.budget_amount) : null,
        interests: selectedInterests
      };
      const data = await generateItinerary(payload);
      setItinerary(data);
      setActiveDayTab(1);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to build itinerary. Please check if your backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTrip = async () => {
    if (!itinerary) return;
    setSaving(true);
    setError(null);

    try {
      const tripPayload = {
        title: itinerary.title || `Trip to ${formData.destination}`,
        destination: formData.destination,
        start_date: formData.start_date,
        end_date: formData.end_date,
        budget_tier: formData.budget_tier,
        group_type: formData.group_type,
        interests: selectedInterests,
        itinerary_data: itinerary,
        is_public: false
      };

      await saveTripToSupabase(tripPayload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      loadSavedTrips();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to save to cloud storage.');
    } finally {
      setSaving(false);
    }
  };

  const loadSavedTrips = async () => {
    setLoadingTrips(true);
    try {
      const data = await fetchUserTrips();
      setSavedTrips(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTrips(false);
    }
  };

  const handleDeleteTrip = async (id) => {
    try {
      await supabase.from('trips').delete().eq('id', id);
      setSavedTrips((prev) => prev.filter((trip) => trip.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div 
      style={{
        background: 'linear-gradient(135deg, #f8fbfb 0%, #eefbfb 25%, #fef3f3 65%, #f6fdfd 100%)',
        minHeight: '100vh',
        color: '#0f172a'
      }}
      className="text-slate-900 font-sans"
    >
      {/* Background Ambience Glows */}
      <div 
        style={{
          position: 'fixed',
          top: '-10%',
          right: '-5%',
          width: '550px',
          height: '550px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(204, 251, 250, 0.7) 0%, rgba(177, 229, 230, 0.3) 50%, transparent 75%)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />
      <div 
        style={{
          position: 'fixed',
          bottom: '-10%',
          left: '-5%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(247, 173, 173, 0.4) 0%, rgba(242, 145, 145, 0.15) 50%, transparent 75%)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      {/* Top Header - 'relative' removed to satisfy Tailwind/CSS sticky rule */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 border-b border-[#B1E5E6]/60 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div 
            onClick={() => setCurrentPage('home')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div 
              style={{ background: 'linear-gradient(135deg, #F29191 0%, #F7ADAD 50%, #B1E5E6 100%)' }}
              className="h-11 w-11 rounded-2xl flex items-center justify-center text-white shadow-md shadow-[#F29191]/30 group-hover:scale-105 transition-transform"
            >
              <Compass className="h-6 w-6 stroke-[2.2] text-[#0f172a]" />
            </div>
            <div>
              <span 
                style={{ 
                  background: 'linear-gradient(90deg, #F29191 0%, #d87171 50%, #469b9d 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
                className="font-black text-2xl tracking-tight"
              >
                RoamAI
              </span>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                {t.brandSubtitle}
              </p>
            </div>
          </div>

          {currentPage === 'home' && (
            <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-700">
              <a href="#features" className="hover:text-[#F29191] transition">{t.navFeatures}</a>
              <button onClick={() => setCurrentPage('studio')} className="hover:text-[#F29191] transition cursor-pointer">
                {t.navPlanner}
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white/90 hover:bg-[#CCFBFA]/40 text-slate-800 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Globe className="h-3.5 w-3.5 text-[#F29191]" />
              <span>{lang === 'en' ? 'हिन्दी' : 'EN'}</span>
            </button>

            <button
              onClick={() => { setDrawerOpen(true); loadSavedTrips(); }}
              style={{ backgroundColor: '#F29191' }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white hover:opacity-90 shadow-md shadow-[#F29191]/30 transition cursor-pointer"
            >
              <Bookmark className="h-3.5 w-3.5" />
              <span>{t.navSaved}</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/30 text-[10px] font-extrabold">
                {savedTrips.length}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* VIEW 1: HOME */}
      {currentPage === 'home' && (
        <main className="relative z-10">
          <section className="py-24 px-6 border-b border-slate-200/60 text-center max-w-5xl mx-auto flex flex-col items-center">
            <div 
              style={{ backgroundColor: '#CCFBFA', borderColor: '#B1E5E6' }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black text-slate-900 border mb-6 shadow-xs"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#F29191]" />
              {t.heroBadge}
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 leading-[1.12]">
              {t.heroTitle}{' '}
              <span 
                style={{
                  background: 'linear-gradient(90deg, #F29191 0%, #F7ADAD 45%, #469b9d 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                {t.heroTitleHighlight}
              </span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-slate-700 max-w-2xl font-medium leading-relaxed">
              {t.heroDescription}
            </p>

            <div className="mt-10 flex flex-wrap gap-4 justify-center">
              <button
                onClick={() => setCurrentPage('studio')}
                style={{ backgroundColor: '#F29191' }}
                className="px-8 py-4 rounded-2xl font-black text-sm text-white hover:opacity-95 shadow-xl shadow-[#F29191]/35 flex items-center gap-3 transition transform hover:-translate-y-0.5 cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                <span>{t.ctaStart}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href="#features"
                style={{ borderColor: '#B1E5E6' }}
                className="px-8 py-4 rounded-2xl font-bold text-sm border bg-white/80 hover:bg-[#CCFBFA]/40 text-slate-800 shadow-xs transition"
              >
                {t.ctaExplore}
              </a>
            </div>

            <div className="mt-20 grid grid-cols-3 gap-6 sm:gap-12 max-w-3xl w-full border-t border-slate-200/80 pt-10">
              <div>
                <div style={{ color: '#F29191' }} className="text-3xl sm:text-4xl font-black">₹ (INR)</div>
                <div className="text-xs font-bold text-slate-600 mt-1">Exact Rupee Budgets</div>
              </div>
              <div>
                <div style={{ color: '#319795' }} className="text-3xl sm:text-4xl font-black">Wishlist</div>
                <div className="text-xs font-bold text-slate-600 mt-1">Custom Places Included</div>
              </div>
              <div>
                <div style={{ color: '#d87171' }} className="text-3xl sm:text-4xl font-black">&lt; 3.5s</div>
                <div className="text-xs font-bold text-slate-600 mt-1">{t.statsTime}</div>
              </div>
            </div>
          </section>

          <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">{t.featuresTitle}</h2>
              <p className="text-slate-600 text-sm mt-3 font-medium">{t.featuresSubtitle}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-8 rounded-3xl border border-white/80 bg-white/70 backdrop-blur-md shadow-sm">
                <div style={{ backgroundColor: '#CCFBFA' }} className="h-14 w-14 rounded-2xl flex items-center justify-center text-[#F29191] mb-6 shadow-xs">
                  <MapPin className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-2">{t.feat1Title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">{t.feat1Desc}</p>
              </div>

              <div className="p-8 rounded-3xl border border-white/80 bg-white/70 backdrop-blur-md shadow-sm">
                <div style={{ backgroundColor: '#F7ADAD' }} className="h-14 w-14 rounded-2xl flex items-center justify-center text-white mb-6 shadow-xs">
                  <IndianRupee className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-2">{t.feat2Title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">{t.feat2Desc}</p>
              </div>

              <div className="p-8 rounded-3xl border border-white/80 bg-white/70 backdrop-blur-md shadow-sm">
                <div style={{ backgroundColor: '#B1E5E6' }} className="h-14 w-14 rounded-2xl flex items-center justify-center text-slate-900 mb-6 shadow-xs">
                  <PenTool className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-2">{t.feat3Title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">{t.feat3Desc}</p>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* VIEW 2: STUDIO */}
      {currentPage === 'studio' && (
        <div className="w-full min-h-[calc(100vh-80px)] px-6 lg:px-12 py-10 relative z-10">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 mb-8 border-b border-slate-300/70">
            <div>
              <button
                onClick={() => setCurrentPage('home')}
                className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#F29191] mb-2 transition cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{t.studioBack}</span>
              </button>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#0f172a]">
                {t.studioTitle}
              </h1>
              <p className="text-sm font-semibold text-slate-600 mt-1">
                {t.studioSubtitle}
              </p>
            </div>

            {itinerary && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveTrip}
                  disabled={saving}
                  style={{ backgroundColor: '#F29191' }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs text-white hover:opacity-90 shadow-md shadow-[#F29191]/30 transition disabled:opacity-50 cursor-pointer"
                >
                  {saveSuccess ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Saved in Supabase</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="h-4 w-4" />
                      <span>Save Itinerary</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            
            {/* Parameters Control Deck */}
            <div className="lg:col-span-4 p-8 rounded-3xl border border-white/80 bg-white/85 backdrop-blur-md shadow-md sticky top-28">
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-[#F29191]" />
                  <h3 className="font-black text-sm tracking-wide text-slate-900">
                    Trip Configuration
                  </h3>
                </div>
                <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-[#CCFBFA] text-teal-950 border border-[#B1E5E6]">
                  INR Currency
                </span>
              </div>

              <form onSubmit={handleGenerate} className="space-y-5">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                    Destination City
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-3.5 h-4 w-4 text-[#F29191]" />
                    <input
                      type="text"
                      required
                      value={formData.destination}
                      onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                      placeholder="e.g., Jaipur, Rajasthan"
                      className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F29191] font-bold text-slate-900 bg-white shadow-2xs"
                    />
                  </div>
                </div>

                {/* Where you want to visit (Wishlist) */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                    Places You Want To Visit (Wishlist)
                  </label>
                  <div className="relative">
                    <PenTool className="absolute left-4 top-3.5 h-4 w-4 text-[#F29191]" />
                    <textarea
                      rows={2}
                      value={formData.must_visit_places}
                      onChange={(e) => setFormData({ ...formData, must_visit_places: e.target.value })}
                      placeholder="e.g., Amer Fort, Hawa Mahal, Chokhi Dhani, Rawat Sweets"
                      className="w-full pl-11 pr-4 py-2.5 rounded-2xl text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F29191] font-bold text-slate-900 bg-white shadow-2xs leading-relaxed"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold mt-1 block">
                    Write down specific spots, monuments, or restaurants you want included.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                      Departure Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-2xl text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F29191] font-bold text-slate-900 bg-white shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                      Return Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-2xl text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F29191] font-bold text-slate-900 bg-white shadow-2xs"
                    />
                  </div>
                </div>

                {/* Actual Budget in Rupees & Budget Style */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                      Total Budget in ₹ (INR)
                    </label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3.5 top-3 h-3.5 w-3.5 text-[#F29191]" />
                      <input
                        type="number"
                        min="500"
                        step="500"
                        value={formData.budget_amount}
                        onChange={(e) => setFormData({ ...formData, budget_amount: e.target.value })}
                        placeholder="e.g. 25000"
                        className="w-full pl-9 pr-3 py-2.5 rounded-2xl text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F29191] font-bold text-slate-900 bg-white shadow-2xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                      Budget Tier
                    </label>
                    <select
                      value={formData.budget_tier}
                      onChange={(e) => setFormData({ ...formData, budget_tier: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-2xl text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F29191] font-bold text-slate-900 bg-white shadow-2xs"
                    >
                      <option value="budget">Budget-Friendly</option>
                      <option value="moderate">Balanced / Moderate</option>
                      <option value="luxury">Luxury / Premium</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                      Travelers
                    </label>
                    <select
                      value={formData.group_type}
                      onChange={(e) => setFormData({ ...formData, group_type: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-2xl text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F29191] font-bold text-slate-900 bg-white shadow-2xs"
                    >
                      <option value="solo">Solo Traveler</option>
                      <option value="couple">Couple / Duo</option>
                      <option value="group">Group Expedition</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                      Trip Pacing
                    </label>
                    <select
                      value={formData.pace}
                      onChange={(e) => setFormData({ ...formData, pace: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-2xl text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F29191] font-bold text-slate-900 bg-white shadow-2xs"
                    >
                      <option value="relaxed">Relaxed</option>
                      <option value="moderate">Balanced</option>
                      <option value="fast-paced">Fast-Paced</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                    Focus Areas
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {INTEREST_CATALOG.map((interest) => {
                      const active = selectedInterests.includes(interest);
                      return (
                        <button
                          type="button"
                          key={interest}
                          onClick={() => toggleInterest(interest)}
                          style={active ? { backgroundColor: '#F29191', borderColor: '#F29191', color: '#ffffff' } : {}}
                          className={`text-[11px] px-3 py-1 rounded-full border transition font-bold cursor-pointer ${
                            active ? 'shadow-xs' : 'border-slate-300 bg-white text-slate-800 hover:bg-[#CCFBFA]/40'
                          }`}
                        >
                          {interest}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-300 text-red-700 rounded-2xl text-xs leading-relaxed font-bold">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: 'linear-gradient(135deg, #F29191 0%, #F7ADAD 60%, #B1E5E6 100%)'
                  }}
                  className="w-full py-4 px-4 text-slate-950 font-black rounded-2xl shadow-lg shadow-[#F29191]/30 hover:opacity-95 disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-slate-950" />
                      <span>Synthesizing in ₹ (INR)...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-slate-950" />
                      <span>Synthesize Itinerary</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Right Panel: Itinerary Canvas */}
            <div className="lg:col-span-8 space-y-6">
              {!itinerary && !loading && (
                <div 
                  style={{ borderColor: '#B1E5E6' }}
                  className="min-h-[580px] border-2 border-dashed rounded-3xl flex flex-col items-center justify-center p-12 text-center bg-white/60 backdrop-blur-md shadow-xs"
                >
                  <div 
                    style={{ backgroundColor: '#CCFBFA' }}
                    className="h-20 w-20 rounded-3xl flex items-center justify-center text-[#F29191] mb-6 shadow-xs border border-[#B1E5E6]"
                  >
                    <Compass className="h-10 w-10 stroke-[1.8]" />
                  </div>
                  <h3 className="font-black text-2xl text-[#0f172a]">
                    Studio Canvas Ready
                  </h3>
                  <p className="text-slate-600 text-sm max-w-md mt-2 font-medium leading-relaxed">
                    Set your destination, your custom wishlist spots, and your budget in <b>₹ (Rupees)</b> on the left, then click <b>"Synthesize Itinerary"</b>.
                  </p>
                </div>
              )}

              {loading && (
                <div className="min-h-[580px] rounded-3xl border border-white/80 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center p-12 text-center shadow-md">
                  <RefreshCw className="h-14 w-14 text-[#F29191] animate-spin mb-6" />
                  <h3 className="font-black text-2xl text-[#0f172a]">
                    Integrating Wishlist & Calculating INR Budget
                  </h3>
                  <p className="text-slate-600 text-sm mt-2 max-w-sm font-semibold">
                    Scheduling custom spots and balancing daily Rupee limits...
                  </p>
                </div>
              )}

              {itinerary && !loading && (
                <div className="space-y-6">
                  
                  {/* Overview Banner */}
                  <div className="p-8 rounded-3xl border border-white/80 bg-white/85 backdrop-blur-md shadow-md">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#F29191] mb-1">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{itinerary.destination || formData.destination}</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0f172a]">
                          {itinerary.title}
                        </h2>
                      </div>
                      <div className="flex items-center gap-3">
                        <span 
                          style={{ backgroundColor: '#CCFBFA', color: '#115e59', borderColor: '#B1E5E6' }}
                          className="px-4 py-1.5 rounded-full text-xs font-black border"
                        >
                          {itinerary.days?.length || 0} Full Days
                        </span>
                      </div>
                    </div>

                    <p className="text-sm font-semibold text-slate-700 mt-3 leading-relaxed max-w-3xl">
                      {itinerary.summary}
                    </p>

                    {itinerary.budget_summary && (
                      <div className="mt-4 pt-4 border-t border-slate-200 flex items-center gap-2 text-xs font-bold text-slate-700">
                        <IndianRupee className="h-4 w-4 text-[#115e59]" />
                        <span><b>Financial Plan:</b> {itinerary.budget_summary}</span>
                      </div>
                    )}
                  </div>

                  {/* Day Navigation Tabs */}
                  <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                    {itinerary.days?.map((day) => {
                      const isActive = activeDayTab === day.day_number;
                      return (
                        <button
                          key={day.day_number}
                          onClick={() => setActiveDayTab(day.day_number)}
                          style={
                            isActive
                              ? { backgroundColor: '#F29191', color: '#ffffff', borderColor: '#F29191' }
                              : {}
                          }
                          className={`px-5 py-3 rounded-2xl text-xs font-black transition flex items-center gap-2 shrink-0 border cursor-pointer ${
                            isActive
                              ? 'shadow-md shadow-[#F29191]/30'
                              : 'bg-white/85 border-slate-300 text-slate-800 hover:bg-white'
                          }`}
                        >
                          <span>Day {day.day_number}</span>
                          <span className="text-[10px] font-bold opacity-85">
                            {day.date}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Day Detail Display */}
                  {itinerary.days?.filter((d) => d.day_number === activeDayTab).map((day) => (
                    <div
                      key={day.day_number}
                      className="p-8 rounded-3xl border border-white/80 bg-white/85 backdrop-blur-md shadow-md"
                    >
                      {/* Day Header with Itemized Expense Breakdown */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
                        <div>
                          <span className="text-xs font-black uppercase tracking-wider text-[#F29191]">
                            Day {day.day_number} Plan
                          </span>
                          <h3 className="text-2xl font-black text-[#0f172a] mt-1 tracking-tight">
                            {day.theme}
                          </h3>
                        </div>

                        {/* Category Expense Pills */}
                        {day.budget_breakdown ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-[11px] font-bold text-orange-900 flex items-center gap-1.5 shadow-2xs">
                              <Utensils className="h-3 w-3 text-orange-700" />
                              <span>Food: {day.budget_breakdown.food_dining}</span>
                            </div>
                            <div className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-[11px] font-bold text-purple-900 flex items-center gap-1.5 shadow-2xs">
                              <Ticket className="h-3 w-3 text-purple-700" />
                              <span>Tickets: {day.budget_breakdown.activities_tickets}</span>
                            </div>
                            <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-[11px] font-bold text-blue-900 flex items-center gap-1.5 shadow-2xs">
                              <Car className="h-3 w-3 text-blue-700" />
                              <span>Transit: {day.budget_breakdown.local_transit}</span>
                            </div>
                            <div className="px-3.5 py-1.5 rounded-xl bg-[#CCFBFA] border border-[#B1E5E6] text-xs font-black text-teal-950 shadow-2xs">
                              Day Total: {day.budget_breakdown.total_day_spend}
                            </div>
                          </div>
                        ) : (
                          day.daily_budget_estimate && (
                            <div 
                              style={{ backgroundColor: '#CCFBFA', color: '#115e59', borderColor: '#B1E5E6' }}
                              className="px-4 py-2 rounded-2xl text-xs font-black self-start sm:self-auto border shadow-2xs flex items-center gap-1.5"
                            >
                              <span>Daily Budget: {day.daily_budget_estimate}</span>
                            </div>
                          )
                        )}
                      </div>

                      {/* Day Activities */}
                      <div className="py-6 space-y-8">
                        {['morning', 'afternoon', 'evening'].map((period) => {
                          const acts = day[period] || [];
                          if (!acts.length) return null;

                          return (
                            <div key={period} className="relative pl-6 border-l-2 border-[#B1E5E6]">
                              <div 
                                style={{ backgroundColor: '#F29191' }}
                                className="absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-white shadow-xs" 
                              />
                              <h4 
                                style={{ color: '#F29191' }}
                                className="text-xs font-black uppercase tracking-wider mb-4"
                              >
                                {period}
                              </h4>

                              <div className="grid grid-cols-1 gap-4">
                                {acts.map((act, idx) => (
                                  <div 
                                    key={idx}
                                    className="p-6 rounded-2xl border border-slate-200/90 bg-[#fbfdfd] shadow-2xs"
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
                                      <div className="font-black text-base text-[#0f172a]">
                                        {act.title}
                                      </div>
                                      <div className="flex items-center gap-3 text-xs font-black">
                                        <span className="flex items-center gap-1 text-slate-500">
                                          <Clock className="h-3.5 w-3.5" />
                                          {act.time}
                                        </span>
                                        <span className="flex items-center gap-1 text-teal-900 bg-[#CCFBFA] px-2.5 py-0.5 rounded-md border border-[#B1E5E6]">
                                          {act.estimated_cost}
                                        </span>
                                      </div>
                                    </div>

                                    <p className="text-sm font-semibold text-slate-700 mt-1 leading-relaxed">
                                      {act.description}
                                    </p>

                                    <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                                      <span className="flex items-center gap-1.5 font-bold text-slate-600">
                                        <MapPin className="h-3.5 w-3.5 text-[#F29191]" />
                                        {act.location_name}
                                      </span>
                                      <span className="capitalize text-[11px] font-black px-3 py-1 rounded-full bg-[#fce8e8] text-[#d87171] border border-[#F7ADAD]">
                                        {act.category}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Transit Strategy */}
                      {day.transportation_tip && (
                        <div 
                          style={{ backgroundColor: '#CCFBFA', borderColor: '#B1E5E6' }}
                          className="mt-4 p-4 rounded-2xl border text-xs flex items-center gap-3 text-slate-800 font-semibold"
                        >
                          <Navigation className="h-4 w-4 text-[#F29191] shrink-0" />
                          <span><b className="font-black text-[#0f172a]">Transit Strategy:</b> {day.transportation_tip}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-200/80 bg-white/70 backdrop-blur-md text-slate-600 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-bold">
          <div>© 2026 RoamAI Systems. All rights reserved.</div>
          <div className="flex items-center gap-6">
            <span>FastAPI Backend</span>
            <span>Gemini AI Engine</span>
            <span>Indian Rupee (₹) Optimization</span>
          </div>
        </div>
      </footer>

      {/* Saved Trips Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-md w-full shadow-2xl flex flex-col border-l border-slate-200 bg-white/95 backdrop-blur-lg">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="font-black text-lg text-slate-900">{t.savedDrawerTitle}</h3>
                <p className="text-xs font-medium text-slate-500">{t.savedDrawerSubtitle}</p>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer font-black text-base"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {loadingTrips && (
                <div className="text-center py-12 text-slate-500 text-sm font-semibold">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-[#F29191]" />
                  Querying database...
                </div>
              )}

              {!loadingTrips && savedTrips.length === 0 && (
                <div className="text-center py-12 text-slate-500 text-sm font-semibold">
                  No saved itineraries located. Generate a plan and click "Save Itinerary".
                </div>
              )}

              {!loadingTrips &&
                savedTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white/80 hover:border-[#F29191] shadow-2xs transition cursor-pointer group relative"
                  >
                    <div
                      onClick={() => {
                        setItinerary(trip.itinerary_data);
                        setFormData({
                          ...formData,
                          destination: trip.destination,
                          start_date: trip.start_date,
                          end_date: trip.end_date,
                          budget_amount: trip.itinerary_data?.budget_amount || '25000',
                          budget_tier: trip.budget_tier,
                          must_visit_places: trip.itinerary_data?.must_visit_places || '',
                          group_type: trip.group_type
                        });
                        setSelectedInterests(trip.interests || []);
                        setCurrentPage('studio');
                        setDrawerOpen(false);
                      }}
                    >
                      <h4 className="font-black text-sm text-slate-900 group-hover:text-[#F29191] transition">
                        {trip.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-bold">
                        <Calendar className="h-3 w-3" />
                        {trip.start_date} → {trip.end_date}
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTrip(trip.id);
                      }}
                      className="absolute top-4 right-4 text-slate-400 hover:text-red-600 transition p-1 cursor-pointer"
                      title="Delete Entry"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}