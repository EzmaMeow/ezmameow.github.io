
import * as THREE from 'three';
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";

const canvas = document.getElementById("game");
//const renderer = new THREE.WebGLRenderer({ canvas });
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);

//let camera;
//let player_light;
let maze_game;
 
export class Vector_Lib {

	//using grid coords, this will get cells in which the line passes
	static line_supercover_3d(start, end) {
		const start_floored = start.clone().floor();
		const end_floored = end.clone().floor();
		//d
		const abs_distance = new THREE.Vector3(
			Math.abs(end_floored.x - start_floored.x),
			Math.abs(end_floored.y - start_floored.y),
			Math.abs(end_floored.z - start_floored.z)
		)

		//s
		const step_direction = new THREE.Vector3(
			start_floored.x < end_floored.x ? 1 : -1, 
			start_floored.y < end_floored.y ? 1 : -1, 
			start_floored.z < end_floored.z ? 1 : -1
		)

		let point = start_floored.clone();

		const cells = [point.clone()];
		//a
		const double_distance = abs_distance.clone().multiplyScalar(2);

		if (abs_distance.x >= abs_distance.y && abs_distance.x >= abs_distance.z) {
			let yd = double_distance.y - abs_distance.x;
			let zd = double_distance.z - abs_distance.x;
			while (point.x !== end_floored.x) {
				if (yd >= 0) { point.y += step_direction.y; yd -= double_distance.x; }
				if (zd >= 0) { point.z += step_direction.z; zd -= double_distance.x; }
				point.x += step_direction.x;
				yd += double_distance.y;
				zd += double_distance.z;
				cells.push(point.clone());
			}
		} 
		else if (abs_distance.y >= abs_distance.x && abs_distance.y >= abs_distance.z) {
			let xd = double_distance.x - abs_distance.y;
			let zd = double_distance.z - abs_distance.y;
			while (point.y !== end_floored.y) {
				if (xd >= 0) { point.x += step_direction.x; xd -= double_distance.y; }
				if (zd >= 0) { point.z += step_direction.z; zd -= double_distance.y; }
				point.y += step_direction.y;
				xd += double_distance.x;
				zd += double_distance.z;
				cells.push(point.clone());
			}
		} 
		else {
			let xd = double_distance.x - abs_distance.z;
			let yd = double_distance.y - abs_distance.z;
			while (point.z !== end_floored.z) {
				if (xd >= 0) { point.x += step_direction.x; xd -= double_distance.z; }
				if (yd >= 0) { point.y += step_direction.y; yd -= double_distance.z; }
				point.z += step_direction.z;
				xd += double_distance.x;
				yd += double_distance.y;
				cells.push(point.clone());
			}
		}
		return cells;
	}

}

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
//a share state about the world such as getting objects in
//the world and collsion checks as well as varibles that may be needed
export class World_State {
	line_trace = (x, y) => {
		return {}
	}
	constructor() {
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

export class Player extends THREE.Object3D {
	//TODO: Move all the player base logic here and maybe create a dedicated character object
	speed = 0.05;
	move(direction, world_state) {

	}
	constructor() {
		super();
		this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.001, 32);
		this.light = new THREE.PointLight(0x3a3a4f, 0.5, 128, 1.0);
		this.add(this.light);
	}
}

export class Maze_Game {

	on_key_down(event) {
		this.input_state.keys[event.key] = true;

		if (event.key == "l") {
			if (this.player.light.color.getHex() == 0xf8c377) {
				this.player.light.color.setHex(0x3a3a4f);
			}
			else {
				this.player.light.color.setHex(0xf8c377);
			}
		}
		if (event.key == "`") {
			if (this.input_state.debug) {
				this.input_state.debug = false;
				this.player.camera.position.y = 0.0
			}
			else {
				this.input_state.debug = true;
				this.player.camera.position.y = 2.0
			}
			//let test = this.player.camera.position.clone();
			//let direction = new THREE.Vector3();
			//this.player.camera.getWorldDirection(direction);
			//test.add(direction.multiplyScalar(3.0));
			//console.log(Vector_Lib.line_supercover_3d(this.level.get_cell_position(this.player.camera.position),this.level.get_cell_position(test)));
		}
	}
	on_key_up(event) {
		this.input_state.keys[event.key] = false;
	}
	on_mouse_up(event) {
		if (event.button === 1) {
			this.input_state.enable_mouse = false;
		}
	}
	on_mouse_down(event) {
		if (event.button === 1) {
			this.input_state.enable_mouse = true;
		}
	}
	on_mouse_move(event) {
		if (this.input_state.enable_mouse) {
			const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0.0;
			const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0.0;
			this.player.camera.rotation.y -= movementX * this.input_state.mouseSensitivity;
		}
	}

	constructor() {
		const level = new Level("maze.png"); //exposing it for callables
		this.level = level;
		const level_image = level.level_image;
		const player = new Player();
		this.player = player;
		const input_state = {
			mouseSensitivity: 0.01,
			keys: {},
			enable_mouse: false,
			debug: false
		};
		this.input_state = input_state;
		level_image.on_ready = () => {
			level.build()
			startGame();
			console.log('mewmew');
		};
		level.add(player);

		document.addEventListener("keydown", event => this.on_key_down(event));
		document.addEventListener("keyup", event => this.on_key_up(event));
		document.addEventListener('mousedown', event => this.on_mouse_down(event));
		document.addEventListener('mouseup', event => this.on_mouse_up(event));
		document.addEventListener('mousemove', event => this.on_mouse_move(event));

		this.world_state = new World_State();
		//maybe leave line trace as a normal function, but parts of it can be reassign
		//would need to redesign the lookup to get an array of object
		this.world_state.line_trace = (from_position, to_position) => {
			//use the pass x,y,z if old point to desire new point
			//may need to rename it and have it return an object about the collsion
			const static_objects = [];
			const results = {
				collsion: false,
				intersection: to_position.clone(),
			}
			//should also get a collection of anything that intersects the from->to line
			
			if (input_state.debug) {
				return results;
			}

			let cells = Vector_Lib.line_supercover_3d(level.get_cell_position(from_position),this.level.get_cell_position(to_position));
			let last_pixel_info = level_image.get_pixel_info(level_image.convert_coord_to_index(from_position.x, from_position.y));
			cells.forEach((cell_position) => {
				let pixel_info = level_image.get_pixel_info(level_image.convert_coord_to_index(cell_position.x, cell_position.z));
				if (level.is_wall(pixel_info)) {
					results.collsion = true;
					
					//this is used to handle rare cases where speed is too great and collsion will be missed
					//but it dose not provide a slide logic nor an impact point, but it povides the cell of collsion
					//storing the last one is a cheat to reuse the x and y cell check of the safe cell
					//currently can not go all the way into corners (just a little space) which not an issue except
					//it makes sliding feels odd. aabb collsion logic may or may not help. issue is negative cords. need a better
					//way of handling both cases (in theroy i could set the reset axis by rounding to 0 and then adding .9 or -.9) 
					//maybe rounding away from 0
					//also broke
					if (last_pixel_info == null){
						results.intersection.copy(from_position);
						return results
					}
					if (pixel_info == null){
						pixel_info = last_pixel_info;
					}
					let x = from_position.x > to_position.x ? last_pixel_info.x -1 : last_pixel_info.x +1;
					let y = from_position.z > to_position.z ? last_pixel_info.y -1 : last_pixel_info.y +1;
					//need aabb for accuract intersections even if it an object the level provides. 
					if (level.is_wall(level_image.get_pixel_info(level_image.convert_coord_to_index(x, last_pixel_info.y)))) {
						results.intersection.x = from_position.x
					}
					if (level.is_wall(level_image.get_pixel_info(level_image.convert_coord_to_index(last_pixel_info.x, y)))) {
						results.intersection.z = from_position.z
					}
					return results;
				}
				last_pixel_info = pixel_info;
			});

			return results;

		}
	}
}



//todo: move to maze game
function startGame() {
	const speed = 0.05;

	const keys = maze_game.input_state.keys;
	const level = maze_game.level;
	const level_image = level.level_image;
	const player = maze_game.player;
	const camera = maze_game.player.camera;
	const player_light = maze_game.player.light;
	//const debug = maze_game.input_state.debug;

	function loop() {
		requestAnimationFrame(loop);
		//let old_position = camera.position.clone();
		let new_position = camera.position.clone();
		let direction = new THREE.Vector3();
		camera.getWorldDirection(direction);

		if (keys["w"]) new_position.add(direction.multiplyScalar(speed));
		if (keys["s"]) new_position.add(direction.multiplyScalar(-speed));

		if (keys["a"]) camera.rotation.y += 0.05;
		if (keys["d"]) camera.rotation.y -= 0.05;

		let collsion_results = maze_game.world_state.line_trace(camera.position, new_position);
		camera.position.copy(collsion_results.intersection);
		player_light.position.copy(camera.position);
		renderer.render(level, camera);

	}

	loop();
}

maze_game = new Maze_Game();
