import { World } from './world.js'
import { Level } from './level.js'
import { Fish } from './fish.js'

//will move the game logic in the class and have the html create and start the game
//so create, register, and then load, also should have a start function that start 
//the loop. same with a pause
export class Fishing_Game {
    #sound_volume = 0.25; get sound_volume() { return this.#sound_volume }
    set sound_volume(value) {
        this.#sound_volume = value;
        this.update_sounds();
    }
    #save_locally = false; get save_locally() { return this.#save_locally }
    set save_locally(value) {
        this.#save_locally = value;
        if (this.elements.save_locally) {
            this.elements.save_locally.checked = value;
        }
    }
    #current_time = 0;
    #last_time = 0;
    #paused = false; get paused() { return this.#paused; }
    #started = false; get started() { return this.#started; }
    #level; get level() { return this.#level; }
    #world; get world() { return this.#world; }
    save_key = 'fishing_save_state';
    save_version = 1;
    dirty_save_state = false;
    //should have them assign later
    elements = {
        sound_volume: undefined,
        splash_sound: undefined,
        quick_splash_sound: undefined,
        score: undefined
    }
    update_sounds() {
        if (this.elements.sound_volume) {
            if (Number(this.elements.sound_volume.value) !== this.sound_volume) {
                this.elements.sound_volume.value = this.sound_volume;
            }
        }
        if (this.elements.splash_sound) {
            this.elements.splash_sound.volume = this.sound_volume;
        }
        if (this.elements.quick_splash_sound) {
            this.elements.quick_splash_sound.volume = this.sound_volume;
        }
    }
    //NOTE: could store them in an object and use it ref. this would be ideal so no objects are being created, but require everything to pull from the save state.
    get_save_data() {
        return {
            save_version: this.save_version,
            save_locally: this.save_locally,
            sound_volume: this.sound_volume,
            score: this.score
        }
    }
    save(save_key = this.save_key) {
        let save_data = this.get_save_data();
        save_data = JSON.stringify(save_data);
        if (this.save_locally) {
            localStorage.setItem(save_key, save_data)
        }
        else {
            sessionStorage.setItem(save_key, save_data)
            //purge the local storage catch if exists since
            //we only update it if allowed which may cause issue if one is left (session would be ignored)
            //also would act as a easy way to clean it up at the risk of dataloss (need a way to export state if it needs to be protected)
            if (save_key in localStorage) {
                localStorage.removeItem(save_key);
            }
        }
    }
    //load from storage or disk/string/file(if it ever needed)
    fetch_save_state(save_key = this.save_key, default_state = {}) {
        let save_state = null;
        if (save_key) {
            save_state = localStorage.getItem(save_key)
            if (save_state === null) {
                save_state = sessionStorage.getItem(save_key)
            }
        }
        if (save_state === null) {
            save_state = default_state
        }
        else {
            save_state = JSON.parse(save_state);
        }
        return save_state;
    }
    load(save_key = this.save_key, default_state = {}, use_save_key = true) {
        const save_state = this.fetch_save_state(save_key, default_state)
        if (use_save_key) {
            this.save_key = save_key
        }
        if (save_state.save_version && this.save_version != save_state.save_version) {
            console.log(`save state is a diffrent version. game: ${this.save_version}, save: ${save_state.save_version}`)
        }
        //below will load the data
        this.save_locally = save_state.save_locally ? true : false;
        this.sound_volume = parseFloat(save_state.sound_volume) || 0.25;
        this.score = save_state.score || 0;
        if (this.score > 0 && this.elements.score) {
            this.elements.score.innerHTML = `Score: ${this.score}`;
        }
    }
    register_elements(element_info = {}) {
        this.elements = {
            save_locally: document.getElementById(element_info.save_locally || 'fishing_save_locally'),
            sound_volume: document.getElementById(element_info.sound_volume || 'sound_volume'),
            splash_sound: document.getElementById(element_info.splash_sound || 'splash_sound'),
            quick_splash_sound: document.getElementById(element_info.quick_splash_sound || 'quick_splash_sound'),
            score: document.getElementById(element_info.score || 'score')
        }
        this.update_sounds();
        if (this.elements.sound_volume) {
            this.elements.sound_volume.addEventListener('change', (event) => {
                this.sound_volume = parseFloat(event.target.value);
                this.elements.splash_sound.pause();
                this.elements.splash_sound.currentTime = 0;
                this.elements.splash_sound.play();
                this.dirty_save_state = true;
            })
        }
        if (this.elements.save_locally) {
            this.elements.save_locally.addEventListener('change', (event) => {
                this.save_locally = event.target.checked;
                this.dirty_save_state = true;
            })
        }
    }
    update() {
        if (this.paused) { return; }
        this.#current_time = performance.now();

        if (document.hidden || document.visibilityState !== "visible" || !document.hasFocus()) {
            this.#last_time = this.#current_time;
            requestAnimationFrame(() => this.update());
            return
        }
        const delta = (this.#current_time - this.#last_time) / 1000.0;
        if (delta > 2.0) { console.log('delta is greater than 2 seconds') }
        this.#last_time = this.#current_time;
        this.level.update(delta)
        //may need a slower loop for save checking. NOTE: saving might not save when game loop is paused(or it shouldn't)
        if (this.dirty_save_state = true) {
            this.save();
            this.dirty_save_state = false;
        }
        requestAnimationFrame(() => this.update());
    }
    pause() {
        if (this.paused) { return }
        this.#paused = true;
    }
    resume() {
        if (!this.paused) { return }
        this.#paused = false;
        //ignore starting the loop if the 
        //game have not started yet.
        if (!this.#started) { return }
        this.#last_time = performance.now();
        this.#current_time = performance.now();
        this.update();
    }
    update_fish(fish, depth = 0) {
        const random_point = [0.0, 0.0];
        this.level.world.random_point_in_nav_area(fish.width, fish.height, fish.move_to)
        this.level.world.random_point_in_nav_area(fish.width, fish.height, random_point)
        const fish_types = Object.keys(this.fish_data);
        fish.type = this.fish_data[fish_types[Math.floor(Math.random() * fish_types.length)]] || {};
        fish.weight_ratio = Math.random();
        fish.set_position(random_point[0], random_point[1]);
        fish.base_speed = Math.random() * 8 + 8;
        fish.set_scale(
            Math.random() * 1.5 + 0.5,
            Math.random() * 1.5 + 0.5
        )
        fish.depth = depth;
    }
    on_fish_caught = () => {
    }
    fish_caught(catch_data = {}) {
        const random_point = [0.0, 0.0];
        this.elements.splash_sound.pause();
        this.elements.splash_sound.currentTime = 0;
        this.elements.splash_sound.play();
        if (!this.inventory) {
            this.inventory = new Map();
        }
        if (catch_data.fish.type) {
            if (!this.inventory.has(catch_data.fish.type)) {
                this.inventory.set(catch_data.fish.type, {
                    //amount: 0,
                    total_catches: 0,
                    weight_ratio: 0.0,
                    min_weight_ratio: undefined,
                    max_weight_ratio: 0
                })
            }
            const meta = this.inventory.get(catch_data.fish.type)
            //amount is needed for vol count. both amount and weight can be reduce
            //NOTE: amount is normally needed for simple items. it may be convert to 
            //the ceil of weight or treated as a float (and replace weight)
            //catches will be used for the total catches and inventory display may need 
            //be config to handle display that correctly
            const total_weight = catch_data.fish.weight + (catch_data.fish.min_weight + (catch_data.fish.max_weight - catch_data.fish.min_weight) * meta.weight_ratio)
            meta.weight_ratio = (total_weight - catch_data.fish.min_weight) / (catch_data.fish.max_weight - catch_data.fish.min_weight);
           // meta.amount += 1;
            meta.total_catches += 1;
            if (!meta.min_weight_ratio) {
                meta.min_weight_ratio = catch_data.fish.weight_ratio
            }
            else if (catch_data.fish.weight_ratio < meta.min_weight_ratio) {
                meta.min_weight_ratio = catch_data.fish.weight_ratio
            }
            if (catch_data.fish.weight_ratio > meta.max_weight_ratio) {
                meta.max_weight_ratio = catch_data.fish.weight_ratio
            }
        }
        //console.log(this.inventory)
        this.score += Math.max(Math.floor((catch_data.fish.scale[0] + catch_data.fish.scale[1]) * 0.75), 1)
        this.elements.score.innerHTML = `Score: ${this.score}`;
        //console.log(catch_data.fish.type, ' ', catch_data.fish.weight, 'kg')
        this.update_fish(catch_data.fish);
        this.dirty_save_state = true;
        this.on_fish_caught();
    }
    failed_catch(catch_data = {}) {
        this.elements.quick_splash_sound.pause();
        this.elements.quick_splash_sound.currentTime = 0;
        this.elements.quick_splash_sound.play();
    }
    fish_clicked(event, fish) {
        const catch_data = {
            fish: fish,
            catch_roll: Math.random()
        }
        if (fish.depth < 1.0 && !(catch_data.catch_roll <= fish.depth)) {
            catch_data.sucess = false;
            this.failed_catch(catch_data);
            return
        }
        catch_data.sucess = true;
        this.fish_caught(catch_data);

    }
    //todo: make this handle a promis properly by resolving it on_ready
    async start() {
        if (this.#started) { return }
        this.#started = true;
        this.#world = new World();
        this.#level = new Level(this.world);

        this.level.on_ready = () => {
            const random_point = [0.0, 0.0];
            const fish_data = {
                width: 16,
                height: 16,
                img_src: '/assets/fish.gif',
                opacity: 0.9
            }
            const fish_width = 16;
            const fish_height = 16;
            //const fish_types = Object.keys(this.fish_data);
            //console.log(fish_types)
            //TODO: move this out of here or turn into functions.
            for (let i = 0; i < 10; i++) {
                //const fish = new Fish('./assets/fish.gif', fish_width, fish_height, level.world)
                //level.objects.push(fish);
                //this.update_fish(fish)//NOTE: this use the init of the fish to set it. could update 
                //the fish update to do that
                //fish_data.type = fish_types[Math.floor(Math.random() * fish_types.length)] || {};
                //fish_data.weight_ratio = Math.random();
                this.level.world.random_point_in_nav_area(fish_data.width, fish_data.height, random_point)
                fish_data.x = random_point[0];
                fish_data.y = random_point[1];
                fish_data.base_speed = Math.random() * 8 + 8;
                fish_data.scale_x = Math.random() * 1.5 + 0.5;
                fish_data.scale_y = Math.random() * 1.5 + 0.5;
                const fish = new Fish(fish_data, this.level.world)
                this.update_fish(fish, Math.random() * 0.5 + 0.5)
                this.level.objects.push(fish);
                //fish.depth = Math.random() * 0.5 + 0.5;
                this.level.element.appendChild(fish.image);
                fish.image.addEventListener("click", (event) => this.fish_clicked(event, fish));
            }
        }
        this.level.setup(
            document.getElementById('world'),
            document.getElementById('level'),
            this.world
        )

        if (!this.#paused) {
            //if paused when start, then it will start paused.
            this.#last_time = performance.now();
            this.#current_time = performance.now();
            this.update();
        }
    }
    constructor() {
        //for connecting to some window events related to pausing
        window.addEventListener('blur', () => {
            this.pause();
        });

        // When the window gains focus
        window.addEventListener('focus', () => {
            this.resume();
        });
    }
}

export async function start_fishing_game(options = {}) {
    const game = new Fishing_Game();
    const save_key = options.save_key || 'fishing_save_state'
    game.register_elements(options.element_info || {})
    if (options.saltwater) {
        game.fish_data = await (await fetch('./data/saltwater_fish.json')).json();
        Object.assign(game.fish_data, await (await fetch('./data/mixwater_fish.json')).json());
    }
    else {
        game.fish_data = await (await fetch('./data/freshwater_fish.json')).json();
        Object.assign(game.fish_data, await (await fetch('./data/mixwater_fish.json')).json());
    }
    console.log(game.fish_data)
    game.load(save_key);
    game.start();
    return game;
}