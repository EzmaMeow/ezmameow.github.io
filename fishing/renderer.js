
import { Mat3, Mat4 } from "/lib/square_matrix_math.js"

export class Renderer {

    target = undefined;

    //there a dedicaded class for this and this here is a placeholder
    renderObjectManager = {
        object: new Set(),
        renderList: [],
        getRenderList() { return this.renderList }
    }

    camera = undefined

    //NOTE on sorting. may need to have a manager for the objects list. update it fully when static stuff change
    //and remove and added when dynmaic stuff change (using a type that do not move entries down or do so efficently)
    //also could add signals and update if anything dirty
    //or allow various types for object so it could be chunked and update each chunk in use
    //[layer][depth][y][x] where x and y is 0-16 (48,32 for the other, but range can be decided later)
    //the 16,48,32 is copying parts of the number and pasting it to the new number
    //((layer << 48) |(depth << 32) |((y & 0xFFFF) << 16) |(x & 0xFFFF))
    //can also local the x and y base on camera x and y so the value stays withing a reasonable amount (unless res is crazy(pixel rep 1km space nonsense))
    render(target = this.target, objectManager = this.renderObjectManager, camera = this.camera) {

        if (!target) {
            console.log('no render target provided')
            return
        }
        const viewMatrix = camera ? camera.transformation : Mat4.identity();
        const mvMatrix = Mat4.identity();
        const context = target.getContext("2d");

        //clear for a redraw since this is just a repaint render (for now)
        context.clearRect(0, 0, target.width, target.height);
        //may need to clamp view matrix with viewport
        //if (viewport){ }
        if (objectManager) {
            const renderList = objectManager.getRenderList(viewMatrix, true)
            for (const object of renderList) {
                Mat4.multiply(object.transformation, viewMatrix, mvMatrix)

                context.save();
                //assumed it is column order, should pull the values with funtions(though current ones use an array). also could add a switch or do not bother and keep assuming
                context.setTransform(
                    mvMatrix[0],
                    mvMatrix[1],
                    mvMatrix[4],
                    mvMatrix[5],
                    mvMatrix[12],
                    mvMatrix[13]
                )
                object.draw(context)
                context.restore();
            }
            //console.log(renderList)
        }

    }
}
