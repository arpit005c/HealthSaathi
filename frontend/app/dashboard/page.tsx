'use client';

import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, PhoneCall, XCircle } from 'lucide-react';

type CallRecord = {
  call_id: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  channel: string;
  outcome: 'SUCCESS' | 'FAILED';
  failure_reason: string | null;
};

type AnalyticsData = {
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  success_rate: number;
  recent_calls: CallRecord[];
};

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAnalytics() {
    try {
      const response = await fetch('/api/analytics', {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Failed to load analytics');
      }

      const analytics = await response.json();
      setData(analytics);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Unable to load call analytics.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();

    const interval = setInterval(loadAnalytics, 5000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground">Loading HealthSaathi analytics...</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex min-h-svh items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Analytics unavailable</h1>
          <p className="text-muted-foreground mt-2">{error ?? 'No analytics data available.'}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-background min-h-svh px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <header className="animate-in fade-in slide-in-from-bottom-4 mb-10 duration-500">
          <div className="flex items-center gap-2">
            <Activity className="text-primary size-5" />
            <p className="text-primary text-sm font-bold tracking-widest uppercase">
              HealthSaathi Analytics
            </p>
          </div>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">Call Performance</h1>
          <p className="text-muted-foreground mt-2">
            Real-time insights and metrics for your secure voice agent.
          </p>
        </header>

        <section className="animate-in fade-in slide-in-from-bottom-6 fill-mode-both grid gap-4 duration-700 md:grid-cols-3">
          <MetricCard
            title="Total Calls"
            value={data.total_calls}
            description="All recorded conversations"
            icon={<PhoneCall className="size-5" />}
          />

          <MetricCard
            title="Successful Calls"
            value={data.successful_calls}
            description="Completed without errors"
            icon={<CheckCircle2 className="size-5 text-emerald-500" />}
          />

          <MetricCard
            title="Failed Calls"
            value={data.failed_calls}
            description="Calls that did not complete"
            icon={<XCircle className="text-destructive/70 size-5" />}
          />
        </section>

        <section className="from-primary/5 via-card to-card border-primary/10 animate-in fade-in slide-in-from-bottom-8 fill-mode-both mt-6 rounded-2xl border bg-gradient-to-br p-6 shadow-sm transition-all delay-150 duration-300 duration-700 hover:shadow-md">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold">Overall Success Rate</h2>
              <p className="text-muted-foreground text-sm">
                Percentage of successfully completed medical consultations.
              </p>
            </div>
            <div className="text-primary text-5xl font-bold tracking-tight drop-shadow-sm">
              {data.success_rate}%
            </div>
          </div>
        </section>

        <section className="bg-card/50 border-primary/10 animate-in fade-in slide-in-from-bottom-8 fill-mode-both mt-6 rounded-2xl border p-6 shadow-sm backdrop-blur-sm delay-300 duration-700">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Recent Consultations</h2>
            <p className="text-muted-foreground text-sm">
              Latest recorded HealthSaathi voice interactions.
            </p>
          </div>

          <div className="border-border/50 overflow-x-auto rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50">
                <tr className="border-border/50 border-b">
                  <th className="text-muted-foreground px-4 py-3 font-semibold">Time</th>
                  <th className="text-muted-foreground px-4 py-3 font-semibold">Duration</th>
                  <th className="text-muted-foreground px-4 py-3 font-semibold">Channel</th>
                  <th className="text-muted-foreground px-4 py-3 font-semibold">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_calls.map((call) => (
                  <tr
                    key={call.call_id}
                    className="border-border/50 hover:bg-muted/30 border-b transition-colors last:border-0"
                  >
                    <td className="px-4 py-4 font-medium">{formatTime(call.started_at)}</td>
                    <td className="text-muted-foreground px-4 py-4">{call.duration_seconds}s</td>
                    <td className="text-muted-foreground px-4 py-4 capitalize">{call.channel}</td>
                    <td className="px-4 py-4">
                      <span
                        className={
                          call.outcome === 'SUCCESS'
                            ? 'inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive-foreground inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold'
                        }
                      >
                        {call.outcome}
                      </span>
                    </td>
                  </tr>
                ))}

                {data.recent_calls.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-muted-foreground px-4 py-8 text-center">
                      No consultations recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: number;
  description: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-card/60 border-primary/10 hover:border-primary/20 rounded-2xl border p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm font-semibold">{title}</p>
        {icon && <div className="text-muted-foreground/60">{icon}</div>}
      </div>
      <p className="mt-4 text-4xl font-bold tracking-tight">{value}</p>
      <p className="text-muted-foreground mt-2 text-xs">{description}</p>
    </div>
  );
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleString([], {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}
