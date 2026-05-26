import { useState, useRef } from 'react';
import {
  Sun, Moon, Monitor, Eye, Type, Volume2, VolumeX, Palette,
  Upload, Save, Globe, Phone, MapPin, Image, AlertTriangle,
  RefreshCw, Check, BarChart2
} from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../firebase';
import { useUser } from '../../../contexts/UserContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useToast } from '../../../contexts/ToastContext';
import type { ColorMode, A11yMode, FontSize, AppTheme, SystemSettings } from '../../../types';

const THEMES: { id: AppTheme; label: string; preview: string }[] = [
  { id: 'default', label: 'Naval Blue', preview: '#002147' },
  { id: 'midnight', label: 'Midnight', preview: '#0f0f1a' },
  { id: 'forest', label: 'Forest', preview: '#1a3a2a' },
  { id: 'sunset', label: 'Sunset', preview: '#7c2d12' },
  { id: 'ocean', label: 'Ocean', preview: '#0c4a6e' },
];

const A11Y_MODES: { id: A11yMode; label: string; desc: string }[] = [
  { id: 'normal', label: 'Normal', desc: 'Standard colours' },
  { id: 'deuteranopia', label: 'Deuteranopia', desc: 'Green-blind friendly' },
  { id: 'protanopia', label: 'Protanopia', desc: 'Red-blind friendly' },
  { id: 'tritanopia', label: 'Tritanopia', desc: 'Blue-blind friendly' },
  { id: 'high-contrast', label: 'High Contrast', desc: 'Maximum visibility' },
];

export default function SettingsPanel() {
  const { systemSettings } = useUser();
  const { colorMode, setColorMode, a11yMode, setA11yMode, fontSize, setFontSize, narration, setNarration, appTheme, setAppTheme } = useTheme();
  const { showToast } = useToast();

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [settings, setSettings] = useState<SystemSettings>(systemSettings);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [activeSection, setActiveSection] = useState<'appearance' | 'branding' | 'accessibility' | 'features' | 'deployment'>('appearance');

  const updateSetting = (key: keyof SystemSettings, val: any) =>
    setSettings((p) => ({ ...p, [key]: val }));

  const handleSaveGlobal = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), settings, { merge: true });
      showToast('Settings saved successfully!', 'success');
    } catch (e) {
      showToast('Failed to save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Logo must be under 5MB', 'error'); return; }

    setUploading(true);
    try {
      const storageRef = ref(storage, `settings/logo-${Date.now()}`);
      const task = uploadBytesResumable(storageRef, file);
      task.on('state_changed', (snap) => {
        setUploadProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100));
      });
      await task;
      const url = await getDownloadURL(storageRef);
      updateSetting('logoUrl', url);
      showToast('Logo uploaded! Save settings to apply.', 'success');
    } catch (e) {
      showToast('Logo upload failed.', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const sections = [
    { id: 'appearance', label: 'Appearance' },
    { id: 'branding', label: 'Branding' },
    { id: 'accessibility', label: 'Accessibility' },
    { id: 'features', label: 'Features' },
    { id: 'deployment', label: 'Deployment' },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy dark:text-white uppercase tracking-tight">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage appearance, branding, and site configuration.</p>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
              activeSection === s.id
                ? 'bg-white dark:bg-slate-700 text-navy dark:text-white shadow'
                : 'text-slate-500 hover:text-navy dark:hover:text-white'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Appearance ── */}
      {activeSection === 'appearance' && (
        <div className="space-y-6">
          {/* Colour mode */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm">
            <h2 className="font-black text-navy dark:text-white uppercase tracking-widest text-sm mb-4">Colour Mode</h2>
            <div className="grid grid-cols-3 gap-3">
              {([
                { id: 'light', label: 'Light', icon: Sun },
                { id: 'dark', label: 'Dark', icon: Moon },
                { id: 'system', label: 'System', icon: Monitor },
              ] as { id: ColorMode; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setColorMode(id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    colorMode === id ? 'border-navy bg-navy/5 dark:border-gold dark:bg-gold/10' : 'border-slate-100 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${colorMode === id ? 'text-navy dark:text-gold' : 'text-slate-400'}`} />
                  <span className={`text-xs font-bold uppercase ${colorMode === id ? 'text-navy dark:text-gold' : 'text-slate-500'}`}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* App theme */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm">
            <h2 className="font-black text-navy dark:text-white uppercase tracking-widest text-sm mb-4">App Theme</h2>
            <div className="grid grid-cols-5 gap-3">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setAppTheme(t.id)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    appTheme === t.id ? 'border-navy dark:border-gold' : 'border-slate-100 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg" style={{ background: t.preview }} />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{t.label}</span>
                  {appTheme === t.id && <Check className="w-3 h-3 text-navy dark:text-gold" />}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">Themes change the primary colour palette. Add custom themes by editing <code className="bg-slate-100 px-1 rounded">index.css</code>.</p>
          </div>

          {/* Font size */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm">
            <h2 className="font-black text-navy dark:text-white uppercase tracking-widest text-sm mb-4">Font Size</h2>
            <div className="flex gap-3 items-center">
              {(['sm', 'md', 'lg', 'xl'] as FontSize[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setFontSize(s)}
                  className={`px-4 py-2 rounded-lg border-2 transition-all font-bold ${
                    fontSize === s ? 'border-navy bg-navy text-white' : 'border-slate-200 text-slate-600 hover:border-slate-400'
                  }`}
                  style={{ fontSize: s === 'sm' ? 12 : s === 'md' ? 14 : s === 'lg' ? 16 : 18 }}
                >
                  {s.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Branding ── */}
      {activeSection === 'branding' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
            <h2 className="font-black text-navy dark:text-white uppercase tracking-widest text-sm">Organisation Details</h2>

            {/* Logo upload */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Logo</label>
              <div className="flex items-center gap-4">
                {settings.logoUrl && (
                  <img src={settings.logoUrl} alt="Logo" className="h-16 w-16 object-contain rounded-xl border border-slate-200"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
                <div className="flex-1">
                  <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 hover:border-navy rounded-xl text-sm font-bold text-slate-600 hover:text-navy transition-all disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    {uploading ? `Uploading… ${uploadProgress}%` : 'Upload Logo'}
                  </button>
                  {uploading && (
                    <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-navy transition-all" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-1">PNG or SVG recommended. Max 5MB.</p>
                </div>
              </div>
            </div>

            {[
              { key: 'orgName', label: 'Organisation Name', icon: Globe },
              { key: 'heroText', label: 'Hero Headline', icon: Type },
              { key: 'heroSubtext', label: 'Hero Subtext', icon: Type },
              { key: 'address', label: 'Address', icon: MapPin },
              { key: 'whatsappNumber', label: 'WhatsApp Number', icon: Phone },
              { key: 'email', label: 'Contact Email', icon: Globe },
            ].map(({ key, label, icon: Icon }) => (
              <div key={key}>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{label}</label>
                <div className="relative">
                  <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={(settings as any)[key] || ''}
                    onChange={(e) => updateSetting(key as any, e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold outline-none focus:ring-2 focus:ring-navy/20 text-sm"
                  />
                </div>
              </div>
            ))}

            {/* ── Hero Stats Strip ── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 className="w-4 h-4 text-slate-400" />
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                  Home Page Stats Strip
                </label>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                The three highlighted stats shown at the bottom of the hero section on the home page.
              </p>
              <div className="space-y-3">
                {(settings.heroStats ?? [
                  { label: 'Est. 2015', desc: 'Years of Excellence' },
                  { label: 'Youth Focused', desc: 'Cadet Development' },
                  { label: 'Discipline', desc: 'Leadership & Service' },
                ]).map((stat, i) => (
                  <div key={i} className="flex gap-2 items-start p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <div className="w-6 h-6 rounded-lg bg-navy/10 dark:bg-white/10 flex items-center justify-center shrink-0 mt-2.5">
                      <span className="text-xs font-black text-navy dark:text-white">{i + 1}</span>
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Label</label>
                        <input
                          value={stat.label}
                          onChange={(e) => {
                            const updated = [...(settings.heroStats ?? [])];
                            updated[i] = { ...updated[i], label: e.target.value };
                            updateSetting('heroStats', updated);
                          }}
                          placeholder="e.g. Est. 2015"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-700 rounded-lg text-navy dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-navy/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Description</label>
                        <input
                          value={stat.desc}
                          onChange={(e) => {
                            const updated = [...(settings.heroStats ?? [])];
                            updated[i] = { ...updated[i], desc: e.target.value };
                            updateSetting('heroStats', updated);
                          }}
                          placeholder="e.g. Years of Excellence"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-700 rounded-lg text-navy dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-navy/20"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Accessibility ── */}
      {activeSection === 'accessibility' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <h2 className="font-black text-navy dark:text-white uppercase tracking-widest text-sm">Accessibility Options</h2>

            {/* Colour-blind modes */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Colour Vision Mode</label>
              <div className="grid grid-cols-1 gap-2">
                {A11Y_MODES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setA11yMode(m.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                      a11yMode === m.id ? 'border-navy bg-navy/5 dark:border-gold' : 'border-slate-100 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Eye className={`w-4 h-4 shrink-0 ${a11yMode === m.id ? 'text-navy dark:text-gold' : 'text-slate-400'}`} />
                    <div>
                      <div className={`text-sm font-bold ${a11yMode === m.id ? 'text-navy dark:text-gold' : 'text-navy dark:text-white'}`}>{m.label}</div>
                      <div className="text-xs text-slate-400">{m.desc}</div>
                    </div>
                    {a11yMode === m.id && <Check className="w-4 h-4 ml-auto text-navy dark:text-gold" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Screen reader / narration */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
              <div className="flex items-center gap-3">
                {narration ? <Volume2 className="w-5 h-5 text-navy dark:text-gold" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
                <div>
                  <div className="font-bold text-sm text-navy dark:text-white">Audio Narration</div>
                  <div className="text-xs text-slate-400">Read page content aloud (screen reader assist)</div>
                </div>
              </div>
              <button
                onClick={() => setNarration(!narration)}
                className={`relative w-12 h-6 rounded-full transition-colors ${narration ? 'bg-navy' : 'bg-slate-200'}`}
                role="switch" aria-checked={narration}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${narration ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Features ── */}
      {activeSection === 'features' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-black text-navy dark:text-white uppercase tracking-widest text-sm">Feature Toggles</h2>
          {([
            { key: 'shopEnabled', label: 'Merchandise Shop', desc: 'Allow members to browse and purchase merch.' },
            { key: 'suggestionsEnabled', label: 'Suggestion Box', desc: 'Allow members to submit suggestions.' },
            { key: 'eventsEnabled', label: 'Events Page', desc: 'Show the events page to all visitors.' },
          ] as { key: keyof SystemSettings; label: string; desc: string }[]).map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
              <div>
                <div className="font-bold text-sm text-navy dark:text-white">{label}</div>
                <div className="text-xs text-slate-400">{desc}</div>
              </div>
              <button
                onClick={() => updateSetting(key, !settings[key])}
                className={`relative w-12 h-6 rounded-full transition-colors ${settings[key] ? 'bg-green-500' : 'bg-slate-200'}`}
                role="switch" aria-checked={!!settings[key]}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings[key] ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Deployment ── */}
      {activeSection === 'deployment' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="font-black text-navy dark:text-white uppercase tracking-widest text-sm">Maintenance Mode</h2>
            <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <div>
                  <div className="font-bold text-sm text-amber-800 dark:text-amber-300">Maintenance Mode</div>
                  <div className="text-xs text-amber-600">Non-admin users will see a maintenance message.</div>
                </div>
              </div>
              <button
                onClick={() => updateSetting('maintenanceMode', !settings.maintenanceMode)}
                className={`relative w-12 h-6 rounded-full transition-colors ${settings.maintenanceMode ? 'bg-amber-500' : 'bg-slate-200'}`}
                role="switch" aria-checked={settings.maintenanceMode}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.maintenanceMode ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
            {settings.maintenanceMode && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Maintenance Message</label>
                <textarea
                  value={settings.maintenanceMessage || ''}
                  onChange={(e) => updateSetting('maintenanceMessage', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white text-sm font-medium outline-none focus:ring-2 focus:ring-navy/20 resize-none"
                  placeholder="We're down for scheduled maintenance. Back shortly!"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSaveGlobal}
          disabled={saving}
          className="flex items-center gap-2 px-8 py-3 bg-navy text-white font-black rounded-xl hover:bg-ocean transition-all uppercase tracking-widest text-sm disabled:opacity-60"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
