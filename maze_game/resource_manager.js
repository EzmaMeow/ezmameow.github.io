
import { LoadingManager, TextureLoader } from 'three';

//this class stores and links resources for the game
//as well as manage loading (and perhaps unloading) them
//generally this class should load first and then allow
export class Resource_Manager {
    //reosurce manager is ment to have a single instance, 
    //and this allow it to be acess anywhere
    static default_instance = new Resource_Manager();
    //static default_renderer = new THREE.WebGLRenderer(); //may be removed
    //will keep texture loader as a standard var so it could be overriden per instance
    static #KEYS = Object.freeze({ //CONST string base keys
        ALL: '*', //allow some functions to process all keys if this pass as an id
        TYPES: Object.freeze({ RENDERER: 'renderer', MATERIAL: 'material', GEOMETRY: 'geometry', TEXTURE: 'texture' }) //type identification for loaders
    }); //NOTE: values can be changes, but the container type is locked
    static get KEYS() { return this.#KEYS; }

    //#signals = new Map();//reserver for callbacks in responce to changes that may take time(should be an object of maps if so)

    #renderers = new Map(); //there may be more that one renderer, so this is here to handle them
    #materials = new Map();
    #geometries = new Map();
    #textures = new Map();

    //loading manager may be importaint so overriding ther ref may not be ideal. also loaders would need
    //to ref it so setting it would need to reassign all the ref
    #loading_manager = new LoadingManager();
    get loading_manager() { return this.#loading_manager; }
    texture_loader = new TextureLoader(this.loading_manager);

    //may use this instead of allowing a source to reduce function declartions
    #get_type_source(type) {
        if (Resource_Manager.KEYS.TYPES.RENDERER) { return this.#renderers }
        if (Resource_Manager.KEYS.TYPES.MATERIAL) { return this.#materials }
        if (Resource_Manager.KEYS.TYPES.GEOMETRY) { return this.#geometries }
        if (Resource_Manager.KEYS.TYPES.TEXTURE) { return this.#textures }
        return null;
    }

    //set will have a flag to allow replacing the ref as well as to dispose the replaces ref
    dispose(id, type) {
        const source = this.#get_type_source(type);
        if (source) {
            const value = source.get(id);
            if (id === Resource_Manager.ALL_KEY) {
                for (const [loop_key, loop_value] of source) {
                    if (loop_value) {
                        if (type === Resource_Manager.KEYS.TYPES.RENDERER) {
                            renderer.renderLists.dispose();
                        }
                        loop_value.dispose();
                        source.delete(id);
                    }
                }
                return
            }
            if (value) {
                if (type === Resource_Manager.KEYS.TYPES.RENDERER) {
                    renderer.renderLists.dispose();
                }
                value.dispose();
                source.delete(id);
            }
        }
    }
    set_resource(id, resource, type, override = true, dispose = true) {
        const source = this.#get_type_source(type);
        if (resource && source && id !== Resource_Manager.KEYS.ALL) {
            if (source.has(id)) {
                if (override) {
                    if (dispose) {
                        this.dispose(id, source)
                    }
                    source.set(id, resource);
                }
                return
            }
            source.set(id, resource);
        }
    }
    set_renderer(id, renderer, override = true, dispose = true) {
        this.set_resource(id, renderer, Resource_Manager.KEYS.TYPES.RENDERER, override, dispose);
    }
    set_material(id, material, override = true, dispose = true) {
        this.set_resource(id, material, Resource_Manager.KEYS.TYPES.MATERIAL, override, dispose);
    }
    set_geometry(id, geometry, override = true, dispose = true) {
        this.set_resource(id, geometry, Resource_Manager.KEYS.TYPES.GEOMETRY, override, dispose);
    }
    set_texture(id, texture, override = true, dispose = true) {
        this.set_resource(id, texture, Resource_Manager.KEYS.TYPES.TEXTURE, override, dispose);
    }

    get_resource(id, type, fallback = null, cache = true) {
        const source = this.#get_type_source(type);
        if (source) {
            if (source.has(id)) {
                return source.get(id);
            }
            if (cache && fallback) {
                source.set(id, fallback);
            }
        }
        return fallback;
    }
    get_renderer(id, fallback = null, cache = true) {
        return this.get_resource(id, Resource_Manager.KEYS.TYPES.RENDERER, fallback, cache);
    }
    get_material(id, fallback = null, cache = true) {
        return this.get_resource(id, Resource_Manager.KEYS.TYPES.MATERIAL, fallback, cache);
    }
    get_geometry(id, fallback = null, cache = true) {
        return this.get_resource(id, Resource_Manager.KEYS.TYPES.GEOMETRY, fallback, cache);
    }
    get_texture(id, fallback = null, cache = true) {
        return this.get_resource(id, Resource_Manager.KEYS.TYPES.TEXTURE, fallback, cache);
    }

    has_resource(id, type) {
        const source = this.#get_type_source(type);
        if (source) {
            return source.has(id);
        }
        return false
    }

    dispose_renderers(id = '*') {
        this.dispose(id, Resource_Manager.KEYS.TYPES.RENDERER);
    }
    dispose_materials(id = '*') {
        this.dispose(id, Resource_Manager.KEYS.TYPES.MATERIAL);
    }
    dispose_geometries(id = '*') {
        this.dispose(id, Resource_Manager.KEYS.TYPES.GEOMETRY);
    }
    dispose_textures(id = '*') {
        this.dispose(id, Resource_Manager.KEYS.TYPES.TEXTURE);
    }
    //some disposables are static ref. They need to have their flags set true
    //and only provided if they are not needed or need to be rebuilt
    dispose_all(include_renderers = false) {

        this.dispose_geometries();
        this.dispose_materials();
        this.dispose_textures();
        //may change from a bool to an array of ids
        if (include_renderers) {
            this.dispose_renderers();
        }
    }
    //decided to try to wrap it in a promise so it could be awaited, but kept the signals so await is not nessary
    async load_resource(file, id, type, on_ready = null, source = null, loader = null) {
        if (type == Resource_Manager.KEYS.TYPES.TEXTURE) {
            source = this.#textures;
            loader = this.texture_loader;
        }
        if (source && loader) {
            return new Promise((resolve, reject) => {
                loader.load(file, (result) => {
                    this.set_resource(id, result, source);
                    if (on_ready) {
                        on_ready(result);
                    }
                    resolve = result;
                },undefined, reject);
            });
        }

    }
    //This should only be called when the session ends or this needs
    //to be removed. may need to make it a function
    destroy(event = null, self = this) {
        self.dispose_all(true);
        document.removeEventListener("beforeunload", self.on_destroy);
        document.removeEventListener("unload", self.on_destroy);
        document.removeEventListener("pagehide", self.on_destroy);
        if (Resource_Manager.default_instance === self) {
            Resource_Manager.default_instance = null
        }
    }

    constructor() {
        window.addEventListener("beforeunload", this.on_destroy);
        window.addEventListener("unload", this.on_destroy);
        window.addEventListener("pagehide", this.on_destroy);
    }
}
