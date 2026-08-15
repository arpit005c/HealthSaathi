'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  LifeBuoy,
  RefreshCw,
  ShieldAlert,
  Users,
} from 'lucide-react';

interface Escalation {
  reference_id: string;
  caller_id: string;
  summary: string;
  urgency: string;
  language: string;
  follow_up_method: string;
  status: string;
  created_at: string;
}

export default function HumanHelpPage() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadEscalations() {
    try {
      setError('');

      const response = await fetch('/api/escalations', {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Failed to load requests');
      }

      const data = await response.json();

      setEscalations(Array.isArray(data.escalations) ? data.escalations : []);
    } catch (err) {
      console.error(err);
      setError('Unable to load human-help requests.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEscalations();

    // Refresh every 5 seconds so new escalation requests
    // appear automatically.
    const interval = setInterval(loadEscalations, 5000);

    return () => clearInterval(interval);
  }, []);

  function urgencyClass(urgency: string) {
    switch (urgency.toUpperCase()) {
      case 'EMERGENCY':
        return 'border-destructive/40 bg-destructive/10 text-destructive dark:bg-destructive/20';

      case 'HIGH':
        return 'border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400';

      case 'MEDIUM':
        return 'border-yellow-500/40 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';

      default:
        return 'border-primary/40 bg-primary/10 text-primary';
    }
  }

  function statusClass(status: string) {
    switch (status.toUpperCase()) {
      case 'OPEN':
        return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
      case 'RESOLVED':
      case 'CLOSED':
        return 'border-muted bg-muted text-muted-foreground';
      default:
        return 'border-primary/40 bg-primary/10 text-primary';
    }
  }

  function formatDate(value: string) {
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  }

  return (
    <main className="bg-background text-foreground min-h-screen px-6 py-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="animate-in fade-in slide-in-from-bottom-4 mb-8 flex flex-col gap-4 duration-500 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <LifeBuoy className="text-primary size-5" />
              <p className="text-primary text-xs font-bold tracking-widest uppercase">
                HealthSaathi Support Center
              </p>
            </div>

            <h1 className="text-3xl font-bold tracking-tight">Human Help Dashboard</h1>

            <p className="text-muted-foreground mt-1 text-sm">
              Review and manage urgent clinical requests escalated by the HealthSaathi voice agent.
            </p>
          </div>

          <button
            onClick={loadEscalations}
            className="bg-card hover:bg-muted/80 text-foreground border-primary/20 inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow active:translate-y-0"
          >
            <RefreshCw className="text-muted-foreground size-4" />
            Refresh Requests
          </button>
        </div>

        {/* Summary cards */}
        <div className="animate-in fade-in slide-in-from-bottom-6 fill-mode-both mb-8 grid gap-4 duration-700 sm:grid-cols-3">
          <div className="bg-card/60 border-primary/10 rounded-2xl border p-5 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm font-semibold">Total Requests</p>
              <Users className="text-muted-foreground/60 size-4" />
            </div>

            <p className="mt-3 text-3xl font-bold tracking-tight">{escalations.length}</p>
            <p className="text-muted-foreground mt-1 text-xs">All escalated cases</p>
          </div>

          <div className="bg-card/60 border-primary/10 rounded-2xl border p-5 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm font-semibold">Open Requests</p>
              <Clock className="size-4 text-emerald-500" />
            </div>

            <p className="mt-3 text-3xl font-bold tracking-tight">
              {escalations.filter((item) => item.status.toUpperCase() === 'OPEN').length}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">Require clinical attention</p>
          </div>

          <div className="bg-card/60 border-primary/10 rounded-2xl border p-5 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm font-semibold">Emergency Cases</p>
              <ShieldAlert className="text-destructive size-4" />
            </div>

            <p className="text-destructive mt-3 text-3xl font-bold tracking-tight">
              {escalations.filter((item) => item.urgency.toUpperCase() === 'EMERGENCY').length}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">High priority medical alerts</p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="border-primary/10 bg-card/60 text-muted-foreground rounded-2xl border p-12 text-center shadow-sm backdrop-blur-sm">
            <div className="border-primary mx-auto mb-3 size-6 animate-spin rounded-full border-2 border-t-transparent"></div>
            <p className="font-medium">Loading human-help requests...</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-2xl border p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <AlertTriangle className="size-5 shrink-0" />
              <p className="font-semibold">{error}</p>
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && escalations.length === 0 && (
          <div className="border-primary/10 bg-card/60 rounded-2xl border p-16 text-center shadow-sm backdrop-blur-sm">
            <div className="bg-primary/15 text-primary mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              <CheckCircle2 className="size-6" />
            </div>

            <h2 className="text-lg font-semibold">No human-help requests</h2>

            <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">
              All clear! Escalated clinical requests from the voice agent will appear here
              automatically in real-time.
            </p>
          </div>
        )}

        {/* Requests */}
        {!loading && !error && escalations.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-8 fill-mode-both space-y-4 duration-700">
            {escalations
              .slice()
              .reverse()
              .map((item) => (
                <article
                  key={item.reference_id}
                  className="border-primary/10 bg-card/60 hover:border-primary/20 rounded-2xl border p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-md"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-3">
                        <span className="bg-muted/50 border-border/50 rounded-lg border px-3 py-1 font-mono text-xs font-bold">
                          {item.reference_id}
                        </span>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${urgencyClass(
                            item.urgency
                          )}`}
                        >
                          {item.urgency}
                        </span>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(item.status)}`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <h2 className="mb-2 text-lg font-semibold">Clinical Escalation Details</h2>

                      <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed">
                        {item.summary}
                      </p>
                    </div>

                    <div className="bg-muted/30 border-border/40 grid shrink-0 gap-3 rounded-xl border p-4 text-sm sm:grid-cols-2 lg:w-72 lg:grid-cols-1">
                      <div>
                        <p className="text-muted-foreground text-xs font-medium">Language</p>
                        <p className="mt-0.5 font-semibold capitalize">
                          {item.language || 'Not specified'}
                        </p>
                      </div>

                      <div>
                        <p className="text-muted-foreground text-xs font-medium">
                          Follow-up Method
                        </p>
                        <p className="mt-0.5 font-semibold capitalize">
                          {item.follow_up_method || 'Not specified'}
                        </p>
                      </div>

                      <div>
                        <p className="text-muted-foreground text-xs font-medium">
                          Created Timestamp
                        </p>
                        <p className="mt-0.5 text-xs font-semibold">
                          {formatDate(item.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
          </div>
        )}
      </div>
    </main>
  );
}
