import { NextRequest, NextResponse } from 'next/server';

// URL da API do Google Apps Script
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyu0q_NElx-XGLsvzvAhEshSb1C_dSiRKluKLaNEm1-u81cuVYumr_5UJ2eRDkE8uZS/exec';
//add
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
  const className = searchParams.get('className');

  // Cria a query para buscar os alunos
  const query = JSON.stringify({
    action: 'getStudents',
    className,
  });

  try {
    const data = await callGoogleScriptAPI(query);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json({ error: error || 'Unknown error' }, { status: 500 });
  }
}
