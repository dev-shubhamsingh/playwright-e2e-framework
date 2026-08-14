# Consumer Contract Tests (Pact)

## What exists today, honestly

`@pact-foundation/pact@16` **consumer-side** contracts against the DummyJSON API,
run by **Jest** rather than Playwright.

| Fact                | Value                                                               |
| ------------------- | ------------------------------------------------------------------- |
| Specs               | `tests/dummyjson/contract/{auth,products}.pact.ts` — 8 interactions |
| Runner              | Jest + ts-jest (`jest.config.js`, `testMatch` `**/*.pact.ts`)       |
| Command             | `npm run test:contract`                                             |
| Consumer / provider | `playwright-e2e` / `DummyJSON`                                      |
| Pact API            | `PactV3` + `MatchersV3`                                             |
| Output              | `pacts/` (gitignored), uploaded as a CI artifact                    |
| CI                  | `test-contract` job, gated on pull requests                         |

**Read this before promising more than exists:**

- There is **no Pact Broker and no provider verification.** The generated pact files
  are an artifact, nothing consumes them.
- Which means these tests catch **consumer-side drift** — our client no longer sends
  or tolerates what it claimed — and will **not** catch provider-side drift. If
  DummyJSON changes and breaks us, the contract suite stays green and the API suite
  goes red.
- Provider verification is also **not achievable here**, not merely unbuilt. Pact's
  provider half requires the provider to replay our pacts against a running
  instance. DummyJSON is a third-party public service; nobody is going to verify our
  contract. That is a structural limit, not a backlog item.

When asked to "add contract testing" or "make the contracts real", say exactly that.
Adding a consumer interaction is cheap; closing the loop needs a provider that
cooperates.

## Why Jest and not Playwright

Playwright is the primary runner everywhere else. The contract suite is the sole
exception, for a real reason: `PactV3.executeTest()` needs a `describe`/`it` harness
to manage the mock-server lifecycle, and Jest is the runner the Pact ecosystem is
built and documented around.

Do not "unify" this onto Playwright. Do not add Jest tests for anything else without
saying why — if you widen `testMatch`, you have changed what the `test-contract` job
means, which needs stating.

Config facts worth knowing before you touch it:

- `jest.config.js` is **CommonJS `.js`**, not TypeScript, so Jest doesn't need
  `ts-node` merely to read its own config.
- `moduleNameMapper` mirrors the `tsconfig.json` path aliases, so contract specs
  import `@dummyjson/schemas` the same way every other file does.
- `setupFiles: ['dotenv/config']` loads `.env` before specs run, so the zod env
  config resolves.
- **The `https-proxy-agent` stub.** Pact's root export drags in the provider verifier,
  which needs `https-proxy-agent` — shipped as an ESM build Jest cannot transform
  ("Cannot use import statement outside a module"). The consumer mock never uses a
  proxy, so it is stubbed via `moduleNameMapper` →
  `tests/dummyjson/contract/stubs/https-proxy-agent.js`. If you see that error after
  a Pact upgrade, this is why; do not fix it by disabling type checking or switching
  runners.
- `eslint.config.mjs` excludes the contract directory from the Playwright rule block
  (it is Jest, not Playwright), and marks the CommonJS files as `sourceType: commonjs`.

## When a Pact test is the right answer

Use it when **all** of these hold:

- The **wire format** is what's at risk — field names, types, required/optional shape,
  status codes.
- A test that mocks the client would pass while the real integration is broken.
- The interaction is one the integration suite actually depends on.

Do **not** reach for Pact when:

- The risk is our own logic rather than the wire format. Use a framework unit test or
  an API test.
- You want to know whether the live service still works. That is what the API suite
  does — a contract test talks to a local mock server and never touches the network.
- You want end-to-end protection against provider changes. It cannot deliver that
  here. Say so.

The honest division of labour in this repo:

| Suite                   | Catches                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `test-contract` (Pact)  | Our client's expectations drifting from what we declared. Fast, offline, deterministic |
| `test-api` (Playwright) | The live service actually behaving as expected, today                                  |

They are complementary, and neither is a substitute for the other.

## Interaction shape

```ts
import path from 'path';
import { describe, it, expect } from '@jest/globals';
import { PactV3, MatchersV3 } from '@pact-foundation/pact';

const { like, string, integer, eachLike, number } = MatchersV3;

const provider = new PactV3({
  consumer: 'playwright-e2e',
  provider: 'DummyJSON',
  dir: path.resolve(process.cwd(), 'pacts'),
  logLevel: 'error',
});

const productShape = like({
  id: integer(1),
  title: string('Product'),
  price: number(9.99),
  category: string('category'),
});

describe('Products contract — GET /products/:id', () => {
  it('returns a single product for a valid id', async () => {
    await provider
      .given('product with id 1 exists')
      .uponReceiving('a request for product id 1')
      .withRequest({ method: 'GET', path: '/products/1' })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': like('application/json') },
        body: productShape,
      })
      .executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/products/1`);

        expect(response.status).toBe(200);
        const body = (await response.json()) as { id: number; title: string };
        expect(body.id).toBe(1);
        expect(typeof body.title).toBe('string');
      });
  });
});
```

### Points that bite

- **Matchers, not literals.** `like()` / `string()` / `integer()` declare _"a field
  `title` of type string"_. A literal declares _"the value will equal
  'Essence Mascara Lash Princess'"_, which makes the contract lie and breaks whenever
  the demo dataset shifts. Hard-coding an id or timestamp is a review finding.
- **`await` (or `return`) the chain.** `executeTest` returns a promise. Without it the
  test goes green having never run the interaction — textbook false coverage.
- **`given()` is documentation here, not setup.** With no provider verification,
  provider states are never enacted. Write them accurately anyway; they are the
  spec if a provider ever does verify.
- **Share the shape constant.** `productShape` reused across list, single, and search
  interactions means one place to update, and it forces the interactions to agree.
- **`eachLike(shape)`** for arrays — it asserts every element matches the shape, with
  a minimum of one.
- **Assert inside `executeTest` too.** The Pact mock verifies the _request_ matched;
  your assertions verify the client tolerates the _response_. Both halves matter.
- **One `PactV3` instance per file**, writing to the same `pacts/` directory. Multiple
  files targeting the same provider each write their own pact file.

## Adding an interaction — checklist

- [ ] The integration suite genuinely depends on this interaction.
- [ ] The wire format is the risk, not our logic.
- [ ] Request and response use matchers for everything non-deterministic.
- [ ] No hard-coded ids, timestamps, or dataset-specific values.
- [ ] The chain is awaited or returned.
- [ ] Assertions inside `executeTest` cover status and the fields the client reads.
- [ ] The response shape agrees with the zod schema the API suite uses for the same
      endpoint. If they disagree, one of them is wrong — that is a finding.
- [ ] `npm run test:contract` passes and `pacts/` shows the new interaction.
- [ ] The summary states that provider verification does not exist, so nobody assumes
      the contract is enforced end to end.

## Verify

```bash
npm run test:contract          # the whole suite
npx jest tests/dummyjson/contract/products.pact.ts   # one file
ls pacts/                      # the generated pact files
npm run typecheck
```

This suite needs no network and no browser — it is the one suite that runs anywhere,
which makes it a good first check when you suspect an environment problem elsewhere.
