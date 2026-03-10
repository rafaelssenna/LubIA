import { Pool } from 'pg';

// Pool de conexão com o banco do IA-Deivid (prospecção)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL_CRM || 'postgresql://postgres:aoygbpLFcmLriEgRwFoqCwIvqBeRKtxT@mainline.proxy.rlwy.net:48023/railway',
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Agents que vendem LoopIA (oficina mecânica)
const LOOPIA_AGENTS = ['deivid', 'loopia-jonas'];
const LOOPIA_FILTER = `agent_id IN ('deivid', 'loopia-jonas')`;

// ─── Tipos ───

export interface CrmConversation {
  id: string;
  phone: string;
  name: string | null;
  whatsapp_name: string | null;
  messages_history: string; // JSON array
  activated: boolean;
  audio_muitas_sent: boolean;
  audio_valor_sent: boolean;
  demo_scheduled: boolean;
  message_count: number;
  last_message_at: Date;
  created_at: Date;
  follow_up_step: number;
  follow_up_next_at: Date | null;
  agent_id: string;
  admin_locked: boolean;
  video_sistema_sent: boolean;
}

export interface CrmMessage {
  role: 'user' | 'model';
  content: string;
}

export interface ScheduledDemo {
  id: string;
  phone: string;
  name: string | null;
  demo_date: Date;
  demo_time: string;
  status: string;
  created_at: Date;
}

// ─── Queries ───

export async function getConversations(opts: {
  page: number;
  limit: number;
  search?: string;
  scoreFilter?: string;
}): Promise<{ conversations: CrmConversation[]; total: number }> {
  const { page, limit, search, scoreFilter } = opts;
  const offset = (page - 1) * limit;
  const conditions: string[] = [LOOPIA_FILTER];
  const params: any[] = [];
  let paramIndex = 1;

  if (search) {
    conditions.push(`(phone ILIKE $${paramIndex} OR name ILIKE $${paramIndex} OR whatsapp_name ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  // Filtros de score mapeados para condições SQL
  if (scoreFilter === 'qualified') {
    conditions.push('demo_scheduled = true');
  } else if (scoreFilter === 'interested') {
    conditions.push('activated = true AND message_count >= 5 AND demo_scheduled = false');
  } else if (scoreFilter === 'new_lead') {
    conditions.push('(demo_scheduled = false AND (activated = false OR message_count < 5))');
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const [dataResult, countResult] = await Promise.all([
    pool.query(
      `SELECT * FROM conversations ${where} ORDER BY last_message_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    ),
    pool.query(
      `SELECT count(*)::int as total FROM conversations ${where}`,
      params
    ),
  ]);

  return {
    conversations: dataResult.rows,
    total: countResult.rows[0].total,
  };
}

export async function getConversationById(id: string): Promise<CrmConversation | null> {
  const result = await pool.query(
    `SELECT * FROM conversations WHERE id = $1 AND ${LOOPIA_FILTER}`,
    [id]
  );
  return result.rows[0] || null;
}

export async function getStats(): Promise<{
  total: number;
  activated: number;
  demoScheduled: number;
  agents: Record<string, number>;
  recentToday: number;
  activeWithManyMessages: number;
}> {
  const base = `WHERE ${LOOPIA_FILTER}`;

  const [totalR, activatedR, demoR, agentsR, todayR, activeInterestR] = await Promise.all([
    pool.query(`SELECT count(*)::int as c FROM conversations ${base}`),
    pool.query(`SELECT count(*)::int as c FROM conversations ${base} AND activated = true`),
    pool.query(`SELECT count(*)::int as c FROM conversations ${base} AND demo_scheduled = true`),
    pool.query(`SELECT agent_id, count(*)::int as c FROM conversations ${base} GROUP BY agent_id`),
    pool.query(`SELECT count(*)::int as c FROM conversations ${base} AND last_message_at >= CURRENT_DATE`),
    // Leads ativos com 5+ mensagens (potencialmente interessados)
    pool.query(`SELECT count(*)::int as c FROM conversations ${base} AND activated = true AND message_count >= 5 AND demo_scheduled = false`),
  ]);

  const agents: Record<string, number> = {};
  agentsR.rows.forEach((r: any) => { agents[r.agent_id] = r.c; });

  return {
    total: totalR.rows[0].c,
    activated: activatedR.rows[0].c,
    demoScheduled: demoR.rows[0].c,
    agents,
    recentToday: todayR.rows[0].c,
    activeWithManyMessages: activeInterestR.rows[0].c,
  };
}

export async function getScheduledDemos(): Promise<ScheduledDemo[]> {
  const result = await pool.query('SELECT * FROM scheduled_demos ORDER BY demo_date DESC, demo_time DESC');
  return result.rows;
}

export function parseMessages(messagesHistory: string): CrmMessage[] {
  try {
    const parsed = JSON.parse(messagesHistory);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}
