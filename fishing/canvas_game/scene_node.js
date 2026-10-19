import { Mat4 } from "/lib/square_matrix_math.js"
import { Node } from "./node.js"

export class SceneNode extends Node {

    #transform = Mat4.identity();
    get transform() {
        return this.#transform
    }
    parentGlobalTransform
    #globalTransform = Mat4.identity();
    get globalTransform() {
        return this.#globalTransform
    }

    addChild(child) {
        let returnValue = super.addChild(child)
        if (returnValue) {
            return returnValue
        }
        if (child.globalTransform) {
            child.parentGlobalTransform = this.globalTransform
        }
    }

    removeChild(child) {
        let returnValue = super.removeChild(child)
        if (returnValue) {
            return returnValue
        }
        child.globalTransform.set(Mat4.identity());
        if (child.parentGlobalTransform) {
            child.parentGlobalTransform = undefined
        }
    }

    getPosition(targetVector = new Float32Array(3)) {
        return Mat4.getPosition(this.transform, targetVector)
    }

    setPosition(x = 0.0, y = 0.0, z = 0.0) {
        Mat4.setPosition(this.transform, x, y, z)
    }

    getScale(targetVector = new Float32Array(3)) {
        return Mat4.getScale(this.transform, targetVector);
    }

    setScale(x = 1.0, y = 1.0, z = 1.0) {
        Mat4.setScale(this.transform, x, y, z);
    }

    update(delta = 1.0) {
        //Note: can call before super. nodes that extend this should run position logic before calling super
        //so before is for thing before children update runs. 
        //in this case the global transfrom need to be caculated before the children update
        if (this.parentGlobalTransform) {
            Mat4.multiply(this.parentGlobalTransform, this.#transform, this.#globalTransform)
        }
        else {
            this.#globalTransform.set(this.#transform)
        }
        super.update(delta)
    }
    deconstructor() {
        super.deconstructor();
        this.parentGlobalTransform = undefined
    }
}
