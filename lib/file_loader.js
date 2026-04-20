//this is a helper for loading files for some of the site pages.
export class FileLoader {
    static #LOAD_TYPE = { NONE: 0, TEXT: 1, JSON: 2, BLOB: 3 }; static get LOAD_TYPE() { return this.#LOAD_TYPE }
    static async load(path = '', type = this.LOAD_TYPE.TEXT) {
        return fetch(path)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error while loading ${path}! Status: ${response.status}`);
                }
                if (type === this.LOAD_TYPE.TEXT) {
                    return response.text();
                }
                else if (type === this.LOAD_TYPE.JSON) {
                    return response.json();
                }
                else if (type === this.LOAD_TYPE.BLOB) {
                    return response.blob();
                }
                return response;
            })
    }
}
