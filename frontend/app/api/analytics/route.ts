import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

type AnalyticsCall = {
  call_id: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  channel: string;
  outcome: 'SUCCESS' | 'FAILED';
  failure_reason: string | null;
};

type AnalyticsResponse = {
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  success_rate: number;
  recent_calls: AnalyticsCall[];
};

const DB_PATH = path.join(process.cwd(), '..', 'backend', 'healthsaathi.db');

function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

async function querySqlite(sql: string): Promise<Record<string, unknown>[]> {
  const { execFile } = await import('child_process');
  const { promisify } = await import('util');

  const execFileAsync = promisify(execFile);

  const pythonExecutable = process.env.PYTHON_EXECUTABLE || 'python';

  const pythonScript = `
import sqlite3
import json
import sys

db_path = sys.argv[1]
sql = sys.argv[2]

connection = sqlite3.connect(db_path)
connection.row_factory = sqlite3.Row

try:
    rows = connection.execute(sql).fetchall()
    print(json.dumps([dict(row) for row in rows]))
finally:
    connection.close()
`;

  const { stdout } = await execFileAsync(pythonExecutable, ['-c', pythonScript, DB_PATH, sql], {
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });

  return JSON.parse(stdout.trim() || '[]') as Record<string, unknown>[];
}

export async function GET() {
  try {
    const countRows = await querySqlite(`
      SELECT
        COUNT(*) AS total_calls,
        COALESCE(
          SUM(
            CASE
              WHEN outcome = 'SUCCESS' THEN 1
              ELSE 0
            END
          ),
          0
        ) AS successful_calls,
        COALESCE(
          SUM(
            CASE
              WHEN outcome = 'FAILED' THEN 1
              ELSE 0
            END
          ),
          0
        ) AS failed_calls
      FROM call_analytics
    `);

    const recentRows = await querySqlite(`
      SELECT
        call_id,
        started_at,
        ended_at,
        duration_seconds,
        channel,
        outcome,
        failure_reason
      FROM call_analytics
      ORDER BY started_at DESC
      LIMIT 10
    `);

    const counts = countRows[0] ?? {};

    const totalCalls = Number(counts.total_calls ?? 0);
    const successfulCalls = Number(counts.successful_calls ?? 0);
    const failedCalls = Number(counts.failed_calls ?? 0);

    const successRate =
      totalCalls > 0 ? Number(((successfulCalls / totalCalls) * 100).toFixed(1)) : 0;

    const recentCalls: AnalyticsCall[] = recentRows.map((row) => ({
      call_id: String(row.call_id ?? ''),
      started_at: String(row.started_at ?? ''),
      ended_at: String(row.ended_at ?? ''),
      duration_seconds: Number(row.duration_seconds ?? 0),
      channel: String(row.channel ?? ''),
      outcome: row.outcome === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
      failure_reason:
        row.outcome === 'FAILED' && row.failure_reason ? String(row.failure_reason) : null,
    }));

    const response: AnalyticsResponse = {
      total_calls: totalCalls,
      successful_calls: successfulCalls,
      failed_calls: failedCalls,
      success_rate: successRate,
      recent_calls: recentCalls,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Failed to load HealthSaathi analytics:', error);

    return NextResponse.json(
      {
        error: 'Unable to load call analytics.',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}
