

//this is a static class for managing inputs. it might not have an instance
//due to it not being nessary.
//NOTE: this should not handle input events directly. it here to remap key binds and add additional input support
export class Input_Manager {
    static #KEYS = {
        INPUT: {
            UP: 'UP', DOWN: 'DOWN', RIGHT: 'RIGHT', LEFT: 'LEFT', FORWARD: 'FORWARD', BACK: 'BACK',
            LIGHT: 'LIGHT', DEBUG: 'DEBUG', SHIFT: 'SHIFT', CONTROL: 'CONTROL'
        },
        KEY_STATE: { RELEASED: -1, UP: 0, PRESSED: 1, DOWN: 2 }
    }
    static get KEYS() { return this.#KEYS; }
    //this will store the default bindings(could update it from config) as well as infomation such as if it is pressed and the strength
    static #input_actions = {
        [this.KEYS.INPUT.FORWARD]: { keymap: ['w', 'arrowup'] },
        [this.KEYS.INPUT.BACK]: { keymap: ['s', 'arrowdown'] },
        [this.KEYS.INPUT.RIGHT]: { keymap: ['d', 'arrowright'] },
        [this.KEYS.INPUT.LEFT]: { keymap: ['a', 'arrowleft'] },
        [this.KEYS.INPUT.UP]: { keymap: ['e'] },
        [this.KEYS.INPUT.DOWN]: { keymap: ['q'] },
        [this.KEYS.INPUT.LIGHT]: { keymap: ['l'] },
        [this.KEYS.INPUT.DEBUG]: { keymap: ['`'] },
        [this.KEYS.INPUT.SHIFT]: { keymap: ['shift'] },
        [this.KEYS.INPUT.CONTROL]: { keymap: ['control'] }
    };

    static get input_actions() { return this.#input_actions; }
    static #input_map = new Map();

    static get input_map() {
        if (this.#input_map.size === 0) {
            for (const [action, state] of Object.entries(this.input_actions)) {
                state.keymap.forEach(key => {
                    this.#input_map.set(key, action);
                });
            }
        }
        return this.#input_map;
    }
    static get_input_action(key) {
        return this.input_map.get(key);
    }
    static input_event(event, pressed = true) {
        const action = this.get_input_action(event.key.toLowerCase());
        if (action) {
            this.input_actions[action].pressed = pressed;
        }
        return action
    }
    static is_key_down(action) {
        return this.input_actions[action].pressed;
    }

}