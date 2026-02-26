import {Vector3,PointLight} from 'three';
import {Cylinder,Body,Sphere,Vec3} from "https://esm.sh/cannon-es";
import { Physics_Object } from './game_objects.js'

export class Player_Character extends Physics_Object {
    //TODO: Move all the player base logic here and maybe create a dedicated character object
    speed = 0.05;
    camera = null;

    _physics_update() { 
        this.position.copy(this.physics_body.position)
        //below is not needed to prevent messing with viewing
        //this.quaternion.copy(this.body.quaternion)
    }

    constructor(options = {
        'position': new Vector3(),
    }) {
        super();
        if (options['position']) { this.position.copy(options['position']) }
        let height = 0.5;
        let radius = 0.25;
        this.physics_body = new Body({
            mass: 60, // kg
            shape: new Cylinder(radius, radius, height, 8),
        })
        //top sphere
        this.physics_body.addShape(new Sphere(radius), new Vec3(0, height / 2.0, 0));
        //bottom sphere
        this.physics_body.addShape(new Sphere(radius), new Vec3(0, -height / 2.0, 0));
        this.physics_body.angularFactor.set(0, 0, 0)
        this.physics_body.position.copy(this.position) // m

        this.light = new PointLight(0x3a3a4f, 1.0, 128, 1.0);
        this.light.position.y = height / 2.0;
        this.add(this.light);
    }
}