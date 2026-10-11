# 0002 — Firebase no plano Spark

**Decisão:** usar apenas Hosting, Authentication (Google) e Realtime Database, no plano gratuito Spark.

**Consequências:** sem Cloud Functions (sem servidor autoritativo, ver 0003) e sem Cloud Storage
(Blaze obrigatório desde 03/02/2026) — por isso não há upload de avatar. Realtime Database em `us-central1`
(a mais próxima do Brasil entre as três regiões disponíveis; não pode ser trocada depois). Cotas do Spark
devem ser conferidas no console antes do lançamento e registradas aqui.
