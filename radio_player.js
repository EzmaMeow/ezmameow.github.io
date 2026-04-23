import { MediaWrapper } from './lib/media_wrapper.js'

export class Radio extends MediaWrapper {
    #audio
    get audio() { return this.#audio; }
    stationName = 'None'
    stateChange() {

    }
    parseUrlInput(url) {
        let streamUrl = url;
        let stationId = null;
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
        this.load(streamUrl);
    }
    constructor(mediaElement) {
        super(mediaElement);
        this.target.addEventListener("timeupdate", () => this.stateChange());
        this.target.addEventListener("pause", () => this.stateChange());
        this.target.addEventListener("ended", () => this.stateChange());

    }
}

const streamInput = document.getElementById('streamUrl');
const radio = new Radio(document.getElementById('radio'));
const toggleRadioElement = document.getElementById('toggleRadio');

function loadRadio() {
    radio.parseUrlInput(streamInput.value.trim());
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
document.getElementById('loadRadioLink').addEventListener("click", (event) => loadRadio())
document.getElementById('toggleRadio').addEventListener("click", (event) => toggleRadio())