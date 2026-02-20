import * as THREE from 'three';
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import * as Game_Utils from './game_ultility.js'

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
			console.log('outside range')
			return -1
		}
		let id = y * this.image.width + x;
		return id * 4;
	}
	get_pixel_info(index) {
		if (index < 0 || index >= this.data.length) {
			console.log('out of bounds')
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
    static default_source_image = "maze.png";
    level_image;
    #cell_size = new THREE.Vector3(1.0, 2.0, 1.0);
    //static ids are reserve strings
    static_object_ids = ['north_border', 'south_border', 'east_border', 'west_border', 'floor', 'ceil'];
    static_objects = {};
    //coord keyed wall meshes. might not be used depend on is mesh merging is used or not to fix border fighting
    //walls = {};
    //probably should make all defaults have getters and private the cache to prevent incorrect usage
    default_wall_mat = new THREE.MeshLambertMaterial({ color: 0x87ceeb, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 10 });
    default_floor_mat = new THREE.MeshLambertMaterial({ color: 0x87b1eb, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 10 });
    default_ceil_mat = new THREE.MeshLambertMaterial({ color: 0x87ebe3, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 10 });
    #default_xborder_geo = null;
    #default_zborder_geo = null;
    #default_area_geo = null;

    maze_geo = null;
    //Note: the one that create this should check if on exists incase it get called twice
    maze_mesh = null;
    get default_xborder_geo() {
        if (this.#default_xborder_geo == null) {
            this.#default_xborder_geo = new THREE.BoxGeometry((this.level_image.image.height + 0.0) * this.#cell_size.x, this.#cell_size.y, this.#cell_size.z);
        }
        return this.#default_xborder_geo
    }
    get default_zborder_geo() {
        if (this.#default_zborder_geo == null) {
            this.#default_zborder_geo = new THREE.BoxGeometry(this.#cell_size.x, this.#cell_size.y, (this.level_image.image.width + 0.0) * this.#cell_size.z);
        }
        return this.#default_zborder_geo
    }
    get default_area_geo() {
        if (this.#default_area_geo == null) {
            this.#default_area_geo = new THREE.PlaneGeometry(this.level_image.image.height, this.level_image.image.width);
        }
        return this.#default_area_geo
    }
    build_maze() {
        const geometries = [];
        this.level_image.for_each_pixel((pixel_info) => {
            const px = new THREE.PlaneGeometry(this.#cell_size.x, this.#cell_size.y).rotateY(Math.PI / 2); // +X
            const nx = new THREE.PlaneGeometry(this.#cell_size.x, this.#cell_size.y).rotateY(-Math.PI / 2); // -X
            const pz = new THREE.PlaneGeometry(this.#cell_size.z, this.#cell_size.y); // +Z
            const nz = new THREE.PlaneGeometry(this.#cell_size.z, this.#cell_size.y).rotateY(Math.PI); // -Z
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
        if (this.maze_geo) {
            this.maze_geo.dispose();
        }
        this.maze_geo = BufferGeometryUtils.mergeGeometries(geometries, true);
        if (this.maze_mesh) {
            this.maze_mesh.geometry = this.maze_geo;
            this.maze_mesh.material = this.default_wall_mat;
        }
        else {
            this.maze_mesh = new THREE.Mesh(this.maze_geo, this.default_wall_mat);
            this.add(this.maze_mesh);
        }

    }
    get_cell_position(position) {
        return Game_Utils.get_cell_coords(position,this.#cell_size);
        let cell_position = new THREE.Vector3(
            position.x / this.#cell_size.x,
            position.y / this.#cell_size.y,
            position.z / this.#cell_size.z
        );
        //cell_position.copy(this.#cell_size);
        cell_position.round();
        return cell_position;
    }
    get_cell_world_position(position) {
        return Game_Utils.get_cell_position(position,this.#cell_size);
        let world_position = new THREE.Vector3(
            position.x * this.#cell_size.x,
            position.y * this.#cell_size.y,
            position.z * this.#cell_size.z
        );
        return world_position;
    }
    is_wall(pixel_info) {
        //will treat null as a wall unless need to extend pass bounds
        if (pixel_info == null) {
            return true
        }
        return pixel_info.r < 128 && pixel_info.g < 128 && pixel_info.b < 128;
    }
    #create_static_border(id) {
        let border = null;
        if (id in this.static_objects) {
            border = this.static_objects[id];
        }
        if (id == this.static_object_ids[0]) {
            if (border == null) {
                border = new THREE.Mesh(this.default_xborder_geo, this.default_wall_mat);
            }
            border.position.set(this.level_image.image.height / 2.0 - this.#cell_size.x / 2.0, 0.0, -this.#cell_size.z);
        }
        else if (id == this.static_object_ids[1]) {
            if (border == null) {
                border = new THREE.Mesh(this.default_xborder_geo, this.default_wall_mat);
            }
            border.position.set(this.level_image.image.height / 2.0 - this.#cell_size.x / 2.0, 0.0, this.level_image.image.width * this.#cell_size.z);
        }
        else if (id == this.static_object_ids[2]) {
            if (border == null) {
                border = new THREE.Mesh(this.default_zborder_geo, this.default_wall_mat);
            }
            border.position.set(this.level_image.image.height * this.#cell_size.x, 0.0, this.level_image.image.width / 2.0 - this.#cell_size.z / 2.0);
        }
        else if (id == this.static_object_ids[3]) {
            if (border == null) {
                border = new THREE.Mesh(this.default_zborder_geo, this.default_wall_mat);
            }
            border.position.set(-this.#cell_size.x, 0.0, this.level_image.image.width / 2.0 - this.#cell_size.z / 2.0);
        }
        this.static_objects[id] = border
        border.name = id;
        this.add(border);
        return border;
    }
    #create_static_floor() {
        let floor;
        if (this.static_object_ids[4] in this.static_objects) {
            floor = this.static_objects[this.static_object_ids[4]];
        }
        else {
            floor = new THREE.Mesh(this.default_area_geo, this.default_floor_mat);
        }
        this.static_objects[this.static_object_ids[4]] = floor;
        floor.name = this.static_object_ids[4];
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(this.level_image.image.height / 2.0 - this.#cell_size.x / 2.0, -this.#cell_size.y / 2.0, this.level_image.image.width / 2.0 - this.#cell_size.z / 2.0);
        this.add(floor);
        return floor;
    }
    #create_static_ceil() {
        let ceil;
        if (this.static_object_ids[5] in this.static_objects) {
            ceil = this.static_objects[this.static_object_ids[5]];
        }
        else {
            ceil = new THREE.Mesh(this.default_area_geo, this.default_ceil_mat);
        }
        this.static_objects[this.static_object_ids[5]] = ceil;
        ceil.name = this.static_object_ids[5];
        ceil.rotation.x = Math.PI / 2;
        ceil.position.set(this.level_image.image.height / 2.0 - this.#cell_size.x / 2.0, this.#cell_size.y / 2.0, this.level_image.image.width / 2.0 - this.#cell_size.z / 2.0);
        this.add(ceil);
        return ceil;
    }
    get_static_border(id) {
        return this.#create_static_border(id);
    }
    get north_border() {
        return this.#create_static_border(this.static_object_ids[0]);
    }
    get south_border() {
        return this.#create_static_border(this.static_object_ids[1]);
    }
    get east_border() {
        return this.#create_static_border(this.static_object_ids[2]);
    }
    get west_border() {
        return this.#create_static_border(this.static_object_ids[3]);
    }
    get static_floor() {
        return this.#create_static_floor();
    }
    get static_ceil() {
        return this.#create_static_ceil();
    }
    build() {
        //This build all the parts of the level
        //NOTE: should have the create function also reset the states
        //of the meshes to the new state of the level
        this.build_maze();
        this.#create_static_border(this.static_object_ids[0]);
        this.#create_static_border(this.static_object_ids[1]);
        this.#create_static_border(this.static_object_ids[2]);
        this.#create_static_border(this.static_object_ids[3]);
        this.#create_static_floor();
        this.#create_static_ceil();
    }
    get_cell_size() {
        return this.#cell_size; //I belive vectors are ref types so setting it could break ref. getter should be editable if it is a proper ref type
    }
    constructor(source_image = Level.default_source_image) {
        super();
        this.level_image = new Level_Image(source_image);
        this.background = new THREE.Color(0x444444);
    }
}
