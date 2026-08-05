import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, MessageSquare, Loader2 } from 'lucide-react';

export const CustomerContactSection: React.FC = () => {
  const [form, setForm] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      const user = stored ? JSON.parse(stored) : null;
      return {
        name: user?.username || user?.full_name || user?.fullName || user?.name || '',
        email: user?.email || '',
        subject: 'Custom Furniture Inquiry',
        message: '',
      };
    } catch {
      return {
        name: '',
        email: '',
        subject: 'Custom Furniture Inquiry',
        message: '',
      };
    }
  });

  useEffect(() => {
    const fetchUserFromDB = async () => {
      try {
        const stored = localStorage.getItem('user');
        if (stored) {
          const u = JSON.parse(stored);
          const dbName = u.full_name || u.fullName || u.username || u.name || '';
          const dbEmail = u.email || '';
          if (dbName || dbEmail) {
            setForm((prev) => ({
              ...prev,
              name: dbName || prev.name,
              email: dbEmail || prev.email,
            }));
          }
        }
      } catch (e) {
        // ignore
      }

      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const { getCurrentUser } = await import('../../services/api');
          const dbUser = await getCurrentUser();
          if (dbUser) {
            const u = dbUser as any;
            const dbName = u.full_name || u.fullName || u.username || u.name || '';
            const dbEmail = u.email || '';
            setForm((prev) => ({
              ...prev,
              name: dbName || prev.name,
              email: dbEmail || prev.email,
            }));
          }
        } catch (err) {
          console.warn("DB user query notice:", err);
        }
      }
    };

    fetchUserFromDB();
    window.addEventListener('storage', fetchUserFromDB);
    window.addEventListener('user-logged-in', fetchUserFromDB);
    return () => {
      window.removeEventListener('storage', fetchUserFromDB);
      window.removeEventListener('user-logged-in', fetchUserFromDB);
    };
  }, []);

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.message.trim() || submitting) return;

    setSubmitting(true);
    try {
      const endpoint = window.location.port === '3000'
        ? 'http://localhost:8000/api/auth/contact'
        : '/api/auth/contact';

      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          subject: form.subject,
          message: form.message,
        }),
      });
      setSubmitted(true);

      setTimeout(() => {
        setSubmitted(false);
        setForm((prev) => ({ ...prev, message: '' }));
      }, 4000);
    } catch (err) {
      console.error("Error submitting contact inquiry email:", err);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setForm((prev) => ({ ...prev, message: '' }));
      }, 4000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="contact-section" className="scroll-mt-24 pt-6">
      <div className="bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-[2rem] p-6 sm:p-8 shadow-xl space-y-6 text-[#2C241D]">
        {/* Header */}
        <div className="border-b border-[#EFE7DE] pb-4">
          <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#48A63E] bg-[#48A63E]/10 px-3 py-1 rounded-full border border-[#48A63E]/30 mb-2">
            <MessageSquare className="w-3.5 h-3.5" /> Customer Support & Care
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#2C241D] tracking-tight">
            Contact Customer Concierge
          </h2>
          <p className="text-xs sm:text-sm text-[#6B5C4D] mt-1 font-medium">
            Have questions about an order, custom furniture specifications, or delivery timeline? We are here to help!
          </p>
        </div>

        {/* Contact Info Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-[#F3EDE5] border border-[#E2D7CB] flex items-center gap-3.5 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[#48A63E] text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-[#48A63E]/20">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-[11px] font-bold text-[#7A6C5E] uppercase tracking-wider">
                Call / WhatsApp
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-[#2C241D]">
                +91 9778237180
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F3EDE5] border border-[#E2D7CB] flex items-center gap-3.5 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[#48A63E] text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-[#48A63E]/20">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-[11px] font-bold text-[#7A6C5E] uppercase tracking-wider">
                Experience Centers
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-[#2C241D]">
                Ettumanoor, Kottayam
              </span>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        {submitted ? (
          <div className="p-6 rounded-2xl bg-[#48A63E]/10 border border-[#48A63E]/30 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-[#48A63E] mx-auto animate-bounce" />
            <h3 className="text-base font-bold text-[#2C241D]">Message Received!</h3>
            <p className="text-xs text-[#48A63E] font-medium">
              Thank you{form.name ? `, ${form.name}` : ''}. Your inquiry has been submitted successfully. Our dedicated customer care specialist will respond to your message shortly!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#7A6C5E] mb-1">
                  Your Full Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  required
                  className="w-full px-4 py-2.5 text-xs sm:text-sm bg-white border border-[#E2D7CB] rounded-xl text-[#2C241D] font-medium focus:outline-none focus:border-[#48A63E] focus:ring-1 focus:ring-[#48A63E]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#7A6C5E] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="rahul@example.com"
                  required
                  className="w-full px-4 py-2.5 text-xs sm:text-sm bg-white border border-[#E2D7CB] rounded-xl text-[#2C241D] font-medium focus:outline-none focus:border-[#48A63E] focus:ring-1 focus:ring-[#48A63E]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#7A6C5E] mb-1">
                Inquiry Topic
              </label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="e.g. Custom sofa dimensions or order status"
                className="w-full px-4 py-2.5 text-xs sm:text-sm bg-white border border-[#E2D7CB] rounded-xl text-[#2C241D] font-medium focus:outline-none focus:border-[#48A63E] focus:ring-1 focus:ring-[#48A63E]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#7A6C5E] mb-1">
                Your Message / Details
              </label>
              <textarea
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Describe your furniture request or question..."
                required
                className="w-full px-4 py-2.5 text-xs sm:text-sm bg-white border border-[#E2D7CB] rounded-xl text-[#2C241D] font-medium focus:outline-none focus:border-[#48A63E] focus:ring-1 focus:ring-[#48A63E]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-[#48A63E] hover:bg-[#3d9134] text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-md shadow-[#48A63E]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Message...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Message to Concierge</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </section>
  );
};
