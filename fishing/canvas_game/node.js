//this repesent an object this is part of a hierarchical and contains ways to notify its parent and manage its children
export class Node {
    #children = new Set();
    get children() {
        return this.#children;
    }

    onRemoveFromParent = undefined;

    addChild(child) {
        if (!child) { return -1 }
        if (this.#children.has(child)) { return -1 }
        //if child if removed while own, need to let the owner know and then continue
        if (child.removeFromParent) {
            child.removeFromParent()
        }
        //will call the callback instead of expecting the remove from parent logic to have it
        if (child.onRemoveFromParent) {
            child.onRemoveFromParent()
        }
        child.onRemoveFromParent = () => {
            this.removeChild(child);
        }
        this.#children.add(child)
        if (child.parentAssigned) {
            child.parentAssigned()
        }
    }

    removeChild(child) {
        if (!this.#children.has(child)) { return -1 }
        child.onRemoveFromParent = undefined;
        this.#children.delete(child);
    }

    parentAssigned() { }

    removeFromParent() { }

    update(delta = 1.0) {
        for (const child of this.children) {          
            if (child.update) {
                child.update(delta);
            }
        }
    }


    //This should only be called if this node is expected to be gc adn will also deconstruct any children still connected
    deconstructor() {
        for (const child of this.#children) {
            this.removeChild(child)
            //make the child prepare for gc if it was not removed before this was called
            if (child.deconstructor) {
                child.deconstructor()
            }
        }
        this.onRemoveFromParent = undefined
    }
}