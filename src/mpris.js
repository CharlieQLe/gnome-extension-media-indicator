'use strict';

const { Gio, GObject, St } = imports.gi;
const { MprisPlayer } = imports.ui.mpris;
const { loadInterfaceXML } = imports.misc.fileUtils;

const DBusProxy = Gio.DBusProxy.makeProxyWrapper(loadInterfaceXML("org.freedesktop.DBus"));

const MPRIS_PLAYER_PREFIX = "org.mpris.MediaPlayer2.";

var MprisPlayers = class extends St.Bin {
    static {
        GObject.registerClass({ Signals: { "updated" : {} } }, this);
    }

    _init() {
        super._init();
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

    getPlayer(preferred = false, preferredPlayers = []) {
        if (this._players.size === 0) return null;
        if (preferred) {
            for (const [busName, player] of this._players) {
                if (preferredPlayers.reduce((result, playerName) => result || busName.includes(playerName), false))
                    return player;
            }
            return null;
        }
        return this._players.size === 0 ? null : this._players.values().next().value;
    }
}