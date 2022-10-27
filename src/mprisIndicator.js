"use strict";

const { Clutter, GObject, St } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { MprisSettings } = Me.imports.settings;
const { MprisPlayers } = Me.imports.mpris;
const Main = imports.ui.main;

var MprisIndicator = class extends St.Icon {
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

        this._mprisSettings = new MprisSettings();
        this._mprisPlayers = new MprisPlayers();
        this._mprisPlayers.connect("updated", this._update.bind(this));
        this._mprisSettings.onChangedUsePreferredPlayers(this._update.bind(this));
        this._mprisSettings.onChangedPreferredPlayers(this._update.bind(this));
        this.connect("destroy", () => this._mprisPlayers?.destroy());
        this._update();
    }

    _update() {
        const player = this._mprisPlayers.getPlayer(this._mprisSettings.usePreferredPlayers, this._mprisSettings.preferredPlayers);
        if (player) {
            player.connect("changed", this._changed.bind(this));
            this._changed(player);
        } else this.hide();
    }

    _changed(player) {
        if (player.status === null || player.status === "Stopped") this.hide();
        else this.show();
    }
}