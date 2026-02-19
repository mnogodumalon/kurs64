import { useEffect, useState } from 'react';
import { LivingAppsService } from '@/services/livingAppsService';
import type { Dozenten, Teilnehmer, Raeume, Kurse, Anmeldungen } from '@/types/app';
import { GraduationCap, Users, DoorOpen, BookOpen, ClipboardList, TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, parseISO, isAfter, startOfToday } from 'date-fns';
import { de } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  variant?: 'primary' | 'accent' | 'teal' | 'default';
  href?: string;
  sub?: string;
}

function KpiCard({ title, value, icon, variant = 'default', href, sub }: KpiCardProps) {
  const variantClass = variant === 'primary' ? 'kpi-primary' : variant === 'accent' ? 'kpi-accent' : variant === 'teal' ? 'kpi-teal' : 'kpi-default';
  const isDark = variant === 'primary' || variant === 'teal';
  const isLight = variant === 'accent';

  const inner = (
    <div className={`rounded-xl p-5 ${variantClass} transition-all duration-200 hover:scale-[1.02]`} style={{ cursor: href ? 'pointer' : 'default' }}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${isDark ? 'bg-white/15' : isLight ? 'bg-black/10' : 'bg-primary/8'}`}>
          <span className={isDark ? 'text-white/90' : isLight ? 'text-accent-foreground' : 'text-primary'}>{icon}</span>
        </div>
        <TrendingUp size={14} className={isDark ? 'text-white/40' : isLight ? 'text-accent-foreground/40' : 'text-muted-foreground'} />
      </div>
      <div className={`text-3xl font-bold tracking-tight ${isDark ? 'text-white' : isLight ? 'text-accent-foreground' : 'text-foreground'}`}>
        {value}
      </div>
      <div className={`text-xs font-medium mt-1 ${isDark ? 'text-white/65' : isLight ? 'text-accent-foreground/65' : 'text-muted-foreground'}`}>
        {title}
      </div>
      {sub && (
        <div className={`text-xs mt-0.5 ${isDark ? 'text-white/40' : 'text-muted-foreground/60'}`}>{sub}</div>
      )}
    </div>
  );

  return href ? <Link to={href} className="block">{inner}</Link> : inner;
}

export default function DashboardOverview() {
  const [dozenten, setDozenten] = useState<Dozenten[]>([]);
  const [teilnehmer, setTeilnehmer] = useState<Teilnehmer[]>([]);
  const [raeume, setRaeume] = useState<Raeume[]>([]);
  const [kurse, setKurse] = useState<Kurse[]>([]);
  const [anmeldungen, setAnmeldungen] = useState<Anmeldungen[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      LivingAppsService.getDozenten(),
      LivingAppsService.getTeilnehmer(),
      LivingAppsService.getRaeume(),
      LivingAppsService.getKurse(),
      LivingAppsService.getAnmeldungen(),
    ]).then(([d, t, r, k, a]) => {
      setDozenten(d);
      setTeilnehmer(t);
      setRaeume(r);
      setKurse(k);
      setAnmeldungen(a);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const today = startOfToday();
  const bezahltCount = anmeldungen.filter(a => a.fields.bezahlt).length;
  const offenCount = anmeldungen.length - bezahltCount;

  // Chart: anmeldungen per kurs
  const kursAnmeldungenMap = new Map<string, number>();
  anmeldungen.forEach(a => {
    if (a.fields.kurs) {
      const id = a.fields.kurs.split('/').pop() ?? '';
      kursAnmeldungenMap.set(id, (kursAnmeldungenMap.get(id) ?? 0) + 1);
    }
  });

  const chartData = kurse
    .map(k => ({
      name: k.fields.titel ? (k.fields.titel.length > 16 ? k.fields.titel.slice(0, 14) + '…' : k.fields.titel) : '—',
      anmeldungen: kursAnmeldungenMap.get(k.record_id) ?? 0,
    }))
    .slice(0, 8);

  // Upcoming
  const upcomingKurse = kurse
    .filter(k => k.fields.startdatum && isAfter(parseISO(k.fields.startdatum), today))
    .sort((a, b) => {
      const da = a.fields.startdatum ? parseISO(a.fields.startdatum).getTime() : 0;
      const db = b.fields.startdatum ? parseISO(b.fields.startdatum).getTime() : 0;
      return da - db;
    })
    .slice(0, 5);

  // Recent anmeldungen
  const recentAnmeldungen = [...anmeldungen]
    .sort((a, b) => {
      const da = a.fields.anmeldedatum ? parseISO(a.fields.anmeldedatum).getTime() : 0;
      const db = b.fields.anmeldedatum ? parseISO(b.fields.anmeldedatum).getTime() : 0;
      return db - da;
    })
    .slice(0, 5);

  const teilnehmerMap = new Map(teilnehmer.map(t => [t.record_id, t.fields.name ?? '—']));
  const kurseMap = new Map(kurse.map(k => [k.record_id, k.fields.titel ?? '—']));

  return (
    <div className="space-y-8 max-w-6xl">
      {/* HERO */}
      <div className="dashboard-hero px-8 py-8">
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'oklch(0.85 0.05 245)' }}>
            Kursverwaltungssystem
          </p>
          <h1 className="text-3xl font-bold tracking-tight mb-1" style={{ color: 'oklch(0.985 0 0)' }}>
            Willkommen zurück
          </h1>
          <p className="text-sm max-w-lg" style={{ color: 'oklch(0.75 0.02 245)' }}>
            Verwalten Sie Kurse, Dozenten, Teilnehmer und Räume an einem Ort.
          </p>
          <div className="flex flex-wrap items-center gap-6 mt-6 pt-5 border-t" style={{ borderColor: 'oklch(1 0 0 / 0.12)' }}>
            <div>
              <span className="text-2xl font-bold" style={{ color: 'oklch(0.985 0 0)' }}>{loading ? '–' : kurse.length}</span>
              <span className="text-xs ml-2" style={{ color: 'oklch(0.65 0.02 245)' }}>Kurse gesamt</span>
            </div>
            <div className="w-px h-8" style={{ background: 'oklch(1 0 0 / 0.15)' }} />
            <div>
              <span className="text-2xl font-bold" style={{ color: 'oklch(0.985 0 0)' }}>{loading ? '–' : anmeldungen.length}</span>
              <span className="text-xs ml-2" style={{ color: 'oklch(0.65 0.02 245)' }}>Anmeldungen</span>
            </div>
            <div className="w-px h-8" style={{ background: 'oklch(1 0 0 / 0.15)' }} />
            <div>
              <span className="text-2xl font-bold" style={{ color: 'oklch(0.985 0 0)' }}>{loading ? '–' : bezahltCount}</span>
              <span className="text-xs ml-2" style={{ color: 'oklch(0.65 0.02 245)' }}>Bezahlt</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI ROW */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard title="Dozenten" value={loading ? '–' : dozenten.length} icon={<GraduationCap size={18} />} variant="primary" href="/dozenten" />
        <KpiCard title="Teilnehmer" value={loading ? '–' : teilnehmer.length} icon={<Users size={18} />} variant="accent" href="/teilnehmer" />
        <KpiCard title="Räume" value={loading ? '–' : raeume.length} icon={<DoorOpen size={18} />} variant="teal" href="/raeume" />
        <KpiCard title="Kurse" value={loading ? '–' : kurse.length} icon={<BookOpen size={18} />} variant="default" href="/kurse" />
        <KpiCard title="Offen" value={loading ? '–' : offenCount} icon={<ClipboardList size={18} />} variant="default" sub="unbezahlte Anmeldungen" href="/anmeldungen" />
      </div>

      {/* CHART + UPCOMING */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="chart-panel p-6 lg:col-span-3">
          <h2 className="text-sm font-semibold text-foreground mb-0.5">Anmeldungen je Kurs</h2>
          <p className="text-xs text-muted-foreground mb-5">Anzahl der Anmeldungen pro Kurs</p>
          {loading || chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              {loading ? 'Lade Daten…' : 'Noch keine Kurse vorhanden.'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barGap={4}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'IBM Plex Sans' }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={26} />
                <Tooltip
                  contentStyle={{ fontFamily: 'IBM Plex Sans', fontSize: 12, borderRadius: 8, border: '1px solid oklch(0.9 0.012 245)', boxShadow: '0 4px 16px oklch(0.18 0.05 240 / 0.12)' }}
                  cursor={{ fill: 'oklch(0.38 0.1 240 / 0.06)' }}
                />
                <Bar dataKey="anmeldungen" name="Anmeldungen" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={i % 2 === 0 ? 'oklch(0.38 0.1 240)' : 'oklch(0.55 0.12 175)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-panel p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold text-foreground mb-0.5">Kommende Kurse</h2>
          <p className="text-xs text-muted-foreground mb-4">Nächste Kurse nach Startdatum</p>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}
            </div>
          ) : upcomingKurse.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine kommenden Kurse.</p>
          ) : (
            <div className="space-y-2">
              {upcomingKurse.map(k => (
                <div key={k.record_id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="p-1.5 rounded-md bg-primary/10 shrink-0 mt-0.5">
                    <Clock size={13} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{k.fields.titel ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      {k.fields.startdatum ? format(parseISO(k.fields.startdatum), 'dd. MMM yyyy', { locale: de }) : '—'}
                      {k.fields.preis != null && (
                        <span className="ml-2 font-semibold text-foreground">{k.fields.preis.toFixed(2)} €</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RECENT + PAYMENT STATUS */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="chart-panel p-6 lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Letzte Anmeldungen</h2>
              <p className="text-xs text-muted-foreground">Zuletzt eingetragene Anmeldungen</p>
            </div>
            <Link to="/anmeldungen" className="text-xs font-medium text-primary hover:underline">Alle anzeigen →</Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}
            </div>
          ) : recentAnmeldungen.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Anmeldungen vorhanden.</p>
          ) : (
            <div className="space-y-2">
              {recentAnmeldungen.map(a => {
                const tnId = a.fields.teilnehmer?.split('/').pop() ?? '';
                const kId = a.fields.kurs?.split('/').pop() ?? '';
                return (
                  <div key={a.record_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{teilnehmerMap.get(tnId) ?? '—'}</p>
                      <p className="text-xs text-muted-foreground truncate">{kurseMap.get(kId) ?? '—'}</p>
                    </div>
                    <div className="shrink-0 ml-3">
                      {a.fields.bezahlt ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'oklch(0.92 0.06 142)', color: 'oklch(0.35 0.12 142)', border: '1px solid oklch(0.82 0.08 142)' }}>
                          <CheckCircle2 size={11} /> Bezahlt
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'oklch(0.95 0.06 65)', color: 'oklch(0.45 0.14 60)', border: '1px solid oklch(0.85 0.09 65)' }}>
                          <Clock size={11} /> Offen
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="chart-panel p-6 lg:col-span-2 flex flex-col">
          <h2 className="text-sm font-semibold text-foreground mb-0.5">Zahlungsstatus</h2>
          <p className="text-xs text-muted-foreground mb-6">Übersicht bezahlt vs. ausstehend</p>
          <div className="flex-1 flex flex-col justify-center gap-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-foreground flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: 'oklch(0.55 0.17 142)' }} />
                  Bezahlt
                </span>
                <span className="text-sm font-bold text-foreground">{loading ? '–' : bezahltCount}</span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: anmeldungen.length ? `${(bezahltCount / anmeldungen.length) * 100}%` : '0%',
                    background: 'oklch(0.55 0.17 142)'
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-foreground flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: 'oklch(0.72 0.14 65)' }} />
                  Ausstehend
                </span>
                <span className="text-sm font-bold text-foreground">{loading ? '–' : offenCount}</span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: anmeldungen.length ? `${(offenCount / anmeldungen.length) * 100}%` : '0%',
                    background: 'oklch(0.72 0.14 65)'
                  }}
                />
              </div>
            </div>
            <div className="pt-4 mt-2 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Gesamt Anmeldungen</span>
              <span className="text-xl font-bold text-foreground">{loading ? '–' : anmeldungen.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
