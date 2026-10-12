# 0008 — Sons sintetizados em WAV

**Decisão:** os efeitos sonoros da v1 são gerados por síntese (`scripts/gen-sounds.mjs`, `npm run sounds`)
em WAV mono 16 bits/22.050 Hz (~490 KB no total) e tocados com Howler.js.

**Por quê:** a spec (11.5) aceita gravações próprias ou CC0; a síntese dá arte 100% original sem risco de
licença nem download de terceiros, e é reproduzível. WAV evita depender de um codificador (webm/mp3) no
build; o tamanho é pequeno e fica no precache do PWA.

**Depois:** gravações reais (pedras na mesa) podem substituir os arquivos com o mesmo nome, sem mudar código.
Se o tamanho pesar, converter para `.webm` + `.mp3` como a spec sugere.
