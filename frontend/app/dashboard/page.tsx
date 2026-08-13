'use client';

import { useEffect, useState } from 'react';

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
        <p className="text-muted-foreground">
          Loading HealthSaathi analytics...
        </p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex min-h-svh items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold">
            Analytics unavailable
          </h1>
          <p className="text-muted-foreground mt-2">
            {error ?? 'No analytics data available.'}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-svh bg-background px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">
            HealthSaathi
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            Call Analytics
          </h1>

          <p className="text-muted-foreground mt-2">
            Real-time performance of the HealthSaathi voice agent.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            title="Total Calls"
            value={data.total_calls}
            description="All recorded calls"
          />

          <MetricCard
            title="Successful Calls"
            value={data.successful_calls}
            description="Completed successfully"
          />

          <MetricCard
            title="Failed Calls"
            value={data.failed_calls}
            description="Calls that did not complete"
          />
        </section>

        <section className="mt-6 rounded-2xl border bg-card p-6">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold">
                Success Rate
              </h2>

              <p className="text-muted-foreground text-sm">
                Based on recorded calls
              </p>
            </div>

            <div className="text-4xl font-bold">
              {data.success_rate}%
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border bg-card p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">
              Recent Calls
            </h2>

            <p className="text-muted-foreground text-sm">
              Latest recorded HealthSaathi conversations.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 font-medium">
                    Time
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Duration
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Channel
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Outcome
                  </th>
                </tr>
              </thead>

              <tbody>
                {data.recent_calls.map((call) => (
                  <tr
                    key={call.call_id}
                    className="border-b last:border-0"
                  >
                    <td className="px-4 py-4">
                      {formatTime(call.started_at)}
                    </td>

                    <td className="px-4 py-4">
                      {call.duration_seconds}s
                    </td>

                    <td className="px-4 py-4 capitalize">
                      {call.channel}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={
                          call.outcome === 'SUCCESS'
                            ? 'font-medium'
                            : 'font-medium'
                        }
                      >
                        {call.outcome}
                      </span>
                    </td>
                  </tr>
                ))}

                {data.recent_calls.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-muted-foreground px-4 py-8 text-center"
                    >
                      No calls recorded yet.
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
}: {
  title: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-6">
      <p className="text-muted-foreground text-sm font-medium">
        {title}
      </p>

      <p className="mt-3 text-4xl font-bold">
        {value}
      </p>

      <p className="text-muted-foreground mt-2 text-xs">
        {description}
      </p>
    </div>
  );
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleString([], {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}