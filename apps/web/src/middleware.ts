import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-change-in-production-min-32-chars'
);
const COOKIE_NAME = 'lubia-session';

// Rotas públicas que não precisam de autenticação
const publicPaths = [
  '/login',
  '/cadastro',
  '/api/auth/login',
  '/api/auth/register',
];

// Rotas de API que devem permanecer públicas (webhooks externos, cron jobs)
const publicApiPaths = [
  '/api/whatsapp/webhook',
  '/api/cron/',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir rotas públicas
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Permitir webhooks externos
  if (publicApiPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Verificar se tem token
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    // Redirecionar para login para páginas, retornar 401 para API
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verificar validade do token
  try {
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.next();
  } catch {
    // Token inválido - limpar cookie e redirecionar
    const response = pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'Sessão expirada' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url));

    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: [
    // Match all paths except static files and _next
    '/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.png$|.*\\.svg$).*)',
  ],
};
