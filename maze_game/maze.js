
import * as THREE from 'three';
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";

const canvas = document.getElementById("game");
//const renderer = new THREE.WebGLRenderer({ canvas });
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x444444);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.001, 32);
const player_light = new THREE.PointLight(0x3a3a4f, 0.5, 128,1.0);
scene.add(player_light);
camera.position.set(0.0, 0.0, 0.0);

//const light = new THREE.DirectionalLight(0xffffff, 1);
//const light = new THREE.AmbientLight(0x404040);
//light.position.set(5, 10, 5);
//scene.add(light);

//const loader = new Image();
//loader.src = "maze.png"; // black/white maze image

export class Level_Image {
	#image; //Image
	
	data;	//ImageData
	canvas;
	context;
	is_ready = false; //backup incase it is ready after init

	
	//SIGNALS, EVENTS, AND CALLABLES
	//overriable function to be called when image is loaded and data is populated
	on_ready(){
		console.log('meow ready ', this.is_ready);
	}
	
	#on_load(event,source = this){
		source.context.drawImage(source.#image, 0, 0);
		source.data = source.context.getImageData(0, 0, source.#image.width, source.#image.height).data;
		source.is_ready = true;
		source.on_ready();
	}
	//GETTERS AND SETTERS
	set image(value){
		this.#image = value;
		if (value){
			this.#image.onload = (event) => {this.#on_load(event, this);};
		}
	}
	get image(){
		return this.#image
	}
	//METHOODS
	convert_coord_to_index(x=0,y=0){
		if (x >= this.image.width || y >= this.image.height || x < 0.0 || y < 0.0){
			console.log('outside range')
			return -1
		}
		let id = y * this.image.width + x;
		return id*4;
	}
	get_pixel_info(index) {
		if (index < 0 || index >= this.data.length){
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
	#cell_size = new THREE.Vector3(1.0,2.0,1.0);
	//static ids are reserve strings
	static_object_ids =['north_border','south_border','east_border','west_border','floor','ceil'];
	static_objects = {};
	//coord keyed wall meshes. might not be used depend on is mesh merging is used or not to fix border fighting
	//walls = {};
	//probably should make all defaults have getters and private the cache to prevent incorrect usage
	default_wall_mat = new THREE.MeshLambertMaterial({ color: 0x87ceeb, polygonOffset: true,polygonOffsetFactor: 1, polygonOffsetUnits: 10 });
	default_floor_mat = new THREE.MeshLambertMaterial({ color: 0x87b1eb, polygonOffset: true,polygonOffsetFactor: 1, polygonOffsetUnits: 10 });
	default_ceil_mat = new THREE.MeshLambertMaterial({ color: 0x87ebe3, polygonOffset: true,polygonOffsetFactor: 1, polygonOffsetUnits: 10 });
	#default_xborder_geo = null;
	#default_zborder_geo = null;
	#default_area_geo = null;
	
	maze_geo = null;
	//Note: the one that create this should check if on exists incase it get called twice
	maze_mesh = null;
	get default_xborder_geo(){
		if (this.#default_xborder_geo == null){
			this.#default_xborder_geo = new THREE.BoxGeometry((this.level_image.image.height + 0.0) * this.#cell_size.x, this.#cell_size.y, this.#cell_size.z);
		}
		return this.#default_xborder_geo
	}
	get default_zborder_geo(){
		if (this.#default_zborder_geo == null){
			this.#default_zborder_geo = new THREE.BoxGeometry(this.#cell_size.x, this.#cell_size.y, (this.level_image.image.width + 0.0) * this.#cell_size.z);
		}
		return this.#default_zborder_geo
	}
	get default_area_geo(){
		if (this.#default_area_geo == null){
			this.#default_area_geo = new THREE.PlaneGeometry(this.level_image.image.height, this.level_image.image.width);
		}
		return this.#default_area_geo
	}
	build_maze(){
		const geometries = [];
		this.level_image.for_each_pixel((pixel_info)=>{
			const px = new THREE.PlaneGeometry(this.#cell_size.x, this.#cell_size.y).rotateY(Math.PI / 2); // +X
			const nx = new THREE.PlaneGeometry(this.#cell_size.x, this.#cell_size.y).rotateY(-Math.PI / 2); // -X
			const pz = new THREE.PlaneGeometry(this.#cell_size.z, this.#cell_size.y); // +Z
			const nz = new THREE.PlaneGeometry(this.#cell_size.z, this.#cell_size.y).rotateY(Math.PI); // -Z
			if (this.is_wall(pixel_info)) {
				let near_pixel_info = this.level_image.get_pixel_info(this.level_image.convert_coord_to_index(pixel_info.x+1,pixel_info.y))
				if (!this.is_wall(near_pixel_info)){
					px.translate(pixel_info.x*this.#cell_size.x + this.#cell_size.z/2.0, 0.0, pixel_info.y * this.#cell_size.z);
					geometries.push(px);
				}
				near_pixel_info = this.level_image.get_pixel_info(this.level_image.convert_coord_to_index(pixel_info.x-1,pixel_info.y))
				if (!this.is_wall(near_pixel_info)){
					nx.translate(pixel_info.x*this.#cell_size.x - this.#cell_size.z/2.0, 0.0, pixel_info.y * this.#cell_size.z);
					geometries.push(nx);
				}
				near_pixel_info = this.level_image.get_pixel_info(this.level_image.convert_coord_to_index(pixel_info.x,pixel_info.y+1))
				if (!this.is_wall(near_pixel_info)){
					pz.translate(pixel_info.x*this.#cell_size.x, 0.0, pixel_info.y * this.#cell_size.z + this.#cell_size.x/2.0);
					geometries.push(pz);
				}
				near_pixel_info = this.level_image.get_pixel_info(this.level_image.convert_coord_to_index(pixel_info.x,pixel_info.y-1))
				if (!this.is_wall(near_pixel_info)){
					nz.translate(pixel_info.x*this.#cell_size.x, 0.0, pixel_info.y * this.#cell_size.z - this.#cell_size.x/2.0);
					geometries.push(nz);
				}
			}
		});
		if (this.maze_geo){
			this.maze_geo.dispose();
		}
		this.maze_geo = BufferGeometryUtils.mergeGeometries(geometries, true);
		if (this.maze_mesh){
			this.maze_mesh.geometry = this.maze_geo;
			this.maze_mesh.material = this.default_wall_mat;
		}
		else{
			this.maze_mesh = new THREE.Mesh(this.maze_geo, this.default_wall_mat);
			scene.add(this.maze_mesh);
		}
		
	}
	get_cell_position(position){
		let cell_position = new THREE.Vector3(
			position.x / this.#cell_size.x,
			position.y / this.#cell_size.y,
			position.z / this.#cell_size.z
		);
		//cell_position.copy(this.#cell_size);
		cell_position.round();
		return cell_position;
	}
	is_wall(pixel_info){
		//will treat null as a wall unless need to extend pass bounds
		if (pixel_info == null){
			return true
		}
		return pixel_info.r < 128 && pixel_info.g < 128 && pixel_info.b < 128;
	}
	#create_static_border(id){
		let border = null;
		if (id in this.static_objects){
			border = this.static_objects[id];
		}
		if(id == this.static_object_ids[0]){
			if (border == null){
				border = new THREE.Mesh(this.default_xborder_geo, this.default_wall_mat);
			}
			border.position.set(this.level_image.image.height/2.0 -this.#cell_size.x/2.0, 0.0, -this.#cell_size.z);
		}
		else if(id == this.static_object_ids[1]){
			if (border == null){
				border = new THREE.Mesh(this.default_xborder_geo, this.default_wall_mat);
			}
			border.position.set(this.level_image.image.height/2.0 -this.#cell_size.x/2.0, 0.0, this.level_image.image.width*this.#cell_size.z);
		}
		else if(id == this.static_object_ids[2]){
			if (border == null){
				border = new THREE.Mesh(this.default_zborder_geo, this.default_wall_mat);
			}
			border.position.set(this.level_image.image.height*this.#cell_size.x, 0.0, this.level_image.image.width/2.0 -this.#cell_size.z/2.0);
		}
		else if(id == this.static_object_ids[3]){
			if (border == null){
				border = new THREE.Mesh(this.default_zborder_geo, this.default_wall_mat);
			}
			border.position.set(-this.#cell_size.x, 0.0, this.level_image.image.width/2.0 -this.#cell_size.z/2.0);
		}
		this.static_objects[id] = border
		border.name = id;
		this.add(border);
		return border;
	}
	#create_static_floor(){
		let floor;
		if (this.static_object_ids[4] in this.static_objects){
			floor = this.static_objects[this.static_object_ids[4]];
		}
		else{
			floor = new THREE.Mesh(this.default_area_geo, this.default_floor_mat);
		}
		this.static_objects[this.static_object_ids[4]] = floor;
		floor.name = this.static_object_ids[4];
		floor.rotation.x = -Math.PI / 2;
		floor.position.set(this.level_image.image.height/2.0-this.#cell_size.x/2.0,-this.#cell_size.y/2.0,this.level_image.image.width/2.0-this.#cell_size.z/2.0);
		this.add(floor);
		return floor;
	}
	#create_static_ceil(){
		let ceil;
		if (this.static_object_ids[5] in this.static_objects){
			ceil = this.static_objects[this.static_object_ids[5]];
		}
		else{
			ceil = new THREE.Mesh(this.default_area_geo, this.default_ceil_mat);
		}
		this.static_objects[this.static_object_ids[5]] = ceil;
		ceil.name = this.static_object_ids[5];
		ceil.rotation.x = Math.PI / 2; 
		ceil.position.set(this.level_image.image.height/2.0-this.#cell_size.x/2.0,this.#cell_size.y/2.0,this.level_image.image.width/2.0-this.#cell_size.z/2.0);
		this.add(ceil);
		return ceil;
	}
	get_static_border(id){
		return this.#create_static_border(id);
	}
	get north_border(){
		return this.#create_static_border(this.static_object_ids[0]);
	}
	get south_border(){
		return this.#create_static_border(this.static_object_ids[1]);
	}
	get east_border(){
		return this.#create_static_border(this.static_object_ids[2]);
	}
	get west_border(){
		return this.#create_static_border(this.static_object_ids[3]);
	}
	get static_floor(){
		return this.#create_static_floor();
	}
	get static_ceil(){
		return this.#create_static_ceil();
	}
	build(){
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
	get_cell_size(){
		return this.#cell_size; //I belive vectors are ref types so setting it could break ref. getter should be editable if it is a proper ref type
	}
	constructor(source_image = Level.default_source_image) {
		super();
		this.level_image = new Level_Image(source_image);
	}
}

const cell_x = 1.0; const cell_y = 1.0; const cell_height = 1.0;
const is_wall = (pixel_info) => {return pixel_info.r < 128 && pixel_info.g < 128 && pixel_info.b < 128;}
const level = new Level("maze.png");
scene.add(level);
let level_image = level.level_image
level_image.on_ready = () => {
	level.build()
	startGame();
	console.log('mewmew');
};

let moveSpeed = 0.1
let mouseSensitivity = 0.01
let keys = {}
let pitch = 0, yaw = 0
let enable_mouse = false
let debug = false;


document.addEventListener("keydown", e => {
	keys[e.key] = true 
	if (e.key == "l"){
		if (player_light.color.getHex() == 0xf8c377){
			player_light.color.setHex(0x3a3a4f);
			
		}
		else{
			player_light.color.setHex(0xf8c377);
		}
	}
	if (e.key == "`"){
		if (debug){
			debug = false;
			camera.position.y = 0.0
		}
		else{
			debug = true;
			camera.position.y = 2.0
		}
	}
});
document.addEventListener("keyup", e => keys[e.key] = false);

document.addEventListener('mousedown', function (event) {
    if (event.button === 1) {
		enable_mouse = true;
	}
});
document.addEventListener('mouseup', function (event) {
    if (event.button === 1) {
		enable_mouse = false;
	}
});
document.addEventListener('mousemove', (e) => {
  if (enable_mouse) {
	const movementX = e.movementX || e.mozMovementX || e.webkitMovementX || 0.0;
	const movementY = e.movementY || e.mozMovementY || e.webkitMovementY || 0.0;
	camera.rotation.y -= movementX * mouseSensitivity;
  }
});

function startGame() {
  const speed = 0.05;


  function loop() {
    requestAnimationFrame(loop);
	//let old_position = camera.position.clone();
	let new_position = camera.position.clone();
	let direction = new THREE.Vector3();
	camera.getWorldDirection( direction );

	if (keys["w"]) new_position.add(direction.multiplyScalar(speed));
	if (keys["s"]) new_position.add(direction.multiplyScalar(-speed));

	if (keys["a"]) camera.rotation.y += 0.05;
	if (keys["d"]) camera.rotation.y -= 0.05;

	let pos_diffrence = new THREE.Vector3(new_position.x-camera.position.x,new_position.y-camera.position.y,new_position.z-camera.position.z);
	let cell_pos = level.get_cell_position(new_position);
	//NOTE: will return null if out of range. levels are bound to the image size
	//if (for reason) level chunking is needed, then these null cases would need to be projected 
	//to neigboring chunks
	let pixel_info = level_image.get_pixel_info(level_image.convert_coord_to_index(cell_pos.x,cell_pos.z));
	let cell_pos_x = level.get_cell_position(new THREE.Vector3(new_position.x, new_position.y, camera.position.z));
	let cell_pos_y = level.get_cell_position(new THREE.Vector3(camera.position.x, new_position.y, new_position.z));
	let pixel_info_x = level_image.get_pixel_info(level_image.convert_coord_to_index(cell_pos_x.x,cell_pos_x.z));
	let pixel_info_y = level_image.get_pixel_info(level_image.convert_coord_to_index(cell_pos_y.x,cell_pos_y.z));
	//TODO: the two checks are nessary for sliding but should be rename and maybe converted to a function
	//forward and side info as well as keep the original one since that is the target and x or y block may be the target
	//at an angle, but could block acessing things at an angle
	//NOTE: probably should make sure it is possible to get near the wall at high speeds. so instead of setting back to camera
	//it will use a value between new and old at the point it would have cross over
	//Calling the target first so it dose not override the slide..but it still cancel it since it new_pos was overridedn
	//so it may not be used or the latter need to reapply the change
	//if (pixel_info != null){
	//	if (level.is_wall(pixel_info)){
	//		console.log('mew wall at target ');
	//		new_position.copy(camera.position)
	//	}
	//}
	//else{
	//	console.log('p target null');
	//	new_position.copy(camera.position)
	//	
	//}
	if (debug){
		camera.position.copy(new_position)
		player_light.position.copy(camera.position)
		renderer.render(scene, camera);
		return
	}

	if (level.is_wall(pixel_info_x)){
		console.log('mew wall at x ');
		new_position.x = camera.position.x
	}
	if (level.is_wall(pixel_info_y)){
		console.log('mew wall at y ');
		new_position.z = camera.position.z
	}
	//if the target is block yet the other two cases are false, then this will override the
	//slide to prevent sliding through walls
	if (level.is_wall(pixel_info) && !level.is_wall(pixel_info_x) && !level.is_wall(pixel_info_y)){
		console.log('mew wall at target ');
		new_position.copy(camera.position)
	}


	camera.position.copy(new_position)
	player_light.position.copy(camera.position)
    renderer.render(scene, camera);
  }

  loop();
}
