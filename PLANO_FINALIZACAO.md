# Plano de Finalização - LubIA (100%)

## Status Atual: ~65% MVP / ~40% Feature Completo

---

## FASE 1: Correções Críticas (Prioridade Alta)
*Estimativa: 1-2 dias*

### 1.1 Lembretes - Integração com Banco de Dados
- [ ] Conectar página `/lembretes` com API real
- [ ] Criar API `/api/lembretes` (GET, POST, PUT, DELETE)
- [ ] Exibir lembretes do banco ao invés de dados mockados
- [ ] Permitir criar/editar/excluir lembretes
- [ ] Filtrar por status (pendente, enviado, vencido)

### 1.2 Configurações - Implementação Básica
- [ ] Dados da Oficina: nome, CNPJ, endereço, telefone, logo
- [ ] Criar tabela `Configuracao` no schema Prisma
- [ ] API `/api/configuracoes` para salvar/carregar
- [ ] Persistir configurações no banco

### 1.3 Relatórios Básicos
- [ ] Relatório de faturamento mensal
- [ ] Relatório de serviços por período
- [ ] Relatório de produtos mais vendidos
- [ ] Exportar para PDF/Excel

---

## FASE 2: Funcionalidades Essenciais (Prioridade Alta)
*Estimativa: 2-3 dias*

### 2.1 Histórico do Veículo
- [ ] Página de detalhes do veículo com timeline de O.S.
- [ ] Mostrar todas as O.S. anteriores do veículo
- [ ] Exibir km em cada visita para rastrear evolução
- [ ] Alertar próxima manutenção baseada em km

### 2.2 Lembretes Automáticos
- [ ] Calcular próxima troca de óleo (km ou data)
- [ ] Gerar lembretes automaticamente ao concluir O.S.
- [ ] Marcar lembrete como enviado ao clicar "WhatsApp"

### 2.3 Dashboard Aprimorado
- [ ] Gráfico de faturamento (últimos 6 meses)
- [ ] Gráfico de O.S. por status
- [ ] Top 5 clientes por faturamento
- [ ] Produtos com estoque baixo (alerta)

### 2.4 Busca Global
- [ ] Campo de busca no header
- [ ] Buscar em clientes, veículos, O.S., produtos
- [ ] Resultados agrupados por categoria
- [ ] Atalho de teclado (Ctrl+K)

---

## FASE 3: Integrações (Prioridade Média)
*Estimativa: 2-3 dias*

### 3.1 WhatsApp Business API
- [ ] Integração real com WhatsApp Business API (ou Z-API/Evolution)
- [ ] Enviar mensagens automáticas de lembrete
- [ ] Templates de mensagem configuráveis
- [ ] Histórico de mensagens enviadas

### 3.2 Impressão de O.S.
- [ ] Template de impressão formatado (A4)
- [ ] Incluir logo da oficina
- [ ] Assinatura do cliente (campo)
- [ ] Termos e condições

### 3.3 OCR Aprimorado
- [ ] Testar e validar OCR de placa
- [ ] OCR de nota fiscal para entrada de estoque
- [ ] Feedback visual durante processamento

---

## FASE 4: Experiência do Usuário (Prioridade Média)
*Estimativa: 1-2 dias*

### 4.1 Notificações
- [ ] Toast notifications para todas as ações
- [ ] Notificação de estoque baixo
- [ ] Notificação de O.S. atrasadas
- [ ] Badge no menu para alertas pendentes

### 4.2 Atalhos e Produtividade
- [ ] Atalhos de teclado (N para novo, E para editar)
- [ ] Ações em lote (selecionar múltiplos itens)
- [ ] Duplicar O.S. existente
- [ ] Templates de O.S. (ex: "Troca de óleo padrão")

### 4.3 Mobile Responsivo
- [ ] Testar todas as páginas em mobile
- [ ] Menu hamburguer funcional
- [ ] Tabelas com scroll horizontal
- [ ] Modais ocupando tela cheia no mobile

---

## FASE 5: Segurança e Multi-usuário (Prioridade para Produção)
*Estimativa: 3-5 dias*

### 5.1 Autenticação
- [ ] Login com email/senha
- [ ] Recuperação de senha
- [ ] Sessão com JWT ou cookies seguros
- [ ] Logout automático por inatividade

### 5.2 Controle de Acesso
- [ ] Roles: Admin, Mecânico, Atendente
- [ ] Permissões por módulo
- [ ] Log de ações (auditoria)

### 5.3 Backup e Segurança
- [ ] Backup automático do banco
- [ ] Exportar todos os dados (LGPD)
- [ ] Soft delete em todas as entidades

---

## FASE 6: Extras (Nice to Have)
*Estimativa: Variável*

### 6.1 Financeiro
- [ ] Contas a receber
- [ ] Formas de pagamento por O.S.
- [ ] Controle de caixa diário
- [ ] Comissão por mecânico

### 6.2 Agendamento Online
- [ ] Link público para cliente agendar
- [ ] Escolher data/hora disponível
- [ ] Confirmação por WhatsApp

### 6.3 App Mobile (PWA)
- [ ] Service Worker para offline
- [ ] Push notifications
- [ ] Instalar como app

---

## Ordem de Implementação Recomendada

```
Semana 1:
├── Fase 1.1: Lembretes (banco de dados)
├── Fase 1.2: Configurações básicas
└── Fase 2.1: Histórico do veículo

Semana 2:
├── Fase 2.2: Lembretes automáticos
├── Fase 2.3: Dashboard aprimorado
└── Fase 1.3: Relatórios básicos

Semana 3:
├── Fase 3.1: WhatsApp (se necessário)
├── Fase 3.2: Impressão de O.S.
└── Fase 4.1-4.3: UX improvements

Semana 4+:
├── Fase 5: Autenticação (quando for para produção)
└── Fase 6: Extras conforme demanda
```

---

## Módulos 100% Prontos

| Módulo | Status | Observações |
|--------|--------|-------------|
| Clientes | ✅ 100% | CRUD completo, CEP, formatação |
| Veículos | ✅ 100% | CRUD, OCR placa, link para O.S. |
| Serviços | ✅ 100% | Catálogo com categorias e preços |
| Ordens de Serviço | ✅ 100% | Wizard 3 passos, status, PDF, calendário |
| Estoque | ✅ 100% | CRUD, movimentações, alertas |
| Dashboard | ✅ 90% | Falta gráficos |

## Módulos Parciais

| Módulo | Status | O que falta |
|--------|--------|-------------|
| Lembretes | 🟡 30% | Integrar com banco, criar API |
| Configurações | 🟡 10% | Implementar formulários e salvar |
| WhatsApp | 🟡 40% | Integração real com API |
| Relatórios | 🔴 0% | Criar do zero |

---

## Métricas de Sucesso

Para considerar o sistema 100%:

1. **Funcional**: Todas as páginas funcionando sem erros
2. **Dados**: Nenhum dado mockado/hardcoded
3. **UX**: Feedback visual para todas as ações
4. **Mobile**: Usável em celular
5. **Estável**: Sem crashes ou erros 500
6. **Documentado**: README com instruções de uso

---

*Documento gerado em: 06/02/2026*
*Versão: 1.0*
