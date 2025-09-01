// app/api/attendance/route.ts
import { NextRequest, NextResponse } from 'next/server';

// ⚙️ Executa no Edge (melhor cold start) e com duração maior (Vercel Functions v3)
export const runtime = 'edge';
export const maxDuration = 30;

// URL do seu Google Apps Script
const GOOGLE_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxtnvNZv_9QtrCez5tqm0OOKnNPnMMV-3jupEKgowySkqjRsvbPTr4YLiMhANfj83xP/exec';

// ===== Utils de rede com timeout + retry =====
async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type Json = Record<string, any>;

async function callGoogleScriptGET(queryObj: Json, attempt = 1): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s por tentativa

  try {
    const url = `${GOOGLE_SCRIPT_URL}?query=${encodeURIComponent(
      JSON.stringify(queryObj)
    )}`;

    const res = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.text();
      // Retry para 429 e 5xx
      if ((res.status === 429 || res.status >= 500) && attempt < 3) {
        await sleep(300 * attempt);
        return callGoogleScriptGET(queryObj, attempt + 1);
      }
      throw new Error(`Google Script error: ${res.status} ${res.statusText}: ${body}`);
    }

    return await res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callGoogleScriptPOST(payloadObj: Json, attempt = 1): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadObj),
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.text();
      if ((res.status === 429 || res.status >= 500) && attempt < 3) {
        await sleep(300 * attempt);
        return callGoogleScriptPOST(payloadObj, attempt + 1);
      }
      throw new Error(`Google Script error: ${res.status} ${res.statusText}: ${body}`);
    }

    return await res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

// (Opcional) tenta descobrir a turma pelo nome do aluno, se seu GAS tiver a action "findStudentClass"
async function maybeFindStudentClass(studentName: string): Promise<string | null> {
  try {
    const data = await callGoogleScriptGET({
      action: 'findStudentClass',
      studentName,
    });
    const cls = data?.className;
    if (typeof cls === 'string' && cls.trim()) return cls.trim();
  } catch {
    // Se a action não existir ou falhar, seguimos sem turma
  }
  return null;
}

// ===== Handlers =====
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = (searchParams.get('action') || '').trim();

  try {
    if (action === 'getAbsences') {
      const startDate = searchParams.get('startDate')?.trim();
      const endDate = searchParams.get('endDate')?.trim();
      const studentName = searchParams.get('studentName')?.trim() || null;
      let className = searchParams.get('className')?.trim() || null;

      if (!startDate || !endDate) {
        return NextResponse.json(
          { error: 'startDate and endDate are required' },
          { status: 400 }
        );
      }

      // Validação de ordem de datas
      if (new Date(startDate).getTime() > new Date(endDate).getTime()) {
        return NextResponse.json(
          { error: 'startDate cannot be after endDate' },
          { status: 400 }
        );
      }

      // (Opcional) Descobre a turma automaticamente se só veio o nome
      if (!className && studentName) {
        const found = await maybeFindStudentClass(studentName);
        if (found) className = found;
      }

      // ✅ Uma única chamada ao GAS com o range inteiro
      const query = {
        action: 'getAbsences',
        className,   // pode ser null → GAS varre todas as turmas (mais pesado)
        startDate,
        endDate,
        studentName, // pode ser null
      };

      const data = await callGoogleScriptGET(query);
      return NextResponse.json(data, { status: 200 });
    }

    if (action === 'getAttendance') {
      const className = searchParams.get('className')?.trim();
      const date = searchParams.get('date')?.trim();

      if (!className || !date) {
        return NextResponse.json(
          { error: 'className and date are required' },
          { status: 400 }
        );
      }

      const query = { action: 'getAttendance', className, date };
      const data = await callGoogleScriptGET(query);
      return NextResponse.json(data, { status: 200 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    const isAbort =
      err?.name === 'AbortError' ||
      err?.message?.toLowerCase?.().includes('aborted') ||
      err?.message?.toLowerCase?.().includes('timeout');

    console.error('GET /api/attendance error:', err);
    return NextResponse.json(
      {
        error: isAbort ? 'Upstream timeout' : err?.message || 'Unknown error',
      },
      { status: isAbort ? 504 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const action = (body?.action || '').trim();

  try {
    if (action === 'updateAttendance') {
      const className = body?.className?.trim();
      const date = body?.date?.trim();
      const students = body?.students;

      if (!className || !date || !Array.isArray(students)) {
        return NextResponse.json(
          { error: 'className, date and students[] are required' },
          { status: 400 }
        );
      }

      const payload = {
        action: 'updateAttendance',
        className,
        date,
        students, // [{ studentName, attendanceValue }]
      };

      const data = await callGoogleScriptPOST(payload);
      return NextResponse.json(data, { status: 200 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    const isAbort =
      err?.name === 'AbortError' ||
      err?.message?.toLowerCase?.().includes('aborted') ||
      err?.message?.toLowerCase?.().includes('timeout');

    console.error('POST /api/attendance error:', err);
    return NextResponse.json(
      {
        error: isAbort ? 'Upstream timeout' : err?.message || 'Unknown error',
      },
      { status: isAbort ? 504 : 500 }
    );
  }
}
