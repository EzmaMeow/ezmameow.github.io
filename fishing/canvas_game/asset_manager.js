//this is for resusinga assets and it should also provide ways to free the assets
//so each assets may need a metadata instead of the assets. their id should be their path or an uid
//this data could be useful for spritesheets to set some defaults or images loaded in as animations (similar to spritesheet, but more focus on animation)
//NOTE: this may not have ref checking, if an asset needs to be free, it should flag it as such in the data and objects that use it should check i
export function Video(options = {}) {
    const element = document.createElement('video');

    element.controls = options.controls ?? true;
    element.autoplay = options.autoplay ?? false;
    element.width = options.width ?? 640;
    element.height = options.height ?? 360;

    if (options.src) {
        const source = document.createElement('source');
        source.src = options.src;
        source.type = options.type ?? 'video/mp4';
        element.appendChild(source);
    }
    return element;
}
//These are defaults. may need to modify some of these values or extend it base on use case
export const defaultExtensionClassMap = new Map(Object.entries({
    jpg: Image,
    jpeg: Image,
    png: Image,
    pnj: Image,
    gif: Image,
    webp: Image,
    bmp: Image,
    svg: Image,
    mp3: Audio,
    wav: Audio,
    flac: Audio,
    aac: Audio,
    m4a: Audio,
    ogg: MediaSource,
    mp4: MediaSource,
    webm: MediaSource,
    ogv: Video,
    mov: Video,
    mkv: Video
}));

export class AssetManager {
    #assets = new Map()
    //will add properties to the asset listed in extensionClassMap and monkey patch functions as needed
    //the event and flags are stored in it to reduce the need to add check to make sure such ref are cleared on disposal
    async createAsset(src, extensionClassMap = this.extensionClassMap || defaultExtensionClassMap) {
        if (!src) { return }
        let extension = ((/(?:\.([^.]+))?$/).exec(src)[1] || '').toLowerCase();
        let metadata;
        if (extension === 'json') {
            metadata = await fetch(src)
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                    return response.json();
                })
                .catch(error => {
                    console.error('Failed to fetch JSON:', error);
                });
            if (metadata && metadata.src) {
                extension = ((/(?:\.([^.]+))?$/).exec(metadata.src)[1] || '').toLowerCase();
            }
        }
        if (!extensionClassMap.has(extension) && !metadata) {
            console.warn(`${extension} lack an asset type and unable to load`)
        }
        const constClass = extensionClassMap.get(extension)
        const asset = constClass ? new constClass() : metadata;
        if (!asset) {
            console.error(`Failed to create new asset : ${src}`)
        }
        //metadata will contain namespace objects so various properties types can be added like textureAlas and animationData
        if (metadata) {
            for (const [key, value] of Object.entries(metadata)) {
                if (asset[key] && key !== 'src') {
                    console.warn(`Asset ${src} has a property ${key}. Ignoring it. Rename it if it is needed.`)
                    continue
                }
                asset[key] = value;
            }
        }
        else {
            asset.src = src
        }
        //this forces the asset to load else it may not be able to render
        if (asset.decode) {
            await asset.decode();
        }

        //NOTE: using array for the EventListener to mimic how it works due to numbers of listerners should be low
        if (!asset.eventListeners) {
            asset.eventListeners = {
                dispose: []
            }
        }
        const oldDispose = asset.dispose
        asset.dispose = function (...args) {
            this.disposed = true;
            for (const fn of this.eventListeners.dispose) {
                try { fn(...args); } catch (err) { console.error(err); }
            }
            this.eventListeners.dispose.length = 0;
            if (typeof oldDispose === "function") {
                oldDispose(...args);
            }
            this.src = '';
        }
        const oldAddEventListener = asset.addEventListener;
        asset.addEventListener = function (type, listener, options) {
            if (type === "dispose") {
                this.eventListeners.dispose.push(listener);
                return
            }
            if (oldAddEventListener) {
                console.log(["running add event for ", asset, type, listener, options])
                return oldAddEventListener(type, listener, options)
            }
        }
        const oldRemoveEventListener = asset.removeEventListener;
        asset.removeEventListener = function (type, listener, options) {
            if (type === "dispose") {
                this.eventListeners.dispose = this.eventListeners.dispose.filter(fn => fn !== listener);
                return
            }
            if (oldRemoveEventListener) {
                return oldRemoveEventListener(type, listener, options)
            }
        }
        return asset
    }

    //decided if this and createAsset should have a remap function so the asset class map can be ignore for certain cases like treating a rare mp5 as a audio
    async load(path, uid = undefined, cache = true) {
        const id = uid || path;
        if (this.#assets.has(id)) {
            return this.#assets.get(id)
        }
        const asset = await this.createAsset(path)
        //disabling cache for allowing the createAsset logic with load as well as load an existing asset without creating a new one
        if (cache) {
            this.#assets.set(id, asset)
            //need to unload asset if something else dispose of it. allow this to run without being known
            asset.addEventListener("dispose", () => { this.unload(id) })
        }
        return asset;
    }
    unload(id) {
        if (!this.#assets.has(id)) {
            return
        }
        const asset = this.#assets.get(id)
        if (!asset.disposed) {
            asset.dispose()
        }
        this.#assets.delete(id)
        console.log(asset)
    }
}

export default new AssetManager();