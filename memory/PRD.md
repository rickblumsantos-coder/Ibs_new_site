# IBS Auto Center - Sistema de Gestão

## Problem Statement
Sistema de gestão de oficina mecânica com funcionalidades para gerenciamento de clientes, veículos, serviços, peças, agendamentos e orçamentos.

## Alterações Implementadas (19/02/2026)

### Sessão 1 - Melhorias Iniciais
1. **Barra de pesquisa** adicionada nas páginas de Peças e Serviços (filtro por nome/descrição)
2. **Título "VEÍCULOS"** corrigido (caracteres Unicode escapados removidos)
3. **Campo "Mão de Obra"** adicionado nos orçamentos - somado automaticamente ao total
4. **Nome e veículo do cliente** visíveis nos cards de orçamentos

### Sessão 2 - Veículos e Orçamentos
1. **Página de Veículos Reorganizada**:
   - Veículos agrupados por MARCA (Honda, Toyota, Volkswagen, etc.)
   - Headers colapsáveis para cada marca
   - Contador de veículos por marca

2. **Novos Campos de Especificação de Veículo**:
   - Câmbio (Manual, Automático, CVT, Automatizado)
   - Combustível (Gasolina, Etanol, Flex, Diesel, Elétrico, Híbrido, GNV)
   - Motor (1.0, 1.6, 2.0, etc.)
   - Quilometragem
   - Observações

3. **Busca de Veículo nos Orçamentos**:
   - Campo de busca com autocomplete
   - Filtro por marca, modelo, placa ou nome do cliente
   - Dropdown com resultados agrupados por marca
   - Seleção automática do cliente ao escolher veículo

## Arquitetura

### Frontend (React)
- `/app/frontend/src/pages/Parts.js` - Gestão de peças com busca
- `/app/frontend/src/pages/Services.js` - Gestão de serviços com busca
- `/app/frontend/src/pages/Vehicles.js` - Gestão de veículos por marca
- `/app/frontend/src/pages/Quotes.js` - Gestão de orçamentos com busca de veículo

### Backend (FastAPI + MongoDB)
- `/app/backend/server.py` - API REST com endpoints CRUD
- Modelo Vehicle: campos de especificação (transmission, fuel_type, mileage, engine, notes)
- Modelo Quote: campo labor_cost para mão de obra

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
