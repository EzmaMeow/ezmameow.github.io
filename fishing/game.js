import { Renderer } from "./canvas_game/renderer.js"
import { CAPABILITY_FLAGS } from "./canvas_game/render_object.js"
import { ImageRenderObject } from "./canvas_game/image_render_object.js"
import { OrthogonalCamera } from "./canvas_game/cameras.js"
import renderObjectManager from "./canvas_game/render_object_manager.js"
import assetManager from "./canvas_game/asset_manager.js"
import { Fish_Enity } from "./fish_enity.js"

const assets = {
    sprite: "/assets/anim_profile_pic.webp",
    background: "/assets/background.jpg",
};

const scene_container = document.getElementById('world')
const scene_canvas = document.createElement("canvas");
const renderer = new Renderer();
const camera = new OrthogonalCamera(scene_canvas, 320, 320)
renderer.renderObjectManager = renderObjectManager;
renderer.camera = camera;


//invert the load to take a uid and load from a path if not provided
//so uid can be undeifned if path is vaild
async function load(uid, path) {
    if (!path) {
        path = assets[uid]
    }
    return await assetManager.load(path, uid)
}
async function start() {
    const test_image = await load("sprite");
    const test_background_image = await load("background");

    const test_camera = camera
    const test_object = new ImageRenderObject(test_image, { width: 32, height: 32 });
    const test_background = new ImageRenderObject(test_background_image, { width: 320, height: 320 });
    test_background.layer = -1;

    const testOptions = {
        image: test_image,
        width: 32,
        height: 32,
        capabilityFlags: CAPABILITY_FLAGS.CLICKABLE, //should make a static version as a default and expect each class to pull from their own
        position: { x: 32, y: 32, z: 1 },
        onClick: function () { console.log(`meow depth is ${this.zRenderOrder}`) }
    }

    const test_objectA = new ImageRenderObject(test_image, testOptions);

    testOptions.position.z += 0.5
    testOptions.position.y += 64
    const test_objectB = new ImageRenderObject(test_image, testOptions);

    testOptions.position.z += 0.5
    const test_objectC = new ImageRenderObject(test_image, testOptions);

    testOptions.position.z += 0.5
    const test_objectD = new ImageRenderObject(test_image, testOptions);


    testOptions.image = undefined;
    testOptions.width = 20;
    testOptions.height = 20;
    testOptions.onClick = function () { console.log('meow is a fish') };
    testOptions.position = { x: 32 * 4, y: 32 * 4, z: 1 }
    testOptions.textureX = 0;
    testOptions.textureY = 0;

    const testFish = await Fish_Enity.create(testOptions)

    test_object.setScale(1.0, 1.0)
    //const render_object_manager = new RenderObjectManager();

    
    

    renderObjectManager.add(test_background);
    renderObjectManager.add(test_object);

    renderObjectManager.add(test_objectA);
    renderObjectManager.add(test_objectB);
    renderObjectManager.add(test_objectC);
    renderObjectManager.add(test_objectD);

    //renderObjectManager.add(fish_test);

    function resize_canvas() {
        const rect = scene_container.getBoundingClientRect();
        scene_canvas.width = rect.width;
        scene_canvas.height = rect.width; //keep it square, but may need to define a min size
        camera.updateViewport();
    }

    //scene_canvas.id = "myCanvas";
    scene_canvas.style.border = "1px solid black";
    scene_canvas.style.width = 'calc(100% - 2px)'//this corrects offsets applied via borders and such, just rember it draws to the bottom right so things get push in the direction

    //NOTE: if a camera is used, it also need to have it dim adjusted. also the viewport too if it not reading the canvas directly per update
    resize_canvas()

    scene_container.appendChild(scene_canvas);
    test_object.onImageLoaded = function () {
        test_object.onClick = function () { console.log('meow') }
        test_object.capabilityFlags |= test_object.CAPABILITY_FLAGS.CLICKABLE;
    }
    test_background.onImageLoaded = function () {
        //NOTE: the issues is not really with how it rendering, but the check is base on the object's hight/width than what it is overlaping with
        //so offseting itself by the width/hight wont work since the diffrence is base on itself at the time of sorting
        test_background.xRenderOffset = test_background.width;
        test_background.yRenderOffset = test_background.height;
    }



    //note: window.ResizeObserver may be useful too
    window.addEventListener('resize', resize_canvas);

    const playerPosition = new Float32Array(3);
    const cameraPosition = new Float32Array(3);
    document.addEventListener('keydown', function (event) {
        let changed = false
        // event.key will be one of: "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"
        test_object.getPosition(playerPosition);
        switch (event.key) {
            case 'ArrowUp':
                //test_object.posY += 8
                cameraPosition[1] -= 8
                break;
            case 'ArrowDown':
                cameraPosition[1] += 8
                break;
            case 'ArrowLeft':
                cameraPosition[0] -= 8
                break;
            case 'ArrowRight':
                cameraPosition[0] += 8
                break;
            case 'w':
                playerPosition[1] -= 8
                //test_object.posY -= 8
                break;
            case 's':
                playerPosition[1] += 8
                //test_object.posY += 8
                break;
            case 'a':
                playerPosition[0] -= 8
                //test_object.posX -= 8
                break;
            case 'd':
                playerPosition[0] += 8
                //test_object.posX += 8
                break;
            case 'e':
                playerPosition[2] += 0.25
                break;
            case 'q':
                playerPosition[2] += 0.25
                break;
            default:
                // Ignore other keys
                return;
        }
        //TODO: an actual object would have a move function or similar that handles the add position logic than just setting it.
        //could add it to the render object, but they are ment to be fix and moved by their owner
        //also this logic should be done at the end of frame or begining, but currently not using a render loop
        test_object.setPosition(playerPosition[0], playerPosition[1], playerPosition[2])
        test_camera.setPosition(cameraPosition[0], cameraPosition[1], cameraPosition[2])
    })

    scene_canvas.addEventListener('click', function (event) {
        const rect = scene_canvas.getBoundingClientRect();

        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        renderObjectManager.onClick(x, y, Infinity, 10, renderer.camera)
    })
}
let test = 0
function update() {
    renderer.render(scene_canvas)
    //test += 1;
    //if (test > 300){
    //    assetManager.unload("/assets/anim_profile_pic.webp")
    //}
    requestAnimationFrame(() => update());
}
await start();
window.render = function(rerender = false){
    renderer.render(scene_canvas, renderObjectManager, renderer.camera, rerender)
    return 'rendering'
}
console.log(assetManager)
console.log(renderObjectManager)
update();