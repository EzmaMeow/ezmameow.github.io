export class Item {
    static icon_class = 'inv_item_icon';
    static text_class = 'inv_item_text';
    static header_class = 'inv_item_header';
    static body_class = 'inv_item_body';
    static footer_class = 'inv_item_footer';
    //note:name and amount is not nessary needed except for sorting reasons. so at least won't need setters and getters
    #name; get name() { return this.#name; }
    set name(value) {
        if (this.#name === value) { return }
        this.#name = value;
    }
    #amount; get amount() { return this.#amount; }
    set amount(value) {
        if (this.#amount === value) { return }
        this.#amount = value;
    }
    #icon_src; get icon_src() { return this.#icon_src; }
    set icon_src(value) {
        if (this.#icon_src === value) { return }
        this.#icon_src = value;
        this.header_icon.src = this.#icon_src;
    }
    get hidden() { return this.element.hidden }
    set hidden(value) { this.element.hidden = value }
    update_text(text) {
        this.header_text.innerHTML = text;
    }
    update_info(text) {
        this.body.innerHTML = text;
    }
    on_selection_changed(is_selected) {

    }
    header_clicked(event) {
        this.is_selected = !this.is_selected;
        this.body.hidden = !this.is_selected;
        this.footer.hidden = !this.is_selected;
        this.on_selection_changed(this.is_selected);
    }
    create_item_header() {
        //NOTE: may have short info to the right of name or part of text
        //such as weight/size and amount
        this.header = document.createElement('div');
        this.header.className = this.header_class || Item.header_class;
        this.header_icon = document.createElement('img');
        this.header_icon.className = this.icon_class || Item.icon_class;
        this.header_text = document.createElement('span');
        this.header_text.className = this.text_class || Item.text_class;
        this.header_icon.style = 'height:16px;'
        this.element.appendChild(this.header);
        this.header.appendChild(this.header_icon);
        this.header.appendChild(this.header_text);

        this.header.addEventListener("click", (event) => this.header_clicked(event));

        return this.header;
    }
    create_item_body() {
        this.body = document.createElement('div');
        this.body.className = this.body_class || Item.body_class;
        this.body.hidden = true;
        this.element.appendChild(this.body);
        return this.body;
    }
    create_item_footer() {
        this.footer = document.createElement('div');
        this.footer.className = this.footer_class || Item.footer_class;
        this.footer.hidden = true;
        this.element.appendChild(this.footer);
        return this.footer;
    }
    remove_item_header() {
        this.header.removeEventListener("click", (event) => this.header_clicked(event));

        this.header.removeChild(this.header_icon);
        this.header.removeChild(this.header_text);
        this.element.removeChild(this.header);
        this.header_icon = null;
        this.header_text = null;
        this.header = null;
    }
    remove_item_body() {
        this.element.removeChild(this.body);
        this.body = null;
    }
    remove_item_footer() {
        this.element.removeChild(this.footer);
        this.footer = null;
    }
    deconstructor() {
        this.remove_item_header();
        this.remove_item_body();
        this.remove_item_footer();
        this.element = null;
    }
    constructor() {
        this.element = document.createElement('div');
        this.create_item_header();
        this.create_item_body();
        this.create_item_footer();
        this.element.hidden = true;
    }
}

export class Inventory {
    //NOTE: item actions may need to be treated as callbacks and the creator of the inventory need
    //to connect them to do anything and tell inventory to uopdate the changes afterwards
    load(data = {}) {
        //clear or add this property that hold an array format of the
        //pass inventory items as long as it exist and not null
        this.inventory_data = [];
        //the idea is to load the inventory as an array of
        //items objects(not from the class nessary)
        //the objects should be read only(well action need a source to trigger though)
        //so it could read an active item state. they item might need
        //a proxy around it if it properties are diffrent than the item here
        //or a callable to act as an adapter
        //
        if (Array.isArray(data)) {
            for (let i = 0; i < data.length; i++) {
                const value = data[i];
                if (!value || typeof value !== 'object') { continue }
                //this is used for the advance inventory where items are stored in slots
                //or some structure (grid base stuff of variation of sizes are not a focus here)
                //so the item data is the value
                this.inventory_data.push(value)

            }
        }
        else if (data instanceof Map) {
            for (const [key, value] of data) {
                if (!key || typeof key !== 'object') { continue }
                //key is the class or base object and the value is additional meta data
                //or just the amount. This is used for the simple inventory
                this.inventory_data.push([key, value])
            }
        }
        //NOTE: the inventory_data should be treated as fixed
        //and sorted items or something be used for display

    }
    //the item data may be in two formats. the array is a static item and a meta item
    //where the meta overrides the static item properties at times or just adds new ones
    //the non_array is a meta item that extends a static item or acts as a wrapper of the static item
    //so it should do all that override stuff when the propery is acess in itself
    //NOTE: can store this as a var before assigning the pacth so it can call the old logic
    get_item_data_property(data, property, default_value) {
        if (Array.isArray(data)) {
            if (data[1][property]) {
                return data[1][property] !== undefined ? data[1][property] : default_value;
            }
            return data[0][property] !== undefined ? data[0][property] : default_value;
        }
        return data[property] !== undefined ? data[property] : default_value;

    }
    update_item(item, item_data) {
        item.name = this.get_item_data_property(item_data, 'name', 'no_name')
        item.amount = this.get_item_data_property(item_data, 'amount', 0)
        item.icon_src = this.get_item_data_property(item_data, 'icon_src', "/assets/anim_profile_pic.gif")
        //should call update text here as well and keep item simple
        //also means most if the display stuff can be overriden here
        if (item.amount !== 1) {
            item.update_text(`${item.name} (x${item.amount})`);
        }
        else{
           item.update_text(item.name); 
        }
    }
    update_items() {
        const page = this.page || 0;
        const page_start = page * this.max_items;
        for (let i = 0; i < this.max_items; i++) {
            const item = this.items[i]
            const page_position = page_start + i;
            //safty checks. last one needed if data segment smaller than page size
            if (page_position < 0) { continue; }
            if (page_position >= this.inventory_data.length) {
                item.hidden = true;
                continue;
            }
            item.hidden = false;
            const item_data = this.inventory_data[page_position]
            this.update_item(item,item_data);

        }
    }
    remove_item(item, parent = this.element) {
        if (!item || !parent) {
            return
        }
        if (!parent.contains(item.element)) {
            console.log(parent, ' dose not have ', item, '. ignoring removal.')
            return
        }
        item.deconstructor();
        item = null;
    }
    create_item(parent = this.element) {
        if (!parent) {
            console.log(parent, ' is not vaild.')
            return
        }
        const item = new Item();
        parent.appendChild(item.element);
        this.items.push(item);
        return item
    }
    constructor(parent_id = 'inventory', max_items = 24) {
        const parent = document.getElementById(parent_id);
        this.max_items = max_items;
        this.element = document.createElement('div');
        parent.appendChild(this.element);
        this.items = [];
        for (let i = 0; i < this.max_items; i++) {
            this.create_item();
        }
        console.log(this)
    }
}