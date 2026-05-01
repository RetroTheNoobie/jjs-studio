var Module = (() => {
    var _scriptDir = import.meta.url;
    return (function (moduleArg = {}) {
        var a = moduleArg, n, q;
        a.ready = new Promise((b, d) => { n = b; q = d; });
        var u = Object.assign({}, a), v = "";
        "undefined" != typeof document && document.currentScript && (v = document.currentScript.src);
        _scriptDir && (v = _scriptDir);
        0 !== v.indexOf("blob:") ? v = v.substr(0, v.replace(/[?#].*/, "").lastIndexOf("/") + 1) : v = "";
        var x = a.printErr || console.error.bind(console);
        Object.assign(a, u);
        u = null;
        var y;
        a.wasmBinary && (y = a.wasmBinary);
        var noExitRuntime = a.noExitRuntime || !0;
        "object" != typeof WebAssembly && z("no native wasm support detected");
        var B, C = !1, D, E;
        function F() { var b = B.buffer; a.HEAP8 = D = new Int8Array(b); a.HEAP16 = new Int16Array(b); a.HEAPU8 = E = new Uint8Array(b); a.HEAPU16 = new Uint16Array(b); a.HEAP32 = new Int32Array(b); a.HEAPU32 = new Uint32Array(b); a.HEAPF32 = new Float32Array(b); a.HEAPF64 = new Float64Array(b); }
        var G = [], H = [], I = [];
        function aa() { var b = a.preRun.shift(); G.unshift(b); }
        var J = 0, K = null, L = null;
        function z(b) { if (a.onAbort)
            a.onAbort(b); b = "Aborted(" + b + ")"; x(b); C = !0; b = new WebAssembly.RuntimeError(b + ". Build with -sASSERTIONS for more info."); q(b); throw b; }
        function M(b) { return b.startsWith("data:application/octet-stream;base64,"); }
        var N;
        if (a.locateFile) {
            if (N = "zstd.wasm", !M(N)) {
                var O = N;
                N = a.locateFile ? a.locateFile(O, v) : v + O;
            }
        }
        else
            N = (new URL("zstd.wasm", import.meta.url)).href;
        function P(b) { if (b == N && y)
            return new Uint8Array(y); throw "both async and sync fetching of the wasm failed"; }
        function ba(b) { return y || "function" != typeof fetch ? Promise.resolve().then(() => P(b)) : fetch(b, { credentials: "same-origin" }).then(d => { if (!d.ok)
            throw "failed to load wasm binary file at '" + b + "'"; return d.arrayBuffer(); }).catch(() => P(b)); }
        function Q(b, d, c) { return ba(b).then(g => WebAssembly.instantiate(g, d)).then(g => g).then(c, g => { x(`failed to asynchronously prepare wasm: ${g}`); z(g); }); }
        function ca(b, d) { var c = N; return y || "function" != typeof WebAssembly.instantiateStreaming || M(c) || "function" != typeof fetch ? Q(c, b, d) : fetch(c, { credentials: "same-origin" }).then(g => WebAssembly.instantiateStreaming(g, b).then(d, function (p) { x(`wasm streaming compile failed: ${p}`); x("falling back to ArrayBuffer instantiation"); return Q(c, b, d); })); }
        var R = b => { for (; 0 < b.length;)
            b.shift()(a); }, S = "undefined" != typeof TextDecoder ? new TextDecoder("utf8") : void 0, X = (b, d, c, g) => {
            var p = { string: e => {
                    var l = 0;
                    if (null !== e && void 0 !== e && 0 !== e) {
                        for (var f = l = 0; f < e.length; ++f) {
                            var k = e.charCodeAt(f);
                            127 >= k ? l++ : 2047 >= k ? l += 2 : 55296 <= k && 57343 >= k ? (l += 4, ++f) : l += 3;
                        }
                        var h = l + 1;
                        f = l = T(h);
                        k = E;
                        if (0 < h) {
                            h = f + h - 1;
                            for (var t = 0; t < e.length; ++t) {
                                var m = e.charCodeAt(t);
                                if (55296 <= m && 57343 >= m) {
                                    var ea = e.charCodeAt(++t);
                                    m = 65536 + ((m & 1023) << 10) | ea & 1023;
                                }
                                if (127 >= m) {
                                    if (f >= h)
                                        break;
                                    k[f++] = m;
                                }
                                else {
                                    if (2047 >=
                                        m) {
                                        if (f + 1 >= h)
                                            break;
                                        k[f++] = 192 | m >> 6;
                                    }
                                    else {
                                        if (65535 >= m) {
                                            if (f + 2 >= h)
                                                break;
                                            k[f++] = 224 | m >> 12;
                                        }
                                        else {
                                            if (f + 3 >= h)
                                                break;
                                            k[f++] = 240 | m >> 18;
                                            k[f++] = 128 | m >> 12 & 63;
                                        }
                                        k[f++] = 128 | m >> 6 & 63;
                                    }
                                    k[f++] = 128 | m & 63;
                                }
                            }
                            k[f] = 0;
                        }
                    }
                    return l;
                }, array: e => { var l = T(e.length); D.set(e, l); return l; } };
            b = a["_" + b];
            var r = [], A = 0;
            if (g)
                for (var w = 0; w < g.length; w++) {
                    var W = p[c[w]];
                    W ? (0 === A && (A = U()), r[w] = W(g[w])) : r[w] = g[w];
                }
            c = b.apply(null, r);
            return c = function (e) {
                0 !== A && V(A);
                if ("string" === d)
                    if (e) {
                        for (var l = E, f = e + NaN, k = e; l[k] && !(k >= f);)
                            ++k;
                        if (16 < k - e && l.buffer && S)
                            e =
                                S.decode(l.subarray(e, k));
                        else {
                            for (f = ""; e < k;) {
                                var h = l[e++];
                                if (h & 128) {
                                    var t = l[e++] & 63;
                                    if (192 == (h & 224))
                                        f += String.fromCharCode((h & 31) << 6 | t);
                                    else {
                                        var m = l[e++] & 63;
                                        h = 224 == (h & 240) ? (h & 15) << 12 | t << 6 | m : (h & 7) << 18 | t << 12 | m << 6 | l[e++] & 63;
                                        65536 > h ? f += String.fromCharCode(h) : (h -= 65536, f += String.fromCharCode(55296 | h >> 10, 56320 | h & 1023));
                                    }
                                }
                                else
                                    f += String.fromCharCode(h);
                            }
                            e = f;
                        }
                    }
                    else
                        e = "";
                else
                    e = "boolean" === d ? !!e : e;
                return e;
            }(c);
        }, da = { a: b => {
                var d = E.length;
                b >>>= 0;
                if (2147483648 < b)
                    return !1;
                for (var c = 1; 4 >= c; c *= 2) {
                    var g = d * (1 + .2 / c);
                    g = Math.min(g, b + 100663296);
                    var p = Math;
                    g = Math.max(b, g);
                    a: {
                        p = (p.min.call(p, 2147483648, g + (65536 - g % 65536) % 65536) - B.buffer.byteLength + 65535) / 65536;
                        try {
                            B.grow(p);
                            F();
                            var r = 1;
                            break a;
                        }
                        catch (A) { }
                        r = void 0;
                    }
                    if (r)
                        return !0;
                }
                return !1;
            } }, Y = function () {
            function b(c) { Y = c.exports; B = Y.b; F(); H.unshift(Y.c); J--; a.monitorRunDependencies && a.monitorRunDependencies(J); 0 == J && (null !== K && (clearInterval(K), K = null), L && (c = L, L = null, c())); return Y; }
            var d = { a: da };
            J++;
            a.monitorRunDependencies && a.monitorRunDependencies(J);
            if (a.instantiateWasm)
                try {
                    return a.instantiateWasm(d, b);
                }
                catch (c) {
                    x(`Module.instantiateWasm callback failed with error: ${c}`), q(c);
                }
            ca(d, function (c) { b(c.instance); }).catch(q);
            return {};
        }();
        a._free = b => (a._free = Y.d)(b);
        a._malloc = b => (a._malloc = Y.e)(b);
        a._ZSTD_isError = b => (a._ZSTD_isError = Y.f)(b);
        a._ZSTD_createDCtx = () => (a._ZSTD_createDCtx = Y.g)();
        a._ZSTD_getFrameContentSize = (b, d) => (a._ZSTD_getFrameContentSize = Y.h)(b, d);
        a._ZSTD_decompress = (b, d, c, g) => (a._ZSTD_decompress = Y.i)(b, d, c, g);
        a._ZSTD_DStreamInSize = () => (a._ZSTD_DStreamInSize = Y.j)();
        a._ZSTD_DStreamOutSize = () => (a._ZSTD_DStreamOutSize = Y.k)();
        a._ZSTD_initDStream = b => (a._ZSTD_initDStream = Y.l)(b);
        a._ZSTD_decompressStream = (b, d, c) => (a._ZSTD_decompressStream = Y.m)(b, d, c);
        var U = () => (U = Y.o)(), V = b => (V = Y.p)(b), T = b => (T = Y.q)(b);
        a.ccall = X;
        a.cwrap = (b, d, c, g) => { var p = !c || c.every(r => "number" === r || "boolean" === r); return "string" !== d && p && !g ? a["_" + b] : function () { return X(b, d, c, arguments, g); }; };
        var Z;
        L = function fa() { Z || ha(); Z || (L = fa); };
        function ha() { function b() { if (!Z && (Z = !0, a.calledRun = !0, !C)) {
            R(H);
            n(a);
            if (a.onRuntimeInitialized)
                a.onRuntimeInitialized();
            if (a.postRun)
                for ("function" == typeof a.postRun && (a.postRun = [a.postRun]); a.postRun.length;) {
                    var d = a.postRun.shift();
                    I.unshift(d);
                }
            R(I);
        } } if (!(0 < J)) {
            if (a.preRun)
                for ("function" == typeof a.preRun && (a.preRun = [a.preRun]); a.preRun.length;)
                    aa();
            R(G);
            0 < J || (a.setStatus ? (a.setStatus("Running..."), setTimeout(function () { setTimeout(function () { a.setStatus(""); }, 1); b(); }, 1)) : b());
        } }
        if (a.preInit)
            for ("function" == typeof a.preInit && (a.preInit = [a.preInit]); 0 < a.preInit.length;)
                a.preInit.pop()();
        ha();
        return moduleArg.ready;
    });
})();
export default Module;
