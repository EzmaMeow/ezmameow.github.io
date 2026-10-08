import { Mat4 } from "/lib/square_matrix_math.js"
import { getScreenMatrix, buildRenderInfo } from "./render_lib.js"

// Column-major layout:
// [ 0   4   8  12 ]
// [ 1   5   9  13 ]
// [ 2   6  10  14 ]
// [ 3   7  11  15 ]

// [ 0   3   6 ]
// [ 1   4   7 ]
// [ 2   5  8 ]

//TODO: treat this as a singleton and make it allow groups. This will allow other files to import a shared instance
//also will allow this to be used as a normal instance if not using the imported default, but require more management
export class RenderObjectManager {
    #renderGroups = new Map();
    addGroup(id, priority = 0, active = true) {
        if (!this.#renderGroups.has(id)) {
            this.#renderGroups.set(id, {
                objects: new Set(),
                dirty: true,
                clickables: new Set(),
                priority: priority || 0,
                renderList: []
            });
            if (active) {
                this.enableGroup(id);
                this.sortGroups();
            }
        }
    }
    removeGroup(id) {
        if (this.#renderGroups.has(id)) {
            //const renderGroup = this.#renderGroup.get(id);
            //may need to do clean up
            this.#renderGroups.delete(id);
        }
    }
    getGroup(id) {
        return this.#renderGroups.get(id)
    }
    setGroupPriority(groupId, priority = 0) {
        const group = this.getGroup(groupId);
        if (group) {
            group.priority = priority;
            this.sortGroups();
        }
    }
    //a list of ids of groups to render
    #activeGroups = ["default"];
    enableGroup(id) {
        if (this.#activeGroups.includes(id)) { return }
        this.#activeGroups.push(id)
    }
    diableGroup(id) {
        const index = this.#activeGroups.indexOf(id)
        if (index < 0) { return }
        this.#activeGroups.splice(index, 1)
    }
    sortGroups() {
        this.#activeGroups.sort((a, b) => {
            let groupA = this.getGroup(a);
            let groupB = this.getGroup(b);
            return (groupA ? groupA.priority : 0) - (groupB ? groupB.priority : 0)
        });
    }
    //#dirtyObjects = new Set();
    #dirty = true
    //should allow a render object to be passed so the owner could reused or create theirs, but also should be able to create a basic one if none is provided
    //so the owner can modify that one
    objectRenderChange(renderObject, groupId = "default") {
        this.#dirty = true;
        const group = this.getGroup(groupId)
        if (group) {
            group.dirty = true;
        }
        //this.#dirtyObjects.add(renderObject);
    }
    //called when it toggle on/off an event like isClickable
    objectCapabilityChange(renderObject, groupId = "default") {
        const group = this.getGroup(groupId)
        if (group) {
            //need to make sure the group own the render object
            //also need to make sure the object gets added to the group before this
            if (group.objects.has(renderObject)) {
                if (renderObject.capabilityFlags & renderObject.CAPABILITY_FLAGS.CLICKABLE) {
                    group.clickables.add(renderObject);
                }
                else {
                    group.clickables.remove(renderObject);
                }
            }
        }
    }

    add(renderObject, groupId = "default") {
        if (!this.#renderGroups.has(groupId)) {
            this.addGroup(groupId)
        }
        const group = this.getGroup(groupId)
        if (!renderObject || group.objects.has(renderObject)) {
            return
        }
        group.objects.add(renderObject)
        renderObject._onRenderChanged = (object) => this.objectRenderChange(object);
        renderObject._onCapabilityChanged = (object) => this.objectCapabilityChange(object);
        group.dirty = true;
        this.#dirty = true;
        if (renderObject.capabilityFlags & renderObject.CAPABILITY_FLAGS.CLICKABLE) {
            group.clickables.add(renderObject);
            //console.log('added ', renderObject, ' early to clicks')
        }
        return renderObject

    }
    //should support a case to remove all instances of render object
    //also groups may not be auto culled when empty. maybe I will add it or add a flag to state if it perm or not
    remove(renderObject, groupId = "default") {
        if (!renderObject) { return false }

        const group = this.getGroup(groupId)
        if (group) {
            const removed = group.objects.delete(renderObject);
            renderObject._onRenderChanged = undefined;
            renderObject._onCapabilityChanged = undefined;
            group.dirty = true;
            this.#dirty = true;
            group.clickables.delete(renderObject);
            return removed;
        }
        //may check all if group not vaild
    }

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
        //click should return to one on top first
        return ar[0] - br[0];
    }
    getRenderList(dirty = false) {
        //regen the whole list
        //note: camera might mess up render order if perspective
        if (this.#dirty || dirty) {
            this.renderList.length = 0
            for (const groupId of this.#activeGroups) {
                const group = this.getGroup(groupId)
                if (!group) { continue }
                if (group.dirty || dirty) {
                    group.renderList.length = 0
                    for (const object of group.objects) {
                        if (!object.visible) { continue }
                        //could use the view matrix to cull this not in bounds. issue is making sure rotation is handled correctly
                        group.renderList.push(object);
                        this.renderList.push(object);
                    }
                    group.dirty = false;
                }
                else {
                    this.renderList.push(...group.renderList);
                }
            }

            this.renderList.sort((a, b) => {
                return this.renderOrder(a, b);
            });
            this.#dirty = false
        }

        return this.renderList
    }

    lastRenderInfo = {

    }

    onClick(mouseX, mouseY, depth = Infinity, maxObjects = 1, camera = this.camera) {
        const aabb = new Float32Array(6)
        const position = new Float32Array(3);
        const objects = []
  

        buildRenderInfo(
            camera ? camera.transformation : Mat4.identity(),
            camera ? camera.projection : Mat4.identity(),
            camera ? camera.viewportMatrix : Mat4.identity(),
            this.lastRenderInfo
        );

        //console.log(this.#clickableObjects)
        for (const groupId of this.#activeGroups) {
            const group = this.getGroup(groupId)
            if (!group) { continue }
            for (const object of group.clickables) {
                //may disallow invisable objects...but may also allow visiblity to be a state and 0 beling collapsed, 1 for visable, and 2 for hidden
                //the idea is this click feature is for the render object and when not visiable, it dose not exisits
                if (!object.visible) { continue }
                position[0] = mouseX, position[1] = mouseY;

                getScreenMatrix(object.transformation, this.lastRenderInfo)

                object.getAABB(aabb, this.lastRenderInfo.screenMatrix)
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
        }
        //sort with the render order logic, but in reverse
        objects.sort((b, a) => {
            return this.renderOrder(a, b, true);
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
export default new RenderObjectManager();