import { NextRequest, NextResponse } from 'next/server';
import { GOOGLE_SCRIPT_URL } from '../attendance/route';

// URL da API do Google Apps Script que você configurou


// Função auxiliar para fazer chamadas HTTP para o Google Apps Script
async function callGoogleScriptAPI(query: string) {
  const response = await fetch(`${GOOGLE_SCRIPT_URL}?query=${encodeURIComponent(query)}`);
  return await response.json();
}

// Handle GET request
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const className = searchParams.get('className');
  
  if (!className) {
    return NextResponse.json({ error: 'className is required' }, { status: 400 });
  }

  // Query to fetch dates
  const query = JSON.stringify({
    action: 'getDates',
    className,
  });

  try {
    const data = await callGoogleScriptAPI(query);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error }, { status: 500 });
  }
}
