import { Collapsibles } from './lib/collapsibles.js'
import { FileLoader } from './lib/file_loader.js'

//todo: may use html/text files for the posts and reserve tags or something for
//title and metadata. could add a split word like [html] and treat all at the start
//as json or have a few [title] [body] [data] that state the end of that segment

//this allow only the body(inner html) of a html file to be return
//for cases where one wants a standalone static post
export async function load_html_body(file) {
    //const html = await (await fetch(file)).text();
    const html = await fetch(file).then(
        result => {
            if (!result.ok) { return null }
            return result.text()
        }
    ).catch(
        error => { return null }
    );
    if (!html) { return null }
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.innerHTML;
}

export async function add_html_from_file(file, container = document.body_class_name, type = 'div') {
    if (container) {
        const body_html = await load_html_body(file);
        const element = (type) ? document.createElement(type) : container;
        if (element !== container) {
            container.appendChild(element);
        }
        element.innerHTML = body_html;
    }
    else {
        throw new Error("Container is not a vaild element.");
    }
}

export async function load_page(dir = '', files = [], container = document.body, element = document.createElement('div'), page = 0, max_posts = 20) {
    const page_start = page * max_posts;
    const page_end = (page + 1) * max_posts;
    for (let i = page_start; i < page_end; i++) {
        if (!(i >= 0 && i < files.length)) {
            break;
        }
        console.log(dir + '/' + files[i])
        if (typeof files[i] === 'string') {
            const html = await load_html_body(dir + '/' + files[i])
            if (!html) { continue }
            //going to allow element to copy, string to create a generoc element, or create a div if no else applies
            const post = element instanceof HTMLElement ? element.cloneNode(true) : typeof element === 'string' ? document.createElement(element) : document.createElement('div');
            post.innerHTML = html
            container.appendChild(post)
        }

    }
}
//should make a load content funtion instead of fighting with below
//that use the sitemap approch or that brute force approch
//would need pageing, async, and anding invalid types
//sitemap mostly need to ignore index0 if an object, then
//loop from page start to page end or untill all elements are used up (also ignoring fail cases)
//brute force just check for file name plus i plus format untill one fails to load or page end

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
        this.post_container = document.getElementById('body_container');

        const map_data = await (await fetch('./data/' + type + '_map.json')).json();
        this.data = map_data;
        for (let i = page_start; i < page_end; i++) {
            if (!(i >= 0 && i < map_data[this.group].length)) {
                break;
            }
            const post = map_data[this.group][i]
            if (post_count <= 0) {
                break;
            }
            if (post.path) {
                post_count -= 1;
                const text = await (await fetch(post.path)).text();
                post.text = text
                this.create_post(post)

            }
            else if (post.text) {
                post_count -= 1;
                this.create_post(post)
            }
        }
    }
}