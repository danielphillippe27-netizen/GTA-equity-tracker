import { v4 as uuidv4 } from 'uuid';
import { supabase, isSupabaseConfigured } from './supabase/client';

const SESSION_KEY = 'gta_equity_session_id';

// Get or create an anonymous session ID
export function getSessionId(): string {
  if (typeof window === 'undefined') {
    // Server-side - generate a new one (will be replaced client-side)
    return uuidv4();
  }

  // Check localStorage first
  let sessionId = localStorage.getItem(SESSION_KEY);
  
  if (!sessionId) {
    sessionId = uuidv4();
    localStorage.setItem(SESSION_KEY, sessionId);
  }

  return sessionId;
}

// Create or retrieve session from database
export async function initializeSession(): Promise<string> {
  const sessionId = getSessionId();

  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, using local session only');
    return sessionId;
  }

  try {
    // Check if session exists
    const { data: existingSession } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .single();

    if (!existingSession) {
      // Create new session
      const { error } = await supabase.from('sessions').insert({
        metadata: {
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
          referrer: typeof document !== 'undefined' ? document.referrer : undefined,
          entryUrl: typeof window !== 'undefined' ? window.location.href : undefined,
        },
      });

      if (error) {
        console.error('Failed to create session:', error);
      }
    }
  } catch (error) {
    console.error('Session initialization error:', error);
  }

  return sessionId;
}

// Update session activity
export async function updateSessionActivity(sessionId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    await supabase
      .from('sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', sessionId);
  } catch (error) {
    console.error('Failed to update session activity:', error);
  }
}

// Clear session (for testing/reset)
export function clearSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY);
  }
}
