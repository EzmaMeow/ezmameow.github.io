export class Collapsibles {
    static CONTAINER_ID = ".collapsible";
    static TOGGLE_ID = ".collapsible_toggle";
    static CONTEXT_ID = ".collapsible_content";
    //the default function to be called when being hidden or shown. 
    //can be overriden to change how collapsible functions
    static onChange(event, container, content){
        content.hidden = !content.hidden; 
    }
    //the on click event for trigging the collapsible state change (may need to be privated)
    static onClick(event, container, contextID = this.CONTEXT_ID, onChange = this.onChange) {
        const contents = container.querySelectorAll(contextID);
        contents.forEach(content => {
            onChange(event, container, content)
        });
    }
    static register(onChange = this.onCollapse, containerID = this.CONTAINER_ID, toggleID = this.TOGGLE_ID, contextID = this.CONTEXT_ID) {
        //TODO: make sure that the collapsible could also be the trigger
        //this will mean less containers to make it work, just need to check if it has trigger in class. also need
        //to make sure multi triggers are handle still. so check self then loop self childern
        const containers = document.querySelectorAll(containerID);
        containers.forEach(container => {
            const toggle = container.querySelector(toggleID);
            if (!toggle){return}
            toggle.addEventListener("click", (event) => this.onClick(event, container = container, contextID = contextID,onChange));
        });
    }
    //Note: need to check if this works. it a cheap way to remove the event as long as the parameters are correct
    static unregister(onChange = this.onCollapse, containerID = this.CONTAINER_ID, toggleID = this.TOGGLE_ID, contextID = this.CONTEXT_ID) {
        const containers = document.querySelectorAll(containerID);
        containers.forEach(container => {
            const toggle = container.querySelector(toggleID);
            if (!toggle){return}
            toggle.removeEventListener("click", (event) => this.onClick(event, container = container, contextID = contextID,onChange));
        });
    }
}