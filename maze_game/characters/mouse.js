import { Character } from '../character.js'
import { Vector3, Mesh, SphereGeometry, MeshStandardMaterial } from 'three';

//may try to generate these with json, but may still need base template classes for functionality

export class Mouse extends Character {
    wait = 0;
    _physics_update(delta = 1.0) {
        super._physics_update(delta);
        if (this.wait <= 0) {
            const roll = Math.random();
            if (roll >= 0.75) {
                this.movement_component.controller.direction.x = 0.0
                this.movement_component.controller.direction.z = 0.0
                this.movement_component.controller.states.speed = 0;
                this.wait = Math.random() * 4.0 + 1.0;
                //console.log('mouse waiting for ', this.wait, ' at ', this.position, ' on_ground ', this.movement_component.is_on_ground(), this.movement_component.body)
            }
            else {

                this.movement_component.controller.direction.x = Math.random() * 2.0 - 1.0;
                this.movement_component.controller.direction.z = Math.random() * 2.0 - 1.0;
                this.movement_component.controller.states.speed = 1;
                //this.movement_component.controller.direction.x = 0.5;
                //this.movement_component.controller.direction.z = 0.5;
                this.wait = Math.random() * 4.0 + 1.0;
                //console.log('mouse moving for ', this.wait, ' at ', this.position, ' and direction= ', this.movement_component.controller.direction)
            }
        }
        else {
            this.wait -= delta
            this.mesh.rotation.y += 0.01;
            this.mesh.rotation.x += 0.005
        }

    }
    constructor(options = {
        'height': 0.00,
        'radius': 0.25,
        'mass': 10.0,
    }) {
        super(options);
        const geometry = new SphereGeometry(
            this.collsion_radius,   // radius
            32,  // width segments
            32   // height segments
        );

        // 6. Create a material
        const material = new MeshStandardMaterial();

        // 7. Create the mesh
        this.mesh = new Mesh(geometry, material);
        this.add(this.mesh);
    }

}