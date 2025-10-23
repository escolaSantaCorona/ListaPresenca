import { NextRequest, NextResponse } from 'next/server';


// URL da API do Google Apps Script
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwaFEil__0w_cuNCLj_aI-DMrzQbCftKCzw_JeXNYQ0qusYkMhXX0uokzYPmZINXNfp/exec';

//add
// making calls to HTTP para o Google Apps Script
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

  // create a query seek the studants
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
