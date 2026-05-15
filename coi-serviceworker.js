/*! coi-serviceworker v0.1.7 | MIT License | https://github.com/gzuidhof/coi-serviceworker */
if (typeof window === 'undefined') {
    self.addEventListener("install", () => self.skipWaiting());
    self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
    self.addEventListener("fetch", (e) => {
        if (e.request.cache === "only-if-cached" && e.request.mode !== "same-origin") return;
        e.respondWith(
            fetch(e.request).then((res) => {
                if (res.status === 0) return res;
                const newHeaders = new Headers(res.headers);
                newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
                newHeaders.set("Cross-Origin-Embedder-Policy", "require-corp");
                return new Response(res.body, {
                    status: res.status,
                    statusText: res.statusText,
                    headers: newHeaders,
                });
            }).catch((err) => console.error(err))
        );
    });
} else {
    (() => {
        if (window.crossOriginIsolated) return;
        navigator.serviceWorker.register(window.document.currentScript.src).then((reg) => {
            reg.addEventListener("updatefound", () => {
                location.reload();
            });
            if (reg.active && !navigator.serviceWorker.controller) {
                location.reload();
            }
        });
    })();
}
