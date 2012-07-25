
var j18s = {

    /**
     * Current language identifier
     * @private
     */
    _curLang: "en",

    /**
     * Translation table for different languages
     * @private
     */
    _translations: {},

    /**
     * Event listeners
     * @private
     */
    _eventListeners: {},

    // PUBLIC API

    /**
     * Add a new language (or overwrite existing) to the translations list.
     *
     * Translations object is grouped by context identifiers, use "default"
     * for the default context
     *
     *     {
     *         "default":{
     *             "original": "translation"
     *         },
     *         "mycontext":{
     *             "original": "another translation"
     *         }
     *     }
     *
     * Use arrays for plural forms - if the plural expression retrieves 0, the first
     * element from the array is used, 1 uses the second one etc.
     *
     *     "original": ["orignaalne", "originaalsed"]
     *
     * @param {String} lang Language identifier
     * @param {Object} translations Translation strings for the language
     * @param {String|Function} pluralForms Rules for the plurals
     */    
    addLang: function(lang, translations, pluralForms){
        lang = (lang || "").toString();
        translations = translations || {};
        this._translations[lang] = translations;
        this._translations[lang]._pluralForms = typeof pluralForms == "function" ? pluralForms : this._compilePluralForms(pluralForms);

        if(this._curLang == lang){
            this.setLang(lang, true);
        }
    },

    /**
     * Set currently active language. Also updates all strings on the active document
     *
     * @param {String} lang Language identifier
     * @param {Boolean} forceRefresh If set to true, force refreshing all the strings
     */
    setLang: function(lang, forceRefresh){
        if(this._curLang == lang && !forceRefresh){
            return;
        }
        if(this._curLang != lang){
            this._curLang = lang;
            this._emit("change", this._curLang);
        }else{
            this._curLang = lang;
        }
        
        this._updateTranslations();
    },

    /**
     * Converts ordinary DOM element into translated element
     * 
     * @param {Element} elm DOM element
     * @param {Object} options Translation options for the element
     * @param {String} [options.text] Untranslated text for the element (defaults to innerHTML)
     * @param {String} [options.plural] Untranslated plural text for the element (defaults to innerHTML)
     * @param {Number} [options.pluralCount] Plural count for determining the correct translation string, defaults to 1
     * @param {String} [options.context] Context for the translation, defaults to "default"
     * @param {String} [options.useLang] Explicilty set the language that should be used when translating this element
     * @param {String|Array} [options.textArgs] Replacement string or an array of strings for %s and %1$s blocks
     */
    createTranslationElement: function(elm, options){
        var translationData;

        options = options || {};

        this._setDataAttribute(elm, "text", options.text || this._trim(elm.innerHTML));
        this._setDataAttribute(elm, "plural", options.plural || options.text || this._trim(elm.innerHTML));
        this._setDataAttribute(elm, "context", options.context || "default");

        if("pluralCount" in options){
            this._setDataAttribute(elm, "pluralCount", options.pluralCount);
        }

        if(options.textArgs){
            elm._cachedTextArgs = options.textArgs;
            this._setDataAttribute(elm, "textArgs", options.textArgs.join("; "));
        }

        if(options.useLang){
            this._setDataAttribute(elm, "useLang", options.useLang);
        }

        this._setDataAttribute(elm, "translate", true);

        translationData = this._getTranslationData(elm);
        this.update.apply(this, [elm, translationData.context, translationData.pluralCount].concat(translationData.textArgs));
    },

    /**
     * Translate the text of a DOM element
     * 
     * @param {Element} elm DOM element
     * @param {String} context Context string, if falsy value defaults to "default"
     * @param {Number} pluralCount Plural count for determining the correct translation string
     * @param {String} [arg1] Replacment string for first %s
     * @param {String} [arg2] Replacment string for second %s
     * @param {String} [argN] Replacment string for nth %s
     *
     * Or alternatively
     * 
     * @param {Element} elm DOM element
     * @param {Object} options Translation options for the element
     * @param {String} [options.text] Untranslated text for the element (defaults to innerHTML)
     * @param {String} [options.plural] Untranslated plural text for the element (defaults to innerHTML)
     * @param {Number} [options.pluralCount] Plural count for determining the correct translation string, defaults to 1
     * @param {String} [options.context] Context for the translation, defaults to "default"
     * @param {String} [options.useLang] Explicilty set the language that should be used when translating this element
     * @param {String|Array} [options.textArgs] Replacement string or an array of strings for %s and %1$s blocks
     */
    update: function(/* elm, context, pluralCount, arg1, arg2, ... */){
        var args = Array.prototype.slice.call(arguments),
            elm = args.shift(),
            context, pluralCount, translationString,
            translationData = this._getTranslationData(elm);

        if(typeof args[0] == "object"){
            context = args[0].context;
            pluralCount = args[0].pluralCount;
            args = args[0].textArgs && [].concat(args[0].textArgs);
        }else{
            context = args.shift();
            pluralCount = args.shift();
        }

        if(typeof context == "undefined"){
            context = translationData.context;
        }

        if(typeof pluralCount == "undefined"){
            pluralCount = translationData.pluralCount;
        }

        if(typeof args == "undefined"){
            args = translationData.textArgs;
        }

        translationString = this._getTranslationString(elm, context, pluralCount, args);
        elm.innerHTML = this._formatString.apply(this, [translationString].concat(args));
    },

    /*
     * Translate a string
     * 
     * @param {String} text String to be translated
     * @param {Object} options Translation options
     * @param {String} [options.plural] Untranslated plural text for the element
     * @param {Number} [options.pluralCount] Plural count for determining the correct translation string, defaults to 1
     * @param {String} [options.context] Context for the translation, defaults to "default"
     * @param {String} [options.useLang] Explicilty set the language that should be used when translating this element
     * @param {String|Array} [options.textArgs] Replacement string or an array of strings for %s and %1$s blocks
     * @return {String} Translated string
     */
    translate: function(text, options){
        options = options || {};

        var plural = options.plural || text,
            pluralForm,
            lang = options.lang || this._curLang,
            context = options.context || "default",
            pluralCount = options.pluralCount,
            translation;
        
        if(typeof pluralCount == "undefined"){
            pluralCount = 1;
        }

        if(this._translations[lang]){
            pluralForm = this._translations[lang]._pluralForms(pluralCount);
        }else{
            pluralForm = Number(pluralCount != 1);
        }

        if(this._translations[lang] && this._translations[lang][context] && text in this._translations[lang][context]){
            translation = [].concat(this._translations[lang][context][text])[pluralForm] ||
                [].concat(this._translations[lang][context][text])[0] ||
                [text, plural || text][pluralForm] ||
                text;
        }else{
            translation = [text, plural][pluralForm] || text;
        }

        return this._formatString.apply(this, [translation].concat(options.textArgs || []));
    },

    /**
     * Register an event listener
     *
     * @param {String} eventName The name of the event
     * @param {Function} listener Event callback
     */
    on: function(eventName, listener){
        eventName = (eventName || "").toString();
        if(typeof listener != "function"){
            return;
        }
        if(!this._eventListeners[eventName]){
            this._eventListeners[eventName] = [listener];
        }else{
            this._eventListeners[eventName].push(listener);
        }
    },

    /**
     * Gathers all active translation strings (originals, not translations)
     *
     * @return {Object} Currently used translation strings
     */
    gatherTranslationStrings: function(){
        var translationTable = {},
            elements = this._selectorFunc("translate"),
            element, context, singular, plural, translation;

        for(var i=0, len = elements.length; i<len; i++){
            element = elements[i];

            singular = this._getDataAttribute(element, "text");
            plural = this._getDataAttribute(element, "plural");
            context = this._getDataAttribute(element, "context", "default");

            if(typeof singular == "undefined"){
                singular = this._trim(element.innerHTML);
            }

            if(!singular){
                continue;
            }

            translation = singular;

            if(plural && plural != singular){
                translation = [singular, plural];
            }
            
            if(!translationTable[context]){
                translationTable[context] = {};
            }

            if(singular in translationTable[context]){
                continue;
            }
            translationTable[context][singular] = translation;
        }

        return translationTable;
    },

    // PRIVATE API

    /**
     * Retrieves correct translation string for an element
     * 
     * @param {Element} elm DOM element
     * @param {String} context Context value
     * @param {Number} pluralCount Plural count for determining the correct translation string, defaults to 1
     * @param {Array} textArgs Replacement string or an array of strings for %s and %1$s blocks
     * @return {String} Translated string
     */
    _getTranslationString: function(elm, context, pluralCount, textArgs){
        var translationData = this._getTranslationData(elm),
            lang = translationData.useLang || this._curLang,
            pluralForm;
        
        context = context || "default";

        if(typeof pluralCount == "undefined"){
            pluralCount = 1;
        }

        if(this._translations[lang]){
            pluralForm = this._translations[lang]._pluralForms(pluralCount);
        }else{
            pluralForm = Number(pluralCount != 1);
        }

        this._setDataAttribute(elm, "pluralCount", pluralCount);
        this._setDataAttribute(elm, "context", context);
        if(elm._cachedTextArgs != textArgs){
            elm._cachedTextArgs = textArgs;
            this._setDataAttribute(elm, "textArgs", textArgs.join("; "));
        }
        
        if(this._translations[lang] && this._translations[lang][context] && translationData.text in this._translations[lang][context]){
            return [].concat(this._translations[lang][context][translationData.text])[pluralForm] ||
                [].concat(this._translations[lang][context][translationData.text])[0] ||
                [translationData.text, translationData.plural][pluralForm] ||
                this._trim(elm.innerHTML);
        }else{
            return [translationData.text, translationData.plural][pluralForm] ||
                this._trim(elm.innerHTML);
        }
    },

    /**
     * Load translation data for an element from data-* tags
     *
     * @param {Element} elm DOM element
     * @return {Object} Translation data
     */
    _getTranslationData: function(elm){
        var responseData = {
            text: this._getDataAttribute(elm, "text"),
            plural: this._getDataAttribute(elm, "plural"),
            pluralCount: this._getDataAttribute(elm, "pluralCount", 1),
            context: this._getDataAttribute(elm, "context", "default"),
            textArgs: elm._cachedTextArgs || this._getDataAttribute(elm, "textArgs","").split(/\s*;\s*/),
            useLang: this._getDataAttribute(elm, "useLang", false)
        };

        if(typeof responseData.text == "undefined"){
            responseData.text = this._trim(elm.innerHTML);
            this._setDataAttribute(elm, "text", responseData.text);
        }

        if(responseData.pluralCount && isNaN(responseData.pluralCount) || !(responseData.pluralCount || "").toString().length){
            responseData.pluralCount = 1;
        }
        responseData.pluralCount = Number(responseData.pluralCount);

        if(typeof responseData.plural == "undefined"){
            responseData.plural = responseData.text;
            this._setDataAttribute(elm, "plural", responseData.plural);
        }

        if(!elm._cachedTextArgs){
            elm._cachedTextArgs = responseData.textArgs;
        }

        return responseData;
    },

    /**
     * Fetches all DOM elements with data-j18s-"name" attribute
     *
     * @return {Array} A list of matching elements
     */
    _selectorFunc: function(name){
        if(document.querySelectorAll){
            this._selectorFunc = function(name){
                name = "data-j18s-" + this._fromCamelCase(name);
                return Array.prototype.slice.call(document.querySelectorAll("[" + name + "]"));
            };
        }else{
            this._selectorFunc = function(name){
                var j18sElements = [],
                    elements = document.getElementsByTagName("*");

                name = "data-j18s-" + this._fromCamelCase(name);

                for(var i=0; i<elements.length; i++) {
                    if(typeof elements[i].getAttribute(name) == "string"){
                        j18sElements.push(elements[i]);
                    }
                }

                return j18sElements;
            };
        }
        return this._selectorFunc(name);
    },

    /**
     * Updates all translations in the current document
     */
    _updateTranslations: function(){
        var translationData,
            elements = this._selectorFunc("translate");

        for(var i=0, len = elements.length; i<len; i++){
            translationData = this._getTranslationData(elements[i]);
            this.update.apply(this, [elements[i], translationData.context, translationData.pluralCount].concat(translationData.textArgs));
        }
    },

    /**
     * Poor man's sprintf
     *
     * @param {String} str String to be formatted
     * @param {String} [arg1] First replacement string
     * @param {String} [arg2] Second replacement string
     * @param {String} [argN] Nth replacement string
     * @return {String} Formatted string
     */
    _formatString: function(/* str, arg1, arg2, ... */){
        var args = Array.prototype.slice.call(arguments),
            str = args.shift() || "";

        return str.replace(/%(\d)\$([sd])/g, function(original, pos, type){
            pos = (Number(pos) || 1) - 1;
            var value = args[pos];
            return typeof value == "undefined" ? original: value;
        }).replace(/%[sd]/g, function(original){
            var value = args.shift();
            return typeof value == "undefined" ? original: value;
        });
    },

    /**
     * Compiles string expression for plurals into a function
     *
     * @param {String} pluralForms Gettext plurals expression
     * @return {Function} Compiled function
     */  
    _compilePluralForms: function(pluralForms){
        pluralForms = pluralForms || "nplurals=2; plural=n != 1";
        return new Function("n", pluralForms+"; return Number(plural) || 0;");
    },

    /**
     * Trims a string
     *
     * @param {String} str String to be trimmed
     * @return {String} Trimmed string
     */
    _trim: function(str) {
        if("trim" in String.prototype){
            str = (str || "").toString();
            this._trim = function(str){
                return str.trim();
            };
        }else{
            this._trim = function(str){
                str = (str || "").toString();
                return str.replace(/^\s+|\s+$/g,"");
            };
        }
        return this._trim(str);
    },

    /**
     * Saves a data-* attribute to a DOM element
     * 
     * @param {Element} elm DOM element
     * @param {String} name Camel cased key name
     * @param {String} value Value for the key
     */
    _setDataAttribute: function(elm, name, value){
        if("dataset" in elm){
            this._setDataAttribute = function(elm, name, value){
                name = "j18s" + name.charAt(0).toUpperCase() + name.substr(1);
                elm.dataset[name] = value;
            };
        }else{
            this._setDataAttribute = function(elm, name, value){
                elm.setAttribute("data-j18s-" + this._fromCamelCase(name), value);
            };
        }
    },

    /**
     * Retrieves a data-* attribute from a DOM element
     * 
     * @param {Element} elm DOM element
     * @param {String} name Camel cased key name
     * @param {String} defaultValue Default value to return if actual value is undefined
     * @return {String} Value for the data-* key
     */
    _getDataAttribute: function(elm, name, defaultValue){
        if("dataset" in elm){
            this._getDataAttribute = function(elm, name, defaultValue){
                name = "j18s" + name.charAt(0).toUpperCase() + name.substr(1);
                var value = elm.dataset[name];
                if(typeof value == "undefined"){
                    return defaultValue;
                }else{
                    return value;
                }
            };
        }else{
            this._getDataAttribute = function(elm, name, defaultValue){
                var value = elm.getAttribute("data-j18s-" + this._fromCamelCase(name));
                if(typeof value == "undefined" || value === null){
                    return defaultValue;
                }else{
                    return value;
                }
            };
        }
        return this._getDataAttribute(elm, name, defaultValue);
    },

    /**
     * Convert camel case to scored userData -> user-data
     *
     * @param {String} str Camel cased string
     * @return {String} Scored string
     */
    _fromCamelCase: function(str){
        return str.replace(/[A-Z]/g, function(o){
            return "-" + o.toLowerCase();
        });
    },

    /**
     * Emits an event
     */
    _emit: function(/* eventName, data */){
        var args = Array.prototype.slice.call(arguments),
            eventName = (args.shift() || "").toString(),
            that = this;

        if(this._eventListeners[eventName]){
            for(var i=0, len = this._eventListeners[eventName].length; i<len; i++){
                (function(i){
                    setTimeout(function(){
                        that._eventListeners[eventName][i].apply(this, args);
                    }, 0);
                })(i);
            }
        }
    }

};