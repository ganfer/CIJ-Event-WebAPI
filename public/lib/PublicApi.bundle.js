var d365events;
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The require scope
/******/ 	var __webpack_require__ = {};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  External: () => (/* binding */ External)
});

// UNUSED EXPORTS: init, publicApiCreateCheckInAndRedirect, publicApiFinalizeRegistration, publicApiGetCaptcha, publicApiGetCustomRegistrationFields, publicApiGetEvent, publicApiGetEventPasses, publicApiGetEventQrCode, publicApiGetEventSessions, publicApiGetEventSpeakers, publicApiGetEventSponsorships, publicApiGetEventTracks, publicApiGetEvents, publicApiGetRegistrationsCount, publicApiGetSessionById, publicApiGetSessionRegistrationCount, publicApiGetSpeakerImage, publicApiGetSponsorshipsLogo, publicApiGetUser, publicApiRegister

// NAMESPACE OBJECT: ./generated/sdk.gen.ts
var sdk_gen_namespaceObject = {};
__webpack_require__.r(sdk_gen_namespaceObject);
__webpack_require__.d(sdk_gen_namespaceObject, {
  publicApiCreateCheckInAndRedirect: () => (publicApiCreateCheckInAndRedirect),
  publicApiFinalizeRegistration: () => (publicApiFinalizeRegistration),
  publicApiGetCaptcha: () => (publicApiGetCaptcha),
  publicApiGetCustomRegistrationFields: () => (publicApiGetCustomRegistrationFields),
  publicApiGetEvent: () => (publicApiGetEvent),
  publicApiGetEventPasses: () => (publicApiGetEventPasses),
  publicApiGetEventQrCode: () => (publicApiGetEventQrCode),
  publicApiGetEventSessions: () => (publicApiGetEventSessions),
  publicApiGetEventSpeakers: () => (publicApiGetEventSpeakers),
  publicApiGetEventSponsorships: () => (publicApiGetEventSponsorships),
  publicApiGetEventTracks: () => (publicApiGetEventTracks),
  publicApiGetEvents: () => (publicApiGetEvents),
  publicApiGetRegistrationsCount: () => (publicApiGetRegistrationsCount),
  publicApiGetSessionById: () => (publicApiGetSessionById),
  publicApiGetSessionRegistrationCount: () => (publicApiGetSessionRegistrationCount),
  publicApiGetSpeakerImage: () => (publicApiGetSpeakerImage),
  publicApiGetSponsorshipsLogo: () => (publicApiGetSponsorshipsLogo),
  publicApiGetUser: () => (publicApiGetUser),
  publicApiRegister: () => (publicApiRegister)
});

;// ./generated/core/bodySerializer.ts
const serializeFormDataPair = (data, key, value) => {
    if (typeof value === 'string' || value instanceof Blob) {
        data.append(key, value);
    }
    else {
        data.append(key, JSON.stringify(value));
    }
};
const serializeUrlSearchParamsPair = (data, key, value) => {
    if (typeof value === 'string') {
        data.append(key, value);
    }
    else {
        data.append(key, JSON.stringify(value));
    }
};
const formDataBodySerializer = {
    bodySerializer: (body) => {
        const data = new FormData();
        Object.entries(body).forEach(([key, value]) => {
            if (value === undefined || value === null) {
                return;
            }
            if (Array.isArray(value)) {
                value.forEach((v) => serializeFormDataPair(data, key, v));
            }
            else {
                serializeFormDataPair(data, key, value);
            }
        });
        return data;
    },
};
const jsonBodySerializer = {
    bodySerializer: (body) => JSON.stringify(body, (_key, value) => typeof value === 'bigint' ? value.toString() : value),
};
const urlSearchParamsBodySerializer = {
    bodySerializer: (body) => {
        const data = new URLSearchParams();
        Object.entries(body).forEach(([key, value]) => {
            if (value === undefined || value === null) {
                return;
            }
            if (Array.isArray(value)) {
                value.forEach((v) => serializeUrlSearchParamsPair(data, key, v));
            }
            else {
                serializeUrlSearchParamsPair(data, key, value);
            }
        });
        return data.toString();
    },
};

;// ./generated/core/params.ts
const extraPrefixesMap = {
    $body_: 'body',
    $headers_: 'headers',
    $path_: 'path',
    $query_: 'query',
};
const extraPrefixes = Object.entries(extraPrefixesMap);
const buildKeyMap = (fields, map) => {
    if (!map) {
        map = new Map();
    }
    for (const config of fields) {
        if ('in' in config) {
            if (config.key) {
                map.set(config.key, {
                    in: config.in,
                    map: config.map,
                });
            }
        }
        else if (config.args) {
            buildKeyMap(config.args, map);
        }
    }
    return map;
};
const stripEmptySlots = (params) => {
    for (const [slot, value] of Object.entries(params)) {
        if (value && typeof value === 'object' && !Object.keys(value).length) {
            delete params[slot];
        }
    }
};
const buildClientParams = (args, fields) => {
    var _a;
    const params = {
        body: {},
        headers: {},
        path: {},
        query: {},
    };
    const map = buildKeyMap(fields);
    let config;
    for (const [index, arg] of args.entries()) {
        if (fields[index]) {
            config = fields[index];
        }
        if (!config) {
            continue;
        }
        if ('in' in config) {
            if (config.key) {
                const field = map.get(config.key);
                const name = field.map || config.key;
                params[field.in][name] = arg;
            }
            else {
                params.body = arg;
            }
        }
        else {
            for (const [key, value] of Object.entries(arg !== null && arg !== void 0 ? arg : {})) {
                const field = map.get(key);
                if (field) {
                    const name = field.map || key;
                    params[field.in][name] = value;
                }
                else {
                    const extra = extraPrefixes.find(([prefix]) => key.startsWith(prefix));
                    if (extra) {
                        const [prefix, slot] = extra;
                        params[slot][key.slice(prefix.length)] = value;
                    }
                    else {
                        for (const [slot, allowed] of Object.entries((_a = config.allowExtra) !== null && _a !== void 0 ? _a : {})) {
                            if (allowed) {
                                params[slot][key] = value;
                                break;
                            }
                        }
                    }
                }
            }
        }
    }
    stripEmptySlots(params);
    return params;
};

;// ./generated/core/auth.ts
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const getAuthToken = (auth, callback) => __awaiter(void 0, void 0, void 0, function* () {
    const token = typeof callback === 'function' ? yield callback(auth) : callback;
    if (!token) {
        return;
    }
    if (auth.scheme === 'bearer') {
        return `Bearer ${token}`;
    }
    if (auth.scheme === 'basic') {
        return `Basic ${btoa(token)}`;
    }
    return token;
});

;// ./generated/core/pathSerializer.ts
const separatorArrayExplode = (style) => {
    switch (style) {
        case 'label':
            return '.';
        case 'matrix':
            return ';';
        case 'simple':
            return ',';
        default:
            return '&';
    }
};
const separatorArrayNoExplode = (style) => {
    switch (style) {
        case 'form':
            return ',';
        case 'pipeDelimited':
            return '|';
        case 'spaceDelimited':
            return '%20';
        default:
            return ',';
    }
};
const separatorObjectExplode = (style) => {
    switch (style) {
        case 'label':
            return '.';
        case 'matrix':
            return ';';
        case 'simple':
            return ',';
        default:
            return '&';
    }
};
const serializeArrayParam = ({ allowReserved, explode, name, style, value, }) => {
    if (!explode) {
        const joinedValues = (allowReserved ? value : value.map((v) => encodeURIComponent(v))).join(separatorArrayNoExplode(style));
        switch (style) {
            case 'label':
                return `.${joinedValues}`;
            case 'matrix':
                return `;${name}=${joinedValues}`;
            case 'simple':
                return joinedValues;
            default:
                return `${name}=${joinedValues}`;
        }
    }
    const separator = separatorArrayExplode(style);
    const joinedValues = value
        .map((v) => {
        if (style === 'label' || style === 'simple') {
            return allowReserved ? v : encodeURIComponent(v);
        }
        return serializePrimitiveParam({
            allowReserved,
            name,
            value: v,
        });
    })
        .join(separator);
    return style === 'label' || style === 'matrix'
        ? separator + joinedValues
        : joinedValues;
};
const serializePrimitiveParam = ({ allowReserved, name, value, }) => {
    if (value === undefined || value === null) {
        return '';
    }
    if (typeof value === 'object') {
        throw new Error('Deeply-nested arrays/objects aren’t supported. Provide your own `querySerializer()` to handle these.');
    }
    return `${name}=${allowReserved ? value : encodeURIComponent(value)}`;
};
const serializeObjectParam = ({ allowReserved, explode, name, style, value, valueOnly, }) => {
    if (value instanceof Date) {
        return valueOnly ? value.toISOString() : `${name}=${value.toISOString()}`;
    }
    if (style !== 'deepObject' && !explode) {
        let values = [];
        Object.entries(value).forEach(([key, v]) => {
            values = [
                ...values,
                key,
                allowReserved ? v : encodeURIComponent(v),
            ];
        });
        const joinedValues = values.join(',');
        switch (style) {
            case 'form':
                return `${name}=${joinedValues}`;
            case 'label':
                return `.${joinedValues}`;
            case 'matrix':
                return `;${name}=${joinedValues}`;
            default:
                return joinedValues;
        }
    }
    const separator = separatorObjectExplode(style);
    const joinedValues = Object.entries(value)
        .map(([key, v]) => serializePrimitiveParam({
        allowReserved,
        name: style === 'deepObject' ? `${name}[${key}]` : key,
        value: v,
    }))
        .join(separator);
    return style === 'label' || style === 'matrix'
        ? separator + joinedValues
        : joinedValues;
};

;// ./generated/client/utils.ts
var utils_awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (undefined && undefined.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};



const PATH_PARAM_RE = /\{[^{}]+\}/g;
const defaultPathSerializer = ({ path, url: _url }) => {
    let url = _url;
    const matches = _url.match(PATH_PARAM_RE);
    if (matches) {
        for (const match of matches) {
            let explode = false;
            let name = match.substring(1, match.length - 1);
            let style = 'simple';
            if (name.endsWith('*')) {
                explode = true;
                name = name.substring(0, name.length - 1);
            }
            if (name.startsWith('.')) {
                name = name.substring(1);
                style = 'label';
            }
            else if (name.startsWith(';')) {
                name = name.substring(1);
                style = 'matrix';
            }
            const value = path[name];
            if (value === undefined || value === null) {
                continue;
            }
            if (Array.isArray(value)) {
                url = url.replace(match, serializeArrayParam({ explode, name, style, value }));
                continue;
            }
            if (typeof value === 'object') {
                url = url.replace(match, serializeObjectParam({
                    explode,
                    name,
                    style,
                    value: value,
                    valueOnly: true,
                }));
                continue;
            }
            if (style === 'matrix') {
                url = url.replace(match, `;${serializePrimitiveParam({
                    name,
                    value: value,
                })}`);
                continue;
            }
            const replaceValue = encodeURIComponent(style === 'label' ? `.${value}` : value);
            url = url.replace(match, replaceValue);
        }
    }
    return url;
};
const createQuerySerializer = ({ allowReserved, array, object, } = {}) => {
    const querySerializer = (queryParams) => {
        const search = [];
        if (queryParams && typeof queryParams === 'object') {
            for (const name in queryParams) {
                const value = queryParams[name];
                if (value === undefined || value === null) {
                    continue;
                }
                if (Array.isArray(value)) {
                    const serializedArray = serializeArrayParam(Object.assign({ allowReserved, explode: true, name, style: 'form', value }, array));
                    if (serializedArray)
                        search.push(serializedArray);
                }
                else if (typeof value === 'object') {
                    const serializedObject = serializeObjectParam(Object.assign({ allowReserved, explode: true, name, style: 'deepObject', value: value }, object));
                    if (serializedObject)
                        search.push(serializedObject);
                }
                else {
                    const serializedPrimitive = serializePrimitiveParam({
                        allowReserved,
                        name,
                        value: value,
                    });
                    if (serializedPrimitive)
                        search.push(serializedPrimitive);
                }
            }
        }
        return search.join('&');
    };
    return querySerializer;
};
/**
 * Infers parseAs value from provided Content-Type header.
 */
const getParseAs = (contentType) => {
    var _a;
    if (!contentType) {
        // If no Content-Type header is provided, the best we can do is return the raw response body,
        // which is effectively the same as the 'stream' option.
        return 'stream';
    }
    const cleanContent = (_a = contentType.split(';')[0]) === null || _a === void 0 ? void 0 : _a.trim();
    if (!cleanContent) {
        return;
    }
    if (cleanContent.startsWith('application/json') ||
        cleanContent.endsWith('+json')) {
        return 'json';
    }
    if (cleanContent === 'multipart/form-data') {
        return 'formData';
    }
    if (['application/', 'audio/', 'image/', 'video/'].some((type) => cleanContent.startsWith(type))) {
        return 'blob';
    }
    if (cleanContent.startsWith('text/')) {
        return 'text';
    }
    return;
};
const setAuthParams = (_a) => utils_awaiter(void 0, void 0, void 0, function* () {
    var _b;
    var { security } = _a, options = __rest(_a, ["security"]);
    for (const auth of security) {
        const token = yield getAuthToken(auth, options.auth);
        if (!token) {
            continue;
        }
        const name = (_b = auth.name) !== null && _b !== void 0 ? _b : 'Authorization';
        switch (auth.in) {
            case 'query':
                if (!options.query) {
                    options.query = {};
                }
                options.query[name] = token;
                break;
            case 'cookie':
                options.headers.append('Cookie', `${name}=${token}`);
                break;
            case 'header':
            default:
                options.headers.set(name, token);
                break;
        }
        return;
    }
});
const buildUrl = (options) => {
    const url = getUrl({
        baseUrl: options.baseUrl,
        path: options.path,
        query: options.query,
        querySerializer: typeof options.querySerializer === 'function'
            ? options.querySerializer
            : createQuerySerializer(options.querySerializer),
        url: options.url,
    });
    return url;
};
const getUrl = ({ baseUrl, path, query, querySerializer, url: _url, }) => {
    const pathUrl = _url.startsWith('/') ? _url : `/${_url}`;
    let url = (baseUrl !== null && baseUrl !== void 0 ? baseUrl : '') + pathUrl;
    if (path) {
        url = defaultPathSerializer({ path, url });
    }
    let search = query ? querySerializer(query) : '';
    if (search.startsWith('?')) {
        search = search.substring(1);
    }
    if (search) {
        url += `?${search}`;
    }
    return url;
};
const mergeConfigs = (a, b) => {
    var _a;
    const config = Object.assign(Object.assign({}, a), b);
    if ((_a = config.baseUrl) === null || _a === void 0 ? void 0 : _a.endsWith('/')) {
        config.baseUrl = config.baseUrl.substring(0, config.baseUrl.length - 1);
    }
    config.headers = mergeHeaders(a.headers, b.headers);
    return config;
};
const mergeHeaders = (...headers) => {
    const mergedHeaders = new Headers();
    for (const header of headers) {
        if (!header || typeof header !== 'object') {
            continue;
        }
        const iterator = header instanceof Headers ? header.entries() : Object.entries(header);
        for (const [key, value] of iterator) {
            if (value === null) {
                mergedHeaders.delete(key);
            }
            else if (Array.isArray(value)) {
                for (const v of value) {
                    mergedHeaders.append(key, v);
                }
            }
            else if (value !== undefined) {
                // assume object headers are meant to be JSON stringified, i.e. their
                // content value in OpenAPI specification is 'application/json'
                mergedHeaders.set(key, typeof value === 'object' ? JSON.stringify(value) : value);
            }
        }
    }
    return mergedHeaders;
};
class Interceptors {
    constructor() {
        this._fns = [];
    }
    clear() {
        this._fns = [];
    }
    getInterceptorIndex(id) {
        if (typeof id === 'number') {
            return this._fns[id] ? id : -1;
        }
        else {
            return this._fns.indexOf(id);
        }
    }
    exists(id) {
        const index = this.getInterceptorIndex(id);
        return !!this._fns[index];
    }
    eject(id) {
        const index = this.getInterceptorIndex(id);
        if (this._fns[index]) {
            this._fns[index] = null;
        }
    }
    update(id, fn) {
        const index = this.getInterceptorIndex(id);
        if (this._fns[index]) {
            this._fns[index] = fn;
            return id;
        }
        else {
            return false;
        }
    }
    use(fn) {
        this._fns = [...this._fns, fn];
        return this._fns.length - 1;
    }
}
// do not add `Middleware` as return type so we can use _fns internally
const createInterceptors = () => ({
    error: new Interceptors(),
    request: new Interceptors(),
    response: new Interceptors(),
});
const defaultQuerySerializer = createQuerySerializer({
    allowReserved: false,
    array: {
        explode: true,
        style: 'form',
    },
    object: {
        explode: true,
        style: 'deepObject',
    },
});
const defaultHeaders = {
    'Content-Type': 'application/json',
};
const createConfig = (override = {}) => (Object.assign(Object.assign(Object.assign({}, jsonBodySerializer), { headers: defaultHeaders, parseAs: 'auto', querySerializer: defaultQuerySerializer }), override));

;// ./generated/client/client.ts
var client_awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

const createClient = (config = {}) => {
    let _config = mergeConfigs(createConfig(), config);
    const getConfig = () => (Object.assign({}, _config));
    const setConfig = (config) => {
        _config = mergeConfigs(_config, config);
        return getConfig();
    };
    const interceptors = createInterceptors();
    const request = (options) => client_awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c;
        const opts = Object.assign(Object.assign(Object.assign({}, _config), options), { fetch: (_b = (_a = options.fetch) !== null && _a !== void 0 ? _a : _config.fetch) !== null && _b !== void 0 ? _b : globalThis.fetch, headers: mergeHeaders(_config.headers, options.headers) });
        if (opts.security) {
            yield setAuthParams(Object.assign(Object.assign({}, opts), { security: opts.security }));
        }
        if (opts.requestValidator) {
            yield opts.requestValidator(opts);
        }
        if (opts.body && opts.bodySerializer) {
            opts.body = opts.bodySerializer(opts.body);
        }
        // remove Content-Type header if body is empty to avoid sending invalid requests
        if (opts.body === undefined || opts.body === '') {
            opts.headers.delete('Content-Type');
        }
        const url = buildUrl(opts);
        const requestInit = Object.assign({ redirect: 'follow' }, opts);
        let request = new Request(url, requestInit);
        for (const fn of interceptors.request._fns) {
            if (fn) {
                request = yield fn(request, opts);
            }
        }
        // fetch must be assigned here, otherwise it would throw the error:
        // TypeError: Failed to execute 'fetch' on 'Window': Illegal invocation
        const _fetch = opts.fetch;
        let response = yield _fetch(request);
        for (const fn of interceptors.response._fns) {
            if (fn) {
                response = yield fn(response, request, opts);
            }
        }
        const result = {
            request,
            response,
        };
        if (response.ok) {
            if (response.status === 204 ||
                response.headers.get('Content-Length') === '0') {
                return opts.responseStyle === 'data'
                    ? {}
                    : Object.assign({ data: {} }, result);
            }
            const parseAs = (_c = (opts.parseAs === 'auto'
                ? getParseAs(response.headers.get('Content-Type'))
                : opts.parseAs)) !== null && _c !== void 0 ? _c : 'json';
            let data;
            switch (parseAs) {
                case 'arrayBuffer':
                case 'blob':
                case 'formData':
                case 'json':
                case 'text':
                    data = yield response[parseAs]();
                    break;
                case 'stream':
                    return opts.responseStyle === 'data'
                        ? response.body
                        : Object.assign({ data: response.body }, result);
            }
            if (parseAs === 'json') {
                if (opts.responseValidator) {
                    yield opts.responseValidator(data);
                }
                if (opts.responseTransformer) {
                    data = yield opts.responseTransformer(data);
                }
            }
            return opts.responseStyle === 'data'
                ? data
                : Object.assign({ data }, result);
        }
        let error = yield response.text();
        try {
            error = JSON.parse(error);
        }
        catch (_d) {
            // noop
        }
        let finalError = error;
        for (const fn of interceptors.error._fns) {
            if (fn) {
                finalError = (yield fn(error, response, request, opts));
            }
        }
        finalError = finalError || {};
        if (opts.throwOnError) {
            throw finalError;
        }
        // TODO: we probably want to return error and improve types
        return opts.responseStyle === 'data'
            ? undefined
            : Object.assign({ error: finalError }, result);
    });
    return {
        buildUrl: buildUrl,
        connect: (options) => request(Object.assign(Object.assign({}, options), { method: 'CONNECT' })),
        delete: (options) => request(Object.assign(Object.assign({}, options), { method: 'DELETE' })),
        get: (options) => request(Object.assign(Object.assign({}, options), { method: 'GET' })),
        getConfig,
        head: (options) => request(Object.assign(Object.assign({}, options), { method: 'HEAD' })),
        interceptors,
        options: (options) => request(Object.assign(Object.assign({}, options), { method: 'OPTIONS' })),
        patch: (options) => request(Object.assign(Object.assign({}, options), { method: 'PATCH' })),
        post: (options) => request(Object.assign(Object.assign({}, options), { method: 'POST' })),
        put: (options) => request(Object.assign(Object.assign({}, options), { method: 'PUT' })),
        request,
        setConfig,
        trace: (options) => request(Object.assign(Object.assign({}, options), { method: 'TRACE' })),
    };
};

;// ./generated/client/index.ts





;// ./generated/client.gen.ts
// This file is auto-generated by @hey-api/openapi-ts

const client = createClient(createConfig());

;// ./generated/sdk.gen.ts
// This file is auto-generated by @hey-api/openapi-ts

/**
 * Creates check-in based on payload and redirects to redirectUri parameter
 */
const publicApiCreateCheckInAndRedirect = (options) => {
    var _a;
    return ((_a = options.client) !== null && _a !== void 0 ? _a : client).post(Object.assign(Object.assign({ url: '/api/v1.0/orgs/{organizationId}/eventmanagement/checkins' }, options), { headers: Object.assign({ 'Content-Type': 'application/json' }, options.headers) }));
};
const publicApiGetEvents = (options) => {
    var _a;
    return ((_a = options.client) !== null && _a !== void 0 ? _a : client).get(Object.assign({ security: [
            {
                in: 'query',
                name: 'emApplicationtoken',
                type: 'apiKey'
            }
        ], url: '/api/v1.0/orgs/{organizationId}/eventmanagement/events/published' }, options));
};
const publicApiGetEvent = (options) => {
    var _a;
    return ((_a = options.client) !== null && _a !== void 0 ? _a : client).get(Object.assign({ security: [
            {
                in: 'query',
                name: 'emApplicationtoken',
                type: 'apiKey'
            }
        ], url: '/api/v1.0/orgs/{organizationId}/eventmanagement/events/{readableEventId}' }, options));
};
const publicApiGetCaptcha = (options) => {
    var _a;
    return ((_a = options.client) !== null && _a !== void 0 ? _a : client).get(Object.assign({ security: [
            {
                in: 'query',
                name: 'emApplicationtoken',
                type: 'apiKey'
            }
        ], url: '/api/v1.0/orgs/{organizationId}/eventmanagement/events/{readableEventId}/captcha' }, options));
};
const publicApiGetCustomRegistrationFields = (options) => {
    var _a;
    return ((_a = options.client) !== null && _a !== void 0 ? _a : client).get(Object.assign({ security: [
            {
                in: 'query',
                name: 'emApplicationtoken',
                type: 'apiKey'
            }
        ], url: '/api/v1.0/orgs/{organizationId}/eventmanagement/events/{readableEventId}/custom-registration-fields' }, options));
};
/**
 * The event url qr code of specified event
 */
const publicApiGetEventQrCode = (options) => {
    var _a;
    return ((_a = options.client) !== null && _a !== void 0 ? _a : client).get(Object.assign({ security: [
            {
                in: 'query',
                name: 'emApplicationtoken',
                type: 'apiKey'
            }
        ], url: '/api/v1.0/orgs/{organizationId}/eventmanagement/events/{readableEventId}/qrcode' }, options));
};
const publicApiGetEventSessions = (options) => {
    var _a;
    return ((_a = options.client) !== null && _a !== void 0 ? _a : client).get(Object.assign({ security: [
            {
                in: 'query',
                name: 'emApplicationtoken',
                type: 'apiKey'
            }
        ], url: '/api/v1.0/orgs/{organizationId}/eventmanagement/events/{readableEventId}/sessions' }, options));
};
const publicApiGetEventTracks = (options) => {
    var _a;
    return ((_a = options.client) !== null && _a !== void 0 ? _a : client).get(Object.assign({ security: [
            {
                in: 'query',
                name: 'emApplicationtoken',
                type: 'apiKey'
            }
        ], url: '/api/v1.0/orgs/{organizationId}/eventmanagement/events/{readableEventId}/tracks' }, options));
};
const publicApiGetEventPasses = (options) => {
    var _a;
    return ((_a = options.client) !== null && _a !== void 0 ? _a : client).get(Object.assign({ security: [
            {
                in: 'query',
                name: 'emApplicationtoken',
                type: 'apiKey'
            }
        ], url: '/api/v1.0/orgs/{organizationId}/eventmanagement/events/{readableEventId}/passes' }, options));
};
const publicApiRegister = (options) => {
    var _a;
    return ((_a = options.client) !== null && _a !== void 0 ? _a : client).post(Object.assign(Object.assign({ security: [
            {
                in: 'query',
                name: 'emApplicationtoken',
                type: 'apiKey'
            }
        ], url: '/api/v1.0/orgs/{organizationId}/eventmanagement/events/{readableEventId}/registrations' }, options), { headers: Object.assign({ 'Content-Type': 'application/json' }, options.headers) }));
};
const publicApiGetRegistrationsCount = (options) => {
    var _a;
    return ((_a = options.client) !== null && _a !== void 0 ? _a : client).get(Object.assign({ security: [
            {
                in: 'query',
                name: 'emApplicationtoken',
                type: 'apiKey'
            }
        ], url: '/api/v1.0/orgs/{organizationId}/eventmanagement/events/{readableEventId}/registrations/count' }, options));
};
const publicApiGetEventSpeakers = (options) => {
    var _a;
    return ((_a = options.client) !== null && _a !== void 0 ? _a : client).get(Object.assign({ security: [
            {
                in: 'query',
                name: 'emApplicationtoken',
                type: 'apiKey'
            }
        ], url: '/api/v1.0/orgs/{organizationId}/eventmanagement/events/{readableEventId}/speakers' }, options));
};
const publicApiGetEventSponsorships = (options) => {
    var _a;
    return ((_a = options.client) !== null && _a !== void 0 ? _a : client).get(Object.assign({ security: [
            {
                in: 'query',
                name: 'emApplicationtoken',
                type: 'apiKey'
            }
        ], url: '/api/v1.0/orgs/{organizationId}/eventmanagement/events/{readableEventId}/sponsorships' }, options));
};
/**
 * The logo of a specified sponsorship
 */
const publicApiGetSponsorshipsLogo = (options) => {
    var _a;
    return ((_a = options.client) !== null && _a !== void 0 ? _a : client).get(Object.assign({ security: [
            {
                in: 'query',
                name: 'emApplicationtoken',
                type: 'apiKey'
            }
        ], url: '/api/v1.0/orgs/{organizationId}/eventmanagement/sponsorships/{sponsorshipId}/logo' }, options));
};
const publicApiFinalizeRegistration = (options) => {
    var _a;
    return ((_a = options.client) !== null && _a !== void 0 ? _a : client).post(Object.assign(Object.assign({ security: [
            {
                in: 'query',
                name: 'emApplicationtoken',
                type: 'apiKey'
            }
        ], url: '/api/v1.0/orgs/{organizationId}/eventmanagement/events/{readableEventId}/registrations/finalize' }, options), { headers: Object.assign({ 'Content-Type': 'application/json' }, options.headers) }));
};
/**
 * The image of a specified speaker
 */
const publicApiGetSpeakerImage = (options) => {
    var _a;
    return ((_a = options.client) !== null && _a !== void 0 ? _a : client).get(Object.assign({ security: [
            {
                in: 'query',
                name: 'emApplicationtoken',
                type: 'apiKey'
            }
        ], url: '/api/v1.0/orgs/{organizationId}/eventmanagement/speakers/{speakerId}/image' }, options));
};
const publicApiGetSessionRegistrationCount = (options) => {
    var _a;
    return ((_a = options.client) !== null && _a !== void 0 ? _a : client).get(Object.assign({ security: [
            {
                in: 'query',
                name: 'emApplicationtoken',
                type: 'apiKey'
            }
        ], url: '/api/v1.0/orgs/{organizationId}/eventmanagement/sessions/{sessionId}/registrations/count' }, options));
};
const publicApiGetSessionById = (options) => {
    var _a;
    return ((_a = options.client) !== null && _a !== void 0 ? _a : client).get(Object.assign({ security: [
            {
                in: 'query',
                name: 'emApplicationtoken',
                type: 'apiKey'
            }
        ], url: '/api/v1.0/orgs/{organizationId}/eventmanagement/sessions/{sessionId}' }, options));
};
const publicApiGetUser = (options) => {
    var _a;
    return ((_a = options.client) !== null && _a !== void 0 ? _a : client).get(Object.assign({ security: [
            {
                in: 'query',
                name: 'emApplicationtoken',
                type: 'apiKey'
            }
        ], url: '/api/v1.0/orgs/{organizationId}/eventmanagement/users/authenticated' }, options));
};

;// ./index.ts
var index_awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};


const init = (baseUrl, token, orgId) => {
    client.setConfig({
        baseUrl: baseUrl,
        auth: token,
        requestValidator: (options) => index_awaiter(void 0, void 0, void 0, function* () {
            // Make sure the token and organization ID are set in the request
            if (!options.query) {
                options.query = {};
            }
            if (!options.path) {
                options.path = {};
            }
            options.query['emApplicationtoken'] = token;
            options.path['organizationId'] = orgId;
        })
    });
};


const External = {
    init,
    service: sdk_gen_namespaceObject
};

d365events = __webpack_exports__.External;
/******/ })()
;