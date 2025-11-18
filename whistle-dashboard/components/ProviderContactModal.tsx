'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface ProviderContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProviderContactModal({ isOpen, onClose }: ProviderContactModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Contact Info
    name: '',
    email: '',
    telegram: '',
    discord: '',
    
    // Provider Details
    organization: '',
    experience: '',
    serverLocation: '',
    currentInfrastructure: '',
    
    // Technical Specs
    serverSpecs: '',
    bandwidth: '',
    storageCapacity: '',
    
    // Business Questions
    motivation: '',
    expectedVolume: '',
    additionalServices: '',
    questions: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Validate required fields
      if (!formData.name || !formData.email) {
        toast.error('Please fill in your name and email');
        setLoading(false);
        return;
      }

      // Send to backend or email service
      // For now, we'll just log it and show success
      console.log('Provider Contact Form Submission:', formData);
      
      // TODO: Send to your backend API or email service
      // await fetch('/api/provider-contact', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData)
      // });

      toast.success('✅ Application submitted! We\'ll contact you within 48 hours.', {
        duration: 5000,
      });

      // Reset form
      setFormData({
        name: '', email: '', telegram: '', discord: '',
        organization: '', experience: '', serverLocation: '', currentInfrastructure: '',
        serverSpecs: '', bandwidth: '', storageCapacity: '',
        motivation: '', expectedVolume: '', additionalServices: '', questions: '',
      });
      setStep(1);
      onClose();
    } catch (err: any) {
      console.error('Submission failed:', err);
      toast.error(`❌ Submission failed: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{
              background: 'rgba(0, 0, 0, 0.95)',
              backdropFilter: 'blur(10px)',
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none overflow-y-auto"
          >
            <div 
              className="relative w-full max-w-2xl pointer-events-auto my-8 max-h-[90vh] overflow-y-auto"
              style={{
                background: 'linear-gradient(135deg, rgba(22, 22, 22, 0.98) 0%, rgba(12, 12, 12, 0.98) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(30px)',
                boxShadow: `
                  0 30px 100px rgba(0, 0, 0, 0.95),
                  0 15px 50px rgba(0, 0, 0, 0.85),
                  0 8px 25px rgba(0, 0, 0, 0.75),
                  inset 0 1px 0 rgba(255, 255, 255, 0.2),
                  inset 0 -1px 0 rgba(0, 0, 0, 0.9)
                `,
                clipPath: 'polygon(20px 0, calc(100% - 20px) 0, 100% 20px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 20px 100%, 0 calc(100% - 20px), 0 20px)',
              }}
            >
              {/* Gradient overlay */}
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.08) 0%, transparent 40%, rgba(0, 0, 0, 0.4) 100%)',
                  clipPath: 'inherit',
                }}
              />

              {/* Content */}
              <div className="relative p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold tracking-[0.2em] uppercase">
                    Become a WHISTLE Provider
                  </h2>
                  <button
                    onClick={onClose}
                    className="text-2xl text-gray-400 hover:text-white transition-colors"
                    style={{
                      textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
                    }}
                  >
                    ×
                  </button>
                </div>

                {/* Progress indicator */}
                <div className="flex items-center gap-2 mb-6">
                  <div 
                    className={`flex-1 h-1 ${step >= 1 ? 'bg-white' : 'bg-gray-700'}`}
                    style={{
                      boxShadow: step >= 1 ? '0 0 10px rgba(255, 255, 255, 0.3)' : 'none',
                    }}
                  />
                  <div 
                    className={`flex-1 h-1 ${step >= 2 ? 'bg-white' : 'bg-gray-700'}`}
                    style={{
                      boxShadow: step >= 2 ? '0 0 10px rgba(255, 255, 255, 0.3)' : 'none',
                    }}
                  />
                  <div 
                    className={`flex-1 h-1 ${step >= 3 ? 'bg-white' : 'bg-gray-700'}`}
                    style={{
                      boxShadow: step >= 3 ? '0 0 10px rgba(255, 255, 255, 0.3)' : 'none',
                    }}
                  />
                </div>

                {/* Step 1: Contact Information */}
                {step === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <div className="space-y-4 mb-6">
                      <p className="text-sm text-gray-300 mb-4">
                        Fill out your contact information so we can reach you.
                      </p>

                      {/* Name */}
                      <div>
                        <label className="block text-xs font-semibold tracking-wider uppercase text-gray-400 mb-2">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className="w-full px-4 py-3 bg-black/60 border-2 border-white/20 text-sm focus:border-white/40 transition-colors"
                          placeholder="John Doe"
                          required
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-xs font-semibold tracking-wider uppercase text-gray-400 mb-2">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="w-full px-4 py-3 bg-black/60 border-2 border-white/20 text-sm focus:border-white/40 transition-colors"
                          placeholder="john@example.com"
                          required
                        />
                      </div>

                      {/* Telegram */}
                      <div>
                        <label className="block text-xs font-semibold tracking-wider uppercase text-gray-400 mb-2">
                          Telegram Username (optional)
                        </label>
                        <input
                          type="text"
                          value={formData.telegram}
                          onChange={(e) => handleInputChange('telegram', e.target.value)}
                          className="w-full px-4 py-3 bg-black/60 border-2 border-white/20 text-sm focus:border-white/40 transition-colors"
                          placeholder="@johndoe"
                        />
                      </div>

                      {/* Discord */}
                      <div>
                        <label className="block text-xs font-semibold tracking-wider uppercase text-gray-400 mb-2">
                          Discord Username (optional)
                        </label>
                        <input
                          type="text"
                          value={formData.discord}
                          onChange={(e) => handleInputChange('discord', e.target.value)}
                          className="w-full px-4 py-3 bg-black/60 border-2 border-white/20 text-sm focus:border-white/40 transition-colors"
                          placeholder="johndoe#1234"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={onClose}
                        className="btn-primary flex-1"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => setStep(2)}
                        disabled={!formData.name || !formData.email}
                        className="btn-primary flex-1"
                      >
                        Next
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Provider Details */}
                {step === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <div className="space-y-4 mb-6">
                      <p className="text-sm text-gray-300 mb-4">
                        Tell us about your organization and infrastructure experience.
                      </p>

                      {/* Organization */}
                      <div>
                        <label className="block text-xs font-semibold tracking-wider uppercase text-gray-400 mb-2">
                          Organization/Company Name
                        </label>
                        <input
                          type="text"
                          value={formData.organization}
                          onChange={(e) => handleInputChange('organization', e.target.value)}
                          className="w-full px-4 py-3 bg-black/60 border-2 border-white/20 text-sm focus:border-white/40 transition-colors"
                          placeholder="Your Company LLC"
                        />
                      </div>

                      {/* Experience */}
                      <div>
                        <label className="block text-xs font-semibold tracking-wider uppercase text-gray-400 mb-2">
                          Infrastructure Experience
                        </label>
                        <textarea
                          value={formData.experience}
                          onChange={(e) => handleInputChange('experience', e.target.value)}
                          className="w-full px-4 py-3 bg-black/60 border-2 border-white/20 text-sm focus:border-white/40 transition-colors resize-none"
                          rows={3}
                          placeholder="Describe your experience running blockchain nodes, servers, or infrastructure..."
                        />
                      </div>

                      {/* Server Location */}
                      <div>
                        <label className="block text-xs font-semibold tracking-wider uppercase text-gray-400 mb-2">
                          Server Location/Data Center
                        </label>
                        <input
                          type="text"
                          value={formData.serverLocation}
                          onChange={(e) => handleInputChange('serverLocation', e.target.value)}
                          className="w-full px-4 py-3 bg-black/60 border-2 border-white/20 text-sm focus:border-white/40 transition-colors"
                          placeholder="e.g., AWS us-east-1, OVH France, Self-hosted Germany"
                        />
                      </div>

                      {/* Current Infrastructure */}
                      <div>
                        <label className="block text-xs font-semibold tracking-wider uppercase text-gray-400 mb-2">
                          Current Infrastructure Setup
                        </label>
                        <textarea
                          value={formData.currentInfrastructure}
                          onChange={(e) => handleInputChange('currentInfrastructure', e.target.value)}
                          className="w-full px-4 py-3 bg-black/60 border-2 border-white/20 text-sm focus:border-white/40 transition-colors resize-none"
                          rows={2}
                          placeholder="What infrastructure do you currently run? (e.g., Solana validators, other RPC nodes, etc.)"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setStep(1)}
                        className="btn-primary flex-1"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => setStep(3)}
                        className="btn-primary flex-1"
                      >
                        Next
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Technical Specs & Questions */}
                {step === 3 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <div className="space-y-4 mb-6">
                      <p className="text-sm text-gray-300 mb-4">
                        Technical specifications and any questions you have.
                      </p>

                      {/* Server Specs */}
                      <div>
                        <label className="block text-xs font-semibold tracking-wider uppercase text-gray-400 mb-2">
                          Planned Server Specifications
                        </label>
                        <textarea
                          value={formData.serverSpecs}
                          onChange={(e) => handleInputChange('serverSpecs', e.target.value)}
                          className="w-full px-4 py-3 bg-black/60 border-2 border-white/20 text-sm focus:border-white/40 transition-colors resize-none"
                          rows={2}
                          placeholder="e.g., 128GB RAM, 4TB NVMe SSD, AMD EPYC 32-core"
                        />
                      </div>

                      {/* Bandwidth */}
                      <div>
                        <label className="block text-xs font-semibold tracking-wider uppercase text-gray-400 mb-2">
                          Network Bandwidth
                        </label>
                        <input
                          type="text"
                          value={formData.bandwidth}
                          onChange={(e) => handleInputChange('bandwidth', e.target.value)}
                          className="w-full px-4 py-3 bg-black/60 border-2 border-white/20 text-sm focus:border-white/40 transition-colors"
                          placeholder="e.g., 10 Gbps, 1 Gbps"
                        />
                      </div>

                      {/* Storage Capacity */}
                      <div>
                        <label className="block text-xs font-semibold tracking-wider uppercase text-gray-400 mb-2">
                          Total Storage Capacity
                        </label>
                        <input
                          type="text"
                          value={formData.storageCapacity}
                          onChange={(e) => handleInputChange('storageCapacity', e.target.value)}
                          className="w-full px-4 py-3 bg-black/60 border-2 border-white/20 text-sm focus:border-white/40 transition-colors"
                          placeholder="e.g., 4TB, 8TB, 16TB"
                        />
                      </div>

                      {/* Motivation */}
                      <div>
                        <label className="block text-xs font-semibold tracking-wider uppercase text-gray-400 mb-2">
                          Why do you want to become a WHISTLE provider?
                        </label>
                        <textarea
                          value={formData.motivation}
                          onChange={(e) => handleInputChange('motivation', e.target.value)}
                          className="w-full px-4 py-3 bg-black/60 border-2 border-white/20 text-sm focus:border-white/40 transition-colors resize-none"
                          rows={3}
                          placeholder="Share your motivation and goals..."
                        />
                      </div>

                      {/* Expected Volume */}
                      <div>
                        <label className="block text-xs font-semibold tracking-wider uppercase text-gray-400 mb-2">
                          Expected Query Volume
                        </label>
                        <input
                          type="text"
                          value={formData.expectedVolume}
                          onChange={(e) => handleInputChange('expectedVolume', e.target.value)}
                          className="w-full px-4 py-3 bg-black/60 border-2 border-white/20 text-sm focus:border-white/40 transition-colors"
                          placeholder="e.g., 100k queries/day, 1M queries/month"
                        />
                      </div>

                      {/* Additional Services */}
                      <div>
                        <label className="block text-xs font-semibold tracking-wider uppercase text-gray-400 mb-2">
                          What other services do you plan to offer?
                        </label>
                        <textarea
                          value={formData.additionalServices}
                          onChange={(e) => handleInputChange('additionalServices', e.target.value)}
                          className="w-full px-4 py-3 bg-black/60 border-2 border-white/20 text-sm focus:border-white/40 transition-colors resize-none"
                          rows={2}
                          placeholder="e.g., WebSocket support, historical data, custom indexing..."
                        />
                      </div>

                      {/* Questions */}
                      <div>
                        <label className="block text-xs font-semibold tracking-wider uppercase text-gray-400 mb-2">
                          Any questions for us?
                        </label>
                        <textarea
                          value={formData.questions}
                          onChange={(e) => handleInputChange('questions', e.target.value)}
                          className="w-full px-4 py-3 bg-black/60 border-2 border-white/20 text-sm focus:border-white/40 transition-colors resize-none"
                          rows={3}
                          placeholder="Ask us anything about the provider program, technical requirements, economics, etc..."
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setStep(2)}
                        className="btn-primary flex-1"
                        disabled={loading}
                      >
                        Back
                      </button>
                      <button
                        onClick={handleSubmit}
                        className="btn-primary flex-1"
                        disabled={loading}
                      >
                        {loading ? 'Submitting...' : 'Submit Application'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

