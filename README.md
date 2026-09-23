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

### 📝 Lançamento rápido de entradas e saídas
- Registro de **despesas** com valor, descrição (ex.: "Almoço de trabalho"), categoria e data.
- Registro de **receitas** (salário, freelas, rendimentos) com valor, fonte e data de recebimento.
- **Criação de categorias na hora**, direto no formulário, sem sair da tela.
- **Saldo atual** calculado em tempo real: `receitas − despesas − valor guardado em cofrinhos`.

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

### ⚙️ Configurações
- Ajuste do **orçamento mensal** e da **taxa anual do CDI** pela própria interface.

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

---

## 🖼️ Capturas de tela

A forma mais rápida de conhecer a interface é acessar a **[demo ao vivo](https://finance-tracker-mc.vercel.app)**.

> _Para incluir imagens no repositório, adicione os arquivos em `docs/` e referencie-os aqui, por
> exemplo: `![Dashboard](docs/dashboard.png)`._

---

## 🚀 Executando localmente

### Pré-requisitos
- [Node.js](https://nodejs.org) 20+ (recomendado 24)
- npm

### Passo a passo

```bash
# 1. Clone o repositório
git clone https://github.com/miguelgosbr/finance-tracker.git
cd finance-tracker

# 2. Instale as dependências
npm install

# 3. Rode em modo de desenvolvimento
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

> **Banco de dados em desenvolvimento:** sem a variável `DATABASE_URL`, a aplicação usa um banco
> **PGlite em memória** — os dados **não são persistidos** entre reinícios. Para persistir localmente,
> aponte a `DATABASE_URL` para um PostgreSQL de verdade (veja abaixo).

### Variáveis de ambiente

Copie o exemplo e ajuste conforme necessário:

```bash
cp .env.example .env
```

| Variável       | Descrição                                                                 |
| -------------- | ------------------------------------------------------------------------- |
| `DATABASE_URL` | String de conexão PostgreSQL. Ausente em dev → usa PGlite em memória.      |

O schema e as categorias padrão são criados **automaticamente** na primeira requisição.

---

## 🧪 Testes

Testes unitários dos algoritmos financeiros (saldo, burn rate e rendimento do CDI), rodando contra um
banco PGlite em memória:

```bash
npm test
```

---

## 📜 Scripts

| Comando          | Descrição                                  |
| ---------------- | ------------------------------------------ |
| `npm run dev`    | Ambiente de desenvolvimento                |
| `npm run build`  | Build de produção                          |
| `npm start`      | Servir o build de produção                 |
| `npm run lint`   | Análise estática (ESLint)                  |
| `npm test`       | Testes unitários (Vitest)                  |

---

## ☁️ Deploy (Vercel + PostgreSQL)

1. Importe o repositório em [vercel.com/new](https://vercel.com/new).
2. Crie um banco PostgreSQL (ex.: **Neon** pela aba _Storage_ da Vercel) e **conecte-o ao projeto** —
   isso injeta a `DATABASE_URL` automaticamente nas variáveis de ambiente.
3. Faça o deploy (ou um _redeploy_ se o banco foi conectado depois do primeiro deploy).

Em produção a aplicação **exige** a `DATABASE_URL`: se ela estiver ausente, o app falha
explicitamente em vez de perder dados silenciosamente.

---

## 📁 Estrutura do projeto

```
app/
  api/            Rotas de API (auth, contas, transações, categorias, cofrinhos, relatórios, configurações)
  page.tsx        Dashboard (Server Component, exige login)
  login/          Página de login
  signup/         Página de cadastro
components/        Componentes de UI (formulários, gráficos, cards, abas de conta)
lib/              Camada de dados e motores de cálculo
  db.ts           Conexão e schema (PostgreSQL / PGlite)
  auth.ts         Cadastro, login e sessões
  accounts.ts     Contas financeiras do usuário
  transactions.ts Transações e saldo
  categories.ts   Categorias
  cofrinhos.ts     Cofrinhos e rendimento do CDI
  analytics.ts    Motor de burn rate
  reports.ts      Séries temporais
  settings.ts     Configurações
tests/            Testes unitários (Vitest)
```

---

## 🔒 Segurança e dados

- Nenhum segredo é versionado: credenciais ficam em variáveis de ambiente (`.env`, ignorado pelo Git).
- Cada usuário só acessa seus próprios dados: todas as rotas de API validam a sessão e a propriedade
  da conta/categoria/cofrinho antes de ler ou escrever.
- Senhas com hash (bcrypt); sessões em cookie `httpOnly`, `SameSite=Lax`, expirando em 30 dias.
