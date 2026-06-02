//NOTE: may hold the render object and its render packet since this manages it
//NOTE: may not use the packet and just create an object/array of the data or use the object directly
//also data may be an array
export class RenderObject {
    _onRenderChanged = undefined; //callback to the object manager. //called when sortkey change or anything that the object manager need to listen to
    _sortKey = 0;
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
    get zRenderOrder() { return this.zRenderOffset }
    get yRenderOrder() { return this.yRenderOffset }
    get xRenderOrder() { return this.xRenderOffset }
    visible = true;
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


    deconstructor() {
        _onRenderChanged = null;
    }
    constructor() {

    }

}
//will keep render object as a base since these will share properties
//might extend each other though
//NOTE: MAY NEED TO USE ESP (TINY VALUE) WHEN EVER 0 IS PASSES for the size
export class RenderObject2d extends RenderObject {
    static makeTransformation() {
        const transformation = new Float32Array(9)
        transformation[0] = 1
        transformation[4] = 1
        transformation[8] = 1
        return transformation;
    }
    
    #scaleX = 1.0;
    get scaleX() { return this.#scaleX }
    #scaleY = 1.0;
    get scaleY() { return this.#scaleY }
    baseHeight = 1;
    get height(){return this.baseHeight * this.#scaleY}
    baseWidth = 1;
    get width(){return this.baseWidth * this.#scaleX;}
    setScale(x = 1.0, y = 1.0) {
        this.scaleX = x;
        this.scaleY = y;
        this.sizeX = this.height;
        this.sizeY = this.width;
    }
    get posX() {
        return this.transformation[Math.sqrt(this.transformation.length) - 1];
    }
    set posX(value = 0.0) {
        if (value !== this.transformation[Math.sqrt(this.transformation.length) - 1]) {
            this.transformation[Math.sqrt(this.transformation.length) - 1] = value;
            this.renderChange()
        }
    }
    get posY() {
        return this.transformation[Math.sqrt(this.transformation.length) * 2 - 1];
    }
    set posY(value = 0.0) {
        if (value !== this.transformation[Math.sqrt(this.transformation.length) * 2 - 1]) {
            this.transformation[Math.sqrt(this.transformation.length) * 2 - 1] = value;
            this.renderChange()
        }
    }

    get sizeX() {
        return Math.hypot(this.transformation[0], this.transformation[1])
    }
    get sizeY() {
        return Math.hypot(this.transformation[3], this.transformation[4])
    }
    get rightX() {
        const size = this.sizeX;
        if (size > 0) {
            return this.transformation[0] / size
        }
        return this.transformation[0]
    }
    get rightY() {
        const size = this.sizeX;
        if (size > 0) {
            return this.transformation[1] / size
        }
        return this.transformation[1]
    }
    get upX() {
        const size = this.sizeY;
        if (size > 0) {
            return this.transformation[Math.sqrt(this.transformation.length)] / size
        }
        return this.transformation[Math.sqrt(this.transformation.length)]
    }
    get upY() {
        const size = this.sizeY;
        if (size > 0) {
            return this.transformation[Math.sqrt(this.transformation.length) + 1] / size
        }
        return this.transformation[Math.sqrt(this.transformation.length) + 1]
    }
    set sizeX(value = 1.0) {
        if (value === 0.0) { value = 1e-6 }
        this.transformation[0] = this.rightX * value;
        this.transformation[1] = this.rightY * value;
    }
    set sizeY(value = 1.0) {
        if (value === 0.0) { value = 1e-6 }
        this.transformation[Math.sqrt(this.transformation.length)] = this.upX * value;
        this.transformation[Math.sqrt(this.transformation.length) + 1] = this.upY * value;
    }
    //may need diffrent sorting anchors or rendering anchors. the issue is the height needs to be offset 
    get yRenderOrder() { return this.posY + this.yRenderOffset  }
    get xRenderOrder() { return this.posX + this.xRenderOffset }

    constructor(width = 0, height = 0) {
        super();
        this.baseWidth = width;
        this.baseHeight = height;
        this.transformation = this.constructor.makeTransformation()
    }
}
export class RenderObject3d extends RenderObject2d {
    static makeTransformation() {
        const transformation = new Float32Array(16)
        transformation[0] = 1
        transformation[5] = 1
        transformation[10] = 1
        transformation[15] = 1
        return transformation;
    }
    depth = 1.0;
    #scaleZ = 1.0;
    get scaleZ() { return this.#scaleZ }
    setScale(x = 1.0, y = 1.0, z = 1.0) {
        super.setScale(x, y)
        this.#scaleZ = z;
        this.sizeZ = this.depth * this.#scaleZ;
    }
    get posZ() {
        return this.transformation[Math.sqrt(this.transformation.length) * 3 - 1];
    }
    set posZ(value = 0.0) {
        if (value !== this.transformation[Math.sqrt(this.transformation.length) * 3 - 1]) {
            this.renderChange()
        }
    }
    //overriding size x and y due to it needing more steps. it be easier to overrided,
    // but should make the other steps easier
    get sizeX() {
        return Math.hypot(this.transformation[0], this.transformation[1], this.transformation[2])
    }
    get sizeY() {
        return Math.hypot(this.transformation[4], this.transformation[5], this.transformation[6])
    }
    get sizeZ() {
        return Math.hypot(this.transformation[8], this.transformation[9], this.transformation[10])
    }
    get rightZ() {
        const size = this.sizeZ;
        if (size > 0) {
            return this.transformation[2] / size
        }
        return this.transformation[2]
    }
    get upZ() {
        const size = this.sizeZ;
        if (size > 0) {
            return this.transformation[Math.sqrt(this.transformation.length) + 2] / size
        }
        return this.transformation[Math.sqrt(this.transformation.length) + 2]
    }
    get forwardX() {
        const size = this.sizeX;
        if (size > 0) {
            return this.transformation[Math.sqrt(this.transformation.length) * 2] / size
        }
        return this.transformation[Math.sqrt(this.transformation.length) * 2]
    }
    get forwardY() {
        const size = this.sizeY;
        if (size > 0) {
            return this.transformation[Math.sqrt(this.transformation.length) * 2 + 1] / size
        }
        return this.transformation[Math.sqrt(this.transformation.length) * 2 + 1]
    }
    get forwardZ() {
        const size = this.sizeZ;
        if (size > 0) {
            return this.transformation[Math.sqrt(this.transformation.length) * 2 + 2] / size
        }
        return this.transformation[Math.sqrt(this.transformation.length) * 2 + 2]
    }
    set sizeX(value = 1.0) {
        if (value === 0.0) { value = 1e-6 }
        this.transformation[0] = this.rightX * value;
        this.transformation[1] = this.rightY * value;
        this.transformation[2] = this.rightZ * value;
    }
    set sizeY(value = 1.0) {
        if (value === 0.0) { value = 1e-6 }
        this.transformation[Math.sqrt(this.transformation.length)] = this.upX * value;
        this.transformation[Math.sqrt(this.transformation.length) + 1] = this.upY * value;
        this.transformation[Math.sqrt(this.transformation.length) + 2] = this.upZ * value;
    }
    set sizeZ(value = 1.0) {
        if (value === 0.0) { value = 1e-6 }
        this.transformation[Math.sqrt(this.transformation.length)] = this.forwardX * value;
        this.transformation[Math.sqrt(this.transformation.length) + 1] = this.forwardY * value;
        this.transformation[Math.sqrt(this.transformation.length) + 2] = this.forwardZ * value;
    }
    get zRenderOrder() { return this.posZ + this.zRenderOffset }

    constructor(width = 0, height = 0, depth = 0) {
        super(width, height);
        this.depth = depth;
        this.transformation = this.constructor.makeTransformation()
    }
}

export class ImageRenderObject extends RenderObject2d {
    #image
    imageLoaded() {
        if (!this.baseWidth) {
            this.baseWidth = this.image.naturalWidth || this.image.videoWidth || this.image.width || 0
        }
        if (!this.baseHeight) {
            this.baseHeight = this.image.naturalHeight || this.image.videoHeight || this.image.height || 0;
        }
        this.sizeX = this.baseWidth;
        this.sizeY = this.baseHeight;
        console.log('image loaded', this)
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
    draw(canvasContext, x, y, width, height) {
        console.log('drawing:', width, height)
        canvasContext.drawImage(this.image, this.imageCoordX, this.imageCoordY, this.image.width, this.image.height, x, y, width, height)
    }
    deconstructor() {
        super.deconstructor();
        if (this.#image) {
            this.#image.removeEventListener('load', () => this.imageLoaded());
        }
        this.#image = null;
    }
    constructor(image, width = 0, height = 0) {
        super(width, height);
        this.image = image;

    }
}
//mat4
//0,    1,  2,  3
//4,    5,  6,  7
//8,    9,  10, 11
//12,   13, 14, 15
//this.transformation[0]=1
//this.transformation[5]=1
//this.transformation[10]=1
//this.transformation[15]=1

//mat3
//0,    1,  2
//3,    4,  5
//6,    7,  8
//this.transformation[0]=1
//this.transformation[4]=1
//this.transformation[8]=1

//test example of a perspective camera
export class PerspectiveCamera {
    fov = 90;
    aspect = 1;
    near = 1e-6;
    far = 100;
    x = 0.0
    y = 0.0
    z = 0.0
    getViewMatrix(targetMatrix = new Float32Array(16)) {
        const f = 1.0 / Math.tan(this.fov / 2);
        const nf = 1 / (this.near - this.far);
        targetMatrix[0] = f / this.aspect;
        targetMatrix[3] = -this.x;
        targetMatrix[5] = f;
        targetMatrix[7] = -this.y;
        targetMatrix[10] = (this.far + this.near) * nf;
        targetMatrix[11] = -this.z;
        targetMatrix[14] = (2 * this.far * this.near) * nf;
        return targetMatrix;
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
    #dirtyObjects = new Set();
    #dirty = true
    //should allow a render object to be passed so the owner could reused or create theirs, but also should be able to create a basic one if none is provided
    //so the owner can modify that one
    objectRenderChange(object) {
        this.#dirty = true
        //this.#dirtyObjects.add(object);
    }
    add(renderObject = new RenderObject()) {

        if (!renderObject || this.#object.has(renderObject)) {
            return
        }
        this.#object.add(renderObject)
        renderObject._onRenderChanged = (object) => this.objectRenderChange(object);
        this.#dirty = true;
        //add data to render list
        return renderObject

    }
    remove(renderObject) {
        if (!renderObject) { return false }
        const removed = this.#object.delete(renderObject);
        this.#dirtyObjects.delete(renderObject);
        renderObject._onRenderChanged = undefined
        this.#dirty = true;
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
                const ar = a.sortRecord;
                const br = b.sortRecord;
                //NOTE: drawing of objects is done in a way that breaks this so they need their x and y offsets to be base on their size
                if (ar[3] != br[3]) return ar[3] - br[3]
            
                const z = ar[2] - br[2];
                if (z !== 0) return z;
                
                const y = ar[1] - br[1];
                console.log('y:',ar[1] , br[1],y);
                if (y !== 0) return y;

                console.log('x:',ar[0] , br[0], ar[0] - br[0]);
                return ar[0] - br[0];
            });
            this.#dirty = false
            console.log(this.renderList)
        }

        return this.renderList
    }
}