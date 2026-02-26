
export class Signal {
    static get REMOVE() { return -1 };
    #connections = new Set()
    connect(callable) {
        if (typeof callable === 'function') {
            this.#connections.add(callable);
            return () => this.disconnect(callable);
        }
    }
    disconnect(callable) {
        this.#connections.delete(callable);
    }
    emit(...args) {
        for (const callable of this.#connections) {
            if (callable(...args) === Signal.REMOVE) {
                this.disconnect(callable)
            };
        }
    }
    clear() {
        this.#connections.clear();
    }
    delete() {
        this.delete = true;
        this.clear()
    }
}


//declares the basic structure of a state or a object to be observed
export class Reactive_Object {
    #on_change = new Signal; get on_change() { return this.#on_change; }
    #on_clear = new Signal; get on_clear() { return this.#on_clear; }
    #on_load = new Signal; get on_load() { return this.#on_load; }
    #on_delete = new Signal; get on_delete() { return this.#on_delete; }
    clear() { this.#on_clear.emit(); }
    load() { this.on_load.emit(); }
    delete() {
        this.deleted = true;
        this.clear();
        this.on_change.delete();
        this.on_clear.delete();
        this.on_load.delete();
        this.on_delete.emit();
        this.on_delete.delete();
    }
}
//NOTE:Serializable_State could exist. this would prevent storing values that would be hard to Serializalize
export class State extends Reactive_Object {
    #values = new Map();
    has(key) {
        return this.#values.has(key);
    }
    get(key) {
        return this.#values.get(key);
    }
    set(key, value) {
        const old_value = this.#values.get(key);
        if (old_value !== new_value) {
            this.#values.set(key, value);
            this.on_change.emit(key, new_value, old_value);
        }
    }
    //incase an uneeded key exists, this allow removing it. it will notify there was a change
    //if a value existed. new value will be undefined instead of null to state it dose not exists
    remove(key) {
        const old_value = this.#values.get(key);
        if (this.#values.delete()) {
            this.on_change.emit(key, undefined, old_value);
        }
    }
    clear() {
        this.#values.clear();
        super.clear();
    }
}


