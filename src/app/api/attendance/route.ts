// app/api/attendance/route.ts
import { NextRequest, NextResponse } from 'next/server';

// ⚙️ Edge Runtime (melhor cold start) e mais tempo de execução
export const runtime = 'edge';
export const maxDuration = 30;

// URL do seu Google Apps Script
const GOOGLE_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbyXROAO61Xql_9dsbXFmlz5syF9UheXaVd-Uxbg8Xneu8LHrlCeProuudX7llZpspiG/exec';

// ========== Tipos ==========
type RecordUnknown = Record<string, unknown>;

type AbsenceDTO = {
  className: string;
  studentName: string;
  attendanceValue: string; // esperado: 'F' (falta) ou '.'
  date: string; // yyyy-mm-dd
};

type AttendanceEntry = {
  studentName: string;
  attendanceValue: string; // '.' ou 'F'
  date: string; // yyyy-mm-dd
};

type UpdateStudentItem = {
  studentName: string;
  attendanceValue: string; // '.', 'F', etc.
};

type UpdateAttendanceRequestBody = {
  action: 'updateAttendance';
  className: string;
  date: string; // yyyy-mm-dd
  students: UpdateStudentItem[];
};

type UpdateAttendanceResponse = {
  status?: string;
  updatedStudents?: string[];
  error?: string;
};

type FindStudentClassResponse = {
  className: string | null;
};

// ========== Utils ==========
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function toJSONString(obj: RecordUnknown): string {
  return JSON.stringify(obj);
}

function parseUnknownError(err: unknown): { message: string; isAbort: boolean } {
  if (err instanceof Error) {
    const msg = err.message ?? 'Unknown error';
    const lower = msg.toLowerCase();
    const isAbort =
      err.name === 'AbortError' || lower.includes('aborted') || lower.includes('timeout');
    return { message: msg, isAbort };
  }
  const str = typeof err === 'string' ? err : String(err);
  const lower = str.toLowerCase();
  const isAbort = lower.includes('aborted') || lower.includes('timeout');
  return { message: str, isAbort };
}

// ========== HTTP helpers (genéricos, sem `any`) ==========
async function callGoogleScriptGET<T>(queryObj: RecordUnknown, attempt = 1): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12_000); // 12s por tentativa

  try {
    const url = `${GOOGLE_SCRIPT_URL}?query=${encodeURIComponent(toJSONString(queryObj))}`;
    const res = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.text();
      if ((res.status === 429 || res.status >= 500) && attempt < 3) {
        await sleep(300 * attempt);
        return callGoogleScriptGET<T>(queryObj, attempt + 1);
      }
      throw new Error(`Google Script error: ${res.status} ${res.statusText}: ${body}`);
    }

    // `res.json()` retorna `unknown` aqui; fazemos cast para T
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callGoogleScriptPOST<T>(payloadObj: RecordUnknown, attempt = 1): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: toJSONString(payloadObj),
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.text();
      if ((res.status === 429 || res.status >= 500) && attempt < 3) {
        await sleep(300 * attempt);
        return callGoogleScriptPOST<T>(payloadObj, attempt + 1);
      }
      throw new Error(`Google Script error: ${res.status} ${res.statusText}: ${body}`);
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

// (Opcional) Descobrir a turma pelo nome (se sua action existir no GAS)
async function maybeFindStudentClass(studentName: string): Promise<string | null> {
  try {
    const data = await callGoogleScriptGET<FindStudentClassResponse>({
      action: 'findStudentClass',
      studentName,
    });
    const cls = data?.className;
    if (typeof cls === 'string' && cls.trim()) return cls.trim();
  } catch {
    // silencioso: se não existir/der erro, seguimos sem turma
  }
  return null;
}

// ========== Handlers ==========
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
      if (new Date(startDate).getTime() > new Date(endDate).getTime()) {
        return NextResponse.json(
          { error: 'startDate cannot be after endDate' },
          { status: 400 }
        );
      }

      // tentar descobrir turma automaticamente (opcional)
      if (!className && studentName) {
        const found = await maybeFindStudentClass(studentName);
        if (found) className = found;
      }

      const query: RecordUnknown = {
        action: 'getAbsences',
        className,
        startDate,
        endDate,
        studentName,
      };

      const data = await callGoogleScriptGET<AbsenceDTO[]>(query);
      return NextResponse.json<AbsenceDTO[]>(data, { status: 200 });
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

      const query: RecordUnknown = { action: 'getAttendance', className, date };
      const data = await callGoogleScriptGET<AttendanceEntry[]>(query);
      return NextResponse.json<AttendanceEntry[]>(data, { status: 200 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: unknown) {
    const { message, isAbort } = parseUnknownError(err);
    // eslint-disable-next-line no-console
    console.error('GET /api/attendance error:', err);
    return NextResponse.json(
      { error: isAbort ? 'Upstream timeout' : message },
      { status: isAbort ? 504 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  let bodyUnknown: unknown;
  try {
    bodyUnknown = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Narrow manual do corpo:
  const body = bodyUnknown as Partial<UpdateAttendanceRequestBody>;
  const action = (body?.action || '').trim() as string;

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

      // validação básica do array
      const validStudents: UpdateStudentItem[] = students
        .map((s) => ({
          studentName: typeof s?.studentName === 'string' ? s.studentName : '',
          attendanceValue: typeof s?.attendanceValue === 'string' ? s.attendanceValue : '',
        }))
        .filter((s) => s.studentName && s.attendanceValue);

      if (validStudents.length === 0) {
        return NextResponse.json(
          { error: 'students[] must contain at least one valid item' },
          { status: 400 }
        );
      }

      const payload: RecordUnknown = {
        action: 'updateAttendance',
        className,
        date,
        students: validStudents,
      };

      const data = await callGoogleScriptPOST<UpdateAttendanceResponse>(payload);
      return NextResponse.json<UpdateAttendanceResponse>(data, { status: 200 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: unknown) {
    const { message, isAbort } = parseUnknownError(err);
    // eslint-disable-next-line no-console
    console.error('POST /api/attendance error:', err);
    return NextResponse.json(
      { error: isAbort ? 'Upstream timeout' : message },
      { status: isAbort ? 504 : 500 }
    );
  }
}
