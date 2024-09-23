import { NextRequest, NextResponse } from 'next/server';

// URL da API do Google Apps Script que você configurou
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz-pKbjKfvXu5llC3RKKTcxXBha0GjSM80yfjBP0lsmuQdoFi1klWmeM1PxIaZw2TrN/exec';

// Função auxiliar para fazer chamadas HTTP para o Google Apps Script
async function callGoogleScriptAPI(query: string) {
  const response = await fetch(`${GOOGLE_SCRIPT_URL}?query=${encodeURIComponent(query)}`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Script API returned an error: ${response.status} ${response.statusText}: ${errorText}`);
  }
  return await response.json();
}

// Handle GET request
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  if (action === 'getAbsences') {
    const className = searchParams.get('className');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const studentName = searchParams.get('studentName');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    // Cria a query para buscar as ausências
    const query = JSON.stringify({
      action: 'getAbsences',
      className,
      startDate,
      endDate,
      studentName,
    });

    try {
      const data = await callGoogleScriptAPI(query);
      return NextResponse.json(data, { status: 200 });
    } catch (error) {
      console.error('Error fetching absences:', error);
      return NextResponse.json({ error: error || 'Unknown error' }, { status: 500 });
    }
  } else if (action === 'getAttendance') {
    const className = searchParams.get('className');
    const date = searchParams.get('date');

    if (!className || !date) {
      return NextResponse.json({ error: 'className and date are required' }, { status: 400 });
    }

    // Cria a query para buscar as presenças
    const query = JSON.stringify({
      action: 'getAttendance',
      className,
      date,
    });

    try {
      const data = await callGoogleScriptAPI(query);
      return NextResponse.json(data, { status: 200 });
    } catch (error) {
      console.error('Error fetching attendance:', error);
      return NextResponse.json({ error: error || 'Unknown error' }, { status: 500 });
    }
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}

// Handle POST request
export async function POST(req: NextRequest) {
  const body = await req.json();
  const action = body.action;

  if (action === 'updateAttendance') {
    const { className, date, students } = body;

    if (!className || !date || !students) {
      return NextResponse.json({ error: 'className, date, and students are required' }, { status: 400 });
    }

    // Monta o corpo da requisição para enviar ao Google Apps Script
    const payload = JSON.stringify({
      action: 'updateAttendance',
      className,
      date,
      students,
    });

    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Script API returned an error: ${response.status} ${response.statusText}: ${errorText}`);
      }

      const result = await response.json();
      return NextResponse.json(result, { status: 200 });
    } catch (error) {
      console.error('Error submitting attendance:', error);
      return NextResponse.json({ error: error || 'Unknown error' }, { status: 500 });
    }
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}
