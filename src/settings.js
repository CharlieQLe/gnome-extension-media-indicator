'use strict';

const { Gio } = imports.gi;

var Settings = class Settings {
    constructor(schema) {
        this._schema = schema;
    }

    get schema() { 
        return this._schema;
    }

    onChanged(key, func) { 
        this._schema.connect(`changed::${key}`, func); 
    }

    getBoolean(key) { 
        return this._schema.get_boolean(key); 
    }

    setBoolean(key, value) { 
        this._schema.set_boolean(key, value); 
    }

    getStrings(key) { 
        return this._schema.get_strv(key); 
    }

    setStrings(key, value) { 
        this._schema.set_strv(key, value); 
    }
}

/**
 * Handles settings for this extension.
 */
var MprisSettings = class extends Settings {
    static USE_PREFERRED_PLAYERS = "use-preferred-players";
    static PREFERRED_PLAYERS = "preferred-players";

    static getNewSchema() {
        const extensionUtils = imports.misc.extensionUtils;
        return extensionUtils.getSettings(extensionUtils.getCurrentExtension().metadata['settings-schema']);
    }

    constructor() { 
        super(MprisSettings.getNewSchema()); 
    }

    get usePreferredPlayers() {
        return this.getBoolean(MprisSettings.USE_PREFERRED_PLAYERS);
    }

    get preferredPlayers() {
        return this.getStrings(MprisSettings.PREFERRED_PLAYERS);
    }

    set preferredPlayers(players) {
        this.setStrings(MprisSettings.PREFERRED_PLAYERS, players);
    }

    onChangedUsePreferredPlayers(func) {
        this.onChanged(MprisSettings.USE_PREFERRED_PLAYERS, func);
    }

    onChangedPreferredPlayers(func) {
        this.onChanged(MprisSettings.PREFERRED_PLAYERS, func);
    }
}