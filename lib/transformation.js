//TODO: work on this
//This is for cases where I am not extending from a lib that is providing this kind of structure.
//NOTE: may not use this as origally planned. may be better to use a proxy over the array.
//I mean this could still work, but need to get/pass the array for systems that read the array instead
//this also could hold static functions unless vector math will handle it
export class Transformation{
    //this contains an object transform in a 'Homogeneous Transformation Matrix' format
    //or a dumb down way for testing. the main goal is to have a place to read the transformation info of
    //an object while having a way to listen to changes
    #matrix = []
}