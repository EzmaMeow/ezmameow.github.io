import { Sound } from '../sound.js'

export class Footsteps extends Sound {
    step_count = 0;
    duration = 0.25;
    playing = false;
    start() {
        if (this.active_state !== Sound.ACTIVE_STATE.ENDED && this.active_state !== Sound.ACTIVE_STATE.INIT){
            return
        }
        //routing the creation logic here so it could allow the sound to be restarted after end
        this.buffer = this.audio_context.createBuffer(1, this.audio_context.sampleRate * 0.2, this.audio_context.sampleRate);
        this.buffer_source = this.audio_context.createBufferSource();
        this.buffer_source.buffer = this.buffer;
        this.buffer_source.loop = true;

        this.filter = this.audio_context.createBiquadFilter();
        this.oscillator = this.audio_context.createOscillator();
        this.gain = this.audio_context.createGain();
        this.panner = this.audio_context.createStereoPanner();

        this.buffer_source.connect(this.filter);
        this.filter.connect(this.gain);
        this.oscillator.connect(this.gain);
        this.gain.connect(this.panner);
        this.panner.connect(this.audio_context.destination);

        this.active_state = Sound.ACTIVE_STATE.STARTED

    }
    play(current_time = this.audio_context.currentTime, duration = this.duration) {
        if (this.active_state === Sound.ACTIVE_STATE.ENDED || this.active_state === Sound.ACTIVE_STATE.INIT){
            return
        }
        const noise_freq = 800 + Math.random() * 800;
        const impact_freq = 80 + Math.random() * 60; 
        const volume = 0.6 + Math.random() * 0.4; 
        const pan_value = (this.step_count % 2 === 0 ? -0.4 : 0.4) + (Math.random() * 0.2 - 0.1);

        const output = this.buffer.getChannelData(0);
        for (let i = 0; i < this.buffer.length; i++) {
            output[i] = (Math.random() * 2 - 1) * 0.4;
        }

        this.filter.type = 'bandpass';
        this.filter.frequency.setValueAtTime(noise_freq, current_time)
        

        this.oscillator.type = 'sine';
        this.oscillator.frequency.setValueAtTime(impact_freq, current_time);
        this.oscillator.frequency.exponentialRampToValueAtTime(impact_freq / 2, current_time + duration - 0.10);

        this.gain.gain.setValueAtTime(0.0, current_time);
        this.gain.gain.linearRampToValueAtTime(volume, current_time + 0.02);
        this.gain.gain.exponentialRampToValueAtTime(0.001, current_time + duration);

        this.panner.pan.setValueAtTime(pan_value, current_time);

        this.active_state = Sound.ACTIVE_STATE.PLAYING;
        if (!this.buffer_source.started){
            this.buffer_source.started = true;
            this.buffer_source.start(current_time);
            this.oscillator.start(current_time);
        }

        this.step_count += 1;
    }
    end() {
        if (this.active_state === Sound.ACTIVE_STATE.ENDED || this.active_state === Sound.ACTIVE_STATE.INIT){
            return
        }
        this.buffer_source.disconnect()
        this.filter.disconnect();
        this.oscillator.disconnect();
        this.gain.disconnect();
        this.panner.disconnect();

        this.buffer_source.stop()
        this.filter.stop();
        this.oscillator.stop();
        this.gain.stop();
        this.panner.stop();

        //NOTE: this seems safe (but can not reset it, will need to make a new buffer source(incase once thinks about not looping the buffer))
        this.buffer_source.buffer = null;
        
        this.buffer = null;
        this.buffer_source = null;
        this.filter = null;
        this.oscillator = null;
        this.gain = null;
        this.panner = null;

        this.active_state = Sound.ACTIVE_STATE.ENDED;

        //clean up. remove all nodes this creates/manages.
    }
}
