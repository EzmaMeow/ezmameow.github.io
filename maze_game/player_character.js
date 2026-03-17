import { Vector3, PointLight } from 'three';
import { Cylinder, Body, Sphere, Vec3, Ray, RaycastResult } from "https://esm.sh/cannon-es";
import { Physics_Object } from './game_objects.js'
import { Movement_Component } from './movement_component.js'
import { Controller } from './controller.js';

import { Audio_Manager } from './audio_manager.js'
import { Footsteps } from './sound_scripts/footsteps.js'

export class Player_Character extends Physics_Object {
    //TODO: Move all the player base logic here and maybe create a dedicated character object
    speed = 2.00;
    camera = null;//may need a camera component that hold the camera ref. that would allow controlling the camera position and rot without modifing the camera
    movement_component; //decide if this should be protected or not.
    step_cooldown = 0;

    _physics_update(delta = 1.0) {

        if (this.movement_component) {

            this.movement_component.physics_update(delta)
        }
        //console.log(this.on_ground)
        //this.on_ground = false;
        this.position.copy(this.physics_body.position)
        //below is not needed to prevent messing with viewing
        //this.quaternion.copy(this.body.quaternion)
        //we may use the object rotations and such since it is easier to modify
        //but may need to be converted back and done the harder way if we want forces to influances(this project dose not expect that)
        this.physics_body.quaternion.copy(this.quaternion)
        if (this.movement_component.movement_state & Movement_Component.MOVEMENT_STATE.GROUNDED && this.movement_component.movement_state & Movement_Component.MOVEMENT_STATE.MOVING){
            this.play_footsteps(this.movement_component.get_speed() > 5 ? 0.25: 0.5); //checking max speed for now to reduce loop cost for now
        }
        if (this.step_cooldown > 0){this.step_cooldown -= delta;}
    }
    _add_physics(world) {
        super._add_physics(world);
        this.movement_component.world = world;
    }
    set_position(x=0.0,y=0.0,z=0.0){
        this.physics_body.position.set(
            x + this.center_position.x,
            y + this.center_position.y,
            z + this.center_position.z
        )
        this.position.copy(this.physics_body.position)

    }
    jump() {
        this.play_footsteps();
    }
    //this is a test untill I work on handling the sound better (or modify the footsteps to be flag on and off and loop while on)
    play_footsteps(cooldown = 0.25){
        if (this.step_cooldown <= 0){
            Audio_Manager.get_sound('player_footsteps').play();
            this.step_cooldown = cooldown;
            return
        }
    }
    constructor(options = {
        'position': new Vector3(0.0,0.0,0.0),
        'controller': new Controller(),
        'Movement_Component':Movement_Component,
        'height':1.0,
        'radius':0.25,
        'mass': 60.0,
    }) {
        super();
        const height = options['height'] ? options['height'] : 1.0;
        const radius = options['radius'] ? options['radius'] : 0.25;
        //Note options keys that uses cap first letters ref to class ref
        const movement_component_class = options['Movement_Component'] ? options['Movement_Component'] : Movement_Component

        //may be best to keep it at xy+ for now
        this.center_position = new Vector3(0.0, height/2.0 + radius,0.0); //storing the height for set_position or any other vector offset. this us like origns, but i guess inverted. center of the body

        if (options['position']) { 
            this.set_position(
                options['position'].x?options['position'].x:0.0,
                options['position'].y?options['position'].y:0.0,
                options['position'].z?options['position'].z:0.0
            ) 
        }
        //this.position.add(this.center_position);//adding half the height since I belive the orgin is center, this should set it to the botton center. also need to apply the radius of the lower part
        if (options['controller']) {
            //decide if a movement component class should be pass and how to handle ir
            this.movement_component = new movement_component_class(options['controller'])
        }
        else{
            this.movement_component = new movement_component_class();
        }
        this.physics_body = new Body({
            mass: options['mass'] ? options['mass'] : 60.0,
            shape: new Cylinder(radius, radius, height, 8),
        })
        //top sphere
        this.physics_body.addShape(new Sphere(radius), new Vec3(0, height / 2.0, 0));
        //bottom sphere
        this.physics_body.addShape(new Sphere(radius), new Vec3(0, -height / 2.0, 0));
        this.physics_body.angularFactor.set(0, 0, 0)
        this.physics_body.position.copy(this.position) // m
        this.movement_component.body = this.physics_body;

        this.light = new PointLight(0x3a3a4f, 1.0, 128, 1.0);
        this.light.position.y = height / 2.0;
        this.add(this.light);

        Audio_Manager.add_sound('player_footsteps',Footsteps);
        this.movement_component.on_jump.connect(()=>this.jump());
    }
}