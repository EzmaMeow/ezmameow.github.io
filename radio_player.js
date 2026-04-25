import { MediaWrapper } from './lib/media_wrapper.js'

export class Radio extends MediaWrapper {
    SAVEKEY = 'radioPlayerOption:';
    #audio
    get audio() { return this.#audio; }
    defaultStation = "https://radio.garden/listen/wcpe-the-classical-station/dNa5l6AK";
    stationName = 'None'
    stateChange() {

    }
    parseUrlInput(url) {
        if (url === '%defaultStation') {
            url = this.defaultStation;
        }
        let streamUrl = url;
        let stationId = null;
        //will replace url with the default station if '%defaultStation' was passed
        if (url) {
            this.stationName = 'URL';
        }
        else {
            this.stationName = 'None';
        }
        if (!streamUrl.startsWith('http://')) {
            stationId = streamUrl;
        }
        if (streamUrl.startsWith('https://radio.garden/listen/')) {
            const urlParts = streamUrl.split('/').filter(Boolean);
            stationId = urlParts.length ? urlParts[urlParts.length - 1] : '';
            this.stationName = urlParts.length ? urlParts[urlParts.length - 2] : '';
        }
        if (stationId) {
            streamUrl = `https://radio.garden/api/ara/content/listen/${stationId}/channel.mp3`
        }
        return streamUrl
    }
    setOption(property, value) {
        if (property === 'volume') {
            this.target.volume = parseFloat(value);
            return true;
        }
        if (property === 'src') {
            this.load(this.parseUrlInput(value));
            return true;
        }
        if (property === 'autoplay') {
            if (typeof value === "string"){
                value = /^true$/i.test(value.trim());
            }
            
            
            this.target.autoplay = Boolean(value);
            return true;
        }
        return false;

    }
    //override this function with the check to verify if local
    //storage is allowed
    saveLocal() {
        return false
    }
    saveOption(property, value) {
        if (this.saveLocal()) {
            localStorage.setItem(this.SAVEKEY + property, value)
        }
        else {
            sessionStorage.setItem(this.SAVEKEY + property, value)
        }
    }
    loadOption(property, defaultValue) {
        let value = localStorage.getItem(this.SAVEKEY + property)
        if (value === null) {
            value = sessionStorage.getItem(this.SAVEKEY + property)
        }
        if (value === null) {
            value = defaultValue
        }
        this.setOption(property, value)
        return value;

    }
    routeOptionInputs(optionClass) {
        const options = document.querySelectorAll(optionClass);
        options.forEach(option => {
            //sync the value
            const loadValue = this.loadOption(
                option.dataset.property,
                option.type === 'checkbox' ? option.checked : option.value
            )
            if (option.type === 'checkbox') {
                option.checked = loadValue;
            }
            else {
                option.value = loadValue;
            }
            option.addEventListener('change', (event) => {
                const target = event.target;
                const property = target.dataset.property;
                const value = target.type === 'checkbox' ? target.checked : target.value;
                if (this.setOption(property, value)) {
                    this.saveOption(property, value);
                }
            });
        });
    }
    constructor(mediaElement) {
        super(mediaElement);
        this.target.addEventListener("timeupdate", () => this.stateChange());
        this.target.addEventListener("pause", () => this.stateChange());
        this.target.addEventListener("ended", () => this.stateChange());

    }
}

const streamInput = document.getElementById('streamUrl');
const radio = new Radio(document.getElementById('radioAudio'));
const toggleRadioElement = document.getElementById('toggleRadio');

function loadRadio() {
    radio.load(radio.parseUrlInput(streamInput.value.trim()),radio.target.autoplay);
}
function defaultClicked() {
    streamInput.value = '%defaultStation';
    if (radio.setOption('src', '%defaultStation')) {
        radio.saveOption('src', '%defaultStation');
    }
}

function toggleRadio() {
    radio.toggle();
}

function unlockAudio() {
    loadRadio();
    document.removeEventListener("click", unlockAudio);
    document.removeEventListener("keydown", unlockAudio);
    document.removeEventListener("touchstart", unlockAudio);
}

if (toggleRadioElement) {
    radio.stateChange = () => {
        if (radio.isStopped) {
            toggleRadioElement.innerHTML = '∅ Playing from ' + radio.stationName;
        }
        else if (!radio.isPlaying) {
            toggleRadioElement.innerHTML = '▷ Playing from ' + radio.stationName;
        }
        else {
            toggleRadioElement.innerHTML = '⏸ Playing from ' + radio.stationName;
        }
    }
}

document.addEventListener("click", unlockAudio);
document.addEventListener("keydown", unlockAudio);
document.addEventListener("touchstart", unlockAudio);
//todo: maybe move this stuff to the class and have a setup function that connects 
//to the provided elements
document.getElementById('radioDefaultStation').addEventListener("click", (event) => defaultClicked())
document.getElementById('toggleRadio').addEventListener("click", (event) => toggleRadio())
radio.routeOptionInputs('.radioOptions');
