
import { Mat4 } from "/lib/square_matrix_math.js"

//NOTE: may hold the render object and its render packet since this manages it
//NOTE: may not use the packet and just create an object/array of the data or use the object directly
//also data may be an array
export class RenderObject {
    #CAPABILITY_FLAGS = { CLICKABLE: 1 << 0 }
    get CAPABILITY_FLAGS() { return this.#CAPABILITY_FLAGS; }
    #capabilityFlags = 0
    _onRenderChanged = undefined; //callback to the object manager. //called when sortkey change or anything that the object manager need to listen to
    _onCapabilityChanged = undefined;
    _sortKey = 0;
    transformation = Mat4.identity();
    _scale = new Float32Array([1.0, 1.0, 1.0]);
    depth = 1.0;
    baseHeight = 1;
    get height() { return this.baseHeight * this._scale[1] }
    baseWidth = 1;
    get width() { return this.baseWidth * this._scale[0]; }
    get capabilityFlags() { return this.#capabilityFlags }
    set capabilityFlags(value) {
        if (value != this.#capabilityFlags) {
            this.#capabilityFlags = value | 0;
            if (this._onCapabilityChanged) {
                this._onCapabilityChanged(this)
            }
        }
    }
    #sortRecord = new Float32Array(4); //x,y,z,layer
    get sortRecord() {
        if (this._dirty) {
            this.#sortRecord[0] = this.xRenderOrder;
            this.#sortRecord[1] = this.yRenderOrder;
            this.#sortRecord[2] = this.zRenderOrder;
            this.#sortRecord[3] = this.layer;
            this._dirty = false
        }
        return this.#sortRecord
    }
    #layer = 0;
    _dirty = true
    get layer() { return this.#layer }
    set layer(value) {
        if (value != this.#layer) {
            this.#layer = value;
            this.renderChange()
        }
    }
    renderChange() {
        if (this._onRenderChanged) {
            this._dirty = true
            this._onRenderChanged(this)
        }
    }

    #zRenderOffset = 0.0
    get zRenderOffset() { return this.#zRenderOffset }
    set zRenderOffset(value) {
        if (value !== this.#zRenderOffset) {
            this.#zRenderOffset = value;
            this.renderChange()
        }
    }

    #yRenderOffset = 0.0
    get yRenderOffset() { return this.#yRenderOffset }
    set yRenderOffset(value) {
        if (value !== this.#yRenderOffset) {
            this.#yRenderOffset = value;
            this.renderChange()
        }
    }

    #xRenderOffset = 0.0
    get xRenderOffset() { return this.#xRenderOffset }
    set xRenderOffset(value) {
        if (value !== this.#xRenderOffset) {
            this.#xRenderOffset = value;
            this.renderChange()
        }
    }

    get yRenderOrder() { return Mat4.getPositionY(this.transformation) + this.yRenderOffset }
    get xRenderOrder() { return Mat4.getPositionX(this.transformation) + this.xRenderOffset }
    get zRenderOrder() { return Mat4.getPositionZ(this.transformation) + this.zRenderOffset }

    visible = true;

    updateSize() {
        Mat4.setScale(this.transformation, this._scale[0], this._scale[1], this._scale[2])
    }
    setScale(x = 1.0, y = 1.0, z = 1.0) {
        this._scale[0] = x;
        this._scale[1] = y;
        this._scale[2] = z;
        this.updateSize()
    }
    getPosition(targetVector = new Float32Array(3)) {
        return Mat4.getPosition(this.transformation, targetVector)
    }
    setPosition(x = 0.0, y = 0.0, z = 0.0) {
        Mat4.setPosition(this.transformation, x, y, z)
        this.renderChange()
    }

    getSortRecord() {
        if (this._dirty) {
            this.#sortRecord[0] = this.xRenderOrder;
            this.#sortRecord[1] = this.yRenderOrder;
            this.#sortRecord[2] = this.zRenderOrder;
            this.#sortRecord[3] = this.layer;
            this._dirty = false
        }
        return this.#sortRecord
    }

    getAABB(aabb = new Float32Array(6), mvMatrix = this.transformation) {
        aabb[3] = this.baseWidth * Mat4.getXScale(mvMatrix) / 2.0;
        aabb[4] = this.baseHeight * Mat4.getYScale(mvMatrix) / 2.0;
        aabb[5] = this.depth * Mat4.getZScale(mvMatrix) / 2.0;
        aabb[0] = Mat4.getPositionX(mvMatrix) + aabb[3];
        aabb[1] = Mat4.getPositionY(mvMatrix) + aabb[4];
        aabb[2] = Mat4.getPositionZ(mvMatrix) + aabb[5];
        return aabb;
    }
    deconstructor() {
        _onRenderChanged = null;
    }
    constructor(width = 1, height = 1, depth = 1) {
        this.baseWidth = width;
        this.baseHeight = height;
        this.depth = depth;
    }
}

export class ImageRenderObject extends RenderObject {
    #image
    imageLoaded() {
        if (!this.baseWidth) {
            this.baseWidth = this.image.naturalWidth || this.image.videoWidth || this.image.width || 0
        }
        if (!this.baseHeight) {
            this.baseHeight = this.image.naturalHeight || this.image.videoHeight || this.image.height || 0;
        }
        this.updateSize()
        if (this.onImageLoaded) {
            this.onImageLoaded();
        }
    }
    get image() {
        return this.#image;
    }
    set image(value) {
        if (this.#image === value) { return }
        if (this.#image) {
            this.#image.removeEventListener('load', () => this.imageLoaded());
        }
        this.#image = value;
        if (this.#image.complete) {
            this.imageLoaded();
        }
        this.#image.addEventListener('load', () => this.imageLoaded());
    }
    imageCoordX = 0.0
    imageCoordY = 0.0
    draw(canvasContext) {
        canvasContext.drawImage(this.image, this.imageCoordX, this.imageCoordY, this.image.width, this.image.height, 0, 0, this.baseWidth, this.baseHeight);
    }
    deconstructor() {
        super.deconstructor();
        if (this.#image) {
            this.#image.removeEventListener('load', () => this.imageLoaded());
        }
        this.#image = null;
    }
    //should allow more parameters or options, but the size seem to be the nessary defaults. the starting transformation could be set later
    constructor(image, width = 0, height = 0, depth = 1) {
        super(width, height, depth);
        this.image = image;

    }
}
// Column-major layout:
// [ 0   4   8  12 ]
// [ 1   5   9  13 ]
// [ 2   6  10  14 ]
// [ 3   7  11  15 ]

// [ 0   3   6 ]
// [ 1   4   7 ]
// [ 2   5  8 ]



export class Camera {
    transformation = Mat4.identity();
    getPosition(targetVector = new Float32Array(3)) {
        return Mat4.getPosition(this.transformation, targetVector)
    }
    setPosition(x = 0.0, y = 0.0, z = 0.0) {
        Mat4.setPosition(this.transformation, x, y, z)
    }
}

export class OrthogonalCamera extends Camera {
    widthRatio = 1.0;
    heightRatio = 1.0;
    near = 1e-6;
    far = 100;
    x = 0.0
    y = 0.0
    z = 0.0
    setViewRatio(width = 1.0, height = 1.0, near = this.near, far = this.far) {
        this.widthRatio = width
        this.heightRatio = height
        this.near = near
        this.far = far
        this.updateSize()
    }
    updateSize() {
        Mat4.setScale(this.transformation, this.widthRatio, this.heightRatio, (this.far + this.near) / (this.far + this.near))
    }

    constructor(widthRatio = 1.0, heightRatio = 1.0, x = 0, y = 0, z = 0, near = 1e-6, far = 100) {
        super();
        this.widthRatio = widthRatio;
        this.heightRatio = heightRatio;
        this.x = x;
        this.y = y;
        this.z = z;
        this.setPosition(x, y, z)
        this.near = near;
        this.far = far;
        this.updateSize();

    }
}

export class RenderObjectManager {
    //NOTE: renderPacket or getRenderPacket should be in the object that return compile data for the render. maybe the varible since the render object is like a struct
    //also maybe the render list is renderPackets instead either pulled from the object or caculated
    //Array.from(renderObjects, object => object.renderPacket) could work, but the packet would need to be caculated unless it can call a funtion isndtead of using the packet
    //but it should run the update before generating the list. //.sort((a, b) => a.sortKey - b.sortKey); can be added on it(probably) to do the sorting(as long as the sort key is updated before it)
    //also would need to pass data to c side so may need to get the sortkeys, push to c side to get the sorted array and then map it to the render list(js side). also could just catch it
    //and pass the object manager to the renderer to pull that data, though it would require depending more on that structure
    //NOTE: drawType and only add feilds the draw type used for render packet for use with js canvas
    #object = new Set();
    //#dirtyObjects = new Set();
    #dirty = true

    #clickableObjects = new Set();

    //should allow a render object to be passed so the owner could reused or create theirs, but also should be able to create a basic one if none is provided
    //so the owner can modify that one
    objectRenderChange(renderObject) {
        this.#dirty = true
        //this.#dirtyObjects.add(renderObject);
    }
    //called when it toggle on/off an event like isClickable
    objectCapabilityChange(renderObject) {
        //console.log('MEOOOW', renderObject.capabilityFlags, renderObject.CAPABILITY_FLAGS.CLICKABLE, renderObject.capabilityFlags & renderObject.CAPABILITY_FLAGS.CLICKABLE)
        if (renderObject.capabilityFlags & renderObject.CAPABILITY_FLAGS.CLICKABLE) {
            //if (renderObject.clickable) {
            this.#clickableObjects.add(renderObject);
        }
        else {
            this.#clickableObjects.delete(renderObject);
        }
    }
    add(renderObject = new RenderObject()) {

        if (!renderObject || this.#object.has(renderObject)) {
            return
        }
        this.#object.add(renderObject)
        renderObject._onRenderChanged = (object) => this.objectRenderChange(object);
        renderObject._onCapabilityChanged = (object) => this.objectCapabilityChange(object);
        this.#dirty = true;
        if (renderObject.capabilityFlags & renderObject.CAPABILITY_FLAGS.CLICKABLE) {
            this.#clickableObjects.add(renderObject);
            //console.log('added ', renderObject, ' early to clicks')
        }
        //if (renderObject.isClickable) {
        //    this.#clickableObjects.add(renderObject);
        //}
        //add data to render list
        return renderObject

    }
    remove(renderObject) {
        if (!renderObject) { return false }
        const removed = this.#object.delete(renderObject);
        //this.#dirtyObjects.delete(renderObject);
        renderObject._onRenderChanged = undefined;
        renderObject._onCapabilityChanged = undefined;
        this.#dirty = true;
        this.#clickableObjects.delete(renderObject);
        //decided if object should be deconstructed or not. may pass a parameter for that
        //remove data to render list
        return removed
    }
    //generateSortKey(object, viewMatrix = []) {
    //    const record = object.getSortRecord();
    //    object._sortKey = ((record[3] & 0x1F) * 2 ** 48) +
    //        ((record[2] & 0xFFFF) * 2 ** 32) +
    //        ((record[1] & 0xFFFF) * 2 ** 16) +
    //        (record[0] & 0xFFFF);
    //    return object._sortKey

    //}
    renderList = [];
    renderOrder(a, b) {
        const ar = a.sortRecord;
        const br = b.sortRecord;
        //NOTE: drawing of objects is done in a way that breaks this so they need their x and y offsets to be base on their size
        if (ar[3] != br[3]) return ar[3] - br[3]

        const z = ar[2] - br[2];
        if (z !== 0) return z;

        const y = ar[1] - br[1];
        //console.log('y:', ar[1], br[1], y);
        if (y !== 0) return y;

        //console.log('x:', ar[0], br[0], ar[0] - br[0]);
        return ar[0] - br[0];
    }
    getRenderList(viewMatrix = [], dirty = false) {
        //regen the whole list
        //note: camera might mess up render order if perspective
        if (this.#dirty || dirty) {
            const axisOffset = 1000000
            const axisScale = 2000000
            this.renderList = []
            for (const object of this.#object) {
                if (!object.visible) { continue }
                //could use the view matrix to cull this not in bounds. issue is making sure rotation is handled correctly
                this.renderList.push(object);
            }
            this.renderList.sort((a, b) => {
                return this.renderOrder(a, b);
            });
            this.#dirty = false
            //console.log(this.renderList)
        }

        return this.renderList
    }
    //could have things like onRelease, but object probably wont be listening for that
    //but could check and call it if it is expecting it
    //note: may need to get the z from the veiw. depth currently could be used as an offset.
    //also might need to use camera instead of view to project to ray
    onClick(mouseX, mouseY, depth = Infinity, maxObjects = 1, camera = this.camera) {
        const aabb = new Float32Array(6)
        const position = new Float32Array(3);
        const objects = []
        //const viewMatrix = camera ? camera.getViewMatrix(Mat4.identity()) : Mat4.identity();
        const viewMatrix = camera ? camera.transformation : Mat4.identity();
        const mvMatrix = Mat4.identity();
        //console.log(this.#clickableObjects)
        for (const object of this.#clickableObjects) {
            position[0] = mouseX, position[1] = mouseY;
            //if (camera) {
            //    camera.screenToWorld(position)
            //}
            //if (object.onClick) {
            //could try with the object transformation, but aabb is used more often so may keep it?
            Mat4.identity(mvMatrix)
            Mat4.multiply(object.transformation, viewMatrix, mvMatrix)
            object.getAABB(aabb, mvMatrix)
            //need to project it with the view matrix still
            if (
                Math.abs(position[0] - aabb[0]) <= aabb[3] &&
                Math.abs(position[1] - aabb[1]) <= aabb[4] &&
                //may need to look up depth. since this should be a ray cast. will treat non-finite as true
                (!Number.isFinite(depth) || Math.abs(depth - aabb[2]) <= aabb[5])
                
            ) {
                //console.log('added to click array', object)
                objects.push(object)
            }
            //}
        }
        //sort with the render order logic
        objects.sort((a, b) => {
            return this.renderOrder(a, b);
        });
        //then call the on click up to the max objects base on sort order
        //note: may need to do a full loop of the objects and then break out after
        //max vaild objects are clicked
        for (let i = 0; i < Math.min(maxObjects, objects.length); i++) {
            //may check if it has click here so that objects with no onClick can be added to block clickables
            if (objects[i].onClick) {
                objects[i].onClick()
            }
        }

    }
}