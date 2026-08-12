'use client';

import { useEffect, useState } from 'react';

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

      setEscalations(
        Array.isArray(data.escalations) ? data.escalations : [],
      );
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
        return 'border-red-500/40 bg-red-500/10 text-red-600';

      case 'HIGH':
        return 'border-orange-500/40 bg-orange-500/10 text-orange-600';

      case 'MEDIUM':
        return 'border-yellow-500/40 bg-yellow-500/10 text-yellow-600';

      default:
        return 'border-blue-500/40 bg-blue-500/10 text-blue-600';
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
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              HealthSaathi
            </p>

            <h1 className="text-3xl font-semibold tracking-tight">
              Human Help Dashboard
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Review requests escalated by the HealthSaathi voice agent.
            </p>
          </div>

          <button
            onClick={loadEscalations}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted"
          >
            Refresh
          </button>
        </div>

        {/* Summary cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              Total Requests
            </p>

            <p className="mt-2 text-3xl font-semibold">
              {escalations.length}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              Open Requests
            </p>

            <p className="mt-2 text-3xl font-semibold">
              {
                escalations.filter(
                  (item) => item.status.toUpperCase() === 'OPEN',
                ).length
              }
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              Emergency
            </p>

            <p className="mt-2 text-3xl font-semibold">
              {
                escalations.filter(
                  (item) => item.urgency.toUpperCase() === 'EMERGENCY',
                ).length
              }
            </p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            Loading human-help requests...
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-600">
            {error}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && escalations.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-10 text-center">
            <h2 className="text-lg font-medium">
              No human-help requests
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Escalated requests will appear here automatically.
            </p>
          </div>
        )}

        {/* Requests */}
        {!loading && !error && escalations.length > 0 && (
          <div className="space-y-4">
            {escalations
              .slice()
              .reverse()
              .map((item) => (
                <article
                  key={item.reference_id}
                  className="rounded-xl border border-border bg-card p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-3">
                        <span className="font-mono text-sm font-semibold">
                          {item.reference_id}
                        </span>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${urgencyClass(
                            item.urgency,
                          )}`}
                        >
                          {item.urgency}
                        </span>

                        <span className="rounded-full border border-border px-3 py-1 text-xs font-medium">
                          {item.status}
                        </span>
                      </div>

                      <h2 className="mb-2 text-lg font-semibold">
                        Human Help Request
                      </h2>

                      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                        {item.summary}
                      </p>
                    </div>

                    <div className="grid shrink-0 gap-3 text-sm sm:grid-cols-2 lg:w-72 lg:grid-cols-1">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Language
                        </p>
                        <p className="mt-1 font-medium">
                          {item.language || 'Not specified'}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Follow-up
                        </p>
                        <p className="mt-1 font-medium">
                          {item.follow_up_method || 'Not specified'}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Created
                        </p>
                        <p className="mt-1 font-medium">
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