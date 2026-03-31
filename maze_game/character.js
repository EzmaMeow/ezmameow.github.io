import { Vector3 } from 'three';
import { Cylinder, Body, Sphere, Vec3 } from "https://esm.sh/cannon-es";
import { Physics_Object } from './physics_object.js'
import { Movement_Component } from './movement_component.js'
import { Controller } from './controller.js'



//NOTE: this is a base class for any object that may be controlled
//so it should have a slot for a controller and functions to allow it to do the
//bare min when a vaild controller is added (mostly trigger moving logic, but may not move if the movement state is not vaild)
export class Character extends Physics_Object {

    //speed = 2.00;
    //movement_component; //decide if this should be protected or not.

    _physics_update(delta = 1.0) {

        if (this.movement_component) {
            this.movement_component.physics_update(delta)
        }
        this.position.copy(this.physics_body.position);
        this.quaternion.copy(this.physics_body.quaternion);
    }

    _add_physics(world) {
        super._add_physics(world);
        this.movement_component.world = world;
    }
    set_position(x = 0.0, y = 0.0, z = 0.0) {
        //TODO: may also want to let controller also handle this case
        this.physics_body.position.set(
            x + this.center_position.x,
            y + this.center_position.y,
            z + this.center_position.z
        )
        this.position.copy(this.physics_body.position)
    }

    //will use a capsule since it help with moving, but might need to allow sphere and box cases
    //for characters that are less complex (or use a diffrent system that handles things in bulk)
    //also need to add things like collsion flags, though cannon has its own version
    constructor(options = {
        'position': new Vector3(0.0, 0.0, 0.0),
        'controller': new Controller(),
        'Movement_Component': Movement_Component,
        'height': 1.0,
        'radius': 0.25,
        'mass': 60.0,
    }) {
        super();

        this.collsion_height = typeof options['height'] === 'number' ? options['height'] : 1.0;
        this.collsion_radius = typeof options['radius'] === 'number' ? options['radius'] : 0.25;
        //Note options keys that uses cap first letters ref to class ref
        const movement_component_class = options['Movement_Component'] ? options['Movement_Component'] : Movement_Component

        //may be best to keep it at xy+ for now
        this.center_position = new Vector3(0.0, this.collsion_height / 2.0 + this.collsion_radius, 0.0); //storing the height for set_position or any other vector offset. this us like origns, but i guess inverted. center of the body

        if (options['position']) {
            this.set_position(
                options['position'].x ? options['position'].x : 0.0,
                options['position'].y ? options['position'].y : 0.0,
                options['position'].z ? options['position'].z : 0.0
            )
        }
        //this.position.add(this.center_position);//adding half the height since I belive the orgin is center, this should set it to the botton center. also need to apply the radius of the lower part
        if (options['controller']) {
            //decide if a movement component class should be pass and how to handle ir
            this.movement_component = new movement_component_class(options['controller'])
        }
        else {
            this.movement_component = new movement_component_class();
        }
        this.physics_body = new Body({
            mass: options['mass'] ? options['mass'] : 60.0,
            shape: new Cylinder(this.collsion_radius, this.collsion_radius, this.collsion_height, 8),
        })
        //top sphere
        this.physics_body.addShape(new Sphere(this.collsion_radius), new Vec3(0, this.collsion_height / 2.0, 0));
        //bottom sphere
        this.physics_body.addShape(new Sphere(this.collsion_radius), new Vec3(0, -this.collsion_height / 2.0, 0));
        this.physics_body.angularFactor.set(0, 0, 0)
        this.physics_body.position.copy(this.position);

        this.movement_component.body = this.physics_body;

    }
}