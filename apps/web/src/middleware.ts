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
  '/consulta',
  '/api/auth/login',
  '/api/auth/register',
];

// Rotas de API que devem permanecer públicas (webhooks externos, cron jobs)
const publicApiPaths = [
  '/api/whatsapp/webhook',
  '/api/stripe/webhook',
  '/api/cron/',
  '/api/public/',
];

// Rotas acessíveis mesmo quando assinatura está bloqueada
const subscriptionExemptPaths = [
  '/assinatura',
  '/api/stripe/',
  '/api/auth/me',
  '/api/auth/logout',
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
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Rotas isentas de verificação de assinatura
    if (subscriptionExemptPaths.some(path => pathname.startsWith(path))) {
      return NextResponse.next();
    }

    // Verificar status da assinatura
    const subscriptionStatus = (payload as any).subscriptionStatus as string;
    const trialEndsAt = (payload as any).trialEndsAt as string | undefined;

    // Status que bloqueiam acesso
    const blockedStatuses = ['UNPAID', 'CANCELED'];

    if (blockedStatuses.includes(subscriptionStatus)) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Assinatura necessária', code: 'SUBSCRIPTION_REQUIRED' },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/assinatura', request.url));
    }

    // Verificar se trial expirou
    if (subscriptionStatus === 'TRIAL' && trialEndsAt) {
      const trialEnd = new Date(trialEndsAt);
      if (trialEnd < new Date()) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Período de teste expirado', code: 'TRIAL_EXPIRED' },
            { status: 403 }
          );
        }
        return NextResponse.redirect(new URL('/assinatura', request.url));
      }
    }

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
