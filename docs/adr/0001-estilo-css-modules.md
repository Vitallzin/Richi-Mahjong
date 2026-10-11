# 0001 — Estilo: CSS Modules + variáveis CSS

**Decisão:** CSS Modules (nativo do Vite) com tokens de tema em variáveis CSS (`:root`).

**Por quê:** a mesa tem posições fixas num palco 1600×900 e pedras em camadas (corpo/face/verso/ajudas);
isso é CSS "de componente" mais do que utilitário. Variáveis CSS permitem trocar o tema em tempo de execução
sem rebuild, e CSS Modules não acrescenta dependência nem etapa de build. Tailwind foi descartado por deixar
as classes de layout da mesa longas e por não agregar à troca de tema.
