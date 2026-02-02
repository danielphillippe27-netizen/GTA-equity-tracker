'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth/AuthProvider';
import { supabase } from '@/lib/supabase/client';
import { GlowButton, GradientText } from '@/components/shared';
import { formatCurrency } from '@/lib/constants';
import { TrendingUp, Home, LogOut, LineChart, Calendar } from 'lucide-react';

interface Profile {
  id: string;
  email: string;
  name: string;
  property_data: {
    estimateId?: string;
    purchasePrice?: number;
    purchaseYear?: number;
    purchaseMonth?: number;
    estimatedCurrentValue?: number;
    mortgageAssumptions?: {
      interestRate: number;
      amortization: number;
      downPayment: number;
    };
    netEquity?: number;
  };
  primary_estimate_id: string | null;
}

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Fetch user profile
  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setProfile(data);
      }
      setLoadingProfile(false);
    }

    if (user) {
      fetchProfile();
    }
  }, [user]);

  // Handle sign out
  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  // Loading state
  if (loading || loadingProfile) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-accent-blue mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </main>
    );
  }

  // Not authenticated
  if (!user) {
    return null; // Will redirect
  }

  const propertyData = profile?.property_data || {};
  const firstName = profile?.name?.split(' ')[0] || 'there';

  return (
    <main className="min-h-screen bg-background">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-hero-gradient opacity-30 pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-foreground">
            GTA Equity Tracker
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {profile?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 pb-16">
        {/* Welcome Section */}
        <section className="py-8 sm:py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Welcome back, <GradientText>{firstName}</GradientText>
            </h1>
            <p className="text-muted-foreground">
              Here&apos;s your current equity position.
            </p>
          </motion.div>
        </section>

        {/* Equity Overview Card */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-accent-blue/10 to-accent-cyan/10 border border-accent-blue/20">
            {propertyData.netEquity ? (
              <>
                {/* Main Equity Display */}
                <div className="text-center mb-6">
                  <p className="text-sm text-muted-foreground mb-1">Your Estimated Net Equity</p>
                  <div className="text-4xl sm:text-5xl md:text-6xl font-bold mb-2">
                    <GradientText>{formatCurrency(propertyData.netEquity)}</GradientText>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Based on your {propertyData.purchaseYear} purchase
                  </p>
                </div>

                {/* Key Metrics */}
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-background/50 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Purchase Price</p>
                    <p className="text-lg font-semibold text-foreground">
                      {formatCurrency(propertyData.purchasePrice || 0)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-background/50 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Estimated Current Value</p>
                    <p className="text-lg font-semibold text-foreground">
                      {formatCurrency(propertyData.estimatedCurrentValue || 0)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-background/50 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Equity Gained</p>
                    <p className="text-lg font-semibold text-green-400">
                      +{formatCurrency((propertyData.estimatedCurrentValue || 0) - (propertyData.purchasePrice || 0))}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              /* No property data yet */
              <div className="text-center py-8">
                <Home className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No Property Data Yet
                </h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Calculate your home&apos;s equity to see your wealth position here.
                </p>
                <Link href="/">
                  <GlowButton>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Calculate My Equity
                  </GlowButton>
                </Link>
              </div>
            )}
          </div>
        </motion.section>

        {/* Monthly Tracking Info */}
        {propertyData.netEquity && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="p-6 rounded-xl bg-surface border border-border">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-accent-cyan/10">
                  <LineChart className="w-6 h-6 text-accent-cyan" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    Monthly Wealth Monitoring Active
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    We&apos;ll track GTA market changes and update your equity position each month.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Next update: First week of next month</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* Quick Actions */}
        <motion.section
          className="mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link href="/" className="block">
              <div className="p-4 rounded-xl bg-surface border border-border hover:border-accent-blue/50 transition-colors">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-accent-cyan" />
                  <div>
                    <p className="font-medium text-foreground">New Estimate</p>
                    <p className="text-xs text-muted-foreground">Calculate equity for another property</p>
                  </div>
                </div>
              </div>
            </Link>
            {propertyData.estimateId && (
              <Link href={`/results/${propertyData.estimateId}`} className="block">
                <div className="p-4 rounded-xl bg-surface border border-border hover:border-accent-blue/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <LineChart className="w-5 h-5 text-accent-cyan" />
                    <div>
                      <p className="font-medium text-foreground">View Full Report</p>
                      <p className="text-xs text-muted-foreground">See detailed charts and analysis</p>
                    </div>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </motion.section>
      </div>
    </main>
  );
}
