//This is a to help read a media element and could be expanded to append features
export class MediaWrapper {
    get isLoading() {
        return this.target.networkState === this.target.NETWORK_LOADING ||
            this.target.readyState < this.target.HAVE_FUTURE_DATA;
    }

    get isReady() {
        return this.target.readyState >= this.target.HAVE_FUTURE_DATA;
    }

    get isPaused() {
        return this.target.paused && !this.target.ended;
    }
    get isPlaying() {
        return !this.target.paused &&
            !this.target.ended &&
            this.target.readyState >= this.target.HAVE_FUTURE_DATA
    }
    get isStopped() {
        return !this.target.src ||
            this.target.networkState === this.target.NETWORK_EMPTY ||
            (this.target.paused && this.target.currentTime === 0)
    }

    get isBuffering() {
        return this.target.readyState < this.target.HAVE_FUTURE_DATA &&
            !this.target.paused &&
            !this.target.ended;
    }
    get hasError() {
        return this.target.error !== null;
    }

    async play() {
        if (this.isPlaying || this.hasErrored) {
            return;
        }
        return this.target.play()
    }
    pause() {
        if (!this.isPlaying) return;
        this.target.pause();
    }
    stop() {
        this.target.src = "";
        this.pause()
    }
    async toggle() {
        if (!this.target.src) {
            return;
        }
        if (this.isPlaying) {
            this.pause();
        } else if (this.isPaused || this.isReady) {
           await this.play();
        } else if (this.isStopped && this.target.src) {
           await this.play();
        }
    }
    async load(src, playOnLoad = this.target.autoplay) {
        if (this.target.src === src) { return }
        this.stop();
        if (!src) return;
        this.target.src = src;
        if (playOnLoad && src) {
            console.log(playOnLoad )
            await this.play();
        }
    }
    constructor(audioElement) {
        this.target = audioElement;
    }
}