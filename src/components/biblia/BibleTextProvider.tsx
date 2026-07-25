import { createContext, useContext } from 'react';
import type { BiblePassage } from '@/lib/bible/provider';
import { getBiblePassage } from '@/lib/bible/provider';

interface BibleTextContextValue {
  getPassage: (reference: string, translation?: string) => Promise<BiblePassage>;
}

export const BibleTextContext = createContext<BibleTextContextValue | null>(null);

export function BibleTextProvider({ children }: { children: React.ReactNode }) {
  return (
    <BibleTextContext.Provider value={{ getPassage: getBiblePassage }}>
      {children}
    </BibleTextContext.Provider>
  );
}

export function useBibleText() {
  const ctx = useContext(BibleTextContext);
  if (!ctx) throw new Error('useBibleText debe usarse dentro de BibleTextProvider');
  return ctx;
}
