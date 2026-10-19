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
npm run test:sim     # simulações longas (5.000 partidas yonma e sanma)
```

### Firebase local (emuladores)

Conta, histórico e salas podem ser testados sem tocar no projeto real. Os emuladores exigem **Java 21+**.

```bash
npm run emulators      # Auth (9099) + Realtime Database (9000)
npm run dev:emulators  # jogo em http://localhost:3100 ligado aos emuladores (.env.emulators)
npm run test:rules     # testes das regras de segurança do banco (sobe e derruba o emulador)
```

Com os emuladores, o console do navegador tem `__devSignIn(uid, nome)` para entrar como jogador de
teste. Para dois jogadores ao mesmo tempo, use origens diferentes (ex.: `localhost:3100` e
`bia.localhost:3100`).

## Salas privadas: o anfitrião é o servidor

No plano Spark não há funções no servidor, então **o navegador de quem cria a sala roda o motor**:
embaralha, valida cada ação, controla o relógio e os bots. O Realtime Database é só o canal: cada
convidado recebe **apenas a sua** `PlayerView` (as regras de segurança impedem ler a de outro) e manda
ações por um inbox próprio. Limitação aceita, por decisão de arquitetura: o anfitrião tecnicamente tem
todo o estado, e se ele fechar a aba a partida pausa até ele voltar. Serve para jogar entre amigos; não é
à prova de um anfitrião trapaceiro. A alternativa (servidor autoritativo com Cloud Functions) exige o
plano Blaze.

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
| 4    | Sanma                               | ✅           |
| 5    | Conta, histórico, salas e Aparência | 🔍 validação |
| 6    | Bots avançados e acabamento         | —            |
