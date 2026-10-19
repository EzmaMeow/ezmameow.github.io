import { Mat4 } from "/lib/square_matrix_math.js"

//adding this outside of the render object so it can be imported if needed, but allow the render object to return the version it uses
//meaning a render object might disallow certain flags (or add extra). 
export const CAPABILITY_FLAGS = { CLICKABLE: 1 << 0 }

export class RenderObject {
    get CAPABILITY_FLAGS() { return CAPABILITY_FLAGS; }
    #capabilityFlags = 0
    _onRenderChanged = undefined; //callback to the object manager. //called when sortkey change or anything that the object manager need to listen to
    _onCapabilityChanged = undefined;
    _sortKey = 0;
    //TODO: rename to transform
    transform = Mat4.identity();
    parentGlobalTransform;
    globalTransform = Mat4.identity();
    getGlobalTransform(){
        //will need to caculate it each getter since it easier to track the parent global transform
        //also should not need to update this on change since this should not have children that is dependent on it
        //will change it to a dedicated getter function so the render can call it once per render call and others
        //can acess the matrix directly for last frame info
        if(this.parentGlobalTransform){
            Mat4.multiply(this.parentGlobalTransform, this.transform, this.globalTransform)
        }
        else{
            this.globalTransform.set(this.transform)
        }
        return this.globalTransform
    }
    //render objects transfomation by default is global and this needs to be overriden to handle cases where render objects is reltive to some other transform
    _scale = new Float32Array([1.0, 1.0, 1.0]);
    depth = 0;
    baseHeight = 0;
    get height() { return this.baseHeight * this._scale[1] }
    baseWidth = 0;
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
        this._dirty = true
        if (this._onRenderChanged) {
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
    //will use global if exist. it be the parent responsibly to update all its children global transforms if its transform moves
    //and should have a way to listen to ist children when their transfrom becomes dirty
    //if ordered correctly, parent could use their global transform to update their children allowing a chain update
    //but all other transform modifcation should be local for render objects and the one who implements it should manage world/local of its render objects
    get yRenderOrder() {
        return Mat4.getPositionY(this.globalTransform) + this.yRenderOffset
    }
    get xRenderOrder() {
        return Mat4.getPositionX(this.globalTransform) + this.xRenderOffset
    }
    get zRenderOrder() {
        return Mat4.getPositionZ(this.globalTransform) + this.zRenderOffset
    }


    visible = true;

    updateSize() {
        Mat4.setScale(this.transform, this._scale[0], this._scale[1], this._scale[2])
    }
    setScale(x = 1.0, y = 1.0, z = 1.0) {
        this._scale[0] = x;
        this._scale[1] = y;
        this._scale[2] = z;
        this.updateSize()
    }
    getPosition(targetVector = new Float32Array(3)) {
        return Mat4.getPosition(this.transform, targetVector)
    }
    setPosition(x = 0.0, y = 0.0, z = 0.0) {
        Mat4.setPosition(this.transform, x, y, z)
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

    getAABB(aabb = new Float32Array(6), mvMatrix = this.transform) {
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
    //todo: add a getGlobalTransform or allow it to be check first
    constructor(options) {
        //this.baseWidth = width;
        //this.baseHeight = height;
        //this.depth = depth;
        if (options) {
            if (options.width) { this.baseWidth = options.width }

            if (options.height) { this.baseHeight = options.height }

            if (options.depth) { this.depth = options.depth }

            if (options.layer) { this.layer = options.layer }

            if (options.capabilityFlags) { this.capabilityFlags = options.capabilityFlags }

            if (options.scale) {
                if (Array.isArray(options.scale)) {
                    this.setScale(options.scale[0] || 1, options.scale[1] || 1, options.scale[2] || 1)
                }
                else if (typeof options.scale === 'object' && options.scale !== null) {
                    this.setScale(options.scale.x || 1, options.scale.y || 1, options.scale.z || 1)
                }
            }
            else if (options.scaleX || options.scaleY || options.scaleZ) {
                this.setScale(options.scaleX || 1, options.scaleY || 1, options.scaleZ || 1)

            }

            if (options.position) {
                if (Array.isArray(options.position)) {
                    this.setPosition(options.position[0] || 0, options.position[1] || 0, options.position[2] || 0)
                }
                else if (typeof options.position === 'object' && options.position !== null) {
                    this.setPosition(options.position.x || 0, options.position.y || 0, options.position.z || 0)
                }
            }
            else if (options.positionX || options.positionY || options.positionZ) {
                this.setPosition(options.positionX || 0, options.positionY || 0, options.positionZ || 0)
            }

            if (options.xRenderOffset) {
                this.xRenderOffset = options.xRenderOffset
            }
            if (options.yRenderOffset) {
                this.yRenderOffset = options.yRenderOffset
            }
            if (options.zRenderOffset) {
                this.zRenderOffset = options.zRenderOffset
            }

            if (options.visible !== undefined) {
                this.visible = !!options.visible
            }

            if (options.onClick && typeof options.onClick === 'function') {
                this.onClick = options.onClick
            }
        }
    }
}
