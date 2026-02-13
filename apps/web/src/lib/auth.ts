import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcrypt';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-change-in-production-min-32-chars'
);
const COOKIE_NAME = 'lubia-session';

// Tipos de role
export type RoleUsuario = 'ADMIN' | 'GERENTE' | 'ATENDENTE' | 'VENDEDOR';

// Payload da sessão JWT
export interface SessionPayload {
  userId: number;
  email: string;
  nome: string;
  empresaId: number;
  empresaNome: string;
  role: RoleUsuario;
  exp?: number;
}

// Permissões por role
const ROLE_PERMISSIONS: Record<RoleUsuario, string[]> = {
  ADMIN: ['*'], // Acesso total
  GERENTE: ['dashboard', 'clientes', 'veiculos', 'ordens', 'orcamentos', 'estoque', 'lembretes', 'whatsapp'],
  ATENDENTE: ['dashboard', 'clientes', 'veiculos', 'ordens', 'orcamentos', 'whatsapp'],
  VENDEDOR: ['clientes', 'veiculos', 'orcamentos', 'whatsapp'],
};

// Verificar se role tem permissão
export function hasPermission(role: RoleUsuario, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.includes('*') || permissions.includes(permission);
}

// Verificar se role pode acessar página
export function canAccessPage(role: RoleUsuario, page: string): boolean {
  // Páginas que requerem ADMIN
  const adminOnlyPages = ['configuracoes', 'usuarios'];
  if (adminOnlyPages.includes(page)) {
    return role === 'ADMIN';
  }
  return hasPermission(role, page);
}

// Hash de senha com bcrypt
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Verificar senha
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Criar token JWT
export async function createSession(payload: Omit<SessionPayload, 'exp'>): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);

  return token;
}

// Obter sessão do cookie
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return null;

    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// Salvar cookie de sessão
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 dias
    path: '/',
  });
}

// Limpar sessão
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Verificar se usuário está autenticado (para uso em Server Components)
export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}
