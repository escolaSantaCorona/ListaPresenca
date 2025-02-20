import { NextRequest, NextResponse } from 'next/server';


// URL da API do Google Apps Script 
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwVe2NbENN2cK4iPAaUI9UfmSCbro0U_HyA6kOUQ9UhU2vBX04zEdQdtlY2bS1Z2lnV/exec';


// function for make requests  HTTP to Google Apps Script
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
