'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  MessageCircle, Users, Car, ClipboardList, Package, DollarSign, Bell,
  ChevronDown, Check, ArrowRight, Shield, Globe, Zap,
  Phone, BookOpen, Calendar, Wrench, Clock, TrendingUp,
  Loader2
} from 'lucide-react';

// Hook para animação no scroll
function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

function AnimatedSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, isVisible } = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// FAQ Accordion
function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors"
      >
        <span className="font-medium text-white text-sm sm:text-base pr-4">{question}</span>
        <ChevronDown className={`shrink-0 text-gray-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} size={20} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-40 pb-5 px-5' : 'max-h-0'}`}>
        <p className="text-gray-400 text-sm leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // Verificar se está logado
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => {
        if (res.ok) {
          router.replace('/dashboard');
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      {/* ============ NAV ============ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <Image src="/logo.png" alt="LoopIA" width={90} height={90} />
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors hidden sm:block">
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm px-4 py-2 rounded-lg transition-all hover:scale-105"
            >
              Testar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <section className="pt-28 sm:pt-36 pb-16 sm:pb-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <AnimatedSection>
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-6">
              <Zap size={14} className="text-emerald-400" />
              <span className="text-emerald-400 text-xs font-medium">7 dias grátis · Sem cartão de crédito</span>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={100}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Sua oficina no{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                piloto automático
              </span>
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={200}>
            <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
              Controle total de clientes, veículos, ordens de serviço, estoque e financeiro.
              Com inteligência artificial que atende seus clientes 24h pelo WhatsApp.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={300}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Link
                href="/cadastro"
                className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-lg px-8 py-4 rounded-xl transition-all hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/25 flex items-center justify-center gap-2"
              >
                Testar grátis por 7 dias
                <ArrowRight size={20} />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto border border-white/20 hover:border-white/40 text-white font-medium text-lg px-8 py-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                Fazer login
              </Link>
            </div>
            <p className="text-gray-500 text-sm">Sem cartão de crédito. Cancele quando quiser.</p>
          </AnimatedSection>

          {/* Mockup visual */}
          <AnimatedSection delay={400}>
            <div className="mt-12 relative">
              <div className="bg-gradient-to-b from-emerald-500/10 to-transparent rounded-2xl p-1">
                <div className="bg-[#121212] rounded-xl border border-white/10 p-4 sm:p-8">
                  {/* WhatsApp mockup */}
                  <div className="max-w-sm mx-auto space-y-3">
                    <div className="bg-[#1a1a2e] rounded-xl p-3 flex items-center gap-3 border border-white/5">
                      <div className="w-10 h-10 bg-[#25D366]/20 rounded-full flex items-center justify-center shrink-0">
                        <MessageCircle size={18} className="text-[#25D366]" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Cliente pelo WhatsApp</p>
                        <p className="text-sm text-white">&quot;Oi, quanto custa a troca de óleo?&quot;</p>
                      </div>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-3 ml-8">
                      <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
                        <Zap size={18} className="text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs text-emerald-400">IA da sua oficina</p>
                        <p className="text-sm text-white">&quot;A troca de óleo custa R$180. Quer agendar? Tenho horário amanhã às 9h!&quot;</p>
                      </div>
                    </div>
                    <div className="bg-[#1a1a2e] rounded-xl p-3 flex items-center gap-3 border border-white/5">
                      <div className="w-10 h-10 bg-[#25D366]/20 rounded-full flex items-center justify-center shrink-0">
                        <MessageCircle size={18} className="text-[#25D366]" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Cliente pelo WhatsApp</p>
                        <p className="text-sm text-white">&quot;Pode ser! Meu nome é Carlos, tenho um Gol 2020&quot;</p>
                      </div>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-3 ml-8">
                      <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
                        <Check size={18} className="text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs text-emerald-400">IA da sua oficina</p>
                        <p className="text-sm text-white">&quot;Pronto Carlos! Agendado amanhã às 9h. Te vejo lá! 🚗&quot;</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Gradient blur */}
              <div className="absolute -bottom-8 left-0 right-0 h-16 bg-gradient-to-b from-transparent to-[#0a0a0a]" />
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ============ BARRA DE CONFIANÇA ============ */}
      <section className="py-8 border-y border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { icon: Globe, text: '100% Online' },
              { icon: Shield, text: 'Dados protegidos' },
              { icon: Phone, text: 'Suporte humano' },
              { icon: Zap, text: 'Feito no Brasil' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <item.icon size={20} className="text-emerald-400" />
                <span className="text-gray-400 text-xs sm:text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ DORES ============ */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection>
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
              Você reconhece algum desses problemas?
            </h2>
            <p className="text-gray-400 text-center mb-12 max-w-lg mx-auto">
              Se você é dono de oficina, aposto que passa por pelo menos dois desses todo dia.
            </p>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                icon: Phone,
                title: 'Clientes ligam e você não pode atender',
                desc: 'Quantos orçamentos você perde porque estava debaixo de um carro?',
              },
              {
                icon: BookOpen,
                title: 'Controle na caderneta ou planilha',
                desc: 'Informações perdidas, erros nos preços, clientes esquecidos.',
              },
              {
                icon: Bell,
                title: 'Esquece de avisar sobre a troca de óleo',
                desc: 'O cliente vai pra outra oficina e você nunca fica sabendo.',
              },
              {
                icon: DollarSign,
                title: 'Fim do mês e não sabe quanto ganhou',
                desc: 'Paga contas no susto, sem previsão financeira.',
              },
            ].map((item, i) => (
              <AnimatedSection key={i} delay={i * 100}>
                <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-5 hover:border-red-500/20 transition-colors h-full">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center shrink-0">
                      <item.icon size={20} className="text-red-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm sm:text-base mb-1">{item.title}</h3>
                      <p className="text-gray-500 text-sm">{item.desc}</p>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ============ SOLUÇÃO ============ */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-b from-emerald-500/5 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <AnimatedSection>
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-6">
              <Check size={14} className="text-emerald-400" />
              <span className="text-emerald-400 text-xs font-medium">A solução</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              O LoopIA resolve tudo isso pra você
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
              Um sistema completo que organiza toda sua oficina: clientes, veículos, ordens de serviço,
              orçamentos, estoque, financeiro e lembretes. E ainda tem uma IA que atende seus clientes pelo WhatsApp.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* ============ FUNCIONALIDADES ============ */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection>
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
              Tudo que sua oficina precisa
            </h2>
          </AnimatedSection>

          {/* Grid de features - sistema completo */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Users, title: 'Cadastro de Clientes', desc: 'Controle completo dos seus clientes com histórico de serviços, veículos e preferências.' },
              { icon: Car, title: 'Controle de Veículos', desc: 'Todos os veículos cadastrados com placa, marca, modelo, km e histórico de manutenção.' },
              { icon: ClipboardList, title: 'Ordens de Serviço', desc: 'Da entrada à entrega, tudo registrado. Acompanhe status e notifique o cliente.' },
              { icon: BookOpen, title: 'Orçamentos', desc: 'Monte orçamentos profissionais com peças e serviços. Envie pelo WhatsApp em um clique.' },
              { icon: Package, title: 'Controle de Estoque', desc: 'Saiba o que tem na prateleira. Entrada, saída e alertas de estoque baixo.' },
              { icon: DollarSign, title: 'Gestão Financeira', desc: 'Contas a pagar, a receber, vendas rápidas e fluxo de caixa. Tudo organizado.' },
              { icon: Bell, title: 'Lembretes Automáticos', desc: 'Avise clientes sobre troca de óleo e revisões. Eles voltam sozinhos.' },
              { icon: MessageCircle, title: 'IA no WhatsApp', desc: 'Inteligência artificial que atende seus clientes 24h: responde, agenda e cadastra.' },
              { icon: Calendar, title: 'Agenda Integrada', desc: 'Horários disponíveis, agendamentos e histórico. Tudo integrado com a IA.' },
            ].map((item, i) => (
              <AnimatedSection key={i} delay={i * 80}>
                <div className="bg-white/[0.02] border border-white/10 rounded-xl p-5 hover:border-emerald-500/20 hover:bg-emerald-500/[0.02] transition-all h-full">
                  <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center mb-3">
                    <item.icon size={20} className="text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-white text-sm mb-1">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ============ COMO FUNCIONA ============ */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-b from-white/[0.02] to-transparent">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection>
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
              Comece em 3 passos
            </h2>
          </AnimatedSection>

          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: '1', icon: Wrench, title: 'Crie sua conta', desc: 'Em 30 segundos, sem burocracia. Só precisa do nome e e-mail.' },
              { step: '2', icon: Clock, title: 'Configure a oficina', desc: 'Cadastre serviços e preços. O sistema já vem pronto pra usar.' },
              { step: '3', icon: TrendingUp, title: 'Pronto!', desc: 'Gerencie tudo pelo sistema. A IA atende no WhatsApp. Você foca nos carros.' },
            ].map((item, i) => (
              <AnimatedSection key={i} delay={i * 150}>
                <div className="text-center">
                  <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-emerald-400 font-bold text-lg">{item.step}</span>
                  </div>
                  <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PREÇO ============ */}
      <section className="py-16 sm:py-24 px-4 sm:px-6" id="preco">
        <div className="max-w-md mx-auto">
          <AnimatedSection>
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
              Um único plano. Sem surpresas.
            </h2>
            <p className="text-gray-400 text-center mb-8">
              Tudo incluso. Sem limite de clientes ou veículos.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={100}>
            <div className="bg-gradient-to-b from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl p-8 text-center relative overflow-hidden">
              {/* Badge */}
              <div className="absolute top-4 right-4 bg-emerald-500 text-black text-xs font-bold px-3 py-1 rounded-full">
                7 dias grátis
              </div>

              <p className="text-gray-400 text-sm mb-2">LoopIA Completo</p>
              <div className="flex items-end justify-center gap-1 mb-1">
                <span className="text-4xl sm:text-5xl font-bold text-white">R$97</span>
                <span className="text-xl text-gray-400 mb-1">,90</span>
                <span className="text-gray-500 mb-1">/mês</span>
              </div>
              <p className="text-emerald-400 text-sm mb-6">Menos de R$3,30 por dia</p>

              <div className="text-left space-y-3 mb-8">
                {[
                  'Cadastro de clientes e veículos ilimitados',
                  'Ordens de serviço completas',
                  'Orçamentos profissionais',
                  'Controle de estoque',
                  'Gestão financeira (contas, vendas, fluxo)',
                  'Lembretes automáticos de manutenção',
                  'IA que atende no WhatsApp 24h',
                  'Suporte por WhatsApp',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Check size={16} className="text-emerald-400 shrink-0" />
                    <span className="text-gray-300 text-sm">{item}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/cadastro"
                className="block w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-lg py-4 rounded-xl transition-all hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/25"
              >
                Testar grátis por 7 dias
              </Link>
              <p className="text-gray-500 text-xs mt-3">Sem cartão de crédito. Cancele quando quiser.</p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={200}>
            <p className="text-center text-gray-500 text-sm mt-6">
              💡 Quanto custa uma recepcionista? <span className="text-white">R$2.000+/mês.</span><br />
              O LoopIA faz o atendimento por <span className="text-emerald-400">R$97,90.</span>
            </p>
          </AnimatedSection>
        </div>
      </section>


      {/* ============ FAQ ============ */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <AnimatedSection>
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
              Dúvidas frequentes
            </h2>
          </AnimatedSection>

          <AnimatedSection delay={100}>
            <div className="space-y-3">
              <FaqItem
                question="Preciso de cartão de crédito pra testar?"
                answer="Não. O teste de 7 dias é 100% grátis, sem pedir cartão. Só cadastra e começa a usar."
              />
              <FaqItem
                question="Funciona no celular?"
                answer="Sim. 100% online, funciona em qualquer celular, tablet ou computador. Só precisa de internet."
              />
              <FaqItem
                question="É difícil de configurar?"
                answer="Não. Em 10 minutos sua oficina está funcionando no sistema. É mais fácil que trocar óleo."
              />
              <FaqItem
                question="Meus dados estão seguros?"
                answer="Sim. Usamos criptografia e servidores protegidos. Seus dados são só seus."
              />
              <FaqItem
                question="Posso cancelar a qualquer momento?"
                answer="Sim. Sem multa, sem fidelidade. Cancele quando quiser com um clique."
              />
              <FaqItem
                question="A IA atende bem os clientes?"
                answer="Sim. Ela usa inteligência artificial avançada, responde dúvidas, informa preços, agenda serviços e cadastra clientes automaticamente."
              />
              <FaqItem
                question="Já tenho outro sistema. Consigo migrar?"
                answer="Sim. Nossa equipe te ajuda na migração gratuitamente."
              />
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ============ CTA FINAL ============ */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <AnimatedSection>
            <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 border border-emerald-500/20 rounded-2xl p-8 sm:p-12 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                Sua oficina merece trabalhar de forma inteligente
              </h2>
              <p className="text-gray-400 mb-8 max-w-lg mx-auto">
                Comece hoje. Em 7 dias você vai se perguntar por que não fez isso antes.
              </p>
              <Link
                href="/cadastro"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-lg px-8 py-4 rounded-xl transition-all hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/25"
              >
                Começar meu teste grátis
                <ArrowRight size={20} />
              </Link>
              <p className="text-gray-500 text-sm mt-4">
                Sem cartão. Sem contrato. Sem pegadinha.
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="py-12 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center">
              <Image src="/logo.png" alt="LoopIA" width={70} height={70} />
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <Link href="/login" className="hover:text-white transition-colors">Entrar</Link>
              <Link href="/cadastro" className="hover:text-white transition-colors">Cadastrar</Link>
              <Link href="/consulta" className="hover:text-white transition-colors">Consulta</Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-gray-600 text-xs">
              © {new Date().getFullYear()} LoopIA. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>

      {/* ============ STICKY CTA MOBILE ============ */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-white/10 p-3 sm:hidden z-50">
        <Link
          href="/cadastro"
          className="block w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-center py-3.5 rounded-xl transition-all"
        >
          Testar grátis por 7 dias
        </Link>
      </div>
    </div>
  );
}
