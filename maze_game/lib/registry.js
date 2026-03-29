//
export class Registry {
    static #classes = new Map();
    static #instances = new Map();
    //allow overriding convert type (such if there a dedicated resource handler and a resource type instead of using the generic instances(which is more for singleton like objects))
    static #typeConversions = new Map();
    static TYPE_DELIMITER = '::';
    static isClass(value) {
        return (
            typeof value === 'function' &&
            /^class\s/.test(Function.prototype.toString.call(value))
        );
    }
    //TODO: decide to add a has and keys function for the maps
    static getClass(name) {
        return this.#classes.get(name)
    }
    static registerClass(name, class_ref) {
        if (this.isClass(class_ref)) {
            this.#classes.set(name, class_ref)
        }
    }
    static unregisterClass(name) {
        this.#classes.delete(name)
    }
    static getInstance(name) {
        return this.#instances.get(name)
    }
    static registerInstance(name, instance) {
        if (typeof instance === 'object' && instance) {
            this.#instances.set(name, instance)
        }
    }
    static unregisterInstance(name) {
        this.#instances.delete(name)
    }
    static addTypeConversion(type, conversion) {
        if (typeof conversion === 'function' && conversion) {
            this.#typeConversions.set(type, conversion)
        }
    }
    static removeTypeConversion(type) {
        this.#typeConversions.delete(type)
    }
    //Note: the default cases may lack safty checks. I am hoping most will return errors,
    //but know some may just fail silently. In other words more checks would be needed to improve error handling
    static convertType(type, value) {
        if (this.#typeConversions.has(type)) {
            return this.#typeConversions.get(type)(value)
        }
        if (type === 'class') {
            return getClass(value)
        }
        if (type === 'instance') {
            return getInstance(value)
        }
        if (type === 'number') {
            return Number(value);
        }
        if (type === 'bigint') {
            return BigInt(value);
        }
        if (type === 'hex') {
            return parseInt(value, 16)
        }
        return value;
    }
    //will split the string into a type and value (maybe more later)
    //base on the formating.
    //TODO: add a better spliting logic maybe regex may have a better way
    //to get more infomation. also maybe type/value us enough
    //path::'./path' could be used to look up a path keyed ref (though this system dose not support it directly(but can fake it with instances))
    static parceSourceString(string) {
        if (string !== null && string !== undefined) {
            if (string === 'undefined') {
                return { type: 'undefined', value: undefined }
            }
            if (string === 'null') {
                return { type: 'object', value: null }
            }
            if (string.includes(this.TYPE_DELIMITER)) {
                const result = string.split(this.TYPE_DELIMITER);
                result[1] = this.convertType(result[0], result[1]);
                return { type: result[0], value: result[1] };
            }
            return { type: 'string', value: string };
        }

        return { type: typeof string, value: string }

    }

}