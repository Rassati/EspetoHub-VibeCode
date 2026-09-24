// Run with `node tests/preview-catalog.mjs`; never exposed as an application route.
import { build } from "esbuild";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const bundle = await build({
  entryPoints: ["tests/preview-catalog.tsx"], bundle: true, write: false, format: "esm", jsx: "automatic",
  define: { "process.env.NODE_ENV": '"development"', "process.env.NEXT_PUBLIC_SUPABASE_URL": '""' },
  plugins: [{ name: "fixture-only-mocks", setup(build) {
    build.onResolve({ filter: /^(next\/(link|navigation)|@\/app\/\(app\)\/orders\/actions)$/ }, args => ({ path: args.path, namespace: "mock" }));
    build.onLoad({ filter: /.*/, namespace: "mock" }, args => ({ loader: "jsx", resolveDir: process.cwd(), contents:
      args.path === "next/link" ? 'export default function Link({prefetch,children,...props}) { return <a {...props}>{children}</a>; }' :
      args.path === "next/navigation" ? 'export function useRouter(){return {refresh(){},push(){}};}' :
      'export async function createOrderAction(){return {error:"Prévia local: nenhum pedido real é salvo."};}'
    }));
  } }],
});
const css = await readFile("app/globals.css", "utf8");
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Teste de usabilidade — 60 produtos fictícios</title><style>${css}\n.fixture-toolbar{position:relative;z-index:3;display:flex;flex-wrap:wrap;gap:12px;padding:12px;background:#fff;border-bottom:1px solid #ddd}.fixture-toolbar button{min-height:44px}.fixture-toolbar label{display:flex;align-items:center;gap:8px}.fixture-toolbar input{width:18px}</style></head><body><div id="root"></div><script type="module" src="/preview.js"></script></body></html>`;
createServer((req, res) => {
  const js = req.url === "/preview.js";
  res.writeHead(200, { "content-type": js ? "text/javascript" : "text/html; charset=utf-8" });
  res.end(js ? bundle.outputFiles[0].text : html);
}).listen(3003, "127.0.0.1", () => console.log("UX fixture: http://127.0.0.1:3003"));
