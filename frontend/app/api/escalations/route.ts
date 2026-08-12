import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(
      process.cwd(),
      '..',
      'backend',
      'src',
      'escalation',
      'escalation_store.json',
    );

    const fileContents = await fs.readFile(filePath, 'utf-8');
    const escalations = JSON.parse(fileContents);

    return NextResponse.json({
      success: true,
      escalations: Array.isArray(escalations) ? escalations : [],
    });
  } catch (error) {
    console.error('Failed to read escalation store:', error);

    return NextResponse.json(
      {
        success: false,
        escalations: [],
        error: 'Unable to load human-help requests.',
      },
      { status: 500 },
    );
  }
}