'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, ValidationError } from '@formspree/react';
import { GlowButton, GradientText } from '@/components/shared';
import { X, Phone, CheckCircle } from 'lucide-react';
import Image from 'next/image';

interface FreeEvalCTAProps {
  className?: string;
}

export function FreeEvalCTA({ className }: FreeEvalCTAProps) {
  const [showModal, setShowModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [state, handleSubmit] = useForm('mjgekdbj');

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Get current page URL
    const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
    
    // Create form data with hidden fields
    const formData = new FormData(e.currentTarget);
    formData.append('source', 'GTA Equity Tracker - Free Eval CTA');
    formData.append('page_url', pageUrl);
    
    // Submit to Formspree
    await handleSubmit(e);
  };

  const closeModal = () => {
    setShowModal(false);
    setPhoneNumber('');
  };

  return (
    <>
      {/* CTA Block */}
      <motion.div
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent-blue/5 via-accent-cyan/5 to-background border border-accent-blue/20 ${className}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        {/* Background gradient glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/10 via-transparent to-accent-cyan/10 opacity-50" />
        
        <div className="relative grid md:grid-cols-2 gap-8 p-8 sm:p-12">
          {/* Left: Content */}
          <div className="flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <h3 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                <GradientText>Free</GradientText>
                <br />
                Home Evaluation
              </h3>
              <div className="mb-6 space-y-2">
                <p className="text-lg font-medium text-foreground">
                  The Phillippe Group
                </p>
                <p className="text-lg text-muted-foreground">
                  Combined 6 years of experience selling real estate.
                </p>
              </div>
              <GlowButton 
                onClick={() => setShowModal(true)}
                className="w-full sm:w-auto"
              >
                Get Your Free Home Evaluation
              </GlowButton>
            </motion.div>
          </div>

          {/* Right: Photos */}
          <motion.div
            className="grid gap-4 sm:grid-cols-2"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <div className="relative aspect-[1080/1350] overflow-hidden rounded-2xl border border-accent-blue/20 bg-slate-950/40">
              <div className="absolute inset-0 z-10 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              <Image
                src="/1.png"
                alt="Daniel Phillippe"
                fill
                className="object-cover object-center"
                sizes="(max-width: 640px) 100vw, 25vw"
                priority
              />
              <div className="absolute bottom-4 left-4 z-20 rounded-full bg-background/80 px-3 py-1 text-sm font-medium text-foreground backdrop-blur-sm">
                Daniel
              </div>
            </div>

            <div className="relative aspect-[1080/1350] overflow-hidden rounded-2xl border border-accent-cyan/20 bg-slate-950/40">
              <div className="absolute inset-0 z-10 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              <Image
                src="/2.png"
                alt="Santana Phillippe"
                fill
                className="object-cover object-center"
                sizes="(max-width: 640px) 100vw, 25vw"
              />
              <div className="absolute bottom-4 left-4 z-20 rounded-full bg-background/80 px-3 py-1 text-sm font-medium text-foreground backdrop-blur-sm">
                Santana
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
            />

            {/* Modal Content */}
            <motion.div
              className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Header */}
              <div className="p-6 border-b border-border">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-foreground mb-1">
                      Free Home Evaluation
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Get your precise estimate in minutes
                    </p>
                  </div>
                  <button
                    onClick={closeModal}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Form or Success State */}
              <div className="p-6">
                {state.succeeded ? (
                  <motion.div
                    className="text-center py-8"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-400" />
                    </div>
                    <h4 className="text-xl font-bold text-foreground mb-2">
                      Thank You!
                    </h4>
                    <p className="text-muted-foreground mb-6">
                      We&apos;ll contact you shortly with your detailed home evaluation.
                    </p>
                    <button
                      onClick={closeModal}
                      className="px-6 py-2 rounded-lg bg-accent-cyan/20 text-accent-cyan hover:bg-accent-cyan/30 transition-colors font-medium"
                    >
                      Close
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={onSubmit} className="space-y-4">
                    {/* Phone Number Input */}
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                          id="phone"
                          type="tel"
                          name="phone"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="(555) 123-4567"
                          required
                          className="w-full pl-11 pr-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-cyan/50 focus:border-accent-cyan transition-all"
                        />
                      </div>
                      <ValidationError 
                        prefix="Phone" 
                        field="phone"
                        errors={state.errors}
                        className="text-red-400 text-sm mt-1"
                      />
                    </div>

                    {/* Consent Text */}
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      By submitting, you agree to be contacted by text/call about your evaluation.
                    </p>

                    {/* Submit Button */}
                    <GlowButton
                      type="submit"
                      disabled={state.submitting}
                      className="w-full"
                    >
                      {state.submitting ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span className="ml-2">Submitting...</span>
                        </>
                      ) : (
                        'Get My Free Evaluation'
                      )}
                    </GlowButton>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
