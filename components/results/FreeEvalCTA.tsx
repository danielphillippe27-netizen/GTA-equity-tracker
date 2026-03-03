'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { GlowButton, GradientText } from '@/components/shared';
import Image from 'next/image';

interface FreeEvalCTAProps {
  estimateId?: string | null;
  className?: string;
}

export function FreeEvalCTA({ estimateId, className }: FreeEvalCTAProps) {
  const router = useRouter();

  const targetHref = estimateId
    ? `/evaluation/request?estimateId=${encodeURIComponent(estimateId)}`
    : '/evaluation/request';

  return (
    <motion.div
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent-blue/5 via-accent-cyan/5 to-background border border-accent-blue/20 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/10 via-transparent to-accent-cyan/10 opacity-50" />

      <div className="relative grid gap-8 p-8 sm:p-12 md:grid-cols-2">
        <div className="flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <h3 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
              <GradientText>Free</GradientText>
              <br />
              Home Evaluation
            </h3>
            <div className="mb-6 space-y-2">
              <p className="text-lg font-medium text-foreground">
                The Phillippe Group
              </p>
            </div>
            <GlowButton
              onClick={() => router.push(targetHref)}
              className="w-full sm:w-auto"
            >
              Get Your Free Home Evaluation
            </GlowButton>
          </motion.div>
        </div>

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
  );
}
