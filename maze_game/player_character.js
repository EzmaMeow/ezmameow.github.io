import { Vector3, PointLight } from 'three';
import { Cylinder, Body, Sphere, Vec3, Ray, RaycastResult } from "https://esm.sh/cannon-es";
import { Physics_Object } from './game_objects.js'
import { Movement_Component } from './movement_component.js'
import { Controller } from './controller.js';

export class Player_Character extends Physics_Object {
    //TODO: Move all the player base logic here and maybe create a dedicated character object
    speed = 2.00;
    camera = null;//may need a camera component that hold the camera ref. that would allow controlling the camera position and rot without modifing the camera
    movement_component; //decide if this should be protected or not.

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
    }
    _add_physics(world) {
        super._add_physics(world);
        this.movement_component.world = world;
    }
    jump() {
        this.movement_component.jump();
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
        if (options['position']) { this.position.copy(options['position']) }
        this.position.y += height/2.0 + radius;//adding half the height since I belive the orgin is center, this should set it to the botton center. also need to apply the radius of the lower part
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

    }
}