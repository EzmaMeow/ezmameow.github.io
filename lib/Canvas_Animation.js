export class Canvas_Animation {
    //this should be a helper class that may be used as an object if desired
    //should contain a load function to load animations which is an image file with a map of animation name (acts as an enum) and an array of numeric data
    //representing all the animation that is predefined for the image via a json,

    //Note: should have a area for a resource loader logic to fetch data. animations would be a json file that have an image link. the respource loader logic
    //will state if the animation is allow to load (user define. basicly user can check if source image exist and return false if it dose not. so the logic should be design to expect to wait for an on_load to run
    //if needed(may be able to leave that to the one calling the load))
    //might not have the resource loader logic depending on if the logic can be overriden without butching the logic

    //Note animation keys would be the image url or source depending on how resource loading is handled
    animations = new Map()
    manage_file(url){return true}
    add(source, data){
        //data is the loaded json. source is the source image or image url or animation meta object (that contain the animation names, source image, and other image wide data)
        //if a source exists, it will add and replace existing animation
        //may add flags to state how it handles overlaping animations later
        if(this.animations.has(source)){
            //override the animation
            //and return to end the logic
            //do not return if replacing the animation
            //return
        }
        const total_animations = 1;
        //the array is a matrix where each row is an animation
        //that state the size of the frame(height/width), the start and end id, the frame rate(time between frames), and a bitflag for extra data
        this.animations.set(source,new Float32Array(total_animations*6))

    }
    remove(source){
        return this.animations.remove(source)
    }
    load(url){}
    draw(context, delta){
        //this will draw the current frame to the context and forward timing base on delta
        //so a var for current time is needed as well as a start and end time. generally the frame
        //rate should be the same or slower than the render rate(else frames would be skipped)
        //though may need a setting to clamp progress by each step or by the first full frame
        //0.5 to 1.5 would be 1.0 or 1.5. 0.5 to 2.5 would be 1.0 or 1.9999
    }
}
//Note: animations map might not be need or should be changed sinced the animation source might contain that data instead
//with a getter and such. so the map might be adding an id to these sources to make looking up easier
//NOTE: might dumb down the canvas animation as a static class that might catch and verify dupicate animation sources/data. basicly
//this is the json file as an object formated to be safe to be used.
//may still need an object that have a draw function and manage the state of the current animation
//may reduce it to a single animation object with a get_frame and a forward function where get_frame take a time(passing object time by default) and forward add delta to the object time
//then have another system cache these animation or let each object create a new instance instead of managing it here...or have the managing system optional and allow the animation to be used as is.
//also get frame would either return the frame index or an array of the frame draw data. index be better then it can pull that data from the animation matrix (like a draw function that takes the index and use the provided
//animation data. note animation data bitflag might state if the frame is flip so transformation logic might need to be stored, apply, and reset in the draw function. the draw function my be in an extended version of animation
//like canvas animation incase it is not needed since the animation data is ment to be just data with some helpful functions and the thing that uses it can handle the draw logic)
export class Animation_Source{
    //a path to an image file that contains all the frames
    image_url = '';
    //the path to a json file that declare the frames 
    data_url = '';
    //image is an object that acts like an image object or a ref to the actual image object. 
    image = null;
    //data=null;//data is loaded and then parce into animation data


}