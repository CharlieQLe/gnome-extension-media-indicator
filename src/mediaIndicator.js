"use strict";

const { Clutter, Gio, GObject, St } = imports.gi;
const { MprisPlayer } = imports.ui.mpris;
const { loadInterfaceXML } = imports.misc.fileUtils;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { MediaSettings } = Me.imports.settings;
const Main = imports.ui.main;

const DBusIface = loadInterfaceXML("org.freedesktop.DBus");
const DBusProxy = Gio.DBusProxy.makeProxyWrapper(DBusIface);

const MprisIface = loadInterfaceXML("org.mpris.MediaPlayer2");
const MprisProxy = Gio.DBusProxy.makeProxyWrapper(MprisIface);

const MprisPlayerIface = loadInterfaceXML("org.mpris.MediaPlayer2.Player");
const MprisPlayerProxy = Gio.DBusProxy.makeProxyWrapper(MprisPlayerIface);

const MPRIS_PLAYER_PREFIX = "org.mpris.MediaPlayer2.";

var MediaIndicator = class extends St.Icon {
    static {
        GObject.registerClass(this);
    }

    _init() {
        super._init({
            icon_name: "emblem-music-symbolic",
            icon_size: 16,
            style_class: "music-indicator",
            visible: false,
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });

        this._mediaSettings = new MediaSettings();
        this._mediaController = null;
        this._mediaPlayers = new MediaPlayers();
        this._mediaPlayers.connect("updated", this._update.bind(this));
        this._mediaSettings.onChangedUsePreferredPlayers(this._update.bind(this));
        this._mediaSettings.onChangedPreferredPlayers(this._update.bind(this));
        this.connect("destroy", this._destroy.bind(this));
        this._update();
    }

    _update() {
        const player = this._mediaPlayers.player;
        if (player) {
            this._mediaController = new MediaController(player, this._changed.bind(this));
            this._changed(this._mediaController._player);
        } else this.hide();
    }

    _changed(player) {
        if (player.status === null || player.status === "Stopped") this.hide();
        else this.show();
    }

    _destroy() {
        this._mediaController?.destroy();
        this._mediaPlayers?.destroy();
    }
}

var MediaController = class extends St.Bin {
    static {
        GObject.registerClass(this);
    }

    _init(player, onChanged) {
        super._init();
        this._player = player;
        this._onChanged = onChanged;
        this._changedId = this._player.connect("changed", this._update.bind(this));
        this.connect("destroy", this._destroy.bind(this));
    }
    
    _update() {
        this._onChanged(this._player);
    }

    _destroy() {
        if (this._changedId) this._player.disconnect(this._changedId);
        this._changedId = null;
    }
}

var MediaPlayers = class extends St.Bin {
    static {
        GObject.registerClass({ Signals: { "updated" : {} } }, this);
    }

    _init() {
        super._init();
        this._mediaSettings = new MediaSettings();
        this._players = new Map();
        this._proxy = new DBusProxy(Gio.DBus.session, "org.freedesktop.DBus", "/org/freedesktop/DBus", this._onProxyReady.bind(this));
    }

    get allowed() {
        return !Main.sessionMode.isGreeter;
    }

    _addPlayer(busName) {
        if (this._players.get(busName)) return;

        const player = new MprisPlayer(busName);
        player.connect("closed", () => {
            this._players.delete(busName);
            this.emit("updated");
        })
        this._players.set(busName, player);
        this.emit("updated");
    }

    async _onProxyReady() {
        const [names] = await this._proxy.ListNamesAsync();
        names.forEach(name => {
            if (!name.startsWith(MPRIS_PLAYER_PREFIX))
                return;

            this._addPlayer(name);
        });
        this._proxy.connectSignal("NameOwnerChanged", this._onNameOwnerChanged.bind(this));
    }

    _onNameOwnerChanged(proxy, sender, [name, oldOwner, newOwner]) {
        if (!name.startsWith(MPRIS_PLAYER_PREFIX)) return;
        if (newOwner && !oldOwner) this._addPlayer(name);
    }

    get players() {
        return this._players.size === 0 ? null : this._players;
    }

    get player() {
        if (this._players.size === 0) return null;
        if (this._mediaSettings.usePreferredPlayers) {
            const preferredPlayers = this._mediaSettings.preferredPlayers;
            for (const [busName, player] of this._players) {
                if (preferredPlayers.reduce((result, playerName) => result || busName.includes(playerName), false))
                    return player;
            }
            return null;
        }
        return this._players.size === 0 ? null : this._players.values().next().value;
    }
}