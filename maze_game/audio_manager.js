import { Sound } from './sound.js'
//this is a helper static class for the Audip context. it also holds a default context and ways to add and remove nodes
//in one place without having to manage them elsewhere
export class Audio_Manager {
    //may or may not need to handle cases where context is replace (context can be ended which will require it to be replaced)
    static audio_context = new (window.AudioContext || window.webkitAudioContext)();
    static OSCILLATOR_TYPE = { SINE: 'sine', SQUARE: 'square', SAWTOOTH: 'sawtooth', TRIANGLE: 'triangle' };
    static #nodes = new Map();
    static #sounds = new Map();
    static pause() {
        if (this.audio_context.state === 'running') {
            this.audio_context.suspend()
        }
    }
    static resume() {
        if (this.audio_context.state === 'suspended') {
            this.audio_context.resume();
        }
    }

    //will store nodes in itself so that their ref is in one place. 
    static has_node(id) {
        return this.#nodes.has(id);
    }
    //will remove existing node at the id, so should remove manually if need to keep it active.
    static add_node(id, node) {
        if (node) {
            const old_node = this.remove_node(id);
            this.#nodes.set(id, node);
            return old_node;
        }
        return null;
    }
    static get_node(id) {
        return this.#nodes.get(id);
    }
    static remove_node(id, disconnect = true, stop = true) {
        const node = this.get_node(id);
        this.#nodes.delete(id);
        if (node) {
            if (stop && 'stop' in node) {
                node.stop();
            }
            if (disconnect && 'disconnect' in node) {
                node.disconnect();
            }
        }
        return node;
    }
    //NOTE: target should be a vaild node or destination. should try to check if it is.
    static connect_node(id, target = this.audio_context.destination) {
        if (this.#nodes.has(id) && target) {
            this.#nodes.get(id).connect(target);
        }
    }
    static disconnect_node(id, target = this.audio_context.destination) {
        if (this.#nodes.has(id) && target) {
            this.#nodes.get(id).disconnect(target);
        }

    }
    static has_sound(id) {
        return this.#sounds.has(id);
    }
    static add_sound(id, sound_class, start = true) {
        console.log('adding sound ', id)
        if (sound_class) {
            console.log('sound class vaild ', sound_class)
            const sound = new sound_class(this.audio_context);
            if (start){
                sound.start();
            }
            const old_sound = this.remove_sound(id);
            this.#sounds.set(id, sound);
            return old_sound;
        }
        return null;
    }
    static get_sound(id) {
        return this.#sounds.get(id);
    }
    static remove_sound(id, end = true) {
        const sound = this.get_sound(id);
        this.#sounds.delete(id);
        if (sound) {
            if (end) {
                sound.end();
            }
        }
        return sound;
    }
}