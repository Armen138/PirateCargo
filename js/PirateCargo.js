/** vim: et:ts=4:sw=4:sts=4
 * @license RequireJS 2.1.5 Copyright (c) 2010-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */
//Not using strict: uneven strict support in browsers, #392, and causes
//problems with requirejs.exec()/transpiler plugins that may not be strict.
/*jslint regexp: true, nomen: true, sloppy: true */
/*global window, navigator, document, importScripts, setTimeout, opera */

var requirejs, require, define;
(function (global) {
    var req, s, head, baseElement, dataMain, src,
        interactiveScript, currentlyAddingScript, mainScript, subPath,
        version = '2.1.5',
        commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg,
        cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g,
        jsSuffixRegExp = /\.js$/,
        currDirRegExp = /^\.\//,
        op = Object.prototype,
        ostring = op.toString,
        hasOwn = op.hasOwnProperty,
        ap = Array.prototype,
        apsp = ap.splice,
        isBrowser = !!(typeof window !== 'undefined' && navigator && document),
        isWebWorker = !isBrowser && typeof importScripts !== 'undefined',
        //PS3 indicates loaded and complete, but need to wait for complete
        //specifically. Sequence is 'loading', 'loaded', execution,
        // then 'complete'. The UA check is unfortunate, but not sure how
        //to feature test w/o causing perf issues.
        readyRegExp = isBrowser && navigator.platform === 'PLAYSTATION 3' ?
                      /^complete$/ : /^(complete|loaded)$/,
        defContextName = '_',
        //Oh the tragedy, detecting opera. See the usage of isOpera for reason.
        isOpera = typeof opera !== 'undefined' && opera.toString() === '[object Opera]',
        contexts = {},
        cfg = {},
        globalDefQueue = [],
        useInteractive = false;

    function isFunction(it) {
        return ostring.call(it) === '[object Function]';
    }

    function isArray(it) {
        return ostring.call(it) === '[object Array]';
    }

    /**
     * Helper function for iterating over an array. If the func returns
     * a true value, it will break out of the loop.
     */
    function each(ary, func) {
        if (ary) {
            var i;
            for (i = 0; i < ary.length; i += 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    /**
     * Helper function for iterating over an array backwards. If the func
     * returns a true value, it will break out of the loop.
     */
    function eachReverse(ary, func) {
        if (ary) {
            var i;
            for (i = ary.length - 1; i > -1; i -= 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    function getOwn(obj, prop) {
        return hasProp(obj, prop) && obj[prop];
    }

    /**
     * Cycles over properties in an object and calls a function for each
     * property value. If the function returns a truthy value, then the
     * iteration is stopped.
     */
    function eachProp(obj, func) {
        var prop;
        for (prop in obj) {
            if (hasProp(obj, prop)) {
                if (func(obj[prop], prop)) {
                    break;
                }
            }
        }
    }

    /**
     * Simple function to mix in properties from source into target,
     * but only if target does not already have a property of the same name.
     */
    function mixin(target, source, force, deepStringMixin) {
        if (source) {
            eachProp(source, function (value, prop) {
                if (force || !hasProp(target, prop)) {
                    if (deepStringMixin && typeof value !== 'string') {
                        if (!target[prop]) {
                            target[prop] = {};
                        }
                        mixin(target[prop], value, force, deepStringMixin);
                    } else {
                        target[prop] = value;
                    }
                }
            });
        }
        return target;
    }

    //Similar to Function.prototype.bind, but the 'this' object is specified
    //first, since it is easier to read/figure out what 'this' will be.
    function bind(obj, fn) {
        return function () {
            return fn.apply(obj, arguments);
        };
    }

    function scripts() {
        return [];
    }

    //Allow getting a global that expressed in
    //dot notation, like 'a.b.c'.
    function getGlobal(value) {
        if (!value) {
            return value;
        }
        var g = global;
        each(value.split('.'), function (part) {
            g = g[part];
        });
        return g;
    }

    /**
     * Constructs an error with a pointer to an URL with more information.
     * @param {String} id the error ID that maps to an ID on a web page.
     * @param {String} message human readable error.
     * @param {Error} [err] the original error, if there is one.
     *
     * @returns {Error}
     */
    function makeError(id, msg, err, requireModules) {
        var e = new Error(msg + '\nhttp://requirejs.org/docs/errors.html#' + id);
        e.requireType = id;
        e.requireModules = requireModules;
        if (err) {
            e.originalError = err;
        }
        return e;
    }

    if (typeof define !== 'undefined') {
        //If a define is already in play via another AMD loader,
        //do not overwrite.
        return;
    }

    if (typeof requirejs !== 'undefined') {
        if (isFunction(requirejs)) {
            //Do not overwrite and existing requirejs instance.
            return;
        }
        cfg = requirejs;
        requirejs = undefined;
    }

    //Allow for a require config object
    if (typeof require !== 'undefined' && !isFunction(require)) {
        //assume it is a config object.
        cfg = require;
        require = undefined;
    }

    function newContext(contextName) {
        var inCheckLoaded, Module, context, handlers,
            checkLoadedTimeoutId,
            config = {
                //Defaults. Do not set a default for map
                //config to speed up normalize(), which
                //will run faster if there is no default.
                waitSeconds: 7,
                baseUrl: './',
                paths: {},
                pkgs: {},
                shim: {},
                config: {}
            },
            registry = {},
            //registry of just enabled modules, to speed
            //cycle breaking code when lots of modules
            //are registered, but not activated.
            enabledRegistry = {},
            undefEvents = {},
            defQueue = [],
            defined = {},
            urlFetched = {},
            requireCounter = 1,
            unnormalizedCounter = 1;

        /**
         * Trims the . and .. from an array of path segments.
         * It will keep a leading path segment if a .. will become
         * the first path segment, to help with module name lookups,
         * which act like paths, but can be remapped. But the end result,
         * all paths that use this function should look normalized.
         * NOTE: this method MODIFIES the input array.
         * @param {Array} ary the array of path segments.
         */
        function trimDots(ary) {
            var i, part;
            for (i = 0; ary[i]; i += 1) {
                part = ary[i];
                if (part === '.') {
                    ary.splice(i, 1);
                    i -= 1;
                } else if (part === '..') {
                    if (i === 1 && (ary[2] === '..' || ary[0] === '..')) {
                        //End of the line. Keep at least one non-dot
                        //path segment at the front so it can be mapped
                        //correctly to disk. Otherwise, there is likely
                        //no path mapping for a path starting with '..'.
                        //This can still fail, but catches the most reasonable
                        //uses of ..
                        break;
                    } else if (i > 0) {
                        ary.splice(i - 1, 2);
                        i -= 2;
                    }
                }
            }
        }

        /**
         * Given a relative module name, like ./something, normalize it to
         * a real name that can be mapped to a path.
         * @param {String} name the relative name
         * @param {String} baseName a real name that the name arg is relative
         * to.
         * @param {Boolean} applyMap apply the map config to the value. Should
         * only be done if this normalization is for a dependency ID.
         * @returns {String} normalized name
         */
        function normalize(name, baseName, applyMap) {
            var pkgName, pkgConfig, mapValue, nameParts, i, j, nameSegment,
                foundMap, foundI, foundStarMap, starI,
                baseParts = baseName && baseName.split('/'),
                normalizedBaseParts = baseParts,
                map = config.map,
                starMap = map && map['*'];

            //Adjust any relative paths.
            if (name && name.charAt(0) === '.') {
                //If have a base name, try to normalize against it,
                //otherwise, assume it is a top-level require that will
                //be relative to baseUrl in the end.
                if (baseName) {
                    if (getOwn(config.pkgs, baseName)) {
                        //If the baseName is a package name, then just treat it as one
                        //name to concat the name with.
                        normalizedBaseParts = baseParts = [baseName];
                    } else {
                        //Convert baseName to array, and lop off the last part,
                        //so that . matches that 'directory' and not name of the baseName's
                        //module. For instance, baseName of 'one/two/three', maps to
                        //'one/two/three.js', but we want the directory, 'one/two' for
                        //this normalization.
                        normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                    }

                    name = normalizedBaseParts.concat(name.split('/'));
                    trimDots(name);

                    //Some use of packages may use a . path to reference the
                    //'main' module name, so normalize for that.
                    pkgConfig = getOwn(config.pkgs, (pkgName = name[0]));
                    name = name.join('/');
                    if (pkgConfig && name === pkgName + '/' + pkgConfig.main) {
                        name = pkgName;
                    }
                } else if (name.indexOf('./') === 0) {
                    // No baseName, so this is ID is resolved relative
                    // to baseUrl, pull off the leading dot.
                    name = name.substring(2);
                }
            }

            //Apply map config if available.
            if (applyMap && map && (baseParts || starMap)) {
                nameParts = name.split('/');

                for (i = nameParts.length; i > 0; i -= 1) {
                    nameSegment = nameParts.slice(0, i).join('/');

                    if (baseParts) {
                        //Find the longest baseName segment match in the config.
                        //So, do joins on the biggest to smallest lengths of baseParts.
                        for (j = baseParts.length; j > 0; j -= 1) {
                            mapValue = getOwn(map, baseParts.slice(0, j).join('/'));

                            //baseName segment has config, find if it has one for
                            //this name.
                            if (mapValue) {
                                mapValue = getOwn(mapValue, nameSegment);
                                if (mapValue) {
                                    //Match, update name to the new value.
                                    foundMap = mapValue;
                                    foundI = i;
                                    break;
                                }
                            }
                        }
                    }

                    if (foundMap) {
                        break;
                    }

                    //Check for a star map match, but just hold on to it,
                    //if there is a shorter segment match later in a matching
                    //config, then favor over this star map.
                    if (!foundStarMap && starMap && getOwn(starMap, nameSegment)) {
                        foundStarMap = getOwn(starMap, nameSegment);
                        starI = i;
                    }
                }

                if (!foundMap && foundStarMap) {
                    foundMap = foundStarMap;
                    foundI = starI;
                }

                if (foundMap) {
                    nameParts.splice(0, foundI, foundMap);
                    name = nameParts.join('/');
                }
            }

            return name;
        }

        function removeScript(name) {
            if (isBrowser) {
                each(scripts(), function (scriptNode) {
                    if (scriptNode.getAttribute('data-requiremodule') === name &&
                            scriptNode.getAttribute('data-requirecontext') === context.contextName) {
                        scriptNode.parentNode.removeChild(scriptNode);
                        return true;
                    }
                });
            }
        }

        function hasPathFallback(id) {
            var pathConfig = getOwn(config.paths, id);
            if (pathConfig && isArray(pathConfig) && pathConfig.length > 1) {
                removeScript(id);
                //Pop off the first array value, since it failed, and
                //retry
                pathConfig.shift();
                context.require.undef(id);
                context.require([id]);
                return true;
            }
        }

        //Turns a plugin!resource to [plugin, resource]
        //with the plugin being undefined if the name
        //did not have a plugin prefix.
        function splitPrefix(name) {
            var prefix,
                index = name ? name.indexOf('!') : -1;
            if (index > -1) {
                prefix = name.substring(0, index);
                name = name.substring(index + 1, name.length);
            }
            return [prefix, name];
        }

        /**
         * Creates a module mapping that includes plugin prefix, module
         * name, and path. If parentModuleMap is provided it will
         * also normalize the name via require.normalize()
         *
         * @param {String} name the module name
         * @param {String} [parentModuleMap] parent module map
         * for the module name, used to resolve relative names.
         * @param {Boolean} isNormalized: is the ID already normalized.
         * This is true if this call is done for a define() module ID.
         * @param {Boolean} applyMap: apply the map config to the ID.
         * Should only be true if this map is for a dependency.
         *
         * @returns {Object}
         */
        function makeModuleMap(name, parentModuleMap, isNormalized, applyMap) {
            var url, pluginModule, suffix, nameParts,
                prefix = null,
                parentName = parentModuleMap ? parentModuleMap.name : null,
                originalName = name,
                isDefine = true,
                normalizedName = '';

            //If no name, then it means it is a require call, generate an
            //internal name.
            if (!name) {
                isDefine = false;
                name = '_@r' + (requireCounter += 1);
            }

            nameParts = splitPrefix(name);
            prefix = nameParts[0];
            name = nameParts[1];

            if (prefix) {
                prefix = normalize(prefix, parentName, applyMap);
                pluginModule = getOwn(defined, prefix);
            }

            //Account for relative paths if there is a base name.
            if (name) {
                if (prefix) {
                    if (pluginModule && pluginModule.normalize) {
                        //Plugin is loaded, use its normalize method.
                        normalizedName = pluginModule.normalize(name, function (name) {
                            return normalize(name, parentName, applyMap);
                        });
                    } else {
                        normalizedName = normalize(name, parentName, applyMap);
                    }
                } else {
                    //A regular module.
                    normalizedName = normalize(name, parentName, applyMap);

                    //Normalized name may be a plugin ID due to map config
                    //application in normalize. The map config values must
                    //already be normalized, so do not need to redo that part.
                    nameParts = splitPrefix(normalizedName);
                    prefix = nameParts[0];
                    normalizedName = nameParts[1];
                    isNormalized = true;

                    url = context.nameToUrl(normalizedName);
                }
            }

            //If the id is a plugin id that cannot be determined if it needs
            //normalization, stamp it with a unique ID so two matching relative
            //ids that may conflict can be separate.
            suffix = prefix && !pluginModule && !isNormalized ?
                     '_unnormalized' + (unnormalizedCounter += 1) :
                     '';

            return {
                prefix: prefix,
                name: normalizedName,
                parentMap: parentModuleMap,
                unnormalized: !!suffix,
                url: url,
                originalName: originalName,
                isDefine: isDefine,
                id: (prefix ?
                        prefix + '!' + normalizedName :
                        normalizedName) + suffix
            };
        }

        function getModule(depMap) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (!mod) {
                mod = registry[id] = new context.Module(depMap);
            }

            return mod;
        }

        function on(depMap, name, fn) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (hasProp(defined, id) &&
                    (!mod || mod.defineEmitComplete)) {
                if (name === 'defined') {
                    fn(defined[id]);
                }
            } else {
                getModule(depMap).on(name, fn);
            }
        }

        function onError(err, errback) {
            var ids = err.requireModules,
                notified = false;

            if (errback) {
                errback(err);
            } else {
                each(ids, function (id) {
                    var mod = getOwn(registry, id);
                    if (mod) {
                        //Set error on module, so it skips timeout checks.
                        mod.error = err;
                        if (mod.events.error) {
                            notified = true;
                            mod.emit('error', err);
                        }
                    }
                });

                if (!notified) {
                    req.onError(err);
                }
            }
        }

        /**
         * Internal method to transfer globalQueue items to this context's
         * defQueue.
         */
        function takeGlobalQueue() {
            //Push all the globalDefQueue items into the context's defQueue
            if (globalDefQueue.length) {
                //Array splice in the values since the context code has a
                //local var ref to defQueue, so cannot just reassign the one
                //on context.
                apsp.apply(defQueue,
                           [defQueue.length - 1, 0].concat(globalDefQueue));
                globalDefQueue = [];
            }
        }

        handlers = {
            'require': function (mod) {
                if (mod.require) {
                    return mod.require;
                } else {
                    return (mod.require = context.makeRequire(mod.map));
                }
            },
            'exports': function (mod) {
                mod.usingExports = true;
                if (mod.map.isDefine) {
                    if (mod.exports) {
                        return mod.exports;
                    } else {
                        return (mod.exports = defined[mod.map.id] = {});
                    }
                }
            },
            'module': function (mod) {
                if (mod.module) {
                    return mod.module;
                } else {
                    return (mod.module = {
                        id: mod.map.id,
                        uri: mod.map.url,
                        config: function () {
                            return (config.config && getOwn(config.config, mod.map.id)) || {};
                        },
                        exports: defined[mod.map.id]
                    });
                }
            }
        };

        function cleanRegistry(id) {
            //Clean up machinery used for waiting modules.
            delete registry[id];
            delete enabledRegistry[id];
        }

        function breakCycle(mod, traced, processed) {
            var id = mod.map.id;

            if (mod.error) {
                mod.emit('error', mod.error);
            } else {
                traced[id] = true;
                each(mod.depMaps, function (depMap, i) {
                    var depId = depMap.id,
                        dep = getOwn(registry, depId);

                    //Only force things that have not completed
                    //being defined, so still in the registry,
                    //and only if it has not been matched up
                    //in the module already.
                    if (dep && !mod.depMatched[i] && !processed[depId]) {
                        if (getOwn(traced, depId)) {
                            mod.defineDep(i, defined[depId]);
                            mod.check(); //pass false?
                        } else {
                            breakCycle(dep, traced, processed);
                        }
                    }
                });
                processed[id] = true;
            }
        }

        function checkLoaded() {
            var map, modId, err, usingPathFallback,
                waitInterval = config.waitSeconds * 1000,
                //It is possible to disable the wait interval by using waitSeconds of 0.
                expired = waitInterval && (context.startTime + waitInterval) < new Date().getTime(),
                noLoads = [],
                reqCalls = [],
                stillLoading = false,
                needCycleCheck = true;

            //Do not bother if this call was a result of a cycle break.
            if (inCheckLoaded) {
                return;
            }

            inCheckLoaded = true;

            //Figure out the state of all the modules.
            eachProp(enabledRegistry, function (mod) {
                map = mod.map;
                modId = map.id;

                //Skip things that are not enabled or in error state.
                if (!mod.enabled) {
                    return;
                }

                if (!map.isDefine) {
                    reqCalls.push(mod);
                }

                if (!mod.error) {
                    //If the module should be executed, and it has not
                    //been inited and time is up, remember it.
                    if (!mod.inited && expired) {
                        if (hasPathFallback(modId)) {
                            usingPathFallback = true;
                            stillLoading = true;
                        } else {
                            noLoads.push(modId);
                            removeScript(modId);
                        }
                    } else if (!mod.inited && mod.fetched && map.isDefine) {
                        stillLoading = true;
                        if (!map.prefix) {
                            //No reason to keep looking for unfinished
                            //loading. If the only stillLoading is a
                            //plugin resource though, keep going,
                            //because it may be that a plugin resource
                            //is waiting on a non-plugin cycle.
                            return (needCycleCheck = false);
                        }
                    }
                }
            });

            if (expired && noLoads.length) {
                //If wait time expired, throw error of unloaded modules.
                err = makeError('timeout', 'Load timeout for modules: ' + noLoads, null, noLoads);
                err.contextName = context.contextName;
                return onError(err);
            }

            //Not expired, check for a cycle.
            if (needCycleCheck) {
                each(reqCalls, function (mod) {
                    breakCycle(mod, {}, {});
                });
            }

            //If still waiting on loads, and the waiting load is something
            //other than a plugin resource, or there are still outstanding
            //scripts, then just try back later.
            if ((!expired || usingPathFallback) && stillLoading) {
                //Something is still waiting to load. Wait for it, but only
                //if a timeout is not already in effect.
                if ((isBrowser || isWebWorker) && !checkLoadedTimeoutId) {
                    checkLoadedTimeoutId = setTimeout(function () {
                        checkLoadedTimeoutId = 0;
                        checkLoaded();
                    }, 50);
                }
            }

            inCheckLoaded = false;
        }

        Module = function (map) {
            this.events = getOwn(undefEvents, map.id) || {};
            this.map = map;
            this.shim = getOwn(config.shim, map.id);
            this.depExports = [];
            this.depMaps = [];
            this.depMatched = [];
            this.pluginMaps = {};
            this.depCount = 0;

            /* this.exports this.factory
               this.depMaps = [],
               this.enabled, this.fetched
            */
        };

        Module.prototype = {
            init: function (depMaps, factory, errback, options) {
                options = options || {};

                //Do not do more inits if already done. Can happen if there
                //are multiple define calls for the same module. That is not
                //a normal, common case, but it is also not unexpected.
                if (this.inited) {
                    return;
                }

                this.factory = factory;

                if (errback) {
                    //Register for errors on this module.
                    this.on('error', errback);
                } else if (this.events.error) {
                    //If no errback already, but there are error listeners
                    //on this module, set up an errback to pass to the deps.
                    errback = bind(this, function (err) {
                        this.emit('error', err);
                    });
                }

                //Do a copy of the dependency array, so that
                //source inputs are not modified. For example
                //"shim" deps are passed in here directly, and
                //doing a direct modification of the depMaps array
                //would affect that config.
                this.depMaps = depMaps && depMaps.slice(0);

                this.errback = errback;

                //Indicate this module has be initialized
                this.inited = true;

                this.ignore = options.ignore;

                //Could have option to init this module in enabled mode,
                //or could have been previously marked as enabled. However,
                //the dependencies are not known until init is called. So
                //if enabled previously, now trigger dependencies as enabled.
                if (options.enabled || this.enabled) {
                    //Enable this module and dependencies.
                    //Will call this.check()
                    this.enable();
                } else {
                    this.check();
                }
            },

            defineDep: function (i, depExports) {
                //Because of cycles, defined callback for a given
                //export can be called more than once.
                if (!this.depMatched[i]) {
                    this.depMatched[i] = true;
                    this.depCount -= 1;
                    this.depExports[i] = depExports;
                }
            },

            fetch: function () {
                if (this.fetched) {
                    return;
                }
                this.fetched = true;

                context.startTime = (new Date()).getTime();

                var map = this.map;

                //If the manager is for a plugin managed resource,
                //ask the plugin to load it now.
                if (this.shim) {
                    context.makeRequire(this.map, {
                        enableBuildCallback: true
                    })(this.shim.deps || [], bind(this, function () {
                        return map.prefix ? this.callPlugin() : this.load();
                    }));
                } else {
                    //Regular dependency.
                    return map.prefix ? this.callPlugin() : this.load();
                }
            },

            load: function () {
                var url = this.map.url;

                //Regular dependency.
                if (!urlFetched[url]) {
                    urlFetched[url] = true;
                    context.load(this.map.id, url);
                }
            },

            /**
             * Checks if the module is ready to define itself, and if so,
             * define it.
             */
            check: function () {
                if (!this.enabled || this.enabling) {
                    return;
                }

                var err, cjsModule,
                    id = this.map.id,
                    depExports = this.depExports,
                    exports = this.exports,
                    factory = this.factory;

                if (!this.inited) {
                    this.fetch();
                } else if (this.error) {
                    this.emit('error', this.error);
                } else if (!this.defining) {
                    //The factory could trigger another require call
                    //that would result in checking this module to
                    //define itself again. If already in the process
                    //of doing that, skip this work.
                    this.defining = true;

                    if (this.depCount < 1 && !this.defined) {
                        if (isFunction(factory)) {
                            //If there is an error listener, favor passing
                            //to that instead of throwing an error.
                            if (this.events.error) {
                                try {
                                    exports = context.execCb(id, factory, depExports, exports);
                                } catch (e) {
                                    err = e;
                                }
                            } else {
                                exports = context.execCb(id, factory, depExports, exports);
                            }

                            if (this.map.isDefine) {
                                //If setting exports via 'module' is in play,
                                //favor that over return value and exports. After that,
                                //favor a non-undefined return value over exports use.
                                cjsModule = this.module;
                                if (cjsModule &&
                                        cjsModule.exports !== undefined &&
                                        //Make sure it is not already the exports value
                                        cjsModule.exports !== this.exports) {
                                    exports = cjsModule.exports;
                                } else if (exports === undefined && this.usingExports) {
                                    //exports already set the defined value.
                                    exports = this.exports;
                                }
                            }

                            if (err) {
                                err.requireMap = this.map;
                                err.requireModules = [this.map.id];
                                err.requireType = 'define';
                                return onError((this.error = err));
                            }

                        } else {
                            //Just a literal value
                            exports = factory;
                        }

                        this.exports = exports;

                        if (this.map.isDefine && !this.ignore) {
                            defined[id] = exports;

                            if (req.onResourceLoad) {
                                req.onResourceLoad(context, this.map, this.depMaps);
                            }
                        }

                        //Clean up
                        cleanRegistry(id);

                        this.defined = true;
                    }

                    //Finished the define stage. Allow calling check again
                    //to allow define notifications below in the case of a
                    //cycle.
                    this.defining = false;

                    if (this.defined && !this.defineEmitted) {
                        this.defineEmitted = true;
                        this.emit('defined', this.exports);
                        this.defineEmitComplete = true;
                    }

                }
            },

            callPlugin: function () {
                var map = this.map,
                    id = map.id,
                    //Map already normalized the prefix.
                    pluginMap = makeModuleMap(map.prefix);

                //Mark this as a dependency for this plugin, so it
                //can be traced for cycles.
                this.depMaps.push(pluginMap);

                on(pluginMap, 'defined', bind(this, function (plugin) {
                    var load, normalizedMap, normalizedMod,
                        name = this.map.name,
                        parentName = this.map.parentMap ? this.map.parentMap.name : null,
                        localRequire = context.makeRequire(map.parentMap, {
                            enableBuildCallback: true
                        });

                    //If current map is not normalized, wait for that
                    //normalized name to load instead of continuing.
                    if (this.map.unnormalized) {
                        //Normalize the ID if the plugin allows it.
                        if (plugin.normalize) {
                            name = plugin.normalize(name, function (name) {
                                return normalize(name, parentName, true);
                            }) || '';
                        }

                        //prefix and name should already be normalized, no need
                        //for applying map config again either.
                        normalizedMap = makeModuleMap(map.prefix + '!' + name,
                                                      this.map.parentMap);
                        on(normalizedMap,
                            'defined', bind(this, function (value) {
                                this.init([], function () { return value; }, null, {
                                    enabled: true,
                                    ignore: true
                                });
                            }));

                        normalizedMod = getOwn(registry, normalizedMap.id);
                        if (normalizedMod) {
                            //Mark this as a dependency for this plugin, so it
                            //can be traced for cycles.
                            this.depMaps.push(normalizedMap);

                            if (this.events.error) {
                                normalizedMod.on('error', bind(this, function (err) {
                                    this.emit('error', err);
                                }));
                            }
                            normalizedMod.enable();
                        }

                        return;
                    }

                    load = bind(this, function (value) {
                        this.init([], function () { return value; }, null, {
                            enabled: true
                        });
                    });

                    load.error = bind(this, function (err) {
                        this.inited = true;
                        this.error = err;
                        err.requireModules = [id];

                        //Remove temp unnormalized modules for this module,
                        //since they will never be resolved otherwise now.
                        eachProp(registry, function (mod) {
                            if (mod.map.id.indexOf(id + '_unnormalized') === 0) {
                                cleanRegistry(mod.map.id);
                            }
                        });

                        onError(err);
                    });

                    //Allow plugins to load other code without having to know the
                    //context or how to 'complete' the load.
                    load.fromText = bind(this, function (text, textAlt) {
                        /*jslint evil: true */
                        var moduleName = map.name,
                            moduleMap = makeModuleMap(moduleName),
                            hasInteractive = useInteractive;

                        //As of 2.1.0, support just passing the text, to reinforce
                        //fromText only being called once per resource. Still
                        //support old style of passing moduleName but discard
                        //that moduleName in favor of the internal ref.
                        if (textAlt) {
                            text = textAlt;
                        }

                        //Turn off interactive script matching for IE for any define
                        //calls in the text, then turn it back on at the end.
                        if (hasInteractive) {
                            useInteractive = false;
                        }

                        //Prime the system by creating a module instance for
                        //it.
                        getModule(moduleMap);

                        //Transfer any config to this other module.
                        if (hasProp(config.config, id)) {
                            config.config[moduleName] = config.config[id];
                        }

                        try {
                            req.exec(text);
                        } catch (e) {
                            return onError(makeError('fromtexteval',
                                             'fromText eval for ' + id +
                                            ' failed: ' + e,
                                             e,
                                             [id]));
                        }

                        if (hasInteractive) {
                            useInteractive = true;
                        }

                        //Mark this as a dependency for the plugin
                        //resource
                        this.depMaps.push(moduleMap);

                        //Support anonymous modules.
                        context.completeLoad(moduleName);

                        //Bind the value of that module to the value for this
                        //resource ID.
                        localRequire([moduleName], load);
                    });

                    //Use parentName here since the plugin's name is not reliable,
                    //could be some weird string with no path that actually wants to
                    //reference the parentName's path.
                    plugin.load(map.name, localRequire, load, config);
                }));

                context.enable(pluginMap, this);
                this.pluginMaps[pluginMap.id] = pluginMap;
            },

            enable: function () {
                enabledRegistry[this.map.id] = this;
                this.enabled = true;

                //Set flag mentioning that the module is enabling,
                //so that immediate calls to the defined callbacks
                //for dependencies do not trigger inadvertent load
                //with the depCount still being zero.
                this.enabling = true;

                //Enable each dependency
                each(this.depMaps, bind(this, function (depMap, i) {
                    var id, mod, handler;

                    if (typeof depMap === 'string') {
                        //Dependency needs to be converted to a depMap
                        //and wired up to this module.
                        depMap = makeModuleMap(depMap,
                                               (this.map.isDefine ? this.map : this.map.parentMap),
                                               false,
                                               !this.skipMap);
                        this.depMaps[i] = depMap;

                        handler = getOwn(handlers, depMap.id);

                        if (handler) {
                            this.depExports[i] = handler(this);
                            return;
                        }

                        this.depCount += 1;

                        on(depMap, 'defined', bind(this, function (depExports) {
                            this.defineDep(i, depExports);
                            this.check();
                        }));

                        if (this.errback) {
                            on(depMap, 'error', this.errback);
                        }
                    }

                    id = depMap.id;
                    mod = registry[id];

                    //Skip special modules like 'require', 'exports', 'module'
                    //Also, don't call enable if it is already enabled,
                    //important in circular dependency cases.
                    if (!hasProp(handlers, id) && mod && !mod.enabled) {
                        context.enable(depMap, this);
                    }
                }));

                //Enable each plugin that is used in
                //a dependency
                eachProp(this.pluginMaps, bind(this, function (pluginMap) {
                    var mod = getOwn(registry, pluginMap.id);
                    if (mod && !mod.enabled) {
                        context.enable(pluginMap, this);
                    }
                }));

                this.enabling = false;

                this.check();
            },

            on: function (name, cb) {
                var cbs = this.events[name];
                if (!cbs) {
                    cbs = this.events[name] = [];
                }
                cbs.push(cb);
            },

            emit: function (name, evt) {
                each(this.events[name], function (cb) {
                    cb(evt);
                });
                if (name === 'error') {
                    //Now that the error handler was triggered, remove
                    //the listeners, since this broken Module instance
                    //can stay around for a while in the registry.
                    delete this.events[name];
                }
            }
        };

        function callGetModule(args) {
            //Skip modules already defined.
            if (!hasProp(defined, args[0])) {
                getModule(makeModuleMap(args[0], null, true)).init(args[1], args[2]);
            }
        }

        function removeListener(node, func, name, ieName) {
            //Favor detachEvent because of IE9
            //issue, see attachEvent/addEventListener comment elsewhere
            //in this file.
            if (node.detachEvent && !isOpera) {
                //Probably IE. If not it will throw an error, which will be
                //useful to know.
                if (ieName) {
                    node.detachEvent(ieName, func);
                }
            } else {
                node.removeEventListener(name, func, false);
            }
        }

        /**
         * Given an event from a script node, get the requirejs info from it,
         * and then removes the event listeners on the node.
         * @param {Event} evt
         * @returns {Object}
         */
        function getScriptData(evt) {
            //Using currentTarget instead of target for Firefox 2.0's sake. Not
            //all old browsers will be supported, but this one was easy enough
            //to support and still makes sense.
            var node = evt.currentTarget || evt.srcElement;

            //Remove the listeners once here.
            removeListener(node, context.onScriptLoad, 'load', 'onreadystatechange');
            removeListener(node, context.onScriptError, 'error');

            return {
                node: node,
                id: node && node.getAttribute('data-requiremodule')
            };
        }

        function intakeDefines() {
            var args;

            //Any defined modules in the global queue, intake them now.
            takeGlobalQueue();

            //Make sure any remaining defQueue items get properly processed.
            while (defQueue.length) {
                args = defQueue.shift();
                if (args[0] === null) {
                    return onError(makeError('mismatch', 'Mismatched anonymous define() module: ' + args[args.length - 1]));
                } else {
                    //args are id, deps, factory. Should be normalized by the
                    //define() function.
                    callGetModule(args);
                }
            }
        }

        context = {
            config: config,
            contextName: contextName,
            registry: registry,
            defined: defined,
            urlFetched: urlFetched,
            defQueue: defQueue,
            Module: Module,
            makeModuleMap: makeModuleMap,
            nextTick: req.nextTick,
            onError: onError,

            /**
             * Set a configuration for the context.
             * @param {Object} cfg config object to integrate.
             */
            configure: function (cfg) {
                //Make sure the baseUrl ends in a slash.
                if (cfg.baseUrl) {
                    if (cfg.baseUrl.charAt(cfg.baseUrl.length - 1) !== '/') {
                        cfg.baseUrl += '/';
                    }
                }

                //Save off the paths and packages since they require special processing,
                //they are additive.
                var pkgs = config.pkgs,
                    shim = config.shim,
                    objs = {
                        paths: true,
                        config: true,
                        map: true
                    };

                eachProp(cfg, function (value, prop) {
                    if (objs[prop]) {
                        if (prop === 'map') {
                            if (!config.map) {
                                config.map = {};
                            }
                            mixin(config[prop], value, true, true);
                        } else {
                            mixin(config[prop], value, true);
                        }
                    } else {
                        config[prop] = value;
                    }
                });

                //Merge shim
                if (cfg.shim) {
                    eachProp(cfg.shim, function (value, id) {
                        //Normalize the structure
                        if (isArray(value)) {
                            value = {
                                deps: value
                            };
                        }
                        if ((value.exports || value.init) && !value.exportsFn) {
                            value.exportsFn = context.makeShimExports(value);
                        }
                        shim[id] = value;
                    });
                    config.shim = shim;
                }

                //Adjust packages if necessary.
                if (cfg.packages) {
                    each(cfg.packages, function (pkgObj) {
                        var location;

                        pkgObj = typeof pkgObj === 'string' ? { name: pkgObj } : pkgObj;
                        location = pkgObj.location;

                        //Create a brand new object on pkgs, since currentPackages can
                        //be passed in again, and config.pkgs is the internal transformed
                        //state for all package configs.
                        pkgs[pkgObj.name] = {
                            name: pkgObj.name,
                            location: location || pkgObj.name,
                            //Remove leading dot in main, so main paths are normalized,
                            //and remove any trailing .js, since different package
                            //envs have different conventions: some use a module name,
                            //some use a file name.
                            main: (pkgObj.main || 'main')
                                  .replace(currDirRegExp, '')
                                  .replace(jsSuffixRegExp, '')
                        };
                    });

                    //Done with modifications, assing packages back to context config
                    config.pkgs = pkgs;
                }

                //If there are any "waiting to execute" modules in the registry,
                //update the maps for them, since their info, like URLs to load,
                //may have changed.
                eachProp(registry, function (mod, id) {
                    //If module already has init called, since it is too
                    //late to modify them, and ignore unnormalized ones
                    //since they are transient.
                    if (!mod.inited && !mod.map.unnormalized) {
                        mod.map = makeModuleMap(id);
                    }
                });

                //If a deps array or a config callback is specified, then call
                //require with those args. This is useful when require is defined as a
                //config object before require.js is loaded.
                if (cfg.deps || cfg.callback) {
                    context.require(cfg.deps || [], cfg.callback);
                }
            },

            makeShimExports: function (value) {
                function fn() {
                    var ret;
                    if (value.init) {
                        ret = value.init.apply(global, arguments);
                    }
                    return ret || (value.exports && getGlobal(value.exports));
                }
                return fn;
            },

            makeRequire: function (relMap, options) {
                options = options || {};

                function localRequire(deps, callback, errback) {
                    var id, map, requireMod;

                    if (options.enableBuildCallback && callback && isFunction(callback)) {
                        callback.__requireJsBuild = true;
                    }

                    if (typeof deps === 'string') {
                        if (isFunction(callback)) {
                            //Invalid call
                            return onError(makeError('requireargs', 'Invalid require call'), errback);
                        }

                        //If require|exports|module are requested, get the
                        //value for them from the special handlers. Caveat:
                        //this only works while module is being defined.
                        if (relMap && hasProp(handlers, deps)) {
                            return handlers[deps](registry[relMap.id]);
                        }

                        //Synchronous access to one module. If require.get is
                        //available (as in the Node adapter), prefer that.
                        if (req.get) {
                            return req.get(context, deps, relMap, localRequire);
                        }

                        //Normalize module name, if it contains . or ..
                        map = makeModuleMap(deps, relMap, false, true);
                        id = map.id;

                        if (!hasProp(defined, id)) {
                            return onError(makeError('notloaded', 'Module name "' +
                                        id +
                                        '" has not been loaded yet for context: ' +
                                        contextName +
                                        (relMap ? '' : '. Use require([])')));
                        }
                        return defined[id];
                    }

                    //Grab defines waiting in the global queue.
                    intakeDefines();

                    //Mark all the dependencies as needing to be loaded.
                    context.nextTick(function () {
                        //Some defines could have been added since the
                        //require call, collect them.
                        intakeDefines();

                        requireMod = getModule(makeModuleMap(null, relMap));

                        //Store if map config should be applied to this require
                        //call for dependencies.
                        requireMod.skipMap = options.skipMap;

                        requireMod.init(deps, callback, errback, {
                            enabled: true
                        });

                        checkLoaded();
                    });

                    return localRequire;
                }

                mixin(localRequire, {
                    isBrowser: isBrowser,

                    /**
                     * Converts a module name + .extension into an URL path.
                     * *Requires* the use of a module name. It does not support using
                     * plain URLs like nameToUrl.
                     */
                    toUrl: function (moduleNamePlusExt) {
                        var ext,
                            index = moduleNamePlusExt.lastIndexOf('.'),
                            segment = moduleNamePlusExt.split('/')[0],
                            isRelative = segment === '.' || segment === '..';

                        //Have a file extension alias, and it is not the
                        //dots from a relative path.
                        if (index !== -1 && (!isRelative || index > 1)) {
                            ext = moduleNamePlusExt.substring(index, moduleNamePlusExt.length);
                            moduleNamePlusExt = moduleNamePlusExt.substring(0, index);
                        }

                        return context.nameToUrl(normalize(moduleNamePlusExt,
                                                relMap && relMap.id, true), ext,  true);
                    },

                    defined: function (id) {
                        return hasProp(defined, makeModuleMap(id, relMap, false, true).id);
                    },

                    specified: function (id) {
                        id = makeModuleMap(id, relMap, false, true).id;
                        return hasProp(defined, id) || hasProp(registry, id);
                    }
                });

                //Only allow undef on top level require calls
                if (!relMap) {
                    localRequire.undef = function (id) {
                        //Bind any waiting define() calls to this context,
                        //fix for #408
                        takeGlobalQueue();

                        var map = makeModuleMap(id, relMap, true),
                            mod = getOwn(registry, id);

                        delete defined[id];
                        delete urlFetched[map.url];
                        delete undefEvents[id];

                        if (mod) {
                            //Hold on to listeners in case the
                            //module will be attempted to be reloaded
                            //using a different config.
                            if (mod.events.defined) {
                                undefEvents[id] = mod.events;
                            }

                            cleanRegistry(id);
                        }
                    };
                }

                return localRequire;
            },

            /**
             * Called to enable a module if it is still in the registry
             * awaiting enablement. A second arg, parent, the parent module,
             * is passed in for context, when this method is overriden by
             * the optimizer. Not shown here to keep code compact.
             */
            enable: function (depMap) {
                var mod = getOwn(registry, depMap.id);
                if (mod) {
                    getModule(depMap).enable();
                }
            },

            /**
             * Internal method used by environment adapters to complete a load event.
             * A load event could be a script load or just a load pass from a synchronous
             * load call.
             * @param {String} moduleName the name of the module to potentially complete.
             */
            completeLoad: function (moduleName) {
                var found, args, mod,
                    shim = getOwn(config.shim, moduleName) || {},
                    shExports = shim.exports;

                takeGlobalQueue();

                while (defQueue.length) {
                    args = defQueue.shift();
                    if (args[0] === null) {
                        args[0] = moduleName;
                        //If already found an anonymous module and bound it
                        //to this name, then this is some other anon module
                        //waiting for its completeLoad to fire.
                        if (found) {
                            break;
                        }
                        found = true;
                    } else if (args[0] === moduleName) {
                        //Found matching define call for this script!
                        found = true;
                    }

                    callGetModule(args);
                }

                //Do this after the cycle of callGetModule in case the result
                //of those calls/init calls changes the registry.
                mod = getOwn(registry, moduleName);

                if (!found && !hasProp(defined, moduleName) && mod && !mod.inited) {
                    if (config.enforceDefine && (!shExports || !getGlobal(shExports))) {
                        if (hasPathFallback(moduleName)) {
                            return;
                        } else {
                            return onError(makeError('nodefine',
                                             'No define call for ' + moduleName,
                                             null,
                                             [moduleName]));
                        }
                    } else {
                        //A script that does not call define(), so just simulate
                        //the call for it.
                        callGetModule([moduleName, (shim.deps || []), shim.exportsFn]);
                    }
                }

                checkLoaded();
            },

            /**
             * Converts a module name to a file path. Supports cases where
             * moduleName may actually be just an URL.
             * Note that it **does not** call normalize on the moduleName,
             * it is assumed to have already been normalized. This is an
             * internal API, not a public one. Use toUrl for the public API.
             */
            nameToUrl: function (moduleName, ext, skipExt) {
                var paths, pkgs, pkg, pkgPath, syms, i, parentModule, url,
                    parentPath;

                //If a colon is in the URL, it indicates a protocol is used and it is just
                //an URL to a file, or if it starts with a slash, contains a query arg (i.e. ?)
                //or ends with .js, then assume the user meant to use an url and not a module id.
                //The slash is important for protocol-less URLs as well as full paths.
                if (req.jsExtRegExp.test(moduleName)) {
                    //Just a plain path, not module name lookup, so just return it.
                    //Add extension if it is included. This is a bit wonky, only non-.js things pass
                    //an extension, this method probably needs to be reworked.
                    url = moduleName + (ext || '');
                } else {
                    //A module that needs to be converted to a path.
                    paths = config.paths;
                    pkgs = config.pkgs;

                    syms = moduleName.split('/');
                    //For each module name segment, see if there is a path
                    //registered for it. Start with most specific name
                    //and work up from it.
                    for (i = syms.length; i > 0; i -= 1) {
                        parentModule = syms.slice(0, i).join('/');
                        pkg = getOwn(pkgs, parentModule);
                        parentPath = getOwn(paths, parentModule);
                        if (parentPath) {
                            //If an array, it means there are a few choices,
                            //Choose the one that is desired
                            if (isArray(parentPath)) {
                                parentPath = parentPath[0];
                            }
                            syms.splice(0, i, parentPath);
                            break;
                        } else if (pkg) {
                            //If module name is just the package name, then looking
                            //for the main module.
                            if (moduleName === pkg.name) {
                                pkgPath = pkg.location + '/' + pkg.main;
                            } else {
                                pkgPath = pkg.location;
                            }
                            syms.splice(0, i, pkgPath);
                            break;
                        }
                    }

                    //Join the path parts together, then figure out if baseUrl is needed.
                    url = syms.join('/');
                    url += (ext || (/\?/.test(url) || skipExt ? '' : '.js'));
                    url = (url.charAt(0) === '/' || url.match(/^[\w\+\.\-]+:/) ? '' : config.baseUrl) + url;
                }

                return config.urlArgs ? url +
                                        ((url.indexOf('?') === -1 ? '?' : '&') +
                                         config.urlArgs) : url;
            },

            //Delegates to req.load. Broken out as a separate function to
            //allow overriding in the optimizer.
            load: function (id, url) {
                req.load(context, id, url);
            },

            /**
             * Executes a module callack function. Broken out as a separate function
             * solely to allow the build system to sequence the files in the built
             * layer in the right sequence.
             *
             * @private
             */
            execCb: function (name, callback, args, exports) {
                return callback.apply(exports, args);
            },

            /**
             * callback for script loads, used to check status of loading.
             *
             * @param {Event} evt the event from the browser for the script
             * that was loaded.
             */
            onScriptLoad: function (evt) {
                //Using currentTarget instead of target for Firefox 2.0's sake. Not
                //all old browsers will be supported, but this one was easy enough
                //to support and still makes sense.
                if (evt.type === 'load' ||
                        (readyRegExp.test((evt.currentTarget || evt.srcElement).readyState))) {
                    //Reset interactive script so a script node is not held onto for
                    //to long.
                    interactiveScript = null;

                    //Pull out the name of the module and the context.
                    var data = getScriptData(evt);
                    context.completeLoad(data.id);
                }
            },

            /**
             * Callback for script errors.
             */
            onScriptError: function (evt) {
                var data = getScriptData(evt);
                if (!hasPathFallback(data.id)) {
                    return onError(makeError('scripterror', 'Script error', evt, [data.id]));
                }
            }
        };

        context.require = context.makeRequire();
        return context;
    }

    /**
     * Main entry point.
     *
     * If the only argument to require is a string, then the module that
     * is represented by that string is fetched for the appropriate context.
     *
     * If the first argument is an array, then it will be treated as an array
     * of dependency string names to fetch. An optional function callback can
     * be specified to execute when all of those dependencies are available.
     *
     * Make a local req variable to help Caja compliance (it assumes things
     * on a require that are not standardized), and to give a short
     * name for minification/local scope use.
     */
    req = requirejs = function (deps, callback, errback, optional) {

        //Find the right context, use default
        var context, config,
            contextName = defContextName;

        // Determine if have config object in the call.
        if (!isArray(deps) && typeof deps !== 'string') {
            // deps is a config object
            config = deps;
            if (isArray(callback)) {
                // Adjust args if there are dependencies
                deps = callback;
                callback = errback;
                errback = optional;
            } else {
                deps = [];
            }
        }

        if (config && config.context) {
            contextName = config.context;
        }

        context = getOwn(contexts, contextName);
        if (!context) {
            context = contexts[contextName] = req.s.newContext(contextName);
        }

        if (config) {
            context.configure(config);
        }

        return context.require(deps, callback, errback);
    };

    /**
     * Support require.config() to make it easier to cooperate with other
     * AMD loaders on globally agreed names.
     */
    req.config = function (config) {
        return req(config);
    };

    /**
     * Execute something after the current tick
     * of the event loop. Override for other envs
     * that have a better solution than setTimeout.
     * @param  {Function} fn function to execute later.
     */
    req.nextTick = typeof setTimeout !== 'undefined' ? function (fn) {
        setTimeout(fn, 4);
    } : function (fn) { fn(); };

    /**
     * Export require as a global, but only if it does not already exist.
     */
    if (!require) {
        require = req;
    }

    req.version = version;

    //Used to filter out dependencies that are already paths.
    req.jsExtRegExp = /^\/|:|\?|\.js$/;
    req.isBrowser = isBrowser;
    s = req.s = {
        contexts: contexts,
        newContext: newContext
    };

    //Create default context.
    req({});

    //Exports some context-sensitive methods on global require.
    each([
        'toUrl',
        'undef',
        'defined',
        'specified'
    ], function (prop) {
        //Reference from contexts instead of early binding to default context,
        //so that during builds, the latest instance of the default context
        //with its config gets used.
        req[prop] = function () {
            var ctx = contexts[defContextName];
            return ctx.require[prop].apply(ctx, arguments);
        };
    });

    if (isBrowser) {
        // head = s.head = document.getElementsByTagName('head')[0];
        // //If BASE tag is in play, using appendChild is a problem for IE6.
        // //When that browser dies, this can be removed. Details in this jQuery bug:
        // //http://dev.jquery.com/ticket/2709
        // baseElement = document.getElementsByTagName('base')[0];
        // if (baseElement) {
        //     head = s.head = baseElement.parentNode;
        // }
    }

    /**
     * Any errors that require explicitly generates will be passed to this
     * function. Intercept/override it if you want custom error handling.
     * @param {Error} err the error object.
     */
    req.onError = function (err) {
        throw err;
    };

    /**
     * Does the request to load a module for the browser case.
     * Make this a separate function to allow other environments
     * to override it.
     *
     * @param {Object} context the require context to find state.
     * @param {String} moduleName the name of the module.
     * @param {Object} url the URL to the module.
     */
    req.load = function (context, moduleName, url) {
        var config = (context && context.config) || {},
            node;
        if (isBrowser) {
            //In the browser so use a script tag
            node = config.xhtml ?
                    document.createElementNS('http://www.w3.org/1999/xhtml', 'html:script') :
                    document.createElement('script');
            node.type = config.scriptType || 'text/javascript';
            node.charset = 'utf-8';
            node.async = true;

            node.setAttribute('data-requirecontext', context.contextName);
            node.setAttribute('data-requiremodule', moduleName);

            //Set up load listener. Test attachEvent first because IE9 has
            //a subtle issue in its addEventListener and script onload firings
            //that do not match the behavior of all other browsers with
            //addEventListener support, which fire the onload event for a
            //script right after the script execution. See:
            //https://connect.microsoft.com/IE/feedback/details/648057/script-onload-event-is-not-fired-immediately-after-script-execution
            //UNFORTUNATELY Opera implements attachEvent but does not follow the script
            //script execution mode.
            if (node.attachEvent &&
                    //Check if node.attachEvent is artificially added by custom script or
                    //natively supported by browser
                    //read https://github.com/jrburke/requirejs/issues/187
                    //if we can NOT find [native code] then it must NOT natively supported.
                    //in IE8, node.attachEvent does not have toString()
                    //Note the test for "[native code" with no closing brace, see:
                    //https://github.com/jrburke/requirejs/issues/273
                    !(node.attachEvent.toString && node.attachEvent.toString().indexOf('[native code') < 0) &&
                    !isOpera) {
                //Probably IE. IE (at least 6-8) do not fire
                //script onload right after executing the script, so
                //we cannot tie the anonymous define call to a name.
                //However, IE reports the script as being in 'interactive'
                //readyState at the time of the define call.
                useInteractive = true;

                node.attachEvent('onreadystatechange', context.onScriptLoad);
                //It would be great to add an error handler here to catch
                //404s in IE9+. However, onreadystatechange will fire before
                //the error handler, so that does not help. If addEventListener
                //is used, then IE will fire error before load, but we cannot
                //use that pathway given the connect.microsoft.com issue
                //mentioned above about not doing the 'script execute,
                //then fire the script load event listener before execute
                //next script' that other browsers do.
                //Best hope: IE10 fixes the issues,
                //and then destroys all installs of IE 6-9.
                //node.attachEvent('onerror', context.onScriptError);
            } else {
                node.addEventListener('load', context.onScriptLoad, false);
                node.addEventListener('error', context.onScriptError, false);
            }
            node.src = url;

            //For some cache cases in IE 6-8, the script executes before the end
            //of the appendChild execution, so to tie an anonymous define
            //call to the module name (which is stored on the node), hold on
            //to a reference to this node, but clear after the DOM insertion.
            currentlyAddingScript = node;
            if (baseElement) {
                head.insertBefore(node, baseElement);
            } else {
                head.appendChild(node);
            }
            currentlyAddingScript = null;

            return node;
        } else if (isWebWorker) {
            try {
                //In a web worker, use importScripts. This is not a very
                //efficient use of importScripts, importScripts will block until
                //its script is downloaded and evaluated. However, if web workers
                //are in play, the expectation that a build has been done so that
                //only one script needs to be loaded anyway. This may need to be
                //reevaluated if other use cases become common.
                importScripts(url);

                //Account for anonymous modules
                context.completeLoad(moduleName);
            } catch (e) {
                context.onError(makeError('importscripts',
                                'importScripts failed for ' +
                                    moduleName + ' at ' + url,
                                e,
                                [moduleName]));
            }
        }
    };

    function getInteractiveScript() {
        if (interactiveScript && interactiveScript.readyState === 'interactive') {
            return interactiveScript;
        }

        eachReverse(scripts(), function (script) {
            if (script.readyState === 'interactive') {
                return (interactiveScript = script);
            }
        });
        return interactiveScript;
    }

    //Look for a data-main script attribute, which could also adjust the baseUrl.
    if (isBrowser) {
        //Figure out baseUrl. Get it from the script tag with require.js in it.
        eachReverse(scripts(), function (script) {
            //Set the 'head' where we can append children by
            //using the script's parent.
            if (!head) {
                head = script.parentNode;
            }

            //Look for a data-main attribute to set main script for the page
            //to load. If it is there, the path to data main becomes the
            //baseUrl, if it is not already set.
            dataMain = script.getAttribute('data-main');
            if (dataMain) {
                //Set final baseUrl if there is not already an explicit one.
                if (!cfg.baseUrl) {
                    //Pull off the directory of data-main for use as the
                    //baseUrl.
                    src = dataMain.split('/');
                    mainScript = src.pop();
                    subPath = src.length ? src.join('/')  + '/' : './';

                    cfg.baseUrl = subPath;
                    dataMain = mainScript;
                }

                //Strip off any trailing .js since dataMain is now
                //like a module name.
                dataMain = dataMain.replace(jsSuffixRegExp, '');

                //Put the data-main script in the files to load.
                cfg.deps = cfg.deps ? cfg.deps.concat(dataMain) : [dataMain];

                return true;
            }
        });
    }

    /**
     * The function that handles definitions of modules. Differs from
     * require() in that a string for the module should be the first argument,
     * and the function to execute after dependencies are loaded should
     * return a value to define the module corresponding to the first argument's
     * name.
     */
    define = function (name, deps, callback) {
        var node, context;

        //Allow for anonymous modules
        if (typeof name !== 'string') {
            //Adjust args appropriately
            callback = deps;
            deps = name;
            name = null;
        }

        //This module may not have dependencies
        if (!isArray(deps)) {
            callback = deps;
            deps = [];
        }

        //If no name, and callback is a function, then figure out if it a
        //CommonJS thing with dependencies.
        if (!deps.length && isFunction(callback)) {
            //Remove comments from the callback string,
            //look for require calls, and pull them into the dependencies,
            //but only if there are function args.
            if (callback.length) {
                callback
                    .toString()
                    .replace(commentRegExp, '')
                    .replace(cjsRequireRegExp, function (match, dep) {
                        deps.push(dep);
                    });

                //May be a CommonJS thing even without require calls, but still
                //could use exports, and module. Avoid doing exports and module
                //work though if it just needs require.
                //REQUIRES the function to expect the CommonJS variables in the
                //order listed below.
                deps = (callback.length === 1 ? ['require'] : ['require', 'exports', 'module']).concat(deps);
            }
        }

        //If in IE 6-8 and hit an anonymous define() call, do the interactive
        //work.
        if (useInteractive) {
            node = currentlyAddingScript || getInteractiveScript();
            if (node) {
                if (!name) {
                    name = node.getAttribute('data-requiremodule');
                }
                context = contexts[node.getAttribute('data-requirecontext')];
            }
        }

        //Always save off evaluating the def call until the script onload handler.
        //This allows multiple modules to be in a file without prematurely
        //tracing dependencies, and allows for anonymous module support,
        //where the module name is not known until the script onload event
        //occurs. If no context, use the global queue, and get it processed
        //in the onscript load callback.
        (context ? context.defQueue : globalDefQueue).push([name, deps, callback]);
    };

    define.amd = {
        jQuery: true
    };


    /**
     * Executes the text. Normally just uses eval, but can be modified
     * to use a better, environment-specific call. Only used for transpiling
     * loader plugins, not for plain JS modules.
     * @param {String} text the text to execute/evaluate.
     */
    req.exec = function (text) {
        /*jslint evil: true */
        return eval(text);
    };

    //Set up with config info.
    req(cfg);
}(this));
define("bullet", ["canvas", "effects", "particles"], function(Canvas, effects, Particles) {
    function distance(p1, p2) {
        return Math.max(
                Math.abs(p1.X - p2.X),
                Math.abs(p1.Y - p2.Y)
            );
    }
    //TODO retire enemies argument
    var bullet = function(position, enemies, options) {
        if(!options) {
            options = {};
        }
        var particleSettings = effects.bullet();
        particleSettings.position = position;
        var trail = Particles(particleSettings);
        trail.on("death", function() {
            dead = true;
        });
        var lastPosition = {X: position.X, Y: position.Y};
        var start = Date.now();
        var speed = options.speed || 0.7;
        var dead = false;
        var dying = false;
        var damage = options.damage || 1;
        var range = options.range || 256;
        var baseY = position.Y;
        var baseX = position.X;
        var lastDraw = Date.now();
        var travelled = 0;
        var b = {
            type: "bullet",
            position: position,
            dirty: true,
            boundingbox: [-8, -8, 16, 16],
            die: function() {
                    //dead = true;
                    dying = true;
                    trail.kill();
            },
            draw: function(bb) {
                var now = Date.now();
                if(!dying) {
                    var distance = (now - lastDraw) * 0.5;                
                    position.X += distance * Math.cos(options.angle);
                    position.Y += distance * Math.sin(options.angle);
                    travelled += distance;                    
                }
                //Canvas.context.fillRect(position.X, position.Y, 8, 8);
                if(travelled > range) {
                    //dead = true;
                    trail.kill();
                }

                if(bb) {
                    Canvas.context.strokeStyle = "red";
                    Canvas.context.save();
                    Canvas.context.translate(position.X, position.Y);
                    Canvas.context.strokeRect.apply(Canvas.context, b.boundingbox);
                    Canvas.context.restore();
                }

                b.dirty = true;
                trail.draw();
                lastDraw = now;
                return dead;
            }
        };
        return b;
    };
    return bullet;
});
define("canvas", function() {
	var canvas = document.getElementsByTagName("canvas")[0];
	function Canvas(canvas) {
		canvas = canvas || document.createElement("canvas");
		var context = canvas.getContext("2d");
		var C = {
			element: canvas,
			context: context,
			imageData: function(data) {
				if(data) {
					context.putImageData(data, 0, 0);
				}
				return context.getImageData(0, 0, canvas.width, canvas.height);
			},
			create: function(size) {
				var newCanvas = Canvas();
				newCanvas.size(size);
				return newCanvas;
			},
			clone: function(empty) {
				var clone = Canvas();
				clone.size(C.size());
				if(!empty) {
					clone.context.drawImage(C.element, 0,  0);
				}
				return clone;
			},
			clear: function(color) {
				if(!color) {
					canvas.width = canvas.width;
				} else {
					context.save();
					context.fillStyle = color;
					context.fillRect(0, 0, canvas.width, canvas.height);
					context.restore();
				}
			},
			size: function(w, h) {
				if(w) {
					if(typeof(w) === "object") {
						canvas.width = w.W || w.width;
						canvas.height = w.H || w.height;
					} else {
						canvas.width = w;
						canvas.height = h;
					}
				}
				return { width: canvas.width, height: canvas.height };
			}
		};
		Object.defineProperty(C, "width", {
			get: function() { return canvas.width; },
			set: function(w) { canvas.width = w; }
		});
		Object.defineProperty(C, "height", {
			get: function() { return canvas.height; },
			set: function(h) { canvas.height = h; }
		});

		C.position = (function() {
            var x = 0,
                y = 0,
                parent = C.element;
            while(parent) {
                x += parent.offsetLeft;
                y += parent.offsetTop;
                parent = parent.parentElement;
            }
            return {X: x, Y: y};
        }());

		return C;
	}
	return Canvas(canvas);
});define("collisionbox", function() {
	var CollisionBox = function(data) {
		"use strict";
		var collisionbox = {
			dirty: false,
			die: function() {
				return false;
			},
			position: { X: data.x + data.width / 2, Y: data.y + data.height / 2 },
			draw: function() { return false; },
			boundingbox: [-(data.width / 2),
						  -(data.height / 2),
						  data.width,
						  data.height],
			type: "collisionbox"
		}
		return collisionbox;
	}
	return CollisionBox;
});define("container", function() {
	var Container = function() {
		var items = [];
		var container = {
			noncollider: true,
			count: function() {
				return items.length;
			},
			add: function(item) {
				items.push(item);
			},
			remove: function(item) {
				for(var i = items.length -1; i >= 0; --i) {
					if(items[i] === item) {
						items.splice(i, 1);
						break;
					}
				}
			},
			each: function(cb) {
				for(var i = 0; i < items.length; i++) {
					cb(items[i]);
				}
			},
			draw: function() {
				container.each(function(item) {
					item.draw();
				});
			}
		};
		return container;		
	};
	return Container;
});define("easing", function() {
	/* t=now b=start c=change d=duration*/
	return function (t, b, c, d) {
        if ((t/=d) < (1/2.75)) {
            return c*(7.5625*t*t) + b;
        } else if (t < (2/2.75)) {
            return c*(7.5625*(t-=(1.5/2.75))*t + .75) + b;
        } else if (t < (2.5/2.75)) {
            return c*(7.5625*(t-=(2.25/2.75))*t + .9375) + b;
        } else {
            return c*(7.5625*(t-=(2.625/2.75))*t + .984375) + b;
        }
    };
});define ("effects", {
	bullet: function() { 
		return {"position":{"X":0,"Y":0},"image":"particle","scale":{"min":0,"max":0.44115112872652074},"speed":{"min":0.01,"max":0.02},"ttl":{"min":0.43544820547712193,"max":893.3310356712045},"count":50};
	},
	explosion: function() {
		return {"position":{"X":0,"Y":0},"image":"particle","scale":{"min":0.5,"max":1},"speed":{"min":0.001,"max":0.1},"ttl":{"min":399,"max":400},"count":50, "systemTtl": 10};
	}
});(function() {
 	var events = {
        attach: function(obj) {
            var eventList = {},
                eventTarget = {
                    on: function(ev, f) {
                        if(!eventList[ev]) eventList[ev] = [];
                        eventList[ev].push(f);
                        return obj;
                    },
                    fire: function(ev, evobj) {
                        if(eventList[ev]) {
                            for(var i = 0; i < eventList[ev].length; i++) {
                                if(eventList[ev][i].call(obj, evobj)) {
                                    return;
                                }
                            }
                        }
                    },
                    remove: function(ev, f) {
                        if(!eventList[ev]) {
                            return;
                        }
                        for(var i = 0; i < eventList[ev].length; i++) {
                            if(eventList[ev][i] === f) {
                                eventList[ev].splice(i, 1);
                                break;
                            }
                        }
                    }
                };
            for(var prop in eventTarget) {
                obj[prop] = eventTarget[prop];
            }
        }
    };
    define("events", events);
}());
define("game",
        ["raf",
        "canvas",
        "stats.min"],
    function(raf, Canvas, Stats) {
    "strict mode";
    var stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.left = '0px';
    stats.domElement.style.top = '0px';

    document.body.appendChild( stats.domElement );

    var game = {
            run: function() {
                stats.begin();
                if(game.state) {
                    game.state.run();
                }
                raf.requestAnimationFrame.call(window, game.run);
                stats.end();
            }
        },
        state = null;

    Object.defineProperty(game, "state", {
        get: function() {
            return state;
        },
        set: function(newstate) {
            if(state) {
                state.clear(function() {
                    newstate.init();
                    state = newstate;
                });
            } else {
                newstate.init();
                state = newstate;
            }
        }
    });

    window.addEventListener("keyup", function(e) {
        if(game.state && game.state.keyup) {
            game.state.keyup(e.keyCode);
        }
        if(e.keyCode === 27) {
            game.state = game.paused;
        }
    });
    window.addEventListener("keydown", function(e) {
        if(game.state && game.state.keydown) {
            game.state.keydown(e.keyCode);
        }
    });

    window.addEventListener("mousemove", function(e) {
        if(game.state && game.state.mousemove) {
            var x = e.clientX - Canvas.position.X;
            var y = e.clientY - Canvas.position.Y;
            game.state.mousemove({X: x, Y: y});
        }
    });

    window.addEventListener("click", function(e) {
        if(game.state && game.state.click) {
            var x = e.clientX - Canvas.position.X;
            var y = e.clientY - Canvas.position.Y;
            game.state.click({X: x, Y: y});
        }
    });

    if(typeof(Clay) !== "undefined") {
        game.leaderboard = new Clay.Leaderboard({id: 675});
    }

    return game;
});define("gamepad", ["raf", "events"], function(raf, Events) {
	var buttonStates = [];
	var axisStates = [];
	var lastPad = null;
	var padID = null;
	var gamepad = {
		deadzone: 0.5,
		poll: function() {
			var i;
			var pad = navigator.webkitGetGamepads && navigator.webkitGetGamepads()[0];
			if(pad) {
				if(!padID) {
					padID = pad.id;
					console.log("gamepad: " + padID);
				}
				for(i = 0; i < pad.buttons.length; i++) {
					if(pad.buttons[i] !== 0) {
						gamepad.fire("button", { which: i, action: "down"});
						buttonStates[i] = true;
					} else {
						if(buttonStates[i]) {
							gamepad.fire("button", { which: i, action: "up"});
							buttonStates[i] = false;
						}
					}
				}
				for(i = 0; i < pad.axes.length; i++) {
					if(Math.abs(pad.axes[i]) > gamepad.deadzone) {
						gamepad.fire("axis", { which: i, value: pad.axes[i], action: "engage" });
					} else {
						if(Math.abs(axisStates[i]) > gamepad.deadzone) {
							gamepad.fire("axis", {which: i, value: pad.axes[i], action: "release"});
						}
					}
					axisStates[i] = pad.axes[i];
				}
				lastPad = pad;
			}
			raf.requestAnimationFrame.call(window, gamepad.poll);
		},
		A: 0,
		B: 1,
		X: 2,
		Y: 3
	};

	Events.attach(gamepad);
	gamepad.poll();

	return gamepad;
});define("keys", {
    BACKSPACE:8,
    TAB:9,
    ENTER:13,
    SHIFT:16,
    CTRL:17,
    ALT:18,
    PAUSE:19,
    CAPSLOCK:20,
    ESC:27,
    SPACE:32,
    PAGEUP:33,
    PAGEDOWN:34,
    END:35,
    HOME:36,
    LEFT:37,
    UP:38,
    RIGHT:39,
    DOWN:40,
    INSERT:45,
    DELETE:46,
    F1:112,
    F2:113,
    F3:114,
    F4:115,
    F5:116,
    F6:117,
    F7:118,
    F8:119,
    F9:120,
    F10:121,
    F11:122,
    F12:123,
    W: 87,
    A: 65,
    S: 83,
    D: 68,
    NUMLOCK:144,
    SCROLLLOCK:145
});/*jshint newcap:false, nonew:true */
/*global console */
require(["game",
        "canvas",
        "play",
        "resources",
        "menu",        
        "gamepad",
        "gui/modal",
        "gui/element",
        "gui/label",
        "gui/badge"
        ],
    function(
            game,
            Canvas,
            play,
            Resources,
            Menu,
            gamePad,
            Modal,
            Element,
            Label,
            Badge
            ) {
    "use strict";
    Canvas.size(800, 600);
    Canvas.clear("black");

    var playerStats = {};

    if(localStorage.playerStats) {
        playerStats = JSON.parse(localStorage.playerStats);
    }

    Resources.on("load", function() {
        console.log("loaded");
        document.getElementById("loading").style.display = "none";
        game.run();
    });

    Resources.load({
        "ships": "images/spaceships_1.png",
        "logo": "images/piratecargo.png",
        "bomb": "images/fire-bomb.png",
        "chest": "images/chest32.png",
        "sign": "images/sign32.png",
        "bigsign": "images/sign.png",
        "shield": "images/edged-shield.png",
        "doubleshot": "images/double-shot.png",
        "heal": "images/heal.png",
        "rocket": "images/rocket.png",
        "homing": "images/on-target.png",
        "star": "images/star.png",
        "particle": "images/particle.png",
        "gameover": "images/gameover.png",
        "winner": "images/winner.png",
        "bullets": "images/bullets.png",
        "badge": "images/ghost.png",
        "rose" : "images/rose.png",
        "grimreaper": "images/grim-reaper.png",
        "spacetiles": "maps/spacetiles.png",
        "select": "audio/select.wav",
        "explosion": "audio/explosion.ogg",
        "shoot": "audio/shoot.ogg",
        "pickup": "audio/pickup.ogg",
        "levelcomplete": "audio/levelcomplete.wav",
        "music": "audio/railjet.ogg"

        // "strange": "audio/strange.ogg",
        // "enemyshoot": "audio/enemyshoot.ogg",
        // "error": "audio/error.ogg"
    });

    var levels = [ "intro", "level1", "level2" ];
    var currentLevel = 0;
    var winScreen = Modal({ width: 400, height: 360 });
    winScreen.add(Label("Level Complete"));
    var retry = Label("replay", { position: {X: 40, Y: 320}, fontSize: 22});
    var cntinue = Label("continue", { position: {X: 360, Y: 320}, fontSize: 22});
    retry.on("click", function() {
        Resources.select.play();
        play.respawn();
        game.state = play;
    });
    cntinue.on("click", function() {
        console.log("continue ...");
        Resources.select.play();
        currentLevel++;
        if(currentLevel >= levels.length) {
            currentLevel = 0;
        }
        play.level = levels[currentLevel];
        play.respawn();
        game.state = play;
    });

    var badges = {
        ghost: Badge({
            position: { X: 30, Y: 80 },
            size: { width: 48, height: 48 },
            image: Resources.badge,
            title: "Ghost",
            description: "Finished level without being seen"
        }),
        pacifist: Badge({
            position: { X: 30, Y: 160 },
            size: { width: 48, height: 48 },
            image: Resources.rose,
            title: "Pacifist",
            description: "Finished level without killing anyone"
        }),
        butcher: Badge({
            position: { X: 30, Y: 240 },
            size: { width: 48, height: 48 },
            image: Resources.grimreaper,
            title: "Butcher",
            description: "Killed them all."
        })        
    };

    winScreen.add(retry);
    winScreen.add(cntinue);
    winScreen.add(badges.ghost);
    winScreen.add(badges.pacifist);
    winScreen.add(badges.butcher);
    var gameover = Menu(Canvas.element, [
            {
                label: "Restart",
                action: function() {
                    play.reset();
                    game.state = play;
                }
            },
            {
                label: "Menu",
                action: function() {
                    game.state = home;
                }
            }
        ], Resources.gameover);

    var winner = Menu(Canvas.element, [
            {
                label: "Restart",
                action: function() {
                    play.reset();
                    game.state = play;
                }
            },
            {
                label: "Menu",
                action: function() {
                    game.state = home;
                }
            }
        ], Resources.winner);

    var paused = Menu(Canvas.element, [
            {
                label: "Resume",
                action: function() {
                    Resources.select.play();
                    play.getWorld().pausetime = paused.lifetime;
                    game.state = play;
                }
            },
            {
                label: "Menu",
                action: function() {
                    Resources.select.play();
                    game.state = home;
                }
            }
        ]);
    var home = Menu(Canvas.element, [
            {
                label: "Play",
                action: function() {
                    play.respawn();
                    play.mode = "waves";
                    Resources.select.play();
                    game.state = play;                    
                }
            },
            {
                label: "Credits",
                action: function() {
                    Resources.select.play();
                    document.getElementById("credits").style.display = "block";
                }
            }
        ], Resources.logo);

    window.addEventListener("blur", function() {
        if(game.state == play) {
            game.state = paused;
        }
    });

    play.on("win", function(e) {
        badges.ghost.active = false;
        badges.pacifist.active = false;
        badges.butcher.active = false;
        for(var i = 0; i < e.badges.length; i++) {
            badges[e.badges[i]].active = true;
        }
        Resources.levelcomplete.play();
        game.state = winScreen;
    });

    // gamePad.on("axis", function(e) {
    //     if(e.which === 1) {
    //         if(e.action === "engage") {
    //             if(e.value < 0) {
    //                 down[keys.DOWN] = false;
    //                 down[keys.UP] = true;
    //             } else {
    //                 down[keys.UP] = false;
    //                 down[keys.DOWN] = true;
    //             }
    //         } else {
    //             down[keys.UP] = false;
    //             down[keys.DOWN] = false;
    //         }
    //     }
    //     if(e.which === 0) {
    //         if(e.action === "engage") {
    //             if(e.value < 0) {
    //                 down[keys.RIGHT] = false;
    //                 down[keys.LEFT] = true;
    //             } else {
    //                 down[keys.LEFT] = false;
    //                 down[keys.RIGHT] = true;
    //             }
    //         } else {
    //             down[keys.LEFT] = false;
    //             down[keys.RIGHT] = false;
    //         }
    //     }
    // });
    // gamePad.on("button", function(e) {
    //     if(e.action === "down") {
    //         if(e.which === 0) {
    //             down[keys.SPACE] = true;
    //         }
    //     }
    //     if(e.action === "up") {
    //         if(e.which === 0) {
    //             down[keys.SPACE] = false;
    //         }
    //     }
    // });
    game.paused = paused;
    game.state = home;
});
define("menu", ["easing"], function(easing) {
    var color = "rgba(0, 0, 0, 0.7)",
        width = 300,
        buffer = 80,
        duration = 500;


    function hit(index, pos) {
        var rect = {X: 10, Y: 10 + (index * 120), W: 280, H: 100};
        if (pos.X > rect.X &&
            pos.X < rect.X + rect.W &&
            pos.Y > rect.Y && pos.Y < rect.Y + rect.H) {
            return true;
        }
        return false;
    }
    return function(canvas, menu, splash) {
        var start = 0, from, to,
            position = {X: 0, Y: 0},
            context = canvas.getContext("2d"),
            splashX = 0;
        var paused = {
            font: "48px RapscallionRegular",
            click: function(mouse) {
                if(mouse.X < width) {
                    for(var i = 0; i < menu.length; i++) {
                        if(hit(i, mouse)) {
                            menu[i].action();
                        }
                    }
                }
            },
            run: function() {
                if(start === 0) return;
                var now = Date.now() - start,
                    sign = -1,
                    splashStart = canvas.width;
                if(splash && to < 0) {
                    sign = 1;
                    splashStart = canvas.width - splash.width;
                }
                if(now < duration) {
                    position.X = easing(now, from, to, duration) | 0;
                    if(splash) {
                        splashX = easing(now, splashStart, sign * splash.width, duration) | 0;
                    }
                } else {
                    position.X = from + to;
                    if(splash) {
                        splashX = canvas.width - splash.width;
                    }
                    if(to < 0 && paused.done) {
                        paused.done();
                    }
                }
                context.save();
                context.drawImage(paused.background, 0, 0);
                if(splash) {
                    context.drawImage(splash, splashX, canvas.height / 2 - splash.height / 2)
                }
                context.fillStyle = color;
                context.fillRect(position.X - buffer, position.Y, width + buffer, canvas.height);
                context.translate(position.X, position.Y);

                context.textBaseline = "middle";
                context.textAlign = "center";
                context.font = paused.font;
                for(var i = 0; i < menu.length; i++) {
                    var iconSpace = menu[i].icon ? 37 : 0;
                    if(menu[i].label) {
                        context.fillStyle = color;
                        //context.strokeRect(10, 10 + (i * 120), 280, 100);
                        context.fillStyle = "white";
                        context.fillText(menu[i].label, 10 + 140 + iconSpace, 10 + 50 + (i * 120));
                    }
                    if(menu[i].icon) {
                        context.drawImage(menu[i].icon, 0, 0, menu[i].icon.width, menu[i].icon.height, 37, 37 + (i * 120), 48, 48);
                    }
                }
                context.restore();
            },
            init: function() {
                paused.background = document.createElement("canvas");
                paused.background.width = canvas.width;
                paused.background.height = canvas.height;
                paused.background.getContext("2d").drawImage(canvas, 0, 0);

                start = Date.now();
                from = -width;
                to = width;
                position.X = from;
            },
            lifetime: function() {
                return Date.now() - start;
            },
            clear: function(cb) {
                paused.time = Date.now() - start;
                start = Date.now();
                from = 0;
                to = -width;
                position.X = from;
                paused.done = cb;
            }
        };
        return paused;
    };
});define("particles", ["canvas", "resources", "events"], function(Canvas, Resources, Events) {
	var Position = function(x, y) {
		return {X: x, Y: y};
	}

	Position.copy = function(position) {
		return {X: position.X, Y: position.Y};
	}

	function createParticle(options) {
		var dead = false;
		var particle = {
			then: Date.now(),
			birth: Date.now(),
			angle: 0,
			unborn: true,
			ttl: Math.random() * (options.ttl.max - options.ttl.min),
			reset: function(position) {
				if(particle.dead) {
					particle.unborn = true;
					return;
				}
				var now = Date.now();
				var direction = Math.random() * (2 * Math.PI);
				particle.position = Position.copy(options.position);
				particle.startPosition = Position.copy(options.position);
				particle.birth = now;
				particle.alpha = 1.0;
				particle.unborn = false;
				particle.then = now;
				particle.image = Resources[options.image];
				particle.direction = Position(Math.cos(direction), Math.sin(direction));
				particle.scale = Math.random() * (options.scale.max - options.scale.min) + options.scale.min;
				particle.speed = Math.random() * (options.speed.max - options.speed.min) + options.speed.min;
				particle.ttl = Math.random() * (options.ttl.max - options.ttl.min) + options.ttl.min
				//console.log(particle.direction);
			},
			die: function() {
				particle.dead = true;
			},
			update: function(position) {
				var now = Date.now();
				var life = now - particle.birth;
				if(life > particle.ttl) {
					particle.reset(options.position);
				} else {
					if(!particle.unborn) {
						var distance = life * particle.speed;
						//console.log(distance);
						particle.position.X = particle.startPosition.X + distance * particle.direction.X;
		                particle.position.Y = particle.startPosition.Y + distance * particle.direction.Y;					
		                particle.angle += 0.1;
		                particle.alpha = 1 - (life / particle.ttl);
		                //console.log(particle.startPosition);
		                // particle.scale -= 0.01;
		                // if(particle.scale < 0) particle.scale = 0;
		            }
				}
				particle.then = now;
			},
			draw: function() {
				if(!particle.unborn) {
	                Canvas.context.save();
	                //Canvas.context.globalCompositeOperation = "lighter";
	                Canvas.context.translate(particle.position.X, particle.position.Y);
	                Canvas.context.scale(particle.scale, particle.scale);
	                Canvas.context.rotate(particle.angle);
	                Canvas.context.globalAlpha = particle.alpha;
	                Canvas.context.drawImage(particle.image, -particle.image.width / 2, -particle.image.height / 2);                
	                Canvas.context.restore();								
				}
			}
		};
		return particle;
	}
	var particles = function(options) {
		var ttl = options.systemTtl || 0;
		var birth = Date.now();
		var position = {X: 100, Y:100};
		var angle = 1;
		// var options = {
		// 	position: position,
		// 	image: image,
		// 	scale: {min: 0.1, max: 0.4},
		// 	speed: {min: 0.01, max:0.04},
		// 	ttl: {min: 30, max: 1000},
		// 	count: 50
		// };
		var particleList = [];
		// for(var i = 0; i < options.count; i++) {
		// 	particleList.push(createParticle(options));
		// }
		var direction = {X: 4, Y: 4};
		var p = {
			position: options.position,
			draw: function() {
				p.run();
			},
			keyup: function(key) {
				if(key === 32) {
					p.kill();
				}
			},
			kill: function() {
				ttl = 1;
			},
			run: function() {
				if(p.dead) {
					return;
				}
				if(options.count > particleList.length) {
					for(var i = 0; i < options.count - particleList.length; i++){
						particleList.push(createParticle(options));
					}
				}
				if(options.count < particleList.length) {
					particleList.length = options.count | 0;
				}
				var now = Date.now();
				var deadParticles = 0;
				for(var i = 0; i < particleList.length; i++) {
					particleList[i].update();
					particleList[i].draw();
					if(ttl !== 0 && now - birth > ttl) {
						particleList[i].die();
					}
					if(particleList[i].dead && particleList[i].unborn) {
						deadParticles++;
					}
					if(deadParticles === particleList.length) {
						p.fire("death");
						p.dead = true;
					}
				}
			},
			init: function() {
				console.log("init particles");
			}
		};
		Events.attach(p);
		return p;		
	}
	return particles;
});/*jshint newcap:false, nonew:true */
/*global console, alert */
define("play", [
        "canvas",
        "resources",
        "keys",
        "ship",
        "bullet",
        "world",
        "container",
        "quickbuttons",
        "events"        
    ],function(Canvas,
            Resources,
            keys,
            Ship,
            Bullet,
            World,
            Container,
            QuickButtons,
            Events) {
    "use strict";

    var down = {};
    var bullets = [];
    var before = Date.now();
    var ship;
    var world;  

    var collision = function(c) {
        function killemall(e1, e2) {
            if(e1.type !== "powerup") { e1.die(); }
            if(e2.type !== "powerup") { e2.die(); }
            if(e1.player || e2.player) {
                setTimeout(function() {
                    play.respawn();
                }, 1000);
            }
        }
        if(c[0].type === "ship" && c[1].type === "ship") {
            killemall(c[0], c[1]);
            return;
        }
        if(c[0].type === "bullet" || c[1].type === "bullet") {
            if ((c[0].owner && c[0].owner !== c[1]) ||
                (c[1].owner && c[1].owner !== c[0])) {
                killemall(c[0], c[1]);
            }
        } else {
            var collisionbox = null;
            var moveable = null;
            if(c[1].type === "collisionbox") {
                collisionbox = c[1];
                moveable = c[0];
            } else if(c[0].type === "collisionbox") {
                collisionbox = c[0];
                moveable = c[1];
            }
            if(collisionbox) {
                var collisionPosition = {X: moveable.position.X, Y: moveable.position.Y};
                moveable.unmove(true, false);
                if(world.touches(moveable, collisionbox)) {
                    moveable.position.X  = collisionPosition.X;
                    moveable.position.Y  = collisionPosition.Y;
                    moveable.unmove(false, true);
                }
            }
        }
        if(c[1].type === "powerup" && c[0].player) {
            if(!ship.inventory[c[1].name]) {
                ship.inventory[c[1].name] = {};
                ship.inventory[c[1].name].count = 0;
                ship.inventory[c[1].name].button = {
                    label: 0,
                    icon: c[1].image,
                    action: c[1].collect
                };
                QuickButtons.buttons.push(ship.inventory[c[1].name].button);                
            }            
            Resources.pickup.play();
            ship.inventory[c[1].name].count += 1;
            if(c[1].name === "cargo") {
                ship.cargo++;
                if(ship.cargo === world.powerupCount) {
                    world.exit.active = true;
                }                
            }
            ship.inventory[c[1].name].button.label = ship.inventory[c[1].name].count + "";
            c[1].collect();
        }
    };

    var levelCache = {};
    function fetchLevel(level, callback) {
        if(levelCache[level]) {
            callback(levelCache[level]);
            return;            
        }
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "maps/" + level + ".json", true);
        xhr.onload = function() {            
            levelCache[level] = JSON.parse(xhr.responseText);
            callback(levelCache[level]);
        };
        xhr.send(null);
    }

    function worldScroll(ship, world) {
        if(ship.position.X - world.offset.X < 200) {
            world.offset.X -= (200 - (ship.position.X - world.offset.X));
            if(world.offset.X < 0) world.offset.X = 0;
        }
        if(ship.position.X - world.offset.X > 600) {
            world.offset.X += ship.position.X - world.offset.X - 600;
            if(world.offset.X > world.width - 800) {
                world.offset.X = world.width - 800;
            }
        }
        if(ship.position.Y - world.offset.Y < 200) {
            world.offset.Y -= (200 - (ship.position.Y - world.offset.Y));
            if(world.offset.Y < 0) world.offset.Y = 0;
        }
        if(ship.position.Y - world.offset.Y > 400) {
            world.offset.Y += ship.position.Y - world.offset.Y - 400;
            if(world.offset.Y > world.height - 600) {
                world.offset.Y = world.height - 600;
            }
        }
    }
    var play = {
        cargo: 6,
        level: "intro",
        mouse: {X: 0, Y: 0},
        getWorld: function() {
            return world;
        },
        reset: function() {
            /*if(ship) {
                ship.ammo = 12;
            }*/
        },
        respawn: function() {
            down = {};
            ship = Ship([Resources.ships, 264, 945, 22, 25, -11, -12, 22, 25], world);
            ship.player = true;
            ship.inventory.bullets = {
                "count" : 12,
                "button": {
                    "label": 12,
                    "icon": Resources.bullets,
                    "action": function() {
                        ship.shoot();
                    }
                }
            };                   
            fetchLevel(play.level, function(mapData) {
                world = World(mapData, ship);
                ship.setWorld(world);
                ship.on("death", function() {
                    console.log("player died");
                });
                //world.add(enemies);
                world.add(ship);
                world.on("collision", collision);
                world.on("exit", function() {
                    if(ship.cargo === world.powerupCount) {
                        var badges = [];
                        console.log("kills: " + ship.kills + ", enemies: " + world.enemyCount);
                        if(ship.kills > 0) {
                            if(world.enemyCount === ship.kills) {                            
                                badges.push("butcher");
                            }
                        } else {
                            badges.push("pacifist");
                        }
                        if(!ship.seen) {
                            badges.push("ghost");
                        }
                        console.log("level complete");
                        play.fire("win", {
                            badges: badges
                        });                    
                    }
                    //console.log("exit");
                });
                worldScroll(ship, world);
                QuickButtons.buttons = [];
                QuickButtons.buttons.push(ship.inventory.bullets.button);                
            });
        },
        init: function() {
            if(!ship) {
                play.respawn();
            }
            Resources.music.play(true);
        },
        run: function() {
            var now = Date.now();
            var d = now - before;
            if(d > 64) {
                d = 17;
            }
            world.draw();
            if(down[keys.LEFT] || down[keys.A]) {
                ship.angle -= 0.1;
            }
            if(down[keys.RIGHT] || down[keys.D]) {
                ship.angle += 0.1;
            }

            if(down[keys.UP] || down[keys.W]) {
                ship.forward(d);
                worldScroll(ship, world);
                ship.dirty = true;
            } else {
                if(ship.currentSpeed > 0) {
                    ship.currentSpeed -= d / 5000;
                    ship.forward(d, ship.currentSpeed);
                    worldScroll(ship, world);
                    ship.dirty = true;
                }
            }
            QuickButtons.draw();
            before = now;
        },
        keydown:  function(keyCode) {
            down[keyCode] = true;
            if(keyCode === keys.SPACE) {
                ship.shoot();
            }
        },
        keyup: function(keyCode) {
            down[keyCode] = false;
        },
        click: function(mouse) {
            //shoot something
            //shoot();
            QuickButtons.click(mouse);
        },
        mousemove: function(mouse) {
            play.mouse = mouse;
        },
        clear: function(cb) { 
            Resources.music.stop();
            cb(); 
        }
    };

    Events.attach(play);
    
    return play;
});define("powerup", ["canvas"], function(Canvas) {
	var powerup = function(image, action, position, name) {
		var start = Date.now();
		var lastScale = 0;
		var scaleTime = 50;
		var scale = 0.5;
		var inc = 0.1;
		var dead = false;
		function distance(p1, p2) {
			return Math.max(
					Math.abs(p1.X - p2.X),
					Math.abs(p1.Y - p2.Y)
				);
		}
		return {
			position: position,
			boundingbox: [-16, -16, 32, 32],
			type: "powerup",
			image: image,
			name: name,
			draw: function() {
				//scale = 0.5 + ((Date.now() - start) % 50 / 50);
				if(Date.now() - lastScale > scaleTime) {
					lastScale = Date.now();
					scale += inc;
					if(scale === 1.2 || scale === 0.4) {
						inc *= -1;
					}
				}
				Canvas.context.save();
				Canvas.context.translate(position.X, position.Y);
				Canvas.context.scale(scale, scale);
				Canvas.context.drawImage(image, -1 * (image.width / 2) * scale,  -1 * (image.height / 2) * scale);
				Canvas.context.restore();
				return dead;
			},
			die: function() {
				dead = true;
			},
			collect: function(target) {
				dead = true;
				action.call(this);
			}
		};
	};
	return powerup;
});define("quickbuttons", ["canvas"], function(Canvas) {
	var size = { width: 0 * 74 + 20, height: 84 };	
	var position = { X: Canvas.width / 2, Y: Canvas.height - size.height };
	var quickButtons = {
		buttons: [],
		click: function(mouse) {
			position = { X: Canvas.width / 2, Y: Canvas.height - size.height };
			for(var i = 0; i < quickButtons.buttons.length; i++) {			
				var topleft = (position.X - size.width / 2) + (10 + (i * 74));
				if (mouse.X > topleft &&
					mouse.X < topleft + 64 &&
					mouse.Y > position.Y + 10) {
					console.log("peep");
					quickButtons.buttons[i].action();
					break;
				}
			}
		},
		draw: function() {
			if(quickButtons.buttons.length === 0) {
				return;
			}
			size = { width: quickButtons.buttons.length * 74 + 20, height: 84 };
			position = { X: Canvas.width / 2, Y: Canvas.height - size.height };
			Canvas.context.save();			
			Canvas.context.fillStyle = "rgba(0, 0, 0, 0.6)";
			Canvas.context.strokeStyle = "rgba(255, 255, 255, 1.0)";
			Canvas.context.shadowColor = 'rgba(150, 150, 150, 1.0)';
			Canvas.context.shadowOffsetX = 0;
			Canvas.context.shadowOffsetY = 0;
			Canvas.context.shadowBlur = 16;
			Canvas.context.textAlign = "center";

			Canvas.context.translate(position.X - size.width / 2, position.Y);
			Canvas.context.fillStyle = "rgba(0, 0, 0, 0.6)";
			for(var i = 0; i < quickButtons.buttons.length; i++) {
				Canvas.context.fillStyle = "rgba(0, 0, 0, 0.6)";
				Canvas.context.shadowColor = 'rgba(150, 150, 150, 1.0)';
				Canvas.context.fillRect(10 + (i * 74), 10, 64, 64);
				Canvas.context.drawImage(quickButtons.buttons[i].icon, 
										10 + (i * 74) + (quickButtons.buttons[i].icon.width / 2), 
										10 + (quickButtons.buttons[i].icon.height / 2) );
				Canvas.context.fillStyle = "white";				
				Canvas.context.fillText(quickButtons.buttons[i].label,
										10 + (i * 74) + (quickButtons.buttons[i].icon.width / 2), 
										22);

				Canvas.context.strokeStyle = "black";
				var topleft = 10 + (i * 74);
				Canvas.context.strokeRect(topleft, 10, 64, 64);	
			}
			//Canvas.context.strokeRect(10, 10, 64, 64);
			Canvas.context.restore();
		

		}
	};
	return quickButtons;
});/*jshint newcap:false, nonew:true */
/*global console, define */
(function() {
	"use strict";
	function audio(files, callback) {
		var file = new Audio(),
			maxChannels = 3,
			channels = [],
			fileType = files.substr(files.lastIndexOf(".") + 1).toLowerCase();

		callback = callback || function(success) { console.log("no callback set for loading audio."); };
		var rfile = {
			canPlay: {
				"mp3": file.canPlayType("audio/mpeg"),
				"ogg": file.canPlayType("audio/ogg"),
				"wav": file.canPlayType("audio/wav")
			},
			volume: function(vol) {
				for(var i = 0; i < channels.length; i++) {
					channels[i].volume = vol;
				}
			},
			play: function(loop) {
				for(var i = 0; i < maxChannels; i++) {
					if(i >= channels.length) {
						channels[i] = new Audio(files);
					}
					if(channels[i].currentTime === 0 || channels[i].ended) {
						channels[i].loop = loop;
						channels[i].play();
						return;
					}
				}
				//if all else fails.
				channels[0].pause();
				channels[0].loop = loop;
				channels[0].currentTime = 0;
				channels[0].play();
			},
			stop: function() {
				for(var i = 0; i < channels.length; i++) {
					if(channels[i] && !channels[i].paused) {
						channels[i].pause();
						channels[i].currentTime = 0;
					}
				}
			}
		};
		if(!rfile.canPlay[fileType]) {
			callback(false);
			console.log("This filetype cannot be played on this browser: " + fileType);
		} else {
			//for(var i = 0; i < maxChannels; i++) {
				channels.push(new Audio(files));
			//}
			callback(true);
		}
		return rfile;
	}

	var Racket = {
		create: audio
	};

	if(typeof define !== "undefined") {
		define("racket", Racket);
	} else {
		window.Racket = Racket;
	}
}());
define ("raf", function() {
	var requestAnimationFrame = (window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame ||
		function(cb) {
			setTimeout(cb, 17);
		});
	return {
		requestAnimationFrame: requestAnimationFrame
	};
});/*
 RequireJS 2.1.2 Copyright (c) 2010-2012, The Dojo Foundation All Rights Reserved.
 Available via the MIT or new BSD license.
 see: http://github.com/jrburke/requirejs for details
*/
var requirejs,require,define;
(function(Y){function H(b){return"[object Function]"===L.call(b)}function I(b){return"[object Array]"===L.call(b)}function x(b,c){if(b){var d;for(d=0;d<b.length&&(!b[d]||!c(b[d],d,b));d+=1);}}function M(b,c){if(b){var d;for(d=b.length-1;-1<d&&(!b[d]||!c(b[d],d,b));d-=1);}}function r(b,c){return da.call(b,c)}function i(b,c){return r(b,c)&&b[c]}function E(b,c){for(var d in b)if(r(b,d)&&c(b[d],d))break}function Q(b,c,d,i){c&&E(c,function(c,h){if(d||!r(b,h))i&&"string"!==typeof c?(b[h]||(b[h]={}),Q(b[h],
c,d,i)):b[h]=c});return b}function t(b,c){return function(){return c.apply(b,arguments)}}function Z(b){if(!b)return b;var c=Y;x(b.split("."),function(b){c=c[b]});return c}function J(b,c,d,i){c=Error(c+"\nhttp://requirejs.org/docs/errors.html#"+b);c.requireType=b;c.requireModules=i;d&&(c.originalError=d);return c}function ea(b){function c(a,g,v){var e,n,b,c,d,j,f,h=g&&g.split("/");e=h;var l=m.map,k=l&&l["*"];if(a&&"."===a.charAt(0))if(g){e=i(m.pkgs,g)?h=[g]:h.slice(0,h.length-1);g=a=e.concat(a.split("/"));
for(e=0;g[e];e+=1)if(n=g[e],"."===n)g.splice(e,1),e-=1;else if(".."===n)if(1===e&&(".."===g[2]||".."===g[0]))break;else 0<e&&(g.splice(e-1,2),e-=2);e=i(m.pkgs,g=a[0]);a=a.join("/");e&&a===g+"/"+e.main&&(a=g)}else 0===a.indexOf("./")&&(a=a.substring(2));if(v&&(h||k)&&l){g=a.split("/");for(e=g.length;0<e;e-=1){b=g.slice(0,e).join("/");if(h)for(n=h.length;0<n;n-=1)if(v=i(l,h.slice(0,n).join("/")))if(v=i(v,b)){c=v;d=e;break}if(c)break;!j&&(k&&i(k,b))&&(j=i(k,b),f=e)}!c&&j&&(c=j,d=f);c&&(g.splice(0,d,
c),a=g.join("/"))}return a}function d(a){z&&x(document.getElementsByTagName("script"),function(g){if(g.getAttribute("data-requiremodule")===a&&g.getAttribute("data-requirecontext")===j.contextName)return g.parentNode.removeChild(g),!0})}function y(a){var g=i(m.paths,a);if(g&&I(g)&&1<g.length)return d(a),g.shift(),j.require.undef(a),j.require([a]),!0}function f(a){var g,b=a?a.indexOf("!"):-1;-1<b&&(g=a.substring(0,b),a=a.substring(b+1,a.length));return[g,a]}function h(a,g,b,e){var n,u,d=null,h=g?g.name:
null,l=a,m=!0,k="";a||(m=!1,a="_@r"+(L+=1));a=f(a);d=a[0];a=a[1];d&&(d=c(d,h,e),u=i(p,d));a&&(d?k=u&&u.normalize?u.normalize(a,function(a){return c(a,h,e)}):c(a,h,e):(k=c(a,h,e),a=f(k),d=a[0],k=a[1],b=!0,n=j.nameToUrl(k)));b=d&&!u&&!b?"_unnormalized"+(M+=1):"";return{prefix:d,name:k,parentMap:g,unnormalized:!!b,url:n,originalName:l,isDefine:m,id:(d?d+"!"+k:k)+b}}function q(a){var g=a.id,b=i(k,g);b||(b=k[g]=new j.Module(a));return b}function s(a,g,b){var e=a.id,n=i(k,e);if(r(p,e)&&(!n||n.defineEmitComplete))"defined"===
g&&b(p[e]);else q(a).on(g,b)}function C(a,g){var b=a.requireModules,e=!1;if(g)g(a);else if(x(b,function(g){if(g=i(k,g))g.error=a,g.events.error&&(e=!0,g.emit("error",a))}),!e)l.onError(a)}function w(){R.length&&(fa.apply(F,[F.length-1,0].concat(R)),R=[])}function A(a,g,b){var e=a.map.id;a.error?a.emit("error",a.error):(g[e]=!0,x(a.depMaps,function(e,c){var d=e.id,h=i(k,d);h&&(!a.depMatched[c]&&!b[d])&&(i(g,d)?(a.defineDep(c,p[d]),a.check()):A(h,g,b))}),b[e]=!0)}function B(){var a,g,b,e,n=(b=1E3*m.waitSeconds)&&
j.startTime+b<(new Date).getTime(),c=[],h=[],f=!1,l=!0;if(!T){T=!0;E(k,function(b){a=b.map;g=a.id;if(b.enabled&&(a.isDefine||h.push(b),!b.error))if(!b.inited&&n)y(g)?f=e=!0:(c.push(g),d(g));else if(!b.inited&&(b.fetched&&a.isDefine)&&(f=!0,!a.prefix))return l=!1});if(n&&c.length)return b=J("timeout","Load timeout for modules: "+c,null,c),b.contextName=j.contextName,C(b);l&&x(h,function(a){A(a,{},{})});if((!n||e)&&f)if((z||$)&&!U)U=setTimeout(function(){U=0;B()},50);T=!1}}function D(a){r(p,a[0])||
q(h(a[0],null,!0)).init(a[1],a[2])}function G(a){var a=a.currentTarget||a.srcElement,b=j.onScriptLoad;a.detachEvent&&!V?a.detachEvent("onreadystatechange",b):a.removeEventListener("load",b,!1);b=j.onScriptError;(!a.detachEvent||V)&&a.removeEventListener("error",b,!1);return{node:a,id:a&&a.getAttribute("data-requiremodule")}}function K(){var a;for(w();F.length;){a=F.shift();if(null===a[0])return C(J("mismatch","Mismatched anonymous define() module: "+a[a.length-1]));D(a)}}var T,W,j,N,U,m={waitSeconds:7,
baseUrl:"./",paths:{},pkgs:{},shim:{},map:{},config:{}},k={},X={},F=[],p={},S={},L=1,M=1;N={require:function(a){return a.require?a.require:a.require=j.makeRequire(a.map)},exports:function(a){a.usingExports=!0;if(a.map.isDefine)return a.exports?a.exports:a.exports=p[a.map.id]={}},module:function(a){return a.module?a.module:a.module={id:a.map.id,uri:a.map.url,config:function(){return m.config&&i(m.config,a.map.id)||{}},exports:p[a.map.id]}}};W=function(a){this.events=i(X,a.id)||{};this.map=a;this.shim=
i(m.shim,a.id);this.depExports=[];this.depMaps=[];this.depMatched=[];this.pluginMaps={};this.depCount=0};W.prototype={init:function(a,b,c,e){e=e||{};if(!this.inited){this.factory=b;if(c)this.on("error",c);else this.events.error&&(c=t(this,function(a){this.emit("error",a)}));this.depMaps=a&&a.slice(0);this.errback=c;this.inited=!0;this.ignore=e.ignore;e.enabled||this.enabled?this.enable():this.check()}},defineDep:function(a,b){this.depMatched[a]||(this.depMatched[a]=!0,this.depCount-=1,this.depExports[a]=
b)},fetch:function(){if(!this.fetched){this.fetched=!0;j.startTime=(new Date).getTime();var a=this.map;if(this.shim)j.makeRequire(this.map,{enableBuildCallback:!0})(this.shim.deps||[],t(this,function(){return a.prefix?this.callPlugin():this.load()}));else return a.prefix?this.callPlugin():this.load()}},load:function(){var a=this.map.url;S[a]||(S[a]=!0,j.load(this.map.id,a))},check:function(){if(this.enabled&&!this.enabling){var a,b,c=this.map.id;b=this.depExports;var e=this.exports,n=this.factory;
if(this.inited)if(this.error)this.emit("error",this.error);else{if(!this.defining){this.defining=!0;if(1>this.depCount&&!this.defined){if(H(n)){if(this.events.error)try{e=j.execCb(c,n,b,e)}catch(d){a=d}else e=j.execCb(c,n,b,e);this.map.isDefine&&((b=this.module)&&void 0!==b.exports&&b.exports!==this.exports?e=b.exports:void 0===e&&this.usingExports&&(e=this.exports));if(a)return a.requireMap=this.map,a.requireModules=[this.map.id],a.requireType="define",C(this.error=a)}else e=n;this.exports=e;if(this.map.isDefine&&
!this.ignore&&(p[c]=e,l.onResourceLoad))l.onResourceLoad(j,this.map,this.depMaps);delete k[c];this.defined=!0}this.defining=!1;this.defined&&!this.defineEmitted&&(this.defineEmitted=!0,this.emit("defined",this.exports),this.defineEmitComplete=!0)}}else this.fetch()}},callPlugin:function(){var a=this.map,b=a.id,d=h(a.prefix);this.depMaps.push(d);s(d,"defined",t(this,function(e){var n,d;d=this.map.name;var v=this.map.parentMap?this.map.parentMap.name:null,f=j.makeRequire(a.parentMap,{enableBuildCallback:!0,
skipMap:!0});if(this.map.unnormalized){if(e.normalize&&(d=e.normalize(d,function(a){return c(a,v,!0)})||""),e=h(a.prefix+"!"+d,this.map.parentMap),s(e,"defined",t(this,function(a){this.init([],function(){return a},null,{enabled:!0,ignore:!0})})),d=i(k,e.id)){this.depMaps.push(e);if(this.events.error)d.on("error",t(this,function(a){this.emit("error",a)}));d.enable()}}else n=t(this,function(a){this.init([],function(){return a},null,{enabled:!0})}),n.error=t(this,function(a){this.inited=!0;this.error=
a;a.requireModules=[b];E(k,function(a){0===a.map.id.indexOf(b+"_unnormalized")&&delete k[a.map.id]});C(a)}),n.fromText=t(this,function(e,c){var d=a.name,u=h(d),v=O;c&&(e=c);v&&(O=!1);q(u);r(m.config,b)&&(m.config[d]=m.config[b]);try{l.exec(e)}catch(k){throw Error("fromText eval for "+d+" failed: "+k);}v&&(O=!0);this.depMaps.push(u);j.completeLoad(d);f([d],n)}),e.load(a.name,f,n,m)}));j.enable(d,this);this.pluginMaps[d.id]=d},enable:function(){this.enabling=this.enabled=!0;x(this.depMaps,t(this,function(a,
b){var c,e;if("string"===typeof a){a=h(a,this.map.isDefine?this.map:this.map.parentMap,!1,!this.skipMap);this.depMaps[b]=a;if(c=i(N,a.id)){this.depExports[b]=c(this);return}this.depCount+=1;s(a,"defined",t(this,function(a){this.defineDep(b,a);this.check()}));this.errback&&s(a,"error",this.errback)}c=a.id;e=k[c];!r(N,c)&&(e&&!e.enabled)&&j.enable(a,this)}));E(this.pluginMaps,t(this,function(a){var b=i(k,a.id);b&&!b.enabled&&j.enable(a,this)}));this.enabling=!1;this.check()},on:function(a,b){var c=
this.events[a];c||(c=this.events[a]=[]);c.push(b)},emit:function(a,b){x(this.events[a],function(a){a(b)});"error"===a&&delete this.events[a]}};j={config:m,contextName:b,registry:k,defined:p,urlFetched:S,defQueue:F,Module:W,makeModuleMap:h,nextTick:l.nextTick,configure:function(a){a.baseUrl&&"/"!==a.baseUrl.charAt(a.baseUrl.length-1)&&(a.baseUrl+="/");var b=m.pkgs,c=m.shim,e={paths:!0,config:!0,map:!0};E(a,function(a,b){e[b]?"map"===b?Q(m[b],a,!0,!0):Q(m[b],a,!0):m[b]=a});a.shim&&(E(a.shim,function(a,
b){I(a)&&(a={deps:a});if((a.exports||a.init)&&!a.exportsFn)a.exportsFn=j.makeShimExports(a);c[b]=a}),m.shim=c);a.packages&&(x(a.packages,function(a){a="string"===typeof a?{name:a}:a;b[a.name]={name:a.name,location:a.location||a.name,main:(a.main||"main").replace(ga,"").replace(aa,"")}}),m.pkgs=b);E(k,function(a,b){!a.inited&&!a.map.unnormalized&&(a.map=h(b))});if(a.deps||a.callback)j.require(a.deps||[],a.callback)},makeShimExports:function(a){return function(){var b;a.init&&(b=a.init.apply(Y,arguments));
return b||a.exports&&Z(a.exports)}},makeRequire:function(a,d){function f(e,c,u){var i,m;d.enableBuildCallback&&(c&&H(c))&&(c.__requireJsBuild=!0);if("string"===typeof e){if(H(c))return C(J("requireargs","Invalid require call"),u);if(a&&r(N,e))return N[e](k[a.id]);if(l.get)return l.get(j,e,a);i=h(e,a,!1,!0);i=i.id;return!r(p,i)?C(J("notloaded",'Module name "'+i+'" has not been loaded yet for context: '+b+(a?"":". Use require([])"))):p[i]}K();j.nextTick(function(){K();m=q(h(null,a));m.skipMap=d.skipMap;
m.init(e,c,u,{enabled:!0});B()});return f}d=d||{};Q(f,{isBrowser:z,toUrl:function(b){var d=b.lastIndexOf("."),g=null;-1!==d&&(g=b.substring(d,b.length),b=b.substring(0,d));return j.nameToUrl(c(b,a&&a.id,!0),g)},defined:function(b){return r(p,h(b,a,!1,!0).id)},specified:function(b){b=h(b,a,!1,!0).id;return r(p,b)||r(k,b)}});a||(f.undef=function(b){w();var c=h(b,a,!0),d=i(k,b);delete p[b];delete S[c.url];delete X[b];d&&(d.events.defined&&(X[b]=d.events),delete k[b])});return f},enable:function(a){i(k,
a.id)&&q(a).enable()},completeLoad:function(a){var b,c,d=i(m.shim,a)||{},h=d.exports;for(w();F.length;){c=F.shift();if(null===c[0]){c[0]=a;if(b)break;b=!0}else c[0]===a&&(b=!0);D(c)}c=i(k,a);if(!b&&!r(p,a)&&c&&!c.inited){if(m.enforceDefine&&(!h||!Z(h)))return y(a)?void 0:C(J("nodefine","No define call for "+a,null,[a]));D([a,d.deps||[],d.exportsFn])}B()},nameToUrl:function(a,b){var c,d,h,f,j,k;if(l.jsExtRegExp.test(a))f=a+(b||"");else{c=m.paths;d=m.pkgs;f=a.split("/");for(j=f.length;0<j;j-=1)if(k=
f.slice(0,j).join("/"),h=i(d,k),k=i(c,k)){I(k)&&(k=k[0]);f.splice(0,j,k);break}else if(h){c=a===h.name?h.location+"/"+h.main:h.location;f.splice(0,j,c);break}f=f.join("/");f+=b||(/\?/.test(f)?"":".js");f=("/"===f.charAt(0)||f.match(/^[\w\+\.\-]+:/)?"":m.baseUrl)+f}return m.urlArgs?f+((-1===f.indexOf("?")?"?":"&")+m.urlArgs):f},load:function(a,b){l.load(j,a,b)},execCb:function(a,b,c,d){return b.apply(d,c)},onScriptLoad:function(a){if("load"===a.type||ha.test((a.currentTarget||a.srcElement).readyState))P=
null,a=G(a),j.completeLoad(a.id)},onScriptError:function(a){var b=G(a);if(!y(b.id))return C(J("scripterror","Script error",a,[b.id]))}};j.require=j.makeRequire();return j}var l,w,A,D,s,G,P,K,ba,ca,ia=/(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg,ja=/[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g,aa=/\.js$/,ga=/^\.\//;w=Object.prototype;var L=w.toString,da=w.hasOwnProperty,fa=Array.prototype.splice,z=!!("undefined"!==typeof window&&navigator&&document),$=!z&&"undefined"!==typeof importScripts,ha=z&&
"PLAYSTATION 3"===navigator.platform?/^complete$/:/^(complete|loaded)$/,V="undefined"!==typeof opera&&"[object Opera]"===opera.toString(),B={},q={},R=[],O=!1;if("undefined"===typeof define){if("undefined"!==typeof requirejs){if(H(requirejs))return;q=requirejs;requirejs=void 0}"undefined"!==typeof require&&!H(require)&&(q=require,require=void 0);l=requirejs=function(b,c,d,y){var f,h="_";!I(b)&&"string"!==typeof b&&(f=b,I(c)?(b=c,c=d,d=y):b=[]);f&&f.context&&(h=f.context);(y=i(B,h))||(y=B[h]=l.s.newContext(h));
f&&y.configure(f);return y.require(b,c,d)};l.config=function(b){return l(b)};l.nextTick="undefined"!==typeof setTimeout?function(b){setTimeout(b,4)}:function(b){b()};require||(require=l);l.version="2.1.2";l.jsExtRegExp=/^\/|:|\?|\.js$/;l.isBrowser=z;w=l.s={contexts:B,newContext:ea};l({});x(["toUrl","undef","defined","specified"],function(b){l[b]=function(){var c=B._;return c.require[b].apply(c,arguments)}});if(z&&(A=w.head=document.getElementsByTagName("head")[0],D=document.getElementsByTagName("base")[0]))A=
w.head=D.parentNode;l.onError=function(b){throw b;};l.load=function(b,c,d){var i=b&&b.config||{},f;if(z)return f=i.xhtml?document.createElementNS("http://www.w3.org/1999/xhtml","html:script"):document.createElement("script"),f.type=i.scriptType||"text/javascript",f.charset="utf-8",f.async=!0,f.setAttribute("data-requirecontext",b.contextName),f.setAttribute("data-requiremodule",c),f.attachEvent&&!(f.attachEvent.toString&&0>f.attachEvent.toString().indexOf("[native code"))&&!V?(O=!0,f.attachEvent("onreadystatechange",
b.onScriptLoad)):(f.addEventListener("load",b.onScriptLoad,!1),f.addEventListener("error",b.onScriptError,!1)),f.src=d,K=f,D?A.insertBefore(f,D):A.appendChild(f),K=null,f;$&&(importScripts(d),b.completeLoad(c))};z&&M(document.getElementsByTagName("script"),function(b){A||(A=b.parentNode);if(s=b.getAttribute("data-main"))return q.baseUrl||(G=s.split("/"),ba=G.pop(),ca=G.length?G.join("/")+"/":"./",q.baseUrl=ca,s=ba),s=s.replace(aa,""),q.deps=q.deps?q.deps.concat(s):[s],!0});define=function(b,c,d){var i,
f;"string"!==typeof b&&(d=c,c=b,b=null);I(c)||(d=c,c=[]);!c.length&&H(d)&&d.length&&(d.toString().replace(ia,"").replace(ja,function(b,d){c.push(d)}),c=(1===d.length?["require"]:["require","exports","module"]).concat(c));if(O){if(!(i=K))P&&"interactive"===P.readyState||M(document.getElementsByTagName("script"),function(b){if("interactive"===b.readyState)return P=b}),i=P;i&&(b||(b=i.getAttribute("data-requiremodule")),f=B[i.getAttribute("data-requirecontext")])}(f?f.defQueue:R).push([b,c,d])};define.amd=
{jQuery:!0};l.exec=function(b){return eval(b)};l(q)}})(this);
define("resources", ["events", "racket"], function(events, Racket) {
    if(window._GAME_RESOURCES_) {
        return window._GAME_RESOURCES_;
    }
    var audio = ["wav", "mp3", "ogg"];
    var reserved = ["on", "fire", "load", "prototype", "remove"];
    var resources = {
        loaded: 0,
        load: function(files) {
            resources.load.total = 0;
            resources.load.loaded = 0;
            function loaded(file) {
                resources.load.loaded++;
                resources.fire("progress", file);
                if(resources.load.loaded === resources.load.total) {
                    resources.fire("load");
                }
            }
            for(var file in files) {
                if(reserved.indexOf(file) !== -1) {
                    throw "naming conflict: cannot load resource named " + file;
                }
                resources.load.total++;
                if(audio.indexOf(files[file].slice(-3)) !== -1) {
                    (function(file) {
                        resources[file] = Racket.create(files[file], function(success) {
                            if(!success) {
                                console.log("failed to load: " + files[file]);
                            }
                            loaded(file);
                        });
                    }(file));
                } else {
                    var img = new Image();
                    (function(img, file){
                        img.onload = function() {
                            loaded(file);
                        };
                        img.onerror = function() {
                            //fail silently.
                            console.log("failed to load: " + files[file]);
                            loaded(file);
                        };
                    }(img, file));
                    img.src = files[file];
                    img.setAttribute("class", "resources");
                    img.setAttribute("name", file);
                    document.body.appendChild(img);
                    resources[file] = img;
                }
            }
        }
    };

    var domResources = document.querySelectorAll("img.resources");
    for(var i = 0; i < domResources.length; i++) {
        resources[domResources[i].getAttribute("name")] = domResources[i];
    }
    events.attach(resources);
    window._GAME_RESOURCES_ = resources;
    return resources;
});/*jshint newcap:false, nonew:true */
/*global console, alert */
define("ship", [
    "canvas", 
    "bullet", 
    "events", 
    "effects", 
    "resources",
    "particles"], function(
        Canvas, 
        Bullet, 
        Events, 
        effects,
        Resources, 
        Particles) {
    "use strict";
    var Ship = function(image, world) {
        var dead = false;
        var back = {X:0, Y: 0};
        var before = Date.now();
        var explosion = null;
        var ship = {
            type: "ship",
            boundingbox: [-16, -16, 32, 32],
            position: {X: 300, Y: 300, ship: true},
            ammo: 12,
            hp: 10,
            range: 200,
            angle: 0,
            dirty: false,
            speed: 0.3, //px/ms
            currentSpeed: 0,
            fireDelay: 1000,
            lastShot: 0,
            cargo: 0,
            dead: false,
            kills: 0,
            inventory: {},
            waypoints: [],
            nextWaypoint: 0,
            target: null,
            setWorld: function(w) {
                world = w;
            },
            distance: function(other) {
                return Math.sqrt((ship.position.X - other.position.X) *
                                (ship.position.X - other.position.X) +
                                (ship.position.Y - other.position.Y) *
                                (ship.position.Y - other.position.Y) );
            },
            shoot: function() {
                if(ship.ammo > 0) {
                    var bullet = Bullet({X: ship.position.X, Y: ship.position.Y}, [], {angle: ship.angle});
                    bullet.owner = ship;
                    world.add(bullet);
                    ship.ammo--;
                    if(ship.inventory.bullets) {
                        ship.inventory.bullets.count = ship.ammo;
                        ship.inventory.bullets.button.label = ship.ammo;
                    }
                    Resources.shoot.play();
                }
            },
            draw: function(bb) {
                if(explosion !== null) {
                    explosion.draw();
                    return dead;
                }
                var now = Date.now();
                var d = now - before;
                if(d > 64) {
                    d = 17;
                }
                Canvas.context.save();
                Canvas.context.translate(ship.position.X, ship.position.Y);
                Canvas.context.rotate(ship.angle);
                Canvas.context.drawImage.apply(Canvas.context, image);
                //Canvas.context.drawImage(image, 234, 807, 57, 39,-27, -19, 57, 39);
                Canvas.context.restore();
                if(bb) {
                    drawBB();
                }
                if(ship.waypoints.length > 0 || ship.target !== null) {
                    var speed = ship.speed;
                    if(ship.target && ship.target.ship) {
                        speed *= 2;
                        if(now - ship.lastShot > ship.fireDelay) {
                            ship.shoot();
                            ship.lastShot = now;
                        }
                    }
                    ship.forward(d, speed);
                    ship.dirty = true;
                }
                if(ship.enemy  && !ship.enemy.dead && ship.distance(ship.enemy) < ship.range) {
                    ship.enemy.seen = true;
                    ship.target = ship.enemy.position;
                } else if(ship.waypoints.length > 0){
                    ship.target = ship.waypoints[ship.nextWaypoint];
                }
                before = now;
                return dead;
            },
            die: function() {
                var particleOptions = effects.explosion();
                particleOptions.position = ship.position;
                explosion = Particles(particleOptions);
                ship.dead = true;
                explosion.on("death", function() {
                    dead = true;                    
                    ship.fire("death");                    
                });
                console.log("kill ship");
                Resources.explosion.play();
            },
            unmove: function(x, y) {
                if(x) ship.position.X = back.X;
                if(y) ship.position.Y = back.Y;
            },
            lastPosition: function() {
                return back;
            },
            forward: function(d, speed) {
                ship.lastForward = Date.now();
                speed = speed || ship.speed;
                ship.currentSpeed = speed;
                if(!ship.target && ship.waypoints.length > 0 && ship.angle === 0 && ship.nextWaypoint === 0) {
                    ship.nextWaypoint++;
                    ship.target = ship.waypoints[ship.nextWaypoint];
                }
                if(ship.target) {
                    ship.angle = Math.atan2((ship.position.X - ship.target.X),
                                            (ship.target.Y - ship.position.Y)) + 1.5707963249999999;
                }

                var distance = d * speed;
                back = {X: ship.position.X, Y: ship.position.Y};
                ship.position.X = ship.position.X + distance * Math.cos(ship.angle);
                ship.position.Y = ship.position.Y + distance * Math.sin(ship.angle);
                if(ship.waypoints.length > 0) {
                    if(Math.abs(ship.position.X - ship.waypoints[ship.nextWaypoint].X) < 32 &&
                       Math.abs(ship.position.Y - ship.waypoints[ship.nextWaypoint].Y) < 32 ) {
                        ship.nextWaypoint++;
                        if(ship.nextWaypoint > ship.waypoints.length - 1) {
                            ship.nextWaypoint = 0;
                        }
                        ship.target = ship.waypoints[ship.nextWaypoint];
                        ship.angle = Math.atan2((ship.position.X - ship.waypoints[ship.nextWaypoint].X),
                                                (ship.waypoints[ship.nextWaypoint].Y - ship.position.Y)) + 1.5707963249999999;
                        //ship.angle
                    }
                }
            }
        };
        var drawBB = function() {
            Canvas.context.save();
            Canvas.context.translate(ship.position.X, ship.position.Y);
            Canvas.context.strokeStyle = "red";
            Canvas.context.strokeRect.apply(Canvas.context, ship.boundingbox);
            Canvas.context.restore();
        };
        Events.attach(ship);
        ship.waypoints.next = 0;
        return ship;
    };
    return Ship;
});
// stats.js - http://github.com/mrdoob/stats.js
define("stats.min", function() {

var Stats=function(){var l=Date.now(),m=l,g=0,n=Infinity,o=0,h=0,p=Infinity,q=0,r=0,s=0,f=document.createElement("div");f.id="stats";f.addEventListener("mousedown",function(b){b.preventDefault();t(++s%2)},!1);f.style.cssText="width:80px;opacity:0.9;cursor:pointer";var a=document.createElement("div");a.id="fps";a.style.cssText="padding:0 0 3px 3px;text-align:left;background-color:#002";f.appendChild(a);var i=document.createElement("div");i.id="fpsText";i.style.cssText="color:#0ff;font-family:Helvetica,Arial,sans-serif;font-size:9px;font-weight:bold;line-height:15px";
i.innerHTML="FPS";a.appendChild(i);var c=document.createElement("div");c.id="fpsGraph";c.style.cssText="position:relative;width:74px;height:30px;background-color:#0ff";for(a.appendChild(c);74>c.children.length;){var j=document.createElement("span");j.style.cssText="width:1px;height:30px;float:left;background-color:#113";c.appendChild(j)}var d=document.createElement("div");d.id="ms";d.style.cssText="padding:0 0 3px 3px;text-align:left;background-color:#020;display:none";f.appendChild(d);var k=document.createElement("div");
k.id="msText";k.style.cssText="color:#0f0;font-family:Helvetica,Arial,sans-serif;font-size:9px;font-weight:bold;line-height:15px";k.innerHTML="MS";d.appendChild(k);var e=document.createElement("div");e.id="msGraph";e.style.cssText="position:relative;width:74px;height:30px;background-color:#0f0";for(d.appendChild(e);74>e.children.length;)j=document.createElement("span"),j.style.cssText="width:1px;height:30px;float:left;background-color:#131",e.appendChild(j);var t=function(b){s=b;switch(s){case 0:a.style.display=
"block";d.style.display="none";break;case 1:a.style.display="none",d.style.display="block"}};return{REVISION:11,domElement:f,setMode:t,begin:function(){l=Date.now()},end:function(){var b=Date.now();g=b-l;n=Math.min(n,g);o=Math.max(o,g);k.textContent=g+" MS ("+n+"-"+o+")";var a=Math.min(30,30-30*(g/200));e.appendChild(e.firstChild).style.height=a+"px";r++;b>m+1E3&&(h=Math.round(1E3*r/(b-m)),p=Math.min(p,h),q=Math.max(q,h),i.textContent=h+" FPS ("+p+"-"+q+")",a=Math.min(30,30-30*(h/100)),c.appendChild(c.firstChild).style.height=
a+"px",m=b,r=0);return b},update:function(){l=this.end()}}};

return Stats;
});
/*jshint newcap:false, nonew:true */
/*global console */
define("world", [
    "canvas",
    "events",
    //"mapdata",
    "collisionbox",
    "powerup",
    "ship",
    "resources"],
    function(
        Canvas,
        Events,
        //mapData,
        CollisionBox,
        PowerUp,
        Ship,
        Resources) {
    "use strict";


    var renderMap = function(data) {        
        var tiles = null;
        for(var i = 0; i < data.layers.length; i++) {
            if(data.layers[i].type === "tilelayer") {
                tiles = data.layers[i];
                break;
            }
        }
        var tileHeight = data.tilesets[0].tileheight;
        var tileWidth = data.tilesets[0].tilewidth;
        var mapSize = { width: tileWidth * tiles.width, 
                        height: tileHeight * tiles.height };
        function getTile(index, setsize) {
            return {X: (index % setsize.width) * tileWidth,
                    Y: (index / setsize.width | 0) * tileHeight };
        }                        
        var map = Canvas.create(mapSize);
        //map.context.drawImage(Resources.spacetiles, 0, 0);
        for(var tile = 0; tile < tiles.data.length; tile++) {
            var source = getTile(tiles.data[tile] - 1, 
                            { width: 16 /*data.tilesets[0].imagewidth / data.tilesets[0].tilewidth*/,
                              height: data.tilesets[0].imageheight / data.tilesets[0].tileheight });
            var destination = getTile(tile, tiles);
            //console.log(source);
            //console.log(destination);
            map.context.drawImage(Resources.spacetiles, 
                                    source.X, 
                                    source.Y, 
                                    tileWidth, 
                                    tileHeight,
                                    destination.X,
                                    destination.Y,
                                    tileWidth,
                                    tileHeight);
        }
        return map.element;
    };

    var World = function(mapData, player) {
        var map = renderMap(mapData);
        var entities = [];
        var touches = function(ent1, ent2) {
            if (ent1 !== ent2 &&
                !ent1.noncollider &&
                !ent2.noncollider) {
                var horizontalCollision = Math.abs(ent1.position.X - ent2.position.X) < ent1.boundingbox[2] / 2 + ent2.boundingbox[2] / 2;
                var verticalCollision = Math.abs(ent1.position.Y - ent2.position.Y) < ent1.boundingbox[3] / 2 + ent2.boundingbox[3] / 2;
                if (horizontalCollision &&
                    verticalCollision) {
                    return true;
                }
            }
            return false;
        };

        var collides = function(entity) {
            var collisionObjects = [];
            for(var i = 0; i < entities.length; i++) {
                if(!entities[i].dead && touches(entities[i], entity)) {
                    collisionObjects.push(entities[i]);
                }
            }
            return collisionObjects;
        };

        var exitPortal = function() {
            if(touches(player, world.exit)) {
                world.fire("exit");
            }
            if(world.exit.active) {
                Canvas.context.drawImage(Resources.spacetiles, 448, 640, 64, 64, world.exit.position.X - 32, world.exit.position.Y - 32, 64, 64);    
            }            
        };

        var collision = function() {
            for(var i = 0; i < entities.length; i++) {
                if(entities[i].dirty) {
                    var colliderData = collides(entities[i]);
                    if(colliderData.length > 0) {
                        for(var c = 0; c < colliderData.length; c++) {
                            var collider = colliderData[c];
                            if(collider.dirty) {
                                collider.dirty = false;
                            }
                            world.fire("collision", [entities[i], collider]);
                        }
                    }
                    entities[i].dirty = false;
                }
            }
        };

        var sign = {
            show: false,
            message: "wat",
            title: "wat"
        };
        var showSign = function(title, msg) {
            sign.show = true;
            sign.title = title;
            sign.message = msg;
            setTimeout(function() {
                sign.show = false;
            }, 2000);
        };

        var world = {
            powerupCount: 0,
            width: 64 * mapData.layers[0].width,
            height: 64 * mapData.layers[0].height,
            remove: function(item) {
                for(var i = entities.length -1; i >= 0; i++) {
                    if(entities[i] === item) {
                        entities.splice(i, 1);
                        break;
                    }
                }
            },
            add: function(e) {
                entities.push(e);
            },
            offset: {X: 0, Y: 0},
            touches: touches,
            draw: function() {
                collision();
//                exitPortal();
                Canvas.context.save();
                Canvas.context.drawImage(map, world.offset.X, world.offset.Y, Canvas.width, Canvas.height, 0, 0, Canvas.width, Canvas.height);
                Canvas.context.translate(-world.offset.X, -world.offset.Y);
                exitPortal();
                for(var i = entities.length - 1; i >= 0; --i) {
                    if(entities[i].draw()) {
                        //console.log("removing " + entities[i].type);
                        entities.splice(i, 1);
                    }
                }
                Canvas.context.restore();
                if(sign.show) {
                    Canvas.context.save();
                    Canvas.context.fillStyle = "black";
                    Canvas.context.font = "60px RapscallionRegular";
                    Canvas.context.textBaseline = "middle";
                    Canvas.context.textAlign = "center";
                    Canvas.context.drawImage(Resources.bigsign, 144, 32);
                    Canvas.context.fillText(sign.title, 400, 160);
                    Canvas.context.font = "48px RapscallionRegular";
                    var words = sign.message.split(" ");
                    var sentenceWidth = 0;
                    var sentence = words.shift();
                    var top = 250;
                    while(words.length > 0) {
                        sentenceWidth = Canvas.context.measureText(sentence).width;
                        if(sentenceWidth < 300) {
                            sentence += " " + words.shift();
                        }
                        if(sentenceWidth > 300 || words.length === 0) {
                            Canvas.context.fillText(sentence, 400, top);
                            top += 48;
                            sentence = "";
                        }
                    }

                    /*
                    for(i = 0; i < words.length; i++) {
                        sentenceWidth = Canvas.context.measureText(sentence).width;
                        if(sentenceWidth < 300) {
                            sentence += " " + words[i];
                        } else {
                            Canvas.context.fillText(sentence, 400, top);
                            top += 48;
                            sentence = words[i];
                            //sentenceWidth = Canvas.context.measureText(words[i]).width;
                        }
                    }
                    if(sentence !== "") {
                        Canvas.context.fillText(sentence, 400, top);
                    }*/

                    //Canvas.context.fillText(sign.message, 400, 250);
                    Canvas.context.restore();
                }
            }
        };
        Events.attach(world);

        var dummy = function() {};

        var layerHandlers = {
            collision: function(layer) {
                for(var i = 0; i < layer.objects.length; i++) {
                    world.add(CollisionBox(layer.objects[i]));
                }
            },
            cargo: function(layer) {
                for(var i = 0; i < layer.objects.length; i++) {
                    //console.log(layer.objects[i]);
                    if(layer.objects[i].name !== "") {
                        if(layer.objects[i].name === "startposition" || layer.objects[i].name === "start") {
                            player.position.X = layer.objects[i].x;
                            player.position.Y = layer.objects[i].y;
                        }
                        if(layer.objects[i].name === "exit") {
                            world.exit = CollisionBox(layer.objects[i]);
                        }
                    } else {                        
                        world.powerupCount++;
                        world.add(PowerUp(Resources.chest, dummy, {X: layer.objects[i].x, Y: layer.objects[i].y }, "cargo"));                        
                    }
                }
            },
            signs: function(layer) {
                for(var i = 0; i < layer.objects.length; i++) {
                    (function(sign) {
                        world.add(PowerUp(Resources.sign, function() { showSign(sign.name, sign.properties.message);}, {X: sign.x, Y: sign.y }, "sign"));
                    }(layer.objects[i]));
                }
            },
            enemies: function(layer) {
                world.enemyCount = 0;
                for(var i = 0; i < layer.objects.length; i++) {
                    //console.log(layer.objects[i].polyline.length);

                    var pos = {
                        X: layer.objects[i].x + layer.objects[i].polyline[0].x,
                        Y: layer.objects[i].y + layer.objects[i].polyline[0].y
                    };
                    var sprite = [Resources.ships, 233, 923, 31, 39, -15, -19, 31, 39];
                    var sprite1 = [Resources.ships, 264, 887, 31, 33, -15, -16, 31, 33];
                    var ship = Ship(sprite1, world);
                    ship.speed = 0.1;
                    ship.position = pos;
                    ship.enemy = player;
                    world.add(ship);
                    world.enemyCount++;
                    ship.on("death", function() {
                        player.kills++;
                    });
                    ship.waypoints = [];
                    for(var w = 0; w < layer.objects[i].polyline.length; w++) {
                        ship.waypoints.push({
                            X: layer.objects[i].x + layer.objects[i].polyline[w].x,
                            Y: layer.objects[i].y + layer.objects[i].polyline[w].y
                        });
                    }
                }
            }
        };

        //add world collision objects
        //console.log(mapData.layers.length);
        for(var i = 0; i < mapData.layers.length; i++) {
            //console.log("layer: " + mapData.layers[i].name);
            if(layerHandlers.hasOwnProperty(mapData.layers[i].name)) {
                layerHandlers[mapData.layers[i].name](mapData.layers[i]);
            }
        }

        return world;
    };
    return World;
});

define("gui/badge", ["canvas", "gui/element"], function(Canvas, Element) {
	var Badge = function(obj) {
	    var badge = Element({
	        position: { X: 30, Y: 80 },
	        size: { width: 48, height: 48 },	        
	        title: "Ghost",
	        description: "Finished level without being seen",
	        active: false
	    });
	    badge.on("run", function() {
	    	if(!badge.active) {
	    		Canvas.context.globalAlpha = 0.2;
	    	}
	    	if(badge.image) {
		        Canvas.context.drawImage(badge.image, 0, 0, 
		            badge.image.width, 
		            badge.image.height, 
		            badge.position.X,
		            badge.position.Y,
		            badge.size.width,
		            badge.size.height);	    		
	    	}
	        Canvas.context.font = "32px RapscallionRegular";
	        Canvas.context.fillText(badge.title, badge.position.X + badge.size.width + 10, badge.position.Y - 8);
	        Canvas.context.font = "14px Arial";
	        Canvas.context.fillText(badge.description, badge.position.X + badge.size.width + 10, badge.position.Y + 28);        
	        Canvas.context.globalAlpha = 1.0;
	    });
	    if(obj) {
	    	badge.eat(obj);
	    }
		return badge;		
	}
    return Badge;
});define("gui/element", ["canvas", "events"], function(Canvas, Events) {
	var Element = function(obj) {
		var elements = [];
		var element = {
			eat: function(obj) {
				for(var prop in obj) {
					element[prop] = obj[prop];
				}			
			},
			add: function(e) {
				elements.push(e);				
			},
			position: {X: 0, Y: 0},
			size:  {width: 0, height: 0},
			init: function() {
				element.fire("init");
				for(var i = 0; i < elements.length; i++) {
					elements[i].init();
				}
			},
			click: function(mouse) {
                if (mouse.X > element.position.X &&
                    mouse.X < element.position.X + element.size.width &&
                    mouse.Y > element.position.Y &&
                    mouse.Y < element.position.Y + element.size.height)  {
                    for(var i = 0; i < elements.length; i++) {
                        elements[i].click({X: mouse.X - element.position.X, Y: mouse.Y - element.position.Y });
                    }                    
                    element.fire("click");
                }                
			},
			run: function() {
				element.fire("run");
				Canvas.context.save();
				Canvas.context.translate(element.position.X, element.position.Y);
				for(var i = 0; i < elements.length; i++) {
					elements[i].run();
				}				
				Canvas.context.restore();				
			}
		};
		if(obj) {
			element.eat(obj);
		}
		Events.attach(element);
		return element;
	};
	return Element;
});define("gui/modal", ["easing", "canvas", "gui/element"], function(easing, Canvas, Element) {
    var color = "rgba(0, 0, 0, 0.5)",
        buffer = 80,
        duration = 500;

    return function(size) {        
        var start = 0, from, to,
            position = {X: 0, Y: Canvas.height / 2 - size.height / 2 },
            context = Canvas.context;
        var modal = Element({
            font: "48px RapscallionRegular",
            position: position,
            size: size,
            lifetime: function() {
                return Date.now() - start;
            },
            clear: function(cb) {
                modal.time = Date.now() - start;
                start = Date.now();
                from = 0;
                to = -size.width;
                position.X = from;
                modal.done = cb;
            }
        });

        modal.on("init", function() {
            modal.background = document.createElement("canvas");
            modal.background.width = Canvas.width;
            modal.background.height = Canvas.height;
            modal.background.getContext("2d").drawImage(Canvas.element, 0, 0);

            start = Date.now();
            from = -size.width;
            to = (Canvas.width / 2) - (size.width / 2) + size.width;
            position.X = from;
        });
        
        modal.on("run", function() {
            if(start === 0) return;
            var now = Date.now() - start,
                sign = -1;
                
            if(now < duration) {
                position.X = easing(now, from, to, duration) | 0;
            } else {
                position.X = from + to;
                if(to < 0 && modal.done) {
                    modal.done();
                }
            }                
            context.drawImage(modal.background, 0, 0);
            context.fillStyle = color;
            context.fillRect(position.X, position.Y, size.width, size.height);
        });
        return modal;
    };
});define("gui/label", ["canvas", "gui/element"], function(Canvas, Element) {
	var Label = function(text, obj) {
		var label = Element({
	        position: {X: 200, Y: 20},
	        size: { width: 0, height: 0 },
	        text: text,
	        fontSize: 48,
	        font: "RapscallionRegular",
	        color: "white",
	        align: "center",
	        background: null
	    });
	    label.on("init", function() {
	    	if(!label.initialized) {
		    	//set correct size for click events
		    	Canvas.context.font = label.fontSize + "px " + label.font;
		    	var labelSize = Canvas.context.measureText(label.text);
		    	label.size = {width: labelSize.width + label.fontSize / 2, 
		    					height: label.fontSize * 1.4};	  
		    	if(label.align = "center") {
		    		label.position.X -= label.size.width / 2 - label.fontSize / 4;
		    	}  		    		
		    	label.initialized = true;
	    	}	    	
	    });
	    label.on("run", function() {
	    	if(label.background) {
	    		Canvas.context.fillStyle = label.background;
	    		Canvas.context.fillRect(label.position.X - (label.fontSize / 4), 
	    								label.position.Y - (label.fontSize / 4), 
	    								label.size.width, 
	    								label.size.height);
	    	}
	        Canvas.context.fillStyle = label.color;
	        Canvas.context.font = label.fontSize + "px " + label.font;
	        Canvas.context.textAlign = "left";
	        Canvas.context.textBaseline = "top";
	        Canvas.context.fillText(label.text, label.position.X, label.position.Y);
	    });	    
	    if(obj) {
	    	label.eat(obj);
	    }

		return label;
	};
	return Label;
});