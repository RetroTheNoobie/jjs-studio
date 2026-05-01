const isTypedArray = (x) => x && (x instanceof Uint8Array || x instanceof Uint8ClampedArray ||
    x instanceof Uint16Array || x instanceof Uint32Array ||
    x instanceof Int8Array || x instanceof Int16Array || x instanceof Int32Array ||
    x instanceof Float32Array || x instanceof Float64Array);
const CTYPES = ["u8", "u16", "u32", "i8", "i16", "i32", "f32", "f64"];
const SIZES = {
    "u8": 1, "u16": 2, "u32": 4, "i8": 1, "i16": 2, "i32": 4, "f32": 4, "f64": 8
};
const TYPED_ARRAY = {
    "i8": Int8Array, "i16": Int16Array, "i32": Int32Array,
    "u8": Uint8Array, "u16": Uint16Array, "u32": Uint32Array,
    "f32": Float32Array, "f64": Float64Array,
};
;
const isCType = (t) => CTYPES.includes(t);
const sizeof = (type) => isCType(type) ? SIZES[type] : type.size;
const alignof = (type) => isCType(type) ? SIZES[type] : type.align;
const _align = (x, b) => (x + b - 1) & -b;
export const struct = (...fs) => {
    let align = 0, offset = 0;
    const fields = {}, offsets = {};
    fs.forEach(([name, f]) => {
        const a = alignof(f.type);
        align = Math.max(align, a);
        offset = _align(offset, a);
        fields[name] = f;
        offsets[name] = offset;
        offset += sizeof(f.type) * Math.max(f.num, 1);
    });
    return { align, size: _align(offset, align), fields, offsets };
};
const property = (value) => ({
    enumerable: true,
    ...(isTypedArray(value) && value.length == 1 ? {
        get: () => value[0],
        set: (x) => value[0] = x,
    } : { value })
});
export const instance = ({ fields, offsets, size }, buf = new ArrayBuffer(size), base = 0) => {
    const res = {};
    for (const name in fields) {
        const out = deref(fields[name], buf, base + offsets[name]);
        Object.defineProperty(res, name, property(out));
    }
    return res;
};
export const deref = ({ type, num }, buf, base = 0) => {
    if (isCType(type))
        return new TYPED_ARRAY[type](buf, base, Math.max(num, 1));
    return num == 0 ?
        instance(type, buf, base) :
        Array.from({ length: num }, (_, i) => instance(type, buf, base + i * type.size));
};
export const field = (type) => (num = 0) => ({ type, num });
export const [u8, u16, u32, i8, i16, i32, f32, f64] = CTYPES.map(field);
