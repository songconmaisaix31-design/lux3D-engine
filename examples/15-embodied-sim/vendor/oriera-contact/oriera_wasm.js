/* @ts-self-types="./oriera_wasm.d.ts" */

/**
 * The simulator handle. Build with [`OrieraSim::from_spec_json`].
 */
export class OrieraSim {
    static __wrap(ptr) {
        const obj = Object.create(OrieraSim.prototype);
        obj.__wbg_ptr = ptr;
        OrieraSimFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        OrieraSimFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_orierasim_free(ptr, 0);
    }
    /**
     * Measured joint angles (rad).
     * @returns {Float32Array}
     */
    angles() {
        const ret = wasm.orierasim_angles(this.__wbg_ptr);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * The collector's pick_place scripted baseline (f32-exact mirror
     * of `examples/embodied_sim_collect.rs`) for control step `step`,
     * read off the last observation. Empty array when not applicable
     * (non-4-DoF arm / other task) — the caller keeps its own policy.
     * @param {number} step
     * @returns {Float32Array}
     */
    baseline_action(step) {
        const ret = wasm.orierasim_baseline_action(this.__wbg_ptr, step);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {Float32Array}
     */
    cube_pos() {
        const ret = wasm.orierasim_cube_pos(this.__wbg_ptr);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {number}
     */
    dof() {
        const ret = wasm.orierasim_dof(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    dt() {
        const ret = wasm.orierasim_dt(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Float32Array}
     */
    ee_pos() {
        const ret = wasm.orierasim_ee_pos(this.__wbg_ptr);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Per-episode state fingerprint (#67), as a decimal `u64` string
     * (JS numbers cannot hold it exactly).
     * @returns {string}
     */
    fingerprint() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.orierasim_fingerprint(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Same receipt, 16 hex digits.
     * @returns {string}
     */
    fingerprint_hex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.orierasim_fingerprint_hex(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Scheme-v2 complete-identity fingerprint (`state ⊕ robot identity
     * ⊕ spec_hash` — the native collector's receipt fold), as a decimal
     * `u64` string. The v2 golden axis (`contracts/golden/
     * embodied_fingerprints.v2.json`); same-platform bit-exact with the
     * CLI (PLAN-embodied-v3 §二 #17).
     * @returns {string}
     */
    fingerprint_v2() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.orierasim_fingerprint_v2(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Same v2 receipt, 16 hex digits.
     * @returns {string}
     */
    fingerprint_v2_hex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.orierasim_fingerprint_v2_hex(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Build from `oriera.scene/2` JSON text (a v1 draft migrates on the
     * fly). Validation failures surface as a JS `Error` carrying the
     * engine's field-level message.
     * @param {string} json
     * @returns {OrieraSim}
     */
    static from_spec_json(json) {
        const ptr0 = passStringToWasm0(json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.orierasim_from_spec_json(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return OrieraSim.__wrap(ret[0]);
    }
    /**
     * Current gripper plate gap (m) — the ramped value, bit-exact with
     * the engine's `MultibodySystem::gap_now` (M1 leftover #2 closed;
     * read-only).
     * @returns {number}
     */
    gap() {
        const ret = wasm.orierasim_gap(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Float32Array}
     */
    goal() {
        const ret = wasm.orierasim_goal(this.__wbg_ptr);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {number}
     */
    gripper() {
        const ret = wasm.orierasim_gripper(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {boolean}
     */
    holding() {
        const ret = wasm.orierasim_holding(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Observation/action layout JSON (names, slices, dims, dof, dt,
     * max_steps).
     * @returns {string}
     */
    layout() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.orierasim_layout(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {number}
     */
    max_steps() {
        const ret = wasm.orierasim_max_steps(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Whether the input was a v1 draft migrated on load.
     * @returns {boolean}
     */
    migrated() {
        const ret = wasm.orierasim_migrated(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * The last observation (after `reset` or `step`).
     * @returns {Float32Array}
     */
    obs() {
        const ret = wasm.orierasim_obs(this.__wbg_ptr);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Every pose the renderer places, as JSON (links, TCP, plates,
     * prop, goal, flags) — see `SimCore::poses_json`.
     * @returns {string}
     */
    poses() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.orierasim_poses(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * The engine's default experiment (`tabletop-4dof-pick`, pick_place)
     * as spec JSON — the demo's preset; `from_spec_json(preset_spec_json())`
     * is the same env as `TableTopEnv::new()`.
     * @returns {string}
     */
    static preset_spec_json() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.orierasim_preset_spec_json();
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {string}
     */
    randomization() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.orierasim_randomization(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Reset to a fresh episode. `seed` is a JS number (exact to 2^53;
     * the collector's seeds are small integers).
     * @param {number} seed
     * @returns {Float32Array}
     */
    reset(seed) {
        const ret = wasm.orierasim_reset(this.__wbg_ptr, seed);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Canonical spec hash (16 hex digits) — the experiment's identity.
     * @returns {string}
     */
    spec_hash() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.orierasim_spec_hash(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * The resolved spec as JSON — the renderer builds its scene from it.
     * @returns {string}
     */
    spec_json() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.orierasim_spec_json(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Advance one control step with `[tgt_j0..tgt_jN-1, gripper]`.
     * @param {Float32Array | number[]} action
     * @returns {StepResult}
     */
    step(action) {
        const ptr0 = passArrayF32ToWasm0(action, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.orierasim_step(this.__wbg_ptr, ptr0, len0);
        return StepResult.__wrap(ret);
    }
    /**
     * Control steps since the last reset.
     * @returns {number}
     */
    steps() {
        const ret = wasm.orierasim_steps(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {string}
     */
    task_id() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.orierasim_task_id(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {string}
     */
    task_phrase() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.orierasim_task_phrase(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Engine ticks since the last reset (includes the settle ticks).
     * @returns {number}
     */
    tick() {
        const ret = wasm.orierasim_tick(this.__wbg_ptr);
        return ret >>> 0;
    }
}
if (Symbol.dispose) OrieraSim.prototype[Symbol.dispose] = OrieraSim.prototype.free;

/**
 * One `step()` outcome — the Gymnasium tuple plus `success`.
 */
export class StepResult {
    static __wrap(ptr) {
        const obj = Object.create(StepResult.prototype);
        obj.__wbg_ptr = ptr;
        StepResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        StepResultFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_stepresult_free(ptr, 0);
    }
    /**
     * @returns {Float32Array}
     */
    get obs() {
        const ret = wasm.stepresult_obs(this.__wbg_ptr);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {number}
     */
    get reward() {
        const ret = wasm.stepresult_reward(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {boolean}
     */
    get success() {
        const ret = wasm.stepresult_success(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {boolean}
     */
    get terminated() {
        const ret = wasm.stepresult_terminated(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {boolean}
     */
    get truncated() {
        const ret = wasm.stepresult_truncated(this.__wbg_ptr);
        return ret !== 0;
    }
}
if (Symbol.dispose) StepResult.prototype[Symbol.dispose] = StepResult.prototype.free;

/**
 * Route Rust panics to `console.error` with the message (otherwise the
 * browser only sees `RuntimeError: unreachable`). No extra crate — a
 * plain wasm-bindgen import.
 */
export function __oriera_wasm_init() {
    wasm.__oriera_wasm_init();
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg_Error_208446807d0d1e30: function(arg0, arg1) {
            const ret = Error(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg___wbindgen_throw_4c88d8bf264fd984: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_error_716b3ffc91b8b4c1: function(arg0, arg1) {
            console.error(getStringFromWasm0(arg0, arg1));
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            table.set(0, undefined);
            table.set(1024, undefined);
            table.set(1025, null);
            table.set(1026, true);
            table.set(1027, false);
        },
    };
    return {
        __proto__: null,
        "./oriera_wasm_bg.js": import0,
    };
}

const OrieraSimFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_orierasim_free(ptr, 1));
const StepResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_stepresult_free(ptr, 1));

function getArrayF32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
    if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
        cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passArrayF32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getFloat32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(bytes) {
    numBytesDecoded += bytes.length;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true });
        cachedTextDecoder.decode();
        numBytesDecoded = bytes.length;
    }
    return cachedTextDecoder.decode(bytes);
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedFloat32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (!module.ok) {
            throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
        }

        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

let __wbg_init_promise;
async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;
    if (__wbg_init_promise === undefined) {
        __wbg_init_promise = __wbg_init_once(module_or_path);
        __wbg_init_promise.catch(() => { __wbg_init_promise = undefined; });
    }
    return __wbg_init_promise;
}

async function __wbg_init_once(module_or_path) {

    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('oriera_wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
