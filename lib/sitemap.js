export class Sitemap {
    static #map = {};
    static get map() { return structuredClone(this.#map);}
    static path = './sitemap.json'
    static getDir(path) {
        const pathSegments = path.split("/").filter(Boolean);
        if (Array.isArray(pathSegments) && pathSegments.length > 0) {
            let target = this.#map;
            for (let i = 0, len = pathSegments.length; i < len; i++) {
                const pathSegment = pathSegments[i];
                if (target[0] !== null && typeof target[0] === "object") {
                    if (target[0][pathSegment]) {
                        target = target[0][pathSegment]
                    }
                    else {
                        console.log('path dose not match map', ' ', path, ' ', this.map);
                        return null
                    }
                }
                else {
                    console.log('no dir in path', ' ', path, ' ', pathSegment);
                    return null
                }
            }
            return structuredClone(target);
        }
        return null
    }
    static hasFile(path = '', file) {
        let dir = this.#map;
        if (path) {
            dir = this.getDir(path)
            if (!dir) { return false }
        }
        return dir.includes(file)
    }
    static async load(path = this.path) {
        //TODO: handle non-json cases
        if (path.endsWith('.json')) {
            this.#map = await (await fetch(path)).json();
        }

    }
}