export class Storage {
    static #ACESS_FLAGS = { TEMP: 0, SESSION: 1 << 0, LOCAL: 1 << 1, COOKIE: 1 << 2, DATABASE: 1 << 3 };
    static get ACESS_FLAGS() { return this.#ACESS_FLAGS; }
    static DEFAULT_ACESS_FLAGS = this.ACESS_FLAGS.SESSION
    static DEFAULT_COOKIE_LIFE = 7;
    static #tempStorage = new Map(); static get tempStorage() { return this.#tempStorage }
    static #acessLevel = 0; static get acessLevel() { return this.#acessLevel; }
    static databaseWrapper = undefined;
    static askPermission = (acessFlag) => { };
    static useTemp = false;


    static set acessLevel(level) {
        //here so checks can be added
        this.#acessLevel = Number(level);
    }
    static addAcess(acessFlag) {
        this.#acessLevel |= acessFlag;
    }
    static removeAcess(acessFlag) {
        this.#acessLevel &= ~acessFlag;
    }
    static hasAcess(acessFlag) {
        if (acessFlag === this.ACESS_FLAGS.TEMP) {
            return true;
        }
        return (this.#acessLevel & acessFlag) === acessFlag
    }

    //anything but set will not care about acess unless useTemp is true
    static has(key, acessFlag = this.DEFAULT_ACESS_FLAGS, useTemp = this.useTemp) {
        const hasAcess = this.hasAcess(acessFlag);
        if (!hasAcess && useTemp || acessFlag === this.ACESS_FLAGS.TEMP) {
            return this.tempStorage.has(`${acessFlag}:${key}`);
        }

        if (acessFlag === this.ACESS_FLAGS.DATABASE && this.databaseWrapper) {
            return this.databaseWrapper.has(key);
        }
        if (acessFlag === this.ACESS_FLAGS.COOKIE) {
            return document.cookie.split("; ").some(c => c.startsWith(key + "="));
        }
        if (acessFlag === this.ACESS_FLAGS.LOCAL) {
            return localStorage.getItem(key) !== null;
        }
        if (acessFlag === this.ACESS_FLAGS.SESSION) {

            return sessionStorage.getItem(key) !== null;
        }

        return false
    }
    static get(key, acessFlag = this.DEFAULT_ACESS_FLAGS, useTemp = this.useTemp) {
        const hasAcess = this.hasAcess(acessFlag);
        if (!hasAcess && useTemp || acessFlag === this.ACESS_FLAGS.TEMP) {
            return this.tempStorage.get(`${acessFlag}:${key}`);
        }

        if (acessFlag === this.ACESS_FLAGS.DATABASE && this.databaseWrapper) {
            return this.databaseWrapper.get(key);
        }
        if (acessFlag === this.ACESS_FLAGS.COOKIE) {
            const match = document.cookie
                .split("; ")
                .find(c => c.startsWith(key + "="));
            return match ? decodeURIComponent(match.split("=")[1]) : null;
        }
        if (acessFlag === this.ACESS_FLAGS.LOCAL) {
            return localStorage.getItem(key);
        }
        if (acessFlag === this.ACESS_FLAGS.SESSION) {
            return sessionStorage.getItem(key);
        }

        return undefined;

    }
    static set(key, value, acessFlag = this.DEFAULT_ACESS_FLAGS, askPermission = true, useTemp = this.useTemp) {
        const hasAcess = this.hasAcess(acessFlag);
        if (!hasAcess && askPermission) {
            this.askPermission(acessFlag);
        }
        if (hasAcess) {
            if (acessFlag === this.ACESS_FLAGS.DATABASE && this.databaseWrapper) {
                return this.databaseWrapper.set(key, value);
            }
            if (acessFlag === this.ACESS_FLAGS.COOKIE) {
                const expires = new Date(Date.now() + this.DEFAULT_COOKIE_LIFE * 864e5).toUTCString();
                return document.cookie = `${key}=${encodeURIComponent(value)}; expires=${expires}; path=${path}`;

            }
            if (acessFlag === this.ACESS_FLAGS.LOCAL) {
                return localStorage.setItem(key, value)

            }
            if (acessFlag === this.ACESS_FLAGS.SESSION) {
                return sessionStorage.setItem(key, value)
            }
        }
        else if (!useTemp) {
            return;
        }
        return this.tempStorage.set(`${acessFlag}:${key}`, value);

    }
    static remove(key, acessFlag = this.DEFAULT_ACESS_FLAGS, useTemp = this.useTemp) {
        const hasAcess = this.hasAcess(acessFlag);

        if (!hasAcess && useTemp || acessFlag === this.ACESS_FLAGS.TEMP) {
            return this.tempStorage.delete(`${acessFlag}:${key}`);
        }

        if (acessFlag === this.ACESS_FLAGS.DATABASE && this.databaseWrapper) {
            return this.databaseWrapper.remove(key);
        }
        if (acessFlag === this.ACESS_FLAGS.COOKIE) {
            return document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;

        }
        if (acessFlag === this.ACESS_FLAGS.LOCAL) {
            return localStorage.removeItem(key);
        }
        if (acessFlag === this.ACESS_FLAGS.SESSION) {
            return sessionStorage.removeItem(key);
        }

    }
    static load() {
        if (this.has('storageAcessLevel', this.ACESS_FLAGS.LOCAL)) {
            this.acessLevel = this.get('storageAcessLevel', this.ACESS_FLAGS.LOCAL)
            return;
        }
        if (this.has('storageAcessLevel', this.ACESS_FLAGS.SESSION)) {
            this.acessLevel = this.get('storageAcessLevel', this.ACESS_FLAGS.SESSION)
            return;
        }
    }
    static save() {
        if (this.hasAcess(this.ACESS_FLAGS.LOCAL)) {
            this.set('storageAcessLevel', this.acessLevel, this.ACESS_FLAGS.LOCAL)
            if (this.has('storageAcessLevel', this.ACESS_FLAGS.SESSION)) {
                this.remove('storageAcessLevel', this.ACESS_FLAGS.SESSION)
            }
            return
        }
        else if (this.hasAcess(this.ACESS_FLAGS.SESSION)) {
            this.set('storageAcessLevel', this.acessLevel, this.ACESS_FLAGS.SESSION)
            if (this.has('storageAcessLevel', this.ACESS_FLAGS.LOCAL)) {
                this.remove('storageAcessLevel', this.ACESS_FLAGS.LOCAL)
            }
            return
        }
        //remove both if there is no acess
        else{
            if (this.has('storageAcessLevel', this.ACESS_FLAGS.LOCAL)) {
                this.remove('storageAcessLevel', this.ACESS_FLAGS.LOCAL)
            }
            if (this.has('storageAcessLevel', this.ACESS_FLAGS.SESSION)) {
                this.remove('storageAcessLevel', this.ACESS_FLAGS.SESSION)
            }
        }
    }
}