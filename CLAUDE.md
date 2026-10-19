# Riichi Mahjong PT-BR — guia rápido para o agente

Especificação completa: docs/spec.md (prevalece sobre qualquer outra coisa).

## Regras que nunca podem ser quebradas

- src/engine/ é TypeScript puro: NÃO importa React, Firebase, DOM, Zustand nem nada fora do engine.
- src/help/ e src/bots/ recebem apenas PlayerView, nunca MatchState.
- A UI só fala com MatchSession; nunca chama o motor direto.
- Toda ação é validada pelo motor. Ações ilegais não são oferecidas.
- Textos de interface em pt-BR via src/i18n; código em inglês.
- TypeScript strict, sem `any`.
- Não copiar assets do Mahjong Soul ou de terceiros sem licença; registrar tudo em CREDITS.md.
- Itens marcados 🔶/❓ no spec: parar e confirmar antes de fixar.
- Decisões não óbvias: um ADR curto em docs/adr/. Commits em português (ADR 0004).

## Comandos

- npm run dev | build | lint | typecheck | test | test:sim | test:coverage | format
- npm run sim -- --games 100 [--mode yonma] [--seed 1] [--check] # simulador de linha de comando
- npm run emulators | dev:emulators | test:rules # Firebase local (Java 21+)
- npm run arena -- --games 200 --a hard --b normal # força dos bots
- npm run fonts # regenera o CSS de fontes (após textos com hanzi novos)

## Fase atual

Fase 6 — Bots avançados e acabamento: implementada; aguardando validação do desenvolvedor. Pendências do desenvolvedor: publicar as regras do banco (Fase 5) e testar salas em aparelhos diferentes. Todas as fases da spec estão implementadas.
