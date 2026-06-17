import { log } from 'src/logger/index.ts';

let wasm;

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_export_2.set(idx, obj);
    return idx;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

const cachedTextDecoder = (typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { ignoreBOM: true, fatal: true }) : { decode: () => { throw Error('TextDecoder not available') } } );

if (typeof TextDecoder !== 'undefined') { cachedTextDecoder.decode(); };

let cachedUint8ArrayMemory0 = null;

function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let WASM_VECTOR_LEN = 0;

const cachedTextEncoder = (typeof TextEncoder !== 'undefined' ? new TextEncoder('utf-8') : { encode: () => { throw Error('TextEncoder not available') } } );

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

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
        const ret = encodeString(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedDataViewMemory0 = null;

function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_export_2.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}
/**
 * @param {string} field
 * @param {boolean} reverse
 * @returns {EdgeSorter}
 */
export function create_edge_sorter(field, reverse) {
    const ptr0 = passStringToWasm0(field, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.create_edge_sorter(ptr0, len0, reverse);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return EdgeSorter.__wrap(ret[0]);
}

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
}

function passArrayJsValueToWasm0(array, malloc) {
    const ptr = malloc(array.length * 4, 4) >>> 0;
    for (let i = 0; i < array.length; i++) {
        const add = addToExternrefTable0(array[i]);
        getDataViewMemory0().setUint32(ptr + 4 * i, add, true);
    }
    WASM_VECTOR_LEN = array.length;
    return ptr;
}

function getArrayJsValueFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    const mem = getDataViewMemory0();
    const result = [];
    for (let i = ptr; i < ptr + 4 * len; i += 4) {
        result.push(wasm.__wbindgen_export_2.get(mem.getUint32(i, true)));
    }
    wasm.__externref_drop_slice(ptr, len);
    return result;
}
/**
 * @param {NoteGraph} graph
 * @param {TraversalData[]} traversal_data
 * @param {EdgeSorter} sorter
 * @returns {TraversalData[]}
 */
export function sort_traversal_data(graph, traversal_data, sorter) {
    _assertClass(graph, NoteGraph);
    const ptr0 = passArrayJsValueToWasm0(traversal_data, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(sorter, EdgeSorter);
    const ret = wasm.sort_traversal_data(graph.__wbg_ptr, ptr0, len0, sorter.__wbg_ptr);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    var v2 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v2;
}

/**
 * @param {NoteGraph} graph
 * @param {EdgeStruct[]} edges
 * @param {EdgeSorter} sorter
 * @returns {EdgeStruct[]}
 */
export function sort_edges(graph, edges, sorter) {
    _assertClass(graph, NoteGraph);
    const ptr0 = passArrayJsValueToWasm0(edges, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(sorter, EdgeSorter);
    const ret = wasm.sort_edges(graph.__wbg_ptr, ptr0, len0, sorter.__wbg_ptr);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    var v2 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v2;
}

/**
 * @returns {NoteGraph}
 */
export function create_graph() {
    const ret = wasm.create_graph();
    return NoteGraph.__wrap(ret);
}

let cachedUint32ArrayMemory0 = null;

function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}

function getArrayU32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function passArray32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getUint32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

const AddEdgeGraphUpdateFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_addedgegraphupdate_free(ptr >>> 0, 1));

export class AddEdgeGraphUpdate {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        AddEdgeGraphUpdateFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_addedgegraphupdate_free(ptr, 0);
    }
    /**
     * @param {BatchGraphUpdate} batch
     */
    add_to_batch(batch) {
        const ptr = this.__destroy_into_raw();
        _assertClass(batch, BatchGraphUpdate);
        wasm.addedgegraphupdate_add_to_batch(ptr, batch.__wbg_ptr);
    }
    /**
     * @param {GCEdgeData} data
     */
    constructor(data) {
        _assertClass(data, GCEdgeData);
        var ptr0 = data.__destroy_into_raw();
        const ret = wasm.addedgegraphupdate_new(ptr0);
        this.__wbg_ptr = ret >>> 0;
        AddEdgeGraphUpdateFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const AddNoteGraphUpdateFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_addnotegraphupdate_free(ptr >>> 0, 1));

export class AddNoteGraphUpdate {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        AddNoteGraphUpdateFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_addnotegraphupdate_free(ptr, 0);
    }
    /**
     * @param {BatchGraphUpdate} batch
     */
    add_to_batch(batch) {
        const ptr = this.__destroy_into_raw();
        _assertClass(batch, BatchGraphUpdate);
        wasm.addnotegraphupdate_add_to_batch(ptr, batch.__wbg_ptr);
    }
    /**
     * @param {GCNodeData} data
     */
    constructor(data) {
        _assertClass(data, GCNodeData);
        var ptr0 = data.__destroy_into_raw();
        const ret = wasm.addnotegraphupdate_new(ptr0);
        this.__wbg_ptr = ret >>> 0;
        AddNoteGraphUpdateFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const BatchGraphUpdateFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_batchgraphupdate_free(ptr >>> 0, 1));

export class BatchGraphUpdate {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BatchGraphUpdateFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_batchgraphupdate_free(ptr, 0);
    }
    constructor() {
        const ret = wasm.batchgraphupdate_new();
        this.__wbg_ptr = ret >>> 0;
        BatchGraphUpdateFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const EdgeDataFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_edgedata_free(ptr >>> 0, 1));

export class EdgeData {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(EdgeData.prototype);
        obj.__wbg_ptr = ptr;
        EdgeDataFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        EdgeDataFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_edgedata_free(ptr, 0);
    }
    /**
     * @returns {boolean}
     */
    get explicit() {
        const ret = wasm.__wbg_get_edgedata_explicit(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {boolean} arg0
     */
    set explicit(arg0) {
        wasm.__wbg_set_edgedata_explicit(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get round() {
        const ret = wasm.__wbg_get_edgedata_round(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set round(arg0) {
        wasm.__wbg_set_edgedata_round(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {string}
     */
    get edge_type() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.edgedata_edge_type(this.__wbg_ptr);
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
    get edge_source() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.edgedata_edge_source(this.__wbg_ptr);
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
    toString() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.edgedata_toString(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}

const EdgeListFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_edgelist_free(ptr >>> 0, 1));

export class EdgeList {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(EdgeList.prototype);
        obj.__wbg_ptr = ptr;
        EdgeListFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        EdgeListFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_edgelist_free(ptr, 0);
    }
    /**
     * @returns {GroupedEdgeList}
     */
    group_by_type() {
        const ret = wasm.edgelist_group_by_type(this.__wbg_ptr);
        return GroupedEdgeList.__wrap(ret);
    }
    /**
     * @returns {string}
     */
    toString() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.edgelist_toString(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Returns a sorted clone of the edges.
     * @param {NoteGraph} graph
     * @param {EdgeSorter} sorter
     * @returns {EdgeStruct[]}
     */
    get_sorted_edges(graph, sorter) {
        _assertClass(graph, NoteGraph);
        _assertClass(sorter, EdgeSorter);
        const ret = wasm.edgelist_get_sorted_edges(this.__wbg_ptr, graph.__wbg_ptr, sorter.__wbg_ptr);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {EdgeStruct | undefined}
     */
    last() {
        const ret = wasm.edgelist_last(this.__wbg_ptr);
        return ret === 0 ? undefined : EdgeStruct.__wrap(ret);
    }
    /**
     * @returns {EdgeStruct | undefined}
     */
    first() {
        const ret = wasm.edgelist_first(this.__wbg_ptr);
        return ret === 0 ? undefined : EdgeStruct.__wrap(ret);
    }
    /**
     * Consumes the [EdgeList] and returns the edges as a Vec (or array for
     * JS).
     * @returns {EdgeStruct[]}
     */
    to_array() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.edgelist_to_array(ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Returns a clone of the edges.
     * @returns {EdgeStruct[]}
     */
    get_edges() {
        const ret = wasm.edgelist_get_edges(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
}

const EdgeSorterFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_edgesorter_free(ptr >>> 0, 1));

export class EdgeSorter {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(EdgeSorter.prototype);
        obj.__wbg_ptr = ptr;
        EdgeSorterFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        EdgeSorterFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_edgesorter_free(ptr, 0);
    }
}

const EdgeStructFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_edgestruct_free(ptr >>> 0, 1));

export class EdgeStruct {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(EdgeStruct.prototype);
        obj.__wbg_ptr = ptr;
        EdgeStructFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    static __unwrap(jsValue) {
        if (!(jsValue instanceof EdgeStruct)) {
            return 0;
        }
        return jsValue.__destroy_into_raw();
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        EdgeStructFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_edgestruct_free(ptr, 0);
    }
    /**
     * @param {NoteGraph} graph
     * @returns {string}
     */
    edge_source(graph) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(graph, NoteGraph);
            const ret = wasm.edgestruct_edge_source(this.__wbg_ptr, graph.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {NoteGraph} graph
     * @returns {NodeData}
     */
    source_data(graph) {
        _assertClass(graph, NoteGraph);
        const ret = wasm.edgestruct_source_data(this.__wbg_ptr, graph.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return NodeData.__wrap(ret[0]);
    }
    /**
     * @param {NoteGraph} graph
     * @returns {string}
     */
    source_path(graph) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(graph, NoteGraph);
            const ret = wasm.edgestruct_source_path(this.__wbg_ptr, graph.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {NoteGraph} graph
     * @returns {NodeData}
     */
    target_data(graph) {
        _assertClass(graph, NoteGraph);
        const ret = wasm.edgestruct_target_data(this.__wbg_ptr, graph.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return NodeData.__wrap(ret[0]);
    }
    /**
     * @param {NoteGraph} graph
     * @returns {string}
     */
    target_path(graph) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(graph, NoteGraph);
            const ret = wasm.edgestruct_target_path(this.__wbg_ptr, graph.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @returns {boolean}
     */
    is_self_loop() {
        const ret = wasm.edgestruct_is_self_loop(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {NoteGraph} graph
     * @returns {boolean}
     */
    source_resolved(graph) {
        _assertClass(graph, NoteGraph);
        const ret = wasm.edgestruct_source_resolved(this.__wbg_ptr, graph.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0] !== 0;
    }
    /**
     * @param {NoteGraph} graph
     * @returns {boolean}
     */
    target_resolved(graph) {
        _assertClass(graph, NoteGraph);
        const ret = wasm.edgestruct_target_resolved(this.__wbg_ptr, graph.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0] !== 0;
    }
    /**
     * @returns {string}
     */
    toString() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.edgestruct_toString(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {NoteGraph} graph
     * @param {NodeStringifyOptions} options
     * @returns {string}
     */
    stringify_source(graph, options) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(graph, NoteGraph);
            _assertClass(options, NodeStringifyOptions);
            const ret = wasm.edgestruct_stringify_source(this.__wbg_ptr, graph.__wbg_ptr, options.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {NoteGraph} graph
     * @param {NodeStringifyOptions} options
     * @returns {string}
     */
    stringify_target(graph, options) {
        let deferred2_0;
        let deferred2_1;
        try {
            _assertClass(graph, NoteGraph);
            _assertClass(options, NodeStringifyOptions);
            const ret = wasm.edgestruct_stringify_target(this.__wbg_ptr, graph.__wbg_ptr, options.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * @param {NoteGraph} graph
     * @param {string[]} attributes
     * @returns {string}
     */
    get_attribute_label(graph, attributes) {
        let deferred3_0;
        let deferred3_1;
        try {
            _assertClass(graph, NoteGraph);
            const ptr0 = passArrayJsValueToWasm0(attributes, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.edgestruct_get_attribute_label(this.__wbg_ptr, graph.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {NoteGraph} graph
     * @param {string[] | null} [edge_types]
     * @returns {boolean}
     */
    matches_edge_filter(graph, edge_types) {
        _assertClass(graph, NoteGraph);
        var ptr0 = isLikeNone(edge_types) ? 0 : passArrayJsValueToWasm0(edge_types, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.edgestruct_matches_edge_filter(this.__wbg_ptr, graph.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0] !== 0;
    }
    /**
     * @param {NoteGraph} graph
     * @returns {number}
     */
    round(graph) {
        _assertClass(graph, NoteGraph);
        const ret = wasm.edgestruct_round(this.__wbg_ptr, graph.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0];
    }
    /**
     * @param {NoteGraph} graph
     * @returns {boolean}
     */
    explicit(graph) {
        _assertClass(graph, NoteGraph);
        const ret = wasm.edgestruct_explicit(this.__wbg_ptr, graph.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0] !== 0;
    }
    /**
     * @param {NoteGraph} graph
     * @returns {EdgeData}
     */
    edge_data(graph) {
        _assertClass(graph, NoteGraph);
        const ret = wasm.edgestruct_edge_data(this.__wbg_ptr, graph.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return EdgeData.__wrap(ret[0]);
    }
    /**
     * @returns {string}
     */
    get edge_type() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.edgestruct_edge_type(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}

const FlatTraversalDataFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_flattraversaldata_free(ptr >>> 0, 1));

export class FlatTraversalData {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(FlatTraversalData.prototype);
        obj.__wbg_ptr = ptr;
        FlatTraversalDataFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    static __unwrap(jsValue) {
        if (!(jsValue instanceof FlatTraversalData)) {
            return 0;
        }
        return jsValue.__destroy_into_raw();
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        FlatTraversalDataFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_flattraversaldata_free(ptr, 0);
    }
    /**
     * the edge struct that was traversed
     * @returns {EdgeStruct}
     */
    get edge() {
        const ret = wasm.__wbg_get_flattraversaldata_edge(this.__wbg_ptr);
        return EdgeStruct.__wrap(ret);
    }
    /**
     * the edge struct that was traversed
     * @param {EdgeStruct} arg0
     */
    set edge(arg0) {
        _assertClass(arg0, EdgeStruct);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_flattraversaldata_edge(this.__wbg_ptr, ptr0);
    }
    /**
     * the depth of the node in the traversal
     * @returns {number}
     */
    get depth() {
        const ret = wasm.__wbg_get_flattraversaldata_depth(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * the depth of the node in the traversal
     * @param {number} arg0
     */
    set depth(arg0) {
        wasm.__wbg_set_flattraversaldata_depth(this.__wbg_ptr, arg0);
    }
    /**
     * the number of total children of the node, so also children of children
     * @returns {number}
     */
    get number_of_children() {
        const ret = wasm.__wbg_get_flattraversaldata_number_of_children(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * the number of total children of the node, so also children of children
     * @param {number} arg0
     */
    set number_of_children(arg0) {
        wasm.__wbg_set_flattraversaldata_number_of_children(this.__wbg_ptr, arg0);
    }
    /**
     * the children of the node
     * @returns {Uint32Array}
     */
    get children() {
        const ret = wasm.__wbg_get_flattraversaldata_children(this.__wbg_ptr);
        var v1 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * the children of the node
     * @param {Uint32Array} arg0
     */
    set children(arg0) {
        const ptr0 = passArray32ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_flattraversaldata_children(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @returns {boolean}
     */
    get has_cut_of_children() {
        const ret = wasm.__wbg_get_flattraversaldata_has_cut_of_children(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {boolean} arg0
     */
    set has_cut_of_children(arg0) {
        wasm.__wbg_set_flattraversaldata_has_cut_of_children(this.__wbg_ptr, arg0);
    }
    /**
     * @param {NoteGraph} graph
     * @param {string[]} attributes
     * @returns {string}
     */
    get_attribute_label(graph, attributes) {
        let deferred3_0;
        let deferred3_1;
        try {
            _assertClass(graph, NoteGraph);
            const ptr0 = passArrayJsValueToWasm0(attributes, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.flattraversaldata_get_attribute_label(this.__wbg_ptr, graph.__wbg_ptr, ptr0, len0);
            var ptr2 = ret[0];
            var len2 = ret[1];
            if (ret[3]) {
                ptr2 = 0; len2 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred3_0 = ptr2;
            deferred3_1 = len2;
            return getStringFromWasm0(ptr2, len2);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    /**
     * @param {NoteGraph} graph
     * @param {NodeStringifyOptions} str_opt
     * @param {string[]} attributes
     * @returns {any}
     */
    to_js_rendering_obj(graph, str_opt, attributes) {
        _assertClass(graph, NoteGraph);
        _assertClass(str_opt, NodeStringifyOptions);
        const ptr0 = passArrayJsValueToWasm0(attributes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.flattraversaldata_to_js_rendering_obj(this.__wbg_ptr, graph.__wbg_ptr, str_opt.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
}

const FlatTraversalResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_flattraversalresult_free(ptr >>> 0, 1));

export class FlatTraversalResult {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(FlatTraversalResult.prototype);
        obj.__wbg_ptr = ptr;
        FlatTraversalResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        FlatTraversalResultFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_flattraversalresult_free(ptr, 0);
    }
    /**
     * @returns {FlatTraversalData[]}
     */
    get data() {
        const ret = wasm.__wbg_get_flattraversalresult_data(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @param {FlatTraversalData[]} arg0
     */
    set data(arg0) {
        const ptr0 = passArrayJsValueToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_flattraversalresult_data(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @returns {number}
     */
    get node_count() {
        const ret = wasm.__wbg_get_flattraversalresult_node_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {number} arg0
     */
    set node_count(arg0) {
        wasm.__wbg_set_flattraversalresult_node_count(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get max_depth() {
        const ret = wasm.__wbg_get_flattraversaldata_number_of_children(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {number} arg0
     */
    set max_depth(arg0) {
        wasm.__wbg_set_flattraversaldata_number_of_children(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {boolean}
     */
    get hit_depth_limit() {
        const ret = wasm.__wbg_get_flattraversalresult_hit_depth_limit(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {boolean} arg0
     */
    set hit_depth_limit(arg0) {
        wasm.__wbg_set_flattraversalresult_hit_depth_limit(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {bigint}
     */
    get traversal_time() {
        const ret = wasm.__wbg_get_flattraversalresult_traversal_time(this.__wbg_ptr);
        return BigInt.asUintN(64, ret);
    }
    /**
     * @param {bigint} arg0
     */
    set traversal_time(arg0) {
        wasm.__wbg_set_flattraversalresult_traversal_time(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {Uint32Array}
     */
    get entry_nodes() {
        const ret = wasm.__wbg_get_flattraversalresult_entry_nodes(this.__wbg_ptr);
        var v1 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @param {Uint32Array} arg0
     */
    set entry_nodes(arg0) {
        const ptr0 = passArray32ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_flattraversalresult_entry_nodes(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {number} index
     * @returns {FlatTraversalData | undefined}
     */
    data_at_index(index) {
        const ret = wasm.flattraversalresult_data_at_index(this.__wbg_ptr, index);
        return ret === 0 ? undefined : FlatTraversalData.__wrap(ret);
    }
    /**
     * @returns {string}
     */
    toString() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.flattraversalresult_toString(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {number} index
     * @returns {Uint32Array | undefined}
     */
    children_at_index(index) {
        const ret = wasm.flattraversalresult_children_at_index(this.__wbg_ptr, index);
        let v1;
        if (ret[0] !== 0) {
            v1 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        }
        return v1;
    }
    /**
     * @param {number} index
     * @param {NoteGraph} graph
     * @param {NodeStringifyOptions} str_opt
     * @param {string[]} attributes
     * @returns {any}
     */
    rendering_obj_at_index(index, graph, str_opt, attributes) {
        _assertClass(graph, NoteGraph);
        _assertClass(str_opt, NodeStringifyOptions);
        const ptr0 = passArrayJsValueToWasm0(attributes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.flattraversalresult_rendering_obj_at_index(this.__wbg_ptr, index, graph.__wbg_ptr, str_opt.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * Sorts the flat traversal data with a given edge sorter.
     * This is not as efficient as sorting the traversal data before flattening
     * it, but it's still a lot better than sorting then re-flatten.
     * @param {NoteGraph} graph
     * @param {EdgeSorter} sorter
     */
    sort(graph, sorter) {
        _assertClass(graph, NoteGraph);
        _assertClass(sorter, EdgeSorter);
        const ret = wasm.flattraversalresult_sort(this.__wbg_ptr, graph.__wbg_ptr, sorter.__wbg_ptr);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @returns {boolean}
     */
    is_empty() {
        const ret = wasm.flattraversalresult_is_empty(this.__wbg_ptr);
        return ret !== 0;
    }
}

const GCEdgeDataFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_gcedgedata_free(ptr >>> 0, 1));

export class GCEdgeData {

    static __unwrap(jsValue) {
        if (!(jsValue instanceof GCEdgeData)) {
            return 0;
        }
        return jsValue.__destroy_into_raw();
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GCEdgeDataFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_gcedgedata_free(ptr, 0);
    }
    /**
     * @returns {string}
     */
    get edge_source() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.gcedgedata_edge_source(this.__wbg_ptr);
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
    toString() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.gcedgedata_toString(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {string} source
     * @param {string} target
     * @param {string} edge_type
     * @param {string} edge_source
     */
    constructor(source, target, edge_type, edge_source) {
        const ptr0 = passStringToWasm0(source, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(target, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(edge_type, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passStringToWasm0(edge_source, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len3 = WASM_VECTOR_LEN;
        const ret = wasm.gcedgedata_new(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3);
        this.__wbg_ptr = ret >>> 0;
        GCEdgeDataFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {string}
     */
    get source() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.gcedgedata_source(this.__wbg_ptr);
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
    get target() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.gcedgedata_target(this.__wbg_ptr);
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
    get edge_type() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.gcedgedata_edge_type(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}

const GCNodeDataFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_gcnodedata_free(ptr >>> 0, 1));

export class GCNodeData {

    static __unwrap(jsValue) {
        if (!(jsValue instanceof GCNodeData)) {
            return 0;
        }
        return jsValue.__destroy_into_raw();
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GCNodeDataFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_gcnodedata_free(ptr, 0);
    }
    /**
     * @returns {string}
     */
    toString() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.gcnodedata_toString(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {string} path
     * @param {string[]} aliases
     * @param {boolean} resolved
     * @param {boolean} ignore_in_edges
     * @param {boolean} ignore_out_edges
     */
    constructor(path, aliases, resolved, ignore_in_edges, ignore_out_edges) {
        const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayJsValueToWasm0(aliases, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.gcnodedata_new(ptr0, len0, ptr1, len1, resolved, ignore_in_edges, ignore_out_edges);
        this.__wbg_ptr = ret >>> 0;
        GCNodeDataFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const GroupedEdgeListFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_groupededgelist_free(ptr >>> 0, 1));
/**
 * A edge list that is grouped by edge type.
 */
export class GroupedEdgeList {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(GroupedEdgeList.prototype);
        obj.__wbg_ptr = ptr;
        GroupedEdgeListFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GroupedEdgeListFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_groupededgelist_free(ptr, 0);
    }
    /**
     * @returns {string}
     */
    toString() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.groupededgelist_toString(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {string} edge_type
     * @param {NoteGraph} graph
     * @param {EdgeSorter} sorter
     * @returns {EdgeStruct[] | undefined}
     */
    get_sorted_edges(edge_type, graph, sorter) {
        const ptr0 = passStringToWasm0(edge_type, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        _assertClass(graph, NoteGraph);
        _assertClass(sorter, EdgeSorter);
        const ret = wasm.groupededgelist_get_sorted_edges(this.__wbg_ptr, ptr0, len0, graph.__wbg_ptr, sorter.__wbg_ptr);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        let v2;
        if (ret[0] !== 0) {
            v2 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        }
        return v2;
    }
    /**
     * @param {string} edge_type
     * @returns {EdgeStruct[] | undefined}
     */
    get_edges(edge_type) {
        const ptr0 = passStringToWasm0(edge_type, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.groupededgelist_get_edges(this.__wbg_ptr, ptr0, len0);
        let v2;
        if (ret[0] !== 0) {
            v2 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        }
        return v2;
    }
}

const MermaidGraphDataFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_mermaidgraphdata_free(ptr >>> 0, 1));

export class MermaidGraphData {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(MermaidGraphData.prototype);
        obj.__wbg_ptr = ptr;
        MermaidGraphDataFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        MermaidGraphDataFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_mermaidgraphdata_free(ptr, 0);
    }
    /**
     * @returns {string}
     */
    get mermaid() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_mermaidgraphdata_mermaid(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {string} arg0
     */
    set mermaid(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_mermaidgraphdata_mermaid(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @returns {bigint}
     */
    get traversal_time() {
        const ret = wasm.__wbg_get_mermaidgraphdata_traversal_time(this.__wbg_ptr);
        return BigInt.asUintN(64, ret);
    }
    /**
     * @param {bigint} arg0
     */
    set traversal_time(arg0) {
        wasm.__wbg_set_mermaidgraphdata_traversal_time(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {bigint}
     */
    get total_time() {
        const ret = wasm.__wbg_get_mermaidgraphdata_total_time(this.__wbg_ptr);
        return BigInt.asUintN(64, ret);
    }
    /**
     * @param {bigint} arg0
     */
    set total_time(arg0) {
        wasm.__wbg_set_mermaidgraphdata_total_time(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {string}
     */
    toString() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.mermaidgraphdata_toString(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}

const MermaidGraphOptionsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_mermaidgraphoptions_free(ptr >>> 0, 1));

export class MermaidGraphOptions {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        MermaidGraphOptionsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_mermaidgraphoptions_free(ptr, 0);
    }
    /**
     * @returns {string}
     */
    toString() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.mermaidgraphoptions_toString(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {string | null | undefined} active_node
     * @param {string} init_line
     * @param {string} chart_type
     * @param {string} direction
     * @param {boolean} collapse_opposing_edges
     * @param {string[]} edge_label_attributes
     * @param {EdgeSorter | null | undefined} edge_sorter
     * @param {Function | null | undefined} node_label_fn
     * @param {boolean} link_nodes
     * @param {boolean} show_arrow_points
     * @param {string[]} field_arrow_keys
     * @param {string[]} field_arrow_values
     */
    constructor(active_node, init_line, chart_type, direction, collapse_opposing_edges, edge_label_attributes, edge_sorter, node_label_fn, link_nodes, show_arrow_points, field_arrow_keys, field_arrow_values) {
        var ptr0 = isLikeNone(active_node) ? 0 : passStringToWasm0(active_node, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(init_line, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(chart_type, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passStringToWasm0(direction, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len3 = WASM_VECTOR_LEN;
        const ptr4 = passArrayJsValueToWasm0(edge_label_attributes, wasm.__wbindgen_malloc);
        const len4 = WASM_VECTOR_LEN;
        let ptr5 = 0;
        if (!isLikeNone(edge_sorter)) {
            _assertClass(edge_sorter, EdgeSorter);
            ptr5 = edge_sorter.__destroy_into_raw();
        }
        const ptr6 = passArrayJsValueToWasm0(field_arrow_keys, wasm.__wbindgen_malloc);
        const len6 = WASM_VECTOR_LEN;
        const ptr7 = passArrayJsValueToWasm0(field_arrow_values, wasm.__wbindgen_malloc);
        const len7 = WASM_VECTOR_LEN;
        const ret = wasm.mermaidgraphoptions_new(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, collapse_opposing_edges, ptr4, len4, ptr5, isLikeNone(node_label_fn) ? 0 : addToExternrefTable0(node_label_fn), link_nodes, show_arrow_points, ptr6, len6, ptr7, len7);
        this.__wbg_ptr = ret >>> 0;
        MermaidGraphOptionsFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const NodeDataFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_nodedata_free(ptr >>> 0, 1));

export class NodeData {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(NodeData.prototype);
        obj.__wbg_ptr = ptr;
        NodeDataFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NodeDataFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_nodedata_free(ptr, 0);
    }
    /**
     * @returns {string}
     */
    get path() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_nodedata_path(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {string} arg0
     */
    set path(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_nodedata_path(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @returns {string[]}
     */
    get aliases() {
        const ret = wasm.__wbg_get_nodedata_aliases(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @param {string[]} arg0
     */
    set aliases(arg0) {
        const ptr0 = passArrayJsValueToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_nodedata_aliases(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @returns {boolean}
     */
    get resolved() {
        const ret = wasm.__wbg_get_nodedata_resolved(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {boolean} arg0
     */
    set resolved(arg0) {
        wasm.__wbg_set_nodedata_resolved(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {boolean}
     */
    get ignore_in_edges() {
        const ret = wasm.__wbg_get_nodedata_ignore_in_edges(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {boolean} arg0
     */
    set ignore_in_edges(arg0) {
        wasm.__wbg_set_nodedata_ignore_in_edges(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {boolean}
     */
    get ignore_out_edges() {
        const ret = wasm.__wbg_get_nodedata_ignore_out_edges(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {boolean} arg0
     */
    set ignore_out_edges(arg0) {
        wasm.__wbg_set_nodedata_ignore_out_edges(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {string}
     */
    toString() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.nodedata_toString(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {string} path
     * @param {string[]} aliases
     * @param {boolean} resolved
     * @param {boolean} ignore_in_edges
     * @param {boolean} ignore_out_edges
     */
    constructor(path, aliases, resolved, ignore_in_edges, ignore_out_edges) {
        const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayJsValueToWasm0(aliases, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.nodedata_new(ptr0, len0, ptr1, len1, resolved, ignore_in_edges, ignore_out_edges);
        this.__wbg_ptr = ret >>> 0;
        NodeDataFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const NodeStringifyOptionsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_nodestringifyoptions_free(ptr >>> 0, 1));

export class NodeStringifyOptions {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NodeStringifyOptionsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_nodestringifyoptions_free(ptr, 0);
    }
    /**
     * @param {boolean} extension
     * @param {boolean} folder
     * @param {boolean} alias
     * @param {string | null} [trim_basename_delimiter]
     */
    constructor(extension, folder, alias, trim_basename_delimiter) {
        var ptr0 = isLikeNone(trim_basename_delimiter) ? 0 : passStringToWasm0(trim_basename_delimiter, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.nodestringifyoptions_new(extension, folder, alias, ptr0, len0);
        this.__wbg_ptr = ret >>> 0;
        NodeStringifyOptionsFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {NodeData} node
     * @returns {string}
     */
    stringify_node(node) {
        let deferred1_0;
        let deferred1_1;
        try {
            _assertClass(node, NodeData);
            const ret = wasm.nodestringifyoptions_stringify_node(this.__wbg_ptr, node.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}

const NoteGraphFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_notegraph_free(ptr >>> 0, 1));
/**
 * A graph that stores notes and their relationships.
 *
 * INVARIANT: The edge type tracker should contain exactly the edge types that
 * are present in the graph.
 *
 * INVARIANT: The node hash should contain exactly the node paths that are
 * present in the graph.
 */
export class NoteGraph {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(NoteGraph.prototype);
        obj.__wbg_ptr = ptr;
        NoteGraphFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NoteGraphFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_notegraph_free(ptr, 0);
    }
    /**
     * Returns all edge types that are present in the graph.
     * @returns {string[]}
     */
    edge_types() {
        const ret = wasm.notegraph_edge_types(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Builds the graph from a list of nodes, edges, and transitive rules.
     * All existing data in the graph is removed.
     * @param {GCNodeData[]} nodes
     * @param {GCEdgeData[]} edges
     * @param {TransitiveGraphRule[]} transitive_rules
     */
    build_graph(nodes, edges, transitive_rules) {
        const ptr0 = passArrayJsValueToWasm0(nodes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayJsValueToWasm0(edges, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArrayJsValueToWasm0(transitive_rules, wasm.__wbindgen_malloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.notegraph_build_graph(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Applies a batch update to the graph.
     * Throws an error if the update fails, and leave the graph in an
     * inconsistent state.
     *
     * TODO: some security against errors leaving the graph in an inconsistent
     * state. Maybe safely clear the entire graph.
     * @param {BatchGraphUpdate} update
     */
    apply_update(update) {
        _assertClass(update, BatchGraphUpdate);
        var ptr0 = update.__destroy_into_raw();
        const ret = wasm.notegraph_apply_update(this.__wbg_ptr, ptr0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Iterate all edges in the graph and call the provided function with each
     * [EdgeData].
     * @param {Function} f
     */
    iterate_edges(f) {
        wasm.notegraph_iterate_edges(this.__wbg_ptr, f);
    }
    /**
     * Iterate all nodes in the graph and call the provided function with each
     * [NodeData].
     * @param {Function} f
     */
    iterate_nodes(f) {
        wasm.notegraph_iterate_nodes(this.__wbg_ptr, f);
    }
    /**
     * Notify the JS side that the graph has been updated.
     */
    notify_update() {
        wasm.notegraph_notify_update(this.__wbg_ptr);
    }
    /**
     * Checks if a node is resolved.
     * Returns false if the node is not found.
     * @param {string} node
     * @returns {boolean}
     */
    is_node_resolved(node) {
        const ptr0 = passStringToWasm0(node, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.notegraph_is_node_resolved(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * Get all incoming edges to a node.
     * @param {string} node
     * @returns {EdgeList}
     */
    get_incoming_edges(node) {
        const ptr0 = passStringToWasm0(node, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.notegraph_get_incoming_edges(this.__wbg_ptr, ptr0, len0);
        return EdgeList.__wrap(ret);
    }
    /**
     * Get all outgoing edges from a node.
     * @param {string} node
     * @returns {EdgeList}
     */
    get_outgoing_edges(node) {
        const ptr0 = passStringToWasm0(node, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.notegraph_get_outgoing_edges(this.__wbg_ptr, ptr0, len0);
        return EdgeList.__wrap(ret);
    }
    /**
     * Set the update callback.
     * This will be called after every update to the graph.
     * @param {Function} callback
     */
    set_update_callback(callback) {
        wasm.notegraph_set_update_callback(this.__wbg_ptr, callback);
    }
    /**
     * Get all outgoing edges from a node, filtered by edge type.
     * @param {string} node
     * @param {string[] | null} [edge_types]
     * @returns {EdgeList}
     */
    get_filtered_outgoing_edges(node, edge_types) {
        const ptr0 = passStringToWasm0(node, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(edge_types) ? 0 : passArrayJsValueToWasm0(edge_types, wasm.__wbindgen_malloc);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.notegraph_get_filtered_outgoing_edges(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return EdgeList.__wrap(ret);
    }
    /**
     * Get all outgoing edges from a node, filtered and grouped by edge type.
     * @param {string} node
     * @param {string[] | null} [edge_types]
     * @returns {GroupedEdgeList}
     */
    get_filtered_grouped_outgoing_edges(node, edge_types) {
        const ptr0 = passStringToWasm0(node, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(edge_types) ? 0 : passArrayJsValueToWasm0(edge_types, wasm.__wbindgen_malloc);
        var len1 = WASM_VECTOR_LEN;
        const ret = wasm.notegraph_get_filtered_grouped_outgoing_edges(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return GroupedEdgeList.__wrap(ret);
    }
    log() {
        wasm.notegraph_log(this.__wbg_ptr);
    }
    /**
     * @returns {NoteGraph}
     */
    static new() {
        const ret = wasm.notegraph_new();
        return NoteGraph.__wrap(ret);
    }
    /**
     * @param {string} node
     * @returns {NodeData | undefined}
     */
    get_node(node) {
        const ptr0 = passStringToWasm0(node, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.notegraph_get_node(this.__wbg_ptr, ptr0, len0);
        return ret === 0 ? undefined : NodeData.__wrap(ret);
    }
    /**
     * Checks if a node exists in the graph.
     * @param {string} node
     * @returns {boolean}
     */
    has_node(node) {
        const ptr0 = passStringToWasm0(node, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.notegraph_has_node(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * @param {TraversalOptions} traversal_options
     * @param {MermaidGraphOptions} diagram_options
     * @returns {MermaidGraphData}
     */
    generate_mermaid_graph(traversal_options, diagram_options) {
        _assertClass(traversal_options, TraversalOptions);
        var ptr0 = traversal_options.__destroy_into_raw();
        _assertClass(diagram_options, MermaidGraphOptions);
        var ptr1 = diagram_options.__destroy_into_raw();
        const ret = wasm.notegraph_generate_mermaid_graph(this.__wbg_ptr, ptr0, ptr1);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return MermaidGraphData.__wrap(ret[0]);
    }
    /**
     * Runs a recursive traversal of the graph.
     * @param {TraversalOptions} options
     * @returns {TraversalResult}
     */
    rec_traverse(options) {
        _assertClass(options, TraversalOptions);
        var ptr0 = options.__destroy_into_raw();
        const ret = wasm.notegraph_rec_traverse(this.__wbg_ptr, ptr0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return TraversalResult.__wrap(ret[0]);
    }
    /**
     * Runs a recursive traversal of the graph and post-processes the result.
     * The post-processed result is more efficient to work with from
     * JavaScript.
     * @param {TraversalOptions} options
     * @param {TraversalPostprocessOptions} postprocess_options
     * @returns {FlatTraversalResult}
     */
    rec_traverse_and_process(options, postprocess_options) {
        _assertClass(options, TraversalOptions);
        var ptr0 = options.__destroy_into_raw();
        _assertClass(postprocess_options, TraversalPostprocessOptions);
        var ptr1 = postprocess_options.__destroy_into_raw();
        const ret = wasm.notegraph_rec_traverse_and_process(this.__wbg_ptr, ptr0, ptr1);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return FlatTraversalResult.__wrap(ret[0]);
    }
}

const NoteGraphErrorFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_notegrapherror_free(ptr >>> 0, 1));

export class NoteGraphError {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(NoteGraphError.prototype);
        obj.__wbg_ptr = ptr;
        NoteGraphErrorFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NoteGraphErrorFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_notegrapherror_free(ptr, 0);
    }
    /**
     * @returns {string}
     */
    toString() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.notegrapherror_toString(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {string} message
     */
    constructor(message) {
        const ptr0 = passStringToWasm0(message, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.notegrapherror_new(ptr0, len0);
        this.__wbg_ptr = ret >>> 0;
        NoteGraphErrorFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {string}
     */
    get message() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.notegrapherror_message(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}

const PathFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_path_free(ptr >>> 0, 1));

export class Path {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(Path.prototype);
        obj.__wbg_ptr = ptr;
        PathFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PathFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_path_free(ptr, 0);
    }
    /**
     * @returns {EdgeStruct[]}
     */
    get edges() {
        const ret = wasm.__wbg_get_path_edges(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @param {EdgeStruct[]} arg0
     */
    set edges(arg0) {
        const ptr0 = passArrayJsValueToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_path_edges(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @returns {EdgeStruct[]}
     */
    get reverse_edges() {
        const ret = wasm.path_reverse_edges(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {string}
     */
    toString() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.path_toString(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {NoteGraph} graph
     * @returns {string | undefined}
     */
    get_first_target(graph) {
        _assertClass(graph, NoteGraph);
        const ret = wasm.path_get_first_target(this.__wbg_ptr, graph.__wbg_ptr);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        let v1;
        if (ret[0] !== 0) {
            v1 = getStringFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    /**
     * @param {Path} other
     * @returns {boolean}
     */
    equals(other) {
        _assertClass(other, Path);
        const ret = wasm.path_equals(this.__wbg_ptr, other.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {number}
     */
    length() {
        const ret = wasm.path_length(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {number} limit
     * @returns {Path}
     */
    truncate(limit) {
        const ret = wasm.path_truncate(this.__wbg_ptr, limit);
        return Path.__wrap(ret);
    }
}

const PathListFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_pathlist_free(ptr >>> 0, 1));

export class PathList {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PathList.prototype);
        obj.__wbg_ptr = ptr;
        PathListFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PathListFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_pathlist_free(ptr, 0);
    }
    /**
     * @returns {string}
     */
    toString() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.pathlist_toString(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {string} selection
     * @returns {PathList}
     */
    select(selection) {
        const ptr0 = passStringToWasm0(selection, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.pathlist_select(this.__wbg_ptr, ptr0, len0);
        return PathList.__wrap(ret);
    }
    /**
     * Cuts off all paths at a given depth, then sorts and deduplicates them.
     * @param {NoteGraph} graph
     * @param {number} depth
     * @returns {Path[]}
     */
    process(graph, depth) {
        _assertClass(graph, NoteGraph);
        const ret = wasm.pathlist_process(this.__wbg_ptr, graph.__wbg_ptr, depth);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {Path[]}
     */
    to_paths() {
        const ret = wasm.pathlist_to_paths(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {number}
     */
    max_depth() {
        const ret = wasm.pathlist_max_depth(this.__wbg_ptr);
        return ret >>> 0;
    }
}

const RemoveEdgeGraphUpdateFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_removeedgegraphupdate_free(ptr >>> 0, 1));

export class RemoveEdgeGraphUpdate {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RemoveEdgeGraphUpdateFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_removeedgegraphupdate_free(ptr, 0);
    }
    /**
     * @param {BatchGraphUpdate} batch
     */
    add_to_batch(batch) {
        const ptr = this.__destroy_into_raw();
        _assertClass(batch, BatchGraphUpdate);
        wasm.removeedgegraphupdate_add_to_batch(ptr, batch.__wbg_ptr);
    }
    /**
     * @param {string} from
     * @param {string} to
     * @param {string} edge_type
     */
    constructor(from, to, edge_type) {
        const ptr0 = passStringToWasm0(from, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(to, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(edge_type, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.removeedgegraphupdate_new(ptr0, len0, ptr1, len1, ptr2, len2);
        this.__wbg_ptr = ret >>> 0;
        RemoveEdgeGraphUpdateFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const RemoveNoteGraphUpdateFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_removenotegraphupdate_free(ptr >>> 0, 1));

export class RemoveNoteGraphUpdate {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RemoveNoteGraphUpdateFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_removenotegraphupdate_free(ptr, 0);
    }
    /**
     * @param {BatchGraphUpdate} batch
     */
    add_to_batch(batch) {
        const ptr = this.__destroy_into_raw();
        _assertClass(batch, BatchGraphUpdate);
        wasm.removenotegraphupdate_add_to_batch(ptr, batch.__wbg_ptr);
    }
    /**
     * @param {string} data
     */
    constructor(data) {
        const ptr0 = passStringToWasm0(data, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.removenotegraphupdate_new(ptr0, len0);
        this.__wbg_ptr = ret >>> 0;
        RemoveNoteGraphUpdateFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const RenameNoteGraphUpdateFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_renamenotegraphupdate_free(ptr >>> 0, 1));

export class RenameNoteGraphUpdate {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RenameNoteGraphUpdateFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_renamenotegraphupdate_free(ptr, 0);
    }
    /**
     * @param {BatchGraphUpdate} batch
     */
    add_to_batch(batch) {
        const ptr = this.__destroy_into_raw();
        _assertClass(batch, BatchGraphUpdate);
        wasm.renamenotegraphupdate_add_to_batch(ptr, batch.__wbg_ptr);
    }
    /**
     * @param {string} old_name
     * @param {string} new_name
     */
    constructor(old_name, new_name) {
        const ptr0 = passStringToWasm0(old_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(new_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.renamenotegraphupdate_new(ptr0, len0, ptr1, len1);
        this.__wbg_ptr = ret >>> 0;
        RenameNoteGraphUpdateFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const TransitiveGraphRuleFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_transitivegraphrule_free(ptr >>> 0, 1));

export class TransitiveGraphRule {

    static __unwrap(jsValue) {
        if (!(jsValue instanceof TransitiveGraphRule)) {
            return 0;
        }
        return jsValue.__destroy_into_raw();
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TransitiveGraphRuleFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_transitivegraphrule_free(ptr, 0);
    }
    /**
     * @returns {string}
     */
    toString() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.transitivegraphrule_toString(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {NoteGraph}
     */
    create_example_graph() {
        const ret = wasm.transitivegraphrule_create_example_graph(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return NoteGraph.__wrap(ret[0]);
    }
    /**
     * @param {string} name
     * @param {string[]} path
     * @param {string} edge_type
     * @param {number} rounds
     * @param {boolean} can_loop
     * @param {boolean} close_reversed
     */
    constructor(name, path, edge_type, rounds, can_loop, close_reversed) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayJsValueToWasm0(path, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(edge_type, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.transitivegraphrule_new(ptr0, len0, ptr1, len1, ptr2, len2, rounds, can_loop, close_reversed);
        this.__wbg_ptr = ret >>> 0;
        TransitiveGraphRuleFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const TransitiveRulesGraphUpdateFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_transitiverulesgraphupdate_free(ptr >>> 0, 1));

export class TransitiveRulesGraphUpdate {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TransitiveRulesGraphUpdateFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_transitiverulesgraphupdate_free(ptr, 0);
    }
    /**
     * @param {BatchGraphUpdate} batch
     */
    add_to_batch(batch) {
        const ptr = this.__destroy_into_raw();
        _assertClass(batch, BatchGraphUpdate);
        wasm.transitiverulesgraphupdate_add_to_batch(ptr, batch.__wbg_ptr);
    }
    /**
     * @param {TransitiveGraphRule[]} new_rules
     */
    constructor(new_rules) {
        const ptr0 = passArrayJsValueToWasm0(new_rules, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.transitiverulesgraphupdate_new(ptr0, len0);
        this.__wbg_ptr = ret >>> 0;
        TransitiveRulesGraphUpdateFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const TraversalDataFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_traversaldata_free(ptr >>> 0, 1));

export class TraversalData {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(TraversalData.prototype);
        obj.__wbg_ptr = ptr;
        TraversalDataFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    static __unwrap(jsValue) {
        if (!(jsValue instanceof TraversalData)) {
            return 0;
        }
        return jsValue.__destroy_into_raw();
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TraversalDataFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_traversaldata_free(ptr, 0);
    }
    /**
     * the edge struct that was traversed
     * @returns {EdgeStruct}
     */
    get edge() {
        const ret = wasm.__wbg_get_flattraversaldata_edge(this.__wbg_ptr);
        return EdgeStruct.__wrap(ret);
    }
    /**
     * the edge struct that was traversed
     * @param {EdgeStruct} arg0
     */
    set edge(arg0) {
        _assertClass(arg0, EdgeStruct);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_flattraversaldata_edge(this.__wbg_ptr, ptr0);
    }
    /**
     * the depth of the node in the traversal
     * @returns {number}
     */
    get depth() {
        const ret = wasm.__wbg_get_flattraversaldata_depth(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * the depth of the node in the traversal
     * @param {number} arg0
     */
    set depth(arg0) {
        wasm.__wbg_set_flattraversaldata_depth(this.__wbg_ptr, arg0);
    }
    /**
     * the number of total children of the node, so also children of children
     * @returns {number}
     */
    get number_of_children() {
        const ret = wasm.__wbg_get_flattraversaldata_number_of_children(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * the number of total children of the node, so also children of children
     * @param {number} arg0
     */
    set number_of_children(arg0) {
        wasm.__wbg_set_flattraversaldata_number_of_children(this.__wbg_ptr, arg0);
    }
    /**
     * the children of the node
     * @returns {TraversalData[]}
     */
    get children() {
        const ret = wasm.__wbg_get_traversaldata_children(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * the children of the node
     * @param {TraversalData[]} arg0
     */
    set children(arg0) {
        const ptr0 = passArrayJsValueToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_traversaldata_children(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * whether the node has a cut of children due to being at the depth limit
     * of a traversal, or similar
     * @returns {boolean}
     */
    get has_cut_of_children() {
        const ret = wasm.__wbg_get_flattraversaldata_has_cut_of_children(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * whether the node has a cut of children due to being at the depth limit
     * of a traversal, or similar
     * @param {boolean} arg0
     */
    set has_cut_of_children(arg0) {
        wasm.__wbg_set_flattraversaldata_has_cut_of_children(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {string}
     */
    toString() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.traversaldata_toString(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {NoteGraph} graph
     * @param {EdgeSorter} sorter
     */
    rec_sort_children(graph, sorter) {
        _assertClass(graph, NoteGraph);
        _assertClass(sorter, EdgeSorter);
        const ret = wasm.traversaldata_rec_sort_children(this.__wbg_ptr, graph.__wbg_ptr, sorter.__wbg_ptr);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * @param {EdgeStruct} edge
     * @param {number} depth
     * @param {number} number_of_children
     * @param {TraversalData[]} children
     * @param {boolean} has_cut_of_children
     */
    constructor(edge, depth, number_of_children, children, has_cut_of_children) {
        _assertClass(edge, EdgeStruct);
        var ptr0 = edge.__destroy_into_raw();
        const ptr1 = passArrayJsValueToWasm0(children, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.traversaldata_new(ptr0, depth, number_of_children, ptr1, len1, has_cut_of_children);
        this.__wbg_ptr = ret >>> 0;
        TraversalDataFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const TraversalOptionsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_traversaloptions_free(ptr >>> 0, 1));

export class TraversalOptions {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TraversalOptionsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_traversaloptions_free(ptr, 0);
    }
    /**
     * @returns {string[]}
     */
    get entry_nodes() {
        const ret = wasm.__wbg_get_traversaloptions_entry_nodes(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @param {string[]} arg0
     */
    set entry_nodes(arg0) {
        const ptr0 = passArrayJsValueToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_traversaloptions_entry_nodes(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * if this is None, all edge types will be traversed
     * @returns {string[] | undefined}
     */
    get edge_types() {
        const ret = wasm.__wbg_get_traversaloptions_edge_types(this.__wbg_ptr);
        let v1;
        if (ret[0] !== 0) {
            v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        }
        return v1;
    }
    /**
     * if this is None, all edge types will be traversed
     * @param {string[] | null} [arg0]
     */
    set edge_types(arg0) {
        var ptr0 = isLikeNone(arg0) ? 0 : passArrayJsValueToWasm0(arg0, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_traversaloptions_edge_types(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @returns {number}
     */
    get max_depth() {
        const ret = wasm.__wbg_get_traversaloptions_max_depth(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {number} arg0
     */
    set max_depth(arg0) {
        wasm.__wbg_set_traversaloptions_max_depth(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get max_traversal_count() {
        const ret = wasm.__wbg_get_traversaloptions_max_traversal_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {number} arg0
     */
    set max_traversal_count(arg0) {
        wasm.__wbg_set_traversaloptions_max_traversal_count(this.__wbg_ptr, arg0);
    }
    /**
     * if true, multiple traversals - one for each edge type - will be
     * performed and the results will be combined. if false, one traversal
     * over all edge types will be performed
     * @returns {boolean}
     */
    get separate_edges() {
        const ret = wasm.__wbg_get_traversaloptions_separate_edges(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * if true, multiple traversals - one for each edge type - will be
     * performed and the results will be combined. if false, one traversal
     * over all edge types will be performed
     * @param {boolean} arg0
     */
    set separate_edges(arg0) {
        wasm.__wbg_set_traversaloptions_separate_edges(this.__wbg_ptr, arg0);
    }
    /**
     * When set, only edges whose target node path is in this set will be
     * traversed. Used for the `dataview-from` codeblock filter.
     * @returns {string[] | undefined}
     */
    get dataview_from_paths() {
        const ret = wasm.__wbg_get_traversaloptions_dataview_from_paths(this.__wbg_ptr);
        let v1;
        if (ret[0] !== 0) {
            v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        }
        return v1;
    }
    /**
     * When set, only edges whose target node path is in this set will be
     * traversed. Used for the `dataview-from` codeblock filter.
     * @param {string[] | null} [arg0]
     */
    set dataview_from_paths(arg0) {
        var ptr0 = isLikeNone(arg0) ? 0 : passArrayJsValueToWasm0(arg0, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_traversaloptions_dataview_from_paths(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @returns {string}
     */
    toString() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.traversaloptions_toString(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {string[]} entry_nodes
     * @param {string[] | null | undefined} edge_types
     * @param {number} max_depth
     * @param {number} max_traversal_count
     * @param {boolean} separate_edges
     * @param {string[] | null} [dataview_from_paths]
     */
    constructor(entry_nodes, edge_types, max_depth, max_traversal_count, separate_edges, dataview_from_paths) {
        const ptr0 = passArrayJsValueToWasm0(entry_nodes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(edge_types) ? 0 : passArrayJsValueToWasm0(edge_types, wasm.__wbindgen_malloc);
        var len1 = WASM_VECTOR_LEN;
        var ptr2 = isLikeNone(dataview_from_paths) ? 0 : passArrayJsValueToWasm0(dataview_from_paths, wasm.__wbindgen_malloc);
        var len2 = WASM_VECTOR_LEN;
        const ret = wasm.traversaloptions_new(ptr0, len0, ptr1, len1, max_depth, max_traversal_count, separate_edges, ptr2, len2);
        this.__wbg_ptr = ret >>> 0;
        TraversalOptionsFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const TraversalPostprocessOptionsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_traversalpostprocessoptions_free(ptr >>> 0, 1));

export class TraversalPostprocessOptions {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(TraversalPostprocessOptions.prototype);
        obj.__wbg_ptr = ptr;
        TraversalPostprocessOptionsFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TraversalPostprocessOptionsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_traversalpostprocessoptions_free(ptr, 0);
    }
    /**
     * @returns {EdgeSorter | undefined}
     */
    get sorter() {
        const ret = wasm.__wbg_get_traversalpostprocessoptions_sorter(this.__wbg_ptr);
        return ret === 0 ? undefined : EdgeSorter.__wrap(ret);
    }
    /**
     * @param {EdgeSorter | null} [arg0]
     */
    set sorter(arg0) {
        let ptr0 = 0;
        if (!isLikeNone(arg0)) {
            _assertClass(arg0, EdgeSorter);
            ptr0 = arg0.__destroy_into_raw();
        }
        wasm.__wbg_set_traversalpostprocessoptions_sorter(this.__wbg_ptr, ptr0);
    }
    /**
     * @returns {boolean}
     */
    get flatten() {
        const ret = wasm.__wbg_get_traversalpostprocessoptions_flatten(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {boolean} arg0
     */
    set flatten(arg0) {
        wasm.__wbg_set_traversalpostprocessoptions_flatten(this.__wbg_ptr, arg0);
    }
    /**
     * @param {boolean} flatten
     * @returns {TraversalPostprocessOptions}
     */
    static without_sorter(flatten) {
        const ret = wasm.traversalpostprocessoptions_without_sorter(flatten);
        return TraversalPostprocessOptions.__wrap(ret);
    }
    /**
     * @returns {string}
     */
    toString() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.traversalpostprocessoptions_toString(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {EdgeSorter} sorter
     * @param {boolean} flatten
     */
    constructor(sorter, flatten) {
        _assertClass(sorter, EdgeSorter);
        const ret = wasm.traversalpostprocessoptions_new(sorter.__wbg_ptr, flatten);
        this.__wbg_ptr = ret >>> 0;
        TraversalPostprocessOptionsFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}

const TraversalResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_traversalresult_free(ptr >>> 0, 1));

export class TraversalResult {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(TraversalResult.prototype);
        obj.__wbg_ptr = ptr;
        TraversalResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TraversalResultFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_traversalresult_free(ptr, 0);
    }
    /**
     * @returns {TraversalData[]}
     */
    get data() {
        const ret = wasm.__wbg_get_traversalresult_data(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @param {TraversalData[]} arg0
     */
    set data(arg0) {
        const ptr0 = passArrayJsValueToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_traversalresult_data(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @returns {number}
     */
    get node_count() {
        const ret = wasm.__wbg_get_traversalresult_node_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {number} arg0
     */
    set node_count(arg0) {
        wasm.__wbg_set_traversalresult_node_count(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get max_depth() {
        const ret = wasm.__wbg_get_traversalresult_max_depth(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {number} arg0
     */
    set max_depth(arg0) {
        wasm.__wbg_set_traversalresult_max_depth(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {boolean}
     */
    get hit_depth_limit() {
        const ret = wasm.__wbg_get_traversalresult_hit_depth_limit(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {boolean} arg0
     */
    set hit_depth_limit(arg0) {
        wasm.__wbg_set_traversalresult_hit_depth_limit(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {bigint}
     */
    get traversal_time() {
        const ret = wasm.__wbg_get_flattraversalresult_traversal_time(this.__wbg_ptr);
        return BigInt.asUintN(64, ret);
    }
    /**
     * @param {bigint} arg0
     */
    set traversal_time(arg0) {
        wasm.__wbg_set_flattraversalresult_traversal_time(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {string}
     */
    toString() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.traversalresult_toString(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {TraversalData[]} data
     * @param {bigint} traversal_time
     */
    constructor(data, traversal_time) {
        const ptr0 = passArrayJsValueToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.traversalresult_new(ptr0, len0, traversal_time);
        this.__wbg_ptr = ret >>> 0;
        TraversalResultFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {boolean}
     */
    is_empty() {
        const ret = wasm.flattraversalresult_is_empty(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {PathList}
     */
    to_paths() {
        const ret = wasm.traversalresult_to_paths(this.__wbg_ptr);
        return PathList.__wrap(ret);
    }
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);

            } catch (e) {
                if (module.headers.get('Content-Type') != 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
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
}

function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg_call_672a4d21634d4a24 = function() { return handleError(function (arg0, arg1) {
        const ret = arg0.call(arg1);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_call_7cccdd69e0791ae2 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = arg0.call(arg1, arg2);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_debug_0e292a0dbaeda7f1 = function(arg0, arg1, arg2) {
        arg0.debug(getStringFromWasm0(arg1, arg2));
    };
    imports.wbg.__wbg_edgedata_new = function(arg0) {
        const ret = EdgeData.__wrap(arg0);
        return ret;
    };
    imports.wbg.__wbg_edgestruct_new = function(arg0) {
        const ret = EdgeStruct.__wrap(arg0);
        return ret;
    };
    imports.wbg.__wbg_edgestruct_unwrap = function(arg0) {
        const ret = EdgeStruct.__unwrap(arg0);
        return ret;
    };
    imports.wbg.__wbg_error_7534b8e9a36f1ab4 = function(arg0, arg1) {
        let deferred0_0;
        let deferred0_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            console.error(getStringFromWasm0(arg0, arg1));
        } finally {
            wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
        }
    };
    imports.wbg.__wbg_flattraversaldata_new = function(arg0) {
        const ret = FlatTraversalData.__wrap(arg0);
        return ret;
    };
    imports.wbg.__wbg_flattraversaldata_unwrap = function(arg0) {
        const ret = FlatTraversalData.__unwrap(arg0);
        return ret;
    };
    imports.wbg.__wbg_gcedgedata_unwrap = function(arg0) {
        const ret = GCEdgeData.__unwrap(arg0);
        return ret;
    };
    imports.wbg.__wbg_gcnodedata_unwrap = function(arg0) {
        const ret = GCNodeData.__unwrap(arg0);
        return ret;
    };
    imports.wbg.__wbg_info_398bf5d211409814 = function(arg0, arg1, arg2) {
        arg0.info(getStringFromWasm0(arg1, arg2));
    };
    imports.wbg.__wbg_new_405e22f390576ce2 = function() {
        const ret = new Object();
        return ret;
    };
    imports.wbg.__wbg_new_8a6f238a6ece86ea = function() {
        const ret = new Error();
        return ret;
    };
    imports.wbg.__wbg_newnoargs_105ed471475aaf50 = function(arg0, arg1) {
        const ret = new Function(getStringFromWasm0(arg0, arg1));
        return ret;
    };
    imports.wbg.__wbg_nodedata_new = function(arg0) {
        const ret = NodeData.__wrap(arg0);
        return ret;
    };
    imports.wbg.__wbg_notegrapherror_new = function(arg0) {
        const ret = NoteGraphError.__wrap(arg0);
        return ret;
    };
    imports.wbg.__wbg_now_2c95c9de01293173 = function(arg0) {
        const ret = arg0.now();
        return ret;
    };
    imports.wbg.__wbg_path_new = function(arg0) {
        const ret = Path.__wrap(arg0);
        return ret;
    };
    imports.wbg.__wbg_performance_7a3ffd0b17f663ad = function(arg0) {
        const ret = arg0.performance;
        return ret;
    };
    imports.wbg.__wbg_set_bb8cecf6a62b9f46 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = Reflect.set(arg0, arg1, arg2);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_stack_0ed75d68575b0f3c = function(arg0, arg1) {
        const ret = arg1.stack;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg_static_accessor_GLOBAL_88a902d13a557d07 = function() {
        const ret = typeof global === 'undefined' ? null : global;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    };
    imports.wbg.__wbg_static_accessor_GLOBAL_THIS_56578be7e9f832b0 = function() {
        const ret = typeof globalThis === 'undefined' ? null : globalThis;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    };
    imports.wbg.__wbg_static_accessor_LOGGER_849a70838e9094f0 = function() {
        const ret = log;
        return ret;
    };
    imports.wbg.__wbg_static_accessor_SELF_37c5d418e4bf5819 = function() {
        const ret = typeof self === 'undefined' ? null : self;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    };
    imports.wbg.__wbg_static_accessor_WINDOW_5de37043a91a9c40 = function() {
        const ret = typeof window === 'undefined' ? null : window;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    };
    imports.wbg.__wbg_transitivegraphrule_unwrap = function(arg0) {
        const ret = TransitiveGraphRule.__unwrap(arg0);
        return ret;
    };
    imports.wbg.__wbg_traversaldata_new = function(arg0) {
        const ret = TraversalData.__wrap(arg0);
        return ret;
    };
    imports.wbg.__wbg_traversaldata_unwrap = function(arg0) {
        const ret = TraversalData.__unwrap(arg0);
        return ret;
    };
    imports.wbg.__wbg_warn_4a2380c6903b0443 = function(arg0, arg1, arg2) {
        arg0.warn(getStringFromWasm0(arg1, arg2));
    };
    imports.wbg.__wbindgen_debug_string = function(arg0, arg1) {
        const ret = debugString(arg1);
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbindgen_init_externref_table = function() {
        const table = wasm.__wbindgen_export_2;
        const offset = table.grow(4);
        table.set(0, undefined);
        table.set(offset + 0, undefined);
        table.set(offset + 1, null);
        table.set(offset + 2, true);
        table.set(offset + 3, false);
        ;
    };
    imports.wbg.__wbindgen_is_undefined = function(arg0) {
        const ret = arg0 === undefined;
        return ret;
    };
    imports.wbg.__wbindgen_string_get = function(arg0, arg1) {
        const obj = arg1;
        const ret = typeof(obj) === 'string' ? obj : undefined;
        var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
        const ret = getStringFromWasm0(arg0, arg1);
        return ret;
    };
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };

    return imports;
}

function __wbg_init_memory(imports, memory) {

}

function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    __wbg_init.__wbindgen_wasm_module = module;
    cachedDataViewMemory0 = null;
    cachedUint32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;


    wasm.__wbindgen_start();
    return wasm;
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (typeof module !== 'undefined') {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();

    __wbg_init_memory(imports);

    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }

    const instance = new WebAssembly.Instance(module, imports);

    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (typeof module_or_path !== 'undefined') {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (typeof module_or_path === 'undefined') {
        module_or_path = new URL('breadcrumbs_graph_wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    __wbg_init_memory(imports);

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync };
export default __wbg_init;
