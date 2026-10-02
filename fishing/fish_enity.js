import { ImageRenderObject } from "./canvas_game/image_render_object.js"
//NOTE: the manager are being treated as singletons. render object manager was design to be swap out
//may need to redesign object manager to hold groups
import assetManager from "./canvas_game/asset_manager.js"
import renderObjectManager from "./canvas_game/render_object_manager.js"

//This is a test to see how to design the fish animation using the image render object
//NOTE: could be lazy and hardcode the animation logic, or try to find the notes on the animation structure
//and try to make an animation object
//Note: image size (16,16) could be change tosize/x where x is the number of frames on that row
export class Fish_Enity extends ImageRenderObject {
    static async create(options) {
        let image;
        if (options) {
           image = options.image || await assetManager.load("/assets/fish.json"); 
        }
        else{
           image = await assetManager.load("/assets/fish.json"); 
        }
        const fish = new Fish_Enity(image, options)
        renderObjectManager.add(fish)
        return fish
    }
    frame = 0
    draw(canvasContext) {
        super.draw(canvasContext);
        this.update()
    }
    update(delta = 1.0) {
        this.frame += delta
        let step = Math.round(this.frame * 0.1)
        this.textureX = step % 4

    }
    
    constructor(image, options) {
        super(image, options);
    }
}