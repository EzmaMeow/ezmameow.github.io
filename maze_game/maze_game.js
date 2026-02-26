
import * as THREE from 'three';
import * as Game_Utils from './game_utility.js'
import * as CANNON from "https://esm.sh/cannon-es";
import { Signal, State, Reactive_Object } from './game_core.js'
import { Physics_Object } from './game_objects.js'
import { Game } from './game.js'
import { Maze_Level } from './maze_level.js'
import { Resource_Manager } from './resource_manager.js'
import { Input_Manager } from './input_manager.js'
import { Player_Character } from './player_character.js'
import CannonDebugger from "https://esm.sh/cannon-es-debugger";

const canvas = document.getElementById("game");
const canvas_body = document.getElementById("canvas_body");

//data for use with collsions. it should stay in memory, but get reset after each use
//sometime maybe partly reset when detecting several collsions, but the old data would
//need to be used or store before the next check
export class Collsion_Data {
	constructor() {
		this.collided = false;
		this.from = new THREE.Vector3();
		this.to = new THREE.Vector3(); //this is the fill length. could be used to project more.
		this.direction = new THREE.Vector3();
		this.intersection = new THREE.Vector3();
		this.collided_object = null;
		this.velocity = new THREE.Vector3();
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

//NOTE object.updateMatrixWorld() for world position in cases where positions
//of children becomes reltive to the parent

//player might be part of maze.js or it could be part of game_core.js
//but most likly a character object will be added to core and player stay here while extending that character


export class Maze_Game extends Game {
	static scene; //main scene for rendering reasons
	static world; //main world
	debug_mode = false;
	//NOTE: Key events are redirected to this, but some may need to be redirected to player
	//maybe have a return so the key call chain can stop for more complex cases
	on_key_down(event) {
		const key = Input_Manager.input_event(event, true);

		if (key === Input_Manager.KEYS.INPUT.LIGHT) {
			if (this.player.light.color.getHex() == 0xf8c377) {
				this.player.light.color.setHex(0x3a3a4f);
			}
			else {
				this.player.light.color.setHex(0xf8c377);
			}
		}
		if (key === Input_Manager.KEYS.INPUT.DEBUG) {
			if (this.debug_mode) {
				this.debug_mode = false;
				this.player.position.y = 0.0;

			}
			else {
				this.debug_mode = true;
			}
			//let test = this.player.camera.position.clone();
			//let direction = new THREE.Vector3();
			//this.player.camera.getWorldDirection(direction);
			//test.add(direction.multiplyScalar(3.0));
			//console.log(Vector_Lib.line_supercover_3d(this.level.get_cell_position(this.player.camera.position),this.level.get_cell_position(test)));
		}
	}
	on_key_up(event) {
		const key = Input_Manager.input_event(event, false);
		if (key === null) { return }
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
			this.player.rotation.y -= movementX * this.input_state.mouseSensitivity;
			if ((this.camera.rotation.x < 1.0 && movementY < 0) || (this.camera.rotation.x > -1.0 && movementY > 0)) {
				this.camera.rotation.x -= movementY * this.input_state.mouseSensitivity;
			}



		}
	}
	on_window_resize() {
		if (!this.resize) {
			this.resize = true;
		}
	}

	constructor(
		renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true }),
		camera = new THREE.PerspectiveCamera(50, canvas_body.clientWidth / canvas_body.clientHeight, 0.001, 32)
	) {
		super(renderer, camera);
		const level = new Maze_Level(canvas, this.world, "assets/maze.png");
		this.level = level;
		this.scene.add(level);
		this.scene.background = new THREE.Color(0x444444);
		Maze_Game.scene = this.scene; //TODO: add cleanup for static scene and world incase abuses
		Maze_Game.world = this.world;
		Maze_Game.level = this.level;
		this.renderer = renderer//level.renderer;
		//todo: remove all this.level and maze_game.level for Maze_Game.scene
		this.renderer.setSize(canvas_body.clientWidth, canvas_body.clientHeight);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
		const level_image = level.level_image;
		const player = new Player_Character();
		this.player = player;
		//const camera = camera //new THREE.PerspectiveCamera(50, canvas_body.clientWidth / canvas_body.clientHeight, 0.001, 32);
		//this.camera = camera;
		camera.position.y = 0.5 * level.get_cell_size().y //could set the camera back, but left and right clip is worst without collsion bounds
		player.add(camera);
		this.settings = new State();
		//may want to rename it to config or something since input manager handling the bulk of input. this will just handle settings
		const input_state = {
			mouseSensitivity: 0.01,
			enable_mouse: false,
		};
		this.input_state = input_state;
		level_image.on_ready = () => {
			level.build()
			startGame(this);
			console.log('mewmew');
		};
		level.add(player);
		console.log('meow adding events')
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

			let cells = Game_Utils.line_supercover(level.get_cell_position(from_position), this.level.get_cell_position(to_position));
			let last_pixel_info = level_image.get_pixel_info(level_image.convert_coord_to_index(from_position.x, from_position.z));
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
					let adj_pixel_info = level_image.get_pixel_info(level_image.convert_coord_to_index(coord_x_step, last_pixel_info.y))
					if (level.is_wall(adj_pixel_info)) {
						//the attept to set point near wall have bugs such as clipping certain corridor walls. the collsion functon may be able to solve it
						//if (step_direction.x > 0){
						//	results.intersection.x = Math.floor(to_position.x) - 0.002;
						//}
						//else if (step_direction.x < 0){
						//	results.intersection.x = Math.ceil(to_position.x) + 0.002;
						//}
						//else{
						results.intersection.x = from_position.x
						//}


					}
					adj_pixel_info = level_image.get_pixel_info(level_image.convert_coord_to_index(last_pixel_info.x, coord_y_step))
					if (level.is_wall(adj_pixel_info)) {
						//if (step_direction.z > 0){
						//	results.intersection.z = Math.floor(to_position.z) - 0.002;
						//}
						//else if (step_direction.z < 0){
						//	results.intersection.z = Math.ceil(to_position.z) + 0.002;
						//}
						//else{
						results.intersection.z = from_position.z
						//}
					}
					return results;
				}
				last_pixel_info = pixel_info;
			});

			return results;

		}
		//the new way(maybe) to handle collsions
		//first it project the collider at its points for any collsions and return if there is any
		//but no point is needed unless it trying to push back against the collider. the results need
		//to state no move is possible. also could not return hand handle sliding cases.
		//then if there no collsion, move the collider along the distance untill there is one
		//and if there is one, either stop and let next update handle slide or handle the slide
		//NOTE: the collider may need to be a specail object with collider getter and properties
		//or it can assume defualt properties if none is provided (so if a object, may need to inject the properties into the collider from the getter)
		this.world_state.project_collison = (collider, direction, distance, results = {}) => {

		};
	}
}


//TODO: try to use a physics library, custom collsion seem to broke. walls will be cubes that hopefully wont cost much. not sure what broke in the old collsion system


function startGame(maze_game) {
	//main ref
	const level = maze_game.level;
	const player = maze_game.player;
	const camera = maze_game.camera;

	//box test
	const box = level.get_cell_bounds();
	level.add(new THREE.Box3Helper(box, 0x008000)); // green color

	//reuable ref base object
	const collsion_data = new Collsion_Data();

	let moving = false;

	//tests
	const radius = 0.24 // m
	const sphereBody = new CANNON.Body({
		mass: 5, // kg
		shape: new CANNON.Sphere(radius),
	})
	sphereBody.position.set(-10, 100, -10) // m
	Maze_Game.world.addBody(sphereBody)
	const geometry = new THREE.SphereGeometry(radius)
	const material = new THREE.MeshNormalMaterial()
	const sphereMesh = new THREE.Mesh(geometry, material)
	level.add(sphereMesh)



	//test end
	//const cannonDebugger = CannonDebugger(level, Maze_Game.world, { color: 0x00ff00 });
	function loop() {
		requestAnimationFrame(loop);

		if (maze_game.debug_mode) {
			camera.getWorldDirection(collsion_data.direction);
		}
		else {
			player.getWorldDirection(collsion_data.direction);
			collsion_data.direction.negate() //camera seem to be incorrectly possition by 180 deg (y?)
		}
		collsion_data.from.copy(player.position)
		collsion_data.to.copy(player.position)
		moving = false;
		let speed_mod = Input_Manager.is_key_down(Input_Manager.KEYS.INPUT.SHIFT) ? 2.0 : 1.0
		if (maze_game.debug_mode) { speed_mod *= 3.0 }
		if (Input_Manager.is_key_down(Input_Manager.KEYS.INPUT.FORWARD)) {
			collsion_data.to.add(collsion_data.direction.multiplyScalar(player.speed * speed_mod * 1000.0));
			collsion_data.velocity.copy(collsion_data.direction);
			collsion_data.velocity.multiplyScalar(player.speed * speed_mod);
			moving = true;
		}
		if (Input_Manager.is_key_down(Input_Manager.KEYS.INPUT.BACK)) {
			collsion_data.direction.negate();
			collsion_data.to.add(collsion_data.direction.multiplyScalar(player.speed * speed_mod * 1000.0));
			collsion_data.velocity.copy(collsion_data.direction);
			collsion_data.velocity.multiplyScalar(player.speed * speed_mod);
			moving = true;
		}

		if (Input_Manager.is_key_down(Input_Manager.KEYS.INPUT.LEFT)) { player.rotation.y += 0.05; }
		if (Input_Manager.is_key_down(Input_Manager.KEYS.INPUT.RIGHT)) { player.rotation.y -= 0.05; }

		if (Input_Manager.is_key_down(Input_Manager.KEYS.INPUT.UP) && maze_game.debug_mode) player.position.y += player.speed;
		if (Input_Manager.is_key_down(Input_Manager.KEYS.INPUT.DOWN) && maze_game.debug_mode) player.position.y -= player.speed;

		if (moving) {
			player.physics_body.velocity.copy(collsion_data.velocity);
		}
		else {
			//setting is fine, but probably should have a dedicated stopping way
			player.physics_body.velocity.set(0.0, 0.0, 0.0);
		}

		

		maze_game.update(performance.now());
		//Maze_Game.world.fixedStep();
		//test (note: physics then rendering. test is syncing the positions)
		sphereMesh.position.copy(sphereBody.position)
		sphereMesh.quaternion.copy(sphereBody.quaternion)
		//player.physics_update()
		//test end

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

		//if (maze_game.debug_mode) {
		//cannonDebugger.update();
		//}

		level.get_cell_bounds(level.get_cell_position(player.position), box);
		//TODO: try to move this to the update
		//level.renderer.render(level, camera);

	}

	loop();
}
