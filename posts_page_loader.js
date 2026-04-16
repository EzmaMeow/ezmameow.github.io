import { Collapsibles } from './lib/collapsibles.js'
import { FileLoader } from './lib/file_loader.js'

//todo: may use html/text files for the posts and reserve tags or something for
//title and metadata. could add a split word like [html] and treat all at the start
//as json or have a few [title] [body] [data] that state the end of that segment

export class Post_Page_Loader {
    static post_container;
    static load_count = 0;
    static post_class_name = "info_container collapsible";
    static title_class_name = "info_title collapsible_toggle";
    static body_class_name = "info_content collapsible_content";
    static loaded() {
        Collapsibles.register();
    }

    static update_load_count(amount = 1) {
        this.load_count += amount;
        if (this.load_count <= 0) {
            this.loaded()
        }
        console.log(this.load_count)
    }

    static create_post(data) {
        const post = document.createElement('div');
        const title = document.createElement('div');
        const body = document.createElement('div');
        post.className = this.post_class_name;
        title.className = this.title_class_name;
        body.className = this.body_class_name;
        title.innerHTML = data.title;
        body.innerHTML = data.text;
        this.post_container.appendChild(post);
        post.appendChild(title);
        post.appendChild(body);
    }

    static load_page(type = 'posts', group = 'default', body = 'body_container', data = {}) {
        this.update_load_count(1)
        this.post_container = document.getElementById('body_container');
        FileLoader.load('./data/' + type + '_map.json', (data) => {
            console.log(type,group,data)
            for (const post of data[group]) {
                if (post.path) {
                    this.update_load_count(1)
                    FileLoader.load(post.path, (text) => {
                        post.text = text
                        this.create_post(post);
                        this.update_load_count(-1);
                    }, FileLoader.LOAD_TYPE.TEXT)
                }
                else if (post.text) {
                    this.create_post(post)
                }
            }
            this.update_load_count(-1);
        }, FileLoader.LOAD_TYPE.JSON)
    }

}