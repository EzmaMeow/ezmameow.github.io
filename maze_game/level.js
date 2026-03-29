import { Scene, Fog, FogExp2} from 'three';
import { Signal } from './game_core.js'
import { Registry } from './lib/registry.js'
//level is a scene that also hold a world (from cannon-es)
//TODO: decide of this should include cannon world and create one if none was passed
//or not be a scene and include a scene (but this require fallback logic if not a vaild scene or world)
export class Level extends Scene {
    //load state is to help know what state the level is in. only ready (0 meaning nothing loading) is needed to be known
    //so LOAD_STATES is not really nessary except to have a easier to read system for debugging the state
    LOAD_STATES = { INIT: -1, READY: 0, LOAD: 1, LOADING: 2, LOADED: 3, BUILDING: 4 }
    loadState = this.LOAD_STATES.INIT;

    //may need to rename the signals, though I like _ too much. also if change, maybe call it readySignal instead
    #readySignal = new Signal(); get readySignal() { return this.#readySignal; }
    #loadSignal = new Signal(); get loadSignal() { return this.#loadSignal; }

    //nav wont be stored here, but level may have it. nav grid and nav mesh where mesh is a static nav mesh and grid is a dynmaic approch
    //that may link to smaller nav meshes. may need a nav system that handle both cases and expect containers(grid or meshes) to be added and removed
    //so things do not need to acess level for that info. level nav grid is for the level to know itself even when it nav not being used.

    loaded() { } //logic to run after loaded

    build() { }
    ready() {
        this.loadState = this.LOAD_STATES.READY;
        this.readySignal.emit()
    }
    #build() {
        this.loadState = this.LOAD_STATES.BUILDING;
        //if build return false(aka not building or already built when returned), then set to ready else building 
        //will happen over time
        const built = this.build();
        if (built === undefined || built) {
            this.ready();
        }
    }
    #loaded() {
        this.loadState = this.LOAD_STATES.LOADED;
        //will set up common scene options and then let loaded() override them if needed (shouldn't be needed)
        //NOTE: color types will fail unless color is added to Registry conversions
        this.background = this.config.background ? Registry.parceSourceString(this.config.background).value : null;
        this.backgroundBlurriness = this.config.backgroundBlurriness ? Registry.convertType('number', this.config.backgroundBlurriness) : 0;
        this.backgroundIntensity = this.config.backgroundIntensity ? Registry.convertType('number', this.config.backgroundIntensity) : 1;
        //there are other types like environment that need to be added. currently adding the more simple types.
        if (this.config.fog) {
            //type forces it to use a diffrent class if logic support the id.
            if (this.config.fog.type === 'exp2') {
                this.fog = new FogExp2(
                    this.config.fog.color ? Registry.parceSourceString(this.config.fog.color).value : '#000000',
                    this.config.fog.density ? Registry.convertType('number', this.config.fog.density) : 0.2
                );

            }
            else {
                this.fog = new Fog(
                    this.config.fog.color ? Registry.parceSourceString(this.config.fog.color).value : '#000000',
                    this.config.fog.near ? Registry.convertType('number', this.config.fog.near) : 0,
                    this.config.fog.far ? Registry.convertType('number', this.config.fog.far) : 100
                );
            }
        }
        else {
            //may need to recompute shaders of mats that are not recomputed on load
            this.fog = null;
        }
        if (this.world) {
            if (this.config.gravity) {
                this.world.gravity.set(
                    this.config.gravity.x ? this.config.gravity.x : 0.0,
                    this.config.gravity.y ? this.config.gravity.y : -9.82,
                    this.config.gravity.z ? this.config.gravity.z : 0.0
                )
            }
        }

        //if loaded return true, then it not ready to be built (aka it is waiting on a callable)
        const loaded = this.loaded();
        if (loaded === undefined || loaded) {
            this.build();
        }
    }
    load(path) {
        this.loadState = this.LOAD_STATES.LOAD;
        this.#loadSignal.emit();
        this.loadState = this.LOAD_STATES.LOADING;
        this.config = {};
        fetch(path)
            .then(response => {
                if (!response.ok) {
                    console.error(`HTTP error while loading level! Status: ${response.status}`);
                    this.#loaded();
                    //throw new Error(`HTTP error while loading level! Status: ${response.status}`);
                }
                return response.json(); // Parse JSON
            })
            .then(data => {
                this.config = data;
                this.#loaded();
            })
            .catch(error => {
                console.error("Error loading level's JSON:", error);
                this.#loaded();

            });
    }


    constructor(world) {
        super()
        this.world = world;
        //load should be called after. const is for setting up nessary stuff before load
        //and should not worry about where it gets called in const since it should happen after
        //this.load(config_path)
    }
}