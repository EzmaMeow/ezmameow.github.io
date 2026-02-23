import * as THREE from 'three';
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import * as Game_Utils from './game_ultility.js'


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
        TYPES: Object.freeze({ TEXTURE: 'texture' }) //type identification for loaders
    }); //NOTE: values can be changes, but the container type is locked
    static get KEYS() { return this.#KEYS; }

    //#signals = new Map();//reserver for callbacks in responce to changes that may take time(should be an object of maps if so)

    #renderers = new Map(); //there may be more that one renderer, so this is here to handle them
    #materials = new Map();
    #geometries = new Map();
    #textures = new Map();

    //loading manager may be importaint so overriding ther ref may not be ideal. also loaders would need
    //to ref it so setting it would need to reassign all the ref
    #loading_manager = new THREE.LoadingManager();
    get loading_manager() { return this.#loading_manager; }
    texture_loader = new THREE.TextureLoader(this.loading_manager);

    //set will have a flag to allow replacing the ref as well as to dispose the replaces ref
    dispose(id, source) {
        if (source) {
            const value = source.get(id);
            if (id === Resource_Manager.ALL_KEY) {
                for (const [loop_key, loop_value] of source) {
                    if (loop_value) {
                        loop_value.dispose();
                        source.delete(id);
                    }
                }
                return
            }
            if (value) {
                value.dispose();
                source.delete(id);
            }
        }
    }
    set_resource(id, resource, source, override = true, dispose = true) {
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
        this.set_resource(id, renderer, this.#renderers, override, dispose);
    }
    set_material(id, material, override = true, dispose = true) {
        this.set_resource(id, material, this.#materials, override, dispose);
    }
    set_geometry(id, geometry, override = true, dispose = true) {
        this.set_resource(id, geometry, this.#geometries, override, dispose);
    }
    set_texture(id, texture, override = true, dispose = true) {
        this.set_resource(id, texture, this.#textures, override, dispose);
    }

    get_resource(id, source, fallback = null, cache = true) {
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
        return this.get_resource(id, this.#renderers, fallback, cache);
    }
    get_material(id, fallback = null, cache = true) {
        return this.get_resource(id, this.#materials, fallback, cache);
    }
    get_geometry(id, fallback = null, cache = true) {
        return this.get_resource(id, this.#geometries, fallback, cache);
    }
    get_texture(id, fallback = null, cache = true) {
        return this.get_resource(id, this.#textures, fallback, cache);
    }

    dispose_renderers(id = '*') {
        this.dispose(id, this.#renderers);
    }
    dispose_materials(id = '*') {
        this.dispose(id, this.#materials);
    }
    dispose_geometries(id = '*') {
        this.dispose(id, this.#geometries);
    }
    dispose_textures(id = '*') {
        this.dispose(id, this.#textures);
    }
    //some disposables are static ref. They need to have their flags set true
    //and only provided if they are not needed or need to be rebuilt
    dispose_all(include_statics = false) {
        this.dispose_geometries();
        this.dispose_materials();
        this.dispose_textures();
        //may change from a bool to an array of ids
        if (include_statics) {
            if (Resource_Manager.default_renderer && Resource_Manager.default_renderer instanceof THREE.WebGLRenderer && include_statics) {
                renderer.renderLists.dispose();
            }
        }
    }

    load_resource(file, id, type, on_ready = null, source = null, loader = null) {
        if (type == Resource_Manager.KEYS.TYPES.TEXTURE) {
            source = this.#textures;
            loader = this.texture_loader;
        }
        if (source && loader) {
            loader.load(file, (result) => {
                this.set_resource(id, result, source);
                if (on_ready) {
                    on_ready(result);
                }
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

//this is a static class for managing inputs. it might not have an instance
//due to it not being nessary.
//NOTE: this should not handle input events directly. it here to remap key binds and add additional input support
export class Input_Manager {
    static #KEYS = {
        INPUT:{UP: 'UP', DOWN: 'DOWN', RIGHT: 'RIGHT', LEFT: 'LEFT', FORWARD: 'FORWARD', BACK: 'BACK',
            LIGHT: 'LIGHT', DEBUG: 'DEBUG', SHIFT:'SHIFT',CONTROL:'CONTROL'},
        KEY_STATE:{RELEASED:-1,UP:0,PRESSED:1,DOWN:2}
    }
    static get KEYS() { return this.#KEYS; }
    //this will store the default bindings(could update it from config) as well as infomation such as if it is pressed and the strength
    static #input_actions = {
        [this.KEYS.INPUT.FORWARD]: {keymap:['w','arrowup']},
        [this.KEYS.INPUT.BACK]: {keymap:['s','arrowdown']},
        [this.KEYS.INPUT.RIGHT]: {keymap:['d','arrowright']},
        [this.KEYS.INPUT.LEFT]: {keymap:['a','arrowleft']},
        [this.KEYS.INPUT.UP]: {keymap:['e']},
        [this.KEYS.INPUT.DOWN]: {keymap:['q']},
        [this.KEYS.INPUT.LIGHT]: {keymap:['l']},
        [this.KEYS.INPUT.DEBUG]: {keymap:['`']},
        [this.KEYS.INPUT.SHIFT]: {keymap:['shift']},
        [this.KEYS.INPUT.CONTROL]: {keymap:['control']}
    };

    static get input_actions(){return this.#input_actions;}
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
    static get_input_action(key){
        return this.input_map.get(key);
    }
    static input_event(event, pressed = true){
        const action = this.get_input_action(event.key.toLowerCase());
        if (action){
            this.input_actions[action].pressed = pressed;
        }
        return action
    }
    static is_key_down(action){
        return this.input_actions[action].pressed;
    }

}

//handles the image data of a level built from a image
export class Level_Image {
    #image; //Image

    data;	//ImageData
    canvas;
    context;
    is_ready = false; //backup incase it is ready after init


    //SIGNALS, EVENTS, AND CALLABLES
    //overriable function to be called when image is loaded and data is populated
    on_ready() {
        console.log('meow ready ', this.is_ready);
    }

    #on_load(event, source = this) {
        source.context.drawImage(source.#image, 0, 0);
        source.data = source.context.getImageData(0, 0, source.#image.width, source.#image.height).data;
        source.is_ready = true;
        source.on_ready();
    }
    //GETTERS AND SETTERS
    //may not store the image or other varibles related to the dom
    set image(value) {
        this.#image = value;
        if (value) {
            this.#image.onload = (event) => { this.#on_load(event, this); };
        }
    }
    get image() {
        return this.#image
    }
    //METHOODS
    convert_coord_to_index(x = 0, y = 0) {
        if (x >= this.image.width || y >= this.image.height || x < 0.0 || y < 0.0) {
            return -1
        }
        let id = y * this.image.width + x;
        return id * 4;
    }
    get_pixel_info(index) {
        if (index < 0 || index >= this.data.length) {
            return null
        }
        let pixel_data = { 'id': Math.floor(index / 4) };
        if (pixel_data.id == 0) {
            pixel_data.x = 0
            pixel_data.y = 0
        }
        else {
            pixel_data.x = pixel_data.id % this.image.width
            pixel_data.y = Math.floor(pixel_data.id / this.image.width);
        }
        pixel_data.r = this.data[index],	// Red
            pixel_data.g = this.data[index + 1],	// Green
            pixel_data.b = this.data[index + 2],	// Blue
            pixel_data.a = this.data[index + 3]	// Alpha
        return pixel_data;
    }
    for_each_pixel(callable = (pixel_info) => { }) {
        for (let i = 0; i < this.data.length; i += 4) {
            callable(this.get_pixel_info(i));
        }
    }

    constructor(source_image) {
        this.image = new Image();
        this.canvas = document.createElement("canvas");
        this.context = this.canvas.getContext("2d");
        this.image.src = source_image;
    }
}

export class Level extends THREE.Scene {
    //may relocate the loader. it here since level (along with maze_game) will be acess often, but I may add
    //a static class for hold disposable types of reusable nature
    static loader = new THREE.TextureLoader();
    static default_source_image = "maze.png";
    level_image;
    //TODO: allow this to be set, but would need to:
    //update all cache object base off of it 
    //rebuild the world and adjust all object to the new positions
    #cell_size = new THREE.Vector3(2.0, 2.0, 2.0);
    #KEYS = Object.freeze({
        BORDER: Object.freeze({ NORTH: 'north', SOUTH: 'south', EAST: 'east', WEST: 'west', FLOOR: 'floor', CEIL: 'ceil' }),
    })
    get KEYS() { return this.#KEYS; }
    static_objects = {};

    get default_wall_mat() {
        return this.resources.get_geometry('wall', new THREE.MeshLambertMaterial({ color: 0x87ceeb, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 10 }));
    }
    get default_floor_mat() {
        return this.resources.get_geometry('floor', new THREE.MeshLambertMaterial({ color: 0x87b1eb, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 10 }));
    }
    get default_ceil_mat() {
        return this.resources.get_geometry('ceil', new THREE.MeshLambertMaterial({ color: 0x87ebe3, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 10 }));
    }

    get default_xborder_geo() {
        return this.resources.get_geometry('xborder', new THREE.PlaneGeometry((this.level_image.image.height) * this.#cell_size.x, this.#cell_size.y, this.#cell_size.z));
    }
    get default_zborder_geo() {
        return this.resources.get_geometry('zborder', new THREE.PlaneGeometry(this.#cell_size.x, this.#cell_size.y, (this.level_image.image.width) * this.#cell_size.z));
    }
    get default_area_geo() {
        return this.resources.get_geometry('area', new THREE.PlaneGeometry(this.level_image.image.height * this.#cell_size.x, this.level_image.image.width * this.#cell_size.z));
    }


    //Note: the one that create this should check if on exists incase it get called twice
    maze_mesh = null;

    get_cell_lower_boundary() {
        return this.#cell_size.clone().divideScalar(2).negate();
    }
    get_cell_upper_boundary() {
        return this.#cell_size.clone().divideScalar(2);
    }

    get_cell_position(position) {
        //need to handle y just in case. the level is y up from 0 instead of center at 0 to make things easier
        //so the position may need to have this.#cell_size.y/2,0 subtracted from its y
        return Game_Utils.get_cell_coords(position, this.#cell_size);
    }
    get_cell_world_position(position) {
        return Game_Utils.get_cell_position(position, this.#cell_size).add(new THREE.Vector3(0, this.#cell_size.y / 2, 0));
    }
    is_wall(pixel_info) {
        //will treat null as a wall unless need to extend pass bounds
        if (pixel_info == null) {
            return true
        }
        return pixel_info.r < 128 && pixel_info.g < 128 && pixel_info.b < 128;
    }
    //get the cell as a box. if a box is passed, then it will reset it to the bounds
    //if coords are provide, then it will also translate it
    get_cell_bounds(coords = null, bounds = null) {
        if (bounds) {
            bounds.min.copy(this.get_cell_lower_boundary());
            bounds.max.copy(this.get_cell_upper_boundary());
        }
        else {
            bounds = new THREE.Box3(this.get_cell_lower_boundary(), this.get_cell_upper_boundary())
        }
        if (coords) {
            bounds.translate(this.get_cell_world_position(coords));
        }
        return bounds;
    }
    build_maze() {
        const geometries = [];
        //Todo: move the plane geo to geos and have a function or getter that update them
        this.level_image.for_each_pixel((pixel_info) => {
            //should try to clone these, but also not really since they should be clean up afterwards
            const px = new THREE.PlaneGeometry(this.#cell_size.x, this.#cell_size.y).rotateY(Math.PI / 2); // +X //left to right of int spawn facing (|->)
            const nx = new THREE.PlaneGeometry(this.#cell_size.x, this.#cell_size.y).rotateY(-Math.PI / 2); // -X (<-|)
            const pz = new THREE.PlaneGeometry(this.#cell_size.z, this.#cell_size.y); // +Z //(v) (south)
            const nz = new THREE.PlaneGeometry(this.#cell_size.z, this.#cell_size.y).rotateY(Math.PI); // -Z (^) the look direction (north)
            if (this.is_wall(pixel_info)) {
                let near_pixel_info = this.level_image.get_pixel_info(this.level_image.convert_coord_to_index(pixel_info.x + 1, pixel_info.y))
                if (!this.is_wall(near_pixel_info)) {
                    px.translate(pixel_info.x * this.#cell_size.x + this.#cell_size.z / 2.0, 0.0, pixel_info.y * this.#cell_size.z);
                    geometries.push(px);
                }
                near_pixel_info = this.level_image.get_pixel_info(this.level_image.convert_coord_to_index(pixel_info.x - 1, pixel_info.y))
                if (!this.is_wall(near_pixel_info)) {
                    nx.translate(pixel_info.x * this.#cell_size.x - this.#cell_size.z / 2.0, 0.0, pixel_info.y * this.#cell_size.z);
                    geometries.push(nx);
                }
                near_pixel_info = this.level_image.get_pixel_info(this.level_image.convert_coord_to_index(pixel_info.x, pixel_info.y + 1))
                if (!this.is_wall(near_pixel_info)) {
                    pz.translate(pixel_info.x * this.#cell_size.x, 0.0, pixel_info.y * this.#cell_size.z + this.#cell_size.x / 2.0);
                    geometries.push(pz);
                }
                near_pixel_info = this.level_image.get_pixel_info(this.level_image.convert_coord_to_index(pixel_info.x, pixel_info.y - 1))
                if (!this.is_wall(near_pixel_info)) {
                    nz.translate(pixel_info.x * this.#cell_size.x, 0.0, pixel_info.y * this.#cell_size.z - this.#cell_size.x / 2.0);
                    geometries.push(nz);
                }
            }
        });
        const maze_geo = BufferGeometryUtils.mergeGeometries(geometries, true);
        this.resources.set_geometry('maze', maze_geo);
        for (const geometry of geometries) {
            geometry.dispose();
        }

        if (this.maze_mesh) {
            this.maze_mesh.geometry = maze_geo;
            this.maze_mesh.material = this.default_wall_mat;
            //offset the position incase y changed
            this.maze_mesh.position.y = this.#cell_size.y / 2.0;
        }
        else {
            this.maze_mesh = new THREE.Mesh(maze_geo, this.default_wall_mat);
            this.maze_mesh.name = 'maze';
            this.maze_mesh.position.y = this.#cell_size.y / 2.0;
            this.add(this.maze_mesh);
        }

    }

    #create_static_border(id) {
        const half_cell_size = this.#cell_size.clone().divideScalar(2.0);
        const geometries = [];
        let border_geo = null;
        let border = null;
        if (this.static_objects[id]) {
            border = this.static_objects[id];
            border.geometry.dispose();
            border = null;
        }
        if (id == this.KEYS.BORDER.NORTH) {
            for (let i = 0; i < this.level_image.image.height; i++) {
                //okay these need to be in the loop or get clone from an fixed instance(but this needs to clone the vectors too)
                const plane = new THREE.PlaneGeometry(this.#cell_size.z, this.#cell_size.y);
                plane.translate(i * this.#cell_size.x, 0, - this.#cell_size.z / 2);
                geometries.push(plane);
            }
            border_geo = BufferGeometryUtils.mergeGeometries(geometries, true);
            border = new THREE.Mesh(border_geo, this.default_wall_mat);
        }
        else if (id == this.KEYS.BORDER.SOUTH) {
            for (let i = 0; i < this.level_image.image.height; i++) {
                const plane = new THREE.PlaneGeometry(this.#cell_size.z, this.#cell_size.y).rotateY(Math.PI);
                plane.translate(i * this.#cell_size.x, 0, this.level_image.image.width * 2 - half_cell_size.z);
                geometries.push(plane);
            }
            border_geo = BufferGeometryUtils.mergeGeometries(geometries, true);
            border = new THREE.Mesh(border_geo, this.default_wall_mat);
        }
        else if (id == this.KEYS.BORDER.EAST) {
            for (let i = 0; i < this.level_image.image.height; i++) {
                const plane = new THREE.PlaneGeometry(this.#cell_size.x, this.#cell_size.y).rotateY(-Math.PI / 2);
                plane.translate(this.level_image.image.height * 2 - half_cell_size.x, 0, i * this.#cell_size.z);
                geometries.push(plane);
            }
            border_geo = BufferGeometryUtils.mergeGeometries(geometries, true);
            border = new THREE.Mesh(border_geo, this.default_wall_mat);
        }
        else if (id == this.KEYS.BORDER.WEST) {
            for (let i = 0; i < this.level_image.image.height; i++) {
                const plane = new THREE.PlaneGeometry(this.#cell_size.x, this.#cell_size.y).rotateY(Math.PI / 2);
                plane.translate(-half_cell_size.x, 0, i * this.#cell_size.z);
                geometries.push(plane);
            }
            border_geo = BufferGeometryUtils.mergeGeometries(geometries, true);
            border = new THREE.Mesh(border_geo, this.default_wall_mat);
        }
        this.resources.set_geometry(id, border_geo)
        this.static_objects[id] = border
        border.name = id;
        border.position.y = half_cell_size.y;
        this.add(border);
        for (const geometry of geometries) {
            geometry.dispose();
        }
        return border;
    }
    #create_static_floor() {
        let floor;
        if (this.KEYS.BORDER.FLOOR in this.static_objects) {
            floor = this.static_objects[this.KEYS.BORDER.FLOOR];
        }
        else {
            floor = new THREE.Mesh(this.default_area_geo, this.default_floor_mat);
        }
        this.static_objects[this.KEYS.BORDER.FLOOR] = floor;
        floor.name = this.KEYS.BORDER.FLOOR;
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(this.level_image.image.height * this.#cell_size.x / 2.0 - this.#cell_size.x / 2.0, 0.0, this.level_image.image.width * this.#cell_size.z / 2.0 - this.#cell_size.z / 2.0);
        this.add(floor);
        return floor;
    }
    #create_static_ceil() {
        let ceil;
        if (this.KEYS.BORDER.CEIL in this.static_objects) {
            ceil = this.static_objects[this.KEYS.BORDER.CEIL];
        }
        else {
            ceil = new THREE.Mesh(this.default_area_geo, this.default_ceil_mat);
        }
        this.static_objects[this.KEYS.BORDER.CEIL] = ceil;
        ceil.name = this.KEYS.BORDER.CEIL;
        ceil.rotation.x = Math.PI / 2;
        ceil.position.set(this.level_image.image.height * this.#cell_size.x / 2.0 - this.#cell_size.x / 2.0, this.#cell_size.y, this.level_image.image.width * this.#cell_size.z / 2.0 - this.#cell_size.z / 2.0);
        this.add(ceil);
        return ceil;
    }
    get north_border() { return this.#create_static_border(this.KEYS.BORDER.NORTH); }
    get south_border() { return this.#create_static_border(this.KEYS.BORDER.SOUTH); }
    get east_border() { return this.#create_static_border(this.KEYS.BORDER.EAST); }
    get west_border() { return this.#create_static_border(this.KEYS.BORDER.WEST); }
    get static_floor() { return this.#create_static_floor(); }
    get static_ceil() { return this.#create_static_ceil(); }
    build() {
        //This build all the parts of the level
        //NOTE: should have the create function also reset the states
        //of the meshes to the new state of the level
        this.build_maze();
        this.#create_static_border(this.KEYS.BORDER.NORTH);
        this.#create_static_border(this.KEYS.BORDER.SOUTH);
        this.#create_static_border(this.KEYS.BORDER.EAST);
        this.#create_static_border(this.KEYS.BORDER.WEST);
        this.#create_static_floor();
        this.#create_static_ceil();
    }
    //this is here to prevent setting it
    get_cell_size() { return this.#cell_size; }
    //if levels need to be dynamicly added or removed, then this need to be called to clean up certain loose objects

    //todo: handle this better
    load_resources() {

        const self = this;
        this.resources.load_resource('texture.png', 'texture', Resource_Manager.KEYS.TYPES.TEXTURE, (texture) => {
            self.default_wall_mat.map = texture;
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping
        });

    }
    constructor(canvas, source_image = Level.default_source_image) {
        super();
        this.resources = Resource_Manager.default_instance; //cache the Resource_Manager so it could be overrided
        this.load_resources();
        this.level_image = new Level_Image(source_image);
        this.background = new THREE.Color(0x444444);
        this.renderer = this.resources.get_renderer(
            'main',
            new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true })
        )
        this.renderer.setSize(canvas.width, canvas.height);
    }
}
