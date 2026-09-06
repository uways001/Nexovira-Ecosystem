import React, { useState } from 'react';
import { Phone, MessageSquare, Mail, MapPin, Send, CheckCircle2, AlertCircle, Globe, Loader2, ShieldCheck } from 'lucide-react';
import { WhatsAppSupportButton } from './WhatsAppSupportButton';
import { submitContactMessageToFirestore } from '../lib/firestoreService';
import { 
  detectMaliciousPayload, 
  sanitizeName, 
  sanitizeEmail, 
  sanitizeText, 
  sanitizeMultilineText, 
  logSecurityThreatAttempt 
} from '../lib/sanitization';
import { ErrorBoundary } from './ErrorBoundary';

export const ContactViewContent: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Appliance Inquiry / Order Assistance');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // 1. Security Threat Inspection across all fields
    const fieldsToInspect = [
      { name: 'name', value: name },
      { name: 'email', value: email },
      { name: 'subject', value: subject },
      { name: 'message', value: message }
    ];

    for (const f of fieldsToInspect) {
      const threat = detectMaliciousPayload(f.value);
      if (threat.isSuspicious) {
        logSecurityThreatAttempt('Contact Form', f.name, threat, f.value);
        setErrorMsg(`Security Notice: Suspicious input pattern blocked in ${f.name} (${threat.threatType}). Plain text only.`);
        return;
      }
    }

    // 2. Field-Specific Sanitization & Validation
    const nameCheck = sanitizeName(name);
    if (!nameCheck.isValid) {
      setErrorMsg(nameCheck.error || 'Please enter your full name.');
      return;
    }

    const emailCheck = sanitizeEmail(email);
    if (!emailCheck.isValid) {
      setErrorMsg(emailCheck.error || 'Please enter a valid email address.');
      return;
    }

    const cleanSubject = sanitizeText(subject, 150);
    if (!cleanSubject.trim()) {
      setErrorMsg('Please enter a valid subject.');
      return;
    }

    const cleanMessage = sanitizeMultilineText(message, 3000);
    if (!cleanMessage.trim() || cleanMessage.length < 10) {
      setErrorMsg('Please enter message details (minimum 10 characters).');
      return;
    }

    setLoading(true);
    try {
      await submitContactMessageToFirestore({
        name: nameCheck.sanitizedName,
        email: emailCheck.sanitizedEmail,
        subject: cleanSubject,
        message: cleanMessage
      });
      setSubmitted(true);
    } catch (err: any) {
      console.error('Contact submission error:', err);
      setErrorMsg('Failed to send message. Please try again or reach us via WhatsApp.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 text-left space-y-12">
      {/* Title */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-bold">
          Contact NEXOVIRA Team
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
          We're Here to Help You Shop & Build
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Reach our Lagos Hub support team for appliance orders, bulk procurement, warranty claims, or tech consultation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact Info Sidebar */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 space-y-6">
            <h3 className="font-bold text-lg text-cyan-400 border-b border-slate-800 pb-3">Official Channels</h3>
            
            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-300">Phone Hotline</div>
                  <a href="tel:+2349110443054" className="text-white font-mono font-bold hover:text-cyan-400 text-sm">
                    +234 911 044 3054
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-300">WhatsApp Desk</div>
                  <a 
                    href="https://wa.me/2348129595134?text=Hello%20NEXOVIRA%20Support%2C%20I%20need%20assistance%20with..."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 font-mono font-bold hover:underline text-sm block"
                  >
                    +234 812 959 5134
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-300">Email Support</div>
                  <a href="mailto:nexovirasupport@gmail.com" className="text-slate-200 font-mono hover:text-cyan-400">
                    nexovirasupport@gmail.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-300">Lagos Operating Hub</div>
                  <div className="text-slate-400">14 Admiralty Way, Victoria Island, Lagos, Nigeria</div>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-2 border-t border-slate-800">
                <Globe className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-300">Official Portal Domain</div>
                  <a href="https://nexovira.name.ng" className="text-cyan-400 font-mono font-bold hover:underline">
                    nexovira.name.ng
                  </a>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <WhatsAppSupportButton whatsappNumber="+2348129595134" variant="inline" />
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs space-y-4">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">Send Direct Message</h3>
          
          {submitted ? (
            <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 space-y-2 text-center">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
              <h4 className="font-bold text-base text-white">Message Delivered to Lagos Hub</h4>
              <p className="text-slate-300">Thank you, {name}! Our customer care team will respond to {email} shortly.</p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-4 px-4 py-2 bg-slate-800 text-white font-bold rounded-xl text-xs"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Samuel Adebayo"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-3 focus:outline-none focus:border-cyan-500 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="samuel@example.com"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-3 focus:outline-none focus:border-cyan-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Inquiry Subject</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-3 focus:outline-none focus:border-cyan-500 text-slate-900 dark:text-white font-medium"
                >
                  <option value="Appliance Inquiry / Order Assistance">Appliance Inquiry / Order Assistance</option>
                  <option value="Solar Inverter Technical System Quote">Solar Inverter Technical System Quote</option>
                  <option value="Tech Services & Web Development">Tech Services & Web Development</option>
                  <option value="Seller Merchant Partnership">Seller Merchant Partnership</option>
                  <option value="Affiliate Commission & Payout">Affiliate Commission & Payout</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Message Details *</label>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your inquiry or product specifications..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-3 focus:outline-none focus:border-cyan-500 text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-extrabold rounded-xl text-sm flex items-center justify-center gap-2 hover:shadow-lg shadow-cyan-500/20 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Delivering Message...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Inquiry to Support</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export const ContactView: React.FC = () => (
  <ErrorBoundary
    fallbackTitle="Contact Desk Protected"
    fallbackMessage="A rendering exception in the contact view was isolated safely. You can retry or contact us directly via our official WhatsApp desk."
  >
    <ContactViewContent />
  </ErrorBoundary>
);

