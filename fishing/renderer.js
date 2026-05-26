
export class Renderer {

    target = undefined;

    //NOTE:made a class, but here since it not going to be imported to this file since the functions are going to be assume so diffrent versions can be used.
    renderObjectManager = {
        //NOTE: renderPacket or getRenderPacket should be in the object that return compile data for the render. maybe the varible since the render object is like a struct
        //also maybe the render list is renderPackets instead either pulled from the object or caculated
        //Array.from(renderObjects, object => object.renderPacket) could work, but the packet would need to be caculated unless it can call a funtion isndtead of using the packet
        //but it should run the update before generating the list. //.sort((a, b) => a.sortKey - b.sortKey); can be added on it(probably) to do the sorting(as long as the sort key is updated before it)
        //also would need to pass data to c side so may need to get the sortkeys, push to c side to get the sorted array and then map it to the render list(js side). also could just catch it
        //and pass the object manager to the renderer to pull that data, though it would require depending more on that structure
        //NOTE: drawType and only add feilds the draw type used for render packet for use with js canvas
        object: new Set(),
        renderList: [],
        getRenderList() { return this.renderList }
    }

    //Note: looping array is faster and sorting only work for arrays
    //so rendering object probably should be an array when processing, but
    //a set for faster removes. the render function should loop over what ever pass
    //as long as it is able to, but the store ones should have an add, remove and sort(flag)
    //may provide a signal like object or callback to notify change

    //NOTE: may not pass objects as parameters and have this handle them or figure out
    //an object to use for adding and removing render objects. maybe wrap it in a object with functions so it can be modified
    //and leave this to handle rendering

    viewport = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        minDepth: 0,
        maxDepth: 1
    };

    camera = {
        getViewMatrix(targetMatrix = new Float32Array(16)) {
            if (!this.viewMatrix) {
                this.viewMatrix = new Float32Array(16)
                this.viewMatrix[0] = 1
                this.viewMatrix[5] = 1
                this.viewMatrix[10] = 1
                this.viewMatrix[15] = 1
            }
            //note: could use fill(0) and set to make sure there no hidden values
            //but camera should have its own and manage it correctly

            return this.viewMatrix
        },
        worldToScreen(pos, viewport, target) { return target },
        screenToWorld(pos, viewport, target) { return target }
    }
    //todo: rename this to rep multiply the two mat (view(mat4), object(mat3 or mat4))
    //also it now translate it as well
    multiplyMat4(a, b, target = new Float32Array(16)) {
        const isMat3 = b.length === 9;
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                if (isMat3) {
                    target[col * 4 + row] =
                        (col < 3 ?
                            a[0 * 4 + row] * b[col * 3 + 0] +
                            a[1 * 4 + row] * b[col * 3 + 1] +
                            a[2 * 4 + row] * b[col * 3 + 2]
                            : a[3 * 4 + row]
                        );
                    target[3] = a[3]+b[2]
                    target[7] = a[7]+b[5]
                    target[11] = 0
                }
                else {
                    target[col * 4 + row] =
                        a[0 * 4 + row] * b[col * 4 + 0] +
                        a[1 * 4 + row] * b[col * 4 + 1] +
                        a[2 * 4 + row] * b[col * 4 + 2] +
                        a[3 * 4 + row] * b[col * 4 + 3];
                    target[3] = a[3]+b[3]
                    target[7] = a[7]+b[7]
                    target[11] = a[11]+b[11]
                }
            }
        }
        return target;
    }
    //NOTE on sorting. may need to have a manager for the objects list. update it fully when static stuff change
    //and remove and added when dynmaic stuff change (using a type that do not move entries down or do so efficently)
    //also could add signals and update if anything dirty
    //or allow various types for object so it could be chunked and update each chunk in use
    //[layer][depth][y][x] where x and y is 0-16 (48,32 for the other, but range can be decided later)
    //the 16,48,32 is copying parts of the number and pasting it to the new number
    //((layer << 48) |(depth << 32) |((y & 0xFFFF) << 16) |(x & 0xFFFF))
    //can also local the x and y base on camera x and y so the value stays withing a reasonable amount (unless res is crazy(pixel rep 1km space nonsense))
    render(target = this.target, objectManager = this.renderObjectManager, viewport = this.viewport, camera = this.camera) {
        
        if (!target) {
            console.log('no render target provided')
            return
        }
        const viewMatrix = camera ? camera.getViewMatrix() : new Float32Array(16);
        const mvMatrix = new Float32Array(16)//assume it will be a matrix 2d
        const context = target.getContext("2d");
        if (!camera) {
            //xx,yy will be treated as the size, but should get the length just incase
            viewMatrix[0] = target.width || 1
            viewMatrix[5] = target.height || 1
            viewMatrix[10] = 1
            viewMatrix[15] = 1
        }
        
        //may need to clamp view matrix with viewport
        //if (viewport){ }
        if (objectManager) {   
            const renderList = objectManager.getRenderList(viewMatrix,true)
            console.log(renderList)
            for (const object of renderList) {
                console.log('rendering', object)
                this.multiplyMat4(viewMatrix, object.transformation, mvMatrix) //NOTE: may need to catch this in the object. probably could caculate it when fetching the list(object manager)
                object.draw(context, mvMatrix[3], mvMatrix[7], mvMatrix[0], mvMatrix[5])//NOTE: using target bounds for now, but should pull it from the view matrix and
            }
        }

        //NOTE: viewport is extra data with canvas, but could be used to render a section of the camera
        //camera view matrix is probably the data used, though not sure how it could be anything but a box
        //unless rot allow it warp into an odd cone like box

    }
}
