import { Character } from '../character.js'
import { Vector3, Mesh, SphereGeometry, MeshStandardMaterial, ArrowHelper } from 'three';

//may try to generate these with json, but may still need base template classes for functionality

export class Mouse extends Character {
    ai_state = {
        wait: 0.0,
        move_to: new Vector3(),
    };
    wait = 0;
    _physics_update(delta = 1.0) {
        super._physics_update(delta);
        if (this.ai_state.wait <= 0) {
            const roll = Math.random();
            if (roll >= 0.75) {
                this.movement_component.controller.direction.set(0.0,0.0,0.0)
                this.movement_component.controller.states.speed = 0;
                this.ai_state.wait = Math.random() * 4.0 + 1.0;
                //console.log('mouse waiting for ', this.wait, ' at ', this.position, ' on_ground ', this.movement_component.is_on_ground(), this.movement_component.body)
            }
            else {
                this.ai_state.move_to.set(0.0, 0.0, 0.0);
                this.movement_component.controller.states.speed = 1;
                if (this.navigation) {
                    const navGrid = this.navigation.constructor.getGrid(this.position.x, this.position.y, this.position.z, false, this.navigation)
                    if (navGrid) {
                        //NOTE: should store the point and get the direction to it as well as check of it close enough to trigger a state change
                        const randomPoint = navGrid.randomPointInCell(navGrid.getCellIndex(this.position.x, this.position.y, this.position.z), this.ai_state.move_to)
                    }
                    else {

                    }
                }
                else {

                }
                this.ai_state.wait = Math.random() * 10.0 + 1.0;
                //console.log('mouse moving for ', this.wait, ' at ', this.position, ' and direction= ', this.movement_component.controller.direction)
            }
        }
        else {
            this.ai_state.wait -= delta
            this.mesh.rotation.y += 0.01;
            this.mesh.rotation.x += 0.005
            if (this.ai_state.move_to.length() > 0) {
                this.movement_component.controller.states.speed = 1;
                this.movement_component.controller.direction.set(
                    this.ai_state.move_to.x - this.position.x,
                    this.ai_state.move_to.y - this.position.y,
                    this.ai_state.move_to.z - this.position.z
                )
                this.movement_component.controller.direction.normalize();
            }
            else {
                //should not be needed. if not set, but speed still set just means it was not
                //reseted when move_to was cleared
                this.movement_component.controller.states.speed = 0;
            }
        }
        this.direction_arrow.setDirection(this.movement_component.controller.direction)
        this.direction_arrow.setLength(this.position.distanceTo(this.ai_state.move_to));
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
        this.navigation = options.navigation;
        console.log('mouse nav = ', this.navigation)
        this.direction_arrow = new ArrowHelper(
            this.movement_component.direction,
            new Vector3(),
            1.5,
            '#0d921e',
            0.3,
            0.15
        );
        this.add(this.direction_arrow);
    }

}