// Throwaway design-review server. No external dependencies or API requests.
const page = Bun.file(new URL('./design-prototype.html', import.meta.url));
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 5173,
  fetch(request) {
    if (new URL(request.url).pathname === '/favicon.ico') {
      return new Response(null, { status: 204 });
    }
    return new Response(page, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  },
});
console.log(`Design prototype: ${server.url}?variant=A`);
