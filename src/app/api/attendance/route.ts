import { NextRequest, NextResponse } from 'next/server';

// URL da API do Google Apps Script que você configurou
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbweZjjp3ffOKJLQweJ97W9pd6cnt0NeFhS3FfJeILxWZglcehnVFtjo6666YG4hJDVB/exec';

// Função auxiliar para fazer chamadas HTTP para o Google Apps Script
async function callGoogleScriptAPI(query: string) {
  const response = await fetch(`${GOOGLE_SCRIPT_URL}?query=${encodeURIComponent(query)}`);
  return await response.json();
}

// Handle GET request
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
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
    return NextResponse.json({ error: error }, { status: 500 });
  }
}

// Handle POST request
export async function POST(req: NextRequest) {
  const body = await req.json();
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

    const result = await response.json();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error}, { status: 500 });
  }
}
