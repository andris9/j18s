j18s
====

Yet another JavaScript i18n library, cross browser and library agnostic - has no dependencies and can be used standalone.

This module mainly deals with DOM elements that are marked to be translated. If you change the active
language, all DOM elements that are marked for translation are translated automatically, keeping
correct plurals etc.

See the [demo here](http://tahvel.info/j18s/example.html).

## Usage

Include j18s.js in your page

    <script src="j18s.js"></script>

In your HTML, add `data-j18s-translate` attribute to an element to translate it.

    <span data-j18s-translate>Translate this</span>

Create a script to add language data

    <script>
        j18s.addLang("et", {
                "default": {
                    "Translate this": "Tõlgi seda"
                }
            })
    </script>

And finally, change active language (should be done after DOMContentLoaded or 
include the script block in the end of the document body)

    <script>
        j18s.setLang("et");
    </script>

And *voilà*, "Translate this" has been changed to "Tõlgi seda"!

The translations are "live" - that means that if you change the active language,
all the elements that are marked as translatable will be retranslated.

### Context

You can use different contexts for the translations. By default, the main context is "default"
but you can use any other if you need to.

    j18s.addLang("et",{
            "default": {}, // default context translations
            "other": {} // some other context
        })

Later, when translating, you can define the context you want to use for given string.

### Plurals

j18s uses gettext compatible plural forms definitions. By default English plural rules are used
(`plural = n !=1`). You can define your own when adding the language data as the optional third parameter.

    j18s.addLang("et", {default:{}}, "nplurals=2; plural=n == 1 ? 0 : 1;");

To use plurals, you need to define translations as arrays instead of a string. If plural expression
returns 0, the first element of the array will be used, if it returns 1, the second is used etc.

    j18s.addLang("et", {default:{
            "Menu": ["Menu", "Menus"]
        }});

### Text replacment

j18s supports a simple sprintf like functionality to automatically replace `%s` 
and `%1$s` type blocks when translated.

    j18s.addLang("et", {default:{
            "%s comment": ["%s comment", "%s comments"],
            "First %s, second %s": "Second %2$s, first %1$s"
        }});

## API

### Detect language change

You can register language change handlers with `on("change")`

    j18s.on("change", function(lang){
        console.log("Language changed to: "+lang);
    });

    j18s.setLang("et"); // outputs 'Language changed to: et'

For example, you could use this feature to lazy load the language data from the server.

    j18s.on("change", function(lang){
        yourLoadJsonWithAjax("/load-language.php?lang="+lang, function(langData){
            j18s.addLang(lang, langData);
        })
    });

### Translate a String

Translate a string with `translate()`

    j18s.translate(text, options)

Where

  * **text** is the string to translate
  * **options** is optional translation options

Options can use the following properties

  * **plural** is the default plural form to use, if the translation is not found and `pluralCount` != 1
  * **pluralCount** is the input for plural expression function to find the correct translation from the plurals array (defaults to 1)
  * **context** is the translation context, defaults to "default"
  * **useLang** can be used to explicitly use a language for translating, even if the currently active language is something else
  * **textArgs** is an array for %s replacements in the translation

Example

    var translation = j18s.translate("%s comment", {
            plural: "%s comments",
            pluralCount: 6,
            textArgs: [6]
        });
    console.log(translation); // "6 comments"

### Convert existing DOM element to translatable

If you want an element to be automatically translated when changing the active language,
then you can set it to be transatable and you can add some defaults for the translation.

    j18s.createTranslationElement(element, options)

Where 

  * **element** is the DOM element that is going to be automatically translated
  * **options** is the optional translation options

Options can use the following properties

  * **text** is the default singular form to use for the translation, if not set, innerHTML value is used
  * **plural** is the default plural form to use, if the translation is not found and `pluralCount` != 1
  * **pluralCount** is the input for plural expression function to find the correct translation from the plurals array (defaults to 1)
  * **context** is the translation context, defaults to "default"
  * **useLang** can be used to explicitly use a language for translating, even if the currently active language is something else
  * **textArgs** is an array for %s replacements in the translation

Example

    var elm = document.getElementById("text");
    j18s.createTranslationElement(elm, {
            text: "%s comment",
            plural: "%s comments",
            pluralCount: 6,
            textArgs: [6]
        });
    console.log(elm.innerHTML); // "6 comments"

### Update translation for existing element

If you want to modify a translation of an existing translatable object, you can do it with `update()`

    j18s.update(element, options)

Where 

  * **element** is the DOM element that you want to update
  * **options** is the optional translation options

Options can use the following properties

  * **text** is the default singular form to use for the translation, if not set, innerHTML value is used
  * **plural** is the default plural form to use, if the translation is not found and `pluralCount` != 1
  * **pluralCount** is the input for plural expression function to find the correct translation from the plurals array (defaults to 1)
  * **context** is the translation context, defaults to "default"
  * **useLang** can be used to explicitly use a language for translating, even if the currently active language is something else
  * **textArgs** is an array for %s replacements in the translation

Example

    var elm = document.getElementById("text");
    j18s.update(elm, {
            text: "%s comment",
            plural: "%s comments",
            pluralCount: 6,
            textArgs: [6]
        });
    console.log(elm.innerHTML); // "6 comments"

## Setting the defaults

You can set default option values (plural information etc.) directly to the HTML
with `data-j18s-*` parameters.

Any element that is being automatically translated need to have 
`data-j18s-translate` attribute set

### Singular text

Singular text can be defined with `data-j18s-text` and if it not defined, `innerHTML` of the element
value will be used instead.

    <span data-j18s-translate>Menu</span> // 'text' value is 'Menu'
    <span data-j18s-translate data-j18s-text="Menüü">Menu</span> // 'text' value is 'Menüü'

### Plural text

Default plural text can be defined with `data-j18s-plural` and if it not defined, `data-j18s-text` value will be used instead.

    <span data-j18s-translate data-j18s-plural="Menus">Menu</span> // 'plural' value is 'Menus'

### Plural count

Current plural count for selecting the correct plural form can be set with `data-j18s-plural-count`

    <span data-j18s-translate data-j18s-plural-count="6"></span>

### Fix language

If you want to fix the language that will be used to translate this element, use `data-j18s-use-lang`

    <span data-j18s-translate data-j18s-use-lang="en"></span> // always use 'en'

### Set context

If you want to set the context for the used language, use `data-j18s-context`

    <span data-j18s-translate data-j18s-context="other"></span> // user "other" context

### Replacement strings

If you want to use %s replacements, you can define the replacement strings with `data-j18s-text-args`. Split
multiple strings with semicolons.

    <span data-j18s-translate data-j18s-text-args="first string; second string"></span>

Example

    // outputs '4 comments'
    <span data-j18s-translate data-j18s-text="%s comment" data-j18s-plurals="%s comments" data-j18s-plural-count="4" data-j18s-text-args="4"></span>

## License

**MIT**