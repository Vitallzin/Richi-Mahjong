# Riichi Mahjong em Português

Site jogável de **Riichi Mahjong** (mahjong japonês) totalmente em português do Brasil, com regras
inspiradas no Mahjong Soul e um guia opcional que ajuda iniciantes sem jogar por eles.

> Projeto pessoal / portfólio. Especificação técnica: [`docs/spec.md`](docs/spec.md).
> Decisões registradas: [`docs/adr/`](docs/adr/).

## Stack

React + TypeScript (strict) + Vite · Zustand · React Router · Vitest · Firebase (Hosting, Auth Google,
Realtime Database, plano Spark) · PWA.

## Arquitetura em uma frase

Um **motor de regras puro e determinístico** (`src/engine/`, sem React/DOM/rede, imposto por lint) é a
única fonte da verdade; ajudas e bots só enxergam a `PlayerView` de um jogador (barreira de tipos contra
informação oculta); a UI fala apenas com uma `MatchSession` (local, anfitrião ou convidado).

## Desenvolvimento

```bash
npm install
npm run dev          # servidor de desenvolvimento
npm run lint         # ESLint (inclui as regras de fronteira)
npm run typecheck    # tsc
npm test             # Vitest
npm run build        # build de produção (PWA)
```

## Deploy

O workflow `.github/workflows/ci.yml` roda lint, typecheck, testes e build em cada push/PR e publica no
Firebase Hosting a cada push na `main`. Pré-requisitos (uma vez):

1. Criar o projeto no console do Firebase (plano Spark) e ajustar o id em `.firebaserc`.
2. Gerar uma conta de serviço com permissão de Hosting e salvá-la no secret `FIREBASE_SERVICE_ACCOUNT`
   do repositório no GitHub (`firebase init hosting:github` faz isso automaticamente).

## Fases

| Fase | Conteúdo                            | Estado       |
| ---- | ----------------------------------- | ------------ |
| 0    | Fundação                            | ✅           |
| 1    | Motor yonma                         | ✅           |
| 2    | Mesa jogável contra bots            | ✅           |
| 3    | Ajudas, onboarding e tutorial       | ✅           |
| 4    | Sanma                               | 🔍 validação |
| 5    | Conta, histórico, salas e Aparência | —            |
| 6    | Bots avançados e acabamento         | —            |
