export class Sound{
    static #ACTIVE_STATE = {INIT:0,STARTED:1,PLAYING:2,ENDED:3}; 
    static get ACTIVE_STATE(){return this.#ACTIVE_STATE;}
    start(){
        this.active_state = Sound.ACTIVE_STATE.STARTED;
        //routing the creation logic here so it could allow the sound to be restarted after end
    }
    //this may handle setting up and running a sound. this base class should not depend on Audio_Manager, but Audio_Manager may manager it
    play(){
        this.active_state = Sound.ACTIVE_STATE.PLAYING;
        //run the sound. this will start it or play a step of it
    }
    end(){
        this.active_state = Sound.ACTIVE_STATE.ENDED;
        //clean up. remove all nodes this creates/manages.
    }
    constructor(audio_context){
        this.active_state = Sound.ACTIVE_STATE.INIT;
        this.audio_context = audio_context;
    }
}