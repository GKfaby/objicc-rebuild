import { MapPin, Phone, Mail, MessageCircle, Send } from 'lucide-react';
import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';

export default function ContactPage() {
  const { systemSettings } = useUser();
  const { showToast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await addDoc(collection(db, 'suggestions'), {
        ...form,
        category: 'Contact',
        anonymous: false,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      showToast("Message sent! We'll get back to you soon.", 'success');
      setForm({ name: '', email: '', message: '' });
    } catch {
      showToast('Failed to send message. Please try again.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-16 bg-slate-50 dark:bg-darkbg">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="mb-10">
            <h1 className="text-4xl font-black text-navy dark:text-white uppercase tracking-tight mb-2">Contact Us</h1>
            <p className="text-slate-500">We'd love to hear from you. Reach out via any of the channels below.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Info cards */}
            <div className="space-y-4">
              {[
                {
                  icon: MapPin, label: 'Our Location',
                  value: systemSettings.address,
                  href: `https://maps.google.com?q=${encodeURIComponent(systemSettings.address)}`,
                },
                {
                  icon: Phone, label: 'WhatsApp',
                  value: `+${systemSettings.whatsappNumber}`,
                  href: `https://wa.me/${systemSettings.whatsappNumber}`,
                },
                ...(systemSettings.email ? [{
                  icon: Mail, label: 'Email',
                  value: systemSettings.email,
                  href: `mailto:${systemSettings.email}`,
                }] : []),
              ].map(({ icon: Icon, label, value, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-4 p-5 bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow group"
                >
                  <div className="p-3 bg-navy/5 group-hover:bg-navy/10 rounded-xl transition-colors">
                    <Icon className="w-5 h-5 text-navy dark:text-gold" />
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">{label}</div>
                    <div className="font-bold text-navy dark:text-white">{value}</div>
                  </div>
                </a>
              ))}

              {/* WhatsApp CTA */}
              <a
                href={`https://wa.me/${systemSettings.whatsappNumber}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-3 w-full py-4 bg-green-500 hover:bg-green-600 text-white font-black rounded-2xl transition-all uppercase tracking-widest text-sm"
              >
                <MessageCircle className="w-5 h-5" />
                Chat on WhatsApp
              </a>
            </div>

            {/* Contact form */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-8">
              <h2 className="font-black text-navy dark:text-white uppercase tracking-tight text-lg mb-6">Send a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                {[
                  { key: 'name', label: 'Your Name', type: 'text', required: true },
                  { key: 'email', label: 'Your Email', type: 'email', required: true },
                ].map(({ key, label, type, required }) => (
                  <div key={key}>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{label}</label>
                    <input
                      type={type} required={required}
                      value={(form as any)[key]}
                      onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold outline-none focus:ring-2 focus:ring-navy/20 text-sm"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Message</label>
                  <textarea
                    required rows={5}
                    value={form.message}
                    onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold outline-none focus:ring-2 focus:ring-navy/20 text-sm resize-none"
                  />
                </div>
                <button
                  type="submit" disabled={sending}
                  className="w-full py-4 bg-navy text-white font-black rounded-xl hover:bg-ocean transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-sm disabled:opacity-60"
                >
                  {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
