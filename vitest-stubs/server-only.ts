// Stub usado só em teste (ver vitest.config.ts): o pacote real "server-only"
// lança um erro sempre que é importado fora do bundler de Server Components
// do Next — o que inclui rodar sob Vitest em Node puro. Aqui vira um no-op,
// preservando a checagem de verdade (ela roda através do build do Next).
export {};
