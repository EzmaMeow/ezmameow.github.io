import {TextureLoader, Vector3, MeshLambertMaterial, Box3,PlaneGeometry,Mesh} from 'three';
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import * as Game_Utils from './game_utility.js'
import * as CANNON from "https://esm.sh/cannon-es";
import { Resource_Manager } from './resource_manager.js'
import { Level } from './game_scenes.js'

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

export class Maze_Level extends Level {
    //may relocate the loader. it here since level (along with maze_game) will be acess often, but I may add
    //a static class for hold disposable types of reusable nature
    static loader = new TextureLoader();
    static default_source_image = "assets/maze.png";
    level_image;
    //TODO: allow this to be set, but would need to:
    //update all cache object base off of it 
    //rebuild the world and adjust all object to the new positions
    #cell_size = new Vector3(2.0, 2.0, 2.0);

    static_objects = {};

    get default_wall_mat() {
        return this.resources.get_geometry('wall', new MeshLambertMaterial({ color: 0x6a7a8c, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 10 }));
    }
    get default_floor_mat() {
        return this.resources.get_geometry('floor', new MeshLambertMaterial({ color: 0x6f7d6f, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 10 }));
    }
    get default_ceil_mat() {
        return this.resources.get_geometry('ceil', new MeshLambertMaterial({ color: 0x7f7f7f, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 10 }));
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
        return Game_Utils.get_cell_position(position, this.#cell_size).add(new Vector3(0, this.#cell_size.y / 2, 0));
    }
    get_neighboring_pixels(pixel_data) {
        const pixels_data = {};
        //NOTE: This is the direction they are facing. a wall blocking the east will generater a west facing wall if handle by the empty space west of the wall.
        //pixels_data['source'] = pixel_data;//this.get_pixel_info(this.level_image.convert_coord_to_index(pixel_data.x,pixel_data.y));
        pixels_data['north'] = this.level_image.get_pixel_info(this.level_image.convert_coord_to_index(pixel_data.x, pixel_data.y - 1));
        pixels_data['south'] = this.level_image.get_pixel_info(this.level_image.convert_coord_to_index(pixel_data.x, pixel_data.y + 1));
        pixels_data['west'] = this.level_image.get_pixel_info(this.level_image.convert_coord_to_index(pixel_data.x - 1, pixel_data.y));
        pixels_data['east'] = this.level_image.get_pixel_info(this.level_image.convert_coord_to_index(pixel_data.x + 1, pixel_data.y));
        return pixels_data;
    }
    is_wall(pixel_info, height = 0) {
        //will treat null as a wall unless need to extend pass bounds
        if (pixel_info === null) {
            return true
        }
        if (height == 0) { return pixel_info.r < 128 }
        if (height == 1) { return pixel_info.g < 128 }
        if (height == 2) { return pixel_info.b < 128 }
        return null;
        //return pixel_info.r < 128 && pixel_info.g < 128 && pixel_info.b < 128;
    }
    //get the cell as a box. if a box is passed, then it will reset it to the bounds
    //if coords are provide, then it will also translate it
    get_cell_bounds(coords = null, bounds = null) {
        if (bounds) {
            bounds.min.copy(this.get_cell_lower_boundary());
            bounds.max.copy(this.get_cell_upper_boundary());
        }
        else {
            bounds = new Box3(this.get_cell_lower_boundary(), this.get_cell_upper_boundary())
        }
        if (coords) {
            bounds.translate(this.get_cell_world_position(coords));
        }
        return bounds;
    }
    build_maze() {
        const geometries = [];
        //note: geos should be group base on their needed materials
        //such as wall, floor, and ceil plus overrides

        if (this.maze_body) {
            this.maze_body.shapes.length = 0;
        }
        else {
            this.maze_body = new CANNON.Body({
                mass: 0,
                type: CANNON.Body.STATIC
            });
            this.world.addBody(this.maze_body);
        }
        //Todo: move the plane geo to geos and have a function or getter that update them
        this.level_image.for_each_pixel((pixel_info) => {
            //cacheing these in the resources so they do not need to be manually disposed (mostly the borders handling it would be a pain to disposed). 
            //the issue is they need to be update on image change and first time running need to create them twice plus the loop
            const pixels_data = this.get_neighboring_pixels(pixel_info);
            if (this.is_wall(pixel_info)) {
                this.maze_body.addShape(
                    new CANNON.Box(this.get_cell_size().clone().divideScalar(2.0)),
                    new CANNON.Vec3(pixel_info.x * this.#cell_size.x, this.#cell_size.y / 2.0, pixel_info.y * this.#cell_size.z)
                )
            }
            else {
                if (this.is_wall(pixels_data.west)) {
                    const face = this.resources.get_resource('east_face', Resource_Manager.KEYS.TYPES.GEOMETRY).clone();
                    face.translate(pixel_info.x * this.#cell_size.x - this.#cell_size.z / 2.0, 0.0, pixel_info.y * this.#cell_size.z);
                    geometries.push(face);
                }
                if (this.is_wall(pixels_data.east)) {
                    const face = this.resources.get_resource('west_face', Resource_Manager.KEYS.TYPES.GEOMETRY).clone();
                    face.translate(pixel_info.x * this.#cell_size.x + this.#cell_size.z / 2.0, 0.0, pixel_info.y * this.#cell_size.z);
                    geometries.push(face);
                }
                if (this.is_wall(pixels_data.south)) {
                    const face = this.resources.get_resource('north_face', Resource_Manager.KEYS.TYPES.GEOMETRY).clone();
                    face.translate(pixel_info.x * this.#cell_size.x, 0.0, pixel_info.y * this.#cell_size.z + this.#cell_size.x / 2.0);
                    geometries.push(face);
                }
                if (this.is_wall(pixels_data.north)) {
                    const face = this.resources.get_resource('south_face', Resource_Manager.KEYS.TYPES.GEOMETRY).clone();
                    face.translate(pixel_info.x * this.#cell_size.x, 0.0, pixel_info.y * this.#cell_size.z - this.#cell_size.x / 2.0);
                    geometries.push(face);
                }

                //building ceil and floor of an empty cell
                if (!this.is_wall(pixel_info, -1)) {
                    const face = this.resources.get_resource('up_face', Resource_Manager.KEYS.TYPES.GEOMETRY).clone();
                    face.translate(pixel_info.x * this.#cell_size.x, -this.#cell_size.y / 2.0, pixel_info.y * this.#cell_size.z);
                    geometries.push(face);
                }
                if (!this.is_wall(pixel_info, 1)) {
                    const face = this.resources.get_resource('down_face', Resource_Manager.KEYS.TYPES.GEOMETRY).clone();
                    face.translate(pixel_info.x * this.#cell_size.x, this.#cell_size.y / 2.0, pixel_info.y * this.#cell_size.z);
                    geometries.push(face);
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
            this.maze_mesh = new Mesh(maze_geo, this.default_wall_mat);
            this.maze_mesh.name = 'maze';
            this.maze_mesh.position.y = this.#cell_size.y / 2.0;
            this.add(this.maze_mesh);
        }

    }

    update_geometries() {
        //could check and update, but bruteforcing it at the moment
        this.resources.set_resource('east_face', new PlaneGeometry(this.#cell_size.x, this.#cell_size.y).rotateY(Math.PI / 2), Resource_Manager.KEYS.TYPES.GEOMETRY); // +X //left to right of int spawn facing (|->)
        this.resources.set_resource('west_face', new PlaneGeometry(this.#cell_size.x, this.#cell_size.y).rotateY(-Math.PI / 2), Resource_Manager.KEYS.TYPES.GEOMETRY); // -X (<-|)
        this.resources.set_resource('south_face', new PlaneGeometry(this.#cell_size.z, this.#cell_size.y), Resource_Manager.KEYS.TYPES.GEOMETRY); // +Z //(v) (south)
        this.resources.set_resource('north_face', new PlaneGeometry(this.#cell_size.z, this.#cell_size.y).rotateY(Math.PI), Resource_Manager.KEYS.TYPES.GEOMETRY); // -Z (^) the look direction (north)

        this.resources.set_resource('down_face', new PlaneGeometry(this.#cell_size.x, this.#cell_size.z).rotateX(Math.PI / 2), Resource_Manager.KEYS.TYPES.GEOMETRY); //ceil
        this.resources.set_resource('up_face', new PlaneGeometry(this.#cell_size.x, this.#cell_size.z).rotateX(-Math.PI / 2), Resource_Manager.KEYS.TYPES.GEOMETRY); //floor

    }
    //this is the new bounds system. this should be called once or redesign to only create missing bound.
    //or used to replace borders and floor (ceil provably not needed, but may be if no ceil collison is generated at top level)
    create_bounds() {
        if (!this.floor_bounds) {
            this.floor_bounds = new CANNON.Body({
                type: CANNON.Body.STATIC,
                shape: new CANNON.Plane(),
            })
            this.world.addBody(this.floor_bounds)
        }
        this.floor_bounds.quaternion.setFromEuler(-Math.PI / 2, 0, 0)

        if (!this.north_bounds) {
            this.north_bounds = new CANNON.Body({
                type: CANNON.Body.STATIC,
                shape: new CANNON.Plane(),
            })
            this.world.addBody(this.north_bounds)
        }
        this.north_bounds.quaternion.setFromEuler(0, 0, 0)
        this.north_bounds.position.z = -this.#cell_size.z / 2.0

        if (!this.south_bounds) {
            this.south_bounds = new CANNON.Body({
                type: CANNON.Body.STATIC,
                shape: new CANNON.Plane(),
            })
            this.world.addBody(this.south_bounds)
        }
        this.south_bounds.quaternion.setFromEuler(Math.PI, 0, 0)
        this.south_bounds.position.z = this.level_image.image.width * 2 - this.#cell_size.z / 2.0

        if (!this.west_bounds) {
            this.west_bounds = new CANNON.Body({
                type: CANNON.Body.STATIC,
                shape: new CANNON.Plane(),
            })
            this.world.addBody(this.west_bounds)
        }
        this.west_bounds.quaternion.setFromEuler(0, Math.PI / 2, 0)
        this.west_bounds.position.x = -this.#cell_size.x / 2.0

        if (!this.east_bounds) {
            this.east_bounds = new CANNON.Body({
                type: CANNON.Body.STATIC,
                shape: new CANNON.Plane(),
            })
            this.world.addBody(this.east_bounds)
        }
        this.east_bounds.quaternion.setFromEuler(0, -Math.PI / 2, 0)
        this.east_bounds.position.x = this.level_image.image.height * 2 - this.#cell_size.x / 2.0

    }
    build() {
        this.update_geometries();
        this.build_maze();
        this.create_bounds();

    }
    //this is here to prevent setting it
    get_cell_size() { return this.#cell_size; }
    //if levels need to be dynamicly added or removed, then this need to be called to clean up certain loose objects

    //todo: handle this better
    load_resources() {

        const self = this;
        this.resources.load_resource('assets/texture.png', 'texture', Resource_Manager.KEYS.TYPES.TEXTURE, (texture) => {
            self.default_wall_mat.map = texture;
            texture.wrapS = texture.wrapT = 1000;//THREE.RepeatWrapping
        });
        this.resources.load_resource('assets/lightmap.png', 'lightmap', Resource_Manager.KEYS.TYPES.TEXTURE, (texture) => {
            //the lightmap is a test
            self.default_wall_mat.lightmap = texture;
            self.default_floor_mat.lightmap = texture;
            self.default_ceil_mat.lightmap = texture;
        });

    }
    constructor(canvas, world, source_image = Maze_Level.default_source_image) {
        super(world);
        this.resources = Resource_Manager.default_instance; //cache the Resource_Manager so it could be overrided
        this.load_resources();
        this.level_image = new Level_Image(source_image);

        //this.renderer = this.resources.get_renderer(
        //    'main',
        //    new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true })
        //)
        //this.renderer.setSize(canvas.width, canvas.height);
    }
}
