import { NextRequest, NextResponse } from 'next/server';

// URL da API do Google Apps Script que você configurou
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwVe2NbENN2cK4iPAaUI9UfmSCbro0U_HyA6kOUQ9UhU2vBX04zEdQdtlY2bS1Z2lnV/exec';

// Função auxiliar para fazer chamadas HTTP para o Google Apps Script com timeout
async function callGoogleScriptAPI(query: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // Increased to 30 seconds

  try {
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?query=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Script API returned an error: ${response.status} ${response.statusText}: ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}


// Função para dividir intervalos de data em partes menores
function createDateChunks(startDate: string, endDate: string): Array<{ start: string; end: string }> {
  const chunks = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  while (start <= end) {
    const chunkEnd = new Date(start);
    chunkEnd.setDate(start.getDate() + 6); // Intervalo de 7 dias por exemplo
    if (chunkEnd > end) chunkEnd.setTime(end.getTime());

    chunks.push({
      start: start.toISOString().split('T')[0],
      end: chunkEnd.toISOString().split('T')[0],
    });

    start.setDate(start.getDate() + 7);
  }
  return chunks;
}

// Função para buscar ausências em partes menores
async function getAbsencesInChunks(
  className: string | null,
  startDate: string,
  endDate: string,
  studentName: string | null
) {
  const chunks = createDateChunks(startDate, endDate);
  const results = await Promise.all(
    chunks.map(chunk => {
      const query = JSON.stringify({
        action: 'getAbsences',
        className,
        startDate: chunk.start,
        endDate: chunk.end,
        studentName,
      });
      return callGoogleScriptAPI(query);
    })
  );
  return results.flat(); // Combina os resultados de todas as chamadas
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

    try {
      console.log(`Fetching absences for ${className} from ${startDate} to ${endDate}`);
      const data = await getAbsencesInChunks(className, startDate, endDate, studentName);
      console.log('Data received from Google Script API:', data);
      return NextResponse.json(data, { status: 200 });
    } catch (error) {
      console.error('Error fetching absences:', error);
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
  } else if (action === 'getAttendance') {
    const className = searchParams.get('className');
    const date = searchParams.get('date');

    if (!className || !date) {
      return NextResponse.json({ error: 'className and date are required' }, { status: 400 });
    }

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
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
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
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}
