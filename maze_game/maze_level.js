import { TextureLoader, Vector3, Box3, PlaneGeometry, Mesh, MeshStandardMaterial, FileLoader } from 'three';
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import * as Game_Utils from './game_utility.js'
import * as CANNON from "https://esm.sh/cannon-es";
import { Resource_Manager } from './resource_manager.js'
import { Level } from './game_scenes.js'
import { Signal } from './game_core.js'

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
        console.log('image size : ', source.image.height, this)
        source.on_ready();
    }
    //GETTERS AND SETTERS
    //may not store the image or other varibles related to the dom
    set image(value) {
        const old_image = this.#image;
        if (this.#image === value) { return; }
        this.#image = value;
        if (value) {
            this.#image.onload = (event) => { this.#on_load(event, this); };
        }
        if (old_image) {
            this.#image.onload = null;
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
    is_pixel_at_index(index) {
        return (index < 0 || index >= this.data.length)
    }
    get_pixel_id(index) {
        return Math.floor(index / 4)
    }
    get_pixel_x(id) {
        return id > 0 ? id % this.image.width : 0;
    }
    get_pixel_y(id) {
        return id > 0 ? Math.floor(id / this.image.width) : 0;
    }
    get_pixel_r(index) {
        return this.data[index];
    }
    get_pixel_g(index) {
        return this.data[index + 1];
    }
    get_pixel_b(index) {
        return this.data[index + 2];
    }
    get_pixel_a(index) {
        return this.data[index + 3];
    }
    get_pixel_info(index, pixel_data = {}) {
        if (this.is_pixel_at_index(index)) {
            pixel_data.id = -1;
            pixel_data.x = 0;
            pixel_data.y = 0;
            pixel_data.r = 0;
            pixel_data.g = 0;
            pixel_data.b = 0;
            pixel_data.a = 0;
        }
        //let pixel_data = { 'id': Math.floor(index / 4) };
        pixel_data.id = this.get_pixel_id(index);

        pixel_data.x = this.get_pixel_x(pixel_data.id);
        pixel_data.y = this.get_pixel_y(pixel_data.id);

        pixel_data.r = this.get_pixel_r(index);
        pixel_data.g = this.get_pixel_g(index);
        pixel_data.b = this.get_pixel_b(index);
        pixel_data.a = this.get_pixel_a(index);
        return pixel_data;
    }
    for_each_pixel(callable = (pixel_info) => { }, start = 0, end = this.data.length, pixel_info_ref = undefined) {
        start = Math.floor(start / 4) * 4;
        for (let i = start; i < end; i += 4) {
            callable(this.get_pixel_info(i, pixel_info_ref ? pixel_info_ref : {}));
        }
    }
    destroy() {
        if (this.image) {
            this.image.onload = null;
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
    static default_source_image = "assets/maze.png";
    static #FLAGS = { FLOOR: 1 << 0, CEIL: 1 << 1, RAMP: 1 << 2, VARIATION: 1 << 3, MESH: 1 << 4, BLOCK: 1 << 5, BOUNDS: 1 << 6 };
    static get FLAGS() { return this.#FLAGS };
    static #DIRECTIONS = { NORTH: 0, EAST: 1, SOUTH: 2, WEST: 3 };
    static get DIRECTIONS() { return this.#DIRECTIONS };

    #file_loader = new FileLoader();

    //called when ready to used. will be called when ever the level is rebuilt
    #on_ready = new Signal(); get on_ready() { return this.#on_ready; }
    //this will be called when the level is changing aka loading image/file/data. should be used to trigger loading screens and pausing/restarting gameplay
    #on_load = new Signal(); get on_load() { return this.#on_load; }

    #level_image; get level_image() { return this.#level_image; }
    set level_image(value) {
        if (value === this.#level_image) { return; }
        const old_level_image = this.#level_image;
        this.#level_image = value;
        if (this.#level_image) {
            this.#level_image.on_ready = () => this.level_image_ready();
        }
        if (old_level_image) {
            old_level_image.on_ready = null;
            old_level_image.destroy();
        }

    }
    //TODO: allow this to be set, but would need to:
    //update all cache object base off of it 
    //rebuild the world and adjust all object to the new positions
    #cell_size = new Vector3(3.0, 3.0, 3.0); get cell_size() { return this.#cell_size; }

    static_objects = {};

    //NOTE: json file will be used for setting up reosources
    //it will state things to preload (textures)
    //but also may state id(of textures) used for materials as well as other properties (color)

    get default_wall_mat() {
        return this.resources.get_material('default_wall', new MeshStandardMaterial({ color: 0x6a7a8c, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 10 }));
    }
    get default_floor_mat() {
        return this.resources.get_material('default_floor', new MeshStandardMaterial({ color: 0x7f7f7f, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 10 }));
    }
    get default_ceil_mat() {
        return this.resources.get_material('default_ceil', new MeshStandardMaterial({ color: 0x6f7d6f, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 10 }));
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
        //Note: cant reused ref unless check all possibe invalid cases. also get pixel info might set a point null. may be better to indirectly get the info 
        //the issues is this is a bit complex to roll out
        const pixels_data = {};
        //NOTE: This is the direction they are facing. a wall blocking the east will generater a west facing wall if handle by the empty space west of the wall.
        pixels_data['north'] = this.level_image.get_pixel_info(this.level_image.convert_coord_to_index(pixel_data.x, pixel_data.y - 1));
        pixels_data['south'] = this.level_image.get_pixel_info(this.level_image.convert_coord_to_index(pixel_data.x, pixel_data.y + 1));
        pixels_data['west'] = this.level_image.get_pixel_info(this.level_image.convert_coord_to_index(pixel_data.x - 1, pixel_data.y));
        pixels_data['east'] = this.level_image.get_pixel_info(this.level_image.convert_coord_to_index(pixel_data.x + 1, pixel_data.y));
        return pixels_data;
    }
    get_height_color(pixel_info, height = 0) {
        if (pixel_info === null || pixel_info.id < 0) { return -1 }
        if (height == 0) { return pixel_info.r }
        if (height == 1) { return pixel_info.g }
        if (height == 2) { return pixel_info.b }
        if (height == 3) { return pixel_info.a }
        return -1

    }
    get_cell_type(pixel_info, height = 0) {
        //blocks do not care about floors or ceils or mesh since it takes up the full space
        //also, for now, out of bounds (aka null) is consider blocking 
        const color_value = this.get_height_color(pixel_info, height);
        const cell_type = {
            'type': 0,
            'index': color_value,
            'id': 0,
            'variation': 0,
            'flags': 0
        }
        if (color_value < 0) {
            cell_type.type |= Maze_Level.FLAGS.BOUNDS;
            return cell_type
        }
        if (color_value >= 240) {
            if (color_value !== 255) {
                cell_type.type |= Maze_Level.FLAGS.VARIATION
            }
            cell_type.type |= Maze_Level.FLAGS.BLOCK;
            return cell_type
        }
        cell_type.flags = color_value % 4;
        cell_type.id = Math.floor(color_value / (4 * 4));
        cell_type.variation = Math.floor(color_value / 4) % 4;
        //todo: (okay will use flags for floor and ceil)(this means 14 types plus 15 for block variation(material) or other data. 
        //the types can also have 4 variations. normally this is directional but could be materials or subtype if it dose not have direction)
        //0:north,1:east,2:south,3:west or the varition if a volumes (like safe, unsafe or something)
        //note: this will be ran each color check. so this represents to cell in focus.
        if (cell_type.flags & Maze_Level.FLAGS.FLOOR) {
            cell_type.type |= Maze_Level.FLAGS.FLOOR
        }
        if (cell_type.flags & Maze_Level.FLAGS.CEIL) {
            cell_type.type |= Maze_Level.FLAGS.CEIL
        }
        //todo also check if greater than the reseved flags abount (floor and ceil. probably aroung 4)
        //note: the id will be offset when either flag is set. so the id will depends on the flag set (also ignoring 255)
        if (cell_type.id > 1) {
            cell_type.type |= Maze_Level.FLAGS.MESH
            //as long as block returns, this will work, else  this will also need to check if less than 255
        }
        else if (cell_type.id === 1) {
            //NOTE: ramp may have floor and ceil.this may be desired to fake dead end ramps
            //using id 1 since id 0 do not have enough to represent empty space and directional
            cell_type.type |= Maze_Level.FLAGS.RAMP
        }
        if (cell_type.variation > 0) {
            //if not 0, then the direction(north) or variation is diffrent from default
            cell_type.type |= Maze_Level.FLAGS.VARIATION
        }
        return cell_type;
        //TODO: Mesh flag is onlt set if the value is not the flags values and not 255


    }
    //may need to use the color value instead of pixel info and height since it can call it a lot
    //But may be better to pass if it is a wall, floor, or ceil (flags) and compare that
    //since wall wont need collsions
    is_wall(cell_type = 0) {
        return (Maze_Level.FLAGS.BLOCK & cell_type);
    }
    is_bounds(cell_type = 0) {
        return (Maze_Level.FLAGS.BOUNDS & cell_type);
    }
    has_floor(cell_type) {
        return (Maze_Level.FLAGS.FLOOR & cell_type);
    }
    has_ceil(cell_type) {
        return (Maze_Level.FLAGS.CEIL & cell_type);
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
    //segments will have a mesh and a body (and maybe others). note: walls and floor would be two diffrent segments
    //but they should be added in the same order so lookup should not be too hard (may be an issue of also includeing meshes as seprate segments)
    create_maze_segment(geometry, material, body = undefined) {
        if (!this.maze_segments) { this.maze_segments = new Set() }
        const segment = {
            mesh: geometry && material ? new Mesh(geometry, material) : undefined,
            body: body
        };
        this.maze_segments.add(segment)
        if (segment.mesh) {
            segment.mesh.name = 'maze_segment_' + String(this.maze_segments.size - 1);
            segment.mesh.position.y = this.#cell_size.y / 2.0;
            this.add(segment.mesh);
        }
        if (body) {
            segment.body = body;
            this.world.addBody(segment.body)
        }
        return segment;
    }
    update_maze_segments() {
        //this is here incase the cell size changes
        if (!this.maze_segments) { return }
        for (const segment of this.maze_segments) {
            if (segment.mesh) {
                segment.mesh.position.y = this.#cell_size.y / 2.0;
            }
        }
    }
    clear_maze_segments() {
        if (!this.maze_segments) { return }
        for (const segment of this.maze_segments) {
            if (segment.mesh) {
                if (segment.mesh.geometry) {
                    segment.mesh.geometry.dispose();
                }
                this.remove(segment.mesh);
            }
            if (segment.body) {
                segment.body.shapes.length = 0;
                this.world.removeBody(segment.body);
            }
        }
        this.maze_segments.clear();
    }
    //create the walls around an empty cell
    // might move floor and ceil logic here only for blocking cases
    //this might make floor/ceil a little redundent, but also allow each case to be handle diffrently
    //or maybe not since their cases are a bit more picky
    create_wall(pixel_info, cell_type, pixels_data, wall_geometries, wall_body, height) {
        const west_cell_type = this.get_cell_type(pixels_data.west, height);
        if (this.is_wall(west_cell_type.type) || this.is_bounds(west_cell_type.type)) {
            const face = this.resources.get_resource('east_face', Resource_Manager.KEYS.TYPES.GEOMETRY).clone();
            face.translate(pixel_info.x * this.#cell_size.x - this.#cell_size.z / 2.0, this.#cell_size.y * height, pixel_info.y * this.#cell_size.z);
            wall_geometries.push(face);
        }
        const east_cell_type = this.get_cell_type(pixels_data.east, height);
        if (this.is_wall(east_cell_type.type) || this.is_bounds(east_cell_type.type)) {
            const face = this.resources.get_resource('west_face', Resource_Manager.KEYS.TYPES.GEOMETRY).clone();
            face.translate(pixel_info.x * this.#cell_size.x + this.#cell_size.z / 2.0, this.#cell_size.y * height, pixel_info.y * this.#cell_size.z);
            wall_geometries.push(face);
        }
        const south_cell_type = this.get_cell_type(pixels_data.south, height);
        if (this.is_wall(south_cell_type.type) || this.is_bounds(south_cell_type.type)) {
            const face = this.resources.get_resource('north_face', Resource_Manager.KEYS.TYPES.GEOMETRY).clone();
            face.translate(pixel_info.x * this.#cell_size.x, this.#cell_size.y * height, pixel_info.y * this.#cell_size.z + this.#cell_size.x / 2.0);
            wall_geometries.push(face);
        }
        const north_cell_type = this.get_cell_type(pixels_data.north, height);
        if (this.is_wall(north_cell_type.type) || this.is_bounds(north_cell_type.type)) {
            const face = this.resources.get_resource('south_face', Resource_Manager.KEYS.TYPES.GEOMETRY).clone();
            face.translate(pixel_info.x * this.#cell_size.x, this.#cell_size.y * height, pixel_info.y * this.#cell_size.z - this.#cell_size.x / 2.0);
            wall_geometries.push(face);
        }
    }

    //this will also handle ramps since they are batch together with floor
    create_floor(pixel_info, cell_type, pixels_data, floor_geometries, floor_body, height) {
        const up_cell_type = this.get_cell_type(pixel_info, height + 1);
        const down_cell_type = this.get_cell_type(pixel_info, height - 1);
        if (this.has_floor(cell_type.type) || this.is_wall(down_cell_type.type) || this.is_bounds(down_cell_type.type) || this.has_ceil(down_cell_type.type)) {
            const face = this.resources.get_resource('up_face', Resource_Manager.KEYS.TYPES.GEOMETRY).clone();
            face.translate(pixel_info.x * this.#cell_size.x, this.#cell_size.y * height - this.#cell_size.y / 2.0, pixel_info.y * this.#cell_size.z);
            floor_geometries.push(face);
        }
        //if (this.is_wall(pixel_info, i + 1)) {
        if (this.has_ceil(cell_type.type) || this.is_wall(up_cell_type.type) || this.is_bounds(up_cell_type.type) || this.has_floor(up_cell_type.type)) {
            const face = this.resources.get_resource('down_face', Resource_Manager.KEYS.TYPES.GEOMETRY).clone();
            face.translate(pixel_info.x * this.#cell_size.x, this.#cell_size.y * height + this.#cell_size.y / 2.0, pixel_info.y * this.#cell_size.z);
            floor_geometries.push(face);
            //NOTE also checking if floor above
            if (!this.is_wall(up_cell_type.type) || this.is_bounds(up_cell_type.type)) {
                floor_body.addShape(
                    new CANNON.Box(new CANNON.Vec3(this.#cell_size.x / 2.0, 0.01, this.#cell_size.z / 2.0)),
                    new CANNON.Vec3(pixel_info.x * this.#cell_size.x, this.#cell_size.y * height + this.#cell_size.y, pixel_info.y * this.#cell_size.z)
                );
            }
        }

        //slopes. will treat them as floor(up) or ceil(down) for geo
        if ((Maze_Level.FLAGS.RAMP & cell_type.type)) {
            //NOTE: may create a wedge instead in the future. this approch currently is easier to make sure it works
            const face_up = this.resources.get_resource('slope_up_face', Resource_Manager.KEYS.TYPES.GEOMETRY).clone().rotateY(-cell_type.variation * (Math.PI / 2));
            const face_down = this.resources.get_resource('slope_down_face', Resource_Manager.KEYS.TYPES.GEOMETRY).clone().rotateY(-cell_type.variation * (Math.PI / 2));
            face_up.translate(pixel_info.x * this.#cell_size.x, this.#cell_size.y * height, pixel_info.y * this.#cell_size.z);
            face_down.translate(pixel_info.x * this.#cell_size.x, this.#cell_size.y * height, pixel_info.y * this.#cell_size.z);
            floor_geometries.push(face_up);
            floor_geometries.push(face_down);
            const ramp_shape = new CANNON.Box(new CANNON.Vec3(this.#cell_size.x / 2.0, 0.01, Math.sqrt(this.#cell_size.z * this.#cell_size.z + this.#cell_size.y * this.#cell_size.y) / 2.0))
            floor_body.addShape(
                ramp_shape,
                new CANNON.Vec3(pixel_info.x * this.#cell_size.x, this.#cell_size.y * height + this.#cell_size.y / 2.0, pixel_info.y * this.#cell_size.z),
                new CANNON.Quaternion().setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -cell_type.variation * Math.PI / 2).mult(new CANNON.Quaternion().setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 4))
            );
        }
    }

    build_maze(on_ready) {
        let segment_id = 0;
        const size = 64 * 4;
        this.clear_maze_segments();
        const step = () => {

            const wall_geometries = [];
            const floor_geometries = [];



            const wall_body = new CANNON.Body({
                mass: 0,
                type: CANNON.Body.STATIC
            });
            const floor_body = new CANNON.Body({
                mass: 0,
                type: CANNON.Body.STATIC
            });

            //will store the mesh and body as a object in a set
            //that can all be cleared on a new level.
            //we could reused the mesh, but it be easier to recreate them more so if we want to manage chunks better
            //TODO: Split for each pixel into segments and handle them via request animation frame
            //this means the create maze segment should be part of the segment as well as the geo and body
            //declaration. segments probably will be 3-4 cell high and 16x16 though it probably can handle 32 just fine. 
            //just need to chunk it if images get as big as 128. 

            const pixel_info = {};
            this.level_image.for_each_pixel(() => {
                //cacheing these in the resources so they do not need to be manually disposed (mostly the borders handling it would be a pain to disposed). 
                //the issue is they need to be update on image change and first time running need to create them twice plus the loop
                const pixels_data = this.get_neighboring_pixels(pixel_info);
                //console.log(pixel_info.x,pixel_info.y,pixel_info.r,pixel_info.g,pixel_info.b,pixel_info.a);
                for (let i = 0; i < 3; i++) {
                    //if ((Maze_Level.FLAGS.BLOCK & this.get_cell_type(pixel_info, i)) ){
                    let cell_type = this.get_cell_type(pixel_info, i);
                    if (this.is_wall(cell_type.type) || this.is_bounds(cell_type.type)) {
                        wall_body.addShape(
                            new CANNON.Box(this.get_cell_size().clone().divideScalar(2.0)),
                            new CANNON.Vec3(pixel_info.x * this.#cell_size.x, this.#cell_size.y * i + this.#cell_size.y / 2.0, pixel_info.y * this.#cell_size.z)
                        )
                    }
                    else {
                        //probably can add cell type
                        this.create_wall(pixel_info, cell_type, pixels_data, wall_geometries, wall_body, i);
                        this.create_floor(pixel_info, cell_type, pixels_data, floor_geometries, floor_body, i)
                    }
                }
            }, segment_id * size, Math.min(this.level_image.data.length, (segment_id + 1) * size), pixel_info);
            if (wall_geometries.length >= 0) {

            }
            const maze_wall_geo = wall_geometries.length > 0 ? BufferGeometryUtils.mergeGeometries(wall_geometries, true) : null;
            const maze_floor_geo = floor_geometries.length > 0 ? BufferGeometryUtils.mergeGeometries(floor_geometries, true) : null;
            //const maze_ceil_geo = BufferGeometryUtils.mergeGeometries(ceil_geometries, true);
            //note: only storing it since this will dispose existing resources. could do it manually (but there may be a benifity of having the geo being looked up publicly)
            this.resources.set_geometry('maze_walls', maze_wall_geo);
            this.resources.set_geometry('maze_floors', maze_floor_geo);
            //this.resources.set_geometry('maze_ceil', maze_ceil_geo);
            for (const geometry of wall_geometries) {
                geometry.dispose();
            }
            for (const geometry of floor_geometries) {
                geometry.dispose();
            }
            //for (const geometry of ceil_geometries) {
            //    geometry.dispose();
            //}
            this.create_maze_segment(maze_wall_geo, this.default_wall_mat, wall_body);
            this.create_maze_segment(maze_floor_geo, this.default_floor_mat, floor_body);
            //this.create_maze_segment(maze_ceil_geo, this.default_ceil_mat);
            if ((segment_id+1) * size < this.level_image.data.length) {
                segment_id += 1;
                requestAnimationFrame(step);
            }
            else {
                if (on_ready) {
                    on_ready();
                }
            }
        }
        requestAnimationFrame(step);
    }

    update_geometries() {
        //could check and update, but bruteforcing it at the moment
        //also most of these are clone, so could compress it to wall(north, east), ceil, floor, and slope and rotate them in the desired direction
        //it depends on how the uses x,y,z. floor and ceil could be one as well just need to rotate it 180, use double face, or use a floor cube(though would need to modify material for that)
        //but if storing them cost barly any memory, them may as well store them to reduce math per part
        this.resources.set_resource('east_face', new PlaneGeometry(this.#cell_size.x, this.#cell_size.y).rotateY(Math.PI / 2), Resource_Manager.KEYS.TYPES.GEOMETRY); // +X //left to right of int spawn facing (|->)
        this.resources.set_resource('west_face', new PlaneGeometry(this.#cell_size.x, this.#cell_size.y).rotateY(-Math.PI / 2), Resource_Manager.KEYS.TYPES.GEOMETRY); // -X (<-|)
        this.resources.set_resource('south_face', new PlaneGeometry(this.#cell_size.z, this.#cell_size.y), Resource_Manager.KEYS.TYPES.GEOMETRY); // +Z //(v) (south)
        this.resources.set_resource('north_face', new PlaneGeometry(this.#cell_size.z, this.#cell_size.y).rotateY(Math.PI), Resource_Manager.KEYS.TYPES.GEOMETRY); // -Z (^) the look direction (north)

        this.resources.set_resource('down_face', new PlaneGeometry(this.#cell_size.x, this.#cell_size.z).rotateX(Math.PI / 2), Resource_Manager.KEYS.TYPES.GEOMETRY); //ceil
        this.resources.set_resource('up_face', new PlaneGeometry(this.#cell_size.x, this.#cell_size.z).rotateX(-Math.PI / 2), Resource_Manager.KEYS.TYPES.GEOMETRY); //floor

        this.resources.set_resource('slope_up_face', new PlaneGeometry(this.#cell_size.x, Math.sqrt(this.#cell_size.z * this.#cell_size.z + this.#cell_size.y * this.#cell_size.y)).rotateX(-Math.PI / 4), Resource_Manager.KEYS.TYPES.GEOMETRY);
        this.resources.set_resource('slope_down_face', new PlaneGeometry(this.#cell_size.x, Math.sqrt(this.#cell_size.z * this.#cell_size.z + this.#cell_size.y * this.#cell_size.y)).rotateX(Math.PI / 4).rotateY(Math.PI), Resource_Manager.KEYS.TYPES.GEOMETRY);
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
        this.south_bounds.position.z = this.level_image.image.width * this.#cell_size.z - this.#cell_size.z / 2.0

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
        this.east_bounds.position.x = this.level_image.image.height * this.#cell_size.x - this.#cell_size.x / 2.0

    }
    build() {
        this.update_geometries();
        this.create_bounds();
        this.build_maze(() => { this.on_ready.emit() });

        //this.on_ready.emit();
    }
    //this is here to prevent setting it
    get_cell_size() { return this.#cell_size; }
    //if levels need to be dynamicly added or removed, then this need to be called to clean up certain loose objects

    load_config(path = 'data/default_level.json') {
        this.clear_cached_resources();
        this.#file_loader.setResponseType('json');
        this.#file_loader.load(path, (result) => this.config_loaded(result), undefined, () => this.config_loaded());
        //note need to handle if there an error. probably build a default object
        //to be used or skip config_loaded or have a specail cases to handle it
        //also decide if this should handle the object directly if not a string (just pass it to config loaded)
    }
    config_loaded(config = undefined) {
        console.log(config)
        this.config = config; //need to verify it is vaild else use a fallback
        //this will set up the level base on the config before
        //passing it to resource loader to load resource/
        //may need to store it in the object if vaild instead of passing it since
        //it will need to be ref a few times
        if (this.config) {
            this.maze_image = this.config.level_image ? this.config.level_image : Maze_Level.default_source_image;
        } else {
            console.log('no config loaded')
            this.maze_image = Maze_Level.default_source_image;
        }
        console.log(this.maze_image);

        this.load_resources();
    }
    //todo: handle this better. NOTE: awaiting any of the load_resources will break them TODO: maybe not use async functions or test it again when handle correctly
    load_resources() {
        this.resources.on_load_end.connect(() => this.resources_loaded());
        if (this.config && this.config.textures) {
            for (const [group_id, group] of Object.entries(this.config.textures)) {
                for (const [id, path] of Object.entries(group)) {
                    this.cache_created_resources(Resource_Manager.KEYS.TYPES.TEXTURE, id);
                    //note: may need to add group id to id, but also need to update the setters to use that id instead
                    this.resources.load_resource(path, id, Resource_Manager.KEYS.TYPES.TEXTURE);
                }
            }
        }
        else {
            console.log('no vaild config loaded, using default level resources')
            //texture is for more detail, but normal map adds the texture from light depth
            this.resources.load_resource('assets/texture.png', 'texture', Resource_Manager.KEYS.TYPES.TEXTURE);
            //normal may or may not be correct. need to check the light order. also could see how bumbmap works if the lighting is simple
            this.resources.load_resource('assets/normal.png', 'normal', Resource_Manager.KEYS.TYPES.TEXTURE);

            //spec(metal) and ao could be merge into a single texture. https://threejs.org/docs/#MeshStandardMaterial has more info about the maps
            this.resources.load_resource('assets/specular.png', 'specular', Resource_Manager.KEYS.TYPES.TEXTURE);

            this.resources.load_resource('assets/ao.png', 'ao', Resource_Manager.KEYS.TYPES.TEXTURE);

            this.resources.load_resource('assets/lightmap.png', 'lightmap', Resource_Manager.KEYS.TYPES.TEXTURE);
        }
    }
    //might be better to move this to resource manager since it may be reusable there
    convert_type(type, value) {
        if (type === Resource_Manager.KEYS.TYPES.TEXTURE) {
            return this.resources.get_texture(value);
        }
        if (type === 'number') {
            return Number(value);
        }
        //'0xRRGGBB' conversion
        if (type === 'hex') {
            return parseInt(value, 16)
        }
        return value;
    }
    //only for simple cases where there is one set of ::
    parce_type_string(string, convert_value = true) {
        if (string.includes("::")) {
            const result = string.split("::");
            if (convert_value) {
                result[1] = this.convert_type(result[0], result[1]);
            }
            return result;
        }
        return ['string', string];
    }
    //store created resources by id so they can be removed
    //when reloading. This is for cases where new resource have a unquie id
    //and will likly not be overriden on reloaded. This could also filter out
    //importaint id if needed, but they probably should be store in self
    //could change resource manager to allow source to be overriden and keep the ref here
    //but the idea is to allow resource to be shared globally if not unquie.
    //include existing is to override ignoring type/id pairs that already exist
    //so if false, it needs to be called before setting that resource.
    cache_created_resources(type, id, include_existing = false) {
        if (!this.cache_resources) { this.cache_resources = {}; }
        if (!this.cache_resources[type]) { this.cache_resources[type] = new Set(); }
        if (!this.resources.has_resource(id, type) || include_existing) {
            this.cache_resources[type].add(id);
        }
    }
    //still need to test disposing logic, but should be called when old level state is no longer needed
    //and before new level state is created
    clear_cached_resources() {
        if (!this.cache_resources) { return; }
        for (const [type, ids] of Object.entries(this.cache_resources)) {
            for (const id of ids) {
                this.resources.dispose(id, type);
            }
        }
    }
    resources_loaded() {
        this.resources.on_load_end.disconnect(() => this.resources_loaded());
        if (this.config && this.config.materials) {
            for (const [material_id, material_data] of Object.entries(this.config.materials)) {
                for (const [property, value_data] of Object.entries(material_data)) {
                    const parced_value = this.parce_type_string(value_data);

                    if (parced_value[1] === null || parced_value[1] === undefined) {
                        console.log('Warning: maze_level resource loader material value to set is ', parced_value[1], ' for ', property)
                    }
                    //need to be call before setting so it can ignore preloaded resources to clear on reload
                    this.cache_created_resources(Resource_Manager.KEYS.TYPES.MATERIAL, material_id);
                    const material = this.resources.get_material(
                        material_id,
                        new MeshStandardMaterial({ color: 0x6a7a8c, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 10 })
                    )
                    if (property === 'color') {
                        material[property].set(parced_value[1])
                    }
                    else {
                        material[property] = parced_value[1];
                    }
                    //I hope this get check on next update and not ran as set. internet been acting up so it is harder to check things
                    material.needsUpdate = true;
                }
            }
        }
        console.log(this.cache_resources);
        this.start_level();

    }
    start_level() {
        console.log('starting level')
        this.level_image = new Level_Image(this.maze_image);

    }
    level_image_ready() {
        this.on_load.emit();
        console.log('started building', this)
        this.build()
    }
    constructor(canvas, world, config_path = 'data/default_level.json') {
        super(world);
        this.resources = Resource_Manager.default_instance; //cache the Resource_Manager so it could be overrided
        //may need to call loading before or after creating the level where it can be awaited
        console.log(config_path)
        this.load_config(config_path);
        //this.maze_image = source_image;

        //this.renderer = this.resources.get_renderer(
        //    'main',
        //    new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true })
        //)
        //this.renderer.setSize(canvas.width, canvas.height);
    }
}
