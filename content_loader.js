import { Collapsibles } from './lib/collapsibles.js'
import { FileLoader } from './lib/file_loader.js'

//todo: may use html/text files for the posts and reserve tags or something for
//title and metadata. could add a split word like [html] and treat all at the start
//as json or have a few [title] [body] [data] that state the end of that segment

export async function add_html_from_file(file, container = document.body_class_name, type = 'div') {
    if (container) {
        return FileLoader.load(file, FileLoader.LOAD_TYPE.TEXT).then((text_data) => {
            const element = (type) ? document.createElement(type) : container;
            if (element !== container) {
                container.appendChild(element);
            }
            element.innerHTML = text_data;
        });
    }
    else {
        throw new Error("Container is not a vaild element.");
    }
}

export class Post_Page_Loader {
    static post_container;
    static load_count = 0;
    static post_class_name = "info_container collapsible";
    static title_class_name = "info_title collapsible_toggle";
    static body_class_name = "info_content post collapsible_content";
    static page = 0;
    static max_posts = 20;
    static type = 'posts';
    static group = 'default';
    //the data use to load posts either a map of groups or an array of links depending on the logic used
    //may create an array of links in the future so group is not needed. 
    static data;
    static on_loaded() {

    }
    static #loaded() {
        for (let i = 0; i < this.posts.length; i++) {
            const post = this.posts[i];
            this.posts[i] = this.create_post(post);
        }
        this.on_loaded();
        Collapsibles.register();
    }

    static update_load_count(amount = 1) {
        this.load_count += amount;
        if (this.load_count <= 0) {
            this.#loaded();
        }
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
        return post;
    }
    //this is a check to see if a page exists. mostly to be used for displaying
    //page buttons
    static has_page(page = 0) {
        //this will need to change if the logic related how data is handle changes
        return page >= 0 && page * this.max_posts < this.data[this.group].length
    }
    static async load_page(type = 'posts', group = 'default', page = 0, max_posts = this.max_posts, body = 'body_container', data = {}) {
        //NOTE: pgae and max posts are not in use yet
        let post_count = max_posts;
        //stroing the load data in the class to have a way to know how the page was last loaded
        this.page = parseInt(page);
        this.max_posts = parseInt(max_posts);
        this.type = type;
        this.group = group;
        const page_start = this.page * this.max_posts;
        const page_end = (this.page + 1) * this.max_posts;
        this.update_load_count(1)
        this.post_container = document.getElementById('body_container');
        return FileLoader.load('./data/' + type + '_map.json', FileLoader.LOAD_TYPE.JSON).then((data) => {
            this.posts = [];
            this.data = data;
            for (let i = page_start; i < page_end; i++) {
                if (!(i >= 0 && i < data[this.group].length)) {
                    break;
                }
                const post = data[this.group][i]
                //for (const post of data[group]) {
                if (post_count <= 0) {
                    break;
                }
                if (post.path) {
                    post_count -= 1;
                    this.update_load_count(1)
                    FileLoader.load(post.path, FileLoader.LOAD_TYPE.TEXT).then((text) => {
                        post.text = text
                        this.posts.push(post)
                        //this.create_post(post);
                        this.update_load_count(-1);
                    })
                }
                else if (post.text) {
                    post_count -= 1;
                    this.posts.push(post)
                    //this.create_post(post)
                }
            }
            this.update_load_count(-1);
        });
    }
}