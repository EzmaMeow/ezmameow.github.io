# Naming in general (for only this project):
-This project use '_' for spaces
-all lowercase for varibles and functions
-all caps for global, class, or class instance consts(or var to be treated as consts)
    (function and object consts are not expected to follow this rule)
-caps the first letter of each word for classes. This may also apply to global varibles, but should be reserved for namespaces or classes.
-NOTE: naming will be diffrent for moduals this project dose not manage.
    The diffrence is mostly to follow a similar pattern between languages as well as a 
    way to identify what is part of this project and what is included outside of it.
-NOTE: Should try to follow standard naming patterns only if the project modual is 
    expected to be used outside of the project. This means some classes may follow
    a diffrent naming convention.


# Naming of custom types:

-Signals: The object should be prefix with signal or something unquie.
    The object and any functions design to be connected to it should be name like 
    an action ideally in past tense if possible.
    Such callables should be prefix with on_ to state that the signal been triggered.

# Order:

-order is not as importaint. 
When possible, try to declare before use. This put the constructor last
    overides are consider already declares so they do not need to follow this order.
    This is more to share a simlar read order as languages that depends on declare order.
Beside above, perhaps the rest should follow a more mainline declare order.
    Something like static var, const var, instance var, static func, instance func.

# File structure:

-this dir will be treated as the scr and will hold the index.html (or similar triggering file)
-Lib will be used for code not tied to the project.
-(may add a thirdparty or some folder for three.js and cannon-es one day)
-scripts (or {type}_scripts) will hold code that dependent on a system
    such as extending the Sound class or hold webworker logic
-assets hold art, sounds, and other files that not a standard text format
    or compiled coded.
-data holds json or text files, though it could hold js files if used to build
    an object if there not a dedicated script dir to hold it.
-other dir may get added as needed

    

