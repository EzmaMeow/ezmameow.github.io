
import * as THREE from 'three';
import * as Game_Utils from './game_ultility.js'
import { Level } from './game_core.js'

const canvas = document.getElementById("game");
const canvas_body = document.getElementById("canvas_body");

//let camera;
//let player_light;
let maze_game;


//a share state about the world such as getting objects in
//the world and collsion checks as well as varibles that may be needed
export class World_State {
	line_trace = (x, y) => {
		return {}
	}
	constructor() {
	}
}

//player might be part of maze.js or it could be part of game_core.js
//but most likly a character object will be added to core and player stay here while extending that character
export class Player extends THREE.Object3D {
	//TODO: Move all the player base logic here and maybe create a dedicated character object
	speed = 0.05;
	move(direction, world_state) {

	}
	constructor(options = {}) {
		super();
		//NOTE: the aspect ration of the camera should be handle elsewhere
		//also may need a getter for the current active camera or have one and allow characters to possessed them if needed.
		//this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.001, 32);
		//this.camera = new THREE.PerspectiveCamera(75, 1.0, 0.001, 32);
		//TODO: open a camera ref slot or add as child if move modify all children
		this.light = new THREE.PointLight(0x3a3a4f, 0.5, 128, 1.0);
		this.add(this.light);
	}
}

export class Maze_Game {
	//NOTE: Key events are redirected to this, but some may need to be redirected to player
	//maybe have a return so the key call chain can stop for more complex cases
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
				this.camera.position.y = 0.0
			}
			else {
				this.input_state.debug = true;
				this.camera.position.y = 2.0
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
			this.camera.rotation.y -= movementX * this.input_state.mouseSensitivity;
		}
	}
	on_window_resize() {
		if (!this.resize) {
			this.resize = true;
		}
	}

	constructor() {
		const level = new Level(canvas, "maze.png");
		this.level = level;
		level.renderer.setSize(canvas_body.clientWidth, canvas_body.clientHeight);
		level.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
		const level_image = level.level_image;
		const player = new Player();
		this.player = player;
		const camera = new THREE.PerspectiveCamera(50, canvas_body.clientWidth / canvas_body.clientHeight, 0.001, 32);
		this.camera = camera;
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

		window.addEventListener('resize', () => this.on_window_resize());

		this.world_state = new World_State();
		//maybe leave line trace as a normal function, but parts of it can be reassign
		//would need to redesign the lookup to get an array of object
		//also could leave it as part of the scene, but I rather split it since scene for rendering
		//world is for collsion and maybe physics or a hook for physics
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

			let cells = Game_Utils.line_supercover(level.get_cell_position(from_position), this.level.get_cell_position(to_position));
			let last_pixel_info = level_image.get_pixel_info(level_image.convert_coord_to_index(from_position.x, from_position.y));
			cells.forEach((cell_position) => {
				let pixel_info = level_image.get_pixel_info(level_image.convert_coord_to_index(cell_position.x, cell_position.z));
				if (level.is_wall(pixel_info)) {
					results.collsion = true;
					//The current grid system is fine, though should try to get use to boxes and rays. dynamic objects would be
					//more about if they collide though may still need the point it hits
					//TODO: try to remake this to pass a direction and mag instead of the caculated to_position
					//also move some annoying yet useful logic in game ultil
					//also need to figure out adding space around the player. should try again maybe after remaking this
					//and returning useful information. the position will be a distance away from the from_position and
					// position should be unchange if from_position dose not change. also the to_position is not for the camera
					//but for the edge of the circle so more like projecting and retracting the points by a step
					if (last_pixel_info == null) {
						results.intersection.copy(from_position);
						return results
					}
					if (pixel_info == null) {
						pixel_info = last_pixel_info;
					}
					let coord_x_step = from_position.x > to_position.x ? last_pixel_info.x - 1 : last_pixel_info.x + 1;
					let coord_y_step = from_position.z > to_position.z ? last_pixel_info.y - 1 : last_pixel_info.y + 1;
					let step_direction = Game_Utils.get_step_direction(from_position,to_position);
					let adj_pixel_info = level_image.get_pixel_info(level_image.convert_coord_to_index(coord_x_step, last_pixel_info.y))
					if (level.is_wall(adj_pixel_info)) {
						if (step_direction.x > 0){
							results.intersection.x = Math.floor(to_position.x) - 0.01;
						}
						else if (step_direction.x < 0){
							results.intersection.x = Math.ceil(to_position.x) + 0.01;
						}
						else{
							results.intersection.x = from_position.x
						}
						
						
					}
					adj_pixel_info = level_image.get_pixel_info(level_image.convert_coord_to_index(last_pixel_info.x, coord_y_step))
					if (level.is_wall(adj_pixel_info)) {
						if (step_direction.z > 0){
							results.intersection.z = Math.floor(to_position.z) - 0.001;
						}
						else if (step_direction.z < 0){
							results.intersection.z = Math.ceil(to_position.z) + 0.001;
						}
						else{
							results.intersection.z = from_position.z
						}
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
	const camera = maze_game.camera;
	const player_light = maze_game.player.light;
	//const debug = maze_game.input_state.debug;


	//box test
	const box = level.get_cell_bounds();
	const boxHelper = new THREE.Box3Helper(box, 0xff0000); // red color
	level.add(boxHelper);
	console.log(box);
	//box test end



	function loop() {
		requestAnimationFrame(loop);
		//let old_position = camera.position.clone();
		let direction = new THREE.Vector3();
		camera.getWorldDirection(direction);
		let new_position = camera.position.clone();
		let moving = false;

		if (keys["w"]) {
			new_position.add(direction.multiplyScalar(speed));
			moving = true;
		}
		if (keys["s"]) {
			new_position.add(direction.multiplyScalar(-speed));
			moving = true;
		}

		if (keys["a"]) camera.rotation.y += 0.05;
		if (keys["d"]) camera.rotation.y -= 0.05;

		if (moving) {
			let collsion_results = maze_game.world_state.line_trace(camera.position, new_position);
			if (collsion_results.collsion) {
				//console.log(collsion_results)
				if (Game_Utils.is_vector_valid(collsion_results.intersection)) {
					camera.position.copy(collsion_results.intersection);
				}
			}
			else {
				camera.position.copy(new_position);
			}
			player_light.position.copy(camera.position);
		}

		if (maze_game.resize) {
			const width = canvas_body.clientWidth;
			const height = canvas_body.clientHeight;
			console.log('resizing', width, height);
			camera.aspect = width / height;
			camera.updateProjectionMatrix()
			level.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
			level.renderer.setSize(width, height);
			maze_game.resize = false;
		}

		//box test
		level.get_cell_bounds(level.get_cell_position(camera.position), box);
		//box.translate(level.get_cell_world_position(level.get_cell_position(camera.position)));
		boxHelper.updateMatrixWorld(true);
		//box test end

		level.renderer.render(level, camera);

	}

	loop();
}

maze_game = new Maze_Game();
