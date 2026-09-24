# 💰 Finanças — Gerenciador Financeiro Pessoal Inteligente

**🔗 Aplicação online: [finance-tracker-mc.vercel.app](https://finance-tracker-mc.vercel.app)**

Gerenciador financeiro pessoal focado em **alta praticidade no uso diário**, com uma interface
intuitiva e sem depender de integrações com plataformas de terceiros. O objetivo é **eliminar a
fricção de registrar gastos** e oferecer um controle financeiro ativo, com diagnósticos, resumos e
análises automáticas.

---

## ✨ Funcionalidades

### 🔐 Contas de usuário e múltiplas contas financeiras
- Login e cadastro com e-mail e senha (sessão própria, sem serviços de terceiros).
- Cada usuário pode ter **várias contas financeiras** (ex.: conta pessoal, conta da pensão, conta de
  terceiros, linha de crédito), cada uma com seu próprio saldo, cofrinhos e lançamentos.
- Abas para alternar entre contas, mais uma aba **"Todas"** que consolida o saldo de todas as contas
  e lista as movimentações identificando de qual conta é cada uma.
- Cada conta pode ser associada a um **banco** (Nubank, Banco do Brasil, Mercado Pago, Caixa ou um
  banco personalizado), com tema de cor próprio refletido em toda a interface.

### 📝 Lançamento rápido de entradas e saídas
- Registro de **despesas** com valor, descrição (ex.: "Almoço de trabalho"), categoria e data.
- Registro de **receitas** (salário, freelas, rendimentos) com valor, fonte e data de recebimento.
- **Criação de categorias na hora**, direto no formulário, sem sair da tela.
- **Saldo atual** calculado em tempo real: `receitas − despesas − valor guardado em cofrinhos`.
- Cada lançamento pode ser marcado como **Pago/Recebido** ou **Pendente**, permitindo planejar o
  fluxo de caixa (contas a pagar, salário previsto) sem afetar o saldo até a confirmação.

### 🔁 Transferências entre contas
- Movimentação de saldo entre contas do usuário sem gerar receita/despesa artificial — não infla os
  gráficos nem o motor de ritmo de gastos.

### 💳 Linha de crédito
- Contas podem ter uma linha de crédito com limite, dia de fechamento e dia de vencimento.
- Acompanhamento de **Fatura Aberta**, **Fatura Fechada** e **Limite Disponível**, com isolamento
  claro entre dinheiro real (Saldo Líquido) e dívida de cartão (Total de Faturas a Pagar).

### 🧠 Motor de feedback inteligente (burn rate)
- Analisa o **ritmo de gastos** do mês comparando o que já foi gasto com o tempo decorrido.
- Emite alertas quando o ritmo está acima do esperado (ex.: *"mantendo esse ritmo, o orçamento pode
  estourar antes do fim do mês"*) e sugere um **limite de gasto diário** para os dias restantes.
- Usa o **orçamento mensal** configurado ou, na ausência dele, a **média dos últimos 3 meses**.

### 🐷 Cofrinhos (caixinhas)
- Múltiplos cofrinhos com **meta** opcional e **percentual do CDI** configurável (ex.: 115% do CDI).
- Fluxo de **depósito** e **resgate**, refletindo no saldo da conta.
- **Rendimento automático** calculado por juros compostos sobre dias úteis, com base no CDI.
- Feedback por cofrinho: quanto **rendeu no mês** e o **progresso em relação à meta**.

### 📊 Dashboard e gráficos
- Resumo consolidado de saldo, ritmo de gastos e cofrinhos.
- Gráfico temporal de **receitas × despesas** por **semana, mês e ano**.

### ⚙️ Modo Editor
- Área dedicada para editar e excluir contas e lançamentos, e ajustar configurações (orçamento
  mensal, taxa anual do CDI) — mantendo o painel principal focado no lançamento rápido do dia a dia.

---

## 🛠️ Tecnologias

| Camada        | Tecnologia                                    |
| ------------- | --------------------------------------------- |
| Framework     | [Next.js 16](https://nextjs.org) (App Router) |
| Linguagem     | [TypeScript](https://www.typescriptlang.org)  |
| Estilização   | [Tailwind CSS 4](https://tailwindcss.com)     |
| Gráficos      | [Recharts](https://recharts.org)              |
| Banco (prod)  | [PostgreSQL](https://www.postgresql.org) (via [Neon](https://neon.tech)) |
| Banco (dev/testes) | [PGlite](https://pglite.dev) (Postgres em memória) |
| Testes        | [Vitest](https://vitest.dev)                  |
| Deploy        | [Vercel](https://vercel.com)                  |
| Autenticação  | Sessões próprias (cookie httpOnly) + [bcryptjs](https://github.com/dcodeIO/bcrypt.js) |
