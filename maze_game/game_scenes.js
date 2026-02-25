import { Scene } from 'three';

export class Level extends Scene {
    constructor(world){ 
        super()
        this.world = world;
    }
}

