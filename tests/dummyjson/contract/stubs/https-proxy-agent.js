// Stub for https-proxy-agent in the Jest contract suite.
//
// Pact's package root re-exports the provider verifier, which transitively
// requires https-proxy-agent (an ESM-only build Jest won't transform). The
// consumer (PactV3) mock server never uses a proxy agent, so this stub
// satisfies the require without pulling in the untransformable ESM module.
class HttpsProxyAgent {}
module.exports = { HttpsProxyAgent };
