import { Vec3 } from "https://esm.sh/cannon-es";
import { Signal } from './game_core.js'
//this handles controlling a character either fixed, ai, or player controlled

export class Controller{
    //general actions types so the string is shared. may or may not lock
    #ACTIONS = {
        JUMP:'jump',
        INTERACT:'interact',
        ATTACK:'attack',
    }; 
    get ACTIONS(){return this.#ACTIONS}
    #states = { //states are flag or int the controller is in. NOTE: these represent user or ai input not actual state of movement (that is for the movement component)
        speed:0,//0 is none, 1 is sneak, 2 is walk, 3 is run or it is handle as flags instead. can be multipy to speed (as well as modifiers. .50 would make sneak half of speed am walk = to speed)
    }; 
    get states() {return this.#states}
    #direction = new Vec3(); get direction(){return this.#direction}
    #on_action = new Signal; get on_action(){return this.#on_action}
    //generic action to simplify conntions. if there are to be many actions, 
    //then they may need there own signals
    trigger_action(id,data){
        this.on_action.emit(id,data);
    }
}