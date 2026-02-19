# IBS Auto Center - Sistema de Gestão

## Problem Statement
Sistema de gestão de oficina mecânica com funcionalidades para gerenciamento de clientes, veículos, serviços, peças, agendamentos e orçamentos.

## Alterações Implementadas (19/02/2026)

### 1. Barra de Pesquisa - Peças e Serviços
- Adicionada barra de pesquisa na página de Peças (Parts.js)
- Adicionada barra de pesquisa na página de Serviços (Services.js)
- Filtro por nome e descrição em tempo real
- Implementado com useMemo para performance

### 2. Título da Aba Veículos
- Corrigido caracteres Unicode escapados (\u00ed -> í)
- Título agora exibe "VEÍCULOS" corretamente
- Todas as mensagens de toast também corrigidas

### 3. Campo Mão de Obra (Orçamentos)
- Adicionado campo `labor_cost` no backend (Quote model)
- Adicionado campo "Mão de Obra" no formulário de orçamento
- Cálculo automático: Total = Subtotal + Mão de Obra - Desconto
- Exibição do valor de mão de obra nos cards de orçamento
- PDF do orçamento inclui linha de Mão de Obra quando > 0

### 4. Nome e Veículo nos Orçamentos
- Cards de orçamento exibem nome do cliente em destaque
- Cards de orçamento exibem informações do veículo (Marca Modelo - Placa)
- Funciona para todos os status: Pendente, Aprovado, Rejeitado, Concluído

## Arquitetura

### Frontend (React)
- `/app/frontend/src/pages/Parts.js` - Gestão de peças com busca
- `/app/frontend/src/pages/Services.js` - Gestão de serviços com busca
- `/app/frontend/src/pages/Vehicles.js` - Gestão de veículos
- `/app/frontend/src/pages/Quotes.js` - Gestão de orçamentos com mão de obra

### Backend (FastAPI + MongoDB)
- `/app/backend/server.py` - API REST com endpoints CRUD
- Modelo Quote atualizado com campo `labor_cost`

## Credenciais
- Usuário: `ibs`
- Senha: `ibs1234`

## Backlog Futuro

### P1 - Alta Prioridade
- Relatórios de faturamento mensal
- Histórico de serviços por veículo

### P2 - Média Prioridade
- Notificações por WhatsApp
- Agenda integrada com lembretes

### P3 - Baixa Prioridade
- Dashboard com gráficos
- Export de dados para Excel
