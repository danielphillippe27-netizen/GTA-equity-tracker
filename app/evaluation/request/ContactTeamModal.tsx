'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, Mail, Phone, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ContactCard = {
  name: string;
  role: string;
  phoneDisplay: string;
  phoneHref: string;
  email: string;
  imageSrc: string;
  imageAlt: string;
  imageClassName: string;
  imagePosition?: 'left' | 'right';
};

interface ContactTeamModalProps {
  triggerLabel?: string;
  triggerClassName?: string;
}

const CONTACTS: ContactCard[] = [
  {
    name: 'Santana Phillippe',
    role: 'Sales Representative',
    phoneDisplay: '905-261-9598',
    phoneHref: 'tel:+19052619598',
    email: 'sphillippe@revelrealty.ca',
    imageSrc: '/7 Background Removed.png',
    imageAlt: 'Portrait of Santana Phillippe',
    imageClassName: 'scale-[1.18] object-[center_18%]',
    imagePosition: 'left',
  },
  {
    name: 'Daniel Phillippe',
    role: 'Sales Representative',
    phoneDisplay: '289-675-2788',
    phoneHref: 'tel:+12896752788',
    email: 'dphillippe@revelrealty.ca',
    imageSrc: '/8 Background Removed.png',
    imageAlt: 'Portrait of Daniel Phillippe',
    imageClassName: 'scale-[1.16] object-[center_14%]',
    imagePosition: 'right',
  },
];

export function ContactTeamModal({
  triggerLabel = 'Contact The Team Directly',
  triggerClassName,
}: ContactTeamModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          'inline-flex items-center justify-center rounded-full border border-white/12 px-5 py-3 text-sm font-medium text-white transition-colors hover:border-accent-blue/60 hover:bg-accent-blue/10',
          triggerClassName ||
            'sm:absolute sm:right-6 sm:top-1/2 sm:-translate-y-1/2'
        )}
      >
        {triggerLabel}
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setIsOpen(false);
              }
            }}
          >
            <div className="absolute inset-0 bg-black/78 backdrop-blur-[28px]" />

            <div className="relative flex min-h-screen items-center justify-center p-4 sm:p-6">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="contact-team-title"
              className="relative mx-auto flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] border border-white/8 bg-[linear-gradient(160deg,rgba(20,29,42,0.97),rgba(8,12,18,0.96))] shadow-2xl shadow-black/50 backdrop-blur-xl sm:max-h-[calc(100vh-3rem)]"
              initial={{ scale: 0.96, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 16 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative px-6 py-5 text-center sm:px-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="mx-auto max-w-2xl">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-accent-cyan">
                      The Phillippe Group
                    </p>
                    <h2
                      id="contact-team-title"
                      className="text-2xl font-semibold text-white sm:text-3xl"
                    >
                      Contact the team directly
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                      Call, email, or save the contact cards directly from here.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted-foreground transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
                    aria-label="Close contact card"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="relative overflow-y-auto px-6 py-6 sm:px-8 sm:py-7">
                <div className="mx-auto grid max-w-[48rem] gap-5 lg:grid-cols-2">
                {CONTACTS.map((contact) => (
                  <div
                    key={contact.email}
                    className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] p-5 backdrop-blur-md"
                  >
                    <div className="relative">
                      <div
                        className={`flex items-end gap-4 ${
                          contact.imagePosition === 'right'
                            ? 'flex-row-reverse'
                            : ''
                        }`}
                      >
                        <div className="relative h-52 w-36 shrink-0 overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(59,130,246,0.22),rgba(6,182,212,0.08))]">
                          <Image
                            src={contact.imageSrc}
                            alt={contact.imageAlt}
                            fill
                            sizes="(max-width: 1024px) 144px, 144px"
                            className={`object-contain object-bottom ${contact.imageClassName}`}
                          />
                        </div>

                        <div className="pb-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-cyan">
                            Revel Realty
                          </p>
                          <h3 className="mt-2 text-2xl font-semibold text-white">
                            {contact.name}
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {contact.role}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 space-y-3">
                        <a
                          href={contact.phoneHref}
                          className="flex items-center rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-left transition-colors hover:border-accent-blue/40 hover:bg-accent-blue/10"
                        >
                          <span className="flex items-center gap-3">
                            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/6 text-accent-cyan">
                              <Phone className="h-4 w-4" />
                            </span>
                            <span>
                              <span className="block text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                Phone
                              </span>
                              <span className="text-base font-medium text-white">
                                {contact.phoneDisplay}
                              </span>
                            </span>
                          </span>
                        </a>

                        <a
                          href={`mailto:${contact.email}`}
                          className="flex items-center rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-left transition-colors hover:border-accent-blue/40 hover:bg-accent-blue/10"
                        >
                          <span className="flex items-center gap-3">
                            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/6 text-accent-cyan">
                              <Mail className="h-4 w-4" />
                            </span>
                            <span>
                              <span className="block text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                Email
                              </span>
                              <span className="text-[0.95rem] font-medium text-white">
                                {contact.email}
                              </span>
                            </span>
                          </span>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              </div>

              <div className="relative flex flex-col items-center justify-center gap-3 px-6 py-5 text-center sm:px-8">
                <p className="text-sm text-muted-foreground">
                  On mobile, tapping a phone number opens a call right away.
                </p>
                <a
                  href="/phillippe-group-contacts.vcf"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 px-5 py-3 text-sm font-medium text-white transition-colors hover:border-accent-blue/60 hover:bg-accent-blue/10"
                >
                  <Download className="h-4 w-4" />
                  Save Contact Cards
                </a>
              </div>
            </motion.div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
