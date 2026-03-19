import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { HINT_PENALTY_POINTS, MAX_HISTORY_ITEMS } from '@/lib/constants';
import { type QuizAttempt } from '@/types/quiz';

type HistoryRow = {
  id: string;
  user_email: string;
  config: QuizAttempt['config'];
  questions: QuizAttempt['questions'];
  score: number;
  total_questions: number;
  percentage: number;
  time_taken_seconds: number;
  completed_at: string;
};

function mapRowToAttempt(row: HistoryRow): QuizAttempt {
  const hintPenalty =
    row.questions.filter((question) => question.hintUsed).length * HINT_PENALTY_POINTS;
  return {
    id: row.id,
    userEmail: row.user_email,
    config: row.config,
    questions: row.questions,
    score: row.score,
    hintPenalty,
    adjustedScore: row.score,
    totalQuestions: row.total_questions,
    percentage: row.percentage,
    timeTakenSeconds: row.time_taken_seconds,
    completedAt: row.completed_at,
  };
}

async function requireUserEmail() {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;
  return userEmail ?? null;
}

export async function GET() {
  const userEmail = await requireUserEmail();
  if (!userEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('user_email', userEmail)
      .order('completed_at', { ascending: false })
      .limit(MAX_HISTORY_ITEMS);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const attempts = (data as HistoryRow[]).map(mapRowToAttempt);
    return NextResponse.json({ attempts }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userEmail = await requireUserEmail();
  if (!userEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let attempt: QuizAttempt;
  try {
    const body = (await request.json()) as { attempt?: QuizAttempt };
    if (!body.attempt) {
      return NextResponse.json({ error: 'Missing attempt payload' }, { status: 400 });
    }
    attempt = body.attempt;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from('quiz_attempts')
      .upsert(
        {
          id: attempt.id,
          user_email: userEmail,
          config: attempt.config,
          questions: attempt.questions,
          score: attempt.score,
          total_questions: attempt.totalQuestions,
          percentage: attempt.percentage,
          time_taken_seconds: attempt.timeTakenSeconds,
          completed_at: attempt.completedAt,
        },
        { onConflict: 'id' }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const userEmail = await requireUserEmail();
  if (!userEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const attemptId = request.nextUrl.searchParams.get('attemptId');

  try {
    const supabase = getSupabaseAdminClient();
    const query = supabase.from('quiz_attempts').delete().eq('user_email', userEmail);
    const { error } = attemptId ? await query.eq('id', attemptId) : await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
