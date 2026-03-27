import { TextureLoader, Vector3, Box3, PlaneGeometry, Mesh, MeshStandardMaterial, FileLoader, ArrowHelper, Object3D, Color, Fog } from 'three';
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import * as Game_Utils from './game_utility.js'
import * as CANNON from "https://esm.sh/cannon-es";
import { Resource_Manager } from './resource_manager.js'
import { Level } from './game_scenes.js'
import { Signal } from './game_core.js'
import { Canvas_Image_Buffer } from './lib/canvas_image_buffer.js'
import { NavigationGrid3D } from './lib/navigation_grid_3d.js'

export class Maze_Level extends Level {
    static default_source_image = "assets/maze.png";
    //may not need most of these static strings/enums, but would need to redesign things to work without them
    static #FLAGS = { FLOOR: 1 << 0, CEIL: 1 << 1, RAMP: 1 << 2, VARIATION: 1 << 3, MESH: 1 << 4, BLOCK: 1 << 5, BOUNDS: 1 << 6 };
    static get FLAGS() { return this.#FLAGS };
    //directions is for neigboring pixels/cells and may change to 8 dir in the future
    static #DIRECTIONS = { NORTH: 0, EAST: 1, SOUTH: 2, WEST: 3, length: 4 }; //adding a length property, but need to be updated if the entries changes
    static get DIRECTIONS() { return this.#DIRECTIONS };

    #file_loader = new FileLoader();

    //called when ready to used. will be called when ever the level is rebuilt
    #signal_ready = new Signal(); get signal_ready() { return this.#signal_ready; }
    //this will be called when the level is changing aka loading image/file/data. should be used to trigger loading screens and pausing/restarting gameplay
    #signal_load = new Signal(); get signal_load() { return this.#signal_load; }

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
    #maze_segments = new Set(); get maze_segments() { return this.#maze_segments; }

    #navigation_grid = new NavigationGrid3D; get navigation_grid() { return this.#navigation_grid; }

    //TODO: See if this is needed
    //static_objects = {};

    get default_wall_mat() {
        return this.resources.get_material('default_wall');
    }
    get default_floor_mat() {
        return this.resources.get_material('default_floor');
    }
    get default_ceil_mat() {
        return this.resources.get_material('default_ceil');
    }

    //TODO: See if this is still used since
    //maze segments hold body and mesh info
    //maze_mesh = null;

    //these function that return clones are not really need and probably should
    //be redesigned or removed.
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
        //may be better to use an array/set so id do not need to be known and variance can be used as index (0:north, 1:east, 2:south, 3: west)
        pixels_data[Maze_Level.DIRECTIONS.NORTH] = this.level_image.get_pixel_info(this.level_image.convert_coord_to_index(pixel_data.x, pixel_data.y - 1));
        pixels_data[Maze_Level.DIRECTIONS.SOUTH] = this.level_image.get_pixel_info(this.level_image.convert_coord_to_index(pixel_data.x, pixel_data.y + 1));
        pixels_data[Maze_Level.DIRECTIONS.WEST] = this.level_image.get_pixel_info(this.level_image.convert_coord_to_index(pixel_data.x - 1, pixel_data.y));
        pixels_data[Maze_Level.DIRECTIONS.EAST] = this.level_image.get_pixel_info(this.level_image.convert_coord_to_index(pixel_data.x + 1, pixel_data.y));
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
    //make an object that represent the info in the color value as well as ref of the pass parameters for easier acess
    get_cell_type(pixel_info, height = 0) {
        //blocks do not care about floors or ceils or mesh since it takes up the full space
        //also, for now, out of bounds (aka null) is consider blocking 
        const color_value = this.get_height_color(pixel_info, height);
        const cell_type = {
            'type': 0,
            'index': color_value,
            'id': 0,
            'variation': 0,
            'flags': 0,
            'pixel_info': pixel_info,
            'height': height
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
        for (const segment of this.maze_segments) {
            if (segment.mesh) {
                segment.mesh.position.y = this.#cell_size.y / 2.0;
            }
        }
    }
    clear_maze_segments() {
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
    //enable will make it visable. rebuild it will regenerate the arrows
    update_nav_debug(enable = true, rebuild = false) {
        if (!this.nav_debug) {
            this.nav_debug = new Object3D();
            this.add(this.nav_debug);
            this.nav_debug.enable = enable;
        }
        if (rebuild) {
            for (let i = this.nav_debug.children.length - 1; i >= 0; i--) {
                const old_arrow = this.nav_debug.children[i];
                if (old_arrow.line) {
                    if (old_arrow.line.geometry) old_arrow.line.geometry.dispose();
                    if (old_arrow.line.material) old_arrow.line.material.dispose();
                }
                if (old_arrow.cone) {
                    if (old_arrow.cone.geometry) old_arrow.cone.geometry.dispose();
                    if (old_arrow.cone.material) old_arrow.cone.material.dispose();
                }
                this.nav_debug.remove(old_arrow);
            }
            const FLAG_NAME = Object.fromEntries(
                Object.entries(NavigationGrid3D.CONN_DIR).map(([name, value]) => [value, name])
            );
            const cell_dir = new Set();
            const dir = { x: 0, y: 0, z: 0 }
            const cell_position = new Vector3()
            let arrow_color = 0xff0000
            let direction_length = 0;
            for (let cell_index = 0; cell_index < this.navigation_grid.cellConnections.length; cell_index++) {
                //for (let bitmask of this.navigation_grid.cellConnections) {
                let mask = this.navigation_grid.cellConnections[cell_index];
                cell_dir.clear()
                while (mask !== 0) {
                    // Extract the lowest set bit
                    const flag = mask & -mask;
                    const flag_name = FLAG_NAME[flag];
                    cell_dir.add(flag_name)
                    if (flag_name.includes("UP")) { dir.y = 1 }
                    else if (flag_name.includes("DOWN")) { dir.y = -1 }
                    else { dir.y = 0 }
                    if (flag_name.includes("NORTH")) { dir.z = -1 }
                    else if (flag_name.includes("SOUTH")) { dir.z = 1 }
                    else { dir.z = 0 }
                    if (flag_name.includes("EAST")) { dir.x = 1 }
                    else if (flag_name.includes("WEST")) { dir.x = -1 }
                    else { dir.x = 0 }
                    direction_length = Math.abs(dir.x) + Math.abs(dir.y) + Math.abs(dir.z)
                    if (direction_length >= 2) {
                        arrow_color = 0xe0f2ff;
                    }
                    else {
                        arrow_color = 0x00ff00;
                    }
                    if (direction_length !== 0) {
                        this.navigation_grid.getCellPosition(cell_index, cell_position)
                        const arrow = new ArrowHelper(
                            new Vector3(dir.x, dir.y, dir.z).normalize(),
                            cell_position.clone().add(new Vector3(0, 1.5, 0)),
                            1.5,
                            arrow_color,
                            0.3,
                            0.15
                        );
                        this.nav_debug.add(arrow);
                    }
                    mask &= mask - 1;
                }
            }
        }
        //the extra flag is so that the level can remeber if something enable or disable nav_debug
        this.nav_debug.enable = enable
        this.nav_debug.visible = enable;
    }
    //create the walls around an empty cell
    // might move floor and ceil logic here only for blocking cases
    //this might make floor/ceil a little redundent, but also allow each case to be handle diffrently
    //or maybe not since their cases are a bit more picky
    create_wall(pixel_info, cell_type, pixels_data, wall_geometries, wall_body, height) {
        //NOTE: maybe nav map should not check for floor. can check if down is open with the flags
        //so just flagging what exit is opens should be enough
        const north_cell_type = this.get_cell_type(pixels_data[Maze_Level.DIRECTIONS.NORTH], height);
        if (this.is_wall(north_cell_type.type) || this.is_bounds(north_cell_type.type)) {
            const face = new PlaneGeometry(this.#cell_size.z, this.#cell_size.y);
            face.translate(pixel_info.x * this.#cell_size.x, this.#cell_size.y * height, pixel_info.y * this.#cell_size.z - this.#cell_size.x / 2.0);
            wall_geometries.push(face);
        }
        else {
            if (!(Maze_Level.FLAGS.RAMP & north_cell_type.type || Maze_Level.FLAGS.RAMP & cell_type.type)) {
                this.navigation_grid.setCellConnFlag(pixel_info.x, height, pixel_info.y, NavigationGrid3D.CONN_DIR.NORTH)
            }
        }
        const east_cell_type = this.get_cell_type(pixels_data[Maze_Level.DIRECTIONS.EAST], height);
        if (this.is_wall(east_cell_type.type) || this.is_bounds(east_cell_type.type)) {
            const face = new PlaneGeometry(this.#cell_size.x, this.#cell_size.y).rotateY(-Math.PI / 2);
            face.translate(pixel_info.x * this.#cell_size.x + this.#cell_size.z / 2.0, this.#cell_size.y * height, pixel_info.y * this.#cell_size.z);
            wall_geometries.push(face);

        }
        else {
            if (!(Maze_Level.FLAGS.RAMP & east_cell_type.type || Maze_Level.FLAGS.RAMP & cell_type.type)) {
                this.navigation_grid.setCellConnFlag(pixel_info.x, height, pixel_info.y, NavigationGrid3D.CONN_DIR.EAST)
            }
        }
        const south_cell_type = this.get_cell_type(pixels_data[Maze_Level.DIRECTIONS.SOUTH], height);
        if (this.is_wall(south_cell_type.type) || this.is_bounds(south_cell_type.type)) {
            const face = new PlaneGeometry(this.#cell_size.z, this.#cell_size.y).rotateY(Math.PI);
            face.translate(pixel_info.x * this.#cell_size.x, this.#cell_size.y * height, pixel_info.y * this.#cell_size.z + this.#cell_size.x / 2.0);
            wall_geometries.push(face);

        }
        else {
            if (!(Maze_Level.FLAGS.RAMP & south_cell_type.type || Maze_Level.FLAGS.RAMP & cell_type.type)) {
                this.navigation_grid.setCellConnFlag(pixel_info.x, height, pixel_info.y, NavigationGrid3D.CONN_DIR.SOUTH)
            }
        }
        const west_cell_type = this.get_cell_type(pixels_data[Maze_Level.DIRECTIONS.WEST], height);
        if (this.is_wall(west_cell_type.type) || this.is_bounds(west_cell_type.type)) {
            const face = new PlaneGeometry(this.#cell_size.x, this.#cell_size.y).rotateY(Math.PI / 2);
            face.translate(pixel_info.x * this.#cell_size.x - this.#cell_size.z / 2.0, this.#cell_size.y * height, pixel_info.y * this.#cell_size.z);
            wall_geometries.push(face);
        }
        else {
            if (!(Maze_Level.FLAGS.RAMP & west_cell_type.type || Maze_Level.FLAGS.RAMP & cell_type.type)) {
                this.navigation_grid.setCellConnFlag(pixel_info.x, height, pixel_info.y, NavigationGrid3D.CONN_DIR.WEST)
            }
        }
    }
    //NOTE: MAY NEED TO RESERVER 4 FLAGS FOR this.maze_nav[pixel_info.id] to solve egde cases

    //this will also handle ramps since they are batch together with floor
    create_floor(pixel_info, cell_type, pixels_data, floor_geometries, floor_body, height) {
        const up_cell_type = this.get_cell_type(pixel_info, height + 1);
        const down_cell_type = this.get_cell_type(pixel_info, height - 1);
        if (this.has_floor(cell_type.type) || this.is_wall(down_cell_type.type) || this.is_bounds(down_cell_type.type) || this.has_ceil(down_cell_type.type)) {
            const face = new PlaneGeometry(this.#cell_size.x, this.#cell_size.z).rotateX(-Math.PI / 2);
            face.translate(pixel_info.x * this.#cell_size.x, this.#cell_size.y * height - this.#cell_size.y / 2.0, pixel_info.y * this.#cell_size.z);
            floor_geometries.push(face);

        }
        else {
            if (!(Maze_Level.FLAGS.RAMP & down_cell_type.type || Maze_Level.FLAGS.RAMP & cell_type.type)) {
                this.navigation_grid.setCellConnFlag(pixel_info.x, height, pixel_info.y, NavigationGrid3D.CONN_DIR.DOWN)
            }
        }
        //if (this.is_wall(pixel_info, i + 1)) {
        if (this.has_ceil(cell_type.type) || this.is_wall(up_cell_type.type) || this.is_bounds(up_cell_type.type) || this.has_floor(up_cell_type.type)) {
            const face = new PlaneGeometry(this.#cell_size.x, this.#cell_size.z).rotateX(Math.PI / 2);
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
        else {
            if (!(Maze_Level.FLAGS.RAMP & up_cell_type.type || Maze_Level.FLAGS.RAMP & cell_type.type)) {
                this.navigation_grid.setCellConnFlag(pixel_info.x, height, pixel_info.y, NavigationGrid3D.CONN_DIR.UP)
            }
        }

        //slopes. will treat them as floor(up) or ceil(down) for geo
        if ((Maze_Level.FLAGS.RAMP & cell_type.type)) {
            //NOTE: may create a wedge instead in the future. this approch currently is easier to make sure it works
            const face_up = new PlaneGeometry(this.#cell_size.x, Math.hypot(this.#cell_size.z, this.#cell_size.y)).rotateX(-Math.PI / 4).rotateY(-cell_type.variation * (Math.PI / 2));
            const face_down = new PlaneGeometry(this.#cell_size.x, Math.hypot(this.#cell_size.z, this.#cell_size.y)).rotateX(Math.PI / 4).rotateY(Math.PI - cell_type.variation * (Math.PI / 2));
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

            const up_forward_cell_type = this.get_cell_type(pixels_data[cell_type.variation], height + 1);
            //const forward_cell_type = this.get_cell_type(pixels_data[cell_type.variation], height);
            const back_cell_type = this.get_cell_type(pixels_data[(cell_type.variation + 2) % Maze_Level.DIRECTIONS.length], height);
            if (!this.is_wall(up_cell_type.type) && !this.is_bounds(up_cell_type.type) && !this.has_floor(up_cell_type.type) && !this.has_ceil(cell_type.type)) {
                //console.log('up is open and floorless')
                if (!this.is_wall(up_forward_cell_type.type) && !this.is_bounds(up_forward_cell_type.type) && this.has_floor(up_forward_cell_type.type)) {
                    //console.log('up to the ', var_direction[cell_type.variation], ' is open and has a floor')
                    if (Maze_Level.FLAGS.RAMP & up_forward_cell_type.type && up_forward_cell_type.variation !== cell_type.variation) {
                        //console.log('but has a ramp not in the same direction')
                    }
                    else {
                        //setting connection of this cell open in its upper direction
                        this.navigation_grid.setCellConnFlag(pixel_info.x, height, pixel_info.y, NavigationGrid3D.getConnDir(NavigationGrid3D.CONN_DIR_TYPE.UP, cell_type.variation * 2 + 1))
                        //setting uppder direction to point down in the opposite direction
                        this.navigation_grid.setCellConnFlag(up_forward_cell_type.pixel_info.x, up_forward_cell_type.height, up_forward_cell_type.pixel_info.y, NavigationGrid3D.getConnDir(NavigationGrid3D.CONN_DIR_TYPE.DOWN, (cell_type.variation * 2 + 5)))
                    }
                }
            }
            //add the additional connections since ramp connections was ignored in the wall, floor, and ceil build logic
            //ignoring adj directions since the ramp half block it
            if (!this.is_wall(back_cell_type.type) && !this.is_bounds(back_cell_type.type)) {
                //if back direction is not blocked, add a conection in both directions
                this.navigation_grid.setCellConnFlag(pixel_info.x, height, pixel_info.y, NavigationGrid3D.getConnDir(NavigationGrid3D.CONN_DIR_TYPE.SAME, cell_type.variation * 2 + 5))
                this.navigation_grid.setCellConnFlag(back_cell_type.pixel_info.x, height, back_cell_type.pixel_info.y, NavigationGrid3D.getConnDir(NavigationGrid3D.CONN_DIR_TYPE.SAME, cell_type.variation * 2 + 1))
            }
            //ignoring ramps above since dealing with that odd space would be difficult without another level of nav data to state how the exits are connected
            if (!this.has_floor(up_cell_type.type) && !this.has_ceil(cell_type.type) && !(Maze_Level.FLAGS.RAMP & up_cell_type.type)) {
                //adding up connection to this cell and down for the cell above
                this.navigation_grid.setCellConnFlag(pixel_info.x, height, pixel_info.y, NavigationGrid3D.getConnDir(NavigationGrid3D.CONN_DIR_TYPE.UP, 0))
                this.navigation_grid.setCellConnFlag(up_cell_type.pixel_info.x, up_cell_type.height, up_cell_type.pixel_info.y, NavigationGrid3D.getConnDir(NavigationGrid3D.CONN_DIR_TYPE.DOWN, 0))
            }
        }
    }

    build_maze() {
        let segment_id = 0;
        const size = 64 * 4;
        this.clear_maze_segments();
        //for (const arrow of this.arrows) {
        //    this.remove(arrow)
        //}
        //this.arrows.clear()
        //nav_layer_length * hight should allow each height to have its own layer up to 4
        //but I am not sure if apha will be used
        //this.nav_layer_length = this.level_image.data.length / 4;
        //only using some of the length since alpha is not being used as a height layer
        //note: could use image width, image height, and total maze height
        //this.#maze_nav = new Int32Array(Math.floor(this.nav_layer_length * 3));

        this.navigation_grid.initialize(this.level_image.image.width, 3, this.level_image.image.height, this.position.clone(), this.cell_size.clone())

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
                        this.navigation_grid.setCellConnFlag(pixel_info.x, i, pixel_info.y, NavigationGrid3D.CONN_DIR.OPEN)
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

            this.resources.set_geometry('maze_walls', maze_wall_geo);
            this.resources.set_geometry('maze_floors', maze_floor_geo);

            for (const geometry of wall_geometries) {
                geometry.dispose();
            }
            for (const geometry of floor_geometries) {
                geometry.dispose();
            }
            this.create_maze_segment(maze_wall_geo, this.default_wall_mat, wall_body);
            this.create_maze_segment(maze_floor_geo, this.default_floor_mat, floor_body);
            if ((segment_id + 1) * size < this.level_image.data.length) {
                segment_id += 1;
                requestAnimationFrame(step);
            }
            else {
                this.update_nav_debug(this.nav_debug ? this.nav_debug.enable : false, true)
                this.ready();
                this.signal_ready.emit();
            }
        }
        requestAnimationFrame(step);
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
    ready() {

    }
    build() {
        this.create_bounds();
        this.build_maze();

        //this.signal_ready.emit();
    }
    //this is here to prevent setting it
    get_cell_size() { return this.#cell_size; }
    //if levels need to be dynamicly added or removed, then this need to be called to clean up certain loose objects
    //but probably should disallow setting cellsize after a level is built. so size may be part of the config

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
        if (!this.config) {
            console.log('no config loaded')
            this.config = {}
        }
        //if (this.config) {
        this.maze_image = this.config.level_image ? this.config.level_image : Maze_Level.default_source_image;
        if (this.config.cell_size) {
            this.cell_size.set(
                this.config.cell_size.x ? this.config.cell_size.x : 2,
                this.config.cell_size.y ? this.config.cell_size.y : 2,
                this.config.cell_size.z ? this.config.cell_size.z : 2
            );
        }
        else {
            this.cell_size.set(2, 2, 2);
        }
        this.background = this.config.background ? this.parce_type_string(this.config.background)[1] : null;
        if (this.config.fog) {
            //type forces it to use a diffrent class if logic support the id.
            if (this.config.fog.type === 'exp2') {
                this.fog = new Fog(
                    this.config.fog.color ? this.parce_type_string(this.config.fog.color)[1] : '#000000',
                    this.config.fog.density ? this.convert_type('number',this.config.fog.density)[1] : 0.2
                );

            }
            else {
                this.fog = new Fog(
                    this.config.fog.color ? this.parce_type_string(this.config.fog.color)[1] : '#000000',
                    this.config.fog.near ? this.convert_type('number',this.config.fog.near)[1] : 0,
                    this.config.fog.far ? this.convert_type('number',this.config.fog.far)[1] : 100
                );
            }
        }
        else {
            //may need to recompute shaders of mats that are not recomputed on load
            this.fog = null;
        }


        console.log(this.maze_image);

        this.load_resources();
    }
    //todo: handle this better. NOTE: awaiting any of the load_resources will break them TODO: maybe not use async functions or test it again when handle correctly
    load_resources() {
        this.resources.signal_load_end.connect(() => this.resources_loaded());
        if (this.config && this.config.textures) {
            for (const [group_id, group] of Object.entries(this.config.textures)) {
                for (const [id, path] of Object.entries(group)) {
                    this.cache_created_resources(Resource_Manager.TYPES.TEXTURE, id);
                    //note: may need to add group id to id, but also need to update the setters to use that id instead
                    this.resources.load_resource(path, id, Resource_Manager.TYPES.TEXTURE);
                }
            }
        }
        else {
            console.log('no vaild config loaded, using default level resources')
            //texture is for more detail, but normal map adds the texture from light depth
            this.resources.load_resource('assets/texture.png', 'texture', Resource_Manager.TYPES.TEXTURE);
            //normal may or may not be correct. need to check the light order. also could see how bumbmap works if the lighting is simple
            this.resources.load_resource('assets/normal.png', 'normal', Resource_Manager.TYPES.TEXTURE);

            //spec(metal) and ao could be merge into a single texture. https://threejs.org/docs/#MeshStandardMaterial has more info about the maps
            this.resources.load_resource('assets/specular.png', 'specular', Resource_Manager.KEYS.TYPES.TEXTURE);

            this.resources.load_resource('assets/ao.png', 'ao', Resource_Manager.TYPES.TEXTURE);

            this.resources.load_resource('assets/lightmap.png', 'lightmap', Resource_Manager.TYPES.TEXTURE);
        }
    }
    //might be better to move this to resource manager since it may be reusable there
    convert_type(type, value) {
        if (type === Resource_Manager.TYPES.TEXTURE) {
            return this.resources.get_texture(value);
        }
        if (type === 'number') {
            return Number(value);
        }
        //'0xRRGGBB' conversion
        if (type === 'hex') {
            return parseInt(value, 16)
        }
        if (type === 'color') {
            return new Color(value);
        }
        return value;
    }
    //only for simple cases where there is one set of ::
    parce_type_string(string, convert_value = true) {
        if (string !== null && string !== undefined) {
            if (string === 'undefined') {
                return ['undefined', undefined]
            }
            if (string === 'null') {
                //will return type as object to behave similar as typeof.
                return ['object', null]
            }
            if (string.includes("::")) {
                const result = string.split("::");
                if (convert_value) {
                    result[1] = this.convert_type(result[0], result[1]);
                }
                return result;
            }
            return ['string', string];
        }
        //if null, type should be object, but this case should not happen often
        return [typeof (string), string]

    }

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
        this.resources.signal_load_end.disconnect(() => this.resources_loaded());
        if (this.config && this.config.materials) {
            for (const [material_id, material_data] of Object.entries(this.config.materials)) {
                for (const [property, value_data] of Object.entries(material_data)) {
                    const parced_value = this.parce_type_string(value_data);

                    if (parced_value[1] === null || parced_value[1] === undefined) {
                        console.log('Warning: maze_level resource loader material value to set is ', parced_value[1], ' for ', property)
                    }
                    //need to be call before setting so it can ignore preloaded resources to clear on reload
                    this.cache_created_resources(Resource_Manager.TYPES.MATERIAL, material_id);
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
        this.level_image = new Canvas_Image_Buffer(this.maze_image);

    }
    level_image_ready() {
        this.signal_load.emit();
        console.log('started building', this)
        this.build()
    }
    constructor(canvas, world, config_path = 'data/default_level.json') {
        super(world);
        this.resources = Resource_Manager.default_instance; //cache the Resource_Manager so it could be overrided
        //may need to call loading before or after creating the level where it can be awaited
        console.log(config_path)
        this.load_config(config_path);

    }
}
