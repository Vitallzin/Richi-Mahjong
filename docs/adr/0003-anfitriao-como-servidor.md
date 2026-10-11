# 0003 — Salas privadas com o anfitrião como servidor

**Decisão:** o navegador do anfitrião roda o motor (`HostSession`); o Firebase é só canal de mensagens e
presença. Cada convidado recebe somente a sua `PlayerView`.

**Limitação aceita:** o anfitrião tem acesso técnico ao estado completo; se fechar a aba, a partida pausa.
Adequado a partidas entre amigos, não à prova de anfitrião malicioso. A alternativa (servidor autoritativo
com Cloud Functions) exige o plano Blaze e foi descartada (ver 0002).
