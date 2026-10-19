
import { Mat4 } from "/lib/square_matrix_math.js"
import { getScreenMatrix, buildRenderInfo } from "./render_lib.js"

export class Renderer {

    target = undefined;
    renderObjectManager = {
        object: new Set(),
        renderList: [],
        getRenderList() { return this.renderList }
    }

    camera = undefined

    lastRenderState = {
        modelViewMatrix: Mat4.identity(),
        clipMatrix: Mat4.identity(),
        screenMatrix: Mat4.identity(),
        projectionMatrix: Mat4.identity(),
        viewportMatrix: Mat4.identity(),
        viewMatrix: Mat4.identity(),
    }
    //NOTE on sorting. may need to have a manager for the objects list. update it fully when static stuff change
    //and remove and added when dynmaic stuff change (using a type that do not move entries down or do so efficently)
    //also could add signals and update if anything dirty
    //or allow various types for object so it could be chunked and update each chunk in use
    //[layer][depth][y][x] where x and y is 0-16 (48,32 for the other, but range can be decided later)
    //the 16,48,32 is copying parts of the number and pasting it to the new number
    //((layer << 48) |(depth << 32) |((y & 0xFFFF) << 16) |(x & 0xFFFF))
    //can also local the x and y base on camera x and y so the value stays withing a reasonable amount (unless res is crazy(pixel rep 1km space nonsense))
    render(target = this.target, objectManager = this.renderObjectManager, camera = this.camera, rerender = false) {

        if (!target) {
            console.log('no render target provided')
            return
        }
        buildRenderInfo(
            camera ? camera.transform : Mat4.identity(),
            camera ? camera.projection : Mat4.identity(),
            camera ? camera.viewportMatrix : Mat4.identity(),
            this.lastRenderState
        );

        const context = target.getContext("2d");

        context.clearRect(0, 0, target.width, target.height);
        if (objectManager) {
            const renderList = objectManager.getRenderList(rerender)
            for (const object of renderList) {

                getScreenMatrix(object.getGlobalTransform(), this.lastRenderState)

                context.save();
                if (Mat4.isRowOrdered) {
                    context.setTransform(
                        this.lastRenderState.screenMatrix[0],
                        this.lastRenderState.screenMatrix[4],
                        this.lastRenderState.screenMatrix[1],
                        this.lastRenderState.screenMatrix[5],
                        this.lastRenderState.screenMatrix[3],
                        this.lastRenderState.screenMatrix[7]
                    );
                }
                else {
                    context.setTransform(
                        this.lastRenderState.screenMatrix[0],
                        this.lastRenderState.screenMatrix[1],
                        this.lastRenderState.screenMatrix[4],
                        this.lastRenderState.screenMatrix[5],
                        this.lastRenderState.screenMatrix[12],
                        this.lastRenderState.screenMatrix[13]
                    );
                }
                object.draw(context, this.lastRenderState)
                context.restore();
            }
        }

    }
}
export default new Renderer();