import { World } from './world.js'
import { Level } from './level.js'
import { Fish } from './fish.js'

const sound_volume_element = document.getElementById('sound_volume');
const splash_sound = document.getElementById('splash_sound')
const quick_splash_sound = document.getElementById('quick_splash_sound');
const score_element = document.getElementById('score');
const sound_volume_id = 'fishing_sound_volume';
let sound_volume = localStorage.getItem(sound_volume_id)
if (sound_volume === null) {
    sound_volume = sessionStorage.getItem(sound_volume_id)
}
if (sound_volume === null) {
    sound_volume = 0.25;
}
splash_sound.volume = sound_volume;
quick_splash_sound.volume = sound_volume;
sound_volume_element.value = sound_volume;
sound_volume_element.addEventListener('change', (event) => {
    sound_volume = parseFloat(event.target.value);
    splash_sound.volume = sound_volume;
    quick_splash_sound.volume = sound_volume;
    sessionStorage.setItem(sound_volume_id, event.target.value)
    splash_sound.pause();
    splash_sound.currentTime = 0;
    splash_sound.play();
})
let score = parseInt(sessionStorage.getItem('fishing_score')) || 0;
if (score > 0) {
    score_element.innerHTML = `Score: ${score}`;
}

const level = new Level(new World())
level.on_ready = () => {
    const random_point = [0.0, 0.0];
    const fish_data = {
        width: 16,
        height: 16,
        img_src: '/assets/fish.gif',
        opacity: 0.9
    }
    const fish_width = 16;
    const fish_height = 16;
    for (let i = 0; i < 10; i++) {
        //const fish = new Fish('./assets/fish.gif', fish_width, fish_height, level.world)
        //level.objects.push(fish);
        level.world.random_point_in_nav_area(fish_data.width, fish_data.height, random_point)
        fish_data.x = random_point[0];
        fish_data.y = random_point[1];
        fish_data.base_speed = Math.random() * 8 + 8;
        fish_data.scale_x = Math.random() * 1.5 + 0.5;
        fish_data.scale_y = Math.random() * 1.5 + 0.5;
        const fish = new Fish(fish_data, level.world)
        level.objects.push(fish);
        //fish.setup(
        //    random_point[0], random_point[1]
        //)
        //fish.base_speed = Math.random() * 8 + 8;
        //fish.set_scale(Math.random() * 1.5 + 0.5)
        fish.depth = Math.random() * 0.5 + 0.5;
        level.element.appendChild(fish.image);
        fish.image.addEventListener("click", (event) => {
            if (fish.depth < 1.0 && !(Math.random() <= fish.depth)) {
                quick_splash_sound.pause();
                quick_splash_sound.currentTime = 0;
                quick_splash_sound.play();
                return
            }
            splash_sound.pause();
            splash_sound.currentTime = 0;
            splash_sound.play();
            score += Math.max(Math.floor((fish.scale[0] + fish.scale[1]) * 0.75), 1)
            score_element.innerHTML = `Score: ${score}`;
            sessionStorage.setItem('fishing_score', score);
            level.world.random_point_in_nav_area(fish.width, fish.height, fish.move_to)
            level.world.random_point_in_nav_area(fish.width, fish.height, random_point)
            fish.set_position(random_point[0], random_point[1]);
            fish.base_speed = Math.random() * 8 + 8;
            fish.set_scale(Math.random() * 1.5 + 0.5)
            fish.depth = 0.0;
            level.element.appendChild(fish.image);
        })
        console.log(fish)
    }
}
level.setup(
    document.getElementById('world'),
    document.getElementById('level'),
    new World()
)

let last_time = performance.now();
let current_time = performance.now();
let loop_running = false;

let in_focus = true;
window.addEventListener('blur', () => {
    in_focus = false;
    loop_running = false;
});

// When the window gains focus
window.addEventListener('focus', () => {
    in_focus = true;
    start_loop();
});


function start_loop() {
    if (loop_running) {
        console.log('loop is already running')
    }
    last_time = performance.now();
    current_time = performance.now();
    loop_running = true;
    requestAnimationFrame(loop);
}
function loop() {
    if (!loop_running) { return; }
    current_time = performance.now();

    if (document.hidden || document.visibilityState !== "visible" || !document.hasFocus() || !in_focus) {
        last_time = current_time;
        requestAnimationFrame(loop);
        return
    }
    const delta = (current_time - last_time) / 1000.0;
    if (delta > 2.0) { console.log('delta is greater than 2 seconds') }
    last_time = current_time;
    level.update(delta)
    requestAnimationFrame(loop);
}
start_loop();

