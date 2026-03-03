# LOOPIA - Roteiro de Apresentacao para Clientes

## Guia Completo Passo a Passo para Demonstracao do Sistema

---

## SUMARIO

1. Introducao e Acesso ao Sistema
2. Dashboard - Painel Principal
3. Cadastro de Clientes
4. Cadastro de Veiculos
5. Ordens de Servico
6. Orcamentos
7. Vendas Rapidas
8. Devolucoes e Trocas
9. Gestao de Estoque
10. Financeiro - Contas a Receber
11. Historico de Transacoes
12. WhatsApp e Chatbot IA (LoopIA)
13. Lembretes de Manutencao
14. Configuracoes do Sistema
15. Gestao de Usuarios
16. Assinatura e Plano
17. Portal do Cliente (Consulta Publica)
18. Ideario - Sugestoes de Melhorias
19. Recursos Extras (Busca Global, Temas, Perfis)

---

## 1. INTRODUCAO E ACESSO AO SISTEMA

### O que e o Loopia?
O Loopia e um sistema completo de gestao para oficinas automotivas. Ele permite gerenciar clientes, veiculos, ordens de servico, estoque, financeiro, comunicacao via WhatsApp com chatbot inteligente, lembretes de manutencao e muito mais - tudo em uma unica plataforma.

### Passo a Passo - Primeiro Acesso

**1.1 Acessar a tela de Login**
- Abra o navegador e acesse o endereco do sistema
- Voce vera a tela de login com os campos de Email e Senha
- No canto superior direito ha um botao para alternar entre tema Claro e Escuro

**1.2 Criar uma nova conta (Primeiro uso)**
- Clique em "Criar conta" na tela de login
- Preencha os dados da empresa:
  - **CNPJ**: Ao digitar o CNPJ, o sistema busca automaticamente os dados da empresa (nome, telefone, endereco) via API da Receita Federal
  - **Nome da Empresa**: Preenchido automaticamente ou digite manualmente
  - **Telefone**: Preenchido automaticamente ou digite manualmente
  - **Endereco**: Preenchido automaticamente ou digite manualmente
- Preencha os dados do usuario:
  - **Nome completo**
  - **Email**
  - **Senha** e **Confirmacao de senha**
- Clique em "Cadastrar"
- O sistema cria a empresa e o usuario com perfil ADMIN automaticamente
- Um periodo de teste (trial) de 14 dias e iniciado

**1.3 Realizar Login**
- Digite seu email e senha
- Clique em "Entrar"
- Voce sera redirecionado ao Dashboard principal

**1.4 Recuperacao de Senha**
- Na tela de login, clique em "Esqueci minha senha"
- Digite seu email cadastrado
- Voce recebera um email com um link para redefinir a senha
- O link expira em 1 hora

---

## 2. DASHBOARD - PAINEL PRINCIPAL

### O que e?
O Dashboard e a tela inicial do sistema, que apresenta uma visao geral de toda a operacao da oficina em tempo real.

### Passo a Passo - Navegando pelo Dashboard

**2.1 Cartoes de Metricas (topo da tela)**
- **Total de Clientes**: Quantidade de clientes cadastrados
- **Veiculos Registrados**: Quantidade de veiculos no sistema
- **Ordens do Mes**: Quantidade de ordens de servico criadas no mes atual
- **Faturamento Mensal**: Valor total faturado no mes (soma das ordens concluidas/entregues)

**2.2 Servicos de Hoje**
- Lista todos os servicos agendados para o dia atual
- Cada servico mostra:
  - Horario agendado
  - Nome do cliente
  - Placa do veiculo
  - Status atual (Agendado, Em Andamento, Concluido, etc.)
  - Valor total do servico
- Clique em qualquer servico para ver os detalhes completos

**2.3 Vendas de Hoje**
- Mostra as vendas rapidas realizadas no dia
- Exibe: nome do cliente, quantidade de itens, valor total
- Indica se o pagamento foi realizado ou esta pendente

**2.4 Credito Pessoal (A Receber)**
- Lista os valores pendentes de recebimento
- Mostra alertas visuais para pagamentos em atraso
- Exibe o valor total pendente e a data prevista de pagamento

**2.5 Clientes Aguardando**
- Cartoes horizontais com clientes que estao aguardando atendimento
- Mostra o tempo de espera de cada cliente
- Botao rapido para contato via WhatsApp

**2.6 Lembretes Pendentes**
- Lista de lembretes de manutencao que precisam ser enviados
- Codigo de cores por urgencia:
  - **Vermelho**: Vencido (atrasado)
  - **Laranja**: Urgencia alta
  - **Amarelo**: Urgencia media
  - **Azul**: Urgencia baixa
- Botao para enviar lembrete via WhatsApp diretamente

---

## 3. CADASTRO DE CLIENTES

### O que e?
Modulo para gerenciar todos os clientes da oficina, com informacoes de contato, documentos e vinculo com veiculos.

### Passo a Passo

**3.1 Acessar o modulo**
- No menu lateral, clique em "Cadastros" e depois em "Clientes"

**3.2 Visualizar lista de clientes**
- A tela mostra todos os clientes cadastrados em formato de tabela/lista
- Use a barra de busca no topo para pesquisar por nome, telefone ou CPF
- Cada cliente mostra: nome, telefone, email, quantidade de veiculos vinculados

**3.3 Cadastrar novo cliente**
- Clique no botao "+ Novo Cliente"
- Preencha o formulario:
  - **Nome** (obrigatorio)
  - **Telefone** (com formatacao automatica)
  - **Email**
  - **CPF** (com validacao automatica)
  - **CEP**: Ao digitar o CEP, o endereco e preenchido automaticamente
  - **Endereco completo**: Rua, numero, complemento, bairro, cidade, estado
  - **Observacoes**: Campo livre para anotacoes sobre o cliente
- Clique em "Salvar"

**3.4 Editar cliente**
- Clique no botao de edicao (icone de lapis) ao lado do cliente
- Altere os campos desejados
- Clique em "Salvar"

**3.5 Excluir cliente**
- Clique no botao de exclusao (icone de lixeira)
- Confirme a exclusao no dialogo de confirmacao
- **Atencao**: Clientes com veiculos ou ordens vinculadas nao podem ser excluidos

**3.6 Ver veiculos do cliente**
- Na lista de clientes, clique no cliente para expandir
- Os veiculos vinculados serao exibidos abaixo do nome do cliente

---

## 4. CADASTRO DE VEICULOS

### O que e?
Modulo para registrar e gerenciar os veiculos que passam pela oficina, com rastreamento de quilometragem e historico de servicos.

### Passo a Passo

**4.1 Acessar o modulo**
- No menu lateral, clique em "Cadastros" e depois em "Veiculos"

**4.2 Visualizar lista de veiculos**
- Todos os veiculos cadastrados sao exibidos com: placa, marca, modelo, ano, cliente vinculado
- Use a barra de busca para pesquisar por placa ou modelo

**4.3 Cadastrar novo veiculo**
- Clique no botao "+ Novo Veiculo"
- Preencha o formulario:
  - **Placa** (obrigatorio): Aceita formato antigo (ABC-1234) e Mercosul (ABC1D23)
  - **Marca** (ex: Toyota, Honda, Fiat)
  - **Modelo** (ex: Corolla, Civic, Uno)
  - **Ano**
  - **Cor**
  - **Cilindrada do motor**
  - **KM Inicial**: Quilometragem no primeiro registro
  - **KM Atual**: Quilometragem atual
  - **Cliente**: Selecione o cliente proprietario (opcional)
- Clique em "Salvar"

**4.4 OCR de Placa (Reconhecimento Automatico)**
- Ao cadastrar um veiculo, voce pode usar a funcao OCR
- Tire uma foto da placa do veiculo
- O sistema reconhece automaticamente a placa usando inteligencia artificial
- O campo de placa e preenchido automaticamente
- O sistema identifica se e formato antigo ou Mercosul

**4.5 Historico do veiculo**
- Clique em um veiculo para ver seu historico completo
- Visualize todas as ordens de servico realizadas
- Acompanhe a evolucao da quilometragem

---

## 5. ORDENS DE SERVICO

### O que e?
O modulo principal do sistema. Permite criar, gerenciar e acompanhar todas as ordens de servico da oficina, desde o agendamento ate a entrega do veiculo.

### Passo a Passo

**5.1 Acessar o modulo**
- No menu lateral, clique em "Operacoes" e depois em "Ordens de Servico"

**5.2 Visualizar lista de ordens**
- Todas as ordens sao exibidas com: numero, cliente, veiculo, status, valor, data
- Use os filtros para buscar por status, data ou cliente
- Icones coloridos indicam o status de cada ordem:
  - **Azul**: Agendado
  - **Roxo**: Em Andamento
  - **Amarelo**: Aguardando Pecas
  - **Verde**: Concluido
  - **Ciano**: Entregue
  - **Vermelho**: Cancelado

**5.3 Criar nova Ordem de Servico (Wizard de 3 Etapas)**

**Etapa 1 - Dados da Ordem:**
- Clique em "+ Nova Ordem"
- Selecione a **data agendada** no calendario
- Selecione o **cliente** (busca por nome)
- Selecione o **veiculo** do cliente (placa e modelo sao exibidos)
- Informe a **KM de entrada** (quilometragem atual do veiculo)
- Adicione **observacoes** se necessario
- Clique em "Proximo"

**Etapa 2 - Servicos e Produtos:**
- **Adicionar Servicos**:
  - Clique em "Adicionar Servico"
  - Selecione o servico do catalogo (ex: Troca de Oleo, Revisao, Filtros)
  - A quantidade e o preco base sao preenchidos automaticamente
  - Ajuste a quantidade ou preco se necessario
- **Adicionar Produtos/Pecas**:
  - Clique em "Adicionar Produto"
  - Selecione o produto do estoque (ex: Oleo 5W30, Filtro de oleo)
  - Informe a quantidade utilizada
  - O preco e calculado automaticamente
  - O estoque e atualizado quando a ordem e concluida
- **Servicos Extras**:
  - Clique em "Adicionar Servico Extra"
  - Descreva o servico adicional (ex: Mao de obra, Diagnostico)
  - Informe o valor
- **Desconto**:
  - Aplique desconto percentual sobre o total se necessario
- O sistema calcula automaticamente os subtotais e o total geral
- Clique em "Proximo"

**Etapa 3 - Resumo e Confirmacao:**
- Revise todos os dados da ordem
- Verifique o valor total
- Selecione a **forma de pagamento**:
  - Dinheiro
  - PIX
  - Cartao de Credito
  - Cartao de Debito
  - Credito Pessoal (fiado)
- E possivel dividir o pagamento em multiplas formas
- Clique em "Confirmar" para criar a ordem

**5.4 Gerenciar status da Ordem**
- Clique na ordem para abrir os detalhes
- Use os botoes de status para avancar no fluxo:
  - Agendado -> Em Andamento -> Concluido -> Entregue
  - Ou: Agendado -> Aguardando Pecas -> Em Andamento -> Concluido -> Entregue
  - A qualquer momento: Cancelar
- Cada mudanca de status e registrada com data e hora

**5.5 Gerar PDF da Ordem**
- Na tela de detalhes da ordem, clique em "Gerar PDF"
- O PDF inclui:
  - Dados da empresa (nome, CNPJ, telefone, endereco)
  - Numero da ordem
  - Dados do cliente e do veiculo
  - Lista de servicos realizados com precos
  - Lista de produtos utilizados com precos
  - Servicos extras
  - Descontos aplicados
  - Valor total
- O PDF pode ser baixado ou impresso

**5.6 Visualizacao em Calendario**
- Alterne para a visao de calendario
- Visualize as ordens agendadas em formato de calendario mensal
- Clique em um dia para ver os servicos agendados

---

## 6. ORCAMENTOS

### O que e?
Modulo para criar orcamentos/propostas de servico para clientes, que podem ser aprovados e convertidos em ordens de servico.

### Passo a Passo

**6.1 Acessar o modulo**
- No menu lateral, clique em "Operacoes" e depois em "Orcamentos"

**6.2 Criar novo orcamento**
- Clique em "+ Novo Orcamento"
- Preencha os dados:
  - **Nome do cliente** (pode ser um cliente nao cadastrado)
  - **Telefone** do cliente
  - **Servicos**: Selecione os servicos e quantidades
  - **Produtos**: Selecione os produtos necessarios
  - **Servicos extras**: Adicione mao de obra ou servicos adicionais
  - **Observacoes**
  - **Desconto** (percentual)
- Clique em "Salvar"

**6.3 Acompanhar status do orcamento**
- Os orcamentos possuem os seguintes status:
  - **Pendente** (Amarelo): Aguardando resposta do cliente
  - **Aprovado** (Verde): Cliente aceitou o orcamento
  - **Recusado** (Vermelho): Cliente nao aceitou
  - **Expirado** (Cinza): Orcamento venceu o prazo
  - **Convertido** (Azul): Foi transformado em Ordem de Servico

**6.4 Converter orcamento em Ordem de Servico**
- Quando o cliente aprovar o orcamento, clique em "Converter em OS"
- O sistema cria automaticamente uma nova Ordem de Servico com todos os dados do orcamento
- O status do orcamento muda para "Convertido"

**6.5 Enviar orcamento por WhatsApp**
- Clique no botao de WhatsApp na linha do orcamento
- O sistema abre a conversa com o cliente e envia o orcamento formatado

**6.6 Gerar PDF do orcamento**
- Clique em "Gerar PDF" para baixar o orcamento em formato PDF profissional

---

## 7. VENDAS RAPIDAS

### O que e?
Modulo para vendas de balcao rapidas, ideal para vender produtos sem necessidade de abrir uma ordem de servico completa.

### Passo a Passo

**7.1 Acessar o modulo**
- No menu lateral, clique em "Operacoes" e depois em "Vendas Rapidas"

**7.2 Registrar nova venda**
- Clique em "+ Nova Venda"
- **Nome do cliente** (opcional - para vendas de balcao pode nao ser necessario)
- **Adicionar produtos**:
  - Pesquise o produto pelo nome ou codigo
  - Selecione o produto
  - Informe a quantidade
  - O preco unitario e preenchido automaticamente
  - Ajuste o preco se necessario
  - Aplique desconto por item se desejado
- Adicione quantos produtos forem necessarios
- **Observacoes** (campo opcional)

**7.3 Registrar pagamento**
- Selecione a forma de pagamento:
  - **Dinheiro**
  - **PIX**
  - **Cartao de Credito**
  - **Cartao de Debito**
  - **Credito Pessoal** (fiado - gera um valor "a receber")
- E possivel dividir em multiplas formas de pagamento
  - Exemplo: R$ 50 no PIX + R$ 50 no Debito
- Clique em "Finalizar Venda"

**7.4 Visualizar vendas realizadas**
- A lista mostra todas as vendas com: numero, cliente, itens, valor, forma de pagamento, status
- Vendas com pagamento pendente sao destacadas

---

## 8. DEVOLUCOES E TROCAS

### O que e?
Modulo para gerenciar devolucoes de produtos vendidos, seja para troca ou reembolso.

### Passo a Passo

**8.1 Acessar o modulo**
- No menu lateral, clique em "Operacoes" e depois em "Devolucoes"

**8.2 Registrar uma devolucao**
- Clique em "+ Nova Devolucao"
- Selecione a **venda original** (Venda Rapida)
- Escolha o **tipo de devolucao**:
  - **Troca**: O cliente quer trocar o produto por outro
  - **Reembolso**: O cliente quer o dinheiro de volta
- Selecione o **motivo**:
  - **Defeito**: Produto com problema
  - **Arrependimento**: Cliente mudou de ideia
  - **Outro**: Especificar no campo de observacoes
- Selecione os **produtos a serem devolvidos** e as quantidades
- Para trocas: selecione os novos produtos desejados
- O sistema calcula automaticamente a diferenca de valor (se houver)
- Clique em "Confirmar"

**8.3 Acompanhar devolucoes**
- A lista mostra todas as devolucoes com tipo, motivo, valor e status

---

## 9. GESTAO DE ESTOQUE

### O que e?
Modulo completo para gerenciar o estoque de produtos, pecas e insumos da oficina.

### Passo a Passo

**9.1 Acessar o modulo**
- No menu lateral, clique em "Estoque"

**9.2 Visualizar produtos**
- Lista todos os produtos cadastrados com:
  - Codigo, nome, marca, categoria
  - Quantidade atual em estoque
  - Preco de venda
  - Status (ativo/inativo)
- Produtos com estoque abaixo do minimo sao destacados com alerta visual (vermelho)
- Use a barra de busca para pesquisar por nome, codigo ou marca
- Filtre por categoria

**9.3 Cadastrar novo produto**
- Clique em "+ Novo Produto"
- Preencha os campos:
  - **Codigo** do produto
  - **Nome** (obrigatorio)
  - **Marca**
  - **Categoria**: Oleo Lubrificante, Aditivo, Graxa, Filtro de Oleo, Filtro de Ar, Filtro de Ar Condicionado, Filtro de Combustivel, Acessorio, Outro
  - **Unidade de medida**: Litro, Unidade, KG, Metro
  - **Quantidade atual** em estoque
  - **Estoque minimo** (para alertas)
  - **Preco de compra**
  - **Preco de venda**
  - **Preco atacado** (opcional)
  - **Localizacao** no estoque (prateleira, galpao, etc.)
  - **NCM** (classificacao fiscal)
  - **CFOP** (codigo fiscal)
  - **Fornecedor / Filial**
- Clique em "Salvar"

**9.4 OCR de Nota Fiscal**
- Ao cadastrar produtos, use a funcao OCR para ler notas fiscais
- Tire uma foto ou carregue a imagem da nota fiscal
- O sistema extrai automaticamente:
  - Dados do fornecedor (nome, CNPJ)
  - Lista de produtos com quantidades e valores
  - Informacoes fiscais
- Os campos do formulario sao preenchidos automaticamente

**9.5 Movimentacao de Estoque**
- Para cada produto, voce pode registrar movimentacoes:
  - **Entrada**: Compra de novos produtos
  - **Saida**: Venda ou uso em servicos
  - **Ajuste**: Correcao de quantidades (inventario)
  - **Devolucao**: Produto devolvido ao estoque
- Cada movimentacao registra: tipo, quantidade, documento de referencia, data
- O saldo e atualizado automaticamente

**9.6 Alertas de estoque baixo**
- Produtos com quantidade abaixo do minimo definido aparecem com alerta
- O Dashboard tambem mostra esses alertas
- Identifique rapidamente o que precisa ser reposto

---

## 10. FINANCEIRO - CONTAS A RECEBER

### O que e?
Modulo para acompanhar todos os valores pendentes de recebimento da oficina, seja de ordens de servico ou vendas rapidas.

### Passo a Passo

**10.1 Acessar o modulo**
- No menu lateral, clique em "Financeiro" e depois em "A Receber"

**10.2 Visualizar pendencias**
- A tela mostra todos os valores pendentes com:
  - Tipo (Ordem de Servico ou Venda Rapida)
  - Numero do documento
  - Nome do cliente
  - Valor total pendente
  - Data prevista de pagamento
  - Dias restantes ou em atraso
- Pagamentos em atraso sao destacados em vermelho
- Filtre por tipo: Todos, Ordens, Vendas

**10.3 Estatisticas financeiras**
- No topo da tela, visualize:
  - Total pendente
  - Quantidade de pendencias
  - Divisao por tipo (ordens vs. vendas)

**10.4 Registrar recebimento**
- Quando o cliente realizar o pagamento, clique em "Registrar Pagamento"
- Selecione a forma de pagamento utilizada
- O item e removido da lista de pendencias automaticamente

---

## 11. HISTORICO DE TRANSACOES

### O que e?
Modulo que centraliza todo o historico de ordens de servico e vendas rapidas realizadas.

### Passo a Passo

**11.1 Acessar o modulo**
- No menu lateral, clique em "Financeiro" e depois em "Historico"

**11.2 Consultar transacoes**
- A tela exibe uma lista unificada de todas as transacoes
- Cada transacao mostra:
  - Icone indicando o tipo (Ordem ou Venda)
  - Numero/ID da transacao
  - Nome do cliente
  - Telefone
  - Descricao resumida
  - Quantidade de itens
  - Valor total
  - Forma de pagamento (com icone colorido)
  - Data e hora
  - Status

**11.3 Filtros e busca**
- Filtre por tipo: Todos, Ordens, Vendas
- Filtre por periodo (data inicial e final)
- Busque por nome do cliente ou numero da transacao

**11.4 Resumo do periodo**
- No topo, visualize:
  - Total de vendas no periodo
  - Faturamento total
  - Distribuicao por forma de pagamento

---

## 12. WHATSAPP E CHATBOT IA (LoopIA)

### O que e?
Integracao completa com WhatsApp Business para comunicacao com clientes, incluindo um chatbot com inteligencia artificial que responde automaticamente.

### Passo a Passo

**12.1 Acessar o modulo**
- No menu lateral, clique em "WhatsApp"

**12.2 Visualizar conversas**
- A tela mostra a lista de todas as conversas ativas
- Cada conversa exibe:
  - Numero de telefone / nome do cliente
  - Ultima mensagem enviada ou recebida
  - Contador de mensagens nao lidas
  - Data/hora da ultima mensagem
- Filtre por: Todas, Aguardando atendente

**12.3 Enviar mensagens**
- Clique em uma conversa para abri-la
- Visualize o historico completo de mensagens
- Digite sua mensagem no campo de texto
- Clique em enviar
- Voce tambem pode enviar imagens e documentos

**12.4 Usar templates de mensagem**
- Clique no icone de templates
- Selecione um template pre-definido:
  - **Confirmacao de Agendamento**: "Ola! Confirmamos seu agendamento para o dia [data]..."
  - **Veiculo Pronto**: "Seu veiculo esta pronto para retirada..."
  - **Lembrete de Manutencao**: "Esta na hora de fazer a revisao do seu veiculo..."
  - **Orcamento**: "Segue o orcamento solicitado: [itens e valores]..."
- O template e preenchido com as variaveis do cliente automaticamente
- Edite se necessario e envie

**12.5 Chatbot IA (LoopIA)**
- O chatbot responde automaticamente as mensagens dos clientes
- Ele e capaz de:
  - Responder duvidas sobre servicos oferecidos
  - Informar horarios de funcionamento
  - Iniciar agendamentos
  - Encaminhar para atendimento humano quando necessario
  - Transcrever mensagens de audio
- Quando o chatbot nao consegue resolver, ele transfere para um atendente humano
- Voce pode pausar o chatbot em conversas especificas para atender manualmente

**12.6 Gerenciar conversas**
- **Arquivar**: Mova conversas finalizadas para o arquivo
- **Pausar IA**: Desative o chatbot para uma conversa especifica
- **Transferir**: Encaminhe a conversa para outro atendente

---

## 13. LEMBRETES DE MANUTENCAO

### O que e?
Sistema automatico de lembretes que avisa os clientes quando esta na hora de realizar manutencoes preventivas nos veiculos.

### Passo a Passo

**13.1 Acessar o modulo**
- No menu lateral, clique em "Lembretes"

**13.2 Como os lembretes sao gerados**
- Os lembretes sao gerados **automaticamente** pelo sistema quando:
  - Uma ordem de servico e concluida
  - O sistema calcula a proxima data/km de manutencao com base nos intervalos configurados nos servicos
- Tipos de lembrete:
  - Troca de Oleo
  - Revisao
  - Filtros
  - Pneus
  - Freios
  - Outros

**13.3 Visualizar lembretes**
- A lista mostra todos os lembretes pendentes com:
  - Veiculo (marca, modelo, placa)
  - Cliente (nome, telefone)
  - Tipo de servico
  - KM atual do veiculo
  - Dias restantes ou em atraso
  - Nivel de urgencia (cores)

**13.4 Niveis de urgencia**
- **Vencido** (Vermelho): O prazo ja passou - "X dias em atraso"
- **Alta** (Laranja): Menos de 7 dias para vencer - "Urgente"
- **Media** (Amarelo): Entre 7 e 30 dias
- **Baixa** (Azul): Mais de 30 dias - "Normal"

**13.5 Enviar lembrete por WhatsApp**
- Clique no botao de WhatsApp ao lado do lembrete
- O sistema abre a conversa com o cliente e envia uma mensagem formatada
- O lembrete e marcado como "Enviado"

**13.6 Criar lembrete manual**
- Clique em "+ Novo Lembrete"
- Selecione o veiculo, tipo de servico, data e observacoes
- Clique em "Salvar"

---

## 14. CONFIGURACOES DO SISTEMA

### O que e?
Area de configuracao da empresa, integracao com WhatsApp, chatbot e horarios de funcionamento. Disponivel apenas para usuarios ADMIN.

### Passo a Passo

**14.1 Acessar configuracoes**
- No menu lateral, clique em "Configuracoes"

**14.2 Dados da Empresa**
- Edite as informacoes basicas:
  - Nome da oficina
  - CNPJ
  - Telefone
  - Endereco completo
  - Logo da empresa (upload de imagem)

**14.3 Horarios de Funcionamento**
- Configure os horarios para cada dia da semana:
  - Ativar/desativar cada dia (ex: desativar domingo)
  - Horario de abertura
  - Horario de fechamento
- Esses horarios sao usados pelo chatbot para informar os clientes

**14.4 Configuracao do WhatsApp**
- **Conectar WhatsApp**:
  - Clique em "Conectar"
  - Um QR Code sera exibido na tela
  - Escaneie o QR Code com o WhatsApp Business do celular
  - Aguarde a confirmacao de conexao
- **Status**: Indica se o WhatsApp esta Conectado ou Desconectado
- **Desconectar**: Clique em "Desconectar" para encerrar a sessao

**14.5 Configuracao do Chatbot IA**
- **Ativar/Desativar**: Toggle para ligar ou desligar o chatbot
- **Nome do bot**: Defina o nome que o chatbot usara (ex: "LoopIA")
- **Mensagem de boas-vindas**: Personalize a saudacao inicial
- **Descricao dos servicos**: Descreva os servicos que a oficina oferece (o chatbot usa essa informacao para responder os clientes)
- **Horario de atendimento**: O chatbot informa automaticamente os horarios

**14.6 Catalogo de Servicos**
- Gerencie os servicos oferecidos pela oficina:
  - Adicionar novo servico
  - Editar servico existente (nome, preco, categoria, intervalos)
  - Ativar/desativar servico
  - Excluir servico
- Categorias disponiveis: Troca de Oleo, Filtros, Pneus, Revisoes, Freios, Suspensao, Eletrica, Ar Condicionado, Outros

**14.7 Filiais / Fornecedores**
- Cadastre filiais ou fornecedores da oficina:
  - Nome
  - CNPJ
  - Status (ativo/inativo)

---

## 15. GESTAO DE USUARIOS

### O que e?
Modulo para gerenciar os usuarios que acessam o sistema, definindo funcoes e permissoes. Disponivel apenas para ADMIN.

### Passo a Passo

**15.1 Acessar o modulo**
- No menu lateral, clique em "Usuarios"

**15.2 Visualizar usuarios**
- Lista de todos os usuarios com: nome, email, funcao, status

**15.3 Criar novo usuario**
- Clique em "+ Novo Usuario"
- Preencha: nome, email, senha, funcao
- Selecione a **funcao/perfil**:
  - **ADMIN** (Roxo): Acesso total ao sistema, incluindo configuracoes e usuarios
  - **GERENTE** (Azul): Acesso a relatorios, ordens, orcamentos, estoque e lembretes
  - **ATENDENTE** (Verde): Acesso ao dashboard, ordens, WhatsApp e orcamentos
  - **VENDEDOR** (Laranja): Acesso a clientes, veiculos, orcamentos e WhatsApp
- Clique em "Salvar"

**15.4 Tabela de permissoes por funcao**

| Funcionalidade | Admin | Gerente | Atendente | Vendedor |
|---|---|---|---|---|
| Dashboard | Sim | Sim | Sim | Nao |
| Clientes e Veiculos | Sim | Sim | Sim | Sim |
| Ordens de Servico | Sim | Sim | Sim | Sim |
| Orcamentos | Sim | Sim | Sim | Sim |
| Vendas Rapidas | Sim | Sim | Sim | Sim |
| Financeiro (A Receber) | Sim | Sim | Sim | Sim |
| Estoque | Sim | Sim | Nao | Nao |
| Lembretes | Sim | Sim | Nao | Nao |
| WhatsApp | Sim | Sim | Sim | Sim |
| Ideario | Sim | Sim | Sim | Sim |
| Usuarios | Sim | Nao | Nao | Nao |
| Configuracoes | Sim | Nao | Nao | Nao |
| Assinatura | Sim | Nao | Nao | Nao |

**15.5 Editar ou desativar usuario**
- Clique no usuario para editar seus dados ou alterar a funcao
- Ative ou desative usuarios conforme necessario

---

## 16. ASSINATURA E PLANO

### O que e?
Gerenciamento da assinatura do sistema Loopia, com pagamento via Stripe. Disponivel apenas para ADMIN.

### Passo a Passo

**16.1 Acessar o modulo**
- No menu lateral, clique em "Assinatura"

**16.2 Status da assinatura**
- Visualize o status atual:
  - **Trial**: Periodo de teste de 14 dias (gratuito)
  - **Ativo**: Assinatura ativa e paga
  - **Atrasado**: Pagamento pendente
  - **Cancelado**: Assinatura cancelada
  - **Nao Pago**: Inadimplente

**16.3 Gerenciar assinatura**
- **Assinar**: Clique em "Assinar" para iniciar o processo de pagamento via Stripe
- **Portal do Cliente**: Acesse o portal Stripe para:
  - Atualizar metodo de pagamento
  - Ver faturas e historico de pagamento
  - Baixar recibos
- **Cancelar**: Clique em "Cancelar Assinatura" (com confirmacao)

---

## 17. PORTAL DO CLIENTE (CONSULTA PUBLICA)

### O que e?
Pagina publica (sem necessidade de login) onde os clientes da oficina podem consultar o status dos seus veiculos.

### Passo a Passo

**17.1 Acessar o portal**
- Na tela de login, clique em "Sou cliente - ver status do veiculo"
- Ou acesse diretamente a URL de consulta

**17.2 Consultar veiculo**
- Digite a **placa** do veiculo
- Clique em "Buscar"
- O sistema exibe:
  - **Dados do veiculo**: Marca, modelo, ano, KM atual
  - **Historico de servicos**: Lista de todas as ordens realizadas com datas e status
  - **Proximas manutencoes**:
    - Ultima troca de oleo (data e KM) e proxima previsao
    - Ultimo alinhamento e proxima previsao
    - Ultima troca de filtros e proxima previsao

**17.3 Atualizar quilometragem**
- O cliente pode informar a KM atual do veiculo
- Isso ajuda a oficina a gerar lembretes mais precisos

---

## 18. IDEARIO - SUGESTOES DE MELHORIAS

### O que e?
Espaco colaborativo onde os usuarios podem sugerir melhorias, novas funcionalidades e correcoes para o sistema.

### Passo a Passo

**18.1 Acessar o modulo**
- No menu lateral, clique em "Ideario"

**18.2 Enviar uma sugestao**
- Clique em "+ Nova Ideia"
- Preencha:
  - **Titulo** da sugestao
  - **Descricao** detalhada
  - **Categoria**: Funcionalidade, Melhoria, Correcao de Bug, Integracao, Interface, Outro
  - **Impacto esperado**: Baixo, Medio, Alto, Critico
- Clique em "Enviar"

**18.3 Acompanhar sugestoes**
- Veja o status de cada ideia:
  - **Sugerida**: Enviada, aguardando avaliacao
  - **Em Avaliacao**: Equipe esta analisando
  - **Aprovada**: Aceita para desenvolvimento
  - **Em Desenvolvimento**: Sendo implementada
  - **Implementada**: Ja disponivel no sistema
  - **Arquivada**: Nao sera implementada no momento

**18.4 Estatisticas**
- Total de ideias enviadas
- Suas ideias pessoais
- Ideias aprovadas
- Ideias implementadas

---

## 19. RECURSOS EXTRAS

### 19.1 Busca Global
- No topo da tela, ha uma barra de busca universal
- Pesquise por qualquer termo e encontre resultados em:
  - **Clientes** (icone azul)
  - **Veiculos** (icone verde)
  - **Ordens de Servico** (icone amarelo)
  - **Produtos** (icone roxo)
- Clique no resultado para navegar diretamente ate o item

### 19.2 Tema Claro / Escuro
- Clique no icone de sol/lua no menu lateral
- Alterne entre o tema claro e escuro conforme sua preferencia
- A preferencia e salva automaticamente

### 19.3 Visibilidade Financeira
- No menu lateral, ha um toggle para mostrar/ocultar valores financeiros
- Util quando voce esta demonstrando o sistema para alguem e nao quer exibir valores

### 19.4 Menu Lateral Recolhivel
- Clique no botao de recolher no topo do menu lateral
- O menu se reduz a apenas icones, liberando mais espaco na tela
- Clique novamente para expandir

### 19.5 Perfil do Usuario
- No canto superior direito, clique no seu avatar
- Visualize seu nome e empresa
- Opcao para sair do sistema (Logout)

---

## DICAS PARA A APRESENTACAO

### Ordem sugerida de demonstracao:
1. Comece pelo **Login e Dashboard** para dar uma visao geral
2. Cadastre um **cliente de exemplo** com CEP automatico
3. Cadastre um **veiculo** (use o OCR se possivel)
4. Crie uma **Ordem de Servico** mostrando o wizard completo
5. Gere o **PDF** da ordem
6. Mostre o **Estoque** e como produtos sao vinculados
7. Demonstre uma **Venda Rapida** no balcao
8. Mostre o **WhatsApp** e o chatbot em acao
9. Apresente os **Lembretes** automaticos
10. Finalize com as **Configuracoes** e perfis de usuario

### Pontos fortes para destacar:
- Preenchimento automatico de CNPJ e CEP
- OCR para leitura de placas e notas fiscais
- Chatbot IA no WhatsApp
- Lembretes automaticos de manutencao
- Multiplas formas de pagamento
- Portal publico para clientes
- Controle de acesso por funcao
- Tema claro e escuro
- Geracao de PDF profissional
- Sistema multi-empresa (SaaS)

---

*Documento gerado para fins informativos - Roteiro de Apresentacao do Sistema Loopia*
*Data de geracao: Marco de 2026*
