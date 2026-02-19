import { useEffect, useState } from 'react';
import { LivingAppsService } from '@/services/livingAppsService';
import type { Dozenten, Teilnehmer, Raeume, Kurse, Anmeldungen } from '@/types/app';
import { Link } from 'react-router-dom';
import {
  BookOpen, Users, GraduationCap, DoorOpen,
  TrendingUp, CheckCircle2, Clock, ChevronRight
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { de } from 'date-fns/locale';

function KpiCard({
  title, value, subtitle, icon: Icon, color, href
}: {
  title: string; value: string | number; subtitle?: string;
  icon: React.ElementType; color: 'brand' | 'green' | 'amber' | 'slate';
  href?: string;
}) {
  const colorMap = {
    brand: { bg: 'bg-[hsl(243,100%,97%)]', icon: 'text-[hsl(243,75%,49%)]', ring: 'bg-[hsl(243,75%,49%)]' },
    green: { bg: 'bg-[hsl(152,69%,94%)]', icon: 'text-[hsl(152,69%,31%)]', ring: 'bg-[hsl(152,69%,31%)]' },
    amber: { bg: 'bg-[hsl(38,100%,93%)]', icon: 'text-[hsl(38,92%,40%)]', ring: 'bg-[hsl(38,92%,50%)]' },
    slate: { bg: 'bg-[hsl(220,14%,93%)]', icon: 'text-[hsl(220,9%,40%)]', ring: 'bg-[hsl(220,9%,46%)]' },
  };
  const c = colorMap[color];
  const inner = (
    <div className="stat-card-base rounded-2xl p-5 flex items-center gap-4 hover:shadow-[var(--shadow-elevated)] transition-all duration-200 group cursor-default">
      <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={22} className={c.icon} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        <p className="text-3xl font-bold tracking-tight mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
      </div>
      {href && <ChevronRight size={16} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0" />}
    </div>
  );
  if (href) return <Link to={href} className="block">{inner}</Link>;
  return inner;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    aktiv: 'badge-aktiv',
    geplant: 'badge-geplant',
    abgeschlossen: 'badge-abgeschlossen',
    abgesagt: 'badge-abgesagt',
  };
  const labels: Record<string, string> = {
    aktiv: 'Aktiv', geplant: 'Geplant', abgeschlossen: 'Abgeschlossen', abgesagt: 'Abgesagt',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${map[status] ?? ''}`}>
      {labels[status] ?? status}
    </span>
  );
}

export default function DashboardOverview() {
  const [dozenten, setDozenten] = useState<Dozenten[]>([]);
  const [teilnehmer, setTeilnehmer] = useState<Teilnehmer[]>([]);
  const [raeume, setRaeume] = useState<Raeume[]>([]);
  const [kurse, setKurse] = useState<Kurse[]>([]);
  const [anmeldungen, setAnmeldungen] = useState<Anmeldungen[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAll() {
      try {
        const [d, t, r, k, a] = await Promise.all([
          LivingAppsService.getDozenten(),
          LivingAppsService.getTeilnehmer(),
          LivingAppsService.getRaeume(),
          LivingAppsService.getKurse(),
          LivingAppsService.getAnmeldungen(),
        ]);
        setDozenten(d);
        setTeilnehmer(t);
        setRaeume(r);
        setKurse(k);
        setAnmeldungen(a);
      } catch (e) {
        console.error('Failed to load stats:', e);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  const today = startOfDay(new Date());
  const aktiveKurse = kurse.filter(k => k.fields.status === 'aktiv').length;
  const geplantKurse = kurse.filter(k => k.fields.status === 'geplant').length;
  const bezahlt = anmeldungen.filter(a => a.fields.bezahlt === true).length;
  const offen = anmeldungen.filter(a => a.fields.bezahlt !== true).length;

  const gesamtUmsatz = kurse.reduce((sum, k) => {
    const preis = k.fields.preis ?? 0;
    const anmeldungenFuerKurs = anmeldungen.filter(a => {
      if (!a.fields.kurs) return false;
      return a.fields.kurs.includes(k.record_id);
    });
    return sum + preis * anmeldungenFuerKurs.filter(a => a.fields.bezahlt).length;
  }, 0);

  // Status chart data
  const statusData = [
    { name: 'Geplant', count: kurse.filter(k => k.fields.status === 'geplant').length, color: 'hsl(243,75%,59%)' },
    { name: 'Aktiv', count: kurse.filter(k => k.fields.status === 'aktiv').length, color: 'hsl(152,69%,35%)' },
    { name: 'Abgeschl.', count: kurse.filter(k => k.fields.status === 'abgeschlossen').length, color: 'hsl(220,9%,60%)' },
    { name: 'Abgesagt', count: kurse.filter(k => k.fields.status === 'abgesagt').length, color: 'hsl(0,84%,60%)' },
  ];

  // Upcoming kurse (next 3)
  const upcomingKurse = kurse
    .filter(k => k.fields.startdatum && !isBefore(parseISO(k.fields.startdatum), today))
    .sort((a, b) => (a.fields.startdatum ?? '').localeCompare(b.fields.startdatum ?? ''))
    .slice(0, 4);

  // Recent anmeldungen
  const recentAnmeldungen = [...anmeldungen]
    .sort((a, b) => (b.fields.anmeldedatum ?? '').localeCompare(a.fields.anmeldedatum ?? ''))
    .slice(0, 5);

  const getTeilnehmerName = (url: string) => {
    const id = url.split('/').pop();
    return teilnehmer.find(t => t.record_id === id)?.fields.name ?? '—';
  };

  const getKursTitle = (url: string) => {
    const id = url.split('/').pop();
    return kurse.find(k => k.record_id === id)?.fields.titel ?? '—';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Hero Banner */}
      <div
        className="rounded-2xl p-7 text-white overflow-hidden relative"
        style={{ background: 'var(--gradient-hero)' }}
      >
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 80% 50%, hsl(243,75%,70%) 0%, transparent 60%)'
          }}
        />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-60 mb-1">Kursverwaltung</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Guten Tag!</h1>
          <p className="text-sm opacity-70 mt-1.5 max-w-sm">
            Übersicht über alle Kurse, Dozenten, Teilnehmer und Anmeldungen in Ihrem System.
          </p>
          <div className="flex gap-6 mt-5">
            <div>
              <p className="text-2xl font-bold">{kurse.length}</p>
              <p className="text-xs opacity-60">Kurse gesamt</p>
            </div>
            <div className="w-px bg-white/20" />
            <div>
              <p className="text-2xl font-bold">{anmeldungen.length}</p>
              <p className="text-xs opacity-60">Anmeldungen</p>
            </div>
            <div className="w-px bg-white/20" />
            <div>
              <p className="text-2xl font-bold">
                {gesamtUmsatz > 0
                  ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(gesamtUmsatz)
                  : '—'}
              </p>
              <p className="text-xs opacity-60">Umsatz (bezahlt)</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <KpiCard title="Dozenten" value={dozenten.length} subtitle="im System" icon={GraduationCap} color="brand" href="/dozenten" />
        <KpiCard title="Teilnehmer" value={teilnehmer.length} subtitle="registriert" icon={Users} color="slate" href="/teilnehmer" />
        <KpiCard title="Räume" value={raeume.length} subtitle="verfügbar" icon={DoorOpen} color="slate" href="/raeume" />
        <KpiCard title="Aktive Kurse" value={aktiveKurse} subtitle={`${geplantKurse} geplant`} icon={BookOpen} color="green" href="/kurse" />
        <KpiCard title="Bezahlt" value={bezahlt} subtitle={`${offen} ausstehend`} icon={CheckCircle2} color="amber" href="/anmeldungen" />
      </div>

      {/* Charts + Lists Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Bar chart — Kurse nach Status */}
        <div className="lg:col-span-2 stat-card-base rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kurse</p>
              <h3 className="text-base font-bold mt-0.5">Nach Status</h3>
            </div>
            <TrendingUp size={18} className="text-muted-foreground" />
          </div>
          {kurse.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Noch keine Kurse</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={statusData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220,13%,91%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(220,9%,46%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(220,9%,46%)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid hsl(220,13%,89%)', fontSize: 12 }}
                  cursor={{ fill: 'hsl(220,14%,96%)' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Upcoming Courses */}
        <div className="lg:col-span-3 stat-card-base rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Demnächst</p>
              <h3 className="text-base font-bold mt-0.5">Kommende Kurse</h3>
            </div>
            <Link to="/kurse" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
              Alle <ChevronRight size={12} />
            </Link>
          </div>
          {upcomingKurse.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Keine kommenden Kurse</div>
          ) : (
            <div className="space-y-3">
              {upcomingKurse.map(kurs => (
                <div key={kurs.record_id} className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(220,20%,97%)] hover:bg-[hsl(220,20%,95%)] transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <BookOpen size={16} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{kurs.fields.titel}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {kurs.fields.startdatum
                        ? format(parseISO(kurs.fields.startdatum), 'dd. MMM yyyy', { locale: de })
                        : '—'}
                      {kurs.fields.preis ? ` · ${kurs.fields.preis} €` : ''}
                    </p>
                  </div>
                  <StatusBadge status={kurs.fields.status ?? 'geplant'} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Anmeldungen */}
      <div className="stat-card-base rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aktivität</p>
            <h3 className="text-base font-bold mt-0.5">Neueste Anmeldungen</h3>
          </div>
          <Link to="/anmeldungen" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
            Alle <ChevronRight size={12} />
          </Link>
        </div>
        {recentAnmeldungen.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">Noch keine Anmeldungen</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold text-muted-foreground pb-3 pr-4">Teilnehmer</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground pb-3 pr-4">Kurs</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground pb-3 pr-4">Datum</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentAnmeldungen.map(a => (
                  <tr key={a.record_id} className="border-b border-border/50 last:border-0">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {a.fields.teilnehmer ? getTeilnehmerName(a.fields.teilnehmer).charAt(0).toUpperCase() : '?'}
                        </div>
                        <span className="text-sm font-medium">{a.fields.teilnehmer ? getTeilnehmerName(a.fields.teilnehmer) : '—'}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-sm text-muted-foreground">
                      {a.fields.kurs ? getKursTitle(a.fields.kurs) : '—'}
                    </td>
                    <td className="py-3 pr-4 text-sm text-muted-foreground">
                      {a.fields.anmeldedatum
                        ? format(parseISO(a.fields.anmeldedatum), 'dd.MM.yyyy')
                        : '—'}
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${a.fields.bezahlt ? 'badge-bezahlt' : 'badge-offen'}`}>
                        {a.fields.bezahlt ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                        {a.fields.bezahlt ? 'Bezahlt' : 'Offen'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
