import { useEffect, useState } from "react";
import type { DailyLiturgy, LiturgicalEvent } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE as string | undefined;

export const FALLBACK_LITURGY: DailyLiturgy = {
  date: "2026-07-23",
  weekday: "Jueves",
  season: "Tiempo Ordinario",
  liturgicalColor: "Verde",
  saint: { name: "Santa Brígida de Suecia", title: "Religiosa, Patrona de Europa", initial: "B" },
  quote: { text: "Bienaventurados vuestros ojos, porque ven, y vuestros oídos, porque oyen.", ref: "Mt 13,16" },
  gospel: { ref: "Mateo 13,10-17", title: "¿Por qué les hablas en parábolas?", body: "En aquel tiempo, se acercaron los discípulos a Jesús y le preguntaron: «¿Por qué les hablas en parábolas?». Él les respondió: «A vosotros se os ha concedido conocer los misterios del reino de los cielos, pero a ellos no.»" },
  psalm: { ref: "Salmo 36(35),6-7ab.8-9.10-11", title: "Tú, Señor, eres mi esperanza.", body: "Señor, tu misericordia llega hasta el cielo, tu fidelidad hasta las nubes." },
  firstReading: { ref: "Jeremías 2,1-3.7-8.12-13", title: "Me abandonaron a mí, manantial de aguas vivas.", body: "La palabra del Señor vino a mí: «Ve y proclama a los oídos de Jerusalén...»" },
  laudes: { title: "Laudes del día", body: "Señor, abre mis labios, y mi boca proclamará tu alabanza." },
  reflection: "Jesús invita a cultivar una escucha interior que transforme la vida.",
  imagePrompt: "Sacred art scene, gentle light",
  imageUrl: "/images/daily.jpg",
  marian: { source: "Medjugorje", text: "Queridos hijos, hoy os invito a la oración con el corazón.", relevant: true },
};

export const TODAY_DAY = 23;

export const monthEvents: LiturgicalEvent[] = [
  { date: "2026-07-16", day: 16, label: "Ntra. Sra. del Carmen", rank: "memoria" },
  { date: "2026-07-17", day: 17, label: "Feria", rank: "feria" },
  { date: "2026-07-18", day: 18, label: "Feria", rank: "feria" },
  { date: "2026-07-19", day: 19, label: "Domingo XVI", rank: "fiesta" },
  { date: "2026-07-20", day: 20, label: "San Apolinar", rank: "memoria" },
  { date: "2026-07-21", day: 21, label: "San Lorenzo de Brindis", rank: "memoria" },
  { date: "2026-07-22", day: 22, label: "Sta. María Magdalena", rank: "fiesta" },
  { date: "2026-07-23", day: 23, label: "Sta. Brígida", rank: "fiesta" },
  { date: "2026-07-24", day: 24, label: "San Charbel", rank: "memoria" },
  { date: "2026-07-25", day: 25, label: "Santiago Apóstol", rank: "fiesta" },
  { date: "2026-07-26", day: 26, label: "Ss. Joaquín y Ana", rank: "memoria" },
  { date: "2026-07-27", day: 27, label: "Feria", rank: "feria" },
];

export const pastProgress: Record<number, { rosaries: number; done: boolean }> = {
  16: { rosaries: 1, done: true },
  17: { rosaries: 1, done: true },
  18: { rosaries: 0, done: false },
  19: { rosaries: 2, done: true },
  20: { rosaries: 1, done: true },
};

export function useTodayLiturgy() {
  const [liturgy, setLiturgy] = useState<DailyLiturgy>(FALLBACK_LITURGY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!API_BASE) return;
    let active = true;
    setLoading(true);
    fetch(`${API_BASE}/api/daily`)
      .then((r) => (r.ok ? r.json() : Promise.resolve(null)))
      .then((data) => {
        if (active && data?.date) setLiturgy(data as DailyLiturgy);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { liturgy, loading };
}
