export function parseStoreSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/[^/]+\/loja\//, "")
    .replace(/^.*\/loja\//, "")
    .replace(/\.vendas\.app.*$/, "")
    .replace(/[^a-z0-9-]/g, "");
}
