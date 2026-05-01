import { BINARY } from './binary';
import createModule from './zstd';
import { u32, struct, instance } from './ctypes.mjs';
const decodeBinary = (bin) => {
    const raw = atob(bin), size = raw.length;
    const res = new Uint8Array(size);
    for (let i = 0; i < size; i++)
        res[i] = raw.charCodeAt(i);
    return res;
};
const wasmBinary = decodeBinary(BINARY);
const ZSTD_inBuffer = struct(["src", u32()], ["size", u32()], ["pos", u32()]);
const ZSTD_outBuffer = struct(["dst", u32()], ["size", u32()], ["pos", u32()]);
const alloc = (mod, type, ptr = mod._malloc(type.size)) => ({ ptr, value: instance(type, mod.HEAPU8.buffer, ptr) });
const bufRead = (out, input, offset) => {
    out.set(input, offset);
    return input.length;
};
export class Decompressor {
    mod;
    ZSTD_DStreamInSize;
    ZSTD_DStreamOutSize;
    async init() {
        this.mod = await createModule({ wasmBinary });
        this.ZSTD_DStreamInSize = this.mod._ZSTD_DStreamInSize();
        this.ZSTD_DStreamOutSize = this.mod._ZSTD_DStreamOutSize();
        return this;
    }
    allocInBuffer() {
        const input = alloc(this.mod, ZSTD_inBuffer);
        input.value.src = this.mod._malloc(this.ZSTD_DStreamInSize);
        return input;
    }
    allocOutBuffer() {
        const output = alloc(this.mod, ZSTD_outBuffer);
        output.value.dst = this.mod._malloc(this.ZSTD_DStreamOutSize);
        output.value.size = this.ZSTD_DStreamOutSize;
        return output;
    }
    decompress(data) {
        const mod = this.mod;
        const buf = mod._malloc(data.length);
        mod.HEAPU8.set(data, buf);
        const contentSize = mod._ZSTD_getFrameContentSize(buf, data.length);
        if (mod._ZSTD_isError(contentSize))
            throw new Error('[zstd] Unable to get frame content size.');
        const out = mod._malloc(contentSize);
        try {
            const rc = mod._ZSTD_decompress(out, contentSize, buf, data.length);
            if (mod._ZSTD_isError(rc) || rc != contentSize)
                throw new Error('[zstd] Unable to decompress.');
            return new Uint8Array(mod.HEAPU8.buffer, out, contentSize).slice();
        }
        finally {
            mod._free(buf);
            mod._free(out);
        }
    }
    *stream(data) {
        const mod = this.mod;
        const dctx = mod._ZSTD_createDCtx();
        const input = this.allocInBuffer(), output = this.allocOutBuffer();
        try {
            let pos = 0, readSize = 0;
            while (readSize = bufRead(mod.HEAPU8, data.subarray(pos, pos + this.ZSTD_DStreamInSize), input.value.src)) {
                pos += readSize;
                input.value.size = readSize;
                input.value.pos = 0;
                while (input.value.pos < input.value.size) {
                    output.value.pos = 0;
                    const ret = mod._ZSTD_decompressStream(dctx, output.ptr, input.ptr);
                    if (mod._ZSTD_isError(ret))
                        throw new Error("[zstd] failed stream decompressing");
                    yield new Uint8Array(mod.HEAPU8.buffer, output.value.dst, output.value.pos);
                }
            }
        }
        finally {
            mod._free(dctx);
            mod._free(input.value.src);
            mod._free(output.value.dst);
            mod._free(input.ptr);
            mod._free(output.ptr);
        }
    }
}
