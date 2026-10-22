// Regras do Realtime Database (spec 13.7), testadas no emulador:
//   npm run test:rules   (sobe o emulador do banco, roda e desliga; precisa de Java 21+)
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { get, push, ref, remove, serverTimestamp, set, update } from 'firebase/database';
import { readFileSync } from 'node:fs';
import {
  sampleActions,
  sampleMeta,
  samplePrivate,
  samplePublic,
  sampleSeats,
  sampleSettings,
  sampleSummary,
} from '../support/dbSamples';

const CODE = 'ABC234';
const google = { firebase: { sign_in_provider: 'google.com' as const } };

let env: RulesTestEnvironment;

beforeAll(async () => {
  const [host, port] = (process.env.FIREBASE_DATABASE_EMULATOR_HOST ?? '127.0.0.1:9000').split(':');
  env = await initializeTestEnvironment({
    projectId: 'demo-richimahjong',
    database: {
      host: host ?? '127.0.0.1',
      port: Number(port ?? 9000),
      rules: readFileSync('database.rules.json', 'utf8'),
    },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearDatabase();
});

const db = (uid: string) => env.authenticatedContext(uid, google).database();

const META = sampleMeta('host');

/** Sala com anfitrião e uma convidada já membro, em andamento. */
async function seedRoom(status = 'playing') {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await set(ref(ctx.database(), `rooms/${CODE}`), {
      meta: { ...META, status },
      seats: { 0: { type: 'human', uid: 'host', displayName: 'Ana' } },
      members: { host: true, bia: true },
      public: { seq: 1 },
      private: { bia: { seq: 1, view: '{"hand":[1]}' }, caio: { seq: 1, view: 'segredo' } },
    });
  });
}

describe('salas (spec 13.7)', () => {
  it('convidado lê só a própria visão', async () => {
    await seedRoom();
    await assertSucceeds(get(ref(db('bia'), `rooms/${CODE}/private/bia`)));
    await assertFails(get(ref(db('bia'), `rooms/${CODE}/private/caio`)));
  });

  it('convidado não escreve public, seats, meta nem visões', async () => {
    await seedRoom();
    const bia = db('bia');
    await assertFails(set(ref(bia, `rooms/${CODE}/public`), { seq: 99 }));
    await assertFails(set(ref(bia, `rooms/${CODE}/seats/1`), { type: 'human', uid: 'bia' }));
    await assertFails(update(ref(bia, `rooms/${CODE}/meta`), { status: 'ended' }));
    await assertFails(set(ref(bia, `rooms/${CODE}/private/bia`), { seq: 2 }));
  });

  it('ninguém lista as salas; quem não é membro não lê assentos nem placar', async () => {
    await seedRoom();
    await assertFails(get(ref(db('bia'), 'rooms')));
    const zé = db('ze');
    await assertSucceeds(get(ref(zé, `rooms/${CODE}/meta`))); // meta é pública para logados
    await assertFails(get(ref(zé, `rooms/${CODE}/seats`)));
    await assertFails(get(ref(zé, `rooms/${CODE}/public`)));
  });

  it('entrar só no lobby; membro reconecta durante a partida', async () => {
    await seedRoom('playing');
    await assertFails(set(ref(db('ze'), `rooms/${CODE}/members/ze`), true));
    await assertSucceeds(set(ref(db('bia'), `rooms/${CODE}/presence/bia`), true));
    await seedRoom('lobby');
    await assertSucceeds(set(ref(db('ze'), `rooms/${CODE}/members/ze`), true));
    // ninguém se torna membro em nome de outro
    await assertFails(set(ref(db('ze'), `rooms/${CODE}/members/outro`), true));
  });

  it('inbox: só o dono escreve no seu, com formato válido; só o anfitrião lê', async () => {
    await seedRoom();
    const bia = db('bia');
    const ok = { clientSeq: 1, action: { type: 'pass' }, ts: serverTimestamp() };
    await assertSucceeds(set(push(ref(bia, `rooms/${CODE}/inbox/bia`)), ok));
    await assertFails(set(push(ref(bia, `rooms/${CODE}/inbox/caio`)), ok));
    await assertFails(set(push(ref(bia, `rooms/${CODE}/inbox/bia`)), { action: 'x' }));
    await assertFails(
      set(push(ref(bia, `rooms/${CODE}/inbox/bia`)), {
        ...ok,
        action: { type: 'x'.repeat(40) },
      }),
    );
    await assertFails(get(ref(bia, `rooms/${CODE}/inbox`)));
    await assertSucceeds(get(ref(db('host'), `rooms/${CODE}/inbox`)));
  });

  it('só o anfitrião apaga a sala; código fora do formato não é aceito', async () => {
    await seedRoom();
    await assertFails(remove(ref(db('bia'), `rooms/${CODE}`)));
    await assertSucceeds(remove(ref(db('host'), `rooms/${CODE}`)));
    await assertFails(set(ref(db('host'), 'rooms/abc/meta'), META));
  });

  it('criar sala exige login Google e ser o próprio anfitrião', async () => {
    await assertSucceeds(set(ref(db('host'), `rooms/${CODE}/meta`), META));
    await assertFails(set(ref(db('ze'), `rooms/QQQ234/meta`), META)); // hostUid de outro
    const anon = env
      .authenticatedContext('host', { firebase: { sign_in_provider: 'anonymous' as const } })
      .database();
    await assertFails(set(ref(anon, `rooms/QQQ235/meta`), META));
    await assertFails(set(ref(env.unauthenticatedContext().database(), `rooms/QQQ236/meta`), META));
  });

  it('não entra em sala expirada', async () => {
    await seedRoom('lobby');
    await env.withSecurityRulesDisabled(async (ctx) => {
      await set(ref(ctx.database(), `rooms/${CODE}/meta/expiresAt`), Date.now() - 1000);
    });
    await assertFails(set(ref(db('ze'), `rooms/${CODE}/members/ze`), true));
  });

  it('meta: tipos, tamanhos e validade limitados', async () => {
    const host = db('host');
    await assertFails(set(ref(host, `rooms/QQQ234/meta`), { ...META, extra: 'x' }));
    await assertFails(set(ref(host, `rooms/QQQ234/meta`), { ...META, rules: 'x'.repeat(5000) }));
    await assertFails(
      set(ref(host, `rooms/QQQ234/meta`), {
        ...META,
        expiresAt: META.createdAt + 365 * 86_400_000,
      }),
    );
    await assertFails(set(ref(host, `rooms/QQQ234/meta`), { ...META, mode: 'x' }));
    // mudar só o status continua valendo
    await assertSucceeds(set(ref(host, `rooms/QQQ234/meta`), META));
    await assertSucceeds(update(ref(host, `rooms/QQQ234/meta`), { status: 'playing' }));
  });

  it('o que o anfitrião publica é aceito; campos estranhos ou grandes demais, não', async () => {
    await seedRoom();
    const host = db('host');
    await assertSucceeds(set(ref(host, `rooms/${CODE}/seats`), sampleSeats('host')));
    await assertSucceeds(
      update(ref(host, `rooms/${CODE}`), {
        public: samplePublic(),
        'private/bia': samplePrivate(),
      }),
    );
    await assertFails(
      set(ref(host, `rooms/${CODE}/seats/1`), { type: 'bot', displayName: '', lixo: 'x' }),
    );
    await assertFails(
      set(ref(host, `rooms/${CODE}/seats/1`), { type: 'human', displayName: 'x'.repeat(25) }),
    );
    await assertFails(
      set(ref(host, `rooms/${CODE}/private/bia`), {
        ...samplePrivate(),
        view: 'x'.repeat(140_000),
      }),
    );
    await assertFails(set(ref(host, `rooms/${CODE}/public`), { ...samplePublic(), lixo: 1 }));
  });

  it('inbox: toda ação do app é aceita; campos extras, não', async () => {
    await seedRoom();
    const bia = db('bia');
    for (const action of sampleActions()) {
      await assertSucceeds(
        set(push(ref(bia, `rooms/${CODE}/inbox/bia`)), {
          clientSeq: 1,
          action,
          ts: serverTimestamp(),
        }),
      );
    }
    const msg = { clientSeq: 1, ts: serverTimestamp() };
    await assertFails(
      set(push(ref(bia, `rooms/${CODE}/inbox/bia`)), {
        ...msg,
        action: { type: 'pass', lixo: 'x'.repeat(1000) },
      }),
    );
    await assertFails(
      set(push(ref(bia, `rooms/${CODE}/inbox/bia`)), {
        ...msg,
        action: { type: 'discard', tile: { id: 1, kind: 1, red: false, extra: 1 } },
      }),
    );
    await assertFails(
      set(push(ref(bia, `rooms/${CODE}/inbox/bia`)), {
        ...msg,
        action: { type: 'pass' },
        extra: 1,
      }),
    );
  });
});

describe('dados do jogador (spec 12)', () => {
  it('cada um lê e escreve só a própria pasta', async () => {
    const ana = db('ana');
    await assertSucceeds(
      set(ref(ana, 'users/ana/profile'), { displayName: 'Ana', avatar: 'chun' }),
    );
    await assertFails(get(ref(db('bia'), 'users/ana/profile')));
    await assertFails(
      set(ref(db('bia'), 'users/ana/profile'), { displayName: 'X', avatar: 'chun' }),
    );
  });

  it('perfil e histórico validados', async () => {
    const ana = db('ana');
    await assertFails(
      set(ref(ana, 'users/ana/profile'), { displayName: 'x'.repeat(25), avatar: 'chun' }),
    );
    await assertFails(
      set(ref(ana, 'users/ana/profile'), { displayName: 'Ana', avatar: 'chun', extra: 1 }),
    );
    await assertFails(set(ref(ana, 'users/ana/segredo'), 1));
    await assertSucceeds(
      set(ref(ana, 'users/ana/history/m1'), {
        endedAt: serverTimestamp(),
        mode: 'sanma',
        placement: 1,
        finalPoints: 40000,
      }),
    );
    await assertFails(
      set(ref(ana, 'users/ana/history/m2'), {
        endedAt: 1,
        mode: 'yonma',
        placement: 5,
        finalPoints: 0,
      }),
    );
    await assertFails(
      set(ref(ana, 'users/ana/history/m3'), {
        endedAt: Date.now() + 86_400_000,
        mode: 'yonma',
        placement: 1,
        finalPoints: 0,
      }),
    );
  });

  it('preferências e resumo completos do app são aceitos', async () => {
    const ana = db('ana');
    await assertSucceeds(set(ref(ana, 'users/ana/settings'), sampleSettings()));
    const summary = sampleSummary('m9');
    await assertSucceeds(
      set(ref(ana, 'users/ana/history/m9'), { ...summary, endedAt: serverTimestamp() }),
    );
  });

  it('preferências e histórico recusam chaves desconhecidas e textos grandes', async () => {
    const ana = db('ana');
    const settings = sampleSettings() as Record<string, unknown>;
    await assertFails(set(ref(ana, 'users/ana/settings'), { ...settings, lixo: 'x' }));
    await assertFails(
      set(ref(ana, 'users/ana/settings'), {
        ...settings,
        appearance: { background: 'x'.repeat(100) },
      }),
    );
    await assertFails(
      set(ref(ana, 'users/ana/settings'), {
        ...settings,
        rules: { yonma: { inventada: true }, sanma: {} },
      }),
    );
    const summary = { ...sampleSummary('m8'), endedAt: serverTimestamp() };
    await assertFails(set(ref(ana, 'users/ana/history/m8'), { ...summary, lixo: 1 }));
    await assertFails(
      set(ref(ana, 'users/ana/history/m8'), {
        ...summary,
        players: [{ seat: 0, name: 'x'.repeat(40), points: 0, isBot: false }],
      }),
    );
    await assertFails(set(ref(ana, 'users/ana/history/m8'), { ...summary, id: 'outro' }));
  });
});
